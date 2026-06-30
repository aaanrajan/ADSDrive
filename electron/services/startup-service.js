const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

class UpdateService {
  constructor(sendToRenderer, notify) {
    this.sendToRenderer = sendToRenderer;
    this.notify = notify;

    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.sendToRenderer('updater:event', { type: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      this.sendToRenderer('updater:event', { type: 'available', info });
      this.notify?.('ADSDrive Update', 'New update found. Downloading...');
    });

    autoUpdater.on('download-progress', (progress) => {
      this.sendToRenderer('updater:event', { type: 'progress', progress });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendToRenderer('updater:event', { type: 'downloaded', info });
      this.notify?.('ADSDrive Update', 'Update downloaded. Restart app to install.');
    });

    autoUpdater.on('error', (err) => {
      this.sendToRenderer('updater:event', { type: 'error', error: err.message });
    });
  }

  async check() {
    return autoUpdater.checkForUpdates();
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}

module.exports = UpdateService;