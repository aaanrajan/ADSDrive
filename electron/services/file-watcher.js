const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileWatcherService {
  constructor(sqliteService, onEvent, getSelectiveSyncPaths) {
    this.sqlite = sqliteService;
    this.onEvent = onEvent;
    this.getSelectiveSyncPaths = getSelectiveSyncPaths; // array of allowed absolute folders
    this.watcher = null;
  }

  makeId(fullPath) {
    return crypto.createHash('md5').update(fullPath).digest('hex');
  }

  isAllowed(fullPath) {
    const paths = this.getSelectiveSyncPaths?.() || [];
    if (!paths.length) return true; // if none set => sync all
    return paths.some((allowed) => fullPath.startsWith(allowed));
  }

  async fileRecord(fullPath, status = 'PENDING') {
    const exists = fs.existsSync(fullPath);
    const stat = exists ? fs.statSync(fullPath) : null;
    const isFolder = stat ? stat.isDirectory() : false;

    return {
      id: this.makeId(fullPath),
      itemName: path.basename(fullPath),
      fullPath,
      size: stat && !isFolder ? stat.size : 0,
      isFolder,
      syncStatus: status,
      modifiedDate: stat ? stat.mtime.toISOString() : new Date().toISOString()
    };
  }

  async start(rootPath) {
    await this.stop();

    this.watcher = chokidar.watch(rootPath, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    });

    this.watcher.on('all', async (event, p) => {
      if (!this.isAllowed(p)) return;

      if (event === 'add' || event === 'addDir') {
        const rec = await this.fileRecord(p, 'PENDING');
        await this.sqlite.upsertFile(rec);
        this.onEvent?.({ type: event === 'add' ? 'ADD' : 'ADD_DIR', path: p });
      } else if (event === 'change') {
        const rec = await this.fileRecord(p, 'CHANGE_PENDING');
        await this.sqlite.upsertFile(rec);
        this.onEvent?.({ type: 'CHANGE', path: p });
      } else if (event === 'unlink' || event === 'unlinkDir') {
        await this.sqlite.deleteByPath(p);
        this.onEvent?.({ type: event === 'unlink' ? 'DELETE' : 'DELETE_DIR', path: p });
      }
    });
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}

module.exports = FileWatcherService;