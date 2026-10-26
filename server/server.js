const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./db/index.js');
const { initWhatsAppClient } = require('./services/whatsappClient.js');
const { startQueueWorker } = require('./services/queueWorker.js');

const authRoutes = require('./routes/auth.js');
const teachersRoutes = require('./routes/teachers.js');
const classesRoutes = require('./routes/classes.js');
const studentsRoutes = require('./routes/students.js');
const attendanceRoutes = require('./routes/attendance.js');
const whatsappRoutes = require('./routes/whatsapp.js');

const app = express();

app.use(cors());
app.use(express.json());

// Initialize DB
initDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  // Start services
  initWhatsAppClient().catch(err => console.error('Failed to init WhatsApp client:', err));
  startQueueWorker();

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = { app };
