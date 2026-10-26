const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB = path.join(__dirname, 'test_queue.db');

describe('Background WhatsApp Queue Worker', () => {
  let db;
  let queueWorker;
  let whatsappService;

  before(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    process.env.DB_PATH = TEST_DB;
    process.env.JWT_SECRET = 'test_secret_key_12345';
    process.env.WHATSAPP_MOCK = 'true';

    const dbModule = require('../db/index.js');
    db = dbModule.initDb(TEST_DB);

    whatsappService = require('../services/whatsappClient.js');
    whatsappService.initWhatsAppClient();
    whatsappService.mockConnect('919876543200');

    queueWorker = require('../services/queueWorker.js');

    // Create a mock teacher, class, student, attendance record
    const teacherRes = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('T1', 't1@test.com', 'h', 'teacher')").run();
    const classRes = db.prepare("INSERT INTO classes (teacher_id, name) VALUES (?, 'Class 10')").run(teacherRes.lastInsertRowid);
    const studentRes = db.prepare("INSERT INTO students (class_id, student_name, parent_name, parent_phone) VALUES (?, 'Student 1', 'Parent 1', '919876543201')").run(classRes.lastInsertRowid);
    const attRes = db.prepare("INSERT INTO attendance_records (class_id, student_id, date, status, marked_by) VALUES (?, ?, '2026-10-26', 'absent', ?)").run(classRes.lastInsertRowid, studentRes.lastInsertRowid, teacherRes.lastInsertRowid);

    // Insert 2 items into queue
    db.prepare(`
      INSERT INTO whatsapp_queue (student_id, attendance_id, recipient_phone, recipient_name, message_body, status)
      VALUES (?, ?, '919876543201@c.us', 'Parent 1', 'Notice 1', 'pending')
    `).run(studentRes.lastInsertRowid, attRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO whatsapp_queue (student_id, attendance_id, recipient_phone, recipient_name, message_body, status)
      VALUES (?, ?, '919876543201@c.us', 'Parent 1', 'Notice 2', 'pending')
    `).run(studentRes.lastInsertRowid, attRes.lastInsertRowid);
  });

  after(async () => {
    queueWorker.stopQueueWorker();
    const dbModule = require('../db/index.js');
    dbModule.closeDb();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('processNextQueueItem picks pending item and sends it, marking status as sent', async () => {
    const processed = await queueWorker.processNextQueueItem();
    assert.strictEqual(processed, true);

    const first = db.prepare('SELECT status, sent_at FROM whatsapp_queue WHERE id = 1').get();
    assert.strictEqual(first.status, 'sent');
    assert.ok(first.sent_at !== null);

    const second = db.prepare('SELECT status FROM whatsapp_queue WHERE id = 2').get();
    assert.strictEqual(second.status, 'pending');
  });

  test('startQueueWorker processes remaining queue items in background', async () => {
    queueWorker.startQueueWorker({ minJitterMs: 10, maxJitterMs: 20, pollIntervalMs: 50 });

    // Wait short time for worker to process item 2
    await new Promise(r => setTimeout(r, 200));

    const second = db.prepare('SELECT status, sent_at FROM whatsapp_queue WHERE id = 2').get();
    assert.strictEqual(second.status, 'sent');
  });
});
