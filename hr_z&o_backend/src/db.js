'use strict';

const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'peopleflow'}:` +
  `${process.env.POSTGRES_PASSWORD || 'peopleflow'}@` +
  `${process.env.POSTGRES_HOST || 'postgres'}:` +
  `${process.env.POSTGRES_PORT || '5432'}/` +
  `${process.env.POSTGRES_DB || 'peopleflow'}`;

const pool = new Pool({
  connectionString,
  // Add SSL only when DATABASE_URL_SSL=true (e.g. managed Postgres in prod).
  ssl: process.env.DATABASE_URL_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected error on idle client', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
