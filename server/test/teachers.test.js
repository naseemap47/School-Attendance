const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB = path.join(__dirname, 'test_teachers.db');

describe('Admin Teacher Management API', () => {
  let server;
  let baseUrl;
  let adminToken;
  let teacherToken;

  before(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    process.env.DB_PATH = TEST_DB;
    process.env.JWT_SECRET = 'test_secret_key_12345';

    const dbModule = require('../db/index.js');
    dbModule.initDb(TEST_DB);

    const { app } = require('../server.js');
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Obtain admin token
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'admin123' })
    });
    const data = await res.json();
    adminToken = data.token;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const dbModule = require('../db/index.js');
    dbModule.closeDb();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('POST /api/teachers creates a teacher account when called by Admin', async () => {
    const res = await fetch(`${baseUrl}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: 'sarah@school.com',
        password: 'teacherPassword123'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.teacher.name, 'Sarah Connor');
    assert.strictEqual(body.teacher.email, 'sarah@school.com');
    assert.strictEqual(body.teacher.role, 'teacher');
  });

  test('Created teacher can successfully log in with their credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@school.com', password: 'teacherPassword123' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.role, 'teacher');
    teacherToken = body.token;
  });

  test('POST /api/teachers fails with 403 when called by a teacher', async () => {
    const res = await fetch(`${baseUrl}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@school.com',
        password: 'password123'
      })
    });

    assert.strictEqual(res.status, 403);
  });

  test('GET /api/teachers returns list of teachers for Admin', async () => {
    const res = await fetch(`${baseUrl}/api/teachers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.teachers));
    assert.strictEqual(body.teachers.length, 1);
    assert.strictEqual(body.teachers[0].email, 'sarah@school.com');
  });
});
