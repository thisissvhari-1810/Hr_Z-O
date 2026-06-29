'use strict';

const { pool } = require('./db');

const SQL = `
-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  company       TEXT,
  company_size  TEXT,
  phone         TEXT,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'employee',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add the role column to pre-existing installs.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'employee'))
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);

-- ---------- CONTACT MESSAGES ----------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  company    TEXT,
  topic      TEXT,
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- EMPLOYEES (people-record directory, admin-managed) ----------
CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  emp_code      TEXT        NOT NULL UNIQUE,
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  phone         TEXT,
  designation   TEXT,
  department    TEXT,
  joined_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT        NOT NULL DEFAULT 'active',
  created_by    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employees_email      ON employees (email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_status     ON employees (status);

-- ---------- ATTENDANCE ----------
CREATE TABLE IF NOT EXISTS attendance_punches (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  punch_type  TEXT        NOT NULL CHECK (punch_type IN ('IN', 'OUT')),
  punched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_punches_user_time ON attendance_punches (user_id, punched_at DESC);

-- ---------- LEAVE ----------
CREATE TABLE IF NOT EXISTS leave_requests (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type   TEXT        NOT NULL,
  from_date    DATE        NOT NULL,
  to_date      DATE        NOT NULL,
  reason       TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  decided_by   INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  decided_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leave_user   ON leave_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests (status, created_at DESC);
`;

async function migrate({ retries = 30, delayMs = 1000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(SQL);
      console.log('[migrate] schema is up to date');
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `[migrate] attempt ${attempt}/${retries} failed: ${err.code || err.message}. Retrying in ${delayMs}ms…`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] giving up:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
