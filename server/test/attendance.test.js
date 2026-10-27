const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB = path.join(__dirname, 'test_attendance_routes.db');

describe('Attendance Submission & Queue Enqueueing API', () => {
  let server;
  let baseUrl;
  let dbModule;
  let teacherToken;
  let classId;
  let student1Id;
  let student2Id;
  let student3Id;

  before(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    process.env.DB_PATH = TEST_DB;
    process.env.JWT_SECRET = 'test_secret_key_12345';

    dbModule = require('../db/index.js');
    dbModule.initDb(TEST_DB);

    const { app } = require('../server.js');
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Login Admin and create a teacher
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'admin123' })
    });
    const { token: adminToken } = await adminLogin.json();

    await fetch(`${baseUrl}/api/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Teacher A', email: 'ta@school.com', password: 'pass' })
    });

    // Login Teacher A
    const tRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ta@school.com', password: 'pass' })
    });
    teacherToken = (await tRes.json()).token;

    // Create Class
    const classRes = await fetch(`${baseUrl}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ name: 'Class 5B', subject: 'English' })
    });
    classId = (await classRes.json()).classItem.id;

    // Add 3 students
    const s1Res = await fetch(`${baseUrl}/api/classes/${classId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ roll_number: '1', student_name: 'Alice Smith', parent_name: 'Bob Smith', parent_phone: '9876543201' })
    });
    student1Id = (await s1Res.json()).student.id;

    const s2Res = await fetch(`${baseUrl}/api/classes/${classId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ roll_number: '2', student_name: 'Charlie Brown', parent_name: 'Lucy Brown', parent_phone: '9876543202' })
    });
    student2Id = (await s2Res.json()).student.id;

    const s3Res = await fetch(`${baseUrl}/api/classes/${classId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ roll_number: '3', student_name: 'David Miller', parent_name: 'Grace Miller', parent_phone: '9876543203' })
    });
    student3Id = (await s3Res.json()).student.id;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    dbModule.closeDb();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('POST /api/attendance/:classId records attendance and enqueues ONLY absent students', async () => {
    const res = await fetch(`${baseUrl}/api/attendance/${classId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        date: '2026-10-26',
        records: [
          { student_id: student1Id, status: 'present' },
          { student_id: student2Id, status: 'absent' },
          { student_id: student3Id, status: 'present' }
        ]
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.saved, 3);
    assert.strictEqual(body.queued_absent, 1);

    const db = dbModule.getDb();
    // Verify DB records
    const attendanceRecords = db.prepare('SELECT * FROM attendance_records WHERE class_id = ? AND date = ?').all(classId, '2026-10-26');
    assert.strictEqual(attendanceRecords.length, 3);

    // Verify WhatsApp queue
    const queuedItems = db.prepare('SELECT * FROM whatsapp_queue WHERE status = ?').all('pending');
    assert.strictEqual(queuedItems.length, 1);
    assert.strictEqual(queuedItems[0].student_id, student2Id);
    assert.strictEqual(queuedItems[0].recipient_phone, '919876543202@c.us');
    assert.ok(queuedItems[0].message_body.includes('Charlie Brown'));
    assert.ok(queuedItems[0].message_body.includes('Lucy Brown'));
  });

  test('GET /api/attendance/:classId?date=YYYY-MM-DD returns marked attendance with student names', async () => {
    const res = await fetch(`${baseUrl}/api/attendance/${classId}?date=2026-10-26`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.records.length, 3);

    const charlie = body.records.find(r => r.student_id === student2Id);
    assert.strictEqual(charlie.status, 'absent');
    assert.strictEqual(charlie.student_name, 'Charlie Brown');
  });

  test('GET /api/attendance/:classId/report?date=YYYY-MM-DD returns daily report summary & stats', async () => {
    const res = await fetch(`${baseUrl}/api/attendance/${classId}/report?date=2026-10-26`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.classInfo.id, classId);
    assert.strictEqual(body.date, '2026-10-26');
    assert.strictEqual(body.summary.totalStudents, 3);
    assert.strictEqual(body.summary.presentCount, 2);
    assert.strictEqual(body.summary.absentCount, 1);
    assert.strictEqual(body.summary.attendanceRate, 66.7);
    assert.strictEqual(body.records.length, 3);
  });

  test('GET /api/attendance/:classId/dates returns list of recorded attendance dates', async () => {
    // Record another day
    await fetch(`${baseUrl}/api/attendance/${classId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        date: '2026-10-27',
        records: [
          { student_id: student1Id, status: 'present' },
          { student_id: student2Id, status: 'present' },
          { student_id: student3Id, status: 'present' }
        ]
      })
    });

    const res = await fetch(`${baseUrl}/api/attendance/${classId}/dates`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.dates));
    assert.ok(body.dates.some(d => d.date === '2026-10-26'));
    assert.ok(body.dates.some(d => d.date === '2026-10-27'));
  });

  test('GET /api/attendance/:classId/monthly-report?month=YYYY-MM returns monthly matrix with daily statuses and student percentages', async () => {
    const res = await fetch(`${baseUrl}/api/attendance/${classId}/monthly-report?month=2026-10`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.month, '2026-10');
    assert.strictEqual(body.totalRecordedDays, 2); // 2026-10-26 and 2026-10-27
    assert.strictEqual(body.students.length, 3);

    // Alice attended both days (100%)
    const alice = body.students.find(s => s.student_id === student1Id);
    assert.strictEqual(alice.present_days, 2);
    assert.strictEqual(alice.absent_days, 0);
    assert.strictEqual(alice.attendance_rate, 100);
    assert.strictEqual(alice.days['2026-10-26'], 'present');
    assert.strictEqual(alice.days['2026-10-27'], 'present');

    // Charlie was absent on 26th and present on 27th (50%)
    const charlie = body.students.find(s => s.student_id === student2Id);
    assert.strictEqual(charlie.present_days, 1);
    assert.strictEqual(charlie.absent_days, 1);
    assert.strictEqual(charlie.attendance_rate, 50);
    assert.strictEqual(charlie.days['2026-10-26'], 'absent');
    assert.strictEqual(charlie.days['2026-10-27'], 'present');
  });

  test('POST /api/attendance/:classId updates past attendance records on edit', async () => {
    // Change Charlie from absent to present on 2026-10-26
    const res = await fetch(`${baseUrl}/api/attendance/${classId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        date: '2026-10-26',
        records: [
          { student_id: student1Id, status: 'present' },
          { student_id: student2Id, status: 'present' },
          { student_id: student3Id, status: 'present' }
        ]
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Check report for 2026-10-26
    const checkRes = await fetch(`${baseUrl}/api/attendance/${classId}/report?date=2026-10-26`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.summary.presentCount, 3);
    assert.strictEqual(checkBody.summary.absentCount, 0);
    assert.strictEqual(checkBody.summary.attendanceRate, 100);
  });
});

