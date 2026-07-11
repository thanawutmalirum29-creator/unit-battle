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
const DONATION_DAILY_LIMIT = 10; // max donation ACTIONS per player per game day

// Per-player daily caps on what donating actually earns — separate from
// DONATION_DAILY_LIMIT above (which just caps how many donate taps you get).
// A player can still donate money past the point/EXP caps (it still funds
// the guild treasury), they just stop personally earning contribution
// points / guild EXP for the rest of the game day.
const DONATION_DAILY_MONEY_CAP = 1000000;      // max money donated per player per game day
const DONATION_DAILY_CONTRIBUTION_CAP = 500;   // max contribution points earned per player per game day
const DONATION_DAILY_GUILD_EXP_CAP = 500;      // max guild EXP granted from one player's donations per game day

// ---------------------------------------------------------------------------
// "Game day" boundary for the caps above: resets at 04:00 Thailand time
// (UTC+7), not midnight UTC and not a rolling 24h window. Thailand has no
// DST, so a fixed offset is safe here.
// ---------------------------------------------------------------------------
const THAILAND_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAILY_RESET_HOUR_MS = 4 * 60 * 60 * 1000; // 04:00
const DAY_MS = 24 * 60 * 60 * 1000;

// Start (as a real UTC Date) of the game day currently in progress.
function currentGameDayStart() {
  const thaiNow = Date.now() + THAILAND_UTC_OFFSET_MS;
  const dayIndex = Math.floor((thaiNow - DAILY_RESET_HOUR_MS) / DAY_MS);
  const thaiDayStart = dayIndex * DAY_MS + DAILY_RESET_HOUR_MS;
  return new Date(thaiDayStart - THAILAND_UTC_OFFSET_MS);
}
// When the game day currently in progress will roll over (also a real UTC Date).
function currentGameDayEnd() {
  return new Date(currentGameDayStart().getTime() + DAY_MS);
}

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
  { key: 'shard_gray', name: 'ชาร์ดเทา x30', cost: 20, limit: 10, minLevel: 1, rewardBagKey: 'shardGray', rewardBagQty: 30 },
  { key: 'shard_blue', name: 'ชาร์ดน้ำเงิน x20', cost: 50, limit: 8, minLevel: 1, rewardBagKey: 'shardBlue', rewardBagQty: 20 },
  { key: 'shard_purple', name: 'ชาร์ดม่วง x10', cost: 120, limit: 5, minLevel: 5, rewardBagKey: 'shardPurple', rewardBagQty: 10 },
  { key: 'shard_gold', name: 'ชาร์ดทอง x5', cost: 300, limit: 3, minLevel: 10, rewardBagKey: 'shardGold', rewardBagQty: 5 },
  { key: 'memory_rare', name: 'เศษความทรงจำ Rare x10', cost: 60, limit: 5, minLevel: 1, rewardBagKey: 'memoryRare', rewardBagQty: 10 },
  { key: 'memory_epic', name: 'เศษความทรงจำ Epic x5', cost: 150, limit: 3, minLevel: 5, rewardBagKey: 'memoryEpic', rewardBagQty: 5 },
  // Higher guild levels unlock stronger redemptions — same personal
  // contribution_balance currency, just gated by how far the guild has leveled.
  { key: 'money_huge', name: 'ถุงเงินกิลด์ (มหึมา)', cost: 500, limit: 2, minLevel: 15, rewardMoney: 100000 },
  { key: 'shard_red', name: 'ชาร์ดแดง x5', cost: 450, limit: 3, minLevel: 20, rewardBagKey: 'shardRed', rewardBagQty: 5 },
  { key: 'memory_legendary', name: 'เศษความทรงจำ Legendary x5', cost: 400, limit: 3, minLevel: 20, rewardBagKey: 'memoryLegendary', rewardBagQty: 5 },
  { key: 'shard_sky', name: 'ชาร์ดฟ้าสวรรค์ x3', cost: 800, limit: 2, minLevel: 30, rewardBagKey: 'shardSky', rewardBagQty: 3 },
  { key: 'memory_cosmic', name: 'เศษความทรงจำ Cosmic x3', cost: 900, limit: 2, minLevel: 40, rewardBagKey: 'memoryCosmic', rewardBagQty: 3 },

  // --- กรอบปก (avatar frames, see game-data/cosmetics-data.js FRAME_CATALOG) ---
  // One-time cosmetic unlocks, not consumables — `rewardFrameKey` instead of
  // rewardMoney/rewardBagKey. `limit` still caps purchases-per-cycle like
  // every other item, but routes/guilds.js also permanently blocks
  // repurchase once the player owns the frame (players.owned_frames), so in
  // practice these can only ever be bought once no matter how limit/cycle
  // are set. minLevel is set high since these are meant to be a rare flex.
  { key: 'frame_dragon', name: 'กรอบมังกรทองกิลด์', cost: 600, limit: 1, minLevel: 25, rewardFrameKey: 'frame_guild_shop_dragon' },
  { key: 'frame_phoenix', name: 'กรอบฟีนิกซ์เพลิงกิลด์', cost: 1200, limit: 1, minLevel: 40, rewardFrameKey: 'frame_guild_shop_phoenix' },
];
function findShopItem(key) {
  return GUILD_SHOP_CATALOG.find((i) => i.key === key) || null;
}

// ---------------------------------------------------------------------------
// Weekly cycle clock, shared by the guild shop's purchase limits and the
// guild boss. Separate from economy's 5-minute SHOP_REFRESH_INTERVAL_MS —
// this one is intentionally a full week.
//
// Resets every SUNDAY at 04:00 Thailand time (UTC+7) — NOT a rolling 7-day
// window from the Unix epoch (that used to drift to whatever weekday
// 1970-01-01 happened to be, i.e. Thursday, so the "weekly" reset silently
// landed on Thursday 07:00 UTC instead of the intended Sunday morning).
//
// Reuses the same 04:00-Thai "day start" boundary as currentGameDayStart()
// above: dayIndex counts 04:00-Thai-aligned days since the epoch, and
// dayIndex 0 (1970-01-01 04:00 Thai) falls on a Thursday, so dayIndex 3
// (1970-01-04 04:00 Thai) is the first such boundary that lands on a Sunday.
// Every 7 dayIndex values after that is another Sunday — that's the anchor
// weeks are counted from.
// ---------------------------------------------------------------------------
const WEEK_MS = 7 * DAY_MS;
const GUILD_CYCLE_MS = WEEK_MS; // kept for anything reading the raw duration
const FIRST_SUNDAY_DAY_INDEX = 3;

function currentGuildCycle() {
  const thaiNow = Date.now() + THAILAND_UTC_OFFSET_MS;
  const dayIndex = Math.floor((thaiNow - DAILY_RESET_HOUR_MS) / DAY_MS);
  return Math.floor((dayIndex - FIRST_SUNDAY_DAY_INDEX) / 7);
}
// Start (as a real UTC Date) of a given weekly cycle number.
function guildCycleStartsAt(cycle) {
  const dayIndex = cycle * 7 + FIRST_SUNDAY_DAY_INDEX;
  const thaiWeekStart = dayIndex * DAY_MS + DAILY_RESET_HOUR_MS;
  return new Date(thaiWeekStart - THAILAND_UTC_OFFSET_MS);
}
function guildCycleEndsAt(cycle) {
  return new Date(guildCycleStartsAt(cycle).getTime() + WEEK_MS).toISOString();
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

// ---------------------------------------------------------------------------
// Custom guild ranks ("ยศ") — the leader names a rank and hand-picks which of
// these permissions it grants. Purely additive on top of the base
// leader/officer/member hierarchy (see hasGuildPermission in db/guildHelpers.js);
// a 'member' holding a rank with e.g. `invite: true` can invite players
// without being promoted all the way to officer. `key` is what's stored in
// guild_ranks.permissions (jsonb) and checked server-side — never trust a
// permissions object from the client beyond these keys (sanitizeRankPermissions).
// ---------------------------------------------------------------------------
const GUILD_RANK_PERMISSIONS = [
  { key: 'invite', label: 'เชิญผู้เล่นเข้ากิลด์' },
  { key: 'manageApplications', label: 'จัดการคำขอเข้าร่วม (รับ/ปฏิเสธ)' },
  { key: 'kickMembers', label: 'เตะสมาชิกทั่วไปออกจากกิลด์ (ยกเว้นหัวหน้า/รองหัวหน้า)' },
  { key: 'manageRanks', label: 'มอบ/ถอดยศให้สมาชิกคนอื่น' },
  { key: 'editSettings', label: 'แก้ไขข้อมูลกิลด์ (คำอธิบาย/สัญลักษณ์/รูปแบบเข้าร่วม)' },
];
const GUILD_RANK_NAME_MIN = 1;
const GUILD_RANK_NAME_MAX = 16;
const GUILD_MAX_RANKS = 10; // per guild, sanity cap on how many custom ranks can exist

// Rank points ("แต้มยศ") — a numeric hierarchy layered on top of permissions so
// that assigning/reassigning ranks itself has a pecking order: anyone handing
// out a rank (the leader, or a member holding manageRanks) can never grant a
// rank whose points exceed their own current points (see rankPointsOf() and
// the assign/unassign guards in db/guildHelpers.js + routes/guilds.js). The
// leader and the built-in 'officer' role get fixed, non-editable point values
// so custom ranks always have something concrete to compare against — the
// leader sets each custom rank's points (0 to just below the leader's own)
// when creating it.
const GUILD_RANK_POINTS_MIN = 0;
const GUILD_LEADER_RANK_POINTS = 999;   // fixed — the leader always outranks every custom rank
const GUILD_OFFICER_RANK_POINTS = 500;  // fixed — the built-in "officer" (รองหัวหน้า) role's benchmark
const GUILD_RANK_POINTS_MAX = GUILD_LEADER_RANK_POINTS - 1; // custom ranks must stay below the leader

// Strips a client-supplied permissions object down to only the known keys
// above, coerced to booleans — never persist anything else into guild_ranks.
function sanitizeRankPermissions(input) {
  const out = {};
  for (const perm of GUILD_RANK_PERMISSIONS) out[perm.key] = !!(input && input[perm.key]);
  return out;
}

// Clamps a client-supplied rank-points value into the valid custom-rank range.
function sanitizeRankPoints(input) {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n)) return GUILD_RANK_POINTS_MIN;
  return Math.max(GUILD_RANK_POINTS_MIN, Math.min(GUILD_RANK_POINTS_MAX, n));
}

module.exports = {
  GUILD_NAME_MIN, GUILD_NAME_MAX, GUILD_TAG_MIN, GUILD_TAG_MAX,
  GUILD_DESC_MAX, GUILD_CREATE_COST, GUILD_EMBLEMS, GUILD_JOIN_MODES,
  DONATION_MIN, DONATION_MAX, DONATION_RATE, DONATION_DAILY_LIMIT, contributionForDonation,
  DONATION_DAILY_MONEY_CAP, DONATION_DAILY_CONTRIBUTION_CAP, DONATION_DAILY_GUILD_EXP_CAP,
  currentGameDayStart, currentGameDayEnd,
  GUILD_SHOP_CATALOG, findShopItem,
  GUILD_CYCLE_MS, currentGuildCycle, guildCycleEndsAt,
  GUILD_BOSS_NAME, GUILD_BOSS_MAX_HP, GUILD_BOSS_ATTACKS_PER_DAY, GUILD_BOSS_MIN_DAMAGE,
  GUILD_BOSS_REWARD_TIERS, GUILD_BOSS_DEFEAT_BONUS, rewardForBossDamage, computeBossAttackDamage,
  GUILD_MAX_LEVEL, GUILD_EXP_PER_CONTRIBUTION, GUILD_EXP_PER_BOSS_DAMAGE,
  GUILD_LEVEL_THRESHOLDS, levelForExp, expProgress,
  GUILD_BASE_MAX_MEMBERS, GUILD_LEVEL_MEMBER_BONUS_CAP, GUILD_CAPACITY_EXPANSION_MIN_LEVEL,
  GUILD_CAPACITY_EXPANSION_BONUS, GUILD_CAPACITY_EXPANSION_COST, levelMemberBonus, computeMaxMembers,
  GUILD_RANK_PERMISSIONS, GUILD_RANK_NAME_MIN, GUILD_RANK_NAME_MAX, GUILD_MAX_RANKS, sanitizeRankPermissions,
  GUILD_RANK_POINTS_MIN, GUILD_RANK_POINTS_MAX, GUILD_LEADER_RANK_POINTS, GUILD_OFFICER_RANK_POINTS, sanitizeRankPoints,
};
