'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const db = require('../db');
const { signToken, requireAuth, toPublicUser } = require('../auth');

const router = express.Router();

// ---- Rate limits ----
const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const loginLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const passLimiter   = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

// ---- Helpers ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function badRequest(res, msg) { return res.status(400).json({ error: msg }); }
function buildSession(user) {
  return { token: signToken({ sub: user.id, email: user.email, role: user.role }), user };
}

// ---- POST /api/auth/signup ----
// First account ever becomes admin automatically.
router.post('/signup', signupLimiter, async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, password,
      company = null, size = null, phone = null,
    } = req.body || {};

    if (!firstName || !lastName) return badRequest(res, 'First and last name are required.');
    if (!email || !EMAIL_RE.test(email)) return badRequest(res, 'A valid work email is required.');
    if (!password || password.length < 8) return badRequest(res, 'Password must be at least 8 characters.');

    const { rows: countRows } = await db.query('SELECT COUNT(*)::int AS n FROM users');
    const role = countRows[0].n === 0 ? 'admin' : 'employee';

    const hash = await bcrypt.hash(password, 12);

    let inserted;
    try {
      inserted = await db.query(
        `INSERT INTO users (first_name, last_name, email, company, company_size, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [firstName, lastName, email.toLowerCase(), company, size, phone, hash, role]
      );
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' });
      throw err;
    }

    res.status(201).json(buildSession(toPublicUser(inserted.rows[0])));
  } catch (err) { next(err); }
});

// ---- POST /api/auth/login ----
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return badRequest(res, 'Email and password are required.');

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
    const row = rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    res.json(buildSession(toPublicUser(row)));
  } catch (err) { next(err); }
});

// ---- GET /api/auth/me ----
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [req.user.sub]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) { next(err); }
});

// ---- PATCH /api/auth/me ----
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { firstName, lastName, phone = null, company = null } = req.body || {};
    if (!firstName || !lastName) return badRequest(res, 'First and last name are required.');

    const { rows } = await db.query(
      `UPDATE users
         SET first_name = $1, last_name = $2, phone = $3, company = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [firstName, lastName, phone, company, req.user.sub]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) { next(err); }
});

// ---- POST /api/auth/change-password ----
router.post('/change-password', passLimiter, requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return badRequest(res, 'Both current and new password are required.');
    if (newPassword.length < 8) return badRequest(res, 'New password must be at least 8 characters.');

    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'User not found.' });

    const ok = await bcrypt.compare(currentPassword, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.sub]);

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
