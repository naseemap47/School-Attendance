import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import AttendanceSummaryBar from '../../components/AttendanceSummaryBar.jsx';
import ConfirmAttendanceModal from '../../components/ConfirmAttendanceModal.jsx';

export default function MarkAttendance({ classId, onBack }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [classInfo, setClassInfo] = useState(null);
  const [attendanceMap, setAttendanceMap] = useState({}); // student_id -> 'present' | 'absent'
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);

  const loadData = async (date) => {
    try {
      setLoading(true);
      setSubmitFeedback(null);
      const [classRes, attendanceRes] = await Promise.all([
        api.getClass(classId),
        api.getAttendance(classId, date)
      ]);

      setClassInfo(classRes.classItem);
      const records = attendanceRes.records || [];
      setStudents(records);

      const map = {};
      records.forEach((r) => {
        // default to existing recorded status, or 'present' if taking for the first time
        map[r.student_id] = r.status || 'present';
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [classId, selectedDate]);

  const handleToggle = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = {};
    students.forEach(s => {
      updated[s.student_id] = 'present';
    });
    setAttendanceMap(updated);
  };

  const presentCount = students.filter(s => attendanceMap[s.student_id] === 'present').length;
  const absentStudents = students.filter(s => attendanceMap[s.student_id] === 'absent');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const recordsPayload = students.map(s => ({
        student_id: s.student_id,
        status: attendanceMap[s.student_id] || 'present'
      }));

      const res = await api.submitAttendance(classId, selectedDate, recordsPayload);
      setShowConfirmModal(false);
      setSubmitFeedback({
        type: 'success',
        message: `Attendance saved successfully! ${res.saved} records updated. ${res.queued_absent} automated WhatsApp absence message(s) queued.`
      });
      loadData(selectedDate);
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        message: err.message || 'Failed to submit attendance'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !classInfo) {
    return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading attendance sheet...</div>;
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '0.5rem' }}>
            ← Back to Class
          </button>
          <h1 style={{ fontSize: '1.875rem' }}>
            Daily Attendance: {classInfo?.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Mark students Present or Absent. Parents of absent students will receive a WhatsApp message.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="attendance-date" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Date:
          </label>
          <input
            id="attendance-date"
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {submitFeedback && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: submitFeedback.type === 'success' ? 'var(--present-bg)' : 'var(--absent-bg)',
          border: `1px solid ${submitFeedback.type === 'success' ? 'var(--present-border)' : 'var(--absent-border)'}`,
          color: submitFeedback.type === 'success' ? 'var(--present-text)' : 'var(--absent-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>{submitFeedback.type === 'success' ? '✓' : '⚠'}</span>
          <span>{submitFeedback.message}</span>
        </div>
      )}

      {/* Summary Stats */}
      <AttendanceSummaryBar
        total={students.length}
        present={presentCount}
        absent={absentStudents.length}
        onMarkAllPresent={handleMarkAllPresent}
      />

      {/* Roster & Toggles */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No students found in this class. Please add students first.
          </div>
        ) : (
          <div className="table-container">
            <table className="table" id="attendance-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Roll</th>
                  <th>Student Name</th>
                  <th>Parent Contact</th>
                  <th>WhatsApp Alert Status</th>
                  <th style={{ width: '220px', textAlign: 'center' }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const currentStatus = attendanceMap[student.student_id] || 'present';
                  return (
                    <tr key={student.student_id}>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {student.roll_number || '-'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>{student.student_name}</strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {student.parent_name} (+{student.parent_phone})
                        </span>
                      </td>
                      <td>
                        {student.whatsapp_status ? (
                          <span className={`badge ${student.whatsapp_status === 'sent' ? 'badge-connected' : student.whatsapp_status === 'failed' ? 'badge-disconnected' : 'badge-warning'}`}>
                            {student.whatsapp_status}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not queued yet</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="toggle-pill-group">
                          <button
                            type="button"
                            className={`toggle-pill ${currentStatus === 'present' ? 'present-active' : ''}`}
                            onClick={() => handleToggle(student.student_id, 'present')}
                          >
                            ✓ Present
                          </button>
                          <button
                            type="button"
                            className={`toggle-pill ${currentStatus === 'absent' ? 'absent-active' : ''}`}
                            onClick={() => handleToggle(student.student_id, 'absent')}
                          >
                            ✕ Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-glass)' }}>
          <button
            id="open-submit-attendance-modal-btn"
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
            disabled={students.length === 0}
            onClick={() => setShowConfirmModal(true)}
          >
            Save Attendance & Dispatch Alerts ({absentStudents.length} Absent) →
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmAttendanceModal
          date={selectedDate}
          total={students.length}
          present={presentCount}
          absentList={absentStudents}
          onConfirm={handleSubmit}
          onClose={() => setShowConfirmModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
