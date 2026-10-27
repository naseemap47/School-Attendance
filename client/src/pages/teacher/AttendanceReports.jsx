import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

export default function AttendanceReports({ classId, onNavigateToMarkAttendance, onBack }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'monthly'
  const [classInfo, setClassInfo] = useState(null);
  const [recordedDates, setRecordedDates] = useState([]);

  // Daily report states
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent'

  // Daily inline edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editMap, setEditMap] = useState({}); // student_id -> 'present' | 'absent'
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFeedback, setEditFeedback] = useState(null);

  // Monthly report states
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState('');

  // Fetch past recorded dates
  const loadRecordedDates = async () => {
    try {
      const res = await api.getAttendanceDates(classId);
      setRecordedDates(res.dates || []);
    } catch (err) {
      console.error('Failed to load past dates:', err);
    }
  };

  // Fetch daily report
  const loadDailyReport = async (date) => {
    setDailyLoading(true);
    setDailyError('');
    setEditFeedback(null);
    setIsEditing(false);
    try {
      const res = await api.getAttendanceReport(classId, date);
      setDailyData(res);
      setClassInfo(res.classInfo);

      // Pre-fill editMap
      const map = {};
      (res.records || []).forEach(r => {
        map[r.student_id] = r.status || 'present';
      });
      setEditMap(map);
    } catch (err) {
      setDailyError(err.message || 'Failed to load report');
    } finally {
      setDailyLoading(false);
    }
  };

  // Fetch monthly report
  const loadMonthlyReport = async (month) => {
    setMonthlyLoading(true);
    setMonthlyError('');
    try {
      const res = await api.getMonthlyAttendanceReport(classId, month);
      setMonthlyData(res);
      setClassInfo(res.classInfo);
    } catch (err) {
      setMonthlyError(err.message || 'Failed to load monthly report');
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    loadRecordedDates();
  }, [classId]);

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport(selectedDate);
    } else {
      loadMonthlyReport(selectedMonth);
    }
  }, [classId, activeTab, selectedDate, selectedMonth]);

  // Handle saving past attendance edits
  const handleSaveEdits = async () => {
    if (!dailyData?.records) return;
    setSavingEdit(true);
    setEditFeedback(null);
    try {
      const recordsPayload = dailyData.records.map(r => ({
        student_id: r.student_id,
        status: editMap[r.student_id] || 'present'
      }));

      const res = await api.submitAttendance(classId, selectedDate, recordsPayload);
      setEditFeedback({
        type: 'success',
        message: `Attendance updated successfully! ${res.saved} records saved.`
      });
      setIsEditing(false);
      loadDailyReport(selectedDate);
      loadRecordedDates();
    } catch (err) {
      setEditFeedback({
        type: 'error',
        message: err.message || 'Failed to update attendance'
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Export Daily Report to CSV
  const exportDailyCSV = () => {
    if (!dailyData?.records || dailyData.records.length === 0) return;
    const headers = ['Roll No', 'Student Name', 'Parent Name', 'Parent Phone', 'Attendance Status', 'WhatsApp Alert', 'Recorded At'];
    const rows = dailyData.records.map(r => [
      r.roll_number || '',
      `"${(r.student_name || '').replace(/"/g, '""')}"`,
      `"${(r.parent_name || '').replace(/"/g, '""')}"`,
      r.parent_phone || '',
      r.status ? r.status.toUpperCase() : 'NOT MARKED',
      r.whatsapp_status ? r.whatsapp_status.toUpperCase() : 'N/A',
      r.recorded_at || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_${classInfo?.name || 'class'}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Monthly Report to CSV
  const exportMonthlyCSV = () => {
    if (!monthlyData?.students || monthlyData.students.length === 0) return;
    const dates = monthlyData.recordedDates || [];
    const headers = ['Roll No', 'Student Name', ...dates, 'Present Days', 'Absent Days', 'Attendance Rate (%)'];
    const rows = monthlyData.students.map(s => {
      const dayStatuses = dates.map(d => {
        const st = s.days[d];
        return st ? (st === 'present' ? 'P' : 'A') : '-';
      });
      return [
        s.roll_number || '',
        `"${(s.student_name || '').replace(/"/g, '""')}"`,
        ...dayStatuses,
        s.present_days,
        s.absent_days,
        `${s.attendance_rate}%`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `monthly_attendance_${classInfo?.name || 'class'}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = (dailyData?.records || []).filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '0.5rem' }}>
            ← Back to Class
          </button>
          <h1 style={{ fontSize: '1.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Attendance Reports: {classInfo?.name || 'Loading...'}
            {classInfo?.subject && (
              <span className="badge badge-warning" style={{ fontSize: '0.8rem', textTransform: 'none' }}>
                {classInfo.subject}
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Generate and inspect daily summaries, check historical attendance, and view full monthly matrices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            id="quick-mark-today-btn"
            className="btn btn-primary"
            onClick={() => onNavigateToMarkAttendance(classId)}
          >
            📋 Mark Today's Attendance
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          id="tab-daily-report"
          className={`btn btn-sm ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('daily')}
          style={{ fontSize: '0.9rem', padding: '0.5rem 1.25rem' }}
        >
          📅 Daily Report & Old Attendance
        </button>
        <button
          id="tab-monthly-report"
          className={`btn btn-sm ${activeTab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('monthly')}
          style={{ fontSize: '0.9rem', padding: '0.5rem 1.25rem' }}
        >
          🗓️ Monthly Attendance Matrix
        </button>
      </div>

      {/* ========================================================================= */}
      {/* DAILY REPORT & OLD ATTENDANCE VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div>
          {/* Date Picker & History Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label htmlFor="daily-report-date" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Selected Date:
                </label>
                <input
                  id="daily-report-date"
                  type="date"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedDate(todayStr)}
                >
                  Jump to Today
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  id="export-daily-csv-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={exportDailyCSV}
                  disabled={!dailyData?.records?.length}
                >
                  📥 Export Daily CSV
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                >
                  🖨️ Print
                </button>
              </div>
            </div>

            {/* Quick selector of past recorded dates */}
            {recordedDates.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Recorded Past Sessions (Click to view):
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxHeight: '80px', overflowY: 'auto' }}>
                  {recordedDates.map((item) => (
                    <button
                      key={item.date}
                      type="button"
                      className={`btn btn-sm ${selectedDate === item.date ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '14px' }}
                      onClick={() => setSelectedDate(item.date)}
                    >
                      {item.date} • {item.present_count}P / {item.absent_count}A
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {editFeedback && (
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              background: editFeedback.type === 'success' ? 'var(--present-bg)' : 'var(--absent-bg)',
              border: `1px solid ${editFeedback.type === 'success' ? 'var(--present-border)' : 'var(--absent-border)'}`,
              color: editFeedback.type === 'success' ? 'var(--present-text)' : 'var(--absent-text)'
            }}>
              {editFeedback.message}
            </div>
          )}

          {dailyLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading attendance report for {selectedDate}...</div>
          ) : dailyError ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
              {dailyError}
            </div>
          ) : dailyData ? (
            <div>
              {/* Daily Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--border-hover)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Students</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-main)' }}>
                    {dailyData.summary.totalStudents}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#34d399' }}>
                    {dailyData.summary.presentCount}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Absent</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#f87171' }}>
                    {dailyData.summary.absentCount}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance Rate</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#60a5fa' }}>
                    {dailyData.summary.attendanceRate}%
                  </div>
                  <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${dailyData.summary.attendanceRate}%`, background: '#3b82f6' }} />
                  </div>
                </div>
              </div>

              {/* Roster & Records Table */}
              <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['all', 'present', 'absent'].map((st) => (
                      <button
                        key={st}
                        className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setStatusFilter(st)}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {st} ({st === 'all' ? dailyData.records.length : dailyData.records.filter(r => r.status === st).length})
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setIsEditing(false);
                            // Reset edits
                            const map = {};
                            dailyData.records.forEach(r => { map[r.student_id] = r.status || 'present'; });
                            setEditMap(map);
                          }}
                          disabled={savingEdit}
                        >
                          Cancel
                        </button>
                        <button
                          id="save-past-attendance-btn"
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveEdits}
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving...' : '💾 Save Attendance Changes'}
                        </button>
                      </>
                    ) : (
                      <button
                        id="edit-attendance-toggle-btn"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsEditing(true)}
                      >
                        ✏️ Edit Records for {selectedDate}
                      </button>
                    )}
                  </div>
                </div>

                {dailyData.summary.unmarkedCount === dailyData.summary.totalStudents && !isEditing ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No attendance recorded for {selectedDate}.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Click "Edit Records" or "Mark Today's Attendance" to submit attendance for this date.
                    </p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table" id="daily-attendance-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Roll</th>
                          <th>Student Name</th>
                          <th>Parent Contact</th>
                          <th>WhatsApp Status</th>
                          <th style={{ width: '220px', textAlign: 'center' }}>
                            {isEditing ? 'Change Status' : 'Recorded Status'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((student) => {
                          const currentEditStatus = editMap[student.student_id] || 'present';
                          return (
                            <tr key={student.student_id}>
                              <td>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  {student.roll_number || '-'}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--text-main)' }}>{student.student_name}</strong>
                              </td>
                              <td>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                  {student.parent_name} (+{student.parent_phone})
                                </span>
                              </td>
                              <td>
                                {student.whatsapp_status ? (
                                  <span className={`badge ${student.whatsapp_status === 'sent' ? 'badge-connected' : student.whatsapp_status === 'failed' ? 'badge-disconnected' : 'badge-warning'}`}>
                                    {student.whatsapp_status}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {isEditing ? (
                                  <div className="toggle-pill-group">
                                    <button
                                      type="button"
                                      className={`toggle-pill ${currentEditStatus === 'present' ? 'present-active' : ''}`}
                                      onClick={() => setEditMap(prev => ({ ...prev, [student.student_id]: 'present' }))}
                                    >
                                      ✓ Present
                                    </button>
                                    <button
                                      type="button"
                                      className={`toggle-pill ${currentEditStatus === 'absent' ? 'absent-active' : ''}`}
                                      onClick={() => setEditMap(prev => ({ ...prev, [student.student_id]: 'absent' }))}
                                    >
                                      ✕ Absent
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`badge ${student.status === 'present' ? 'badge-connected' : student.status === 'absent' ? 'badge-disconnected' : 'badge-warning'}`}>
                                    {student.status ? student.status.toUpperCase() : 'NOT MARKED'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MONTHLY ATTENDANCE MATRIX VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div>
          {/* Month selector & Export Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label htmlFor="monthly-report-picker" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Selected Month:
                </label>
                <input
                  id="monthly-report-picker"
                  type="month"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  id="export-monthly-csv-btn"
                  className="btn btn-secondary btn-sm"
                  onClick={exportMonthlyCSV}
                  disabled={!monthlyData?.students?.length}
                >
                  📥 Export Monthly Matrix (CSV)
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>

          {monthlyLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating monthly attendance matrix for {selectedMonth}...</div>
          ) : monthlyError ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
              {monthlyError}
            </div>
          ) : monthlyData ? (
            <div>
              {/* Monthly Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-purple)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sessions Recorded</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-main)' }}>
                    {monthlyData.totalRecordedDays} Days
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Class Average Rate</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#60a5fa' }}>
                    {monthlyData.classSummary.averageAttendanceRate}%
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Present Marks</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#34d399' }}>
                    {monthlyData.classSummary.totalPresentMarks}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Absent Marks</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#f87171' }}>
                    {monthlyData.classSummary.totalAbsentMarks}
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                {monthlyData.students.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No students found in this class.
                  </div>
                ) : (
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="table" id="monthly-matrix-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '60px', position: 'sticky', left: 0, background: 'var(--bg-surface)' }}>Roll</th>
                          <th style={{ minWidth: '160px', position: 'sticky', left: '60px', background: 'var(--bg-surface)' }}>Student Name</th>
                          
                          {/* Day Columns */}
                          {(monthlyData.recordedDates || []).map((d) => (
                            <th key={d} style={{ textAlign: 'center', minWidth: '42px', padding: '0.5rem 0.25rem' }} title={`Date: ${d}`}>
                              <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>
                                {new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' })}
                              </span>
                              <span>{d.slice(8)}</span>
                            </th>
                          ))}

                          {/* Summary Columns */}
                          <th style={{ textAlign: 'center', minWidth: '80px', color: '#34d399' }}>Present</th>
                          <th style={{ textAlign: 'center', minWidth: '80px', color: '#f87171' }}>Absent</th>
                          <th style={{ textAlign: 'center', minWidth: '90px' }}>Rate (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.students.map((student) => (
                          <tr key={student.student_id}>
                            <td style={{ position: 'sticky', left: 0, background: 'var(--bg-surface)', fontWeight: 600 }}>
                              {student.roll_number || '-'}
                            </td>
                            <td style={{ position: 'sticky', left: '60px', background: 'var(--bg-surface)' }}>
                              <strong style={{ color: 'var(--text-main)' }}>{student.student_name}</strong>
                            </td>

                            {/* Status for each recorded date */}
                            {(monthlyData.recordedDates || []).map((d) => {
                              const st = student.days[d];
                              return (
                                <td key={d} style={{ textAlign: 'center', padding: '0.4rem 0.2rem' }}>
                                  {st === 'present' ? (
                                    <span style={{
                                      display: 'inline-block',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px',
                                      borderRadius: '4px',
                                      background: 'var(--present-bg)',
                                      color: 'var(--present-text)',
                                      fontWeight: 700,
                                      fontSize: '0.75rem'
                                    }}>
                                      P
                                    </span>
                                  ) : st === 'absent' ? (
                                    <span style={{
                                      display: 'inline-block',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px',
                                      borderRadius: '4px',
                                      background: 'var(--absent-bg)',
                                      color: 'var(--absent-text)',
                                      fontWeight: 700,
                                      fontSize: '0.75rem'
                                    }}>
                                      A
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#34d399' }}>
                              {student.present_days}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#f87171' }}>
                              {student.absent_days}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                fontWeight: 700,
                                color: student.attendance_rate >= 75 ? '#34d399' : student.attendance_rate >= 50 ? '#fbbf24' : '#f87171'
                              }}>
                                {student.attendance_rate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
