import React from 'react';

export default function AttendanceSummaryBar({ total, present, absent, onMarkAllPresent }) {
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Roster</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{total}</div>
        </div>

        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--present-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Present</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--present-text)' }}>{present}</div>
        </div>

        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--absent-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Absent</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--absent-text)' }}>{absent}</div>
        </div>

        <div style={{ paddingLeft: '1rem', borderLeft: '1px solid var(--border-glass)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance Rate</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: percentage >= 75 ? '#34d399' : '#fbbf24' }}>
            {percentage}%
          </div>
        </div>
      </div>

      <div>
        <button
          id="mark-all-present-btn"
          type="button"
          className="btn btn-secondary"
          onClick={onMarkAllPresent}
          style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
        >
          ✓ Mark All Present
        </button>
      </div>
    </div>
  );
}
