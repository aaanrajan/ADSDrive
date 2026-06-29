const { IPC_CHANNELS } = require('./ipc-channels');
const fileHelper = require('./file-helper');

const SqliteService = require('../sqlite-service');  // Example: Your DB logic here
const sqliteService = SqliteService();
const configService = require('../config-service'); // Example: Your config logic here
const { startWatcher } = require('../file-watcher'); // Example: Your file watcher logic here
const syncService = require('../sync-service')(); // Example: Your sync logic here
const { SyncScheduler } = require('../sync-scheduler');
const syncScheduler = SyncScheduler();
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { dialog } = require('electron');
const FileManagerService = require('../file-manager.service');
const fileManager = FileManagerService();
const { writeMacConfig } = require('../mac-native/app-group-store');
const { exportFileStatusToMac } = require('../mac-native/export-file-status');



function registerIpcHandlers(ipcMain, mainWindow) {
// Watcher control
ipcMain.on(IPC_CHANNELS.START_WATCH, (event, { userId, username, folderPath }) => {
  if (!fs.existsSync(folderPath)) {
    console.error('Folder not found:', folderPath);
    return;
  }
  console.log('Starting watcher for folder:', { userId, username, folderPath });
  startWatcher(userId, username, folderPath, mainWindow);
  setTimeout(() => syncScheduler.startCronJobs(), 5000);
  setTimeout(() => syncService.initNetworkCheck(), 10000);
  console.log(`Watcher started for user: ${username}`);

  return { success: true, data: true };
});

ipcMain.on(IPC_CHANNELS.STOP_WATCH, () => { /* stopWatcher(); */ });

ipcMain.handle(IPC_CHANNELS.LIST_DIR, async (_event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath);
    const detailed = await Promise.all(entries.map(async (name) => {
      const fullPath = path.join(dirPath, name);
      try {
        const stats = await fs.promises.stat(fullPath);
        return {
          name,
          path: fullPath,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          mimeType: stats.isDirectory() ? null : mime.lookup(fullPath) || 'unknown',
        };
      } catch {
        return null;
      }
    }));

    return { success: true, data: detailed.filter(Boolean) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.RENAME_ITEM, async (_event, { id, newName }) => {
  try {
    const item = await sqliteService.getItemById(id);
    if (!item) throw new Error('Item not found');

    const oldPath = item.fullPath;
    const newPath = path.join(path.dirname(oldPath), newName);

    await fs.promises.rename(oldPath, newPath);

    return { success: true, oldPath, newPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.MANUAL_SYNC, async () => {
  try {
    const result = await syncService.performSync();
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.FILE_ACTION, async (_event, fileId, action) => {
  try {
    const fileRecord = await sqliteService.getItemById(fileId);
    if (!fileRecord) throw new Error(`File with id ${fileId} not found`);

    let result, eventType;
    switch (action) {
      case 'LASTOPENED':
        result = await sqliteService.updateItemById(fileId, { lastOpenedAt: new Date().toISOString(), isUpdated: 1, syncStatus: 'PENDING' });
        eventType = 'LASTOPENED';
        break;
      case 'DOWNLOAD':
        result = await fileManager.downloadItem(fileRecord, false);
        eventType = 'DOWNLOADED';
        break;
      case 'PIN':
        result = await fileManager.downloadItem(fileRecord, true);
        eventType = 'PINNED';
        break;
      case 'UNPIN':
      case 'REMOVE':
        result = await fileManager.releaseItem(fileRecord, action);
        eventType = action === 'UNPIN' ? 'UNPINNED' : 'REMOVED';
        break;
      case 'REPLACE_LOCAL':
        result = await fileManager.replaceLocalFile(fileRecord);
        eventType = 'LOCAL_REPLACED';
        break;
      case 'REPLACE_CLOUD':
        result = await fileManager.replaceCloudFile(fileRecord);
        eventType = 'CLOUD_REPLACED';
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    mainWindow?.webContents.send('fs-event', {
      type: eventType,
      id: fileRecord.id,
      fullPath: fileRecord.fullPath,
      status: result.status,
      message: result.message,
      timestamp: Date.now(),
    });

    return { success: true, result, type: action };
  } catch (err) {
    return { success: false, error: err.message, type: action };
  }
});

ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    const folder = result.canceled ? null : result.filePaths[0];
    return { success: true, data: folder };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, async () => {
  try {
    const config = await configService.loadConfig();
    return { success: true, data: config };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, async (_event, newConfig) => {
   try {
    const oldConfig = configService.loadConfig() || {};

    const oldRoot = oldConfig.folderPath;
    const newRoot = newConfig.folderPath;

    const finalConfig = {
      ...oldConfig,
      ...newConfig,
      accessToken:
        newConfig.accessToken ||
        newConfig.token ||
        oldConfig.accessToken ||
        oldConfig.token
    };

    configService.saveConfig(finalConfig);

    if (oldRoot && newRoot && oldRoot !== newRoot) {
      await sqliteService.updateRootFolderPath(oldRoot, newRoot);

      await sqliteService.setSetting("LAST_DOWNLOAD_META_SYNC_TIME", "");
      await sqliteService.setSetting("VERSION_SYNCED_TIME", "");
      await sqliteService.setSetting("SHARED_SYNC_TIME", "");
      await sqliteService.setSetting("RECURSIVE_SHARED_SYNC_TIME", "");
    }

    fs.mkdirSync(path.join(newRoot, "MyFiles"), { recursive: true });
    fs.mkdirSync(path.join(newRoot, "Shared"), { recursive: true });

    writeMacConfig(finalConfig);
   

    startWatcher(finalConfig.userId, finalConfig.username, finalConfig.folderPath, mainWindow);

    await syncService.syncMetadata();
    await exportFileStatusToMac();

    return { success: true, data: finalConfig };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_CONFIG_VALUE, async (_event, key) => {
  try {
    const value = await configService.getConfigValue(key);
    return { success: true, data: value };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.SET_CONFIG_VALUE, async (_event, key, value) => {
  try {
    await configService.setConfigValue(key, value);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.UPDATE_CONFIG, async (_event, updates) => {
  try {
    await configService.updateConfig(updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_ALL_FILES, async () => {
  try {
    const data = await sqliteService.getAllFiles();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_CHILDREN, async (_event, parentId) => {
  try {
    const data = await sqliteService.getChildrenByParentId(parentId);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.UPDATE_COLOR, async (_event, fileId, color) => {
  try {
    const result = await sqliteService.updateItemById(fileId, { color, isUpdated: 1, syncStatus: 'PENDING' });
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

  /**
   * File operations
   */
  ipcMain.handle(IPC_CHANNELS.READ_FILE, (event, filePath) => {
    return fileHelper.readFile(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, (event, filePath, content) => {
    return fileHelper.writeFile(filePath, content);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_DIR, (event, dirPath) => {
    return fileHelper.createDir(dirPath);
  });

  ipcMain.handle(IPC_CHANNELS.EXISTS, (event, filePath) => {
    return fileHelper.exists(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.JOIN_PATH, (event, ...args) => {
    return fileHelper.joinPath(...args);
  });

  ipcMain.handle(IPC_CHANNELS.HOME_DIR, () => {
    return fileHelper.homeDir();
  });

  ipcMain.handle(IPC_CHANNELS.STAT, (event, filePath) => {
    return fileHelper.stat(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.SUPPORT_ACTION, async (_event, fileId, action) => {
  try {
  
    let result, eventType;
    switch (action) {
      case 'DROP_TABLE':
        result = await sqliteService.dropAllTables();
        eventType = 'TABLES_DROPPED';
        break;

      case 'DELETE_RECORDS':
        result = await sqliteService.deleteAllFiles();
        eventType = 'RECORDS_DELETED';
        break;
      case 'CREATE_TABLE':
        result = await sqliteService.initializeDb();
        eventType = 'TABLES_CREATED';
        break;
     
      case 'START_WATCHER':
         const config = await configService.loadConfig();
          if(config && config.userId && config.username && config.folderPath) {
            startWatcher(config.userId, config.username, config.folderPath, mainWindow);
            eventType = 'WATCHER_STARTED';
          } else {
            throw new Error('Invalid config for starting watcher');
          }
        break;
      
      case 'FIND_CHILDREN':
        result = await await sqliteService.getChildrenByParentId(fileId);
        eventType = 'CHILDREN_FOUND';
      break;
      
      case 'FIND_CHILDREN_BY_CLOUD_ID':
        const data = await sqliteService.getItemByCloudId(fileId, config.userId);
        if(data) {
          result = await sqliteService.getChildrenWithoutRoot(data.id);
          eventType = 'CHILDREN_FOUND';
        } else {
          throw new Error(`No record found with cloudId ${fileId}`);
        }
        eventType = 'CHILDREN_FOUND_BY_CLOUD_ID';
      break;

      case 'FIND_ALL_SHARED':
          result = await sqliteService.getAllSharedItemsWithFiles();
          eventType = 'SHARED_FILES_FOUND';
        break;

      case 'FIND_ALL_RECORDS':
        result = await sqliteService.getAllFiles();
        eventType = 'ALL_RECORDS_FOUND';
        break;

         case 'FIND_SHARED_ITEM':
        result = await sqliteService.getSharedItemWithFileByCloudId(fileId);
        eventType = 'SHARED_ITEM_FOUND';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    mainWindow?.webContents.send('fs-event', {
      type: eventType,
      status: result.status,
      message: result.message,
      timestamp: Date.now(),
    });

    return { success: true, result, type: action };
  } catch (err) {
    return { success: false, error: err.message, type: action };
  }
});
}

module.exports = { registerIpcHandlers };
