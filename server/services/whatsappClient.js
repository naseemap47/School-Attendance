const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

let clientInstance = null;
let currentStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'INITIALIZING' | 'CONNECTED'
let currentQrDataUrl = null;
let connectedPhoneNumber = null;
let sentMessagesLog = [];

const isMock = process.env.WHATSAPP_MOCK === 'true' || process.env.NODE_ENV === 'test';

async function initWhatsAppClient() {
  if (clientInstance) return clientInstance;

  currentStatus = 'INITIALIZING';

  if (isMock) {
    // Generate a mock QR code image data URL for UI demonstration
    try {
      currentQrDataUrl = await qrcode.toDataURL('mock-whatsapp-web-session-pairing-qr-code');
    } catch (_) {}

    clientInstance = {
      isMock: true,
      sendMessage: async (jid, message) => {
        sentMessagesLog.push({ jid, message, timestamp: new Date().toISOString() });
        return { id: { _serialized: `mock_${Date.now()}` }, ack: 1 };
      },
      destroy: async () => {
        currentStatus = 'DISCONNECTED';
        currentQrDataUrl = null;
        connectedPhoneNumber = null;
        clientInstance = null;
      }
    };
    return clientInstance;
  }

  // Real WhatsApp Client using whatsapp-web.js
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const authPath = path.join(__dirname, '..', '.wwebjs_auth');

  clientInstance = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    puppeteer: {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  clientInstance.on('qr', async (qr) => {
    currentStatus = 'INITIALIZING';
    try {
      currentQrDataUrl = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('Failed to generate QR data URL:', err);
    }
  });

  clientInstance.on('ready', () => {
    currentStatus = 'CONNECTED';
    currentQrDataUrl = null;
    connectedPhoneNumber = clientInstance.info?.wid?.user || 'Official School WhatsApp';
    console.log('WhatsApp Web client is ready and connected!');
  });

  clientInstance.on('authenticated', () => {
    currentStatus = 'CONNECTED';
    currentQrDataUrl = null;
  });

  clientInstance.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failed:', msg);
    currentStatus = 'DISCONNECTED';
    currentQrDataUrl = null;
  });

  clientInstance.on('disconnected', (reason) => {
    console.warn('WhatsApp disconnected:', reason);
    currentStatus = 'DISCONNECTED';
    currentQrDataUrl = null;
    connectedPhoneNumber = null;
  });

  try {
    clientInstance.initialize().catch((err) => {
      console.error('WhatsApp initialization error:', err.message);
      currentStatus = 'DISCONNECTED';
    });
  } catch (err) {
    console.error('Client launch error:', err);
    currentStatus = 'DISCONNECTED';
  }

  return clientInstance;
}

function getWhatsAppStatus() {
  return {
    status: currentStatus,
    qrDataUrl: currentQrDataUrl,
    connectedNumber: connectedPhoneNumber,
    isMock
  };
}

function mockConnect(number = '919876543200') {
  currentStatus = 'CONNECTED';
  currentQrDataUrl = null;
  connectedPhoneNumber = number;
  return getWhatsAppStatus();
}

function setClientInstanceForTesting(instance, status = 'CONNECTED') {
  clientInstance = instance;
  currentStatus = status;
}

async function sendWhatsAppMessage(jid, text) {
  if (!clientInstance) {
    await initWhatsAppClient();
  }

  if (isMock && clientInstance?.isMock) {
    sentMessagesLog.push({ jid, message: text, timestamp: new Date().toISOString() });
    return { success: true, id: `mock_${Date.now()}`, recipient: jid, message: text, mock: true };
  }

  if (currentStatus !== 'CONNECTED') {
    throw new Error('WhatsApp client is not connected');
  }

  const result = await clientInstance.sendMessage(jid, text);
  const messageId = result?.id?._serialized || result?.id?.id || (result?.id ? String(result.id) : null);
  return { success: true, id: messageId, recipient: jid, message: text };
}

async function logoutWhatsApp() {
  if (clientInstance) {
    try {
      await clientInstance.destroy();
    } catch (_) {}
  }
  currentStatus = 'DISCONNECTED';
  currentQrDataUrl = null;
  connectedPhoneNumber = null;
  clientInstance = null;
  return { success: true };
}

function getSentMessagesLog() {
  return sentMessagesLog;
}

module.exports = {
  initWhatsAppClient,
  getWhatsAppStatus,
  sendWhatsAppMessage,
  mockConnect,
  logoutWhatsApp,
  getSentMessagesLog,
  setClientInstanceForTesting
};

