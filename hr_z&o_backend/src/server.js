'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { migrate } = require('./migrate');
const authRoutes = require('./routes/auth.routes');
const contactRoutes = require('./routes/contact.routes');

const PORT = parseInt(process.env.PORT || '4000', 10);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ----- CORS -----
// In production the frontend hits the API through the nginx proxy, so no CORS
// header is needed. CORS_ORIGIN lets you whitelist extra origins (e.g.
// http://localhost:5500 if you open the HTML directly during development).
const corsOrigin = process.env.CORS_ORIGIN || '';
if (corsOrigin) {
  app.use(cors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  }));
}

app.use(express.json({ limit: '64kb' }));

// ----- Health -----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'peopleflow-backend', time: new Date().toISOString() });
});

// ----- Routes -----
app.use('/api/auth',    authRoutes);
app.use('/api/contact', contactRoutes);

// ----- 404 -----
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ----- Error handler -----
app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ----- Boot -----
async function boot() {
  await migrate();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PeopleFlow backend listening on :${PORT}`);
  });
}

boot().catch((err) => {
  console.error('[boot] failed:', err);
  process.exit(1);
});
