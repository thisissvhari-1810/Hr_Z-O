'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// ---- GET /api/dashboard/stats ----
// Returns role-appropriate KPIs.
router.get('/stats', async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      const [users, emps, pending, presentToday] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS n FROM users'),
        db.query('SELECT COUNT(*)::int AS n FROM employees WHERE status = $1', ['active']),
        db.query(`SELECT COUNT(*)::int AS n FROM leave_requests WHERE status = 'pending'`),
        db.query(`SELECT COUNT(DISTINCT user_id)::int AS n
                    FROM attendance_punches
                   WHERE punched_at::date = CURRENT_DATE`),
      ]);

      const { rows: recentLeave } = await db.query(
        `SELECT l.*,
                (u.first_name || ' ' || u.last_name) AS user_name,
                u.email AS user_email
           FROM leave_requests l
           JOIN users u ON u.id = l.user_id
          ORDER BY l.created_at DESC LIMIT 6`
      );

      const { rows: recentEmps } = await db.query(
        `SELECT * FROM employees ORDER BY created_at DESC LIMIT 6`
      );

      res.json({
        scope: 'admin',
        cards: [
          { key: 'employees',   label: 'Active employees',  value: emps.rows[0].n,         icon: '🧑‍💼' },
          { key: 'users',       label: 'Platform users',    value: users.rows[0].n,        icon: '👥' },
          { key: 'punchedIn',   label: 'Punched in today',  value: presentToday.rows[0].n, icon: '🟢' },
          { key: 'pendingLeave',label: 'Pending leave',     value: pending.rows[0].n,      icon: '🌴' },
        ],
        recentLeaves: recentLeave.map(r => ({
          id: r.id, userName: r.user_name, userEmail: r.user_email,
          leaveType: r.leave_type, fromDate: r.from_date, toDate: r.to_date,
          status: r.status, createdAt: r.created_at,
        })),
        recentEmployees: recentEmps.map(r => ({
          id: r.id, empCode: r.emp_code,
          fullName: `${r.first_name} ${r.last_name}`,
          email: r.email, designation: r.designation, department: r.department,
        })),
      });
    } else {
      const userId = req.user.sub;

      const [todayPunches, lastMonthPunches, leaves] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS n FROM attendance_punches
                  WHERE user_id = $1 AND punched_at::date = CURRENT_DATE`, [userId]),
        db.query(`SELECT COUNT(DISTINCT punched_at::date)::int AS n
                    FROM attendance_punches
                   WHERE user_id = $1 AND punched_at >= NOW() - INTERVAL '30 days'`, [userId]),
        db.query(`SELECT status, COUNT(*)::int AS n FROM leave_requests
                  WHERE user_id = $1 GROUP BY status`, [userId]),
      ]);

      const { rows: recentLeave } = await db.query(
        `SELECT * FROM leave_requests WHERE user_id = $1
          ORDER BY created_at DESC LIMIT 5`, [userId]
      );

      const tally = { pending: 0, approved: 0, rejected: 0 };
      for (const r of leaves.rows) tally[r.status] = r.n;

      res.json({
        scope: 'employee',
        cards: [
          { key: 'today',    label: "Today's punches",     value: todayPunches.rows[0].n,    icon: '📍' },
          { key: 'present30',label: 'Days present (30d)',  value: lastMonthPunches.rows[0].n, icon: '🗓️' },
          { key: 'pending',  label: 'Pending leave',       value: tally.pending,              icon: '🌴' },
          { key: 'approved', label: 'Approved leave',      value: tally.approved,             icon: '✅' },
        ],
        recentLeaves: recentLeave.map(r => ({
          id: r.id, leaveType: r.leave_type, fromDate: r.from_date, toDate: r.to_date,
          status: r.status, createdAt: r.created_at,
        })),
      });
    }
  } catch (err) { next(err); }
});

module.exports = router;
