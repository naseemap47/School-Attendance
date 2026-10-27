import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login({ onLoginSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAdmin = () => {
    setEmail('admin@school.com');
    setPassword('admin123');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🎓</span>
          </div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>AttendFlow</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            School Attendance & WhatsApp System
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--absent-bg)', border: '1px solid var(--absent-border)', borderRadius: 'var(--radius-md)', color: 'var(--absent-text)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="e.g. teacher@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In to Workspace'}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Testing or initial setup?
          </p>
          <button
            type="button"
            onClick={fillQuickAdmin}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8rem' }}
          >
            Auto-fill Default Admin (admin@school.com)
          </button>
        </div>
      </div>
    </div>
  );
}
