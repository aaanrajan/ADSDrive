const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

function startMacHelper() {
  if (process.platform !== "darwin") return;

  const appPath = app.isPackaged
    ? path.join(process.resourcesPath, "electron", "mac-native", "ADSDrive.app")
    : path.join(__dirname, "ADSDrive.app");

  if (!fs.existsSync(appPath)) {
    console.log("❌ ADSDrive.app missing:", appPath);
    return;
  }

  execFile("open", [appPath]);
  console.log("✅ ADSDrive.app opened");
}

module.exports = { startMacHelper };