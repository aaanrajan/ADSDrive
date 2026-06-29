const { app, Tray, BrowserWindow, screen, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const ConfigService = require('./config-service');
const SqliteService = require('./sqlite-service');
const sqliteService = SqliteService();

let tray = null;
let trayWindow = null;
let syncSchedulerRef = null;

function initTray(syncScheduler) {
  syncSchedulerRef = syncScheduler;
  
  let trayImage = null;
  
  // Try to find a valid PNG file in the workspace or bundle
  const possiblePaths = [
    path.join(__dirname, '..', 'src', 'assets', 'logo.png'),
    path.join(__dirname, '..', 'dist', 'ads-drive', 'browser', 'assets', 'logo.png'),
    path.join(__dirname, '..', 'assets', 'logo.png'),
    path.join(process.resourcesPath, 'electron', 'assets', 'logo.png')
  ];
  
  for (const imgPath of possiblePaths) {
    if (fs.existsSync(imgPath)) {
      try {
        trayImage = nativeImage.createFromPath(imgPath);
        if (!trayImage.isEmpty()) {
          console.log(`✅ Loaded tray icon from: ${imgPath}`);
          break;
        }
      } catch (err) {
        console.error(`⚠️ Failed to load image from ${imgPath}:`, err);
      }
    }
  }
  
  // Fallback to base64 cloud icon if no file works
  if (!trayImage || trayImage.isEmpty()) {
    const cloudIconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC672BQAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAXGBMVEUAAAD///////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvBg9nAAAAH3RSTlMAECBAcHCAgGBwYHCwcGBwgHBwcIBwgHBwcIBwgHBwgIBwgHCAgIKg6wQAAAAAi0lEQVQoz2NgwAMMGBkY2NhZ2Tk5uLm4eXiFhEVExSVEJSSlGKSlpGVk5eTlFRSVlFWUVVTFGFQZ1DU0NTS1GLS0dXT19A0MjYxNGBiMzS0sraxtGFgY7OwZ7B0cnZxdXN0Y3N09PL28fXj5+AUYBIWERUTFxCUkJSSlGKSlpGVk5eTlFRSVQAoASn4KLwF3aCcAAAAASUVORK5CYII=';
    trayImage = nativeImage.createFromDataURL(cloudIconBase64);
    console.log("ℹ️ Using self-contained base64 fallback tray icon");
  }
  
  // Set template image behavior on macOS so it adapts to system light/dark mode
  if (process.platform === 'darwin') {
    try {
      trayImage.setTemplateImage(true);
    } catch (e) {
      console.warn("Could not setTemplateImage:", e);
    }
  }
  
  try {
    tray = new Tray(trayImage);
    tray.setToolTip('ADS-Drive');
  } catch (err) {
    console.error("❌ Critical: Failed to instantiate Electron Tray:", err);
    return;
  }
  
  createTrayWindow();
  
  tray.on('click', (event, bounds) => {
    toggleTrayWindow(bounds);
  });
  
  registerTrayIpc();
}

function createTrayWindow() {
  trayWindow = new BrowserWindow({
    width: 360,
    height: 480,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  trayWindow.loadFile(path.join(__dirname, 'tray-popup.html'));
  
  // Hide the window when it loses focus
  trayWindow.on('blur', () => {
    trayWindow.hide();
  });
}

function toggleTrayWindow(bounds) {
  if (trayWindow.isVisible()) {
    trayWindow.hide();
  } else {
    positionTrayWindow(bounds);
    trayWindow.show();
    trayWindow.focus();
    // Refresh data in UI
    trayWindow.webContents.send('refresh-data');
  }
}

function positionTrayWindow(bounds) {
  const windowBounds = trayWindow.getBounds();
  const trayBounds = bounds || tray.getBounds();
  
  let x = 0;
  let y = 0;
  
  if (process.platform === 'darwin') {
    // macOS: Align center below the menubar icon
    x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    y = Math.round(trayBounds.y + trayBounds.height + 4);
  } else {
    // Windows/Linux: Align above/near the taskbar tray bottom-right
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    y = Math.round(trayBounds.y - windowBounds.height - 4);
    
    // Boundary checks
    if (x + windowBounds.width > width) {
      x = width - windowBounds.width - 10;
    }
    if (y < 0) {
      y = trayBounds.y + trayBounds.height + 4; // Taskbar is at the top
    }
  }
  
  trayWindow.setPosition(x, y, false);
}

function registerTrayIpc() {
  ipcMain.handle('tray:get-status-details', async () => {
    const config = ConfigService.loadConfig() || {};
    
    let totalSize = 0;
    let recentFiles = [];
    let isSyncing = false;
    
    try {
      // Get total storage usage from local files
      const stats = await new Promise((resolve) => {
        sqliteService.db.get(
          "SELECT SUM(size) as totalSize, COUNT(*) as fileCount FROM files WHERE isFolder = 0 AND isDeleted = 0",
          [],
          (err, row) => resolve(row || { totalSize: 0 })
        );
      });
      totalSize = stats.totalSize || 0;
      
      // Get syncing files & recently synced files
      recentFiles = await new Promise((resolve) => {
        sqliteService.db.all(
          `SELECT itemName as name, fullPath, size, syncStatus, modifiedDate 
           FROM files 
           WHERE isDeleted = 0 
           ORDER BY CASE WHEN syncStatus = 'SYNCING' THEN 0 ELSE 1 END, modifiedDate DESC 
           LIMIT 10`,
          [],
          (err, rows) => resolve(rows || [])
        );
      });
      
      isSyncing = recentFiles.some(f => f.syncStatus === 'SYNCING');
      
    } catch (e) {
      console.error("Error querying tray database info:", e);
    }
    
    return {
      username: config.username || 'User',
      email: config.userId ? `${config.username || 'user'}@adstest.io` : 'Not Logged In',
      folderPath: config.folderPath || '',
      totalSize: totalSize,
      isSyncing: isSyncing,
      recentFiles: recentFiles
    };
  });

  ipcMain.on('tray:open-folder', () => {
    const config = ConfigService.loadConfig();
    if (config && config.folderPath && fs.existsSync(config.folderPath)) {
      shell.openPath(config.folderPath);
    }
  });

  ipcMain.on('tray:open-web', () => {
    shell.openExternal('https://adstest.io');
  });

  ipcMain.on('tray:pause-sync', (event, hours) => {
    if (syncSchedulerRef) {
      syncSchedulerRef.pauseSync();
      // Set timer to resume
      setTimeout(() => {
        syncSchedulerRef.resumeSync();
      }, hours * 60 * 60 * 1000);
    }
  });

  ipcMain.on('tray:resume-sync', () => {
    if (syncSchedulerRef) {
      syncSchedulerRef.resumeSync();
    }
  });

  ipcMain.on('tray:quit', () => {
    app.quit();
  });
}

module.exports = { initTray };
