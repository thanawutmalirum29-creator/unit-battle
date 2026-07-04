// routes/helpers.js — "ระบบขอความช่วยเหลือ" (friend/guildmate helper/assist
// character system).
//
// Each player can flag ONE card in their own deck as a lendable helper
// (POST /set). Any friend (GET /friends) OR fellow guild member (GET
// /guildmates) can see a live preview of exactly what that card currently is
// before asking for it, and requesting it (POST /borrow) instantly copies it
// into the requester's own deck for 12 hours — no accept/approve step
// needed, since the lender never loses anything by it. Asking the SAME
// person again is on a 24h cooldown from the moment the request button was
// pressed, tracked per (borrower, lender) pair regardless of whether they're
// friends, guildmates, or (later) not connected anymore — a different person
// can be asked right away. Expired copies are swept lazily — see
// db/helperLoans.js.
const express = require('express');
const { v4: uuid } = require('uuid');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const {
  cleanupExpiredHelperLoansTx,
  cleanupExpiredHelperLoans,
  consumeHelperLoanRounds,
  HELPER_LOAN_MAX_ROUNDS,
} = require('../db/helperLoans');

const router = express.Router();

const LOAN_DURATION_MS = 12 * 60 * 60 * 1000;   // how long a borrowed card stays in the deck
const COOLDOWN_MS = 24 * 60 * 60 * 1000;        // how long before you can ask the SAME friend again

async function getOrCreateEconomy(client, playerId) {
  await client.query(
    `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [playerId]
  );
  const { rows } = await client.query(
    `SELECT * FROM player_economy WHERE player_id = $1 FOR UPDATE`,
    [playerId]
  );
  return rows[0];
}

// Small, safe preview shape — never leaks the lender's internal card id or
// equips, just what a borrower would actually be getting.
function previewCard(card) {
  if (!card) return null;
  return {
    name: card.name,
    rarity: card.rarity,
    atk: card.atk,
    hp: card.hp,
    def: card.def,
    skill: card.skill,
    level: card.level,
    stars: card.stars,
  };
}

// ---------------------------------------------------------------------------
// GET /api/helpers/mine — what I currently have set as MY lendable helper.
// ---------------------------------------------------------------------------
router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT card_id FROM player_helpers WHERE player_id = $1`, [req.playerId]);
  if (rows.length === 0) return res.json({ cardId: null, card: null });

  const cardId = rows[0].card_id;
  const econ = await pool.query(`SELECT deck FROM player_economy WHERE player_id = $1`, [req.playerId]);
  const deck = Array.isArray(econ.rows[0]?.deck) ? econ.rows[0].deck : [];
  const card = deck.find((c) => c.id === cardId);

  if (!card) {
    // stale — the card was sold/consumed since being set. Self-heal so the
    // friends list doesn't keep advertising something that no longer exists.
    await pool.query(`DELETE FROM player_helpers WHERE player_id = $1`, [req.playerId]);
    return res.json({ cardId: null, card: null });
  }

  res.json({ cardId, card: previewCard(card) });
}));

// ---------------------------------------------------------------------------
// POST /api/helpers/set { cardId } — designate one of my own deck cards as
// my helper. Replaces whatever was set before.
// ---------------------------------------------------------------------------
router.post('/set', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  if (!cardId || typeof cardId !== 'string') return res.status(400).json({ error: 'missing cardId' });

  const econ = await pool.query(`SELECT deck FROM player_economy WHERE player_id = $1`, [req.playerId]);
  const deck = Array.isArray(econ.rows[0]?.deck) ? econ.rows[0].deck : [];
  const card = deck.find((c) => c.id === cardId);
  if (!card) return res.status(404).json({ error: 'card not found in your deck' });
  if (card.borrowed) {
    return res.status(400).json({ error: 'การ์ดที่ยืมมาจากเพื่อนไม่สามารถตั้งเป็นตัวช่วยเหลือต่อได้' });
  }

  await pool.query(
    `INSERT INTO player_helpers (player_id, card_id) VALUES ($1, $2)
     ON CONFLICT (player_id) DO UPDATE SET card_id = EXCLUDED.card_id, updated_at = now()`,
    [req.playerId, cardId]
  );

  res.json({ ok: true, cardId, card: previewCard(card) });
}));

// ---------------------------------------------------------------------------
// DELETE /api/helpers/mine — stop lending out a helper.
// ---------------------------------------------------------------------------
router.delete('/mine', requireAuth, asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM player_helpers WHERE player_id = $1`, [req.playerId]);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Shared shaping step for GET /friends and GET /guildmates — takes candidate
// rows (each { id, username, public_id, card_id, deck }) and attaches each
// one's helper preview plus my cooldown/active-loan status with them. Kept
// in one place since the loan-cooldown math is identical no matter whether
// the candidate is a friend or a guildmate — only the SQL that produces the
// candidate list differs between the two routes.
// ---------------------------------------------------------------------------
async function attachHelperStatus(playerId, candidates) {
  if (candidates.length === 0) return [];

  const candidateIds = candidates.map((c) => c.id);
  const { rows: loanRows } = await pool.query(
    `SELECT DISTINCT ON (lender_id) lender_id, granted_at, expires_at, removed_at
     FROM helper_loans
     WHERE borrower_id = $1 AND lender_id = ANY($2::uuid[])
     ORDER BY lender_id, granted_at DESC`,
    [playerId, candidateIds]
  );
  const lastLoanByLender = new Map(loanRows.map((r) => [r.lender_id, r]));

  const now = Date.now();
  return candidates.map((f) => {
    const deck = Array.isArray(f.deck) ? f.deck : [];
    const card = f.card_id ? deck.find((c) => c.id === f.card_id) : null;

    const lastLoan = lastLoanByLender.get(f.id);
    let cooldownEndsAt = null;
    let activeLoan = null;
    if (lastLoan) {
      const grantedAt = new Date(lastLoan.granted_at).getTime();
      const cd = grantedAt + COOLDOWN_MS;
      if (cd > now) cooldownEndsAt = new Date(cd).toISOString();

      const expiresAt = new Date(lastLoan.expires_at).getTime();
      if (!lastLoan.removed_at && expiresAt > now) {
        activeLoan = { expiresAt: new Date(expiresAt).toISOString() };
      }
    }

    return {
      friendId: f.id,
      username: f.username,
      publicId: f.public_id,
      helper: card ? previewCard(card) : null,
      canRequest: !!card && !cooldownEndsAt,
      cooldownEndsAt,
      activeLoan,
    };
  });
}

// ---------------------------------------------------------------------------
// GET /api/helpers/friends — for every friend: their helper preview (if any),
// whether I can request it right now, and when my cooldown/active loan (if
// any) with them ends. This is what the "ขอความช่วยเหลือ" panel renders.
// ---------------------------------------------------------------------------
router.get('/friends', requireAuth, asyncHandler(async (req, res) => {
  // sweep my own expired borrowed cards first so "activeLoan" below is accurate
  await cleanupExpiredHelperLoans(pool, req.playerId);

  const { rows: friends } = await pool.query(
    `SELECT p.id, p.username, p.public_id, ph.card_id, pe.deck
     FROM friendships f
     JOIN players p ON p.id = f.friend_id
     LEFT JOIN player_helpers ph ON ph.player_id = f.friend_id
     LEFT JOIN player_economy pe ON pe.player_id = f.friend_id
     WHERE f.player_id = $1
     ORDER BY p.username ASC`,
    [req.playerId]
  );

  res.json(await attachHelperStatus(req.playerId, friends));
}));

// ---------------------------------------------------------------------------
// GET /api/helpers/guildmates — same idea as GET /friends, but sourced from
// my current guild roster instead of my friends list. Anyone already shown
// in the friends panel is excluded here so the same person doesn't appear
// twice across the two lists. Empty array if I'm not in a guild.
// ---------------------------------------------------------------------------
router.get('/guildmates', requireAuth, asyncHandler(async (req, res) => {
  await cleanupExpiredHelperLoans(pool, req.playerId);

  const { rows: membership } = await pool.query(
    `SELECT guild_id FROM guild_members WHERE player_id = $1`,
    [req.playerId]
  );
  if (membership.length === 0) return res.json([]);

  const { rows: guildmates } = await pool.query(
    `SELECT p.id, p.username, p.public_id, ph.card_id, pe.deck
     FROM guild_members gm
     JOIN players p ON p.id = gm.player_id
     LEFT JOIN player_helpers ph ON ph.player_id = gm.player_id
     LEFT JOIN player_economy pe ON pe.player_id = gm.player_id
     WHERE gm.guild_id = $1
       AND gm.player_id != $2
       AND NOT EXISTS (
         SELECT 1 FROM friendships f WHERE f.player_id = $2 AND f.friend_id = gm.player_id
       )
     ORDER BY p.username ASC`,
    [membership[0].guild_id, req.playerId]
  );

  res.json(await attachHelperStatus(req.playerId, guildmates));
}));

// ---------------------------------------------------------------------------
// POST /api/helpers/borrow { lenderId } — ask a friend for their helper.
// Instant grant (no approval step): a copy of the friend's current helper
// card lands in my own deck right away, tagged `borrowed: true`, and expires
// in 12h. Equipment is NOT copied along with it.
// ---------------------------------------------------------------------------
router.post('/borrow', requireAuth, asyncHandler(async (req, res) => {
  const lenderId = req.body?.lenderId;
  if (!lenderId || typeof lenderId !== 'string') return res.status(400).json({ error: 'missing lenderId' });
  if (lenderId === req.playerId) return res.status(400).json({ error: 'cannot request help from yourself' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // clear anything of mine that already expired before doing anything else
    await cleanupExpiredHelperLoansTx(client, req.playerId);

    // Allowed if we're friends OR we're in the same guild together — either
    // relationship is enough, checked in one query so the borrow logic below
    // doesn't need to care which one applies.
    const friendCheck = await client.query(
      `SELECT 1 FROM friendships WHERE player_id = $1 AND friend_id = $2
       UNION
       SELECT 1 FROM guild_members gm1
       JOIN guild_members gm2 ON gm2.guild_id = gm1.guild_id
       WHERE gm1.player_id = $1 AND gm2.player_id = $2`,
      [req.playerId, lenderId]
    );
    if (friendCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'ต้องเป็นเพื่อนหรืออยู่กิลด์เดียวกันก่อนถึงจะขอความช่วยเหลือได้' });
    }

    // 24h cooldown, keyed per (borrower, lender) pair, counted from the last
    // time the request button was actually pressed for this friend.
    const { rows: lastLoanRows } = await client.query(
      `SELECT granted_at FROM helper_loans WHERE borrower_id = $1 AND lender_id = $2
       ORDER BY granted_at DESC LIMIT 1`,
      [req.playerId, lenderId]
    );
    if (lastLoanRows.length > 0) {
      const cooldownEndsAt = new Date(lastLoanRows[0].granted_at).getTime() + COOLDOWN_MS;
      if (cooldownEndsAt > Date.now()) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          error: 'ยังอยู่ในช่วงคูลดาวน์ ขอความช่วยเหลือจากเพื่อนคนนี้ได้อีกครั้งหลังผ่านไป 24 ชม.',
          cooldownEndsAt: new Date(cooldownEndsAt).toISOString(),
        });
      }
    }

    const helperRow = await client.query(`SELECT card_id FROM player_helpers WHERE player_id = $1`, [lenderId]);
    if (helperRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'เพื่อนคนนี้ยังไม่ได้ตั้งตัวละครช่วยเหลือไว้' });
    }

    const lenderEcon = await client.query(`SELECT deck FROM player_economy WHERE player_id = $1`, [lenderId]);
    const lenderDeck = Array.isArray(lenderEcon.rows[0]?.deck) ? lenderEcon.rows[0].deck : [];
    const sourceCard = lenderDeck.find((c) => c.id === helperRow.rows[0].card_id);

    if (!sourceCard || sourceCard.borrowed) {
      // stale reference (sold/consumed since being set) — self-heal
      await client.query(`DELETE FROM player_helpers WHERE player_id = $1`, [lenderId]);
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ตัวละครช่วยเหลือของเพื่อนคนนี้ไม่พร้อมใช้งานแล้ว' });
    }

    const lenderNameRows = await client.query(`SELECT username FROM players WHERE id = $1`, [lenderId]);
    const lenderName = lenderNameRows.rows[0]?.username || 'เพื่อน';

    const econ = await getOrCreateEconomy(client, req.playerId);
    if (econ.deck.length >= 100) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'เด็คของคุณเต็มแล้ว (100 ตัว) ขายหรือเคลียร์การ์ดก่อนขอความช่วยเหลือ' });
    }

    const newCardId = uuid();
    const grantedAt = new Date();
    const expiresAt = new Date(grantedAt.getTime() + LOAN_DURATION_MS);

    const loanInsert = await client.query(
      `INSERT INTO helper_loans (borrower_id, lender_id, borrowed_card_id, card_name, granted_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.playerId, lenderId, newCardId, sourceCard.name, grantedAt.toISOString(), expiresAt.toISOString()]
    );

    // Snapshot the friend's card as it is right now. equips are deliberately
    // NOT copied over — only the base card — so the lender's own gear can
    // never be duplicated onto the borrower's temporary copy.
    const newCard = {
      ...sourceCard,
      id: newCardId,
      equips: [],
      locked: false,
      borrowed: true,
      lenderId,
      lenderName,
      loanId: loanInsert.rows[0].id,
      grantedAt: grantedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      // Usable for HELPER_LOAN_MAX_ROUNDS battle rounds total, counted across
      // every stage the borrower plays (see db/helperLoans.js
      // consumeHelperLoanRounds) — independent of, and usually hit well
      // before, the 12h time expiry above.
      roundsLeft: HELPER_LOAN_MAX_ROUNDS,
    };

    const newDeck = [...econ.deck, newCard];
    await client.query(
      `UPDATE player_economy SET deck = $2, updated_at = now() WHERE player_id = $1`,
      [req.playerId, JSON.stringify(newDeck)]
    );

    await client.query('COMMIT');
    res.json({
      ok: true,
      card: newCard,
      deck: newDeck,
      expiresAt: expiresAt.toISOString(),
      cooldownEndsAt: new Date(grantedAt.getTime() + COOLDOWN_MS).toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/helpers/consume-round { cardId, rounds? } — call once per battle
// round a borrowed card actually fought in (any mode except INF — borrowed
// cards can't be selected there in the first place, see inf-mode.js). Counts
// cumulatively across every stage/run, independent of the 12h time expiry.
// Card is auto-removed (equips returned to bag, loan closed) once its
// HELPER_LOAN_MAX_ROUNDS budget hits zero.
// ---------------------------------------------------------------------------
router.post('/consume-round', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  const rounds = req.body?.rounds;
  if (!cardId || typeof cardId !== 'string') return res.status(400).json({ error: 'missing cardId' });

  const result = await consumeHelperLoanRounds(pool, req.playerId, cardId, rounds);
  if (!result) return res.status(404).json({ error: 'borrowed card not found' });

  res.json({ ok: true, removed: result.removed, roundsLeft: result.roundsLeft, deck: result.deck });
}));

module.exports = router;
