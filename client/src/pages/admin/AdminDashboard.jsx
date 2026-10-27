import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import TeacherManagement from './TeacherManagement.jsx';
import WhatsAppManager from './WhatsAppManager.jsx';
import QueueMonitor from './QueueMonitor.jsx';

export default function AdminDashboard({ onSwitchToTeacherMode }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('teachers');

  return (
    <div className="container">
      {/* Admin Header */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Administration Panel
          </span>
          <h1 style={{ fontSize: '2rem', marginTop: '0.25rem' }}>School Control Center ⚙️</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage teacher accounts, centralized school WhatsApp pairing, and message queue delivery.
          </p>
        </div>

        <div>
          <button
            className="btn btn-secondary"
            onClick={onSwitchToTeacherMode}
          >
            Switch to Teacher Classes View →
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
        <button
          id="tab-teachers-btn"
          className={`btn ${activeTab === 'teachers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('teachers')}
        >
          👨‍🏫 Teacher Accounts
        </button>
        <button
          id="tab-whatsapp-btn"
          className={`btn ${activeTab === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('whatsapp')}
        >
          📱 WhatsApp Connection
        </button>
        <button
          id="tab-queue-btn"
          className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('queue')}
        >
          📬 Live Message Queue
        </button>
      </div>

      {/* Tab Views */}
      {activeTab === 'teachers' && <TeacherManagement />}
      {activeTab === 'whatsapp' && <WhatsAppManager />}
      {activeTab === 'queue' && <QueueMonitor />}
    </div>
  );
}
