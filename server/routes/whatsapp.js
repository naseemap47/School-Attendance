const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.js');
const {
  getWhatsAppStatus,
  mockConnect,
  logoutWhatsApp,
  initWhatsAppClient
} = require('../services/whatsappClient.js');

const router = express.Router();

router.use(requireAuth);

// GET /api/whatsapp/status - View live connection status & QR code
router.get('/status', (req, res) => {
  const status = getWhatsAppStatus();
  res.json({ success: true, ...status });
});

// POST /api/whatsapp/initialize - Re-trigger client initialization if disconnected
router.post('/initialize', requireRole('admin'), async (req, res) => {
  try {
    await initWhatsAppClient();
    res.json({ success: true, ...getWhatsAppStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/whatsapp/mock-connect - Helper for test/demo mode
router.post('/mock-connect', requireRole('admin'), (req, res) => {
  const status = mockConnect(req.body?.number || '919876543200');
  res.json({ success: true, ...status });
});

// POST /api/whatsapp/logout - Clear session
router.post('/logout', requireRole('admin'), async (req, res) => {
  await logoutWhatsApp();
  res.json({ success: true, message: 'WhatsApp session cleared' });
});

module.exports = router;
