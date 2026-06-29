'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const db = require('../db');
const { signToken, requireAuth, toPublicUser } = require('../auth');

const router = express.Router();

// ---- Rate limits ----
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- Helpers ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(res, msg) {
  return res.status(400).json({ error: msg });
}

// ---- POST /api/auth/signup ----
router.post('/signup', signupLimiter, async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, password,
      company = null, size = null, phone = null,
    } = req.body || {};

    if (!firstName || !lastName) return badRequest(res, 'First and last name are required.');
    if (!email || !EMAIL_RE.test(email)) return badRequest(res, 'A valid work email is required.');
    if (!password || password.length < 8) return badRequest(res, 'Password must be at least 8 characters.');

    const hash = await bcrypt.hash(password, 12);

    let inserted;
    try {
      inserted = await db.query(
        `INSERT INTO users (first_name, last_name, email, company, company_size, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [firstName, lastName, email.toLowerCase(), company, size, phone, hash]
      );
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
      throw err;
    }

    const user = toPublicUser(inserted.rows[0]);
    const token = signToken({ sub: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/auth/login ----
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return badRequest(res, 'Email and password are required.');

    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase()]
    );
    const row = rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    const user = toPublicUser(row);
    const token = signToken({ sub: user.id, email: user.email });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/auth/me ----
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [req.user.sub]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
