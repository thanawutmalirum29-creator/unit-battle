// routes/auth.js — username + PIN, replaces the old "anyone can claim any username"
// identify flow for anything that touches money/bag/deck.
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

function validateUsername(u) {
  return typeof u === 'string' && u.trim().length >= 2 && u.trim().length <= 32;
}
function validatePin(p) {
  return typeof p === 'string' && /^[0-9]{4,8}$/.test(p);
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

  const { rows } = await pool.query(
    `INSERT INTO players (username, pin_hash, session_token) VALUES ($1, $2, $3)
     RETURNING id, username`,
    [username, pinHash, token]
  );

  await pool.query(
    `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [rows[0].id]
  );

  res.json({ playerId: rows[0].id, username: rows[0].username, token });
}));

// POST /api/auth/login { username, pin }
router.post('/login', asyncHandler(async (req, res) => {
  const username = (req.body?.username || '').trim();
  const pin = req.body?.pin;
  if (!validateUsername(username) || !validatePin(pin)) {
    return res.status(400).json({ error: 'invalid username or pin' });
  }

  const { rows } = await pool.query(
    `SELECT id, pin_hash FROM players WHERE username = $1`,
    [username]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'no such player, register first' });
  if (!rows[0].pin_hash) return res.status(409).json({ error: 'this account has no pin set yet — contact admin' });

  const ok = await bcrypt.compare(pin, rows[0].pin_hash);
  if (!ok) return res.status(401).json({ error: 'wrong pin' });

  const token = uuid();
  await pool.query(`UPDATE players SET session_token = $2 WHERE id = $1`, [rows[0].id, token]);

  await pool.query(
    `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [rows[0].id]
  );

  res.json({ playerId: rows[0].id, username, token });
}));

module.exports = router;
