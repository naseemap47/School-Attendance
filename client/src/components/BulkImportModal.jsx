import React, { useState } from 'react';
import { api } from '../services/api.js';

export default function BulkImportModal({ classId, onClose, onImported }) {
  const [csvText, setCsvText] = useState(
`101, Aarav Kumar, Rajesh Kumar, 9876543210
102, Diya Patel, Bhavin Patel, 9876543211
103, Rohan Singh, Manjit Singh, 9876543212`
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.bulkImportStudents(classId, { csvText });
      onImported(res.importedCount);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Bulk Import Students</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Paste comma or tab-separated student records below.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--absent-bg)', border: '1px solid var(--absent-border)', borderRadius: 'var(--radius-sm)', color: 'var(--absent-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>Format (one student per line):</strong><br />
          <code>Roll Number, Student Name, Parent Name, Parent WhatsApp Number</code>
        </div>

        <form onSubmit={handleImport} id="bulk-import-form">
          <textarea
            id="bulk-csv-input"
            className="form-textarea"
            rows="8"
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            required
          />

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button id="submit-bulk-import-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Importing...' : 'Import Students'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
