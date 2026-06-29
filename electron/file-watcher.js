const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

let watcher = null;

function startWatcher(syncFolderPath, onFileChange) {
  console.log(`👀 Watching folder: ${syncFolderPath}`);

  watcher = chokidar.watch(syncFolderPath, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 300 }
  });

  // When file is added
  watcher.on('add', (filePath) => {
    console.log(`✏️ File added: ${filePath}`);
    onFileChange({
      type: 'ADD',
      path: filePath,
      size: fs.statSync(filePath).size
    });
  });

  // When file is modified
  watcher.on('change', (filePath) => {
    console.log(`📝 File changed: ${filePath}`);
    onFileChange({
      type: 'CHANGE',
      path: filePath,
      modifiedTime: fs.statSync(filePath).mtime
    });
  });

  // When file is deleted
  watcher.on('unlink', (filePath) => {
    console.log(`🗑️ File deleted: ${filePath}`);
    onFileChange({
      type: 'DELETE',
      path: filePath
    });
  });

  // When folder is added
  watcher.on('addDir', (dirPath) => {
    console.log(`📁 Folder added: ${dirPath}`);
    onFileChange({
      type: 'ADD_DIR',
      path: dirPath
    });
  });
}

function stopWatcher() {
  if (watcher) {
    watcher.close();
    console.log('🛑 Watcher stopped');
  }
}

module.exports = { startWatcher, stopWatcher };