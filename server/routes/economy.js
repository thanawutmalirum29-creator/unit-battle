// routes/economy.js — server-authoritative money/bag/deck.
// Every endpoint here either reads player_economy or mutates it inside a single
// transaction with a row lock, so two concurrent requests (double-tap, client retry)
// can't double-spend or double-pay the same player.
const express = require('express');
const { v4: uuid } = require('uuid');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const {
  STAGE_DROPS, STAGE_REWARDS, MIN_MS_PER_NORMAL_CLAIM,
  SHOP_REFRESH_INTERVAL_MS, currentShopCycle, generateShopDeck,
  GACHA_POOLS, rollGachaOnce,
  EQUIP_GACHA_POOLS, rollEquipGachaOnce, equipGachaCost,
  MAX_INF_STAGE, infStageReward, infShardDrop,
  BOSS_MAX_DPS, rewardForTier, rollRange,
  UPGRADE_SHARD_KEY_BY_RARITY, UPGRADE_SHARDS_NEEDED, UPGRADE_MAX_LEVEL,
  UPGRADE_DUPLICATE_COST_BY_RARITY, calcUpgradeCost, calcSuccessRate, applyLevelGrowth,
  calcSellPrice,
} = require('../game-data/economy-data');

const router = express.Router();

function mergeBag(bag, delta) {
  const next = { ...bag };
  for (const [k, v] of Object.entries(delta)) next[k] = (next[k] || 0) + v;
  return next;
}

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

// ---------------------------------------------------------------------------
// GET /api/economy/state — current money/bag/deck
// ---------------------------------------------------------------------------
router.get('/state', requireAuth, asyncHandler(async (req, res) => {
  await pool.query(`INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [req.playerId]);
  const { rows } = await pool.query(`SELECT money, bag, deck, equip_bag FROM player_economy WHERE player_id = $1`, [req.playerId]);
  res.json({ ...rows[0], money: Number(rows[0].money) });
}));

// ---------------------------------------------------------------------------
// POST /api/economy/claim/normal { stage }
// NORMAL mode is farmable (any unlocked stage, repeatedly), so instead of "claim once"
// we rate-limit claims per player using the same MIN_MS_PER_STAGE idea already used
// for run anti-cheat, and require the stage to be <= the player's server-recorded
// normal_progress.max_stage (so you can't claim rewards for stages you haven't beaten).
// ---------------------------------------------------------------------------
router.post('/claim/normal', requireAuth, asyncHandler(async (req, res) => {
  const stage = Number(req.body?.stage);
  if (!Number.isInteger(stage) || stage < 1) return res.status(400).json({ error: 'invalid stage' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const progress = await client.query(`SELECT max_stage FROM normal_progress WHERE player_id = $1`, [req.playerId]);
    const maxStage = progress.rows[0]?.max_stage ?? 0;
    if (stage > maxStage) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `stage ${stage} not unlocked yet (max cleared: ${maxStage})` });
    }

    const econ = await getOrCreateEconomy(client, req.playerId);
    const now = Date.now();
    const last = econ.last_normal_claim_at ? new Date(econ.last_normal_claim_at).getTime() : 0;
    if (now - last < MIN_MS_PER_NORMAL_CLAIM) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: 'claiming too fast' });
    }

    const moneyGain = STAGE_REWARDS[stage] || 0;
    const drops = STAGE_DROPS[stage] || {};
    const newMoney = Number(econ.money) + moneyGain;
    const newBag = mergeBag(econ.bag, drops);

    await client.query(
      `UPDATE player_economy SET money = $2, bag = $3, last_normal_claim_at = now(), updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, moneyGain, drops, money: newMoney, bag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/economy/claim/inf { runId, stage }
// Only pays out for a stage that /api/runs/:runId/stage-clear already validated and
// recorded (run_stage_events), and only once per (run, stage) — reward_claims has a
// UNIQUE(run_id, stage) constraint that makes the second attempt a no-op-safe 409.
// ---------------------------------------------------------------------------
router.post('/claim/inf', requireAuth, asyncHandler(async (req, res) => {
  const { runId } = req.body || {};
  const stage = Number(req.body?.stage);
  if (!runId || !Number.isInteger(stage)) return res.status(400).json({ error: 'invalid input' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const runRes = await client.query(`SELECT * FROM runs WHERE id = $1 AND player_id = $2 FOR UPDATE`, [runId, req.playerId]);
    const run = runRes.rows[0];
    if (!run || run.mode !== 'inf') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'run not found for this player' });
    }

    const eventRes = await client.query(
      `SELECT 1 FROM run_stage_events WHERE run_id = $1 AND stage = $2`,
      [runId, stage]
    );
    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'stage clear not recorded for this run yet' });
    }

    const moneyGain = infStageReward(Math.min(stage, MAX_INF_STAGE));
    const drops = infShardDrop(Math.min(stage, MAX_INF_STAGE));

    let claimRes;
    try {
      claimRes = await client.query(
        `INSERT INTO reward_claims (player_id, run_id, mode, stage, money_awarded, items_awarded)
         VALUES ($1, $2, 'inf', $3, $4, $5) RETURNING id`,
        [req.playerId, runId, stage, moneyGain, JSON.stringify(drops)]
      );
    } catch (e) {
      if (e.code === '23505') { // unique_violation — already claimed
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'already claimed' });
      }
      throw e;
    }

    const econ = await getOrCreateEconomy(client, req.playerId);
    const newMoney = Number(econ.money) + moneyGain;
    const newBag = mergeBag(econ.bag, drops);
    await client.query(
      `UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, moneyGain, drops, money: newMoney, bag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Boss mode — was not server-tracked at all before. Reusing the runs table (mode='boss').
// ---------------------------------------------------------------------------

// POST /api/economy/boss/start { bossId }
router.post('/boss/start', requireAuth, asyncHandler(async (req, res) => {
  const bossId = req.body?.bossId;
  if (typeof bossId !== 'string' || !bossId) return res.status(400).json({ error: 'invalid bossId' });

  const token = uuid();
  const { rows } = await pool.query(
    `INSERT INTO runs (player_id, mode, token, boss_id) VALUES ($1, 'boss', $2, $3) RETURNING id, started_at`,
    [req.playerId, token, bossId]
  );
  res.json({ runId: rows[0].id, token, startedAt: rows[0].started_at });
}));

// POST /api/economy/boss/claim-tier { runId, token, tierIndex, damageDone }
// Boss fights hand out a reward every time a damage threshold is crossed (not just once
// at the end), so this mirrors that: one claim per tier, tiers must be claimed in order,
// and each tier can only be paid once (reward_claims UNIQUE(run_id, stage) — stage here
// is the tier index). Reward amount always comes from BOSS_REWARD_TIERS on the server.
router.post('/boss/claim-tier', requireAuth, asyncHandler(async (req, res) => {
  const { runId, token } = req.body || {};
  const tierIndex = Number(req.body?.tierIndex);
  const damageDone = Number(req.body?.damageDone);
  if (!runId || !token || !Number.isInteger(tierIndex) || tierIndex < 0 || !Number.isFinite(damageDone) || damageDone < 0) {
    return res.status(400).json({ error: 'invalid input' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const runRes = await client.query(
      `SELECT * FROM runs WHERE id = $1 AND player_id = $2 FOR UPDATE`,
      [runId, req.playerId]
    );
    const run = runRes.rows[0];
    if (!run || run.mode !== 'boss' || run.token !== token) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'invalid run/token' });
    }
    if (run.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `run already ${run.status}` });
    }

    const tiers = require('../game-data/economy-data').BOSS_REWARD_TIERS[run.boss_id];
    if (!tiers || !tiers[tierIndex]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid tier for this boss' });
    }
    // tiers must be claimed strictly in order — run.max_stage doubles as "highest tier claimed"
    if (tierIndex !== run.max_stage) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `tier out of order: expected ${run.max_stage}, got ${tierIndex}` });
    }

    const tier = tiers[tierIndex];
    if (damageDone < tier.dmg) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'reported damage below this tier threshold' });
    }
    const elapsedMs = Date.now() - new Date(run.started_at).getTime();
    if (damageDone > BOSS_MAX_DPS * (elapsedMs / 1000)) {
      await client.query(`UPDATE runs SET status = 'flagged', flag_reason = 'damage exceeds plausible DPS' WHERE id = $1`, [runId]);
      await client.query('COMMIT');
      return res.status(400).json({ error: 'damage exceeds plausible rate — flagged, not paid' });
    }

    const moneyGain = rollRange(tier.money);
    const drops = {};
    if (tier.items) for (const [k, range] of Object.entries(tier.items)) drops[k] = rollRange(range);

    try {
      await client.query(
        `INSERT INTO reward_claims (player_id, run_id, mode, stage, money_awarded, items_awarded)
         VALUES ($1, $2, 'boss', $3, $4, $5)`,
        [req.playerId, runId, tierIndex, moneyGain, JSON.stringify(drops)]
      );
    } catch (e) {
      if (e.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'tier already claimed' });
      }
      throw e;
    }

    await client.query(`UPDATE runs SET max_stage = $2 WHERE id = $1`, [runId, tierIndex + 1]);

    const econ = await getOrCreateEconomy(client, req.playerId);
    const newMoney = Number(econ.money) + moneyGain;
    const newBag = mergeBag(econ.bag, drops);
    await client.query(
      `UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, moneyGain, drops, money: newMoney, bag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/economy/boss/finish { runId, token } — call when the fight ends (win/lose/leave)
router.post('/boss/finish', requireAuth, asyncHandler(async (req, res) => {
  const { runId, token } = req.body || {};
  if (!runId || !token) return res.status(400).json({ error: 'invalid input' });
  const { rows } = await pool.query(
    `UPDATE runs SET status = 'finished', finished_at = now()
     WHERE id = $1 AND player_id = $2 AND token = $3 AND status = 'active' RETURNING id`,
    [runId, req.playerId, token]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'run not found or already finished' });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Shop — server owns the lineup (one shared lineup per time-cycle, in shop_cycles)
// and the prices. Client no longer generates or prices the shop itself.
// ---------------------------------------------------------------------------

async function ensureShopCycle() {
  const cycle = currentShopCycle();
  const existing = await pool.query(`SELECT cards FROM shop_cycles WHERE cycle = $1`, [cycle]);
  if (existing.rows.length > 0) return { cycle, cards: existing.rows[0].cards };

  const cards = generateShopDeck();
  await pool.query(
    `INSERT INTO shop_cycles (cycle, cards) VALUES ($1, $2) ON CONFLICT (cycle) DO NOTHING`,
    [cycle, JSON.stringify(cards)]
  );
  const row = await pool.query(`SELECT cards FROM shop_cycles WHERE cycle = $1`, [cycle]);
  return { cycle, cards: row.rows[0].cards };
}

// GET /api/economy/shop/current — public (no auth), just shows the shared lineup + real prices
router.get('/shop/current', asyncHandler(async (req, res) => {
  const { cycle, cards } = await ensureShopCycle();
  res.json({ cycle, cards, refreshMs: SHOP_REFRESH_INTERVAL_MS, nextRefreshAt: (cycle + 1) * SHOP_REFRESH_INTERVAL_MS });
}));

// POST /api/economy/shop/buy { slotIndex }
router.post('/shop/buy', requireAuth, asyncHandler(async (req, res) => {
  const slotIndex = Number(req.body?.slotIndex);
  if (!Number.isInteger(slotIndex)) return res.status(400).json({ error: 'invalid slotIndex' });

  const { cycle, cards } = await ensureShopCycle();
  const card = cards.find(c => c.slotIndex === slotIndex);
  if (!card) return res.status(404).json({ error: 'no card in that slot this cycle' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let purchase;
    try {
      purchase = await client.query(
        `INSERT INTO shop_purchases (player_id, cycle, slot_index, price_paid) VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.playerId, cycle, slotIndex, card.price]
      );
    } catch (e) {
      if (e.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'already bought this slot this cycle' });
      }
      throw e;
    }

    const econ = await getOrCreateEconomy(client, req.playerId);
    if (Number(econ.money) < card.price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'not enough money' });
    }

    const newMoney = Number(econ.money) - card.price;
    const newCard = { ...card, id: uuid(), level: 1, stars: 1 };
    delete newCard.slotIndex;
    const newDeck = [...econ.deck, newCard];

    await client.query(
      `UPDATE player_economy SET money = $2, deck = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newDeck)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, card: newCard, money: newMoney, deck: newDeck });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Gacha — cost and pool weights come only from GACHA_POOLS on the server.
// ---------------------------------------------------------------------------
router.post('/gacha/roll', requireAuth, asyncHandler(async (req, res) => {
  const poolId = req.body?.poolId;
  const times = [1, 3, 10].includes(Number(req.body?.times)) ? Number(req.body.times) : 1;
  const gacha = GACHA_POOLS[poolId];
  if (!gacha) return res.status(400).json({ error: 'unknown gacha pool' });

  // Discount schedule ported from the old client-side gachaPull() in GACHA.html
  let totalCost = gacha.cost * times;
  if (times === 3) totalCost = Math.floor(totalCost * 0.9);
  if (times === 10) totalCost = Math.floor(totalCost * 0.8);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    if (Number(econ.money) < totalCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'not enough money' });
    }

    const results = [];
    for (let i = 0; i < times; i++) {
      const c = rollGachaOnce(poolId);
      if (c) results.push({ ...c, id: uuid(), level: 1, stars: 1 });
    }

    const newMoney = Number(econ.money) - totalCost;
    const newDeck = [...econ.deck, ...results];

    await client.query(
      `UPDATE player_economy SET money = $2, deck = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newDeck)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, results, money: newMoney, deck: newDeck });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Card upgrade (the "guaranteed" shard-cost path from public/js/data/upgrade.js —
// fixed 10 shards of the card's rarity-matched shard type, no RNG, level+1 up to
// UPGRADE_MAX_LEVEL). The separate money+success-rate upgrade path in upgrade.js
// wasn't ported yet — flag this to วุฒิ3 as a phase 2 follow-up.
// ---------------------------------------------------------------------------
router.post('/upgrade/guaranteed', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  if (!cardId) return res.status(400).json({ error: 'missing cardId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = econ.deck;
    const idx = deck.findIndex(c => c.id === cardId);
    if (idx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'card not found in deck' });
    }
    const card = { ...deck[idx] };
    if (!card.stars) card.stars = 1;
    if (card.maxed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'already max level' });
    }

    const shardKey = UPGRADE_SHARD_KEY_BY_RARITY[card.rarity] || 'shardGray';
    const have = econ.bag[shardKey] || 0;
    if (have < UPGRADE_SHARDS_NEEDED) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `need ${UPGRADE_SHARDS_NEEDED} ${shardKey}, have ${have}` });
    }

    const newBag = { ...econ.bag, [shardKey]: have - UPGRADE_SHARDS_NEEDED };

    // Matches guaranteeUpgrade() in public/js/data/upgrade.js: always succeeds,
    // level+1 up to UPGRADE_MAX_LEVEL, then star-up (free — the guaranteed path
    // doesn't require duplicate cards, unlike the paid path), maxed at 8 stars.
    if (card.level < UPGRADE_MAX_LEVEL) {
      card.level += 1;
    } else if (card.stars < 5) {
      card.stars += 1;
      card.level = 1;
    } else if (card.stars >= 8) {
      card.maxed = true;
      card.level = 'MAX';
    }
    if (!card.maxed && card.level !== 'MAX') applyLevelGrowth(card);

    const newDeck = [...deck];
    newDeck[idx] = card;

    await client.query(
      `UPDATE player_economy SET bag = $2, deck = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, JSON.stringify(newBag), JSON.stringify(newDeck)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, card: newDeck[idx], bag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Sell card — was fully client-side (render.js sellCard/sellAllUnlocked, plus a
// second copy in GACHA.html with different prices). Server now owns the price
// table and is the only one that can add money for a sale.
// ---------------------------------------------------------------------------
router.post('/sell', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  if (!cardId) return res.status(400).json({ error: 'missing cardId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = econ.deck;
    const idx = deck.findIndex(c => c.id === cardId);
    if (idx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'card not found in deck' });
    }

    const sold = deck[idx];
    const price = calcSellPrice(sold);
    const newDeck = deck.filter((_, i) => i !== idx);
    const newMoney = Number(econ.money) + price;

    await client.query(
      `UPDATE player_economy SET money = $2, deck = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newDeck)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, sold, price, money: newMoney, deck: newDeck });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/economy/sell-all { cardIds: [...] } — mirrors sellAllUnlocked(); client
// decides which cards are "unlocked" (a client-only UI concept — not selectable for
// battle), server just re-validates each id exists and prices it independently.
router.post('/sell-all', requireAuth, asyncHandler(async (req, res) => {
  const cardIds = Array.isArray(req.body?.cardIds) ? req.body.cardIds : null;
  if (!cardIds || cardIds.length === 0) return res.status(400).json({ error: 'missing cardIds' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const idSet = new Set(cardIds);
    const toSell = econ.deck.filter(c => idSet.has(c.id));
    const kept = econ.deck.filter(c => !idSet.has(c.id));
    const totalEarned = toSell.reduce((sum, c) => sum + calcSellPrice(c), 0);
    const newMoney = Number(econ.money) + totalEarned;

    await client.query(
      `UPDATE player_economy SET money = $2, deck = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(kept)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, sold: toSell, totalEarned, money: newMoney, deck: kept });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Upgrade — money + success-rate path (was upgradeCard() in upgrade.js, fully
// client-side: client rolled the dice, deducted its own money, and applied its
// own stat growth). Server now rolls, deducts, and grows the card itself.
// ---------------------------------------------------------------------------
router.post('/upgrade/paid', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  if (!cardId) return res.status(400).json({ error: 'missing cardId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = econ.deck;
    const idx = deck.findIndex(c => c.id === cardId);
    if (idx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'card not found in deck' });
    }
    const card = { ...deck[idx] };
    if (!card.stars) card.stars = 1;
    if (card.maxed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'already max level' });
    }
    // This path is for normal leveling only — at Lv.10 with 5–7 stars, star-up
    // requires duplicate cards (use /upgrade/duplicate instead).
    if (card.level >= UPGRADE_MAX_LEVEL && card.stars >= 5 && card.stars < 8) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'star-up at max level requires duplicate cards — use /upgrade/duplicate' });
    }

    const cost = calcUpgradeCost(card);
    if (Number(econ.money) < cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `not enough money (need ${cost})` });
    }
    const successRate = calcSuccessRate(card);

    const roll = Math.random() * 100;
    const success = roll <= successRate;
    if (success) {
      card.level += 1;
      if (card.level > UPGRADE_MAX_LEVEL) {
        if (card.stars < 5) { card.stars += 1; card.level = 1; }
        else if (card.stars >= 8) { card.level = 'MAX'; card.maxed = true; }
        else { card.level = UPGRADE_MAX_LEVEL; }
      }
      if (!card.maxed && card.level !== 'MAX') applyLevelGrowth(card);
    }

    const newMoney = Number(econ.money) - cost;
    const newDeck = [...deck];
    newDeck[idx] = card;

    await client.query(
      `UPDATE player_economy SET money = $2, deck = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newDeck)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, success, roll, successRate, cost, card, money: newMoney, deck: newDeck });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/economy/upgrade/duplicate { cardId, duplicateCardIds } — the free
// star-up path at Lv.10/stars 5-7 that consumes copies of the same card instead
// of money. Server re-counts and re-validates the duplicates itself rather than
// trusting the client's count.
router.post('/upgrade/duplicate', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  const duplicateCardIds = Array.isArray(req.body?.duplicateCardIds) ? req.body.duplicateCardIds : [];
  if (!cardId) return res.status(400).json({ error: 'missing cardId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = econ.deck;
    const idx = deck.findIndex(c => c.id === cardId);
    if (idx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'card not found in deck' });
    }
    const card = { ...deck[idx] };
    if (!card.stars) card.stars = 1;
    if (!(card.level >= UPGRADE_MAX_LEVEL && card.stars >= 5 && card.stars < 8)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'card is not eligible for duplicate star-up right now' });
    }

    const rarityFactor = UPGRADE_DUPLICATE_COST_BY_RARITY[card.rarity] || 1;
    const need = (card.stars - 4) * rarityFactor;

    // Validate: every id in duplicateCardIds must exist, be a different deck
    // entry, share the same name, and not be the card itself — and there must
    // be at least `need` of them. We only trust ids that are actually in the
    // player's deck right now (re-looked-up, not taken from the request body).
    const dedupIds = [...new Set(duplicateCardIds)].filter(id => id !== cardId);
    const validDupes = dedupIds
      .map(id => deck.find(c => c.id === id))
      .filter(c => c && c.name === card.name);

    if (validDupes.length < need) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `need ${need} duplicate "${card.name}" cards, got ${validDupes.length}` });
    }

    const consumedIds = new Set(validDupes.slice(0, need).map(c => c.id));
    card.stars += 1;
    card.level = 1;
    if (!card.maxed) applyLevelGrowth(card);

    const newDeck = deck.filter(c => !consumedIds.has(c.id)).map(c => (c.id === cardId ? card : c));

    await client.query(
      `UPDATE player_economy SET deck = $2, updated_at = now() WHERE player_id = $1`,
      [req.playerId, JSON.stringify(newDeck)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, card, consumed: [...consumedIds], deck: newDeck });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Equipment gacha + equip status system — was entirely client-side before
// (public/js/data/equip-gacha.js rolled AND paid for itself, public/js/data/equip.js
// moved items between the deck and localStorage["equipBag"] with no server check at
// all). Both now follow the same pattern as the card gacha/deck endpoints above:
// server owns cost + RNG + the equip_bag column, and equip/unequip only ever moves
// an item between equip_bag and a card's `equips` array inside player_economy.deck —
// never trusting a bonus/stat value the client sends.
// ---------------------------------------------------------------------------

// POST /api/economy/equip-gacha/roll { poolId, times, blacklist? }
// blacklist (optional array of item names) mirrors the old "tick to auto-discard"
// UI feature: it can only cause a rolled item to NOT be kept (never grants extra
// items or a refund), so trusting the client's list here doesn't open an exploit.
router.post('/equip-gacha/roll', requireAuth, asyncHandler(async (req, res) => {
  const poolId = req.body?.poolId;
  const times = [1, 3, 10].includes(Number(req.body?.times)) ? Number(req.body.times) : 1;
  const blacklist = Array.isArray(req.body?.blacklist) ? req.body.blacklist.filter(n => typeof n === 'string') : [];
  if (!EQUIP_GACHA_POOLS[poolId]) return res.status(400).json({ error: 'unknown equip gacha pool' });

  const totalCost = equipGachaCost(poolId, times);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    if (Number(econ.money) < totalCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'not enough money' });
    }

    const blacklistSet = new Set(blacklist);
    const results = [];
    const kept = [];
    for (let i = 0; i < times; i++) {
      const rolled = rollEquipGachaOnce(poolId);
      const item = { ...rolled, id: 'equip-' + uuid() };
      if (blacklistSet.has(item.name)) {
        results.push({ ...item, _blacklisted: true });
      } else {
        results.push(item);
        kept.push(item);
      }
    }

    const newMoney = Number(econ.money) - totalCost;
    const newEquipBag = [...econ.equip_bag, ...kept];

    await client.query(
      `UPDATE player_economy SET money = $2, equip_bag = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newEquipBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, results, money: newMoney, equipBag: newEquipBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/economy/equip/equip { cardId, equipId } — move an item from equip_bag
// onto a card in the deck. Re-validates the item actually exists in the player's
// bag and the card exists in their deck (never trusts a bonus/type from the client).
router.post('/equip/equip', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  const equipId = req.body?.equipId;
  if (!cardId || !equipId) return res.status(400).json({ error: 'missing cardId or equipId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = econ.deck;
    const bag = econ.equip_bag;

    const cardIdx = deck.findIndex(c => c.id === cardId);
    if (cardIdx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'card not found in deck' });
    }
    const bagIdx = bag.findIndex(e => e.id === equipId);
    if (bagIdx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'equip item not found in bag' });
    }

    const card = { ...deck[cardIdx] };
    card.equips = Array.isArray(card.equips) ? [...card.equips] : [];
    const item = bag[bagIdx];

    let newBag = bag.filter((_, i) => i !== bagIdx);

    // Same type already equipped -> unequip it back to the bag first (matches
    // equipItem() in the old client equip.js).
    const existingIdx = card.equips.findIndex(e => e.type === item.type);
    if (existingIdx !== -1) {
      newBag = [...newBag, card.equips[existingIdx]];
      card.equips.splice(existingIdx, 1);
    }

    if (card.equips.length >= 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'card already has 3 equips' });
    }

    card.equips.push(item);
    const newDeck = [...deck];
    newDeck[cardIdx] = card;

    await client.query(
      `UPDATE player_economy SET deck = $2, equip_bag = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, JSON.stringify(newDeck), JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, deck: newDeck, equipBag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/economy/equip/unequip { cardId, equipId } — move an item off a card
// and back into the bag.
router.post('/equip/unequip', requireAuth, asyncHandler(async (req, res) => {
  const cardId = req.body?.cardId;
  const equipId = req.body?.equipId;
  if (!cardId || !equipId) return res.status(400).json({ error: 'missing cardId or equipId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = econ.deck;

    const cardIdx = deck.findIndex(c => c.id === cardId);
    if (cardIdx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'card not found in deck' });
    }
    const card = { ...deck[cardIdx] };
    card.equips = Array.isArray(card.equips) ? [...card.equips] : [];
    const idx = card.equips.findIndex(e => e.id === equipId);
    if (idx === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'equip item not found on card' });
    }

    const [item] = card.equips.splice(idx, 1);
    const newDeck = [...deck];
    newDeck[cardIdx] = card;
    const newBag = [...econ.equip_bag, item];

    await client.query(
      `UPDATE player_economy SET deck = $2, equip_bag = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, JSON.stringify(newDeck), JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, deck: newDeck, equipBag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/economy/equip/delete { equipId } — permanently discard one item from
// the bag (matches deleteEquipItem() in the old client equip.js).
router.post('/equip/delete', requireAuth, asyncHandler(async (req, res) => {
  const equipId = req.body?.equipId;
  if (!equipId) return res.status(400).json({ error: 'missing equipId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const newBag = econ.equip_bag.filter(e => e.id !== equipId);

    await client.query(
      `UPDATE player_economy SET equip_bag = $2, updated_at = now() WHERE player_id = $1`,
      [req.playerId, JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, equipBag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/economy/equip/delete-by-rarity { rarity } — bulk discard (matches
// deleteEquipByRarity() / "delete all Common/Rare" buttons in the old client).
router.post('/equip/delete-by-rarity', requireAuth, asyncHandler(async (req, res) => {
  const rarity = req.body?.rarity;
  if (typeof rarity !== 'string' || !rarity) return res.status(400).json({ error: 'missing rarity' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const newBag = econ.equip_bag.filter(e => e.rarity !== rarity);

    await client.query(
      `UPDATE player_economy SET equip_bag = $2, updated_at = now() WHERE player_id = $1`,
      [req.playerId, JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, equipBag: newBag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
