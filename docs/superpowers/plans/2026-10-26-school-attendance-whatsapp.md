# School Attendance & WhatsApp Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack School Attendance web application where teachers mark student attendance, admins manage teacher credentials and a centralized WhatsApp connection, and parents of absent students automatically receive WhatsApp notifications throttled by a 3–7 second anti-ban jitter queue.

**Architecture:** Monorepo with Express backend (`server/`), SQLite database (`better-sqlite3`) in WAL mode, `whatsapp-web.js` background worker with persistent queue and human-like jitter delay, and a modern React Vite Single Page Application (`client/`) styled with a clean Vanilla CSS design system.

**Tech Stack:** Node.js (v18+), Express, SQLite (`better-sqlite3`), `whatsapp-web.js`, Puppeteer, `jsonwebtoken`, `bcryptjs`, React 18, Vite.

**Spec:** `docs/superpowers/specs/2026-10-26-school-attendance-whatsapp-design.md`

## Global Constraints
- **Platform**: Linux / Node.js 18+.
- **Database**: SQLite stored at `server/data/attendance.db` with `PRAGMA journal_mode = WAL`.
- **WhatsApp Anti-Ban**: Notifications trigger **only for Absent students** with a randomized **3.0 to 7.0 seconds jitter delay** between messages.
- **WhatsApp Mocking**: Must support `WHATSAPP_MOCK=true` for testing and development without requiring a live phone scan.
- **Roles**: Strict separation between `'admin'` (teacher management, WhatsApp pairing, global queue) and `'teacher'` (classes, students, attendance marking).

---

### Task 1: Monorepo Scaffolding & Server Test Harness

**Files:**
- Create: `package.json` (Root)
- Create: `server/package.json`
- Create: `server/test/health.test.js`
- Create: `server/server.js`

**Interfaces:**
- Produces: Base Express app with healthcheck endpoint `GET /api/health` returning `{ status: 'ok', time: string }`.

- [ ] **Step 1: Create root package.json and server package.json**
Run root package initialization with concurrent scripts for client and server.

- [ ] **Step 2: Write failing server health test**
Write a test using Node's built-in `node:test` and `node:assert` against `http://localhost:5000/api/health`.

- [ ] **Step 3: Implement minimal Express server in `server/server.js`**
Create Express app with CORS, JSON middleware, and `GET /api/health`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add package.json server/
git commit -m "chore: setup monorepo structure and server health test"
```

---

### Task 2: Database Schema, SQLite Connection & Admin Seeding

**Files:**
- Create: `server/db/schema.sql`
- Create: `server/db/index.js`
- Create: `server/test/db.test.js`

**Interfaces:**
- Produces:
  - `getDb()`: returns active `better-sqlite3` instance.
  - `initDb()`: runs schema migrations and seeds default admin (`admin@school.com` / `admin123`) if no admin exists.

- [ ] **Step 1: Write failing DB initialization test**
Verify tables (`users`, `classes`, `students`, `attendance_records`, `whatsapp_queue`, `school_settings`) and default admin user exist.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/db.test.js`
Expected: FAIL ("cannot find module")

- [ ] **Step 3: Implement `server/db/schema.sql` and `server/db/index.js`**
Implement table definitions, indices, and `initDb()` with `bcryptjs` password hashing for the initial admin.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/db.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/db/
git commit -m "feat(db): implement SQLite schema and initial admin seeding"
```

---

### Task 3: Phone Number Sanitizer & Message Builder Utility

**Files:**
- Create: `server/utils/phoneFormatter.js`
- Create: `server/utils/messageBuilder.js`
- Create: `server/test/phoneFormatter.test.js`

**Interfaces:**
- Produces:
  - `formatToWhatsAppJid(phone, defaultCountryCode = '91')`: string (e.g. `'919876543210@c.us'`).
  - `buildAbsenceMessage({ parentName, studentName, className, date })`: string.

- [ ] **Step 1: Write failing test for phone sanitizer and message builder**
Test phone formats: 10-digit (`"9876543210"` -> `"919876543210@c.us"`), formatted (`"+91 98765-43210"` -> `"919876543210@c.us"`), invalid numbers (`"123"` -> throws error).

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/phoneFormatter.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `formatToWhatsAppJid` and `buildAbsenceMessage`**
Handle string sanitization, country code attachment, and message formatting.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/phoneFormatter.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/utils/ server/test/phoneFormatter.test.js
git commit -m "feat(utils): add phone formatting and absence message builder"
```

---

### Task 4: Authentication & Role-Based Authorization API

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/routes/auth.js`
- Create: `server/test/auth.test.js`

**Interfaces:**
- Produces:
  - `POST /api/auth/login`: `{ email, password }` -> `{ token, user: { id, name, email, role } }`.
  - `GET /api/auth/me`: Bearer token -> current user object.
  - `requireAuth`: Express middleware verifying JWT.
  - `requireRole(role)`: Express middleware enforcing `'admin'` or `'teacher'`.

- [ ] **Step 1: Write failing authentication tests**
Test valid admin login, invalid password rejection, missing token handling, and role verification middleware.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/auth.test.js`
Expected: FAIL

- [ ] **Step 3: Implement JWT authentication and middleware**
Sign JWT on login, check password via `bcryptjs.compare`, create `requireAuth` and `requireRole`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/middleware/ server/routes/auth.js server/test/auth.test.js
git commit -m "feat(auth): implement JWT authentication and RBAC middleware"
```

---

### Task 5: Admin Teacher Management API

**Files:**
- Create: `server/routes/teachers.js`
- Create: `server/test/teachers.test.js`

**Interfaces:**
- Produces:
  - `GET /api/teachers`: (Admin only) returns list of all teachers with class counts.
  - `POST /api/teachers`: (Admin only) `{ name, email, password }` -> creates teacher account.
  - `DELETE /api/teachers/:id`: (Admin only) removes teacher account.

- [ ] **Step 1: Write failing teacher management tests**
Verify only admins can create teachers, duplicate emails are rejected, and teacher can be fetched.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/teachers.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `server/routes/teachers.js`**
Handle CRUD operations for teachers with validation.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/teachers.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/routes/teachers.js server/test/teachers.test.js
git commit -m "feat(teachers): implement admin teacher management endpoints"
```

---

### Task 6: Teacher Class & Student Roster API

**Files:**
- Create: `server/routes/classes.js`
- Create: `server/routes/students.js`
- Create: `server/test/classesAndStudents.test.js`

**Interfaces:**
- Produces:
  - `GET /api/classes`: Returns teacher's classes.
  - `POST /api/classes`: `{ name, subject }` -> creates class.
  - `GET /api/classes/:id/students`: Returns students in class.
  - `POST /api/classes/:id/students`: `{ roll_number, student_name, parent_name, parent_phone }` -> creates student.
  - `POST /api/classes/:id/students/bulk`: `{ students: [...] }` or CSV text -> batch inserts students.

- [ ] **Step 1: Write failing class and student CRUD tests**
Test class creation by teacher, single student creation, bulk student import, and ownership protection.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/classesAndStudents.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `server/routes/classes.js` and `server/routes/students.js`**
Implement endpoints with input validation and bulk insertion.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/classesAndStudents.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/routes/classes.js server/routes/students.js server/test/classesAndStudents.test.js
git commit -m "feat(classes): add class and student roster management with bulk import"
```

---

### Task 7: Attendance Recording & Queue Enqueueing API

**Files:**
- Create: `server/routes/attendance.js`
- Create: `server/test/attendance.test.js`

**Interfaces:**
- Produces:
  - `GET /api/attendance/:classId?date=YYYY-MM-DD`: Returns attendance records for class and date.
  - `POST /api/attendance/:classId`: `{ date, records: [{ student_id, status: 'present'|'absent' }] }`
    - Inserts/updates `attendance_records`.
    - For each absent student, generates absence message and enqueues into `whatsapp_queue`.
    - Returns `{ saved: number, queued_absent: number }`.

- [ ] **Step 1: Write failing attendance submission test**
Submit attendance for 3 students (2 present, 1 absent). Verify attendance records are saved and exactly 1 record is enqueued in `whatsapp_queue` with status `'pending'`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/attendance.test.js`
Expected: FAIL

- [ ] **Step 3: Implement atomic transaction attendance submission**
Use `db.transaction()` to ensure atomicity between attendance marking and queue insertion.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/attendance.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/routes/attendance.js server/test/attendance.test.js
git commit -m "feat(attendance): implement atomic attendance marking and absence queueing"
```

---

### Task 8: WhatsApp Client Service & Mock Mode

**Files:**
- Create: `server/services/whatsappClient.js`
- Create: `server/routes/whatsapp.js`
- Create: `server/test/whatsappService.test.js`

**Interfaces:**
- Produces:
  - `initWhatsAppClient()`: initializes client (or mock client if `WHATSAPP_MOCK=true`).
  - `getWhatsAppStatus()`: returns `{ status: 'DISCONNECTED'|'INITIALIZING'|'CONNECTED', qr: string|null, number: string|null }`.
  - `sendWhatsAppMessage(jid, text)`: sends message.
  - `GET /api/whatsapp/status`: Admin endpoint for live connection status & QR.
  - `POST /api/whatsapp/logout`: Clears session credentials.

- [ ] **Step 1: Write failing WhatsApp client test**
Test status reporting, QR generation mock event, and message transmission in mock mode.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/whatsappService.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `whatsappClient.js` with `whatsapp-web.js` & mock support**
Support real `whatsapp-web.js` LocalAuth alongside `WHATSAPP_MOCK` mode for automated testing.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/whatsappService.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/services/whatsappClient.js server/routes/whatsapp.js server/test/whatsappService.test.js
git commit -m "feat(whatsapp): implement whatsapp client service with mock mode support"
```

---

### Task 9: Background Queue Worker & Anti-Ban Jitter Engine

**Files:**
- Create: `server/services/queueWorker.js`
- Create: `server/test/queueWorker.test.js`

**Interfaces:**
- Produces:
  - `startQueueWorker({ minJitterMs, maxJitterMs })`: starts the background loop.
  - `stopQueueWorker()`: stops worker.
  - `processNextMessage()`: processes single message with random delay.
  - `GET /api/whatsapp/queue`: Returns paginated queue logs.
  - `POST /api/whatsapp/queue/:id/retry`: Resets a failed message to pending.

- [ ] **Step 1: Write failing queue worker test**
Verify worker picks up pending messages, applies jitter delay, calls `sendWhatsAppMessage`, and updates status to `'sent'`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix server test test/queueWorker.test.js`
Expected: FAIL

- [ ] **Step 3: Implement queue worker with 3–7s jitter interval**
Implement sequential message processing, error handling, and status logging.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix server test test/queueWorker.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add server/services/queueWorker.js server/test/queueWorker.test.js
git commit -m "feat(queue): implement anti-ban background queue worker with jitter"
```

---

### Task 10: React SPA Foundation & Design System

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`
- Create: `client/src/styles/index.css`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/services/api.js`
- Create: `client/src/App.jsx`
- Create: `client/src/pages/Login.jsx`

**Interfaces:**
- Produces:
  - Modern responsive SPA with dark/light themes, Inter typography, glassmorphism cards.
  - Global `AuthContext` managing JWT token, login state, and role.
  - Login page supporting both Admin and Teacher credentials.

- [ ] **Step 1: Initialize Vite React client**
Setup `client/package.json`, Vite configuration with API proxy to `http://localhost:5000`.

- [ ] **Step 2: Build Design System in `client/src/styles/index.css`**
Define CSS variables for colors, surface elevations, gradients, typography, badges, and button animations.

- [ ] **Step 3: Implement API client and AuthContext**
Axios/fetch wrapper with automatic `Authorization: Bearer <token>` injection and storage in `localStorage`.

- [ ] **Step 4: Implement Login screen and test build**
Run: `npm --prefix client run build`
Expected: PASS (build succeeds with 0 errors).

- [ ] **Step 5: Commit**
```bash
git add client/
git commit -m "feat(client): setup Vite React SPA foundation, design system, and auth"
```

---

### Task 11: Teacher Class & Student Roster Management UI

**Files:**
- Create: `client/src/pages/teacher/Dashboard.jsx`
- Create: `client/src/pages/teacher/ClassDetails.jsx`
- Create: `client/src/components/AddStudentModal.jsx`
- Create: `client/src/components/BulkImportModal.jsx`

**Interfaces:**
- Produces:
  - Teacher Dashboard: View created classes, student count, quick link to mark attendance.
  - Class Details: Student roster table with student name, roll number, parent name, parent phone number.
  - Single Student Add Modal & Bulk Import Modal (paste CSV/TSV).

- [ ] **Step 1: Implement Teacher Dashboard page**
Create class cards with summary statistics and "Take Attendance" quick action.

- [ ] **Step 2: Implement Class Details and Student Roster view**
Render student roster table with search/filter by name or roll number.

- [ ] **Step 3: Implement Add Student Modal & Bulk Import Modal**
Allow adding students one by one or pasting CSV data with preview before save.

- [ ] **Step 4: Verify client build**
Run: `npm --prefix client run build`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add client/src/pages/teacher/ client/src/components/
git commit -m "feat(client): implement teacher class and student roster UI"
```

---

### Task 12: Interactive Attendance Marking & Real-Time Queue UI

**Files:**
- Create: `client/src/pages/teacher/MarkAttendance.jsx`
- Create: `client/src/components/AttendanceSummaryBar.jsx`
- Create: `client/src/components/ConfirmAttendanceModal.jsx`

**Interfaces:**
- Produces:
  - Date picker (defaults to today).
  - Student row with interactive `[ Present ]` / `[ Absent ]` toggle pills.
  - "Mark All Present" one-click button.
  - Real-time counter: Total Students, Present count, Absent count.
  - Submission confirmation modal detailing how many WhatsApp messages will be queued.
  - Post-submit live queue progress indicator.

- [ ] **Step 1: Implement `MarkAttendance.jsx` with date selector & student status list**
Toggle student between Present (green) and Absent (red).

- [ ] **Step 2: Add AttendanceSummaryBar & ConfirmAttendanceModal**
Show summary count and confirmation dialog before pushing to server.

- [ ] **Step 3: Verify client build**
Run: `npm --prefix client run build`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add client/src/pages/teacher/MarkAttendance.jsx client/src/components/
git commit -m "feat(client): implement interactive attendance marking and summary bar"
```

---

### Task 13: Admin Portal UI (Teachers, WhatsApp Pairing & Queue Monitor)

**Files:**
- Create: `client/src/pages/admin/AdminDashboard.jsx`
- Create: `client/src/pages/admin/TeacherManagement.jsx`
- Create: `client/src/pages/admin/WhatsAppManager.jsx`
- Create: `client/src/pages/admin/QueueMonitor.jsx`

**Interfaces:**
- Produces:
  - Teacher Management: Create new teacher login credentials, view active teachers.
  - WhatsApp Device Manager: Live status badge (`Connected`, `Scan QR`, `Disconnected`), rendered QR code image, and Reconnect button.
  - Queue Monitor: Real-time table of recent WhatsApp notifications with Status badge, delivery timestamp, error message, and "Retry" button.

- [ ] **Step 1: Implement Admin Teacher Management page**
Form to create new teachers with Name, Email, Password.

- [ ] **Step 2: Implement WhatsApp Manager with QR code display**
Poll or fetch `/api/whatsapp/status` and render QR code for pairing.

- [ ] **Step 3: Implement Queue Monitor & Retry view**
Table displaying recent queue entries with status filters and retry action.

- [ ] **Step 4: Verify client build**
Run: `npm --prefix client run build`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add client/src/pages/admin/
git commit -m "feat(client): implement admin portal with teacher management and whatsapp manager"
```

---

### Task 14: End-to-End System Verification & Launch Script

**Files:**
- Create: `server/test/e2e.test.js`
- Modify: `package.json` (add root `npm run dev` and `npm test` scripts)
- Create: `README.md` (complete user documentation)

**Interfaces:**
- Produces:
  - Automated full-flow integration test:
    1. Admin logs in.
    2. Admin creates teacher account.
    3. Teacher logs in.
    4. Teacher creates class and adds 3 students.
    5. Teacher marks 1 student absent and 2 present.
    6. System records attendance and enqueues 1 WhatsApp message.
    7. Background queue worker delivers message in mock mode and marks `'sent'`.

- [ ] **Step 1: Write comprehensive end-to-end integration test**
Simulate complete user journey across all API endpoints with `WHATSAPP_MOCK=true`.

- [ ] **Step 2: Run end-to-end test**
Run: `npm test`
Expected: ALL TESTS PASS

- [ ] **Step 3: Update README.md with setup and usage instructions**
Document how to run the app, default admin login, scanning WhatsApp QR, and teacher workflows.

- [ ] **Step 4: Final verification and commit**
```bash
git add .
git commit -m "test: add comprehensive end-to-end test and project documentation"
```
