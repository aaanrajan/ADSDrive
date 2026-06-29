const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
  writeFile: (filePath, content) => fs.writeFileSync(filePath, content),
  listDir: (dirPath) => fs.readdirSync(dirPath),
  
  // IPC methods
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => ipcRenderer.on(channel, (e, data) => callback(data)),
  
  // Config methods
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getFiles: () => ipcRenderer.invoke('get-files'),
  manualSync: () => ipcRenderer.invoke('manual-sync')
});