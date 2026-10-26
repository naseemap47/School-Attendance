const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB = path.join(__dirname, 'test_auth.db');

describe('Authentication & Authorization API', () => {
  let server;
  let baseUrl;
  let db;

  before(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    process.env.DB_PATH = TEST_DB;
    process.env.JWT_SECRET = 'test_secret_key_12345';

    const dbModule = require('../db/index.js');
    db = dbModule.initDb(TEST_DB);

    const { app } = require('../server.js');
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const dbModule = require('../db/index.js');
    dbModule.closeDb();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('POST /api/auth/login with valid admin credentials returns token and user profile', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'admin123' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.token, 'Token should be returned');
    assert.strictEqual(body.user.email, 'admin@school.com');
    assert.strictEqual(body.user.role, 'admin');
    assert.strictEqual(body.user.name, 'Administrator');
  });

  test('POST /api/auth/login with invalid password returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'wrongpassword' })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('Invalid'));
  });

  test('GET /api/auth/me returns current user profile with valid Bearer token', async () => {
    // First login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'admin123' })
    });
    const { token } = await loginRes.json();

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.success, true);
    assert.strictEqual(meBody.user.email, 'admin@school.com');
  });

  test('GET /api/auth/me returns 401 without Bearer token', async () => {
    const meRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(meRes.status, 401);
  });
});
