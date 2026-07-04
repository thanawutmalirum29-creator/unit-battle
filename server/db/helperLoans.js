// db/helperLoans.js — shared cleanup for expired helper-loan cards (see
// routes/helpers.js). A borrowed character lives inside player_economy.deck
// for exactly 12h; instead of a background cron job, we lazily sweep a
// player's own expired loans every time their deck is actually read (economy
// state, helper list) or they touch the helper system — cheap, and never
// leaves a stale card sitting around for long since /api/economy/state is
// read constantly by the client anyway.

// Core logic — assumes `client` is already inside a transaction the caller
// owns (so it can be safely combined with other locking in the same request,
// e.g. routes/helpers.js POST /borrow which re-locks the same row right after).
async function cleanupExpiredHelperLoansTx(client, playerId) {
  const { rows: expired } = await client.query(
    `SELECT id, borrowed_card_id FROM helper_loans
     WHERE borrower_id = $1 AND removed_at IS NULL AND expires_at <= now()`,
    [playerId]
  );
  if (expired.length === 0) return null;

  const idsToRemove = new Set(expired.map((r) => r.borrowed_card_id));
  const { rows: econRows } = await client.query(
    `SELECT deck, equip_bag FROM player_economy WHERE player_id = $1 FOR UPDATE`,
    [playerId]
  );
  if (econRows.length === 0) return null;

  const deck = Array.isArray(econRows[0].deck) ? econRows[0].deck : [];
  let equipBag = Array.isArray(econRows[0].equip_bag) ? econRows[0].equip_bag : [];

  // Any equipment the player attached to a borrowed card while it sat in
  // their deck goes back to their own equip_bag instead of vanishing along
  // with the card when the loan expires.
  for (const c of deck) {
    if (idsToRemove.has(c.id) && Array.isArray(c.equips) && c.equips.length) {
      equipBag = [...equipBag, ...c.equips];
    }
  }
  const newDeck = deck.filter((c) => !idsToRemove.has(c.id));

  await client.query(
    `UPDATE player_economy SET deck = $2, equip_bag = $3, updated_at = now() WHERE player_id = $1`,
    [playerId, JSON.stringify(newDeck), JSON.stringify(equipBag)]
  );
  await client.query(
    `UPDATE helper_loans SET removed_at = now() WHERE id = ANY($1::bigint[])`,
    [expired.map((r) => r.id)]
  );

  return { deck: newDeck, equipBag };
}

// Standalone version — opens its own short transaction. Use this from
// read-only endpoints (GET /api/economy/state, GET /api/helpers/friends)
// that don't already have a transaction client open.
async function cleanupExpiredHelperLoans(pool, playerId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await cleanupExpiredHelperLoansTx(client, playerId);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Round cap for borrowed cards — on top of the 12h time expiry above, a
// borrowed card can only be USED (put into a live battle round) for
// HELPER_LOAN_MAX_ROUNDS rounds total, counted cumulatively across every
// stage/run the borrower plays (never reset per stage). Borrowed cards are
// separately barred from INF mode client-side (see inf-mode.js) precisely
// because an INF run can run long enough that a card would hit this round
// cap (or its 12h expiry) mid-run, yanking a unit out from under a battle
// already in progress — so we don't even let it start there.
//
// The counter lives on the card object itself inside player_economy.deck
// (`roundsLeft`), same place `equips`/`locked` already live — no schema
// change needed. Each call decrements it by roundsUsed (normally 1, one call
// per battle round the card actually fought in) and removes the card once it
// hits zero, mirroring the time-expiry cleanup above (leftover equips go
// back to the bag, the loan row is closed out).
// ---------------------------------------------------------------------------
const HELPER_LOAN_MAX_ROUNDS = 20;

async function consumeHelperLoanRoundsTx(client, playerId, cardId, roundsUsed) {
  const { rows: econRows } = await client.query(
    `SELECT deck, equip_bag FROM player_economy WHERE player_id = $1 FOR UPDATE`,
    [playerId]
  );
  if (econRows.length === 0) return null;

  const deck = Array.isArray(econRows[0].deck) ? econRows[0].deck : [];
  let equipBag = Array.isArray(econRows[0].equip_bag) ? econRows[0].equip_bag : [];

  const card = deck.find((c) => c.id === cardId);
  // Not found, or not actually a borrowed card (already expired/removed, or
  // the id refers to a real owned card) — nothing to do.
  if (!card || !card.borrowed) return null;

  const currentLeft = Number.isFinite(card.roundsLeft) ? card.roundsLeft : HELPER_LOAN_MAX_ROUNDS;
  const newLeft = currentLeft - Math.max(1, Number(roundsUsed) || 1);

  if (newLeft > 0) {
    const newDeck = deck.map((c) => (c.id === cardId ? { ...c, roundsLeft: newLeft } : c));
    await client.query(
      `UPDATE player_economy SET deck = $2, updated_at = now() WHERE player_id = $1`,
      [playerId, JSON.stringify(newDeck)]
    );
    return { removed: false, roundsLeft: newLeft, deck: newDeck };
  }

  // Ran out of rounds — remove it, same treatment as time-based expiry: any
  // equips attached while it sat in the deck go back to the player's bag.
  if (Array.isArray(card.equips) && card.equips.length) {
    equipBag = [...equipBag, ...card.equips];
  }
  const newDeck = deck.filter((c) => c.id !== cardId);

  await client.query(
    `UPDATE player_economy SET deck = $2, equip_bag = $3, updated_at = now() WHERE player_id = $1`,
    [playerId, JSON.stringify(newDeck), JSON.stringify(equipBag)]
  );
  if (card.loanId) {
    await client.query(`UPDATE helper_loans SET removed_at = now() WHERE id = $1`, [card.loanId]);
  }

  return { removed: true, roundsLeft: 0, deck: newDeck, equipBag };
}

async function consumeHelperLoanRounds(pool, playerId, cardId, roundsUsed) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await consumeHelperLoanRoundsTx(client, playerId, cardId, roundsUsed);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  cleanupExpiredHelperLoansTx,
  cleanupExpiredHelperLoans,
  consumeHelperLoanRoundsTx,
  consumeHelperLoanRounds,
  HELPER_LOAN_MAX_ROUNDS,
};
