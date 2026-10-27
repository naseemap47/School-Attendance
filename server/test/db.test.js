const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB_PATH = path.join(__dirname, 'test_attendance.db');

describe('Database Initialization & Schema', () => {
  let dbModule;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    process.env.DB_PATH = TEST_DB_PATH;
    // Clear require cache
    delete require.cache[require.resolve('../db/index.js')];
    dbModule = require('../db/index.js');
  });

  afterEach(() => {
    if (dbModule && dbModule.closeDb) {
      dbModule.closeDb();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    delete process.env.DB_PATH;
  });

  test('initDb creates all tables and seeds default admin', () => {
    const db = dbModule.initDb(TEST_DB_PATH);
    assert.ok(db, 'Database instance should be returned');

    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    assert.ok(tables.includes('users'), 'users table should exist');
    assert.ok(tables.includes('classes'), 'classes table should exist');
    assert.ok(tables.includes('students'), 'students table should exist');
    assert.ok(tables.includes('attendance_records'), 'attendance_records table should exist');
    assert.ok(tables.includes('whatsapp_queue'), 'whatsapp_queue table should exist');
    assert.ok(tables.includes('school_settings'), 'school_settings table should exist');

    // Verify seeded admin user exists
    const admin = db.prepare("SELECT * FROM users WHERE email = ?").get('admin@school.com');
    assert.ok(admin, 'Default admin should be seeded');
    assert.strictEqual(admin.role, 'admin');
    assert.strictEqual(admin.name, 'Administrator');
    assert.ok(admin.password_hash.startsWith('$2'), 'Password should be bcrypt hashed');

    // Verify school_settings defaults
    const countryCode = db.prepare("SELECT value FROM school_settings WHERE key = ?").get('default_country_code');
    assert.ok(countryCode, 'default_country_code setting should exist');
    assert.strictEqual(countryCode.value, '91');
  });

  test('initDb is idempotent and does not recreate or duplicate admin on repeated calls', () => {
    dbModule.initDb(TEST_DB_PATH);
    const db2 = dbModule.initDb(TEST_DB_PATH);
    const admins = db2.prepare("SELECT * FROM users WHERE email = ?").all('admin@school.com');
    assert.strictEqual(admins.length, 1, 'Only one admin user should exist');
  });
});
