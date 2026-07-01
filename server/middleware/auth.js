// middleware/auth.js — PIN-based session auth for economy endpoints.
// Money/bag/deck matter for real, so unlike the old free-form `identify` used for
// leaderboard names, anything that touches player_economy requires proof of the PIN.
const pool = require('../db/pool');

// Reads "Authorization: Bearer <token>", looks up the player it belongs to,
// and attaches req.playerId. 401s if missing/invalid.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'missing auth token' });

  try {
    const { rows } = await pool.query(
      `SELECT id FROM players WHERE session_token = $1`,
      [token]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'invalid or expired session' });
    req.playerId = rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
