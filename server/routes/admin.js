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
const { CHARACTER_DB } = require('../public/js/data/character-data.js');
const { EQUIP_GACHA_POOLS, SELL_PRICE_BY_RARITY } = require('../game-data/economy-data.js');

const router = express.Router();

// Flat, de-duplicated list of every equip template across both gacha pools —
// used only to populate the admin "send equipment" dropdown, keyed by name
// since that's unique within EQUIP_GACHA_POOLS.
function buildEquipCatalog() {
  const seen = new Map();
  for (const pool of Object.values(EQUIP_GACHA_POOLS)) {
    for (const item of pool.pool) {
      if (!seen.has(item.name)) seen.set(item.name, item);
    }
  }
  return [...seen.values()];
}
const EQUIP_CATALOG = buildEquipCatalog();

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
  'pvpMedal',
];

// Thai display labels for bag keys — used only in the reclaim mail body text below
// (the admin console itself shows the raw key, same as the gift-mail tab already did).
const BAG_LABELS = {
  memoryRare: 'ความทรงจำ Rare', memoryEpic: 'ความทรงจำ Epic',
  memoryLegendary: 'ความทรงจำ Legendary', memoryMythical: 'ความทรงจำ Mythical',
  memoryCosmic: 'ความทรงจำ Cosmic', shardGray: 'ชาร์ดเทา', shardBlue: 'ชาร์ดน้ำเงิน',
  shardPurple: 'ชาร์ดม่วง', shardGold: 'ชาร์ดทอง', shardRed: 'ชาร์ดแดง', shardSky: 'ชาร์ดฟ้า',
  pvpMedal: 'เหรียญสมรภูมิ',
};

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
    `SELECT p.id, p.public_id, p.username, p.status, p.status_reason, p.status_changed_at, p.suspended_until, p.created_at, p.is_guest,
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
    statusReason: r.status_reason,
    statusChangedAt: r.status_changed_at,
    suspendedUntil: r.suspended_until,
    createdAt: r.created_at,
    isGuest: r.is_guest,
    money: Number(r.money),
    deckCount: r.deck_count,
    equipCount: r.equip_count,
  })));
}));

// GET /api/admin/players/:id — full detail (economy + bag) for one account.
router.get('/players/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.public_id, p.username, p.status, p.status_reason, p.status_changed_at, p.suspended_until, p.created_at, p.is_guest,
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
    statusReason: r.status_reason,
    statusChangedAt: r.status_changed_at,
    suspendedUntil: r.suspended_until,
    createdAt: r.created_at,
    isGuest: r.is_guest,
    money: Number(r.money || 0),
    bag: r.bag || {},
    deck: Array.isArray(r.deck) ? r.deck : [],
    equipBag: Array.isArray(r.equip_bag) ? r.equip_bag : [],
  });
}));

// PATCH /api/admin/players/:id { username?, status?, reason?, days? } — rename
// and/or change status.
//   status: 'suspended' — days (positive integer, required) sets how long the
//           suspension lasts; reason (optional) is shown to the player. Lifted
//           automatically once the duration elapses (see db/accountStatus.js).
//   status: 'banned'    — reason (optional) shown to the player; permanent
//           until an admin sets status back to 'active' by hand.
//   status: 'active'    — reactivates the account and clears any previous
//           suspension/ban reason + dates.
router.patch('/players/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { username, status, reason, days } = req.body || {};
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

    const trimmedReason = reason ? String(reason).trim().slice(0, 500) : null;

    if (status === 'suspended') {
      const daysNum = Number(days);
      if (!Number.isInteger(daysNum) || daysNum <= 0 || daysNum > 3650) {
        return res.status(400).json({ error: 'days must be a positive whole number (how many days to suspend for)' });
      }
      params.push(trimmedReason);
      updates.push(`status_reason = $${params.length}`);
      params.push(new Date());
      updates.push(`status_changed_at = $${params.length}`);
      params.push(new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000));
      updates.push(`suspended_until = $${params.length}`);
    } else if (status === 'banned') {
      params.push(trimmedReason);
      updates.push(`status_reason = $${params.length}`);
      params.push(new Date());
      updates.push(`status_changed_at = $${params.length}`);
      updates.push(`suspended_until = NULL`);
    } else {
      // reactivating — clear out any previous suspension/ban detail
      updates.push(`status_reason = NULL`);
      updates.push(`status_changed_at = NULL`);
      updates.push(`suspended_until = NULL`);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'nothing to update' });

  const { rows } = await pool.query(
    `UPDATE players SET ${updates.join(', ')} WHERE id = $1
     RETURNING id, public_id, username, status, status_reason, status_changed_at, suspended_until`,
    params
  );
  if (rows.length === 0) return res.status(404).json({ error: 'player not found' });
  res.json({
    id: rows[0].id,
    publicId: rows[0].public_id,
    username: rows[0].username,
    status: rows[0].status,
    statusReason: rows[0].status_reason,
    statusChangedAt: rows[0].status_changed_at,
    suspendedUntil: rows[0].suspended_until,
  });
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

    // Guild membership needs special handling before the blanket deletes below,
    // since leaving a guild as the leader means transferring leadership (or
    // disbanding, if they're the sole member) rather than a plain row delete —
    // same rule POST /api/guilds/leave enforces for a player leaving themselves.
    const membership = await client.query(
      `SELECT guild_id, role FROM guild_members WHERE player_id = $1 FOR UPDATE`,
      [playerId]
    );
    if (membership.rows.length > 0) {
      const { guild_id: guildId, role } = membership.rows[0];
      if (role === 'leader') {
        const successor = await client.query(
          `SELECT player_id FROM guild_members
             WHERE guild_id = $1 AND player_id != $2
             ORDER BY (role = 'officer') DESC, contribution_lifetime DESC
             LIMIT 1`,
          [guildId, playerId]
        );
        if (successor.rows.length === 0) {
          // Sole member — disband the guild entirely.
          await client.query(`DELETE FROM guild_chat_messages WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guild_donations WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guild_shop_purchases WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guild_boss_attacks WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guild_boss_state WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guild_join_requests WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guild_invites WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guild_members WHERE guild_id = $1`, [guildId]);
          await client.query(`DELETE FROM guilds WHERE id = $1`, [guildId]);
        } else {
          const newLeaderId = successor.rows[0].player_id;
          await client.query(`UPDATE guild_members SET role = 'leader' WHERE player_id = $1`, [newLeaderId]);
          await client.query(`UPDATE guilds SET leader_id = $1 WHERE id = $2`, [newLeaderId, guildId]);
          await client.query(`DELETE FROM guild_members WHERE player_id = $1`, [playerId]);
        }
      } else {
        await client.query(`DELETE FROM guild_members WHERE player_id = $1`, [playerId]);
      }
    }
    await client.query(`DELETE FROM guild_join_requests WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM guild_invites WHERE inviter_id = $1 OR invitee_id = $1`, [playerId]);
    await client.query(`DELETE FROM guild_chat_messages WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM guild_donations WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM guild_shop_purchases WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM guild_boss_attacks WHERE player_id = $1`, [playerId]);

    await client.query(`DELETE FROM helper_loans WHERE borrower_id = $1 OR lender_id = $1`, [playerId]);
    await client.query(`DELETE FROM player_helpers WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1`, [playerId]);
    await client.query(`DELETE FROM friendships WHERE player_id = $1 OR friend_id = $1`, [playerId]);

    await client.query(`DELETE FROM pvp_battles WHERE attacker_id = $1 OR defender_id = $1`, [playerId]);
    await client.query(`DELETE FROM pvp_season_history WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM pvp_daily WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM pvp_defense WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM pvp_ratings WHERE player_id = $1`, [playerId]);

    await client.query(`DELETE FROM daily_mission_progress WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM daily_login_state WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM battle_sessions WHERE player_id = $1`, [playerId]);

    await client.query(`DELETE FROM mailbox WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM admin_reclaims WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM shop_purchases WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM reward_claims WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM leaderboard_entries WHERE player_id = $1`, [playerId]);
    await client.query(
      `DELETE FROM run_stage_events WHERE run_id IN (SELECT id FROM runs WHERE player_id = $1)`,
      [playerId]
    );
    await client.query(`DELETE FROM runs WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM normal_progress WHERE player_id = $1`, [playerId]);
    await client.query(`DELETE FROM inf_progress WHERE player_id = $1`, [playerId]);
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
  const { subject, body, money, bagKey, bagQty, cardName, equipName } = req.body || {};
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

  // Character gift — store the CHARACTER_DB template as-is; routes/mailbox.js mints
  // the actual deck entry (id/level/stars) only when the player claims it.
  let rewardCard = null;
  if (cardName) {
    const stats = CHARACTER_DB[cardName];
    if (!stats) return res.status(400).json({ error: 'unknown character name' });
    rewardCard = { name: cardName, ...stats };
  }

  // Equipment gift — same idea, template comes from EQUIP_CATALOG.
  let rewardEquip = null;
  if (equipName) {
    const template = EQUIP_CATALOG.find((e) => e.name === equipName);
    if (!template) return res.status(400).json({ error: 'unknown equip name' });
    rewardEquip = {
      name: template.name, type: template.type, stat: template.stat,
      rarity: template.rarity, mode: template.mode || 'flat', bonus: template.base,
    };
  }

  const playerCheck = await pool.query(`SELECT id FROM players WHERE id = $1`, [req.params.id]);
  if (playerCheck.rows.length === 0) return res.status(404).json({ error: 'player not found' });

  const { rows } = await pool.query(
    `INSERT INTO mailbox (player_id, subject, body, reward_money, reward_bag_key, reward_bag_qty, reward_card, reward_equip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
    [
      req.params.id, trimmedSubject, String(body || '').trim(), moneyAmount, resolvedBagKey, resolvedBagQty,
      rewardCard ? JSON.stringify(rewardCard) : null, rewardEquip ? JSON.stringify(rewardEquip) : null,
    ]
  );
  res.json({ ok: true, mailId: rows[0].id, createdAt: rows[0].created_at });
}));

// GET /api/admin/bag-keys — lets the console render a dropdown without hardcoding it twice.
router.get('/bag-keys', requireAdmin, (req, res) => res.json(BAG_KEYS));

// GET /api/admin/catalog — character + equipment templates for the "send character
// / send equipment" pickers in the admin console. Read-only, sourced from the same
// data files the game itself uses, so the list never drifts out of sync.
router.get('/catalog', requireAdmin, (req, res) => {
  const characters = Object.entries(CHARACTER_DB).map(([name, stats]) => ({ name, ...stats }));
  res.json({ characters, equips: EQUIP_CATALOG });
});

// GET /api/admin/players/:id/history — unified "รับของ" timeline: stage/boss/inf
// reward payouts, claimed mailbox rewards, and shop purchases, newest first. Each
// source table already exists for its own reason (anti-double-claim, shop lock,
// mailbox) — this just merges them into one read-only view for the console.
router.get('/players/:id/history', requireAdmin, asyncHandler(async (req, res) => {
  const playerId = req.params.id;
  const [rewardsRes, mailRes, shopRes] = await Promise.all([
    pool.query(
      `SELECT mode, stage, money_awarded, items_awarded, claimed_at
       FROM reward_claims WHERE player_id = $1 ORDER BY claimed_at DESC LIMIT 200`,
      [playerId]
    ),
    pool.query(
      `SELECT id, subject, reward_money, reward_bag_key, reward_bag_qty, reward_card, reward_equip, claimed_at
       FROM mailbox WHERE player_id = $1 AND claimed_at IS NOT NULL ORDER BY claimed_at DESC LIMIT 200`,
      [playerId]
    ),
    pool.query(
      `SELECT cycle, slot_index, price_paid, paid_with, shard_key, shard_qty, purchased_at
       FROM shop_purchases WHERE player_id = $1 ORDER BY purchased_at DESC LIMIT 200`,
      [playerId]
    ),
  ]);

  const events = [];
  for (const r of rewardsRes.rows) {
    events.push({
      type: 'reward', at: r.claimed_at,
      label: `ผ่านด่าน ${r.mode.toUpperCase()} สเตจ ${r.stage}`,
      money: Number(r.money_awarded), items: r.items_awarded || null,
    });
  }
  for (const r of mailRes.rows) {
    events.push({
      type: 'mail', at: r.claimed_at, mailId: r.id,
      label: `รับเมล: ${r.subject}`,
      money: Number(r.reward_money || 0),
      bagKey: r.reward_bag_key, bagQty: Number(r.reward_bag_qty || 0),
      card: r.reward_card || null, equip: r.reward_equip || null,
    });
  }
  for (const r of shopRes.rows) {
    events.push({
      type: 'shop', at: r.purchased_at,
      label: `ซื้อการ์ดจากร้าน (รอบ #${r.cycle} ช่อง ${r.slot_index + 1})`,
      pricePaid: Number(r.price_paid), paidWith: r.paid_with,
      shardKey: r.shard_key, shardQty: Number(r.shard_qty || 0),
    });
  }
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json(events.slice(0, 300));
}));

// GET /api/admin/players/:id/reclaims — admin_reclaims audit log for one player,
// newest first. Lets the console show "สิ่งไหนโดนดึงกลับไปแล้ว" for that account.
router.get('/players/:id/reclaims', requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, kind, label, qty_requested, qty_taken, went_negative, converted_to_money,
            money_deducted, note, mail_id, created_at
     FROM admin_reclaims WHERE player_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [req.params.id]
  );
  res.json(rows.map((r) => ({
    id: r.id, kind: r.kind, label: r.label,
    qtyRequested: Number(r.qty_requested), qtyTaken: Number(r.qty_taken),
    wentNegative: r.went_negative, convertedToMoney: r.converted_to_money,
    moneyDeducted: Number(r.money_deducted), note: r.note, mailId: r.mail_id,
    createdAt: r.created_at,
  })));
}));

// POST /api/admin/players/:id/reclaim { kind, ... , note? }
// Claws money / a bag currency / a character / a piece of equipment back off a
// player — e.g. to undo a cheat or a mail sent by mistake.
//
//   kind: 'money'  { amount }
//   kind: 'bag'    { bagKey, amount }
//   kind: 'card'   { cardName, qty? }   — matched by name against the player's
//                                          CURRENT deck; anything short of qty
//                                          (already sold/used) is billed as money
//   kind: 'equip'  { equipName, qty? }  — same idea against equip_bag. Equipment
//                                          currently equipped onto a card is left
//                                          alone (unequip first) and is treated
//                                          as "not available" for this purpose.
//
// money/bag reclaims are allowed to push the balance negative (a "debt") rather
// than silently reclaiming less than asked; see schema.sql for why that's safe.
router.post('/players/:id/reclaim', requireAdmin, asyncHandler(async (req, res) => {
  const playerId = req.params.id;
  const { kind, note } = req.body || {};
  if (!['money', 'bag', 'card', 'equip'].includes(kind)) {
    return res.status(400).json({ error: 'invalid kind' });
  }
  const trimmedNote = note ? String(note).trim().slice(0, 500) : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const playerRes = await client.query(`SELECT id FROM players WHERE id = $1 FOR UPDATE`, [playerId]);
    if (playerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'player not found' });
    }

    await client.query(`INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [playerId]);
    const econRes = await client.query(
      `SELECT money, bag, deck, equip_bag FROM player_economy WHERE player_id = $1 FOR UPDATE`,
      [playerId]
    );
    const econ = econRes.rows[0];

    let label, qtyRequested = 1, qtyTaken = 0, wentNegative = false, convertedToMoney = false, moneyDeducted = 0;
    let newMoney = Number(econ.money);
    const newBag = { ...(econ.bag || {}) };
    let newDeck = Array.isArray(econ.deck) ? [...econ.deck] : [];
    let newEquipBag = Array.isArray(econ.equip_bag) ? [...econ.equip_bag] : [];
    let mailBody;

    if (kind === 'money') {
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'amount must be a positive number' });
      }
      qtyRequested = amount;
      newMoney = Number(econ.money) - amount;
      wentNegative = newMoney < 0;
      label = `เงิน ${amount.toLocaleString()}`;
      mailBody = `บัญชีของคุณถูกเรียกคืนเงินจำนวน ${amount.toLocaleString()} โดยแอดมิน`
        + (wentNegative ? ` ยอดเงินตอนนี้ติดลบอยู่ ${Math.abs(newMoney).toLocaleString()} — ต้องเล่นหาเงินเพิ่มเพื่อให้ยอดกลับมาเป็นบวกก่อนถึงจะใช้จ่ายต่อได้` : '');

    } else if (kind === 'bag') {
      const bagKey = req.body?.bagKey;
      const amount = Number(req.body?.amount);
      if (!BAG_KEYS.includes(bagKey)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'invalid bagKey' }); }
      if (!Number.isFinite(amount) || amount <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'amount must be a positive number' }); }
      qtyRequested = amount;
      const have = Number(econ.bag?.[bagKey] || 0);
      const newQty = have - amount;
      newBag[bagKey] = newQty;
      wentNegative = newQty < 0;
      const bagLabel = BAG_LABELS[bagKey] || bagKey;
      label = `${bagLabel} × ${amount.toLocaleString()}`;
      mailBody = `${bagLabel} จำนวน ${amount.toLocaleString()} ถูกเรียกคืนโดยแอดมิน`
        + (wentNegative ? ` ยอดตอนนี้ติดลบอยู่ ${Math.abs(newQty).toLocaleString()} — ต้องเล่นฟาร์มเพิ่มเพื่อชดใช้ ใช้จ่ายเพิ่มไม่ได้จนกว่ายอดจะกลับมาเป็นบวก` : '');

    } else if (kind === 'card') {
      const cardName = String(req.body?.cardName || '').trim();
      const qty = Math.max(1, Math.floor(Number(req.body?.qty)) || 1);
      if (!cardName) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'cardName is required' }); }
      const stats = CHARACTER_DB[cardName];
      if (!stats) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'unknown character name' }); }
      qtyRequested = qty;

      let remaining = qty;
      const keep = [];
      for (const card of newDeck) {
        if (remaining > 0 && card.name === cardName) { remaining--; qtyTaken++; continue; }
        keep.push(card);
      }
      newDeck = keep;

      if (remaining > 0) {
        convertedToMoney = true;
        moneyDeducted = remaining * (SELL_PRICE_BY_RARITY[stats.rarity] || 5);
        newMoney = Number(econ.money) - moneyDeducted;
        wentNegative = newMoney < 0;
      }

      label = `${cardName}${qty > 1 ? ` × ${qty}` : ''}`;
      const parts = [];
      if (qtyTaken > 0) parts.push(`ริบออกจากกระเป๋าโดยตรง ${qtyTaken} ตัว`);
      if (convertedToMoney) parts.push(`อีก ${remaining} ตัว ถูกขาย/ใช้ไปแล้วก่อนหน้านี้ จึงหักเงินแทนเป็นจำนวน ${moneyDeducted.toLocaleString()}`);
      mailBody = `ตัวละคร "${cardName}" ${parts.join(' และ')} โดยแอดมิน`
        + (wentNegative ? ` ยอดเงินตอนนี้ติดลบอยู่ ${Math.abs(newMoney).toLocaleString()} — ต้องเล่นหาเงินเพิ่มเพื่อชดใช้` : '');

    } else if (kind === 'equip') {
      const equipName = String(req.body?.equipName || '').trim();
      const qty = Math.max(1, Math.floor(Number(req.body?.qty)) || 1);
      if (!equipName) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'equipName is required' }); }
      const template = EQUIP_CATALOG.find((e) => e.name === equipName);
      if (!template) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'unknown equip name' }); }
      qtyRequested = qty;

      let remaining = qty;
      const keep = [];
      for (const eq of newEquipBag) {
        if (remaining > 0 && eq.name === equipName) { remaining--; qtyTaken++; continue; }
        keep.push(eq);
      }
      newEquipBag = keep;

      if (remaining > 0) {
        convertedToMoney = true;
        moneyDeducted = remaining * (SELL_PRICE_BY_RARITY[template.rarity] || 5);
        newMoney = Number(econ.money) - moneyDeducted;
        wentNegative = newMoney < 0;
      }

      label = `${equipName}${qty > 1 ? ` × ${qty}` : ''}`;
      const parts = [];
      if (qtyTaken > 0) parts.push(`ริบออกจากกระเป๋าโดยตรง ${qtyTaken} ชิ้น`);
      if (convertedToMoney) parts.push(`อีก ${remaining} ชิ้น ถูกใช้/สวมใส่/หายไปจากกระเป๋าแล้ว จึงหักเงินแทนเป็นจำนวน ${moneyDeducted.toLocaleString()}`);
      mailBody = `อุปกรณ์ "${equipName}" ${parts.join(' และ')} โดยแอดมิน`
        + (wentNegative ? ` ยอดเงินตอนนี้ติดลบอยู่ ${Math.abs(newMoney).toLocaleString()} — ต้องเล่นหาเงินเพิ่มเพื่อชดใช้` : '');
    }

    await client.query(
      `UPDATE player_economy SET money = $2, bag = $3, deck = $4, equip_bag = $5, updated_at = now() WHERE player_id = $1`,
      [playerId, newMoney, JSON.stringify(newBag), JSON.stringify(newDeck), JSON.stringify(newEquipBag)]
    );

    // แจ้งผู้เล่นผ่านกล่องจดหมาย ว่าโดนเรียกคืนอะไรไปเท่าไหร่ — ไม่มีของรางวัลแนบ (reward_money=0
    // เสมอ) เพราะนี่คือการแจ้งเตือนหักของ ไม่ใช่เมลให้ของ
    const mailRes = await client.query(
      `INSERT INTO mailbox (player_id, subject, body, sent_by) VALUES ($1, $2, $3, 'admin-reclaim') RETURNING id`,
      [playerId, `⚠️ แอดมินเรียกคืน: ${label}`, trimmedNote ? `${mailBody}\n\nหมายเหตุจากแอดมิน: ${trimmedNote}` : mailBody]
    );

    const logRes = await client.query(
      `INSERT INTO admin_reclaims (player_id, kind, label, qty_requested, qty_taken, went_negative, converted_to_money, money_deducted, note, mail_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`,
      [playerId, kind, label, qtyRequested, qtyTaken, wentNegative, convertedToMoney, moneyDeducted, trimmedNote, mailRes.rows[0].id]
    );

    await client.query('COMMIT');
    res.json({
      ok: true,
      reclaimId: logRes.rows[0].id,
      createdAt: logRes.rows[0].created_at,
      kind, label, qtyRequested, qtyTaken, wentNegative, convertedToMoney, moneyDeducted,
      money: newMoney, bag: newBag, deck: newDeck, equipBag: newEquipBag,
      mailId: mailRes.rows[0].id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ============================================================================
// PvP Ranked Arena — season control. See routes/pvp.js for player-facing
// endpoints and game-data/pvp-data.js for tier/reward tuning. Nothing here
// auto-starts a season (the game isn't live yet) — an admin has to explicitly
// start the first one; every season after that rolls over automatically the
// moment its end date passes and a player hits any /api/pvp route (see
// ensureSeasonState in routes/pvp.js) — this console only needs to be used
// again to force-end a season early or to check on things.
// ============================================================================
const { rankInfo: pvpRankInfo } = require('../game-data/pvp-data.js');

// Same lazy "ensure a current season row exists" logic as routes/pvp.js, but
// WITHOUT the auto-rollover-on-expiry (that's intentionally left to the
// player-facing routes so this console can't silently roll a season over
// itself just by being viewed — an admin should trigger that on purpose).
async function ensureSeasonRowForAdmin() {
  const { rows } = await pool.query(
    `SELECT * FROM pvp_seasons WHERE status IN ('active','upcoming') ORDER BY season_number DESC LIMIT 1`
  );
  if (rows[0]) return rows[0];
  const ins = await pool.query(`INSERT INTO pvp_seasons (season_number, status) VALUES (1, 'upcoming') RETURNING *`);
  return ins.rows[0];
}

// GET /api/admin/pvp/season — current season status + top of the ladder.
router.get('/pvp/season', requireAdmin, asyncHandler(async (req, res) => {
  const season = await ensureSeasonRowForAdmin();
  let top = [];
  if (season.status === 'active') {
    const { rows } = await pool.query(
      `SELECT p.username, r.rating, r.wins, r.losses
       FROM pvp_ratings r JOIN players p ON p.id = r.player_id
       WHERE r.season_id = $1 ORDER BY r.rating DESC LIMIT 20`,
      [season.id]
    );
    top = rows.map((r, i) => ({ rank: i + 1, username: r.username, rating: r.rating, wins: r.wins, losses: r.losses, tier: pvpRankInfo(r.rating).label }));
  }
  res.json({ season, top });
}));

// POST /api/admin/pvp/season/start — starts the current 'upcoming' season now.
router.post('/pvp/season/start', requireAdmin, asyncHandler(async (req, res) => {
  const season = await ensureSeasonRowForAdmin();
  if (season.status !== 'upcoming') {
    return res.status(400).json({ error: `season ${season.season_number} is already '${season.status}'` });
  }
  const durationDays = Number(req.body?.durationDays) || season.duration_days;
  const { rows } = await pool.query(
    `UPDATE pvp_seasons SET status = 'active', duration_days = $2, starts_at = now(),
       ends_at = now() + ($2 || ' days')::interval WHERE id = $1 RETURNING *`,
    [season.id, durationDays]
  );
  res.json({ ok: true, season: rows[0] });
}));

// POST /api/admin/pvp/season/end — force-ends the active season immediately
// (distributes rewards + opens the next 'upcoming' season, same as a natural
// expiry would — see finalizeSeason in routes/pvp.js, duplicated here since
// the admin console intentionally doesn't import player-route internals).
router.post('/pvp/season/end', requireAdmin, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT * FROM pvp_seasons WHERE status = 'active' FOR UPDATE`);
    const season = rows[0];
    if (!season) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'no active season to end' });
    }

    const { rows: standings } = await client.query(
      `SELECT player_id, rating, wins, losses, RANK() OVER (ORDER BY rating DESC) AS final_rank
       FROM pvp_ratings WHERE season_id = $1`,
      [season.id]
    );
    const { seasonRewardFor: rewardFor, PVP_MEDAL_KEY: medalKey } = require('../game-data/pvp-data.js');
    for (const row of standings) {
      const tierKey = pvpRankInfo(row.rating).key;
      const reward = rewardFor(Number(row.final_rank), tierKey);
      const mailRes = await client.query(
        `INSERT INTO mailbox (player_id, subject, body, reward_money, reward_bag_key, reward_bag_qty, sent_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'system') RETURNING id`,
        [
          row.player_id, reward.subject,
          `จบซีซั่นที่ ${season.season_number} ด้วยอันดับ #${row.final_rank} (เรตติ้ง ${row.rating}) — ${row.wins} ชนะ / ${row.losses} แพ้`,
          reward.money, medalKey, reward.medals,
        ]
      );
      await client.query(
        `INSERT INTO pvp_season_history (season_id, player_id, final_rank, final_rating, tier_key, wins, losses, reward_mail_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (season_id, player_id) DO NOTHING`,
        [season.id, row.player_id, row.final_rank, row.rating, tierKey, row.wins, row.losses, mailRes.rows[0].id]
      );
      await client.query(`UPDATE players SET pvp_best_rating_lifetime = GREATEST(pvp_best_rating_lifetime, $2) WHERE id = $1`, [row.player_id, row.rating]);
    }
    await client.query(`UPDATE pvp_seasons SET status = 'ended', ended_at = now(), rewards_distributed_at = now() WHERE id = $1`, [season.id]);
    const nextRes = await client.query(
      `INSERT INTO pvp_seasons (season_number, status) VALUES ($1, 'upcoming') RETURNING *`,
      [season.season_number + 1]
    );

    await client.query('COMMIT');
    res.json({ ok: true, endedSeason: season.season_number, playersRewarded: standings.length, nextSeason: nextRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
