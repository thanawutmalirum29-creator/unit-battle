// db/backfill-public-id.js — run once after migrate, only matters if you had
// players in the DB before the admin-console patch. New accounts already get
// a public_id at creation time (routes/auth.js, routes/players.js).
//
// Usage: node db/backfill-public-id.js   (or `railway run node db/backfill-public-id.js`)
const pool = require('./pool');
const { generateUniquePublicId } = require('../utils/publicId');

(async () => {
  const { rows } = await pool.query(`SELECT id FROM players WHERE public_id IS NULL`);
  console.log(`Backfilling public_id for ${rows.length} player(s)...`);
  for (const row of rows) {
    const publicId = await generateUniquePublicId(pool);
    await pool.query(`UPDATE players SET public_id = $1 WHERE id = $2`, [publicId, row.id]);
  }
  console.log('Backfill complete.');
  await pool.end();
})().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
