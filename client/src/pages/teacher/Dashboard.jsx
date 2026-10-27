import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TeacherDashboard({ onSelectClass, onNavigateToAttendance, onNavigateToReports }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.getClasses();
      setClasses(res.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.createClass({ name: className, subject: classSubject });
      setClassName('');
      setClassSubject('');
      setShowCreateModal(false);
      fetchClasses();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const totalStudents = classes.reduce((sum, c) => sum + (c.student_count || 0), 0);

  return (
    <div className="container">
      {/* Welcome Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Teacher Workspace
          </span>
          <h1 style={{ fontSize: '2rem', marginTop: '0.25rem' }}>Welcome back, {user?.name || 'Teacher'} 👋</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage your student rosters and take daily attendance with automated parent WhatsApp notifications.
          </p>
        </div>

        <button
          id="create-class-btn"
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create New Class
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Active Classes</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-main)' }}>
            {classes.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Total Students Enrolled</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: '#60a5fa' }}>
            {totalStudents}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Today's Date</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem', color: '#34d399' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Classes list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.35rem' }}>Your Classes</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {classes.length} {classes.length === 1 ? 'Class' : 'Classes'}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading classes...</div>
      ) : classes.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📚</span>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No classes created yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Create your first class (e.g. "Grade 10 - A") to start adding students and taking attendance.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Your First Class
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {classes.map((cls) => (
            <div key={cls.id} className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)' }}>{cls.name}</h3>
                  {cls.subject && (
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem', textTransform: 'none' }}>
                      {cls.subject}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <span>👥</span>
                  <span>{cls.student_count || 0} Students enrolled</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    id={`mark-att-btn-${cls.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onNavigateToAttendance(cls.id)}
                  >
                    📋 Mark Today
                  </button>
                  <button
                    id={`view-reports-btn-${cls.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onNavigateToReports(cls.id)}
                  >
                    📊 Reports
                  </button>
                </div>
                <button
                  id={`view-roster-btn-${cls.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={() => onSelectClass(cls.id)}
                >
                  Manage Roster →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Create New Class</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            {createError && (
              <div style={{ padding: '0.75rem', background: 'var(--absent-bg)', border: '1px solid var(--absent-border)', borderRadius: 'var(--radius-sm)', color: 'var(--absent-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateClass} id="create-class-form">
              <div className="form-group">
                <label className="form-label" htmlFor="new-class-name">Class Name *</label>
                <input
                  id="new-class-name"
                  className="form-input"
                  placeholder="e.g. Grade 10 - Section A"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-class-subject">Subject (Optional)</label>
                <input
                  id="new-class-subject"
                  className="form-input"
                  placeholder="e.g. Mathematics, Science, General"
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button id="submit-create-class-btn" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
