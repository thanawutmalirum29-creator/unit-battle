// routes/admin.js — the hidden admin console API.
// Not linked from anywhere in the game UI; reached only via /pages/admin-251029.html
// (see server.js for the /admin-251029 alias) which itself refuses to render anything
// until the correct code is entered. This endpoint set is intentionally separate from
// the player-facing routes (own auth scheme, own rate limiter) so a bug in one can't
// leak into the other.
//
// SECURITY NOTE FOR WHOEVER DEPLOYS THIS: a 6-digit numeric code is convenient but
// weak against sustained brute-forcing. It's rate-limited here, but for anything
// beyond small-scale/classroom use, set a longer ADMIN_CODE via env var and consider
// putting this route behind an extra layer (IP allowlist, Railway private networking,
// etc). See .env.example.
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Separate, much stricter limiter just for login attempts — this is the one
// endpoint an attacker could try to brute-force the code against.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many login attempts, try again later' },
});

const ADMIN_CODE = process.env.ADMIN_CODE || '251029';
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// In-memory admin sessions. Fine for a single Railway instance (this app doesn't
// run multiple instances); if that ever changes, swap this for a DB-backed table.
const sessions = new Map(); // token -> expiresAt

function cleanupSessions() {
  const now = Date.now();
  for (const [token, expiresAt] of sessions) {
    if (expiresAt < now) sessions.delete(token);
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const expiresAt = token && sessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    return res.status(401).json({ error: 'admin session invalid or expired, log in again' });
  }
  sessions.set(token, Date.now() + SESSION_TTL_MS); // sliding expiry
  next();
}

// Known bag currency keys (must match public/pages/account.html + client economy code).
const BAG_KEYS = [
  'memoryRare', 'memoryEpic', 'memoryLegendary', 'memoryMythical', 'memoryCosmic',
  'shardGray', 'shardBlue', 'shardPurple', 'shardGold', 'shardRed', 'shardSky',
];

// POST /api/admin/login { code }
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  cleanupSessions();
  const code = req.body?.code;
  // constant-time-ish compare to avoid trivial timing leaks on the code length/value
  const match = typeof code === 'string'
    && code.length === ADMIN_CODE.length
    && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(ADMIN_CODE));
  if (!match) return res.status(401).json({ error: 'wrong code' });

  const token = crypto.randomUUID();
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  res.json({ token });
}));

// POST /api/admin/logout
router.post('/logout', requireAdmin, (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.slice(7).trim();
  sessions.delete(token);
  res.json({ ok: true });
});

// GET /api/admin/players?q=search — list accounts, newest first.
router.get('/players', requireAdmin, asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const params = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = `WHERE p.username ILIKE $1 OR p.public_id ILIKE $1`;
  }
  const { rows } = await pool.query(
    `SELECT p.id, p.public_id, p.username, p.status, p.created_at,
            COALESCE(e.money, 0) AS money,
            COALESCE(jsonb_array_length(e.deck), 0) AS deck_count,
            COALESCE(jsonb_array_length(e.equip_bag), 0) AS equip_count
     FROM players p
     LEFT JOIN player_economy e ON e.player_id = p.id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT 300`,
    params
  );
  res.json(rows.map((r) => ({
    id: r.id,
    publicId: r.public_id,
    username: r.username,
    status: r.status,
    createdAt: r.created_at,
    money: Number(r.money),
    deckCount: r.deck_count,
    equipCount: r.equip_count,
  })));
}));

// GET /api/admin/players/:id — full detail (economy + bag) for one account.
router.get('/players/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.public_id, p.username, p.status, p.created_at,
            e.money, e.bag, e.deck, e.equip_bag
     FROM players p
     LEFT JOIN player_economy e ON e.player_id = p.id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'player not found' });
  const r = rows[0];
  res.json({
    id: r.id,
    publicId: r.public_id,
    username: r.username,
    status: r.status,
    createdAt: r.created_at,
    money: Number(r.money || 0),
    bag: r.bag || {},
    deckCount: Array.isArray(r.deck) ? r.deck.length : 0,
    equipCount: Array.isArray(r.equip_bag) ? r.equip_bag.length : 0,
  });
}));

// PATCH /api/admin/players/:id { username?, status? } — rename and/or change status.
router.patch('/players/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { username, status } = req.body || {};
  const updates = [];
  const params = [req.params.id];

  if (username !== undefined) {
    const trimmed = String(username).trim();
    if (trimmed.length < 2 || trimmed.length > 32) {
      return res.status(400).json({ error: 'username must be 2-32 characters' });
    }
    const clash = await pool.query(`SELECT id FROM players WHERE username = $1 AND id != $2`, [trimmed, req.params.id]);
    if (clash.rows.length > 0) return res.status(409).json({ error: 'username already taken' });
    params.push(trimmed);
    updates.push(`username = $${params.length}`);
  }
  if (status !== undefined) {
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    params.push(status);
    updates.push(`status = $${params.length}`);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'nothing to update' });

  const { rows } = await pool.query(
    `UPDATE players SET ${updates.join(', ')} WHERE id = $1 RETURNING id, public_id, username, status`,
    params
  );
  if (rows.length === 0) return res.status(404).json({ error: 'player not found' });
  res.json(rows[0]);
}));

// DELETE /api/admin/players/:id — permanently deletes the account and everything
// referencing it. Wrapped in a transaction; order matters because of FK constraints.
router.delete('/players/:id', requireAdmin, asyncHandler(async (req, res) => {
  const playerId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query(`SELECT id FROM players WHERE id = $1 FOR UPDATE`, [playerId]);
    if (exists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'player not found' });
    }

    await client.query(`DELETE FROM mailbox WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM shop_purchases WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM reward_claims WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM leaderboard_entries WHERE player_id = $1`, [playerId]);
    await client.query(
      `DELETE FROM run_stage_events WHERE run_id IN (SELECT id FROM runs WHERE player_id = $1)`,
      [playerId]
    );
    await client.query(`DELETE FROM runs WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM normal_progress WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM player_economy WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM players WHERE id = $1`, [playerId]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/admin/players/:id/mail { subject, body, money, bagKey, bagQty }
// Writes one mailbox row. Reward is optional (subject/body-only announcement mail
// is valid too).
router.post('/players/:id/mail', requireAdmin, asyncHandler(async (req, res) => {
  const { subject, body, money, bagKey, bagQty } = req.body || {};
  const trimmedSubject = String(subject || '').trim();
  if (!trimmedSubject) return res.status(400).json({ error: 'subject is required' });

  const moneyAmount = Number(money) || 0;
  if (moneyAmount < 0) return res.status(400).json({ error: 'money must be >= 0' });

  let resolvedBagKey = null;
  let resolvedBagQty = 0;
  if (bagKey) {
    if (!BAG_KEYS.includes(bagKey)) return res.status(400).json({ error: 'invalid bagKey' });
    resolvedBagQty = Number(bagQty) || 0;
    if (resolvedBagQty <= 0) return res.status(400).json({ error: 'bagQty must be > 0 when bagKey is set' });
    resolvedBagKey = bagKey;
  }

  const playerCheck = await pool.query(`SELECT id FROM players WHERE id = $1`, [req.params.id]);
  if (playerCheck.rows.length === 0) return res.status(404).json({ error: 'player not found' });

  const { rows } = await pool.query(
    `INSERT INTO mailbox (player_id, subject, body, reward_money, reward_bag_key, reward_bag_qty)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
    [req.params.id, trimmedSubject, String(body || '').trim(), moneyAmount, resolvedBagKey, resolvedBagQty]
  );
  res.json({ ok: true, mailId: rows[0].id, createdAt: rows[0].created_at });
}));

// GET /api/admin/bag-keys — lets the console render a dropdown without hardcoding it twice.
router.get('/bag-keys', requireAdmin, (req, res) => res.json(BAG_KEYS));

module.exports = router;
