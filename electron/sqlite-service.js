const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

function SqliteService() {
  const dbPath = path.join(app.getPath('userData'), 'ads-drive.db');
  let db = null;

  function initializeDb() {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('DB connection failed:', err);
      else console.log('✅ Database connected');
      createTables();
    });
  }

  function createTables() {
    db.serialize(() => {
      // Files table - tracks all local files
      db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          itemName TEXT NOT NULL,
          size INTEGER,
          fileType TEXT,
          fullPath TEXT UNIQUE,
          isFolder BOOLEAN,
          syncStatus TEXT,
          cloudItemId TEXT,
          fileDetailId TEXT,
          version INTEGER DEFAULT 1,
          createdDate TEXT,
          modifiedDate TEXT,
          createdBy TEXT,
          updatedBy TEXT,
          isFavorite BOOLEAN DEFAULT 0,
          color TEXT,
          isDeleted BOOLEAN DEFAULT 0,
          deletedAt TEXT,
          parentId TEXT
        )
      `);

      // Settings table - stores sync timestamps and config
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      // Shared items table
      db.run(`
        CREATE TABLE IF NOT EXISTS shared_items (
          id TEXT PRIMARY KEY,
          fileId TEXT,
          shareDetailId TEXT,
          permissionType TEXT,
          sharedByUserId TEXT,
          sharedWithUserId TEXT,
          FOREIGN KEY(fileId) REFERENCES files(id)
        )
      `);
    });
  }

  function insertOrUpdateFile(fileData) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO files 
        (id, userId, itemName, size, fileType, fullPath, isFolder, syncStatus, 
         cloudItemId, fileDetailId, version, createdDate, modifiedDate, createdBy, 
         updatedBy, parentId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileData.id, fileData.userId, fileData.itemName, fileData.size,
          fileData.fileType, fileData.fullPath, fileData.isFolder ? 1 : 0,
          fileData.syncStatus, fileData.cloudItemId, fileData.fileDetailId,
          fileData.version, fileData.createdDate, fileData.modifiedDate,
          fileData.createdBy, fileData.updatedBy, fileData.parentId
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: fileData.id });
        }
      );
    });
  }

  function getFilesByStatuses(statuses) {
    return new Promise((resolve, reject) => {
      const placeholders = statuses.map(() => '?').join(',');
      db.all(
        `SELECT * FROM files WHERE syncStatus IN (${placeholders})`,
        statuses,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  function updateItemStatus(fileId, newStatus, version) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE files SET syncStatus = ?, version = ? WHERE id = ?`,
        [newStatus, version, fileId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  return {
    initializeDb,
    insertOrUpdateFile,
    getFilesByStatuses,
    updateItemStatus
  };
}

module.exports = SqliteService;