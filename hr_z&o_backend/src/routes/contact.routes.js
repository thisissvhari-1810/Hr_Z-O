'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', limiter, async (req, res, next) => {
  try {
    const {
      name, email, message,
      company = null, topic = null,
    } = req.body || {};

    if (!name)                   return res.status(400).json({ error: 'Name is required.' });
    if (!email || !EMAIL_RE.test(email))
                                 return res.status(400).json({ error: 'A valid email is required.' });
    if (!message || message.length < 5)
                                 return res.status(400).json({ error: 'Please include a short message.' });

    await db.query(
      `INSERT INTO contact_messages (name, email, company, topic, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email.toLowerCase(), company, topic, message]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
