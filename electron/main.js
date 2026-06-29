const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const SqliteService = require('./electron/sqlite-service');
const SyncService = require('./electron/sync-service');
const { startWatcher } = require('./electron/file-watcher');
const ConfigService = require('./electron/config-service');

let mainWindow;
let syncService;
const sqliteService = SqliteService();
const configService = ConfigService();

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// Initialize app
app.whenReady().then(() => {
  // Initialize database
  sqliteService.initializeDb();

  // Create window
  createWindow();

  // Initialize sync service
  syncService = new SyncService('https://your-api-url.com');

  // Load saved configuration
  const config = configService.loadConfig();
  if (config && config.userId && config.folderPath) {
    // Start file watcher
    startWatcher(config.folderPath, (event) => {
      // Send file changes to frontend
      mainWindow.webContents.send('file-changed', event);
    });

    // Start sync every 5 minutes
    setInterval(() => {
      syncService.performSync();
    }, 5 * 60 * 1000);
  }

  // IPC: Save user configuration
  ipcMain.handle('save-config', (event, config) => {
    configService.saveConfig(config);
    return { success: true };
  });

  // IPC: Get file list
  ipcMain.handle('get-files', async () => {
    const files = await sqliteService.getFilesByStatuses(['SYNCED']);
    return files;
  });

  // IPC: Manual sync
  ipcMain.handle('manual-sync', async () => {
    await syncService.performSync();
    return { success: true };
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = { mainWindow };