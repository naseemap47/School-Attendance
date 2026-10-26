import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import TeacherDashboard from './pages/teacher/Dashboard.jsx';
import ClassDetails from './pages/teacher/ClassDetails.jsx';
import MarkAttendance from './pages/teacher/MarkAttendance.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

function MainApp() {
  const { user, loading, logout, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'class-details' | 'mark-attendance' | 'admin'
  const [activeClassId, setActiveClassId] = useState(null);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading AttendFlow...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => {
      if (loggedInUser.role === 'admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('home');
      }
    }} />;
  }

  // Set default view on initial login if not set
  const view = currentView === 'home' && isAdmin ? 'admin' : currentView;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentView(isAdmin ? 'admin' : 'home')}>
          <span>🎓</span>
          <span>AttendFlow</span>
        </div>

        <div className="nav-links">
          {isAdmin && (
            <button
              id="nav-admin-btn"
              className={`nav-link ${view === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
              style={{ background: 'none', border: 'none' }}
            >
              ⚙️ Admin Panel
            </button>
          )}

          <button
            id="nav-classes-btn"
            className={`nav-link ${view === 'home' ? 'active' : ''}`}
            onClick={() => {
              setActiveClassId(null);
              setCurrentView('home');
            }}
            style={{ background: 'none', border: 'none' }}
          >
            📚 Classes & Roster
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border-glass)' }}>
            <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
              <span className={`badge ${isAdmin ? 'badge-warning' : 'badge-connected'}`} style={{ fontSize: '0.65rem' }}>
                {user.role}
              </span>
            </div>

            <button
              id="logout-btn"
              className="btn btn-secondary btn-sm"
              onClick={logout}
              title="Sign out"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content View */}
      <main style={{ flex: 1 }}>
        {view === 'admin' && (
          <AdminDashboard
            onSwitchToTeacherMode={() => {
              setActiveClassId(null);
              setCurrentView('home');
            }}
          />
        )}

        {view === 'home' && (
          <TeacherDashboard
            onSelectClass={(id) => {
              setActiveClassId(id);
              setCurrentView('class-details');
            }}
            onNavigateToAttendance={(id) => {
              setActiveClassId(id);
              setCurrentView('mark-attendance');
            }}
          />
        )}

        {view === 'class-details' && (
          <ClassDetails
            classId={activeClassId}
            onNavigateToAttendance={(id) => {
              setActiveClassId(id);
              setCurrentView('mark-attendance');
            }}
            onBack={() => {
              setActiveClassId(null);
              setCurrentView('home');
            }}
          />
        )}

        {view === 'mark-attendance' && (
          <MarkAttendance
            classId={activeClassId}
            onBack={() => {
              setCurrentView('class-details');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-glass)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        AttendFlow • Automated School Attendance & WhatsApp Anti-Ban System • 2026
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
