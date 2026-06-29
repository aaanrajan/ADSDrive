const fs = require('fs');
const path = require('path');
const os = require('os');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  return fs.writeFileSync(filePath, content);
}

function createDir(dirPath) {
  return fs.mkdirSync(dirPath, { recursive: true });
}

function listDir(dirPath) {
  return fs.readdirSync(dirPath);
}
function exists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

function joinPath(...args) {
  return path.join(...args);
}

function homeDir() {
  return os.homedir();
}

function stat(filePath) {
  const stats = fs.statSync(filePath);
  return {
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
  };
}

module.exports = {
  readFile,
  writeFile,
  createDir,
  listDir,
  exists,
  joinPath,
  homeDir,
  stat,
};
