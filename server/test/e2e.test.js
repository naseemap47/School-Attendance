const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const E2E_DB = path.join(__dirname, 'test_e2e.db');

describe('End-to-End System Integration Test', () => {
  let server;
  let baseUrl;
  let dbModule;
  let whatsappService;
  let queueWorker;

  before(async () => {
    if (fs.existsSync(E2E_DB)) fs.unlinkSync(E2E_DB);
    process.env.DB_PATH = E2E_DB;
    process.env.JWT_SECRET = 'e2e_secret_key_8899';
    process.env.WHATSAPP_MOCK = 'true';

    dbModule = require('../db/index.js');
    dbModule.initDb(E2E_DB);

    whatsappService = require('../services/whatsappClient.js');
    whatsappService.initWhatsAppClient();
    whatsappService.mockConnect('919876543200');

    queueWorker = require('../services/queueWorker.js');

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
    queueWorker.stopQueueWorker();
    if (server) await new Promise((resolve) => server.close(resolve));
    dbModule.closeDb();
    if (fs.existsSync(E2E_DB)) fs.unlinkSync(E2E_DB);
  });

  test('Complete journey: Admin setup -> Teacher roster -> Attendance submission -> WhatsApp Queue Delivery', async () => {
    // 1. Admin login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'admin123' })
    });
    assert.strictEqual(adminLoginRes.status, 200);
    const { token: adminToken } = await adminLoginRes.json();
    assert.ok(adminToken);

    // 2. Admin creates a teacher account
    const createTeacherRes = await fetch(`${baseUrl}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@school.com',
        password: 'password123'
      })
    });
    assert.strictEqual(createTeacherRes.status, 201);

    // 3. Teacher logs in
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jane@school.com', password: 'password123' })
    });
    assert.strictEqual(teacherLoginRes.status, 200);
    const { token: teacherToken, user: teacherUser } = await teacherLoginRes.json();
    assert.strictEqual(teacherUser.role, 'teacher');

    // 4. Teacher creates a class
    const createClassRes = await fetch(`${baseUrl}/api/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        name: 'Grade 10 - Mathematics',
        subject: 'Math'
      })
    });
    assert.strictEqual(createClassRes.status, 201);
    const { classItem } = await createClassRes.json();
    const classId = classItem.id;

    // 5. Teacher bulk-imports students
    const csvData = `1, Rohan Sharma, Vikram Sharma, 9876543210\n2, Ananya Roy, Meera Roy, 9876543211\n3, Kabir Khan, Tariq Khan, 9876543212`;
    const importRes = await fetch(`${baseUrl}/api/classes/${classId}/students/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({ csvText: csvData })
    });
    assert.strictEqual(importRes.status, 201);
    const importBody = await importRes.json();
    assert.strictEqual(importBody.importedCount, 3);

    // Fetch students to get their IDs
    const studentsRes = await fetch(`${baseUrl}/api/classes/${classId}/students`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const { students } = await studentsRes.json();
    assert.strictEqual(students.length, 3);

    const rohan = students.find(s => s.student_name.includes('Rohan'));
    const ananya = students.find(s => s.student_name.includes('Ananya'));
    const kabir = students.find(s => s.student_name.includes('Kabir'));

    // 6. Teacher marks attendance for today: Ananya is ABSENT, Rohan and Kabir are PRESENT
    const dateStr = '2026-10-26';
    const submitRes = await fetch(`${baseUrl}/api/attendance/${classId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        date: dateStr,
        records: [
          { student_id: rohan.id, status: 'present' },
          { student_id: ananya.id, status: 'absent' },
          { student_id: kabir.id, status: 'present' }
        ]
      })
    });
    assert.strictEqual(submitRes.status, 200);
    const submitBody = await submitRes.json();
    assert.strictEqual(submitBody.saved, 3);
    assert.strictEqual(submitBody.queued_absent, 1);

    // 7. Verify queue record was created with 'pending' status
    const db = dbModule.getDb();
    const queueRecord = db.prepare('SELECT * FROM whatsapp_queue WHERE student_id = ?').get(ananya.id);
    assert.ok(queueRecord, 'Queue record should be created for absent student');
    assert.strictEqual(queueRecord.status, 'pending');
    assert.strictEqual(queueRecord.recipient_phone, '919876543211@c.us');
    assert.ok(queueRecord.message_body.includes('Ananya Roy'));
    assert.ok(queueRecord.message_body.includes('Meera Roy'));

    // 8. Process queue item with background worker
    const processed = await queueWorker.processNextQueueItem({ minJitterMs: 5, maxJitterMs: 10 });
    assert.strictEqual(processed, true);

    // 9. Verify record is now marked 'sent'
    const updatedRecord = db.prepare('SELECT * FROM whatsapp_queue WHERE id = ?').get(queueRecord.id);
    assert.strictEqual(updatedRecord.status, 'sent');
    assert.ok(updatedRecord.sent_at);

    // 10. Admin inspects /api/whatsapp/queue
    const adminQueueRes = await fetch(`${baseUrl}/api/whatsapp/queue`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminQueueRes.status, 200);
    const adminQueueBody = await adminQueueRes.json();
    assert.strictEqual(adminQueueBody.stats.sent, 1);
    assert.strictEqual(adminQueueBody.stats.pending, 0);
    assert.strictEqual(adminQueueBody.items[0].student_name, 'Ananya Roy');
  });
});
