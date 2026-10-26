# Specification: School Attendance & WhatsApp Notification System

**Date:** 2026-10-26  
**Status:** Approved  
**Target Repository:** `School-Attendance`

---

## 1. Executive Summary
The School Attendance System is a full-stack web application designed for schools to streamline student attendance tracking and provide automated, reliable WhatsApp absence notifications to parents. 

The system provides:
1. **Admin Portal**: For administrator-managed teacher credentials, global queue monitoring, and centralized school WhatsApp account pairing via QR code.
2. **Teacher Workspace**: For class creation, student roster management (with bulk import support), and rapid daily attendance marking (Present/Absent).
3. **Anti-Ban Background WhatsApp Engine**: Utilizing `whatsapp-web.js` with session persistence, phone number normalization, and a randomized jitter delay (3–7 seconds) to deliver absence notifications securely without triggering WhatsApp spam filters.

---

## 2. Architecture & Tech Stack

### 2.1 Technology Stack
- **Backend**: Node.js (v18+), Express.js.
- **Database**: SQLite (via `better-sqlite3`) with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for high concurrency and zero external setup.
- **WhatsApp Integration**: `whatsapp-web.js` with Puppeteer (`headless: 'new'`) and `LocalAuth` session strategy.
- **Security**: JWT authentication (`jsonwebtoken`), password hashing via `bcryptjs`.
- **Frontend**: React (Vite SPA) with modern Vanilla CSS design system, typography (Inter), glassmorphism cards, responsive navigation, and accessible interactive elements.
- **Monorepo Layout**:
  - `server/`: Express API, SQLite migrations, WhatsApp client, queue worker.
  - `client/`: React SPA source code and build configs.

```
School-Attendance/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── styles/
├── server/
│   ├── package.json
│   ├── server.js
│   ├── config/
│   ├── db/
│   │   ├── schema.sql
│   │   └── index.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── classes.js
│   │   ├── students.js
│   │   ├── attendance.js
│   │   └── whatsapp.js
│   ├── services/
│   │   ├── whatsappClient.js
│   │   └── queueWorker.js
│   └── utils/
│       └── phoneFormatter.js
├── docs/
│   └── superpowers/specs/
└── package.json (root orchestration)
```

---

## 3. Data Model & Database Schema

All tables are created in `server/data/attendance.db`:

```sql
-- Users (Admin & Teachers)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Classes created by teachers
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subject TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Students assigned to classes
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    roll_number TEXT,
    student_name TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Daily attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- Format: YYYY-MM-DD
    status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
    marked_by INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id, date),
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(marked_by) REFERENCES users(id)
);

-- Persistent background WhatsApp queue
CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    attendance_id INTEGER NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    message_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'sent', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(attendance_id) REFERENCES attendance_records(id) ON DELETE CASCADE
);

-- School Settings (Default country code, WhatsApp status metadata)
CREATE TABLE IF NOT EXISTS school_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## 4. Subsystems & Features

### 4.1 Authentication & RBAC
- **Admin**:
  - Pre-seeded or initialized on first run (`admin@school.com` / `admin123` with prompt to change).
  - Can create, list, and manage teacher credentials.
  - Can access the WhatsApp Device Manager and global Queue Logs.
- **Teacher**:
  - Accounts managed strictly by the administrator.
  - Authenticated via JWT bearer token.
  - Can manage their own classes, rosters, and mark attendance.

### 4.2 WhatsApp Client & Anti-Ban Queue Engine
- **Session Management**:
  - Uses `whatsapp-web.js` with `LocalAuth` rooted in `server/.wwebjs_auth/`.
  - Admin can inspect live QR code at `/api/whatsapp/qr` and connection status (`CONNECTED`, `INITIALIZING`, `DISCONNECTED`).
- **Sanitization & Formatting**:
  - Strips non-digit characters from parent phone numbers.
  - Ensures country code prefix (defaults to configurable school country code, e.g. `91` for India, if only 10 digits provided).
  - Converts destination to valid JID format (`<phone_number>@c.us`).
- **Queue Worker Logic**:
  1. Worker continuously inspects `whatsapp_queue` for records where `status = 'pending'`.
  2. If the WhatsApp client is not `CONNECTED`, worker sleeps and retries once connection is established.
  3. Picks up next message, marks `status = 'processing'`.
  4. Waits a **random jitter delay of 3.0 to 7.0 seconds** before dispatching.
  5. Sends message via `whatsappClient.sendMessage(jid, messageBody)`.
  6. On success: sets `status = 'sent'`, records `sent_at = CURRENT_TIMESTAMP`.
  7. On error: records `error_message`, increments `retry_count`. If `retry_count < 2`, keeps status `'pending'`; otherwise marks `'failed'`.

### 4.3 Attendance Workflow
1. Teacher selects a class and target date (defaults to today).
2. UI displays student roster with one-click toggles (`Present` / `Absent`).
3. Teacher can click "Mark All Present" for rapid batch marking.
4. Summary bar updates in real time: Total, Present count, Absent count.
5. On "Submit Attendance", an atomic SQLite transaction:
   - Upserts attendance records for all students in the class for the date.
   - For every student marked **`absent`**, constructs a personalized notification message:
     *"Dear [Parent Name], please be informed that your child [Student Name] was marked ABSENT from [Class Name] on [Date]. If you have any questions, please contact the school."*
   - Inserts records into `whatsapp_queue`.
6. UI confirms attendance saved and shows live queue progress.

### 4.4 Roster Management & Bulk Import
- Add individual student modal (Roll No, Student Name, Parent Name, Parent Phone).
- Quick Bulk Paste / CSV import: Teachers can paste comma-separated or tab-separated student lines (`Roll, Student Name, Parent Name, Phone`) to add an entire class in seconds.

---

## 5. Error Handling & Resilience
- **Database Atomicity**: Attendance submission and message enqueueing execute in a single SQLite transaction (`db.transaction(...)`).
- **Network Resilience**: Failed WhatsApp messages don't fail the attendance submission; they are queued and can be retried individually or automatically.
- **Headless Browser Safeguards**: Puppeteer launched with flags (`--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage`) to avoid memory pressure or container crashes.
- **Mock Mode**: Supports an environment variable `WHATSAPP_MOCK=true` for instant testing and local development without requiring a live WhatsApp phone.

---

## 6. Verification & Testing
1. **Unit Tests**:
   - Phone number sanitization and formatting tests (10-digit, 12-digit, international prefix, invalid characters).
   - Queue worker jitter delay and status transition tests.
2. **API Integration Tests**:
   - Authentication (login, token validation, role guards).
   - Class and student CRUD.
   - Attendance submission and atomic queue insertion.
3. **End-to-End Workflow Validation**:
   - Admin creates a teacher account.
   - Teacher logs in, creates a class, imports students.
   - Teacher marks 2 students absent and submits attendance.
   - System registers absent records and processes queue entries with 3–7s jitter delays.
