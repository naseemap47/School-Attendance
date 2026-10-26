import React from 'react';

export default function ConfirmAttendanceModal({
  date,
  total,
  present,
  absentList,
  onConfirm,
  onClose,
  submitting
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {absentList.length > 0 ? '📲' : '✅'}
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Confirm Attendance Submission</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Date: <strong style={{ color: 'var(--text-main)' }}>{date}</strong>
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Students:</span>
            <strong>{total}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--present-text)' }}>Present:</span>
            <strong style={{ color: 'var(--present-text)' }}>{present}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--absent-text)' }}>Absent:</span>
            <strong style={{ color: 'var(--absent-text)' }}>{absentList.length}</strong>
          </div>
        </div>

        {absentList.length > 0 ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>⚠️</span>
              WhatsApp Notifications ({absentList.length})
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Automated WhatsApp absence notices will be dispatched to these parents (with anti-ban spacing):
            </p>
            <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              {absentList.map((st) => (
                <div key={st.student_id} style={{ fontSize: '0.825rem', padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{st.student_name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Parent: {st.parent_name} (+{st.parent_phone})</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '0.75rem', background: 'var(--present-bg)', border: '1px solid var(--present-border)', borderRadius: 'var(--radius-sm)', color: 'var(--present-text)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            🎉 All students are present! No absence messages will be queued.
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            id="confirm-submit-attendance-btn"
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Submitting & Queueing...' : 'Confirm & Save Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}
