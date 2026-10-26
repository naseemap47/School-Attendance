const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/index.js');
const { requireAuth, requireRole } = require('../middleware/auth.js');

const router = express.Router();

// All routes here require Admin role
router.use(requireAuth, requireRole('admin'));

// GET /api/teachers - List all teachers with class count
router.get('/', (req, res) => {
  const db = getDb();
  const teachers = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           COUNT(c.id) as class_count
    FROM users u
    LEFT JOIN classes c ON c.teacher_id = u.id
    WHERE u.role = 'teacher'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  res.json({
    success: true,
    teachers
  });
});

// POST /api/teachers - Create a new teacher account
router.post('/', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required'
    });
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'A user with this email already exists'
    });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, 'teacher')
  `).run(name.trim(), cleanEmail, passwordHash);

  const newTeacher = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);

  res.status(201).json({
    success: true,
    teacher: newTeacher
  });
});

// DELETE /api/teachers/:id - Remove teacher account
router.delete('/:id', (req, res) => {
  const teacherId = req.params.id;
  const db = getDb();

  const teacher = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher'").get(teacherId);
  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Teacher not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(teacherId);
  res.json({ success: true, message: 'Teacher deleted successfully' });
});

module.exports = router;
