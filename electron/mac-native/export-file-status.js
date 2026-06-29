const SqliteService = require("../sqlite-service");
const { writeFileStatus } = require("./app-group-store");

const sqliteService = SqliteService();

async function exportFileStatusToMac() {
  if (process.platform !== 'darwin') return 0;
  console.log("🔥 exportFileStatusToMac called");

  const files = await sqliteService.getAllFiles();

  console.log("🔥 SQLITE FILE COUNT:", files.length);

  if (files.length > 0) {
    console.log("🔥 FIRST FILE:", JSON.stringify(files[0], null, 2));
  }

  const mapped = files.map((file) => ({
    id: file.cloudItemId || file.id,
    localId: file.id,
    itemName: file.itemName,
    name: file.itemName,
    fullPath: file.fullPath,
    parentId: file.parentId || "root",
    isFolder: !!file.isFolder,
    size: file.size || 0,
    syncStatus: file.syncStatus || "AVAILABLE_ONLINE_ONLY",
    fileDetailId: file.fileDetailId,
    cloudItemId: file.cloudItemId
  }));

  console.log("🔥 MAPPED FILE COUNT:", mapped.length);

  writeFileStatus(mapped);

  return mapped.length;
}

module.exports = {
  exportFileStatusToMac
};