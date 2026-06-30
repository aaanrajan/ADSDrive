const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const SqliteService = require('./services/sqlite-service');
const FileWatcherService = require('./services/file-watcher');
const SyncService = require('./services/sync-service');
const CloudService = require('./services/cloud-service');
const TrayService = require('./services/tray-service');

let mainWindow;
const sqlite = new SqliteService();
let watcher = null;
let sync = null;
let trayService = null;
let syncInterval = null;
let appConfig = null;

function notify(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  const devUrl = process.env.WEB_DEV_URL || 'http://localhost:4200';
  if (isDev) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, '../web/dist/index.html'));
}

async function startInfra(config) {
  appConfig = config;
  if (!config?.folderPath) return;

  if (!watcher) watcher = new FileWatcherService(sqlite, (e) => sendToRenderer('fs-event', e));

  const cloud = new CloudService(config.apiUrl || 'https://your-api-url.com', async () => config.token || null);
  sync = new SyncService(
    sqlite,
    cloud,
    (e) => {
      sendToRenderer('fs-event', e);
      if (e.type === 'SYNC_COMPLETED') trayService?.setStatus('Up to date');
      if (e.type === 'SYNC_FAILED') trayService?.setStatus('Error');
      if (e.type === 'SYNC_CONFLICT') trayService?.setStatus('Conflict');
    },
    notify
  );

  await watcher.start(config.folderPath);
  trayService?.setStatus('Watching');

  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    trayService?.setStatus('Syncing...');
    await sync.runOnce(config.userId);
  }, 5 * 60 * 1000);
}

app.whenReady().then(async () => {
  await sqlite.init();
  createWindow();

  trayService = new TrayService(app, () => mainWindow, async () => {
    trayService.setStatus('Syncing...');
    const res = await sync?.runOnce(appConfig?.userId);
    if (res?.success) notify('ADSDrive', 'Manual sync completed');
  });
  trayService.create();

  const saved = await sqlite.getConfig('appConfig');
  if (saved) await startInfra(saved);

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('config:save', async (_e, config) => {
    await sqlite.setConfig('appConfig', config);
    await startInfra(config);
    return { success: true };
  });

  ipcMain.handle('config:load', async () => {
    return await sqlite.getConfig('appConfig');
  });

  ipcMain.handle('get-files', async () => await sqlite.getAllFiles());

  ipcMain.handle('manual-sync', async () => {
    if (!sync) return { success: false, message: 'Sync not initialized' };
    trayService?.setStatus('Syncing...');
    const result = await sync.runOnce(appConfig?.userId);
    trayService?.setStatus(result.success ? 'Up to date' : 'Error');
    return result;
  });
});

app.on('window-all-closed', async () => {
  if (syncInterval) clearInterval(syncInterval);
  if (watcher) await watcher.stop();
  if (process.platform !== 'darwin') app.quit();
});