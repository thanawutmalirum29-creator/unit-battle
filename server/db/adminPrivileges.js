// db/adminPrivileges.js
//
// Grants (and keeps topped-up) every cheat/unlimited privilege an is_admin
// account gets in-game:
//   - unlimited money + unlimited bag resources (shards/memories/pvp medals)
//   - every stage unlocked (NORMAL + INF)
//   - one of every character in the game, already maxed (8★ / Lv.MAX)
//   - one of every legendary equip item
//   - equipping an item never consumes it (see routes/economy.js POST /equip/equip,
//     which checks req.isAdmin directly instead of going through this file)
//   - every achievement badge/frame shown as unlocked (see routes/players.js,
//     which checks req.isAdmin directly — those are never stored server-side
//     to begin with, so there's nothing to "grant" here)
//
// ensureAdminPrivileges() is called from middleware/auth.js on every
// authenticated request for an is_admin account (throttled below) so the
// account can never actually run dry no matter what it spends, without
// having to special-case every money/resource check across
// economy.js/guilds.js/pvp.js/shop individually — it just tops back up to
// the floor before the next request's checks run.
const pool = require('./pool');
const { v4: uuid } = require('uuid');
const { CHARACTER_DB, getCharacterStats } = require('../public/js/data/character-data.js');
const {
  EQUIP_GACHA_POOLS, UPGRADE_MAX_LEVEL, applyLevelGrowth, MAX_INF_STAGE, STAGE_REWARDS,
} = require('../game-data/economy-data.js');

// No purchase/upgrade cost anywhere in the game gets remotely close to these —
// they just need to be "practically infinite", not the literal max int.
const ADMIN_MONEY_FLOOR = 999999999999; // ~1 trillion
const ADMIN_RESOURCE_FLOOR = 999999999; // per bag currency

// Must match public/pages/account.html + client economy code (same list
// routes/admin.js keeps for the reclaim-tab dropdown).
const BAG_KEYS = [
  'memoryRare', 'memoryEpic', 'memoryLegendary', 'memoryMythical', 'memoryCosmic',
  'shardGray', 'shardBlue', 'shardPurple', 'shardGold', 'shardRed', 'shardSky',
  'pvpMedal',
];

const ALL_CHARACTER_NAMES = Object.keys(CHARACTER_DB);
// STAGE_REWARDS is keyed by stage number (1..N), not an array — same pattern
// STAGE_DROPS uses elsewhere in this codebase.
const MAX_NORMAL_STAGE = Object.keys(STAGE_REWARDS).length;

function buildAllLegendaryEquips() {
  const seen = new Map();
  for (const gachaPool of Object.values(EQUIP_GACHA_POOLS)) {
    for (const item of gachaPool.pool) {
      if (item.rarity === 'Legendary' && !seen.has(item.name)) seen.set(item.name, item);
    }
  }
  return [...seen.values()];
}
const ALL_LEGENDARY_EQUIPS = buildAllLegendaryEquips();

// Mirrors the exact level/star growth loop POST /upgrade/guaranteed uses,
// run start-to-finish, so a granted/topped-up card ends up with the exact
// same stats a legitimately-farmed 8★ Lv.MAX card would have.
function maxOutCard(card) {
  if (!card.stars) card.stars = 1;
  if (!card.level || card.level === 0) card.level = 1;
  let guard = 0;
  while (!card.maxed && guard++ < 1000) {
    if (card.level !== 'MAX' && card.level < UPGRADE_MAX_LEVEL) {
      card.level += 1;
    } else if (card.stars < 8) {
      card.stars += 1;
      card.level = 1;
      if (card.stars >= 8) {
        card.maxed = true;
        card.level = 'MAX';
      }
    } else {
      card.maxed = true;
      card.level = 'MAX';
    }
    if (!card.maxed && card.level !== 'MAX') applyLevelGrowth(card);
  }
  return card;
}

function freshMaxedCard(name) {
  const stats = getCharacterStats(name);
  if (!stats) return null;
  return maxOutCard({ ...stats, id: uuid(), level: 1, stars: 1 });
}

function bagAtFloor(bag) {
  const out = { ...(bag || {}) };
  for (const key of BAG_KEYS) {
    if (!(Number(out[key]) >= ADMIN_RESOURCE_FLOOR)) out[key] = ADMIN_RESOURCE_FLOOR;
  }
  return out;
}

// Maxes out every already-owned (non-borrowed) card, then adds one fresh
// maxed copy of every character the account doesn't own at least one of yet.
function deckWithEveryCharacterMaxed(deck) {
  const out = Array.isArray(deck) ? deck.map((c) => ({ ...c })) : [];
  for (const card of out) {
    if (!card.borrowed && !card.maxed) maxOutCard(card);
  }
  const ownedNames = new Set(out.map((c) => c.name));
  for (const name of ALL_CHARACTER_NAMES) {
    if (!ownedNames.has(name)) {
      const card = freshMaxedCard(name);
      if (card) out.push(card);
    }
  }
  return out;
}

function equipBagWithAllLegendaries(equipBag) {
  const out = Array.isArray(equipBag) ? [...equipBag] : [];
  const ownedNames = new Set(out.map((e) => e.name));
  for (const item of ALL_LEGENDARY_EQUIPS) {
    if (!ownedNames.has(item.name)) {
      out.push({ ...item, id: 'equip-' + uuid() });
    }
  }
  return out;
}

// Throttle: the full pass does a few DB round trips and JS work over the
// whole character list, so don't re-run it on literally every request an
// admin account makes — once every ADMIN_ENSURE_THROTTLE_MS is plenty, since
// the floors above have enormous headroom over anything a single request
// window could spend.
const lastEnsuredAt = new Map(); // playerId -> ms timestamp
const ADMIN_ENSURE_THROTTLE_MS = 20000;

// force: true bypasses the throttle — used right when an admin flips the
// checkbox on in the console, so privileges land immediately instead of
// waiting for the player's next request.
async function ensureAdminPrivileges(playerId, { force = false } = {}) {
  if (!playerId) return;
  if (!force) {
    const last = lastEnsuredAt.get(playerId) || 0;
    if (Date.now() - last < ADMIN_ENSURE_THROTTLE_MS) return;
  }
  lastEnsuredAt.set(playerId, Date.now());

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING`,
      [playerId]
    );
    const { rows } = await client.query(
      `SELECT money, bag, deck, equip_bag FROM player_economy WHERE player_id = $1 FOR UPDATE`,
      [playerId]
    );
    const econ = rows[0] || {};

    const newMoney = Math.max(Number(econ.money) || 0, ADMIN_MONEY_FLOOR);
    const newBag = bagAtFloor(econ.bag);
    const newDeck = deckWithEveryCharacterMaxed(econ.deck);
    const newEquipBag = equipBagWithAllLegendaries(econ.equip_bag);

    await client.query(
      `UPDATE player_economy SET money = $2, bag = $3, deck = $4, equip_bag = $5, updated_at = now() WHERE player_id = $1`,
      [playerId, newMoney, JSON.stringify(newBag), JSON.stringify(newDeck), JSON.stringify(newEquipBag)]
    );

    await client.query(
      `INSERT INTO normal_progress (player_id, max_stage) VALUES ($1, $2)
       ON CONFLICT (player_id) DO UPDATE SET max_stage = GREATEST(normal_progress.max_stage, $2)`,
      [playerId, MAX_NORMAL_STAGE]
    );
    await client.query(
      `INSERT INTO inf_progress (player_id, max_stage) VALUES ($1, $2)
       ON CONFLICT (player_id) DO UPDATE SET max_stage = GREATEST(inf_progress.max_stage, $2)`,
      [playerId, MAX_INF_STAGE]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { ensureAdminPrivileges, ADMIN_MONEY_FLOOR, ADMIN_RESOURCE_FLOOR };
