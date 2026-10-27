import React, { useState } from 'react';
import { api } from '../services/api.js';

export default function AddStudentModal({ classId, onClose, onAdded }) {
  const [rollNumber, setRollNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.addStudent(classId, {
        roll_number: rollNumber,
        student_name: studentName,
        parent_name: parentName,
        parent_phone: parentPhone
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Add New Student</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--absent-bg)', border: '1px solid var(--absent-border)', borderRadius: 'var(--radius-sm)', color: 'var(--absent-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="add-student-form">
          <div className="form-group">
            <label className="form-label" htmlFor="student-roll">Roll Number (Optional)</label>
            <input
              id="student-roll"
              className="form-input"
              placeholder="e.g. 101"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="student-name">Student Full Name *</label>
            <input
              id="student-name"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="parent-name">Parent / Guardian Name *</label>
            <input
              id="parent-name"
              className="form-input"
              placeholder="e.g. Suresh Sharma"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="parent-phone">Parent WhatsApp Number *</label>
            <input
              id="parent-phone"
              className="form-input"
              placeholder="e.g. 9876543210 (or with country code)"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.35rem' }}>
              Absence WhatsApp alerts will be dispatched to this number automatically.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button id="submit-add-student-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
