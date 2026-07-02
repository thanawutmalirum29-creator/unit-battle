// utils/publicId.js — the 15-char letters+digits ID shown on the account page
// and used by the admin console to look players up. Kept separate from the
// internal UUID `players.id` so nothing that already depends on that UUID
// (runs, leaderboard, economy, ...) has to change.
//
// Excludes visually-confusable characters (0/O, 1/I/l) so a player reading
// their ID off-screen to someone else (or an admin typing one in by hand)
// doesn't hit ambiguous characters.
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const ID_LENGTH = 15;

function randomPublicId() {
  let out = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    out += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return out;
}

// Generates a public_id guaranteed unique against the `players` table.
// `client` can be the pool or a checked-out client (works inside a transaction).
async function generateUniquePublicId(client) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomPublicId();
    const existing = await client.query(`SELECT 1 FROM players WHERE public_id = $1`, [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  // Astronomically unlikely with a 15-char, ~58-symbol alphabet — fall back to
  // a timestamp-suffixed id so account creation never hard-fails on collision.
  return randomPublicId().slice(0, 9) + Date.now().toString(36).slice(-6);
}

module.exports = { generateUniquePublicId, ID_LENGTH };
