const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB = path.join(__dirname, 'test_classes.db');

describe('Teacher Class & Student Roster API', () => {
  let server;
  let baseUrl;
  let teacherToken;
  let otherTeacherToken;
  let createdClassId;

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

    // Login Admin and create two teachers
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'admin123' })
    });
    const { token: adminToken } = await adminLogin.json();

    await fetch(`${baseUrl}/api/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Teacher 1', email: 't1@school.com', password: 'pass' })
    });

    await fetch(`${baseUrl}/api/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Teacher 2', email: 't2@school.com', password: 'pass' })
    });

    // Login Teacher 1
    const t1Res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 't1@school.com', password: 'pass' })
    });
    teacherToken = (await t1Res.json()).token;

    // Login Teacher 2
    const t2Res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 't2@school.com', password: 'pass' })
    });
    otherTeacherToken = (await t2Res.json()).token;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const dbModule = require('../db/index.js');
    dbModule.closeDb();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('POST /api/classes creates a new class for the logged-in teacher', async () => {
    const res = await fetch(`${baseUrl}/api/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        name: 'Grade 10 - Section A',
        subject: 'Mathematics'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.classItem.name, 'Grade 10 - Section A');
    assert.strictEqual(body.classItem.subject, 'Mathematics');
    createdClassId = body.classItem.id;
  });

  test('GET /api/classes lists only classes owned by the logged-in teacher', async () => {
    const res = await fetch(`${baseUrl}/api/classes`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const body = await res.json();
    assert.strictEqual(body.classes.length, 1);
    assert.strictEqual(body.classes[0].id, createdClassId);

    // Other teacher sees 0 classes
    const otherRes = await fetch(`${baseUrl}/api/classes`, {
      headers: { Authorization: `Bearer ${otherTeacherToken}` }
    });
    const otherBody = await otherRes.json();
    assert.strictEqual(otherBody.classes.length, 0);
  });

  test('POST /api/classes/:id/students adds a single student with parent details', async () => {
    const res = await fetch(`${baseUrl}/api/classes/${createdClassId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        roll_number: '101',
        student_name: 'Rahul Kumar',
        parent_name: 'Suresh Kumar',
        parent_phone: '9876543210'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.student.student_name, 'Rahul Kumar');
    assert.strictEqual(body.student.parent_phone, '919876543210');
  });

  test('POST /api/classes/:id/students/bulk imports students from CSV/JSON text', async () => {
    const csvContent = `102, Priya Sharma, Manoj Sharma, 9876543211\n103, Amit Patel, Vikram Patel, 9876543212`;
    const res = await fetch(`${baseUrl}/api/classes/${createdClassId}/students/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({ csvText: csvContent })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.importedCount, 2);

    // Verify all 3 students in class
    const listRes = await fetch(`${baseUrl}/api/classes/${createdClassId}/students`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const listBody = await listRes.json();
    assert.strictEqual(listBody.students.length, 3);
  });
});
