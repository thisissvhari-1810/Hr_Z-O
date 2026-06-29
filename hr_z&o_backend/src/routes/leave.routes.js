'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const TYPES = ['casual', 'sick', 'earned', 'unpaid', 'other'];

function shape(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || null,
    userEmail: row.user_email || null,
    leaveType: row.leave_type,
    fromDate: row.from_date,
    toDate: row.to_date,
    reason: row.reason,
    status: row.status,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

// ---- POST /api/leave ---- (any logged-in user)
router.post('/', async (req, res, next) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body || {};
    if (!TYPES.includes(leaveType)) return res.status(400).json({ error: 'Invalid leave type.' });
    if (!fromDate || !toDate)       return res.status(400).json({ error: 'fromDate and toDate are required.' });
    if (!reason || reason.length < 3) return res.status(400).json({ error: 'Please add a short reason.' });
    if (new Date(toDate) < new Date(fromDate))
      return res.status(400).json({ error: '"To" date must be on or after the "from" date.' });

    const { rows } = await db.query(
      `INSERT INTO leave_requests (user_id, leave_type, from_date, to_date, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.sub, leaveType, fromDate, toDate, reason]
    );
    res.status(201).json({ leave: shape(rows[0]) });
  } catch (err) { next(err); }
});

// ---- GET /api/leave/mine ----
router.get('/mine', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [req.user.sub]
    );
    res.json({ leaves: rows.map(shape) });
  } catch (err) { next(err); }
});

// ---- GET /api/leave ---- (admin: list all, with filters)
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const status = (req.query.status || '').trim();
    const params = [];
    let where = '';
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      params.push(status);
      where = `WHERE l.status = $${params.length}`;
    }
    const { rows } = await db.query(
      `SELECT l.*,
              (u.first_name || ' ' || u.last_name) AS user_name,
              u.email AS user_email
         FROM leave_requests l
         JOIN users u ON u.id = l.user_id
         ${where}
        ORDER BY l.created_at DESC
        LIMIT 300`,
      params
    );
    res.json({ leaves: rows.map(shape) });
  } catch (err) { next(err); }
});

// ---- PATCH /api/leave/:id ---- (admin: approve / reject)
router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ error: 'Status must be "approved" or "rejected".' });

    const { rows } = await db.query(
      `UPDATE leave_requests
          SET status = $1, decided_by = $2, decided_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [status, req.user.sub, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Leave request not found.' });
    res.json({ leave: shape(rows[0]) });
  } catch (err) { next(err); }
});

module.exports = router;
