const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('attendflow_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('attendflow_token', token);
  } else {
    localStorage.removeItem('attendflow_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      setToken(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => apiRequest('/auth/me'),

  // Teachers (Admin)
  getTeachers: () => apiRequest('/teachers'),
  createTeacher: (data) => apiRequest('/teachers', { method: 'POST', body: JSON.stringify(data) }),
  deleteTeacher: (id) => apiRequest(`/teachers/${id}`, { method: 'DELETE' }),

  // Classes (Teacher / Admin)
  getClasses: () => apiRequest('/classes'),
  getClass: (id) => apiRequest(`/classes/${id}`),
  createClass: (data) => apiRequest('/classes', { method: 'POST', body: JSON.stringify(data) }),
  getClassStudents: (id) => apiRequest(`/classes/${id}/students`),
  addStudent: (classId, data) => apiRequest(`/classes/${classId}/students`, { method: 'POST', body: JSON.stringify(data) }),
  bulkImportStudents: (classId, data) => apiRequest(`/classes/${classId}/students/bulk`, { method: 'POST', body: JSON.stringify(data) }),
  deleteStudent: (studentId) => apiRequest(`/students/${studentId}`, { method: 'DELETE' }),

  // Attendance
  getAttendance: (classId, date) => apiRequest(`/attendance/${classId}?date=${date}`),
  submitAttendance: (classId, date, records) => apiRequest(`/attendance/${classId}`, {
    method: 'POST',
    body: JSON.stringify({ date, records })
  }),
  getAttendanceReport: (classId, date) => apiRequest(`/attendance/${classId}/report?date=${date}`),
  getMonthlyAttendanceReport: (classId, month) => apiRequest(`/attendance/${classId}/monthly-report?month=${month}`),
  getAttendanceDates: (classId) => apiRequest(`/attendance/${classId}/dates`),

  // WhatsApp (Admin)
  getWhatsAppStatus: () => apiRequest('/whatsapp/status'),
  initWhatsApp: () => apiRequest('/whatsapp/initialize', { method: 'POST' }),
  mockConnectWhatsApp: (number) => apiRequest('/whatsapp/mock-connect', { method: 'POST', body: JSON.stringify({ number }) }),
  logoutWhatsApp: () => apiRequest('/whatsapp/logout', { method: 'POST' }),
  getQueueLogs: () => apiRequest('/whatsapp/queue'),
  retryQueueItem: (id) => apiRequest(`/whatsapp/queue/${id}/retry`, { method: 'POST' })
};
