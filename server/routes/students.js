const express = require('express');
const { getDb } = require('../db/index.js');
const { requireAuth } = require('../middleware/auth.js');
const { formatToWhatsAppJid } = require('../utils/phoneFormatter.js');

const router = express.Router();

router.use(requireAuth);

// DELETE /api/students/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const student = db.prepare(`
    SELECT s.*, c.teacher_id
    FROM students s
    JOIN classes c ON c.id = s.class_id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }

  if (req.user.role === 'teacher' && student.teacher_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Student removed successfully' });
});

module.exports = router;
