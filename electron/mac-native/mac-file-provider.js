const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

function getHelperPath() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "electron",
      "mac-native",
      "ADSDrive"
    );
  }

  return path.join(
    __dirname,
    "ADSDrive"
  );
}

function registerMacFileProvider(config) {
  if (process.platform !== "darwin") return;

  if (!config?.userId || !config?.folderPath) {
    console.log("Mac File Provider skipped: missing config");
    return;
  }

  const helperPath = getHelperPath();

  if (!fs.existsSync(helperPath)) {
    console.log("Mac helper not found:", helperPath);
    return;
  }

  const child = spawn(helperPath, [
    "register",
    config.userId,
    config.username || "",
    config.folderPath
  ], {
    detached: true,
    stdio: "ignore"
  });

  child.unref();

  console.log("Mac File Provider register requested");
}

module.exports = {
  registerMacFileProvider
};