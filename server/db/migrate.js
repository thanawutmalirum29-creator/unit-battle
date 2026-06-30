// db/migrate.js — applies schema.sql to the database
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;'); // for gen_random_uuid()
  await pool.query(sql);
  console.log('Migration complete.');
  await pool.end();
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
