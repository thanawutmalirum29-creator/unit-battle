// game-data/economy-data.js
//
// Server-authoritative numbers that decide the game's economy: character stats,
// stage rewards/drops, shop prices, gacha rates/costs, boss reward tiers, upgrade costs.
//
// STATUS (de-dup in progress — see conversation history):
//  - CHARACTER_DB, STAGE_DROPS/STAGE_REWARDS, GACHA_POOLS, and BOSS_REWARD_TIERS
//    are no longer duplicated here. They're require()'d directly from the same
//    files the client <script>-loads (public/js/data/character-data.js,
//    public/js/core/drops.js, public/js/data/gacha-data.js,
//    public/js/modes/BOSS/bossmap.js). Those files were given a small UMD-style
//    footer (`if (typeof module !== "undefined") module.exports = {...}`) that
//    only runs under Node, so client behavior is unchanged. Edit the numbers in
//    ONE place now (the client file) and both sides pick it up automatically.
//  - SHOP_CARD_POOL/SHOP_PRICES, EQUIP_GACHA_POOLS, and the UPGRADE_*/SKILL_UPGRADE_*
//    formulas below are STILL duplicated on purpose for now: their client
//    counterparts (shop-data.js, equip-gacha.js, upgrade.js, upgradeSkills.js) mix
//    data together with DOM/UI code and can't be safely require()'d as-is without
//    first splitting data out of them — a separate follow-up.
const characterData = require("../public/js/data/character-data.js");
const CHARACTER_DB = characterData.CHARACTER_DB;
const getCharacterStats = characterData.getCharacterStats;

// ---------------------------------------------------------------------------
// Stage rewards / drops (NORMAL mode) — require()'d from public/js/core/drops.js
// (the same file the client loads), instead of a hand-copied literal.
// ---------------------------------------------------------------------------
const dropsData = require("../public/js/core/drops.js");
const STAGE_DROPS = dropsData.STAGE_DROPS;
const STAGE_REWARDS = dropsData.STAGE_REWARDS;

// Single source of truth lives in middleware/anticheat.js — re-exported here
// under the economy-facing name so routes/economy.js doesn't need to know
// about the anticheat module's internals. Do NOT hand-copy this number again;
// change MIN_MS_PER_STAGE in anticheat.js and both sides update together.
const { MIN_MS_PER_STAGE } = require("../middleware/anticheat.js");
const MIN_MS_PER_NORMAL_CLAIM = MIN_MS_PER_STAGE;

// ---------------------------------------------------------------------------
// Shop (ported from public/js/data/shop-data.js, prices in the clear — the
// client-side XOR "encoding" of prices was cosmetic, not real protection)
// ---------------------------------------------------------------------------
const SHOP_PRICES = { Cosmic: [1000000, 1200000], Mythical: [20000000, 20000000], Legendary: 1500000, Epic: 55000, Rare: 2000 };

const SHOP_CARD_POOL = {
  Cosmic: [
    { name: "Cosmic Titan", rarity: "Cosmic", atk: 100, hp: 120, def: 40, skill: "None", price: 1000000 },
    { name: "Void Dragon", rarity: "Cosmic", atk: 95, hp: 100, def: 35, skill: "Meteor", price: 1200000 },
  ],
  Mythical: [
    { name: "Dragon", rarity: "Mythical", atk: 70, hp: 80, def: 30, skill: "Fire", price: 20000000 },
    { name: "Phoenix", rarity: "Mythical", atk: 65, hp: 75, def: 28, skill: "Rebirth", price: 20000000 },
  ],
  Legendary: ["Angle", "ผู้ชำนาญพิษ", "นักดาบคู่", "หัวหน้าเผ่าไวกิ้ง", "นักลอบสังหาร", "ท่านแม่ทัพสงคราม", "นักวางระเบิด",
    "นักบวชศักสิทธิ์", "ศาสตร์อัญเชิญ", "พ่อมดเวลา", "Bandit", "นักเวทย์ขาว", "นักวางเพลิง", "นินจา",
    "ผู้ใช้ค้อนสายรุ้ง", "แวมไพร์1000ปี", "ผู้ฝึกเวลา"].map(name => ({ ...getCharacterStats(name), price: 1500000 })),
  Epic: ["คาวบอย", "มือระเบิด", "นักวางพิษ", "อัศวินปราณ", "นักบวร", "นักธนูทอง", "แวมไพร์100ปี", "Duit",
    "จอมเวทย์ไฟ", "จอมเวทย์น้ำแข็ง", "รองเผ่าไวกิ้ง", "ช่างทำค้อนทอง", "แม่ทัพอัศวิน", "แม่มด", "แม่มดเวลา",
    "ผู้ชำระ", "นักอัญเชิญ", "แม่ทัพธนู"].map(name => ({ ...getCharacterStats(name), price: 55000 })),
  Rare: ["หัวหน้าอัศวิน", "นักเวทย์ไฟ", "นักเวทย์น้ำแข็ง", "อัศวิน", "นักธนูเฉียบคม", "ศิษย์นักบวร", "ซามูไร",
    "ซามูไรดาบยาว", "ไวกิ้ง", "โจรป่า"].map(name => ({ ...getCharacterStats(name), price: 2000 })),
};

const SHOP_SLOTS = [
  { rarity: "Cosmic", emptyChance: 0.9999 },
  { rarity: "Mythical", emptyChance: 0.8 }, { rarity: "Mythical", emptyChance: 0.8 },
  { rarity: "Legendary", emptyChance: 0.6 }, { rarity: "Legendary", emptyChance: 0.6 },
  { rarity: "Legendary", emptyChance: 0.6 }, { rarity: "Legendary", emptyChance: 0.6 },
  { rarity: "Epic", emptyChance: 0.5 }, { rarity: "Epic", emptyChance: 0.5 }, { rarity: "Epic", emptyChance: 0.5 },
  { rarity: "Epic", emptyChance: 0.5 }, { rarity: "Epic", emptyChance: 0.5 },
  { rarity: "Rare", emptyChance: 0.3 }, { rarity: "Rare", emptyChance: 0.3 }, { rarity: "Rare", emptyChance: 0.3 },
  { rarity: "Rare", emptyChance: 0.3 }, { rarity: "Rare", emptyChance: 0.3 }, { rarity: "Rare", emptyChance: 0.3 },
  { rarity: "Rare", emptyChance: 0.3 }, { rarity: "Rare", emptyChance: 0.3 },
];

const SHOP_REFRESH_INTERVAL_MS = 300000; // 5 min, matches client REFRESH_INTERVAL

function currentShopCycle() {
  return Math.floor(Date.now() / SHOP_REFRESH_INTERVAL_MS);
}

// Deterministic-ish generation is not required to match the client's old random shop;
// the server now OWNS the shop, so this becomes the one true generator. Called once per
// cycle and cached in the shop_cycles table (see routes/economy.js).
function generateShopDeck() {
  const cards = [];
  SHOP_SLOTS.forEach((slot, i) => {
    if (Math.random() < slot.emptyChance) return;
    const pool = SHOP_CARD_POOL[slot.rarity];
    const card = pool[Math.floor(Math.random() * pool.length)];
    if (card) cards.push({ ...card, slotIndex: i });
  });
  return cards;
}

// ---------------------------------------------------------------------------
// Gacha pools (rate = weight, not %) — ported from public/js/data/gacha-data.js
// ---------------------------------------------------------------------------
const gachaData = require("../public/js/data/gacha-data.js");
const GACHA_POOLS = gachaData.GACHA_POOLS;

function rollGachaOnce(poolId) {
  const g = GACHA_POOLS[poolId];
  if (!g) return null;
  const total = g.pool.reduce((s, c) => s + c.rate, 0);
  let r = Math.random() * total;
  for (const card of g.pool) {
    r -= card.rate;
    if (r <= 0) return card;
  }
  return g.pool[g.pool.length - 1];
}

// ---------------------------------------------------------------------------
// Equipment gacha pools — ported from public/js/data/equip-gacha.js.
// Previously this whole system (cost, weighted roll, item creation) ran only in
// the browser and wrote straight to localStorage["equipBag"] — a player could
// call gachaEquipPull() from devtools for free items, or edit the bag directly.
// This is now the only place the roll/cost/stat numbers are allowed to live;
// equip-gacha.js on the client is display-only (renders the banners) and no
// longer decides cost, randomness, or what enters the bag.
// ---------------------------------------------------------------------------
const EQUIP_GACHA_POOLS = {
  EQUIP_POOL_1: {
    cost: 60,
    pool: [
      { name: "Bronze Sword",    type: "Weapon",    stat: "atk", base: 20,  mode: "flat",    rarity: "Common",    rate: 8.00 },
      { name: "Iron Sword",      type: "Weapon",    stat: "atk", base: 50,  mode: "flat",    rarity: "Common",    rate: 6.00 },
      { name: "Steel Sword",     type: "Weapon",    stat: "atk", base: 80,  mode: "flat",    rarity: "Rare",      rate: 4.00 },
      { name: "Flaming Dagger",  type: "Weapon",    stat: "atk", base: 120, mode: "flat",    rarity: "Rare",      rate: 3.00 },
      { name: "Shadow Katana",   type: "Weapon",    stat: "atk", base: 150, mode: "flat",    rarity: "Rare",      rate: 2.50 },
      { name: "Titan Axe",       type: "Weapon",    stat: "atk", base: 200, mode: "flat",    rarity: "Epic",      rate: 1.50 },
      { name: "Obsidian Blade",  type: "Weapon",    stat: "atk", base: 250, mode: "flat",    rarity: "Epic",      rate: 1.00 },
      { name: "Dragon Slayer",   type: "Weapon",    stat: "atk", base: 300, mode: "flat",    rarity: "Legendary", rate: 0.40 },
      { name: "Celestial Sword", type: "Weapon",    stat: "atk", base: 350, mode: "flat",    rarity: "Legendary", rate: 0.25 },
      { name: "Apocalypse Axe",  type: "Weapon",    stat: "atk", base: 400, mode: "flat",    rarity: "Legendary", rate: 0.10 },
      { name: "Mystic Blade",    type: "Weapon",    stat: "atk", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Thunder Axe",     type: "Weapon",    stat: "atk", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Crystal Staff",   type: "Weapon",    stat: "atk", base: 6,   mode: "percent", rarity: "Rare",      rate: 1.80 },
      { name: "Dragon Fang",     type: "Weapon",    stat: "atk", base: 7,   mode: "percent", rarity: "Epic",      rate: 1.20 },
      { name: "Phoenix Blade",   type: "Weapon",    stat: "atk", base: 8,   mode: "percent", rarity: "Epic",      rate: 1.00 },
      { name: "Infinity Edge",   type: "Weapon",    stat: "atk", base: 19,  mode: "percent", rarity: "Legendary", rate: 0.10 },
      { name: "Wooden Shield",   type: "Armor",     stat: "def", base: 20,  mode: "flat",    rarity: "Common",    rate: 8.00 },
      { name: "Iron Shield",     type: "Armor",     stat: "def", base: 50,  mode: "flat",    rarity: "Common",    rate: 6.00 },
      { name: "Steel Armor",     type: "Armor",     stat: "def", base: 80,  mode: "flat",    rarity: "Rare",      rate: 4.00 },
      { name: "Dragon Armor",    type: "Armor",     stat: "def", base: 120, mode: "flat",    rarity: "Rare",      rate: 3.00 },
      { name: "Titan Plate",     type: "Armor",     stat: "def", base: 150, mode: "flat",    rarity: "Rare",      rate: 2.50 },
      { name: "Obsidian Mail",   type: "Armor",     stat: "def", base: 200, mode: "flat",    rarity: "Epic",      rate: 1.50 },
      { name: "Celestial Plate", type: "Armor",     stat: "def", base: 250, mode: "flat",    rarity: "Epic",      rate: 1.00 },
      { name: "Aegis Shield",    type: "Armor",     stat: "def", base: 300, mode: "flat",    rarity: "Legendary", rate: 0.40 },
      { name: "Divine Armor",    type: "Armor",     stat: "def", base: 350, mode: "flat",    rarity: "Legendary", rate: 0.25 },
      { name: "Apocalypse Plate",type: "Armor",     stat: "def", base: 40000, mode: "flat",    rarity: "Legendary", rate: 0.10 },
      { name: "Guardian Shield", type: "Armor",     stat: "def", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Dragon Mail",     type: "Armor",     stat: "def", base: 7,   mode: "percent", rarity: "Epic",      rate: 1.20 },
      { name: "Infinity Aegis",  type: "Armor",     stat: "def", base: 19,  mode: "percent", rarity: "Legendary", rate: 0.10 },
    ],
  },
  EQUIP_POOL_2: {
    cost: 80,
    pool: [
      { name: "Silver Ring",            type: "Accessory", stat: "hp", base: 20,  mode: "flat",    rarity: "Common",    rate: 8.00 },
      { name: "Ruby Necklace",          type: "Accessory", stat: "hp", base: 50,  mode: "flat",    rarity: "Common",    rate: 6.00 },
      { name: "Emerald Bracelet",       type: "Accessory", stat: "hp", base: 80,  mode: "flat",    rarity: "Rare",      rate: 4.00 },
      { name: "Sapphire Ring",          type: "Accessory", stat: "hp", base: 120, mode: "flat",    rarity: "Rare",      rate: 3.00 },
      { name: "Golden Amulet",          type: "Accessory", stat: "hp", base: 150, mode: "flat",    rarity: "Rare",      rate: 2.50 },
      { name: "Diamond Bracelet",       type: "Accessory", stat: "hp", base: 200, mode: "flat",    rarity: "Epic",      rate: 1.50 },
      { name: "Titan Ring",             type: "Accessory", stat: "hp", base: 250, mode: "flat",    rarity: "Epic",      rate: 1.00 },
      { name: "Celestial Necklace",     type: "Accessory", stat: "hp", base: 300, mode: "flat",    rarity: "Legendary", rate: 0.40 },
      { name: "Apocalypse Ring",        type: "Accessory", stat: "hp", base: 350, mode: "flat",    rarity: "Legendary", rate: 0.25 },
      { name: "Divine Amulet",          type: "Accessory", stat: "hp", base: 400, mode: "flat",    rarity: "Legendary", rate: 0.10 },
      { name: "Amethyst Pendant",       type: "Accessory", stat: "hp", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Topaz Ring",             type: "Accessory", stat: "hp", base: 6,   mode: "percent", rarity: "Rare",      rate: 1.80 },
      { name: "Celestial Locket",       type: "Accessory", stat: "hp", base: 7,   mode: "percent", rarity: "Rare",      rate: 1.60 },
      { name: "Dragon Heart Amulet",    type: "Accessory", stat: "hp", base: 8,   mode: "percent", rarity: "Epic",      rate: 1.20 },
      { name: "Phoenix Ring",           type: "Accessory", stat: "hp", base: 9,   mode: "percent", rarity: "Epic",      rate: 1.00 },
      { name: "Titan Pendant",          type: "Accessory", stat: "hp", base: 10,  mode: "percent", rarity: "Epic",      rate: 0.80 },
      { name: "Oblivion Ring",          type: "Accessory", stat: "hp", base: 11,  mode: "percent", rarity: "Epic",      rate: 0.60 },
      { name: "Eternal Pendant",        type: "Accessory", stat: "hp", base: 12,  mode: "percent", rarity: "Legendary", rate: 0.40 },
      { name: "Shadow Ring",            type: "Accessory", stat: "hp", base: 13,  mode: "percent", rarity: "Legendary", rate: 0.30 },
      { name: "Divine Pendant",         type: "Accessory", stat: "hp", base: 14,  mode: "percent", rarity: "Legendary", rate: 0.20 },
      { name: "Starlight Charm",        type: "Accessory", stat: "hp", base: 15,  mode: "percent", rarity: "Legendary", rate: 0.15 },
      { name: "Infinity Relic",         type: "Accessory", stat: "hp", base: 19,  mode: "percent", rarity: "Legendary", rate: 0.05 },
      { name: "Steel Sword",            type: "Weapon",    stat: "atk", base: 80,  mode: "flat",   rarity: "Rare",      rate: 2.00 },
      { name: "Steel Armor",            type: "Armor",     stat: "def", base: 80,  mode: "flat",   rarity: "Rare",      rate: 2.00 },
      { name: "Mystic Blade",           type: "Weapon",    stat: "atk", base: 5,   mode: "percent",rarity: "Rare",      rate: 1.00 },
      { name: "Guardian Shield",        type: "Armor",     stat: "def", base: 5,   mode: "percent",rarity: "Rare",      rate: 1.00 },
    ],
  },
};

// Matches customRound() in the old client equip-gacha.js.
function customRoundEquip(num) {
  return (num % 1) >= 0.5 ? Math.ceil(num) : Math.floor(num);
}

function rollEquipGachaOnce(poolKey) {
  const poolObj = EQUIP_GACHA_POOLS[poolKey];
  if (!poolObj) return null;
  const pool = poolObj.pool;
  const total = pool.reduce((s, it) => s + it.rate, 0);
  let r = Math.random() * total;
  let template = pool[pool.length - 1];
  for (const it of pool) {
    if (r < it.rate) { template = it; break; }
    r -= it.rate;
  }
  return {
    name: template.name,
    type: template.type,
    stat: template.stat,
    rarity: template.rarity,
    bonus: customRoundEquip(template.base),
    mode: template.mode || "flat",
  };
}

function equipGachaCost(poolKey, times) {
  const poolObj = EQUIP_GACHA_POOLS[poolKey];
  if (!poolObj) return null;
  let totalCost = poolObj.cost * times;
  if (times === 3) totalCost = Math.floor(totalCost * 0.9);
  if (times === 10) totalCost = Math.floor(totalCost * 0.8);
  return totalCost;
}

// ---------------------------------------------------------------------------
// INF mode reward/drop formulas — ported from public/js/modes/INF/inf-mode.js
// ---------------------------------------------------------------------------
const MAX_INF_STAGE = 1000;
const INF_SHARD_TYPES = ["shardGray", "shardBlue", "shardPurple", "shardGold", "shardRed", "shardSky"];
const INF_SHARD_PIECE_RANGES = [
  { min: 1, max: 99, pieces: [1, 3] },
  { min: 100, max: 222, pieces: [2, 4] },
  { min: 223, max: 500, pieces: [3, 5] },
  { min: 501, max: Infinity, pieces: [4, 5] },
];

function randIntInclusive(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function infStageReward(stage) {
  return stage * 10 + Math.floor(Math.random() * 5);
}

function infShardDrop(stage) {
  if (stage === MAX_INF_STAGE) {
    const d = {};
    INF_SHARD_TYPES.forEach(t => { d[t] = 1; });
    return d;
  }
  const range = INF_SHARD_PIECE_RANGES.find(r => stage >= r.min && stage <= r.max)
    || INF_SHARD_PIECE_RANGES[INF_SHARD_PIECE_RANGES.length - 1];
  const total = randIntInclusive(range.pieces[0], range.pieces[1]);
  const drop = {};
  for (let i = 0; i < total; i++) {
    const t = INF_SHARD_TYPES[Math.floor(Math.random() * INF_SHARD_TYPES.length)];
    drop[t] = (drop[t] || 0) + 1;
  }
  return drop;
}

// ---------------------------------------------------------------------------
// Boss reward tiers — require()'d from public/js/modes/BOSS/bossmap.js (the
// same BOSSES data the client renders from). NOTE: while these were still two
// separate copies, they had drifted — bossmap.js had a dragon tier at
// dmg:4500000 that was clearly meant to be 450000 (it sat out of order between
// the 400000 and 500000 tiers). Fixed at the source (bossmap.js) as part of
// this de-dup so both sides now use the corrected value.
// ---------------------------------------------------------------------------
const bossData = require("../public/js/modes/BOSS/bossmap.js");
const BOSS_REWARD_TIERS = bossData.BOSS_REWARD_TIERS;

// Highest-DPS-possible guess for anti-cheat plausibility check on boss claims.
// NOT precisely tuned to real combat math (that lives in skills/*.js) — treat this
// the same way MIN_MS_PER_STAGE is treated: revisit once you've measured a real
// best-case clear. Deliberately generous so legit fast clears aren't flagged.
const BOSS_MAX_DPS = 5000;

function rewardForTier(bossId, damageDone) {
  const tiers = BOSS_REWARD_TIERS[bossId];
  if (!tiers) return null;
  let best = null;
  for (const t of tiers) {
    if (damageDone >= t.dmg) best = t;
  }
  return best;
}

function rollRange(range) {
  if (!Array.isArray(range)) return Number(range) || 0;
  return randIntInclusive(range[0], range[1]);
}

// ---------------------------------------------------------------------------
// Card upgrade (shard cost) — ported from public/js/data/upgrade.js
// ---------------------------------------------------------------------------
const UPGRADE_SHARD_KEY_BY_RARITY = {
  Common: "shardGray", Rare: "shardBlue", Epic: "shardPurple",
  Legendary: "shardGold", Mythical: "shardRed", Cosmic: "shardSky",
};
const UPGRADE_SHARDS_NEEDED = 10;
const UPGRADE_MAX_LEVEL = 10;

// ---------------------------------------------------------------------------
// Card upgrade — money + success-rate path (ported from public/js/data/upgrade.js)
// This was the "phase 2" gap called out above — the client was still rolling
// the dice, deducting money, and applying stat growth entirely on its own.
// These formulas must match upgrade.js exactly or the client-side preview
// numbers will disagree with what the server actually pays out.
// ---------------------------------------------------------------------------
const UPGRADE_BASE_COST_BY_RARITY = {
  Common: 200, Rare: 450, Epic: 800, Legendary: 2000, Mythical: 4700, Cosmic: 12700,
};
const UPGRADE_SUCCESS_RATE_TABLE = { 1: 90, 2: 80, 3: 70, 4: 60, 5: 50, 6: 40, 7: 30, 8: 20, 9: 10, 10: 5 };
const UPGRADE_DUPLICATE_COST_BY_RARITY = {
  Common: 6, Rare: 5, Epic: 4, Legendary: 3, Mythical: 2, Cosmic: 1,
};

function calcUpgradeCost(card) {
  const rarity = card.rarity || "Common";
  const base = UPGRADE_BASE_COST_BY_RARITY[rarity] || 100;
  return Math.round(base * Math.pow(card.level, 1.4) * Math.pow(card.stars, 3));
}

function calcSuccessRate(card) {
  const base = UPGRADE_SUCCESS_RATE_TABLE[card.level] ?? 50;
  return Math.max(1, base - (card.stars - 1) * Math.floor(Math.pow(10, 1.1))) - 0.5;
}

function rarityStep(card) {
  if (card.rarity === "Mythical") return 1.002;
  if (card.rarity === "Cosmic") return 1.0021;
  return 1;
}

// Mutates `card` in place: applies one level-worth of stat growth. Matches
// applyLevelGrowth() in upgrade.js exactly (same formula for every class).
function applyLevelGrowth(card) {
  const r = rarityStep(card);
  const hpReal = (card.hpReal ?? card.hp) * 1.029575 * r;
  const atkReal = (card.atkReal ?? card.atk) * 1.029575 * r;
  const defReal = (card.defReal ?? card.def) * 1.029575 * r;
  card.hpReal = hpReal; card.atkReal = atkReal; card.defReal = defReal;
  card.hp = Math.round(hpReal); card.atk = Math.round(atkReal); card.def = Math.round(defReal);
}

// ---------------------------------------------------------------------------
// Shop — memory-fragment exchange path (ported from public/pages/shop.html's
// buyWithShard(), which spent memory fragments purely client-side — see
// routes/economy.js POST /shop/buy-with-shard for the server-authoritative version).
// Common has no shop listing (see SHOP_SLOTS above), so it has no memory key either.
// ---------------------------------------------------------------------------
const SHOP_MEMORY_KEY_BY_RARITY = {
  Rare: "memoryRare", Epic: "memoryEpic", Legendary: "memoryLegendary",
  Mythical: "memoryMythical", Cosmic: "memoryCosmic",
};
const SHOP_SHARD_EXCHANGE_COST = 50;

// ---------------------------------------------------------------------------
// Card SKILL upgrade (separate mechanic from the card LEVEL upgrade above —
// bumps the "Name LN" suffix in card.skill, not card.level). Ported from
// public/js/data/upgradeSkills.js's upgradeSkill(), which rolled the RNG and
// wrote bag/deck straight to localStorage client-side.
// ---------------------------------------------------------------------------
const SKILL_UPGRADE_MAX_LEVEL = 3;
const SKILL_UPGRADE_SHARD_COST_PER_LEVEL = 10; // cost = this * current level
const SKILL_UPGRADE_SUCCESS_RATE = { 1: 0.20, 2: 0.05, 3: 0.01 };

// ---------------------------------------------------------------------------
// Card selling — canonical prices. The client had TWO different price tables
// (render.js and GACHA.html) that disagreed with each other; this is now the
// only one that matters. Client-sent prices are never trusted.
// ---------------------------------------------------------------------------
const SELL_PRICE_BY_RARITY = {
  Common: 50, Rare: 500, Epic: 5000, Legendary: 30000, Mythical: 100000, Cosmic: 500000,
};
function calcSellPrice(card) {
  const base = SELL_PRICE_BY_RARITY[card.rarity] || 5;
  return base * (card.stars || 1);
}

module.exports = {
  CHARACTER_DB, getCharacterStats,
  STAGE_DROPS, STAGE_REWARDS, MIN_MS_PER_NORMAL_CLAIM,
  SHOP_CARD_POOL, SHOP_SLOTS, SHOP_REFRESH_INTERVAL_MS, currentShopCycle, generateShopDeck,
  GACHA_POOLS, rollGachaOnce,
  EQUIP_GACHA_POOLS, rollEquipGachaOnce, equipGachaCost,
  MAX_INF_STAGE, infStageReward, infShardDrop,
  BOSS_REWARD_TIERS, BOSS_MAX_DPS, rewardForTier, rollRange,
  UPGRADE_SHARD_KEY_BY_RARITY, UPGRADE_SHARDS_NEEDED, UPGRADE_MAX_LEVEL,
  UPGRADE_BASE_COST_BY_RARITY, UPGRADE_SUCCESS_RATE_TABLE, UPGRADE_DUPLICATE_COST_BY_RARITY,
  calcUpgradeCost, calcSuccessRate, applyLevelGrowth,
  SHOP_MEMORY_KEY_BY_RARITY, SHOP_SHARD_EXCHANGE_COST,
  SKILL_UPGRADE_MAX_LEVEL, SKILL_UPGRADE_SHARD_COST_PER_LEVEL, SKILL_UPGRADE_SUCCESS_RATE,
  SELL_PRICE_BY_RARITY, calcSellPrice,
};
