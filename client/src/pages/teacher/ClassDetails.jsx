import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import AddStudentModal from '../../components/AddStudentModal.jsx';
import BulkImportModal from '../../components/BulkImportModal.jsx';

export default function ClassDetails({ classId, onNavigateToAttendance, onBack }) {
  const [classItem, setClassItem] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const [classRes, studentsRes] = await Promise.all([
        api.getClass(classId),
        api.getClassStudents(classId)
      ]);
      setClassItem(classRes.classItem);
      setStudents(studentsRes.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassData();
  }, [classId]);

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName}?`)) return;
    try {
      await api.deleteStudent(studentId);
      fetchClassData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredStudents = students.filter(s =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.roll_number && s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.parent_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading class roster...</div>;
  }

  if (!classItem) {
    return <div className="container">Class not found. <button className="btn btn-secondary" onClick={onBack}>Go Back</button></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '0.75rem' }}>
            ← Back to Classes
          </button>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {classItem.name}
            {classItem.subject && (
              <span className="badge badge-warning" style={{ fontSize: '0.8rem', textTransform: 'none' }}>
                {classItem.subject}
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Teacher: {classItem.teacher_name || 'Assigned Teacher'} • {students.length} Total Students
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            id="mark-attendance-header-btn"
            className="btn btn-primary"
            onClick={() => onNavigateToAttendance(classId)}
          >
            📋 Mark Today's Attendance
          </button>
          <button
            id="add-student-btn"
            className="btn btn-secondary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Student
          </button>
          <button
            id="bulk-import-btn"
            className="btn btn-secondary"
            onClick={() => setShowBulkModal(true)}
          >
            📑 Bulk Import
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Class Student Roster</h3>
          <input
            id="search-students-input"
            type="text"
            className="form-input"
            placeholder="Search by student name, roll number, or parent..."
            style={{ maxWidth: '340px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>👥</span>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No students in this class yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Click "Add Student" or "Bulk Import" to get started.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" id="students-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Roll No</th>
                  <th>Student Name</th>
                  <th>Parent / Guardian</th>
                  <th>WhatsApp Number</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {s.roll_number || '-'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{s.student_name}</strong>
                    </td>
                    <td>{s.parent_name}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontFamily: 'monospace' }}>
                        <span>💬</span> +{s.parent_phone}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.25rem 0.5rem' }}
                        onClick={() => handleDeleteStudent(s.id, s.student_name)}
                        title="Remove student"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddStudentModal
          classId={classId}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchClassData}
        />
      )}

      {showBulkModal && (
        <BulkImportModal
          classId={classId}
          onClose={() => setShowBulkModal(false)}
          onImported={fetchClassData}
        />
      )}
    </div>
  );
}
