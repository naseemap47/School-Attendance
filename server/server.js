const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./db/index.js');
const authRoutes = require('./routes/auth.js');
const teachersRoutes = require('./routes/teachers.js');

const app = express();

app.use(cors());
app.use(express.json());

// Initialize DB
initDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teachersRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = { app };
