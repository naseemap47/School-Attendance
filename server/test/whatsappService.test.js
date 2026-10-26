const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB = path.join(__dirname, 'test_whatsapp.db');

describe('WhatsApp Client Service & Mock Mode', () => {
  let server;
  let baseUrl;
  let adminToken;
  let whatsappService;

  before(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    process.env.DB_PATH = TEST_DB;
    process.env.JWT_SECRET = 'test_secret_key_12345';
    process.env.WHATSAPP_MOCK = 'true';

    const dbModule = require('../db/index.js');
    dbModule.initDb(TEST_DB);

    whatsappService = require('../services/whatsappClient.js');
    whatsappService.initWhatsAppClient();

    const { app } = require('../server.js');
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: 'admin123' })
    });
    adminToken = (await loginRes.json()).token;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const dbModule = require('../db/index.js');
    dbModule.closeDb();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('GET /api/whatsapp/status returns connection status and QR code data URL', async () => {
    const res = await fetch(`${baseUrl}/api/whatsapp/status`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(['INITIALIZING', 'CONNECTED', 'DISCONNECTED'].includes(body.status));
    assert.ok(body.qrDataUrl !== undefined);
  });

  test('sendWhatsAppMessage in mock mode successfully records sent message', async () => {
    const res = await whatsappService.sendWhatsAppMessage('919876543210@c.us', 'Test absence notice');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.recipient, '919876543210@c.us');
    assert.strictEqual(res.message, 'Test absence notice');
  });

  test('POST /api/whatsapp/mock-connect transitions status to CONNECTED', async () => {
    const res = await fetch(`${baseUrl}/api/whatsapp/mock-connect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const status = whatsappService.getWhatsAppStatus();
    assert.strictEqual(status.status, 'CONNECTED');
    assert.strictEqual(status.connectedNumber, '919876543200');
  });
});
