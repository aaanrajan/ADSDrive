const fs = require('fs');

class SyncService {
  constructor(sqliteService, cloudService, onEvent, notify) {
    this.sqlite = sqliteService;
    this.cloud = cloudService;
    this.onEvent = onEvent;
    this.notify = notify;
    this.running = false;
  }

  async runOnce(userId) {
    if (this.running) return { success: false, message: 'Sync already running' };
    this.running = true;

    try {
      const pending = await this.sqlite.getPending();
      for (const file of pending) {
        if (!fs.existsSync(file.fullPath)) {
          await this.sqlite.updateStatus(file.fullPath, 'DELETED_LOCAL');
          continue;
        }

        await this.sqlite.updateStatus(file.fullPath, 'SYNCING');
        this.onEvent?.({ type: 'SYNC_PROGRESS', path: file.fullPath });

        try {
          // Basic conflict rule (example):
          // if cloudVersion > local version => conflict
          // (in real app, compare cloud metadata timestamp/version first)
          if ((file.cloudVersion || 0) > (file.version || 1)) {
            await this.sqlite.setConflict(file.fullPath, true);
            this.notify?.('Conflict detected', file.itemName);
            this.onEvent?.({ type: 'SYNC_CONFLICT', path: file.fullPath });
            continue;
          }

          const result = await this.cloud.uploadFile(file);
          await this.sqlite.updateSyncSuccess(
            file.fullPath,
            result?.cloudItemId || file.cloudItemId,
            result?.version || ((file.cloudVersion || 0) + 1)
          );

          this.onEvent?.({ type: 'SYNC_COMPLETED', path: file.fullPath, id: file.id });
        } catch (err) {
          await this.sqlite.updateStatus(file.fullPath, 'ERROR');
          this.onEvent?.({ type: 'SYNC_FAILED', path: file.fullPath, message: err.message });
        }
      }

      return { success: true, message: 'Sync completed' };
    } finally {
      this.running = false;
    }
  }
}

module.exports = SyncService;