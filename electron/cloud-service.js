const axios = require("axios");
const { app } = require('electron');

const fs = require("fs");
const path = require("path");
const FormData = require("form-data"); // from npm "form-data"
const isDev = !app.isPackaged;
const baseURL = 'https://api-drive.adstest.io';

function CloudService() {
    const http = axios.create({
        baseURL: baseURL,
        timeout: 60_000, // 60s per request
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });

    const chunkSize = 1024 * 1024 * 10; // 10 MB
    const cancelMap = new Map();
    const pauseMap = new Map();

    // Log full request URL
    http.interceptors.request.use((config) => {
        console.log(`➡️ Request URL: ${config.baseURL}${config.url} \n\n`);
        return config;
    });

    async function createOrUpdateFolder(obj) {
        try {
            const res = await http.put("/drive", obj);
            console.log(`⬅️ Response URL: ${res.config.url} | Status: ${res.status} \n\n`);
            return { success: true, data: res.data?.data, statusCode: res.status };
        } catch (err) {
            return handleError(err);
        }
    }

    async function uploadFile(fullPath, userId, parentId, fileDetailId) {
        try {
            const stat = await fs.promises.stat(fullPath);
            const fileSize = stat.size;
            const totalChunks = Math.ceil(fileSize / chunkSize);
            let currentChunk = 0;
            const fileName = path.basename(fullPath);

            let lastResponse = null;

            while (currentChunk < totalChunks) {
                if (cancelMap.get(fullPath)) {
                    cancelMap.delete(fullPath);
                    return { success: false, errorMessage: "Upload canceled" };
                }

                if (pauseMap.get(fullPath)) {
                    await new Promise((res) => setTimeout(res, 500));
                    continue;
                }

                const start = currentChunk * chunkSize;
                const end = Math.min(start + chunkSize, fileSize);

                const stream = fs.createReadStream(fullPath, { start, end: end - 1 });
                const formData = new FormData();

                formData.append("uid", userId);
                if (parentId) formData.append("pid", parentId);
                if (fileDetailId) formData.append("fileDetailId", fileDetailId);

                let endpoint = "/drive/upload-and-save";
                const isChunked = totalChunks > 1;

                if (isChunked) {
                    formData.append("file", stream, fileName);
                    formData.append("chunkIndex", currentChunk.toString());
                    formData.append("totalChunks", totalChunks.toString());
                    formData.append("fileName", fileName);
                    formData.append("length", fileSize.toString());

                    endpoint = "/drive/upload-large-and-save";
                } else {
                    formData.append("file", stream, fileName);
                }

                const res = await http.post(endpoint, formData, {
                    headers: formData.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                });

                lastResponse = res;
                console.log(`✅ Uploaded chunk ${currentChunk + 1}/${totalChunks} \n\n`);
                currentChunk++;
            }

            return {
                success: true,
                data: lastResponse?.data?.data,
                statusCode: lastResponse?.status,
            };
        } catch (err) {
            console.error("❌ Upload error", err.message);
            return {
                success: false,
                errorMessage: err.message,
                statusCode: err.response?.status,
                data: err.response?.data,
            };
        }
    }

    async function updateFileName(obj) {
        try {
            const res = await http.patch("/drive", obj);
            return { success: true, data: res.data, statusCode: res.status };
        } catch (err) {
            return handleError(err);
        }
    }

    function handleError(err) {
        if (axios.isAxiosError(err)) {
            let errorMessage = "Unknown error occurred";
            if (err.response?.data) {
                const data = err.response.data;
                if (data.message && typeof data.message === "string") {
                    errorMessage = data.message;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            const method = err.config?.method?.toUpperCase() || "UNKNOWN";
            const url = `${err.config?.baseURL || ""}${err.config?.url || ""}`;
            const status = err.response?.status || "NO_STATUS";

            console.error(`❌ Error ${method} ${url} | Status: ${status} | Message: ${errorMessage}`);

            return { success: false, statusCode: err.response?.status, errorMessage };
        } else {
            return { success: false, errorMessage: "Unknown error occurred" };
        }
    }

    async function getCloudData(payload) {
        try {
            const res = await http.post("/drive/page/list", payload);
            return { success: true, data: res.data?.data, statusCode: res.status };
        } catch (err) {
            return {
                success: false,
                errorMessage: err.message || "Request failed",
                statusCode: err.status,
            };
        }
    }
    async function deleteCloudItem(id) {
        try {
            const res = await http.delete(`/drive/${id}`);
            console.log(`⬅️ Response URL: ${res.config.url} | Status: ${res.status} \n\n`);
            return { success: true, statusCode: res.status };
        } catch (err) {
            return handleError(err);
        }
    }

    function buildDownloadUrl(docId) {
        return `${baseURL}/file/download/file?fileId=${docId}`;
    }

    async function fetchFileBinary(docId) {
        const url = buildDownloadUrl(docId);
        const response = await axios.get(url, { responseType: "arraybuffer" });
        return response.data;
    }

    async function replaceFile(fullPath, fileDetailId) {
        try {
            const fileName = path.basename(fullPath);

            const stream = fs.createReadStream(fullPath);

            const formData = new FormData();

            formData.append("file", stream, fileName);

            const res = await http.post(
                `/file/${fileDetailId}/replace`,
                formData,
                {
                    headers: formData.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                }
            );

            console.log("✅ File replaced successfully \n\n");

            return {
                success: true,
                data: res.data?.data,
                statusCode: res.status,
            };

        } catch (err) {

            console.error("❌ Replace file error:", err.message);
            console.error("❌ Replace file FULL error:", {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
                headers: err.response?.headers
            });
            return {
                success: false,
                errorMessage: err.message,
                statusCode: err.response?.status,
                data: err.response?.data,
            };
        }
    }

    async function getAvailableVersions(payload) {
        try {
            const res = await http.post("/file/available-versions", payload);
            return { success: true, data: res.data?.data, statusCode: res.status };
        } catch (err) {
              console.error("❌ Get available versions FULL error:", {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
                headers: err.response?.headers
            });
            return {
                success: false,
                errorMessage: err.message || "Request failed",
                statusCode: err.status,
            };
        }
    }
    async function getSharedData(payload) {
        try {
            const res = await http.post("/file-sharing/sync", payload);
            return { success: true, data: res.data, statusCode: res.status };
        } catch (err) {
            return {
                success: false,
                errorMessage: err.message || "Request failed",
                statusCode: err.status,
            };
        }
    }

    async function getRecursiveSharedData(payload) {
        console.log('payload for get data', payload)
        try {
            const res = await http.post("/drive/recursive/sync", payload);
            return { success: true, data: res.data, statusCode: res.status };
        } catch (err) {
            return {
                success: false,
                errorMessage: err.message || "Request failed",
                statusCode: err.status,
            };
        }
    }
    return {
        createOrUpdateFolder,
        uploadFile,
        updateFileName,
        getCloudData,
        fetchFileBinary,
        deleteCloudItem,
        cancelMap,
        pauseMap,
        replaceFile,
        getAvailableVersions,
        getSharedData,
        getRecursiveSharedData
    };
}

module.exports = CloudService;
