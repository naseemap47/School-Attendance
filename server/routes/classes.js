const express = require('express');
const { getDb } = require('../db/index.js');
const { requireAuth } = require('../middleware/auth.js');
const { formatToWhatsAppJid } = require('../utils/phoneFormatter.js');

const router = express.Router();

router.use(requireAuth);

// GET /api/classes - List classes for logged-in teacher (or all for admin)
router.get('/', (req, res) => {
  const db = getDb();
  let query = `
    SELECT c.id, c.name, c.subject, c.created_at, c.teacher_id,
           u.name as teacher_name,
           COUNT(s.id) as student_count
    FROM classes c
    JOIN users u ON u.id = c.teacher_id
    LEFT JOIN students s ON s.class_id = c.id
  `;

  let params = [];
  if (req.user.role === 'teacher') {
    query += ' WHERE c.teacher_id = ?';
    params.push(req.user.id);
  }
  query += ' GROUP BY c.id ORDER BY c.created_at DESC';

  const classes = db.prepare(query).all(...params);
  res.json({ success: true, classes });
});

// POST /api/classes - Create class
router.post('/', (req, res) => {
  const { name, subject } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Class name is required' });
  }

  const db = getDb();
  const info = db.prepare(`
    INSERT INTO classes (teacher_id, name, subject)
    VALUES (?, ?, ?)
  `).run(req.user.id, name.trim(), subject ? subject.trim() : null);

  const newClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ success: true, classItem: newClass });
});

// GET /api/classes/:id - Get single class info
router.get('/:id', (req, res) => {
  const db = getDb();
  const classItem = db.prepare(`
    SELECT c.*, u.name as teacher_name
    FROM classes c
    JOIN users u ON u.id = c.teacher_id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!classItem) {
    return res.status(404).json({ success: false, error: 'Class not found' });
  }

  if (req.user.role === 'teacher' && classItem.teacher_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied to this class' });
  }

  res.json({ success: true, classItem });
});

// GET /api/classes/:id/students - List students in class
router.get('/:id/students', (req, res) => {
  const db = getDb();
  const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!classItem) {
    return res.status(404).json({ success: false, error: 'Class not found' });
  }

  if (req.user.role === 'teacher' && classItem.teacher_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied to this class' });
  }

  const students = db.prepare(`
    SELECT * FROM students
    WHERE class_id = ?
    ORDER BY CAST(roll_number AS INTEGER) ASC, student_name ASC
  `).all(req.params.id);

  res.json({ success: true, students });
});

// POST /api/classes/:id/students - Add single student
router.post('/:id/students', (req, res) => {
  const classId = req.params.id;
  const { roll_number, student_name, parent_name, parent_phone } = req.body;

  if (!student_name || !parent_name || !parent_phone) {
    return res.status(400).json({
      success: false,
      error: 'Student name, parent name, and parent phone are required'
    });
  }

  const db = getDb();
  const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!classItem) {
    return res.status(404).json({ success: false, error: 'Class not found' });
  }

  if (req.user.role === 'teacher' && classItem.teacher_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  let formattedPhone;
  try {
    const defaultCountry = db.prepare("SELECT value FROM school_settings WHERE key = 'default_country_code'").get()?.value || '91';
    const jid = formatToWhatsAppJid(parent_phone, defaultCountry);
    formattedPhone = jid.replace('@c.us', '');
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }

  const info = db.prepare(`
    INSERT INTO students (class_id, roll_number, student_name, parent_name, parent_phone)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    classId,
    roll_number ? String(roll_number).trim() : null,
    student_name.trim(),
    parent_name.trim(),
    formattedPhone
  );

  const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ success: true, student: newStudent });
});

// POST /api/classes/:id/students/bulk - Bulk import from CSV/lines
router.post('/:id/students/bulk', (req, res) => {
  const classId = req.params.id;
  const { csvText, studentsList } = req.body;

  const db = getDb();
  const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!classItem) {
    return res.status(404).json({ success: false, error: 'Class not found' });
  }

  if (req.user.role === 'teacher' && classItem.teacher_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  let rowsToInsert = [];

  if (Array.isArray(studentsList)) {
    rowsToInsert = studentsList;
  } else if (csvText && typeof csvText === 'string') {
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Split by comma or tab
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      if (parts.length >= 4) {
        rowsToInsert.push({
          roll_number: parts[0],
          student_name: parts[1],
          parent_name: parts[2],
          parent_phone: parts[3]
        });
      } else if (parts.length === 3) {
        rowsToInsert.push({
          roll_number: '',
          student_name: parts[0],
          parent_name: parts[1],
          parent_phone: parts[2]
        });
      }
    }
  }

  if (rowsToInsert.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid student entries found to import' });
  }

  const defaultCountry = db.prepare("SELECT value FROM school_settings WHERE key = 'default_country_code'").get()?.value || '91';

  let insertedCount = 0;
  const insertStmt = db.prepare(`
    INSERT INTO students (class_id, roll_number, student_name, parent_name, parent_phone)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const row of rowsToInsert) {
    try {
      const jid = formatToWhatsAppJid(row.parent_phone, defaultCountry);
      const cleanPhone = jid.replace('@c.us', '');
      insertStmt.run(
        classId,
        row.roll_number ? String(row.roll_number).trim() : null,
        row.student_name.trim(),
        row.parent_name.trim(),
        cleanPhone
      );
      insertedCount++;
    } catch (_) {
      // skip invalid lines
    }
  }

  res.status(201).json({
    success: true,
    importedCount: insertedCount,
    totalReceived: rowsToInsert.length
  });
});

module.exports = router;
