const express = require('express');
const { getDb } = require('../db/index.js');
const { requireAuth } = require('../middleware/auth.js');
const { formatToWhatsAppJid } = require('../utils/phoneFormatter.js');
const { buildAbsenceMessage } = require('../utils/messageBuilder.js');

const router = express.Router();

router.use(requireAuth);

// Helper function to check class access
function getAuthorizedClass(db, classId, user) {
  const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!classItem) return { error: 'Class not found', status: 404 };
  if (user.role === 'teacher' && classItem.teacher_id !== user.id) {
    return { error: 'Access denied', status: 403 };
  }
  return { classItem };
}

// GET /api/attendance/:classId/dates - List past dates with attendance marked
router.get('/:classId/dates', (req, res) => {
  const { classId } = req.params;
  const db = getDb();
  const auth = getAuthorizedClass(db, classId, req.user);
  if (auth.error) return res.status(auth.status).json({ success: false, error: auth.error });

  const dates = db.prepare(`
    SELECT 
      date,
      COUNT(id) as total_marked,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count
    FROM attendance_records
    WHERE class_id = ?
    GROUP BY date
    ORDER BY date DESC
  `).all(classId);

  res.json({
    success: true,
    classId,
    dates
  });
});

// GET /api/attendance/:classId/report?date=YYYY-MM-DD - Single-day breakdown & summary
router.get('/:classId/report', (req, res) => {
  const { classId } = req.params;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  const db = getDb();
  const auth = getAuthorizedClass(db, classId, req.user);
  if (auth.error) return res.status(auth.status).json({ success: false, error: auth.error });

  const records = db.prepare(`
    SELECT s.id as student_id, s.roll_number, s.student_name, s.parent_name, s.parent_phone,
           a.id as attendance_id, a.status, a.recorded_at,
           q.status as whatsapp_status, q.sent_at as whatsapp_sent_at
    FROM students s
    LEFT JOIN attendance_records a ON a.student_id = s.id AND a.date = ?
    LEFT JOIN whatsapp_queue q ON q.attendance_id = a.id
    WHERE s.class_id = ?
    ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.student_name ASC
  `).all(targetDate, classId);

  const totalStudents = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const unmarkedCount = records.filter(r => !r.status).length;
  const totalMarked = presentCount + absentCount;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 1000) / 10 : 0;

  res.json({
    success: true,
    classInfo: {
      id: auth.classItem.id,
      name: auth.classItem.name,
      subject: auth.classItem.subject
    },
    date: targetDate,
    summary: {
      totalStudents,
      presentCount,
      absentCount,
      unmarkedCount,
      attendanceRate
    },
    records
  });
});

// GET /api/attendance/:classId/monthly-report?month=YYYY-MM - Full month attendance matrix
router.get('/:classId/monthly-report', (req, res) => {
  const { classId } = req.params;
  const month = req.query.month || new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const db = getDb();
  const auth = getAuthorizedClass(db, classId, req.user);
  if (auth.error) return res.status(auth.status).json({ success: false, error: auth.error });

  // Find all distinct dates recorded in this month
  const recordedDatesRows = db.prepare(`
    SELECT DISTINCT date FROM attendance_records
    WHERE class_id = ? AND date LIKE ?
    ORDER BY date ASC
  `).all(classId, `${month}-%`);

  const recordedDates = recordedDatesRows.map(r => r.date);

  // Fetch all students for this class
  const students = db.prepare(`
    SELECT id, roll_number, student_name, parent_name, parent_phone
    FROM students
    WHERE class_id = ?
    ORDER BY CAST(roll_number AS INTEGER) ASC, student_name ASC
  `).all(classId);

  // Fetch all attendance records for this month
  const monthlyRecords = db.prepare(`
    SELECT student_id, date, status
    FROM attendance_records
    WHERE class_id = ? AND date LIKE ?
  `).all(classId, `${month}-%`);

  // Index records by student_id -> date -> status
  const studentDateMap = {};
  for (const row of monthlyRecords) {
    if (!studentDateMap[row.student_id]) studentDateMap[row.student_id] = {};
    studentDateMap[row.student_id][row.date] = row.status;
  }

  let totalPresentMarks = 0;
  let totalAbsentMarks = 0;

  const studentStatsList = students.map((s) => {
    const days = studentDateMap[s.id] || {};
    let presentDays = 0;
    let absentDays = 0;

    for (const d of recordedDates) {
      if (days[d] === 'present') presentDays++;
      else if (days[d] === 'absent') absentDays++;
    }

    totalPresentMarks += presentDays;
    totalAbsentMarks += absentDays;

    const totalMarked = presentDays + absentDays;
    const rate = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 1000) / 10 : 0;

    return {
      student_id: s.id,
      roll_number: s.roll_number,
      student_name: s.student_name,
      parent_name: s.parent_name,
      parent_phone: s.parent_phone,
      present_days: presentDays,
      absent_days: absentDays,
      attendance_rate: rate,
      days
    };
  });

  const grandTotalMarks = totalPresentMarks + totalAbsentMarks;
  const averageAttendanceRate = grandTotalMarks > 0 ? Math.round((totalPresentMarks / grandTotalMarks) * 1000) / 10 : 0;

  res.json({
    success: true,
    classInfo: {
      id: auth.classItem.id,
      name: auth.classItem.name,
      subject: auth.classItem.subject
    },
    month,
    totalRecordedDays: recordedDates.length,
    recordedDates,
    classSummary: {
      totalStudents: students.length,
      totalPresentMarks,
      totalAbsentMarks,
      averageAttendanceRate
    },
    students: studentStatsList
  });
});

// GET /api/attendance/:classId?date=YYYY-MM-DD
router.get('/:classId', (req, res) => {
  const classId = req.params.classId;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  const db = getDb();
  const auth = getAuthorizedClass(db, classId, req.user);
  if (auth.error) return res.status(auth.status).json({ success: false, error: auth.error });

  // Get all students in this class joined with any attendance record for this date
  const records = db.prepare(`
    SELECT s.id as student_id, s.roll_number, s.student_name, s.parent_name, s.parent_phone,
           a.id as attendance_id, a.status, a.recorded_at,
           q.status as whatsapp_status, q.sent_at as whatsapp_sent_at
    FROM students s
    LEFT JOIN attendance_records a ON a.student_id = s.id AND a.date = ?
    LEFT JOIN whatsapp_queue q ON q.attendance_id = a.id
    WHERE s.class_id = ?
    ORDER BY CAST(s.roll_number AS INTEGER) ASC, s.student_name ASC
  `).all(targetDate, classId);

  res.json({
    success: true,
    classId,
    date: targetDate,
    records
  });
});


// POST /api/attendance/:classId - Submit or update attendance for a date
router.post('/:classId', (req, res) => {
  const classId = req.params.classId;
  const { date, records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: 'Attendance records array is required' });
  }

  const targetDate = date || new Date().toISOString().split('T')[0];
  const db = getDb();

  const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!classItem) {
    return res.status(404).json({ success: false, error: 'Class not found' });
  }

  if (req.user.role === 'teacher' && classItem.teacher_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const defaultCountry = db.prepare("SELECT value FROM school_settings WHERE key = 'default_country_code'").get()?.value || '91';

  // Fetch all students for validation and parent message generation
  const studentsInClass = db.prepare('SELECT * FROM students WHERE class_id = ?').all(classId);
  const studentMap = new Map();
  for (const s of studentsInClass) {
    studentMap.set(s.id, s);
  }

  const upsertAttendanceStmt = db.prepare(`
    INSERT INTO attendance_records (class_id, student_id, date, status, marked_by)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(class_id, student_id, date)
    DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, recorded_at = CURRENT_TIMESTAMP
  `);

  const selectAttendanceStmt = db.prepare(`
    SELECT id FROM attendance_records WHERE class_id = ? AND student_id = ? AND date = ?
  `);

  const insertQueueStmt = db.prepare(`
    INSERT INTO whatsapp_queue (student_id, attendance_id, recipient_phone, recipient_name, message_body, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `);

  let savedCount = 0;
  let queuedAbsentCount = 0;

  // Execute within transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const item of records) {
      const student = studentMap.get(item.student_id);
      if (!student) continue;

      const status = item.status === 'absent' ? 'absent' : 'present';
      upsertAttendanceStmt.run(classId, student.id, targetDate, status, req.user.id);
      savedCount++;

      const attendanceRow = selectAttendanceStmt.get(classId, student.id, targetDate);

      if (status === 'absent' && attendanceRow) {
        // Check if an unsent or already queued message exists for this attendance record
        const existingQueue = db.prepare('SELECT id FROM whatsapp_queue WHERE attendance_id = ?').get(attendanceRow.id);
        if (!existingQueue) {
          const jid = formatToWhatsAppJid(student.parent_phone, defaultCountry);
          const messageBody = buildAbsenceMessage({
            parentName: student.parent_name,
            studentName: student.student_name,
            className: classItem.name,
            date: targetDate
          });

          insertQueueStmt.run(
            student.id,
            attendanceRow.id,
            jid,
            student.parent_name,
            messageBody
          );
          queuedAbsentCount++;
        }
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    return res.status(500).json({ success: false, error: err.message });
  }

  res.json({
    success: true,
    saved: savedCount,
    queued_absent: queuedAbsentCount
  });
});

module.exports = router;
