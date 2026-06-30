const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

class TrayService {
  constructor(app, getMainWindow, onSyncNow) {
    this.app = app;
    this.getMainWindow = getMainWindow;
    this.onSyncNow = onSyncNow;
    this.tray = null;
  }

  create() {
    // replace with your icon file if available
    const icon = nativeImage.createEmpty();
    this.tray = new Tray(icon);
    this.tray.setToolTip('ADSDrive');

    const menu = Menu.buildFromTemplate([
      { label: 'Open ADSDrive', click: () => this.getMainWindow()?.show() },
      { label: 'Sync Now', click: () => this.onSyncNow?.() },
      { type: 'separator' },
      { label: 'Quit', click: () => this.app.quit() }
    ]);

    this.tray.setContextMenu(menu);
  }

  setStatus(text) {
    if (this.tray) this.tray.setToolTip(`ADSDrive - ${text}`);
  }
}

module.exports = TrayService;