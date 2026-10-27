const express = require('express');
const { getDb } = require('../db/index.js');
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

// GET /api/whatsapp/queue - Queue audit logs
router.get('/queue', (req, res) => {
  const db = getDb();
  let query = `
    SELECT q.*, s.student_name, s.roll_number, c.name as class_name, a.date as attendance_date
    FROM whatsapp_queue q
    JOIN students s ON s.id = q.student_id
    JOIN classes c ON c.id = s.class_id
    JOIN attendance_records a ON a.id = q.attendance_id
  `;

  const params = [];
  if (req.user.role === 'teacher') {
    query += ' WHERE c.teacher_id = ?';
    params.push(req.user.id);
  }

  query += ' ORDER BY q.created_at DESC LIMIT 100';

  const items = db.prepare(query).all(...params);

  // Queue stats
  const stats = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM whatsapp_queue
  `).get();

  res.json({
    success: true,
    items,
    stats: {
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      sent: stats.sent || 0,
      failed: stats.failed || 0
    }
  });
});

// POST /api/whatsapp/queue/:id/retry - Retry a failed item
router.post('/queue/:id/retry', requireRole('admin'), (req, res) => {
  const db = getDb();
  const info = db.prepare(`
    UPDATE whatsapp_queue
    SET status = 'pending', retry_count = 0, error_message = NULL
    WHERE id = ? AND status = 'failed'
  `).run(req.params.id);

  if (info.changes === 0) {
    return res.status(404).json({ success: false, error: 'Queue item not found or not in failed state' });
  }

  res.json({ success: true, message: 'Message re-queued for delivery' });
});

module.exports = router;
