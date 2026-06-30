const path = require('path');
const { app } = require('electron');
const sqlite3 = require('sqlite3').verbose();

class SqliteService {
  constructor() { this.db = null; }

  init() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(app.getPath('userData'), 'adsdrive.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) return reject(err);
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  createTables() {
    const sql = `
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        itemName TEXT NOT NULL,
        fullPath TEXT UNIQUE NOT NULL,
        size INTEGER DEFAULT 0,
        isFolder INTEGER DEFAULT 0,
        syncStatus TEXT DEFAULT 'PENDING',
        modifiedDate TEXT,
        version INTEGER DEFAULT 1,
        cloudItemId TEXT,
        cloudVersion INTEGER DEFAULT 0,
        lastSyncedAt TEXT,
        conflict INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `;
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });
  }

  upsertFile(file) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO files (id,itemName,fullPath,size,isFolder,syncStatus,modifiedDate,version,cloudItemId,cloudVersion,lastSyncedAt,conflict)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(fullPath) DO UPDATE SET
          itemName=excluded.itemName,
          size=excluded.size,
          isFolder=excluded.isFolder,
          syncStatus=excluded.syncStatus,
          modifiedDate=excluded.modifiedDate,
          version=files.version + 1
      `;
      this.db.run(sql, [
        file.id, file.itemName, file.fullPath, file.size || 0, file.isFolder ? 1 : 0,
        file.syncStatus || 'PENDING', file.modifiedDate || new Date().toISOString(),
        file.version || 1, file.cloudItemId || null, file.cloudVersion || 0,
        file.lastSyncedAt || null, file.conflict ? 1 : 0
      ], (err) => err ? reject(err) : resolve());
    });
  }

  updateSyncSuccess(fullPath, cloudItemId, cloudVersion) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE files
         SET syncStatus='SYNCED', cloudItemId=?, cloudVersion=?, conflict=0, lastSyncedAt=?
         WHERE fullPath=?`,
        [cloudItemId || null, cloudVersion || 0, new Date().toISOString(), fullPath],
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  updateStatus(fullPath, status) {
    return new Promise((resolve, reject) => {
      this.db.run(`UPDATE files SET syncStatus=? WHERE fullPath=?`, [status, fullPath], (err) =>
        err ? reject(err) : resolve()
      );
    });
  }

  setConflict(fullPath, isConflict = true) {
    return new Promise((resolve, reject) => {
      this.db.run(`UPDATE files SET conflict=?, syncStatus='CONFLICT' WHERE fullPath=?`, [isConflict ? 1 : 0, fullPath], (err) =>
        err ? reject(err) : resolve()
      );
    });
  }

  deleteByPath(fullPath) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM files WHERE fullPath=?`, [fullPath], (err) => err ? reject(err) : resolve());
    });
  }

  getAllFiles() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM files ORDER BY datetime(modifiedDate) DESC`, [], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  }

  getPending() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM files WHERE syncStatus IN ('PENDING','CHANGE_PENDING','ERROR')`,
        [],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });
  }

  setConfig(key, value) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO config (key,value) VALUES (?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [key, JSON.stringify(value)],
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  getConfig(key) {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT value FROM config WHERE key=?`, [key], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        try { resolve(JSON.parse(row.value)); } catch { resolve(null); }
      });
    });
  }
}

module.exports = SqliteService;