import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

export default function QueueMonitor() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ pending: 0, processing: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getQueueLogs();
      setItems(res.items || []);
      setStats(res.stats || { pending: 0, processing: 0, sent: 0, failed: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (id) => {
    try {
      await api.retryQueueItem(id);
      fetchQueue();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>WhatsApp Message Queue & Logs</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Live status of automated parent notifications. Messages are processed sequentially with 3–7s jitter delays.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchQueue}>
          🔄 Refresh Queue
        </button>
      </div>

      {/* Stats counter cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#fbbf24' }}>
            {stats.pending}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Processing</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#60a5fa' }}>
            {stats.processing}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sent</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#34d399' }}>
            {stats.sent}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#f87171' }}>
            {stats.failed}
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['all', 'pending', 'processing', 'sent', 'failed'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(st)}
              style={{ textTransform: 'capitalize' }}
            >
              {st}
            </button>
          ))}
        </div>

        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading queue records...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No messages found in this queue category.
          </div>
        ) : (
          <div className="table-container">
            <table className="table" id="queue-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Student & Class</th>
                  <th>Parent / Recipient</th>
                  <th>Message Body</th>
                  <th>Sent At / Time</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={`badge ${
                        item.status === 'sent' ? 'badge-connected' :
                        item.status === 'failed' ? 'badge-disconnected' : 'badge-warning'
                      }`}>
                        {item.status}
                      </span>
                      {item.retry_count > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Retries: {item.retry_count}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{item.student_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.class_name} • Date: {item.attendance_date}
                      </div>
                    </td>
                    <td>
                      <div>{item.recipient_name}</div>
                      <code style={{ fontSize: '0.75rem', color: '#60a5fa' }}>{item.recipient_phone}</code>
                    </td>
                    <td>
                      <div style={{ maxWidth: '280px', fontSize: '0.75rem', color: 'var(--text-secondary)', maxHeight: '60px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        {item.message_body}
                      </div>
                      {item.error_message && (
                        <div style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                          Err: {item.error_message}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.sent_at ? new Date(item.sent_at).toLocaleTimeString() : new Date(item.created_at).toLocaleTimeString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.status === 'failed' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => handleRetry(item.id)}
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
