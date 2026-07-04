// routes/mailbox.js — player-facing mailbox (list / read / claim).
// Mail is written by the admin console (routes/admin.js); claiming a reward here
// credits player_economy the same transactional, row-locked way every other
// reward path in routes/economy.js does, so it can't be double-claimed.
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const router = express.Router();

function hasReward(row) {
  return Number(row.reward_money) > 0
    || (row.reward_bag_key && Number(row.reward_bag_qty) > 0)
    || !!row.reward_card
    || !!row.reward_equip;
}

// GET /api/mailbox — list, newest first. Lightweight: no body text, just enough
// to render the inbox list and an unread badge.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, subject, reward_money, reward_bag_key, reward_bag_qty, reward_card, reward_equip, created_at, read_at, claimed_at
     FROM mailbox WHERE player_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [req.playerId]
  );
  res.json(rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    hasReward: hasReward(r),
    createdAt: r.created_at,
    read: !!r.read_at,
    claimed: !!r.claimed_at,
  })));
}));

// GET /api/mailbox/:id — full mail detail, marks it read.
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const mailId = Number(req.params.id);
  if (!Number.isInteger(mailId)) return res.status(400).json({ error: 'invalid mail id' });

  const { rows } = await pool.query(
    `SELECT * FROM mailbox WHERE id = $1 AND player_id = $2`,
    [mailId, req.playerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'mail not found' });

  if (!rows[0].read_at) {
    await pool.query(`UPDATE mailbox SET read_at = now() WHERE id = $1`, [mailId]);
  }

  const r = rows[0];
  res.json({
    id: r.id,
    subject: r.subject,
    body: r.body,
    reward: hasReward(r) ? {
      money: Number(r.reward_money), bagKey: r.reward_bag_key, bagQty: Number(r.reward_bag_qty),
      card: r.reward_card || null, equip: r.reward_equip || null,
    } : null,
    createdAt: r.created_at,
    claimed: !!r.claimed_at,
  });
}));

// POST /api/mailbox/:id/claim — credit the attached reward (if any) to player_economy.
router.post('/:id/claim', requireAuth, asyncHandler(async (req, res) => {
  const mailId = Number(req.params.id);
  if (!Number.isInteger(mailId)) return res.status(400).json({ error: 'invalid mail id' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mailRes = await client.query(
      `SELECT * FROM mailbox WHERE id = $1 AND player_id = $2 FOR UPDATE`,
      [mailId, req.playerId]
    );
    if (mailRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'mail not found' });
    }
    const mail = mailRes.rows[0];
    if (mail.claimed_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'already claimed' });
    }

    await client.query(
      `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [req.playerId]
    );
    const econRes = await client.query(
      `SELECT money, bag, deck, equip_bag FROM player_economy WHERE player_id = $1 FOR UPDATE`,
      [req.playerId]
    );
    const econ = econRes.rows[0];

    const newMoney = Number(econ.money) + Number(mail.reward_money);
    const newBag = { ...econ.bag };
    if (mail.reward_bag_key && Number(mail.reward_bag_qty) > 0) {
      newBag[mail.reward_bag_key] = (newBag[mail.reward_bag_key] || 0) + Number(mail.reward_bag_qty);
    }

    // Character/equipment gifts are only turned into real deck/equip_bag entries
    // here, at claim time — same as every other reward path mints its own id
    // (see routes/economy.js), so an item never exists with a re-used/shared id.
    const newDeck = Array.isArray(econ.deck) ? [...econ.deck] : [];
    if (mail.reward_card) {
      newDeck.push({ ...mail.reward_card, id: uuid(), level: 1, stars: 1 });
    }
    const newEquipBag = Array.isArray(econ.equip_bag) ? [...econ.equip_bag] : [];
    if (mail.reward_equip) {
      newEquipBag.push({ ...mail.reward_equip, id: 'equip-' + uuid() });
    }

    await client.query(
      `UPDATE player_economy SET money = $2, bag = $3, deck = $4, equip_bag = $5, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newBag), JSON.stringify(newDeck), JSON.stringify(newEquipBag)]
    );
    await client.query(
      `UPDATE mailbox SET claimed_at = now(), read_at = COALESCE(read_at, now()) WHERE id = $1`,
      [mailId]
    );

    await client.query('COMMIT');
    res.json({ ok: true, money: newMoney, bag: newBag, deck: newDeck, equipBag: newEquipBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// DELETE /api/mailbox/:id — player deletes a mail from their own inbox.
// Purely a client-declutter action: rewards are already credited to
// player_economy at claim time (see /:id/claim above), so deleting the mail
// row here never touches money/bag/deck/equip_bag.
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const mailId = Number(req.params.id);
  if (!Number.isInteger(mailId)) return res.status(400).json({ error: 'invalid mail id' });

  const { rowCount } = await pool.query(
    `DELETE FROM mailbox WHERE id = $1 AND player_id = $2`,
    [mailId, req.playerId]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'mail not found' });
  res.json({ ok: true });
}));

module.exports = router;
