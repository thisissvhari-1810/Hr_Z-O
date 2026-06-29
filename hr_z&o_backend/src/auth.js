'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token.' });
  try {
    req.user = verifyToken(token);
    next();
  } catch (_) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// requireRole('admin') — must be used AFTER requireAuth.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    next();
  };
}

function toPublicUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    company: row.company,
    size: row.company_size,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
  };
}

module.exports = { signToken, verifyToken, requireAuth, requireRole, toPublicUser };
