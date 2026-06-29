const fs = require("fs");
const path = require("path");
const SqliteService = require("./sqlite-service");
const sqliteService= SqliteService() // assuming sqliteService is defined in another file
const CloudService = require("./cloud-service"); // assuming cloudService is defined in another file
const cloudService = CloudService(); // replace with actual base URL
const configService = require("./config-service");

// dependencies are expected to be passed in
function FileManagerService() {
    let configData = configService.loadConfig();
    // const configService = ConfigService();
    configService.on(() => {
        configData = configService.loadConfig(); // pull fresh config when needed
    });
    // --------------------------
    // Public Main Function
    // --------------------------
    async function downloadItem(item, pinned = false) {
        try {
            const currentStatus = item.syncStatus;

            if (pinned) {
                if (currentStatus === "ALWAYS_KEEP_ON_THIS_DEVICE") {
                    return { status: currentStatus, message: `📌 Already pinned: ${item.fullPath}`, path: item.fullPath };
                }
                if (currentStatus === "AVAILABLE_OFFLINE") {
                    await sqliteService.updateItemStatus(item.id, "ALWAYS_KEEP_ON_THIS_DEVICE");
                    return { status: "ALWAYS_KEEP_ON_THIS_DEVICE", message: `📌 Promoted to pinned: ${item.fullPath}`, path: item.fullPath };
                }
            } else {
                if (currentStatus === "AVAILABLE_OFFLINE" || currentStatus === "ALWAYS_KEEP_ON_THIS_DEVICE") {
                    return { status: currentStatus, message: `✅ Already offline: ${item.fullPath}`, path: item.fullPath };
                }
            }

            // Perform actual download
            if (item.isFolder) {
                await downloadFolder(item);
            } else {
                await downloadFile(item);
            }

            const finalStatus = pinned ? "ALWAYS_KEEP_ON_THIS_DEVICE" : "AVAILABLE_OFFLINE";
            await sqliteService.updateItemStatus(item.id, finalStatus);

            return { status: finalStatus, message: `✅ Downloaded successfully: ${item.fullPath}`, path: item.fullPath };
        } catch (error) {
            console.error(`❌ Failed to download item ${item.fullPath}`, error);
            throw error;
        }
    }

    async function removeLocalItem(item) {
        try {
            if (!fs.existsSync(item.fullPath)) {
                return { success: true, message: `ℹ️ File/folder not found locally: ${item.fullPath}`, path: item.fullPath };
            }

            if (item.isFolder) {
                try {
                    fs.rmSync(item.fullPath, { recursive: true, force: false });
                    return { success: true, message: `✅ Folder removed locally: ${item.fullPath}`, path: item.fullPath };
                } catch (err) {
                    if (err.code === "EPERM") {
                        return { success: false, message: `⚠️ Cannot remove folder ${item.fullPath}: folder may be open or locked.`, path: item.fullPath };
                    } else throw err;
                }
            } else {
                try {
                    fs.unlinkSync(item.fullPath);
                    return { success: true, message: `✅ File removed locally: ${item.fullPath}`, path: item.fullPath };
                } catch (err) {
                    if (err.code === "EPERM") {
                        return { success: false, message: `⚠️ Cannot remove file ${item.fullPath}: file may be open or locked.`, path: item.fullPath };
                    } else throw err;
                }
            }
        } catch (error) {
            console.error(`❌ Failed to remove local item ${item.fullPath}`, error);
            return { success: false, message: `❌ Failed to remove local item: ${error.message}`, path: item.fullPath };
        }
    }

    async function releaseItem(item, type) {
        try {
            const removalResult = await removeLocalItem(item);
            console.log('removalResult', removalResult, "\n\n");
            if (!removalResult.success) {
                return { success: false, status: item.syncStatus, message: removalResult.message, path: item.fullPath };
            }
            let status = 'AVAILABLE_ONLINE_ONLY'
            if(type == 'REMOVE' &&  configData.isDeleteCloud) {
                const res =  await cloudService.deleteCloudItem(item.cloudItemId);
                if (res && res.success) {
                    await sqliteService.deleteItemById(item.id);
                    if (item.isFolder) {    
                        await deleteFolderById(item.id) 
                    }
                    return { success: true, status, message: `☁️ Permanent Deleted: ${item.fullPath}`, path: item.fullPath };;
                } else {
                    status = 'FAILED_CLOUD_DELETE'
                }
            }
            await sqliteService.updateItemStatus(item.id, status);
            if (item.isFolder) {
                await updateFolderStatus(item.id, status);
            }
            return { success: true, status, message: `☁️ Released to cloud only: ${item.fullPath}`, path: item.fullPath };
        } catch (error) {
            console.error(`❌ Failed to release item ${item.fullPath}`, error);
            return { success: false, status: item.syncStatus, message: `❌ Failed to release: ${error.message}`, path: item.fullPath };
        }
    }

    // --------------------------
    // Folder Handling
    // --------------------------
    async function downloadFolder(folder) {
        ensureDir(folder.fullPath);

        const descendants = await getAllDescendants(folder.id);

        for (const child of descendants) {
            if (child.isFolder) ensureDir(child.fullPath);
            else if (child.fileDetailId) await downloadCloudFile(child);
        }

        await updateFolderStatus(folder.id, null);
    }

    async function getAllDescendants(parentId) {
        const children = await sqliteService.getChildrenByParentId(parentId);
        let all = [...children];

        for (const child of children) {
            if (child.isFolder) {
                const sub = await getAllDescendants(child.id);
                all = all.concat(sub);
            }
        }

        return all;
    }

    // --------------------------
    // File Handling
    // --------------------------
    async function downloadFile(file) {
        const parentFolders = getParentFolders(file.fullPath);
        const existing = await sqliteService.getItemsByFullPaths(parentFolders);
        const existingPaths = new Set(existing.map(e => e.fullPath));

        for (const folderPath of parentFolders) {
            ensureDir(folderPath);

            if (!existingPaths.has(folderPath)) {
                await sqliteService.insertOrUpdateFile({
                    id: generateUUID(),
                    userId: file.userId,
                    ownerId: file.ownerId,
                    itemName: path.basename(folderPath),
                    fullPath: folderPath,
                    size: 0,
                    fileType: "folder",
                    isFolder: true,
                    parentId: await sqliteService.getParentId(folderPath),
                    syncStatus: "PARTIALLY_AVAILABLE",
                });

                console.log(`Created folder record in DB: ${folderPath} \n\n`);
            }
        }

        ensureDir(path.dirname(file.fullPath));

        if (file.fileDetailId) {
            await downloadCloudFile(file);
        }

        await sqliteService.updateItemStatus(file.id, "AVAILABLE_OFFLINE");

        const parentId = await sqliteService.getParentId(file.fullPath);
        if (parentId) {
            await updateFolderStatus(parentId, null);
        }
    }

    // --------------------------
    // Helpers
    // --------------------------
    function ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    }

    function getParentFolders(fullPath) {
        const basePath = configData?.folderPath || "";
        const folders = [];
        let parentPath = path.dirname(fullPath);

        const normalizedBase = path.resolve(basePath);

        while (parentPath && parentPath !== path.parse(parentPath).root && parentPath.startsWith(normalizedBase)) {
            if (parentPath !== normalizedBase) {
                folders.unshift(parentPath);
            }
            parentPath = path.dirname(parentPath);
        }

        return folders;
    }

    async function downloadCloudFile(file) {
        ensureDir(path.dirname(file.fullPath));

        if (file.fileDetailId) {
            const data = await cloudService.fetchFileBinary(file.fileDetailId);
            fs.writeFileSync(file.fullPath, Buffer.from(data));
        }

        await sqliteService.updateItemStatus(file.id, "AVAILABLE_OFFLINE");

        const parentId = await sqliteService.getParentId(file.fullPath);
        if (parentId) await updateFolderStatus(parentId, null);
    }

    async function updateFolderStatus(folderId, status) {
        const children = await sqliteService.getChildrenByParentId(folderId);
        if (!children.length) return;
        let allOffline = true;
        for (const child of children) {
            if (child.isFolder) {
                await updateFolderStatus(child.id, status);
                const updatedChild = await sqliteService.getItemById(child.id);
                if (updatedChild.syncStatus !== "AVAILABLE_OFFLINE") allOffline = false;
            } else {
                if (status) await sqliteService.updateItemStatus(child.id, status);

                if (child.syncStatus !== "AVAILABLE_OFFLINE") allOffline = false;
            }
        }

        const folderStatus = status ? status :  allOffline ? "AVAILABLE_OFFLINE" : "PARTIAL_OFFLINE";
        await sqliteService.updateItemStatus(folderId, folderStatus);
    }

    async function deleteFolderById(folderId) {
        const children = await sqliteService.getChildrenByParentId(folderId);
        if (!children.length) return;
        for (const child of children) {
            if (child.isFolder) {
                await deleteFolderById(child.id);
            } else {
             await sqliteService.deleteItemById(child.id);
            }
        }
        await sqliteService.deleteItemById(folderId);
    }
    // --------------------------
    // Utility
    // --------------------------
    function generateUUID() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0,
                v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    
    async function replaceLocalFile(file) {

        try {

            // -----------------------------------
            // VALIDATE
            // -----------------------------------

            if (!file?.fileDetailId) {

                console.log(
                    "⚠️ Missing fileDetailId"
                );

                return false;
            }

            if (!file?.fullPath) {

                console.log(
                    "⚠️ Missing fullPath \n\n"
                );

                return false;
            }

            // -----------------------------------
            // ENSURE DIRECTORY
            // -----------------------------------

            const parentDir =
                path.dirname(
                    file.fullPath
                );

            if (!fs.existsSync(parentDir)) {

                fs.mkdirSync(
                    parentDir,
                    {
                        recursive: true
                    }
                );
            }

            // -----------------------------------
            // FETCH CLOUD FILE
            // -----------------------------------

            console.log(
                `☁️ Downloading ${file.fullPath} \n\n`
            );

            const data =
                await cloudService
                    .fetchFileBinary(
                        file.fileDetailId
                    );
            const exists = fs.existsSync(file.fullPath);

            fs.writeFileSync(
                file.fullPath,
                Buffer.from(data)
            );

            console.log(
                exists
                    ? `♻️ Replaced file: ${file.fullPath}`
                    : `✅ Created file: ${file.fullPath}`, "\n\n"
            );
            await sqliteService.updateItemStatus(file.id, 'AVAILABLE_OFFLINE', file.version).catch(console.error);

            return true;

        } catch (err) {

            console.error(
                `❌ Download failed: ${file.fullPath}`,
                err
            );

            return false;
        }
    }

    async function replaceCloudFile(file) {
        try {

            if (!file?.fileDetailId) {
                console.log("⚠️ Missing fileDetailId", "\n\n");
                return { success: false, message: "Missing fileDetailId" };
            }

            if (!file?.fullPath) {
                console.log("⚠️ Missing fullPath", "\n\n");
                return { success: false, message: "Missing fullPath" };
            }

            if (!fs.existsSync(file.fullPath)) {
                console.log(`⚠️ Local file not found: ${file.fullPath}`, "\n\n");
                return { success: false, message: "Local file not found" };
            }

            const data = fs.readFileSync(file.fullPath);

            const res = await cloudService.replaceFile(file.fullPath, file.fileDetailId);
            console.log('Replace cloud file response:', res);
            if (res && res.success) {
                console.log(`✅ Cloud file replaced successfully: ${file.fullPath}`, "\n\n");
                await sqliteService.updateItemStatus(file.id, 'AVAILABLE_OFFLINE').catch(console.error);
                return { success: true, message: "Cloud file replaced successfully" };
            } else {
                console.error(`❌ Cloud file replace failed: ${file.fullPath}`, res);
                return { success: false, message: "Cloud file replace failed" };
            }

        } catch (err) {
            console.error(`❌ Replace failed: ${file.fullPath}`, err);
            return { success: false, message: `Replace failed: ${err.message}` };
        }
        // Implementation for replacing cloud file
    }

    return {
        downloadItem,
        removeLocalItem,
        releaseItem,
        replaceLocalFile,
        replaceCloudFile,
    };
}

module.exports = FileManagerService;
