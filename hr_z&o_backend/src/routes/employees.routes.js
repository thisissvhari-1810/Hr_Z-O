'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function shape(row) {
  return {
    id: row.id,
    empCode: row.emp_code,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    email: row.email,
    phone: row.phone,
    designation: row.designation,
    department: row.department,
    joinedDate: row.joined_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

// All routes require auth. Mutating routes require admin.
router.use(requireAuth);

// ---- GET /api/employees ----
// Admin sees everyone; employees see only their colleagues' minimal info.
router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const dept   = (req.query.department || '').trim();

    const where = [];
    const params = [];
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(`(LOWER(first_name) LIKE $${params.length}
                OR LOWER(last_name)  LIKE $${params.length}
                OR LOWER(email)      LIKE $${params.length}
                OR LOWER(emp_code)   LIKE $${params.length})`);
    }
    if (dept) {
      params.push(dept);
      where.push(`department = $${params.length}`);
    }
    const sql = `SELECT * FROM employees
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY created_at DESC LIMIT 500`;
    const { rows } = await db.query(sql, params);
    res.json({ employees: rows.map(shape) });
  } catch (err) { next(err); }
});

// ---- GET /api/employees/:id ----
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ employee: shape(rows[0]) });
  } catch (err) { next(err); }
});

// ---- POST /api/employees ----  (admin only)
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const {
      empCode, firstName, lastName, email,
      phone = null, designation = null, department = null,
      joinedDate = null, status = 'active',
    } = req.body || {};

    if (!empCode || !firstName || !lastName)
      return res.status(400).json({ error: 'empCode, firstName and lastName are required.' });
    if (!email || !EMAIL_RE.test(email))
      return res.status(400).json({ error: 'A valid email is required.' });

    try {
      const { rows } = await db.query(
        `INSERT INTO employees
            (emp_code, first_name, last_name, email, phone, designation, department, joined_date, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date, CURRENT_DATE),$9,$10)
         RETURNING *`,
        [empCode, firstName, lastName, email.toLowerCase(), phone, designation, department, joinedDate, status, req.user.sub]
      );
      res.status(201).json({ employee: shape(rows[0]) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Employee code or email already exists.' });
      throw err;
    }
  } catch (err) { next(err); }
});

// ---- PATCH /api/employees/:id ----  (admin only)
router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const allowed = ['first_name','last_name','email','phone','designation','department','joined_date','status'];
    const map = {
      firstName:'first_name', lastName:'last_name', email:'email', phone:'phone',
      designation:'designation', department:'department', joinedDate:'joined_date', status:'status',
    };

    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(req.body || {})) {
      const col = map[k];
      if (!col || !allowed.includes(col)) continue;
      params.push(k === 'email' && typeof v === 'string' ? v.toLowerCase() : v);
      sets.push(`${col} = $${params.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

    params.push(req.params.id);
    const sql = `UPDATE employees SET ${sets.join(', ')}, updated_at = NOW()
                 WHERE id = $${params.length} RETURNING *`;
    try {
      const { rows } = await db.query(sql, params);
      if (!rows[0]) return res.status(404).json({ error: 'Employee not found.' });
      res.json({ employee: shape(rows[0]) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'That email or employee code is already in use.' });
      throw err;
    }
  } catch (err) { next(err); }
});

// ---- DELETE /api/employees/:id ----  (admin only)
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
