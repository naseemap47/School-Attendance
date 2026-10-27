const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbInstance = null;

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'attendance.db');

function initDb(customDbPath) {
  const dbPath = customDbPath || process.env.DB_PATH || DEFAULT_DB_PATH;

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (_) {}
  }

  dbInstance = new DatabaseSync(dbPath);

  // Enable foreign keys and WAL mode
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA journal_mode = WAL;');

  // Run schema migrations
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  dbInstance.exec(schemaSql);

  // Seed default admin if none exists
  const existingAdmin = dbInstance.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);
    dbInstance.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run('Administrator', 'admin@school.com', passwordHash, 'admin');
  }

  // Seed default country code if missing
  const countryCodeSetting = dbInstance.prepare("SELECT value FROM school_settings WHERE key = 'default_country_code'").get();
  if (!countryCodeSetting) {
    dbInstance.prepare(`
      INSERT INTO school_settings (key, value)
      VALUES ('default_country_code', '91')
    `).run();
  }

  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (_) {}
    dbInstance = null;
  }
}

module.exports = {
  initDb,
  getDb,
  closeDb,
  DEFAULT_DB_PATH
};
