'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();
router.use(requireAuth);

function shape(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.punch_type,
    punchedAt: row.punched_at,
    note: row.note,
  };
}

// ---- POST /api/attendance/punch ----
// Auto-determines IN vs OUT: if last punch today was IN, next is OUT, else IN.
router.post('/punch', async (req, res, next) => {
  try {
    const { rows: last } = await db.query(
      `SELECT punch_type FROM attendance_punches
        WHERE user_id = $1
          AND punched_at::date = CURRENT_DATE
        ORDER BY punched_at DESC LIMIT 1`,
      [req.user.sub]
    );

    const nextType = last[0] && last[0].punch_type === 'IN' ? 'OUT' : 'IN';

    const { rows } = await db.query(
      `INSERT INTO attendance_punches (user_id, punch_type, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.sub, nextType, req.body?.note || null]
    );
    res.status(201).json({ punch: shape(rows[0]) });
  } catch (err) { next(err); }
});

// ---- GET /api/attendance/today ----
router.get('/today', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM attendance_punches
        WHERE user_id = $1 AND punched_at::date = CURRENT_DATE
        ORDER BY punched_at ASC`,
      [req.user.sub]
    );

    let workedMs = 0;
    let lastIn = null;
    for (const row of rows) {
      if (row.punch_type === 'IN') lastIn = new Date(row.punched_at);
      else if (row.punch_type === 'OUT' && lastIn) {
        workedMs += new Date(row.punched_at) - lastIn;
        lastIn = null;
      }
    }
    if (lastIn) workedMs += Date.now() - lastIn.getTime();

    const status = rows.length === 0
      ? 'not-punched'
      : rows[rows.length - 1].punch_type === 'IN' ? 'in' : 'out';

    res.json({
      punches: rows.map(shape),
      status,
      workedMinutes: Math.floor(workedMs / 60000),
    });
  } catch (err) { next(err); }
});

// ---- GET /api/attendance/history ----
router.get('/history', async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 180);
    const { rows } = await db.query(
      `SELECT * FROM attendance_punches
        WHERE user_id = $1
          AND punched_at >= NOW() - INTERVAL '${days} days'
        ORDER BY punched_at DESC
        LIMIT 1000`,
      [req.user.sub]
    );
    res.json({ punches: rows.map(shape) });
  } catch (err) { next(err); }
});

// ---- GET /api/attendance/all ---- (admin only)
router.get('/all', requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.first_name, u.last_name, u.email
         FROM attendance_punches p
         JOIN users u ON u.id = p.user_id
        WHERE p.punched_at::date = CURRENT_DATE
        ORDER BY p.punched_at DESC
        LIMIT 200`
    );
    res.json({
      punches: rows.map(r => ({
        ...shape(r),
        userName: `${r.first_name} ${r.last_name}`,
        userEmail: r.email,
      })),
    });
  } catch (err) { next(err); }
});

module.exports = router;
