import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.getTeachers();
      setTeachers(res.teachers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.createTeacher({ name, email, password });
      setName('');
      setEmail('');
      setPassword('');
      setShowAddModal(false);
      fetchTeachers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, teacherName) => {
    if (!window.confirm(`Delete teacher account for ${teacherName}?`)) return;
    try {
      await api.deleteTeacher(id);
      fetchTeachers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Teacher Accounts</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Create credentials for school teachers. Teachers log in with these credentials to manage their classes.
          </p>
        </div>
        <button
          id="open-add-teacher-modal-btn"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add New Teacher
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading teachers...</div>
        ) : teachers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>👨‍🏫</span>
            <p style={{ color: 'var(--text-secondary)' }}>No teacher accounts created yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" id="teachers-table">
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Login Email</th>
                  <th>Assigned Classes</th>
                  <th>Created Date</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td><code style={{ color: '#60a5fa' }}>{t.email}</code></td>
                    <td>{t.class_count || 0} classes</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.25rem 0.5rem' }}
                        onClick={() => handleDelete(t.id, t.name)}
                        title="Delete teacher account"
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
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Create Teacher Login</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem', background: 'var(--absent-bg)', border: '1px solid var(--absent-border)', borderRadius: 'var(--radius-sm)', color: 'var(--absent-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} id="add-teacher-form">
              <div className="form-group">
                <label className="form-label" htmlFor="teacher-name">Full Name *</label>
                <input
                  id="teacher-name"
                  className="form-input"
                  placeholder="e.g. Mrs. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="teacher-email">Login Email *</label>
                <input
                  id="teacher-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. priya@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="teacher-password">Temporary Password *</label>
                <input
                  id="teacher-password"
                  type="password"
                  className="form-input"
                  placeholder="e.g. schoolTeacher2026"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button id="submit-create-teacher-btn" type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Teacher Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
