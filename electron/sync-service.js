const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SyncService {
  constructor(apiBaseUrl) {
    this.apiUrl = apiBaseUrl;
    this.isSync = false;
  }

  // Upload file to cloud
  async uploadFile(localPath, userId) {
    try {
      console.log(`☁️ Uploading: ${localPath}`);

      const fileData = fs.readFileSync(localPath);
      const fileName = path.basename(localPath);

      const formData = new FormData();
      formData.append('file', new Blob([fileData]), fileName);
      formData.append('userId', userId);

      const response = await axios.post(
        `${this.apiUrl}/api/files/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      console.log(`✅ Uploaded: ${fileName}`);
      return {
        success: true,
        cloudItemId: response.data.id,
        fileDetailId: response.data.fileDetailId
      };
    } catch (error) {
      console.error(`❌ Upload failed: ${localPath}`, error);
      return { success: false, error: error.message };
    }
  }

  // Download file from cloud
  async downloadFile(fileDetailId, localPath) {
    try {
      console.log(`📥 Downloading: ${localPath}`);

      const response = await axios.get(
        `${this.apiUrl}/api/files/download/${fileDetailId}`,
        { responseType: 'arraybuffer' }
      );

      fs.writeFileSync(localPath, Buffer.from(response.data));
      console.log(`✅ Downloaded: ${localPath}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Download failed: ${localPath}`, error);
      return { success: false, error: error.message };
    }
  }

  // Sync local changes with cloud
  async performSync(filesList) {
    if (this.isSync) {
      console.log('⚠️ Sync already running');
      return;
    }

    this.isSync = true;

    try {
      for (const file of filesList) {
        if (file.syncStatus === 'PENDING') {
          await this.uploadFile(file.fullPath, file.userId);
        }
      }
      console.log('✅ Sync completed');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.isSync = false;
    }
  }

  // Get metadata from cloud
  async getCloudMetadata(userId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/files/metadata?userId=${userId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get metadata:', error);
      return [];
    }
  }
}

module.exports = SyncService;