// game-data/guild-data.js
//
// Server-authoritative numbers for the guild system: creation cost, donation
// exchange rate, guild-shop catalog, and the weekly guild-boss balance.
// Kept separate from routes/guilds.js the same way game-data/economy-data.js
// is kept separate from routes/economy.js — numbers can be retuned here
// without touching request-handling logic.
// -----------------------------------------------------------------------------

// Base/max member cap now depends on guild level + optional shop expansion —
// see GUILD_BASE_MAX_MEMBERS / computeMaxMembers() further down.
const GUILD_NAME_MIN = 3;
const GUILD_NAME_MAX = 24;
const GUILD_TAG_MIN = 2;
const GUILD_TAG_MAX = 5;
const GUILD_DESC_MAX = 200;
const GUILD_CREATE_COST = 20000; // money, deducted from player_economy on POST /create

const GUILD_EMBLEMS = ['🛡️', '⚔️', '🐉', '🔥', '❄️', '⭐', '🌙', '👑', '💀', '🦅', '🐺', '⚡'];
const GUILD_JOIN_MODES = ['open', 'apply', 'invite'];

// ---------------------------------------------------------------------------
// Guild level: earned from the guild's own activity (donations + guild-boss
// damage — the two co-op systems below), NOT a separate grind. `exp` on the
// `guilds` row accumulates forever and is never reset or capped, even past
// GUILD_MAX_LEVEL — see the schema.sql comment for why (future-proofing a
// level-cap raise without shortchanging guilds that over-farmed already).
// `level` is only ever a read-only view of `exp` (see levelForExp below).
// ---------------------------------------------------------------------------
const GUILD_MAX_LEVEL = 50;
const GUILD_EXP_PER_CONTRIBUTION = 1; // 1 guild EXP per 1 contribution point donated
const GUILD_EXP_PER_BOSS_DAMAGE = 0.02; // 1 guild EXP per 50 boss damage dealt

function levelExpCost(level) {
  return Math.round(300 * Math.pow(level, 1.6));
}
// GUILD_LEVEL_THRESHOLDS[L] = total cumulative exp required to BE at level L.
// Index 0 is unused (levels start at 1, which needs 0 exp).
const GUILD_LEVEL_THRESHOLDS = [0];
(function buildThresholds() {
  let cumulative = 0;
  for (let level = 1; level <= GUILD_MAX_LEVEL; level++) {
    GUILD_LEVEL_THRESHOLDS[level] = cumulative;
    cumulative += levelExpCost(level);
  }
})();

function levelForExp(exp) {
  for (let level = GUILD_MAX_LEVEL; level >= 1; level--) {
    if (exp >= GUILD_LEVEL_THRESHOLDS[level]) return level;
  }
  return 1;
}
// How far into the current level (for a progress bar), and how much is
// needed for the next one — null once GUILD_MAX_LEVEL is reached (exp still
// climbs, there's just no next threshold to show progress toward).
function expProgress(exp) {
  const level = levelForExp(exp);
  const intoLevel = exp - GUILD_LEVEL_THRESHOLDS[level];
  const forNextLevel = level < GUILD_MAX_LEVEL ? GUILD_LEVEL_THRESHOLDS[level + 1] - GUILD_LEVEL_THRESHOLDS[level] : null;
  return { level, intoLevel, forNextLevel };
}

// ---------------------------------------------------------------------------
// Member capacity: base 20, +5 every 10 levels from leveling (caps out at
// +15 / level 30, i.e. 35 members), plus one more +5 purchasable from the
// guild shop once level 30+ is reached (paid from the shared treasury, not
// personal contribution — it benefits the whole guild). Absolute max: 40.
// ---------------------------------------------------------------------------
const GUILD_BASE_MAX_MEMBERS = 20;
const GUILD_LEVEL_MEMBER_TIER_SIZE = 10;
const GUILD_LEVEL_MEMBER_BONUS_PER_TIER = 5;
const GUILD_LEVEL_MEMBER_BONUS_CAP = 15; // reached at level 30
const GUILD_CAPACITY_EXPANSION_MIN_LEVEL = 30;
const GUILD_CAPACITY_EXPANSION_BONUS = 5;
const GUILD_CAPACITY_EXPANSION_COST = 300000; // guild treasury money, one-time per guild

function levelMemberBonus(level) {
  return Math.min(GUILD_LEVEL_MEMBER_BONUS_CAP, Math.floor(level / GUILD_LEVEL_MEMBER_TIER_SIZE) * GUILD_LEVEL_MEMBER_BONUS_PER_TIER);
}
function computeMaxMembers(level, extraCapacityPurchased) {
  return GUILD_BASE_MAX_MEMBERS + levelMemberBonus(level) + (extraCapacityPurchased ? GUILD_CAPACITY_EXPANSION_BONUS : 0);
}

// ---------------------------------------------------------------------------
// Donations: money -> guild treasury + personal contribution points.
// 100 money donated = 1 contribution point. Points are split into a lifetime
// total (never decreases — guild/member ranking) and a spendable balance
// (decreases when redeemed in the guild shop).
// ---------------------------------------------------------------------------
const DONATION_MIN = 100;
const DONATION_MAX = 1000000;
const DONATION_RATE = 100; // money per 1 contribution point
const DONATION_DAILY_LIMIT = 10; // max donations per player per rolling 24h

function contributionForDonation(amount) {
  return Math.floor(amount / DONATION_RATE);
}

// ---------------------------------------------------------------------------
// Guild shop — spends personal contribution_balance, not guild treasury.
// `limit` = max purchases per player per weekly cycle (see currentGuildCycle()).
// ---------------------------------------------------------------------------
const GUILD_SHOP_CATALOG = [
  { key: 'money_small', name: 'ถุงเงินกิลด์ (เล็ก)', cost: 30, limit: 10, minLevel: 1, rewardMoney: 3000 },
  { key: 'money_medium', name: 'ถุงเงินกิลด์ (กลาง)', cost: 80, limit: 6, minLevel: 1, rewardMoney: 10000 },
  { key: 'money_large', name: 'ถุงเงินกิลด์ (ใหญ่)', cost: 200, limit: 3, minLevel: 1, rewardMoney: 30000 },
  { key: 'shard_gray', name: 'เศษพลังเทา x30', cost: 20, limit: 10, minLevel: 1, rewardBagKey: 'shardGray', rewardBagQty: 30 },
  { key: 'shard_blue', name: 'เศษพลังฟ้า x20', cost: 50, limit: 8, minLevel: 1, rewardBagKey: 'shardBlue', rewardBagQty: 20 },
  { key: 'shard_purple', name: 'เศษพลังม่วง x10', cost: 120, limit: 5, minLevel: 5, rewardBagKey: 'shardPurple', rewardBagQty: 10 },
  { key: 'shard_gold', name: 'เศษพลังทอง x5', cost: 300, limit: 3, minLevel: 10, rewardBagKey: 'shardGold', rewardBagQty: 5 },
  { key: 'memory_rare', name: 'เศษความทรงจำ Rare x10', cost: 60, limit: 5, minLevel: 1, rewardBagKey: 'memoryRare', rewardBagQty: 10 },
  { key: 'memory_epic', name: 'เศษความทรงจำ Epic x5', cost: 150, limit: 3, minLevel: 5, rewardBagKey: 'memoryEpic', rewardBagQty: 5 },
  // Higher guild levels unlock stronger redemptions — same personal
  // contribution_balance currency, just gated by how far the guild has leveled.
  { key: 'money_huge', name: 'ถุงเงินกิลด์ (มหึมา)', cost: 500, limit: 2, minLevel: 15, rewardMoney: 100000 },
  { key: 'shard_red', name: 'เศษพลังแดง x5', cost: 450, limit: 3, minLevel: 20, rewardBagKey: 'shardRed', rewardBagQty: 5 },
  { key: 'memory_legendary', name: 'เศษความทรงจำ Legendary x5', cost: 400, limit: 3, minLevel: 20, rewardBagKey: 'memoryLegendary', rewardBagQty: 5 },
  { key: 'shard_sky', name: 'เศษพลังฟ้าสวรรค์ x3', cost: 800, limit: 2, minLevel: 30, rewardBagKey: 'shardSky', rewardBagQty: 3 },
  { key: 'memory_cosmic', name: 'เศษความทรงจำ Cosmic x3', cost: 900, limit: 2, minLevel: 40, rewardBagKey: 'memoryCosmic', rewardBagQty: 3 },
];
function findShopItem(key) {
  return GUILD_SHOP_CATALOG.find((i) => i.key === key) || null;
}

// ---------------------------------------------------------------------------
// Weekly cycle clock, shared by the guild shop's purchase limits and the
// guild boss. Separate from economy's 5-minute SHOP_REFRESH_INTERVAL_MS —
// this one is intentionally a full week.
// ---------------------------------------------------------------------------
const GUILD_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;
function currentGuildCycle() {
  return Math.floor(Date.now() / GUILD_CYCLE_MS);
}
function guildCycleEndsAt(cycle) {
  return new Date((cycle + 1) * GUILD_CYCLE_MS).toISOString();
}

// ---------------------------------------------------------------------------
// Guild boss — a shared HP pool the whole guild chips away at over the week.
// Damage is computed server-side from the attacker's OWN deck (never
// client-reported), so it can't be spoofed like a real battle-simulation
// number could be. This is deliberately a simplified "deck power" formula,
// not a full battle replay — good enough for a co-op damage race.
// ---------------------------------------------------------------------------
const GUILD_BOSS_NAME = 'ราชันย์เงามืด';
const GUILD_BOSS_MAX_HP = 2000000;
const GUILD_BOSS_ATTACKS_PER_DAY = 3; // rolling 24h window, see routes/guilds.js
const GUILD_BOSS_DAMAGE_MULTIPLIER = 8;
const GUILD_BOSS_MIN_DAMAGE = 100;
const GUILD_BOSS_TOP_CARDS = 6; // only the N strongest deck cards count toward power

// Cumulative damage-this-cycle thresholds -> mail reward. Highest tier the
// player reached is what gets mailed once the cycle rolls over.
const GUILD_BOSS_REWARD_TIERS = [
  { minDamage: 1, money: 800 },
  { minDamage: 10000, money: 3000, bagKey: 'shardBlue', bagQty: 15 },
  { minDamage: 40000, money: 8000, bagKey: 'shardPurple', bagQty: 10 },
  { minDamage: 120000, money: 20000, bagKey: 'shardGold', bagQty: 8 },
  { minDamage: 400000, money: 60000, bagKey: 'shardRed', bagQty: 5 },
];
// Bonus mailed to every member who landed at least one hit, IF the guild
// dropped the boss to 0 HP before the cycle ended.
const GUILD_BOSS_DEFEAT_BONUS = { money: 30000, bagKey: 'shardGold', bagQty: 10 };

function rewardForBossDamage(damage) {
  let best = null;
  for (const tier of GUILD_BOSS_REWARD_TIERS) {
    if (damage >= tier.minDamage) best = tier;
  }
  return best;
}

// deck: player_economy.deck (array of card objects with .atk/.hp/.def).
// Returns a whole-number damage amount for one attack.
function computeBossAttackDamage(deck) {
  const cards = Array.isArray(deck) ? deck : [];
  if (cards.length === 0) return GUILD_BOSS_MIN_DAMAGE;

  const scores = cards
    .map((c) => (Number(c.atk) || 0) + (Number(c.def) || 0) * 0.5 + (Number(c.hp) || 0) * 0.1)
    .sort((a, b) => b - a)
    .slice(0, GUILD_BOSS_TOP_CARDS);

  const power = scores.reduce((sum, s) => sum + s, 0);
  const variance = 0.85 + Math.random() * 0.3; // 0.85x - 1.15x
  const damage = Math.round(power * GUILD_BOSS_DAMAGE_MULTIPLIER * variance);
  return Math.max(GUILD_BOSS_MIN_DAMAGE, damage);
}

module.exports = {
  GUILD_NAME_MIN, GUILD_NAME_MAX, GUILD_TAG_MIN, GUILD_TAG_MAX,
  GUILD_DESC_MAX, GUILD_CREATE_COST, GUILD_EMBLEMS, GUILD_JOIN_MODES,
  DONATION_MIN, DONATION_MAX, DONATION_RATE, DONATION_DAILY_LIMIT, contributionForDonation,
  GUILD_SHOP_CATALOG, findShopItem,
  GUILD_CYCLE_MS, currentGuildCycle, guildCycleEndsAt,
  GUILD_BOSS_NAME, GUILD_BOSS_MAX_HP, GUILD_BOSS_ATTACKS_PER_DAY, GUILD_BOSS_MIN_DAMAGE,
  GUILD_BOSS_REWARD_TIERS, GUILD_BOSS_DEFEAT_BONUS, rewardForBossDamage, computeBossAttackDamage,
  GUILD_MAX_LEVEL, GUILD_EXP_PER_CONTRIBUTION, GUILD_EXP_PER_BOSS_DAMAGE,
  GUILD_LEVEL_THRESHOLDS, levelForExp, expProgress,
  GUILD_BASE_MAX_MEMBERS, GUILD_LEVEL_MEMBER_BONUS_CAP, GUILD_CAPACITY_EXPANSION_MIN_LEVEL,
  GUILD_CAPACITY_EXPANSION_BONUS, GUILD_CAPACITY_EXPANSION_COST, levelMemberBonus, computeMaxMembers,
};
