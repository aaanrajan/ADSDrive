const { execFile, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

function getMacAppPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "electron", "mac-native", "ADSDrive.app")
    : path.join(__dirname, "ADSDrive.app");
}

function getMacBinaryPath() {
  return path.join(getMacAppPath(), "Contents", "MacOS", "ADSDrive");
}

function clearQuarantine() {
  try {
    const groupPath =
      `${process.env.HOME}/Library/Group Containers/group.com.ads.ADSDriveMac`;

    if (!fs.existsSync(groupPath)) {
      console.log("⚠️ App Group path missing:", groupPath);
      return;
    }

    execSync(`xattr -cr "${groupPath}"`, { stdio: "ignore" });
    execSync(`chmod -R u+rw,go+r "${groupPath}"`, { stdio: "ignore" });

    console.log("✅ App Group permissions fixed");
  } catch (err) {
    console.log("⚠️ permission fix skipped:", err.message);
  }
}

function runMacApp(args, afterRun) {
//   const binaryPath = getMacBinaryPath();

//   if (!fs.existsSync(binaryPath)) {
//     console.log("❌ ADSDrive binary missing:", binaryPath);
//     return;
//   }

  console.log("🔥 Running Mac binary:", binaryPath);
  console.log("🔥 Args:", args[0], args[1]?.length);

  execFile(binaryPath, args, (err) => {
  if (err) {
    console.error("❌ Failed to run ADSDrive binary", err);
    return;
  }

  console.log("✅ ADSDrive binary executed with args");

  setTimeout(() => {
    clearQuarantine();
  }, 2500);
});
}

function writeJsonDirect(fileName, data) {
  const groupPath =
    `${process.env.HOME}/Library/Group Containers/group.com.ads.ADSDriveMac`;

  fs.mkdirSync(groupPath, { recursive: true });

  const filePath = path.join(groupPath, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  fs.chmodSync(filePath, 0o644);

  try {
    execSync(`xattr -d com.apple.quarantine "${filePath}"`, {
      stdio: "ignore",
    });
  } catch {}

  console.log(`✅ Wrote AppGroup JSON directly: ${filePath}`);
}

function writeMacConfig(config) {
  const macConfig = {
    apiBaseUrl: config.apiBaseUrl || "https://api-drive.adstest.io",
    userId: config.userId,
    username: config.username,
    accessToken: config.accessToken || config.token,
    folderPath: config.folderPath,
  };

  writeJsonDirect("config.json", macConfig);
}

function writeFileStatus(files) {
  console.log("🔥 writeFileStatus called");
  console.log("🔥 FILES LENGTH:", files.length);

  writeJsonDirect("file-status.json", files);
}

module.exports = {
  writeMacConfig,
  writeFileStatus,
  clearQuarantine
};