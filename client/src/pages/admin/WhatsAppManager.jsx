import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

export default function WhatsAppManager() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getWhatsAppStatus();
      setStatusData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleInitialize = async () => {
    try {
      setActionMessage('Starting WhatsApp Web client...');
      await api.initWhatsApp();
      fetchStatus();
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleMockConnect = async () => {
    try {
      await api.mockConnectWhatsApp('919876543200');
      fetchStatus();
      setActionMessage('Mock WhatsApp connected successfully!');
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Disconnect this WhatsApp account from the school system?')) return;
    try {
      await api.logoutWhatsApp();
      fetchStatus();
      setActionMessage('WhatsApp account disconnected.');
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const isConnected = statusData?.status === 'CONNECTED';
  const isInitializing = statusData?.status === 'INITIALIZING';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>School WhatsApp Connection</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Centralized school WhatsApp phone used to send automated absence messages to parents.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchStatus}>
          🔄 Refresh Status
        </button>
      </div>

      {actionMessage && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#93c5fd', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {actionMessage}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>📱</span>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Connection State</h3>
              <div style={{ marginTop: '0.25rem' }}>
                {isConnected ? (
                  <span className="badge badge-connected" id="whatsapp-status-badge">
                    ● Connected ({statusData?.connectedNumber || 'School Phone'})
                  </span>
                ) : isInitializing ? (
                  <span className="badge badge-warning" id="whatsapp-status-badge">
                    ● Initializing / Awaiting QR Scan
                  </span>
                ) : (
                  <span className="badge badge-disconnected" id="whatsapp-status-badge">
                    ● Disconnected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            {isConnected ? (
              <button
                id="whatsapp-disconnect-btn"
                className="btn btn-danger btn-sm"
                onClick={handleLogout}
              >
                Disconnect Phone
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  id="whatsapp-init-btn"
                  className="btn btn-primary btn-sm"
                  onClick={handleInitialize}
                >
                  Start Client
                </button>
                {statusData?.isMock && (
                  <button
                    id="mock-connect-btn"
                    className="btn btn-secondary btn-sm"
                    style={{ borderColor: 'rgba(59, 130, 246, 0.5)', color: '#60a5fa' }}
                    onClick={handleMockConnect}
                  >
                    Simulate Connect (Dev Mode)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QR Code section */}
        {!isConnected && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            {statusData?.qrDataUrl ? (
              <div style={{ display: 'inline-block', padding: '1.25rem', background: '#ffffff', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', marginBottom: '1rem' }}>
                <img
                  id="whatsapp-qr-image"
                  src={statusData.qrDataUrl}
                  alt="WhatsApp Pairing QR Code"
                  style={{ width: '220px', height: '220px', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                {isInitializing ? 'Generating QR Code from WhatsApp Web...' : 'Click "Start Client" to generate a pairing QR code.'}
              </div>
            )}

            <div style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <h4 style={{ fontSize: '0.925rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>How to Link School Phone:</h4>
              <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                <li>Open WhatsApp on the school’s official phone.</li>
                <li>Tap <strong>Settings / Menu (⋮)</strong> &gt; <strong>Linked Devices</strong>.</li>
                <li>Tap <strong>Link a Device</strong> and point your camera at the QR code above.</li>
                <li>Once scanned, credentials persist automatically across restarts.</li>
              </ol>
            </div>
          </div>
        )}

        {isConnected && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🟢</div>
            <h3 style={{ fontSize: '1.25rem', color: '#34d399', marginBottom: '0.5rem' }}>WhatsApp System Online</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem' }}>
              All attendance absence notices will be dispatched automatically using this linked phone. Messages are throttled by the anti-ban jitter queue (3–7s spacing).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
