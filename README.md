# AttendFlow - School Attendance & WhatsApp Notification System

AttendFlow is a full-stack school attendance management application designed for teachers and school administrators. When a teacher marks student attendance, parents of absent students automatically receive automated WhatsApp alerts.

The messaging queue features an intelligent **anti-ban delivery engine** that throttles messages with randomized human-like jitter delays (3–7 seconds) to safeguard the school's WhatsApp account from automated spam filters.

---

## 🌟 Key Features

### 👨‍🏫 Teacher Workspace
- **Class Creation & Management**: Create classes and batches (e.g. *"Grade 10 - Section A"*, *"Physics Batch B"*).
- **Student Roster Management**:
  - Add individual students with Roll Number, Student Name, Parent Name, and Parent WhatsApp Number.
  - **Quick Bulk Import**: Paste multiple student records at once via CSV or TSV text.
- **Interactive Attendance Sheet**:
  - Date selector defaulting to today.
  - Rapid single-click **"Mark All Present"** button.
  - Interactive Present / Absent toggle switches with real-time counters.
  - **Submission Confirmation Modal**: Displays a clear breakdown of absences and previews queued WhatsApp messages before saving.

### ⚙️ Admin Control Center
- **Teacher Account Management**: Create and manage login credentials for school teachers.
- **Centralized WhatsApp Device Pairing**:
  - Real-time QR code display to pair the school's official WhatsApp account.
  - Session persistence (`LocalAuth`) so you only scan the QR code once.
  - Disconnect / Switch Number controls.
- **Live Message Queue Monitor**:
  - Live counts of Pending, Processing, Sent, and Failed messages.
  - Message audit logs with delivery timestamps and failure reason details.
  - 1-click **"Retry"** button for failed transmissions.

### 🛡️ WhatsApp Anti-Ban Throttling Strategy
- **Absentee Only Policy**: Notifications are dispatched **strictly to parents of students marked Absent**, eliminating excessive message spam.
- **Randomized Jitter Delay (3–7s)**: Rather than sending messages at a robotic 1.0s clockwork interval, messages are paced with a random delay of 3 to 7 seconds between each send, mimicking authentic human interaction.
- **Phone Number Normalization**: Strips invalid characters, auto-prefixes standard country codes (e.g., `+91`), and validates format before dispatching.
- **Persistent SQLite Queue**: Messages are committed to an atomic SQLite transaction alongside attendance records. If the server restarts, pending items resume safely.

---

## 🏗️ Architecture & Tech Stack

- **Backend**: Node.js 18+, Express.js
- **Database**: SQLite (via Node.js built-in `node:sqlite` DatabaseSync) in WAL mode
- **WhatsApp**: `whatsapp-web.js` with Puppeteer headless Chromium and `LocalAuth` session persistence
- **Frontend**: React 18, Vite SPA with Vanilla CSS design system (dark glassmorphism, responsive tables, modal flows)
- **Security**: JWT authentication (`jsonwebtoken`), password hashing via `bcryptjs`

```
School-Attendance/
├── client/                     # React Vite Single Page Application
│   ├── src/
│   │   ├── components/         # AddStudent, BulkImport, AttendanceSummary, ConfirmModal
│   │   ├── context/            # AuthContext (JWT management)
│   │   ├── pages/              # Login, TeacherDashboard, ClassDetails, MarkAttendance, Admin
│   │   ├── services/           # API fetch wrapper
│   │   └── styles/             # Modern CSS tokens & design system
├── server/                     # Express Backend & WhatsApp Worker
│   ├── db/                     # SQLite schema & database connection
│   ├── middleware/             # JWT auth & RBAC guards
│   ├── routes/                 # Auth, Teachers, Classes, Students, Attendance, WhatsApp
│   ├── services/               # WhatsApp Web client & Anti-ban queue worker
│   ├── utils/                  # Phone normalization & Absence message builder
│   └── test/                   # 29 automated test cases (Unit, API, E2E)
└── docs/superpowers/           # Specs and implementation plan
```

---

## 🐳 Docker Deployment (Runs Forever & Auto-Starts on Boot)

AttendFlow is fully containerized with Chromium, SQLite, and persistent WhatsApp Web sessions. It is configured with `restart: always`, ensuring that it starts automatically when your PC boots or restarts.

### Running with Docker on any PC:

1. **Clone the repository and enter the directory**:
   ```bash
   git clone https://github.com/naseemap47/School-Attendance.git
   cd School-Attendance
   ```

2. **(Optional) Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env if you wish to customize PORT or JWT_SECRET
   ```

3. **Start the application in background mode**:
   ```bash
   docker compose up -d --build
   ```

4. **Access the web application**:
   - URL: **`http://localhost:5000`** (or your machine's IP address e.g. `http://192.168.1.100:5000`)

5. **Useful Docker commands**:
   ```bash
   # View live logs
   docker compose logs -f

   # Check container status
   docker compose ps

   # Stop container
   docker compose down

   # Restart container
   docker compose restart
   ```

---

## 🚀 Local Development (Without Docker)

### 1. Install Dependencies
```bash
# In the project root
npm run install:all
```

### 2. Start the Server and Client
You can run both concurrently in development:
```bash
npm run dev
```

Or build the client bundle and run the Express server directly:
```bash
npm --prefix client run build
npm --prefix server start
```
The application will be live at: **`http://localhost:5000`** (or `http://localhost:3000` in dev mode with Vite proxy).

---

## 🔑 Default Credentials

On initial startup, the database automatically seeds the default administrator account:

- **Email**: `admin@school.com`
- **Password**: `admin123`

### Workflow Steps:
1. Log in as **Admin** (`admin@school.com` / `admin123`).
2. Go to **WhatsApp Connection** and scan the pairing QR code with your school WhatsApp phone.
3. Go to **Teacher Accounts** and create a login for a teacher (e.g., `teacher@school.com` / `teacher123`).
4. Log out and log in as the **Teacher**.
5. Create a class (e.g., *"Grade 10 - Section A"*).
6. Click **Manage Roster** and add students or use **Bulk Import** with parent phone numbers.
7. Click **Take Attendance**, toggle absentees, and hit **Save Attendance & Dispatch Alerts**.
8. Switch back to the Admin **Live Message Queue** tab to observe messages being delivered in real time with 3–7s jitter delays!

---

## 🧪 Running Automated Tests

Run the complete test suite (29 tests including unit, API, and E2E integration tests):

```bash
npm test
```