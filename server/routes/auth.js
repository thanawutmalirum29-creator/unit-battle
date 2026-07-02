// routes/auth.js — username + PIN, replaces the old "anyone can claim any username"
// identify flow for anything that touches money/bag/deck.
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { generateUniquePublicId } = require('../utils/publicId');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function validateUsername(u) {
  return typeof u === 'string' && u.trim().length >= 2 && u.trim().length <= 32;
}
function validatePin(p) {
  return typeof p === 'string' && /^[0-9]{4,8}$/.test(p);
}

// Picks a free "PlayerNNNN" username. Google accounts don't come with a game
// username, so we hand them a random one and let them rename it later from
// the account page — the player row's `username` column is still the single
// source of truth used everywhere else (leaderboard, deck, etc).
async function generateRandomUsername() {
  for (let i = 0; i < 10; i++) {
    const candidate = 'Player' + Math.floor(1000 + Math.random() * 9000);
    const existing = await pool.query(`SELECT id FROM players WHERE username = $1`, [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  return 'Player' + Date.now().toString().slice(-6); // astronomically unlikely fallback
}

// POST /api/auth/register { username, pin }
// Creates a new player with a hashed PIN. Fails if the username is already taken
// (use /login instead) — this is what stops someone else from claiming your name.
router.post('/register', asyncHandler(async (req, res) => {
  const username = (req.body?.username || '').trim();
  const pin = req.body?.pin;
  if (!validateUsername(username)) return res.status(400).json({ error: 'invalid username (2-32 chars)' });
  if (!validatePin(pin)) return res.status(400).json({ error: 'pin must be 4-8 digits' });

  const existing = await pool.query(`SELECT id FROM players WHERE username = $1`, [username]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'username already taken, use /login instead' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const token = uuid();
  const publicId = await generateUniquePublicId(pool);

  const { rows } = await pool.query(
    `INSERT INTO players (username, pin_hash, session_token, public_id) VALUES ($1, $2, $3, $4)
     RETURNING id, username, public_id, status`,
    [username, pinHash, token, publicId]
  );

  await pool.query(
    `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [rows[0].id]
  );

  res.json({ playerId: rows[0].id, username: rows[0].username, token, publicId: rows[0].public_id, status: rows[0].status });
}));

// POST /api/auth/login { username, pin }
router.post('/login', asyncHandler(async (req, res) => {
  const username = (req.body?.username || '').trim();
  const pin = req.body?.pin;
  if (!validateUsername(username) || !validatePin(pin)) {
    return res.status(400).json({ error: 'invalid username or pin' });
  }

  const { rows } = await pool.query(
    `SELECT id, pin_hash, public_id, status FROM players WHERE username = $1`,
    [username]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'no such player, register first' });
  if (!rows[0].pin_hash) return res.status(409).json({ error: 'this account has no pin set yet — contact admin' });

  const ok = await bcrypt.compare(pin, rows[0].pin_hash);
  if (!ok) return res.status(401).json({ error: 'wrong pin' });
  if (rows[0].status !== 'active') return res.status(403).json({ error: `account ${rows[0].status}` });

  const token = uuid();
  // self-heal: accounts created before the admin-console patch may not have a public_id yet
  let publicId = rows[0].public_id;
  if (!publicId) {
    publicId = await generateUniquePublicId(pool);
    await pool.query(`UPDATE players SET public_id = $1 WHERE id = $2`, [publicId, rows[0].id]);
  }
  await pool.query(`UPDATE players SET session_token = $2 WHERE id = $1`, [rows[0].id, token]);

  await pool.query(
    `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [rows[0].id]
  );

  res.json({ playerId: rows[0].id, username, token, publicId });
}));

// GET /api/auth/config — tells the frontend which Google client ID to use for
// the Sign-In button, so it isn't hardcoded into the static JS bundle.
router.get('/config', (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID || null });
});

// POST /api/auth/google { credential }
// `credential` is the ID token JWT that Google Identity Services hands back
// client-side after the user picks a Google account. We verify it server-side
// (signature + audience) so a forged token can't be used to log in as someone else.
router.post('/google', asyncHandler(async (req, res) => {
  if (!googleClient) return res.status(500).json({ error: 'google login is not configured on this server' });

  const credential = req.body?.credential;
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error: 'missing google credential' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'invalid google credential' });
  }

  const googleId = payload.sub;
  const token = uuid();

  const existing = await pool.query(`SELECT id, username, public_id, status FROM players WHERE google_id = $1`, [googleId]);

  if (existing.rows.length > 0) {
    if (existing.rows[0].status !== 'active') {
      return res.status(403).json({ error: `account ${existing.rows[0].status}` });
    }
    // Returning Google user — just refresh their session token.
    let publicId = existing.rows[0].public_id;
    if (!publicId) {
      publicId = await generateUniquePublicId(pool);
      await pool.query(`UPDATE players SET public_id = $1 WHERE id = $2`, [publicId, existing.rows[0].id]);
    }
    await pool.query(`UPDATE players SET session_token = $2 WHERE id = $1`, [existing.rows[0].id, token]);
    return res.json({
      playerId: existing.rows[0].id,
      username: existing.rows[0].username,
      token,
      publicId,
      isNewAccount: false,
    });
  }

  // First time this Google account has signed in — mint a random username.
  const username = await generateRandomUsername();
  const publicId = await generateUniquePublicId(pool);
  const { rows } = await pool.query(
    `INSERT INTO players (username, google_id, session_token, public_id) VALUES ($1, $2, $3, $4)
     RETURNING id, username, public_id`,
    [username, googleId, token, publicId]
  );

  await pool.query(
    `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [rows[0].id]
  );

  res.json({ playerId: rows[0].id, username: rows[0].username, token, publicId: rows[0].public_id, isNewAccount: true });
}));

// PATCH /api/auth/username { username } — rename your own account (works for
// PIN accounts and Google accounts alike). Requires a valid session.
router.patch('/username', requireAuth, asyncHandler(async (req, res) => {
  const username = (req.body?.username || '').trim();
  if (!validateUsername(username)) return res.status(400).json({ error: 'invalid username (2-32 chars)' });

  const existing = await pool.query(
    `SELECT id FROM players WHERE username = $1 AND id != $2`,
    [username, req.playerId]
  );
  if (existing.rows.length > 0) return res.status(409).json({ error: 'username already taken' });

  await pool.query(`UPDATE players SET username = $1 WHERE id = $2`, [username, req.playerId]);
  res.json({ username });
}));

// GET /api/auth/me — current session's public_id + status, for the account page.
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT username, public_id, status FROM players WHERE id = $1`,
    [req.playerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'player not found' });
  res.json({ username: rows[0].username, publicId: rows[0].public_id, status: rows[0].status });
}));

module.exports = router;