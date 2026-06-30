const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

class CloudService {
  constructor(apiBaseUrl, tokenProvider, getThrottle) {
    this.api = axios.create({
      baseURL: apiBaseUrl,
      timeout: 60000
    });
    this.tokenProvider = tokenProvider;
    this.getThrottle = getThrottle; // returns { uploadKBps, downloadKBps }
  }

  async authHeaders() {
    const token = await this.tokenProvider?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async applyThrottleBySize(bytes, mode = 'upload') {
    const throttle = this.getThrottle?.() || { uploadKBps: 0, downloadKBps: 0 };
    const kbps = mode === 'upload' ? throttle.uploadKBps : throttle.downloadKBps;
    if (!kbps || kbps <= 0) return; // 0 = unlimited

    const ms = Math.ceil((bytes / 1024 / kbps) * 1000);
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }

  async uploadFile(file) {
    const stat = fs.statSync(file.fullPath);

    const form = new FormData();
    form.append('file', fs.createReadStream(file.fullPath), path.basename(file.fullPath));
    form.append('clientFileId', file.id);
    form.append('modifiedDate', file.modifiedDate || new Date().toISOString());

    const headers = { ...(await this.authHeaders()), ...form.getHeaders() };

    await this.applyThrottleBySize(stat.size, 'upload');
    const res = await this.api.post('/api/files/upload', form, { headers });
    return res.data;
  }

  async downloadFile(fileId, targetPath) {
    const headers = await this.authHeaders();
    const res = await this.api.get(`/api/files/download/${fileId}`, {
      responseType: 'arraybuffer',
      headers
    });

    const bytes = res.data?.byteLength || 0;
    await this.applyThrottleBySize(bytes, 'download');

    fs.writeFileSync(targetPath, Buffer.from(res.data));
    return true;
  }

  async getMetadata(userId) {
    const res = await this.api.get('/api/files/metadata', {
      params: { userId },
      headers: await this.authHeaders()
    });
    return res.data || [];
  }
}

module.exports = CloudService;