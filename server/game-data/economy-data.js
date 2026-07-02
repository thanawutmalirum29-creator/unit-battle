// game-data/economy-data.js
//
// Server-side copy of the numbers that decide the game's economy: character stats,
// stage rewards/drops, shop prices, gacha rates/costs, boss reward tiers, upgrade costs.
//
// IMPORTANT: this is intentionally a *duplicate* of public/js/data/character-data.js,
// public/js/core/drops.js, public/js/data/shop-data.js, public/js/data/gacha-data.js,
// and the boss reward tiers in public/js/modes/BOSS/bossmap.js.
// The client-side copies still exist and are still used to *render* things (cards,
// shop UI, gacha animation), but every number that affects money/items must be
// re-computed here and trusted only from here. If you change a price/rate/reward on
// the client for display purposes, mirror the change here too or the server will pay
// out the old number. (De-duplicating into one shared file both sides `require()` is
// a good follow-up — not done yet to keep this patch smaller.)

// ---------------------------------------------------------------------------
// Character stats (source of truth for gacha/shop card stats)
// ---------------------------------------------------------------------------
const CHARACTER_DB = {
  "นักดาบฝึกหัด": { rarity: "Common", hp: 150, atk: 30, def: 15, skill: "Power Strike L1", class: "Warrior" },
  "นักธนูฝึกหัด": { rarity: "Common", hp: 115, atk: 55, def: 8, skill: "Piercing Shot L1", class: "Rogue" },
  "นักรบฝึกหัด": { rarity: "Common", hp: 200, atk: 22, def: 20, skill: "Defense Buff L1", class: "Tank" },
  "นักวางระเบิดฝึกหัด": { rarity: "Common", hp: 105, atk: 50, def: 5, skill: "Bomb L1", class: "Bomb" },
  "นักเวทย์ฝึกหัด": { rarity: "Common", hp: 110, atk: 20, def: 8, skill: "Burn L1", class: "Mage" },
  "โจรเริ่มต้น": { rarity: "Common", hp: 125, atk: 24, def: 6, skill: "Critical L1", class: "Assassin" },
  "ซามูไร": { rarity: "Rare", hp: 180, atk: 38, def: 18, skill: "Double Strike L1", class: "Warrior" },
  "ซามูไรดาบยาว": { rarity: "Rare", hp: 175, atk: 38, def: 18, skill: "AOE Attack L1", class: "Warrior" },
  "นักธนูเฉียบคม": { rarity: "Rare", hp: 149, atk: 71, def: 10, skill: "Piercing Shot L1", class: "Rogue" },
  "นักเวทย์น้ำแข็ง": { rarity: "Rare", hp: 145, atk: 26, def: 10, skill: "Freeze L1", class: "Mage" },
  "นักเวทย์ไฟ": { rarity: "Rare", hp: 143, atk: 26, def: 10, skill: "Burn L1", class: "Mage" },
  "ศิษย์นักบวร": { rarity: "Rare", hp: 156, atk: 26, def: 16, skill: "Heal L1", class: "Healer" },
  "หัวหน้าอัศวิน": { rarity: "Rare", hp: 276, atk: 30, def: 28, skill: "AOE Defense Buff L1", class: "Tank" },
  "อัศวิน": { rarity: "Rare", hp: 260, atk: 29, def: 26, skill: "Defense Buff L1", class: "Tank" },
  "โจรป่า": { rarity: "Rare", hp: 162, atk: 31, def: 8, skill: "Critical L1", class: "Assassin" },
  "ไวกิ้ง": { rarity: "Rare", hp: 195, atk: 39, def: 19, skill: "Power Strike L1", class: "Warrior" },
  "Duit": { rarity: "Epic", hp: 203, atk: 30, def: 21, skill: "AOE Heal L1", class: "Healer" },
  "คาวบอย": { rarity: "Epic", hp: 190, atk: 90, def: 13, skill: "3 hit target L1", class: "Rogue1" },
  "จอมเวทย์น้ำแข็ง": { rarity: "Epic", hp: 190, atk: 34, def: 13, skill: "Freeze L1", class: "Mage" },
  "จอมเวทย์ไฟ": { rarity: "Epic", hp: 185, atk: 34, def: 19, skill: "Burn L1", class: "Mage" },
  "ช่างทำค้อนทอง": { rarity: "Epic", hp: 200, atk: 32, def: 18, skill: "Stun L1", class: "CC" },
  "นักธนูทอง": { rarity: "Epic", hp: 194, atk: 92, def: 13, skill: "Piercing Shot L1", class: "Rogue" },
  "นักบวร": { rarity: "Epic", hp: 203, atk: 34, def: 21, skill: "Heal L1", class: "Healer" },
  "นักวางพิษ": { rarity: "Epic", hp: 203, atk: 40, def: 18, skill: "Poison L1", class: "Trickster" },
  "นักอัญเชิญ": { rarity: "Epic", hp: 220, atk: 17, def: 13, skill: "Summon L1", class: "Summoner" },
  "ผู้ชำระ": { rarity: "Epic", hp: 200, atk: 34, def: 18, skill: "Cleanse L1", class: "Helper" },
  "มือระเบิด": { rarity: "Epic", hp: 177, atk: 84, def: 8, skill: "Bomb L1", class: "Bomb" },
  "รองเผ่าไวกิ้ง": { rarity: "Epic", hp: 253, atk: 51, def: 25, skill: "Power Strike L1", class: "Warrior" },
  "อัศวินปราณ": { rarity: "Epic", hp: 338, atk: 38, def: 34, skill: "AOE Defense Buff L1", class: "Tank" },
  "แม่ทัพธนู": { rarity: "Epic", hp: 205, atk: 98, def: 14, skill: "3 hit target L1", class: "Rogue" },
  "แม่ทัพอัศวิน": { rarity: "Epic", hp: 359, atk: 39, def: 36, skill: "Aoe Defense Buff L1", class: "Tank" },
  "แม่มด": { rarity: "Epic", hp: 200, atk: 34, def: 18, skill: "Silence L1", class: "Helper" },
  "แม่มดเวลา": { rarity: "Epic", hp: 200, atk: 34, def: 18, skill: "Energy Boost L1", class: "Helper" },
  "แวมไพร์100ปี": { rarity: "Epic", hp: 211, atk: 40, def: 10, skill: "Lifesteal L1", class: "Assassin" },
  "Angle": { rarity: "Legendary", hp: 264, atk: 39, def: 27, skill: "AOE Heal L1", class: "Healer" },
  "Bandit": { rarity: "Legendary", hp: 252, atk: 120, def: 17, skill: "3 hit target L1", class: "Rogue1" },
  "ท่านแม่ทัพสงคราม": { rarity: "Legendary", hp: 439, atk: 49, def: 4, skill: "Berserk L1", class: "Tank" },
  "นักดาบคู่": { rarity: "Legendary", hp: 329, atk: 66, def: 32, skill: "Double Strike L1", class: "Warrior" },
  "นักบวชศักสิทธิ์": { rarity: "Legendary", hp: 264, atk: 44, def: 27, skill: "Heal L1", class: "Healer" },
  "นักลอบสังหาร": { rarity: "Legendary", hp: 274, atk: 52, def: 13, skill: "Critical L1", class: "Assassin" },
  "นักวางระเบิด": { rarity: "Legendary", hp: 230, atk: 109, def: 10, skill: "Bomb L1", class: "Bomb" },
  "นักวางเพลิง": { rarity: "Legendary", hp: 264, atk: 44, def: 23, skill: "Burn L1", class: "Trickster" },
  "นักเวทย์ขาว": { rarity: "Legendary", hp: 264, atk: 44, def: 23, skill: "Cleanse L1", class: "Healer" },
  "นินจา": { rarity: "Legendary", hp: 1050, atk: 85, def: 28, skill: "Piercing Shot L1", class: "Rogue2" },
  "ผู้ชำนาญพิษ": { rarity: "Legendary", hp: 264, atk: 52, def: 23, skill: "Poison L1", class: "Trickster" },
  "ผู้ฝึกเวลา": { rarity: "Legendary", hp: 274, atk: 44, def: 23, skill: "Time Stop L1", class: "CC" },
  "ผู้ใช้ค้อนสายรุ้ง": { rarity: "Legendary", hp: 260, atk: 42, def: 23, skill: "Stun L1", class: "CC" },
  "พ่อมดเวลา": { rarity: "Legendary", hp: 264, atk: 44, def: 23, skill: "Energy Boost L1", class: "Healer" },
  "ศาสตร์อัญเชิญ": { rarity: "Legendary", hp: 286, atk: 22, def: 17, skill: "Summon L1", class: "Summoner" },
  "หัวหน้าเผ่าไวกิ้ง": { rarity: "Legendary", hp: 329, atk: 66, def: 32, skill: "AOE Defense Buff L1", class: "Warrior" },
  "แวมไพร์1000ปี": { rarity: "Legendary", hp: 274, atk: 52, def: 13, skill: "Lifesteal L2", class: "Assassin" },
};

function getCharacterStats(name) {
  const base = CHARACTER_DB[name];
  if (!base) return null;
  return { name, ...base };
}

// ---------------------------------------------------------------------------
// Stage rewards / drops (NORMAL mode) — ported from public/js/core/drops.js
// ---------------------------------------------------------------------------
const STAGE_DROPS = {
  1: { shardGray: 1 }, 2: { shardGray: 1 }, 3: { shardGray: 1 }, 4: { shardGray: 1 },
  5: { shardBlue: 1, shardGray: 2 }, 6: { shardGray: 1 }, 7: { shardGray: 1 }, 8: { shardGray: 1 },
  9: { shardGray: 1 }, 10: { shardBlue: 1, shardGray: 3 }, 11: { shardGray: 1 }, 12: { shardGray: 1 },
  13: { shardGray: 1 }, 14: { shardGray: 1 }, 15: { shardBlue: 1, shardGray: 3 }, 16: { shardGray: 2 },
  17: { shardGray: 2 }, 18: { shardGray: 2 }, 19: { shardGray: 2 }, 20: { shardBlue: 2, shardGray: 4 },
  21: { shardGray: 2 }, 22: { shardGray: 2 }, 23: { shardGray: 2 }, 24: { shardGray: 2 },
  25: { shardBlue: 2, shardGray: 4 }, 26: { shardGray: 2 }, 27: { shardGray: 2 }, 28: { shardGray: 2 },
  29: { shardGray: 2 }, 30: { shardBlue: 2, shardGray: 5 }, 31: { shardGray: 3 }, 32: { shardGray: 3 },
  33: { shardGray: 3 }, 34: { shardGray: 3 }, 35: { shardBlue: 3, shardGray: 6 }, 36: { shardGray: 3 },
  37: { shardGray: 3 }, 38: { shardGray: 3 }, 39: { shardGray: 3 }, 40: { shardBlue: 3, shardGray: 6 },
  41: { shardGray: 3 }, 42: { shardGray: 3 }, 43: { shardGray: 3 }, 44: { shardGray: 3 },
  45: { shardBlue: 3, shardGray: 7 }, 46: { shardGray: 4 }, 47: { shardGray: 4 }, 48: { shardGray: 4 },
  49: { shardGray: 4 }, 50: { shardBlue: 4, shardGray: 8 }, 51: { shardGray: 4 }, 52: { shardGray: 4 },
  53: { shardGray: 4 }, 54: { shardGray: 4 }, 55: { shardBlue: 4, shardGray: 8 }, 56: { shardGray: 4 },
  57: { shardGray: 4 }, 58: { shardGray: 4 }, 59: { shardGray: 4 }, 60: { shardBlue: 4, shardGray: 8 },
  61: { shardGray: 5 }, 62: { shardGray: 5 }, 63: { shardGray: 5 }, 64: { shardGray: 5 },
  65: { shardBlue: 5, shardGray: 9 }, 66: { shardGray: 5 }, 67: { shardGray: 5 }, 68: { shardGray: 5 },
  69: { shardGray: 5 }, 70: { shardBlue: 5, shardGray: 9 }, 71: { shardGray: 5 }, 72: { shardGray: 5 },
  73: { shardGray: 5 }, 74: { shardGray: 5 }, 75: { shardBlue: 5, shardGray: 9 }, 76: { shardGray: 6 },
  77: { shardGray: 6 }, 78: { shardGray: 6 }, 79: { shardGray: 6 }, 80: { shardBlue: 6, shardGray: 10 },
  81: { shardGray: 6 }, 82: { shardGray: 6 }, 83: { shardGray: 6 }, 84: { shardGray: 6 },
  85: { shardBlue: 6, shardGray: 10 }, 86: { shardGray: 6 }, 87: { shardGray: 6 }, 88: { shardGray: 6 },
  89: { shardGray: 6 }, 90: { shardBlue: 6, shardGray: 10 }, 91: { shardGray: 7 }, 92: { shardGray: 7 },
  93: { shardGray: 7 }, 94: { shardGray: 7 }, 95: { shardBlue: 7, shardGray: 11 }, 96: { shardGray: 7 },
  97: { shardGray: 7 }, 98: { shardGray: 7 }, 99: { shardGray: 7 }, 100: { shardBlue: 7, shardGray: 11 },
  101: { shardGray: 7 }, 102: { shardGray: 7 }, 103: { shardGray: 7 }, 104: { shardGray: 7 },
  105: { shardBlue: 7, shardGray: 11 }, 106: { shardGray: 8 }, 107: { shardGray: 8 }, 108: { shardGray: 8 },
  109: { shardGray: 8 }, 110: { shardBlue: 8, shardGray: 12 }, 111: { shardGray: 8 }, 112: { shardGray: 8 },
  113: { shardGray: 8 }, 114: { shardGray: 8 }, 115: { shardBlue: 8, shardGray: 12 }, 116: { shardGray: 8 },
  117: { shardGray: 8 }, 118: { shardGray: 8 }, 119: { shardGray: 8 }, 120: { shardBlue: 8, shardGray: 12 },
  121: { shardGray: 9 }, 122: { shardGray: 9 }, 123: { shardGray: 9 }, 124: { shardGray: 9 },
  125: { shardBlue: 9, shardGray: 13 }, 126: { shardGray: 9 }, 127: { shardGray: 9 }, 128: { shardGray: 9 },
  129: { shardGray: 9 }, 130: { shardBlue: 9, shardGray: 13 }, 131: { shardGray: 9 }, 132: { shardGray: 9 },
  133: { shardGray: 9 }, 134: { shardGray: 9 }, 135: { shardBlue: 9, shardGray: 13 }, 136: { shardGray: 10 },
  137: { shardGray: 10 }, 138: { shardGray: 10 }, 139: { shardGray: 10 }, 140: { shardBlue: 10, shardGray: 14 },
  141: { shardGray: 10 }, 142: { shardGray: 10 }, 143: { shardGray: 10 }, 144: { shardGray: 10 },
  145: { shardBlue: 10, shardGray: 14 },
};

const STAGE_REWARDS = {};
(function buildStageRewards() {
  const explicit = { 1: 25, 2: 50, 3: 75, 4: 100, 5: 300, 10: 500, 15: 750 };
  for (let s = 1; s <= 145; s++) {
    if (explicit[s] !== undefined) { STAGE_REWARDS[s] = explicit[s]; continue; }
    if (s <= 45) { STAGE_REWARDS[s] = 100 + (s - 4) * 50; continue; } // matches original hand-authored ramp closely
    STAGE_REWARDS[s] = 2700 + (s - 45) * 100;
  }
  // Exact hand-authored values for the < 46 range (kept literal, safer than formula-guessing)
  Object.assign(STAGE_REWARDS, {
    1: 25, 2: 50, 3: 75, 4: 100, 5: 300, 6: 150, 7: 175, 8: 200, 9: 225, 10: 500,
    11: 275, 12: 300, 13: 325, 14: 350, 15: 750, 16: 400, 17: 450, 18: 500, 19: 550, 20: 600,
    21: 650, 22: 700, 23: 750, 24: 800, 25: 850, 26: 900, 27: 950, 28: 1000, 29: 1100, 30: 1200,
    31: 1300, 32: 1400, 33: 1500, 34: 1600, 35: 1700, 36: 1800, 37: 1900, 38: 2000, 39: 2100, 40: 2200,
    41: 2300, 42: 2400, 43: 2500, 44: 2600, 45: 2700,
  });
})();

const MIN_MS_PER_NORMAL_CLAIM = 3000; // matches middleware/anticheat.js MIN_MS_PER_STAGE

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
function buildCard(name, rate) {
  const stats = getCharacterStats(name);
  if (!stats) return null;
  return { ...stats, rate };
}

function pool(entries) {
  return entries.map(([name, rate]) => buildCard(name, rate)).filter(Boolean);
}

const GACHA_POOLS = {
  GACHA10011: { cost: 100, pool: pool([
    ["อัศวิน", 2], ["นักเวทย์ไฟ", 2],
    ["นักรบฝึกหัด", 16], ["นักธนูฝึกหัด", 16], ["นักเวทย์ฝึกหัด", 16], ["โจรเริ่มต้น", 16],
    ["นักวางระเบิดฝึกหัด", 16], ["นักดาบฝึกหัด", 16],
  ]) },
  GACHA10012: { cost: 500, pool: pool([
    ["หัวหน้าอัศวิน", 2], ["อัศวิน", 2], ["นักเวทย์ไฟ", 2], ["นักธนูเฉียบคม", 2], ["ศิษย์นักบวร", 2],
    ["นักรบฝึกหัด", 15], ["นักธนูฝึกหัด", 15], ["นักเวทย์ฝึกหัด", 15], ["โจรเริ่มต้น", 15],
    ["นักวางระเบิดฝึกหัด", 15], ["นักดาบฝึกหัด", 15],
  ]) },
  GACHA20011: { cost: 2000, pool: pool([
    ["อัศวินปราณ", 0.9], ["นักบวร", 0.9], ["นักธนูทอง", 0.9], ["แวมไพร์100ปี", 0.9],
    ["หัวหน้าอัศวิน", 1.2], ["นักเวทย์ไฟ", 1.2], ["นักเวทย์น้ำแข็ง", 1.2], ["อัศวิน", 1.2],
    ["นักธนูเฉียบคม", 1.2], ["ศิษย์นักบวร", 1.2], ["ซามูไร", 1.2], ["ซามูไรดาบยาว", 1.2], ["ไวกิ้ง", 1.2], ["โจรป่า", 1.2],
    ["นักรบฝึกหัด", 14.066], ["นักธนูฝึกหัด", 14.066], ["นักเวทย์ฝึกหัด", 14.066], ["โจรเริ่มต้น", 14.066],
    ["นักวางระเบิดฝึกหัด", 14.066], ["นักดาบฝึกหัด", 14.066],
  ]) },
  GACHA20012: { cost: 6000, pool: pool([
    ["มือระเบิด", 0.6666], ["นักวางพิษ", 0.6666], ["อัศวินปราณ", 0.6666], ["นักบวร", 0.6666], ["นักธนูทอง", 0.6666],
    ["แวมไพร์100ปี", 0.6666], ["Duit", 0.6666], ["จอมเวทย์ไฟ", 0.6666], ["จอมเวทย์น้ำแข็ง", 0.6666],
    ["หัวหน้าอัศวิน", 1.5], ["นักเวทย์ไฟ", 1.5], ["นักเวทย์น้ำแข็ง", 1.5], ["อัศวิน", 1.5], ["นักธนูเฉียบคม", 1.5],
    ["ศิษย์นักบวร", 1.5], ["ซามูไร", 1.5], ["ซามูไรดาบยาว", 1.5], ["ไวกิ้ง", 1.5], ["โจรป่า", 1.5],
    ["นักรบฝึกหัด", 13.166], ["นักธนูฝึกหัด", 13.166], ["นักเวทย์ฝึกหัด", 13.166], ["โจรเริ่มต้น", 13.166],
    ["นักวางระเบิดฝึกหัด", 13.166], ["นักดาบฝึกหัด", 13.166],
  ]) },
  GACHA20013: { cost: 19000, pool: pool([
    ["คาวบอย", 0.6], ["มือระเบิด", 0.6], ["นักวางพิษ", 0.6], ["อัศวินปราณ", 0.6], ["นักบวร", 0.6], ["นักธนูทอง", 0.6],
    ["แวมไพร์100ปี", 0.6], ["Duit", 0.6], ["จอมเวทย์ไฟ", 0.6], ["จอมเวทย์น้ำแข็ง", 0.6], ["รองเผ่าไวกิ้ง", 0.6],
    ["ช่างทำค้อนทอง", 0.6], ["แม่ทัพอัศวิน", 0.6], ["แม่มด", 0.6], ["แม่มดเวลา", 0.6], ["ผู้ชำระ", 0.6],
    ["นักอัญเชิญ", 0.6], ["แม่ทัพธนู", 0.6],
    ["หัวหน้าอัศวิน", 4.92], ["นักเวทย์ไฟ", 4.92], ["นักเวทย์น้ำแข็ง", 4.92], ["อัศวิน", 4.92], ["นักธนูเฉียบคม", 4.92],
    ["ศิษย์นักบวร", 4.92], ["ซามูไร", 4.92], ["ซามูไรดาบยาว", 4.92], ["ไวกิ้ง", 4.92], ["โจรป่า", 4.92],
    ["นักรบฝึกหัด", 6.666], ["นักธนูฝึกหัด", 6.666], ["นักเวทย์ฝึกหัด", 6.666], ["โจรเริ่มต้น", 6.666],
    ["นักวางระเบิดฝึกหัด", 6.666], ["นักดาบฝึกหัด", 6.666],
  ]) },
  GACHA30011: { cost: 50000, pool: pool([
    ["Angle", 0.3333], ["ผู้ชำนาญพิษ", 0.3333], ["นักดาบคู่", 0.3333],
    ["คาวบอย", 1], ["มือระเบิด", 1], ["นักวางพิษ", 1], ["อัศวินปราณ", 1], ["นักบวร", 1], ["นักธนูทอง", 1],
    ["แวมไพร์100ปี", 1], ["Duit", 1], ["จอมเวทย์ไฟ", 1], ["จอมเวทย์น้ำแข็ง", 1], ["รองเผ่าไวกิ้ง", 1],
    ["ช่างทำค้อนทอง", 1], ["แม่ทัพอัศวิน", 1], ["แม่มด", 1], ["แม่มดเวลา", 1], ["ผู้ชำระ", 1], ["นักอัญเชิญ", 1], ["แม่ทัพธนู", 1],
    ["หัวหน้าอัศวิน", 8.1], ["นักเวทย์ไฟ", 8.1], ["นักเวทย์น้ำแข็ง", 8.1], ["อัศวิน", 8.1], ["นักธนูเฉียบคม", 8.1],
    ["ศิษย์นักบวร", 8.1], ["ซามูไร", 8.1], ["ซามูไรดาบยาว", 8.1], ["ไวกิ้ง", 8.1], ["โจรป่า", 8.1],
  ]) },
  GACHA30012: { cost: 150000, pool: pool([
    ["Angle", 0.5], ["ผู้ชำนาญพิษ", 0.5], ["นักดาบคู่", 0.5], ["หัวหน้าเผ่าไวกิ้ง", 0.5], ["นักลอบสังหาร", 0.5],
    ["ท่านแม่ทัพสงคราม", 0.5], ["นักวางระเบิด", 0.5], ["นักบวชศักสิทธิ์", 0.5], ["ศาสตร์อัญเชิญ", 0.5],
    ["คาวบอย", 1], ["มือระเบิด", 1], ["นักวางพิษ", 1], ["อัศวินปราณ", 1], ["นักบวร", 1], ["นักธนูทอง", 1],
    ["แวมไพร์100ปี", 1], ["Duit", 1], ["จอมเวทย์ไฟ", 1], ["จอมเวทย์น้ำแข็ง", 1], ["รองเผ่าไวกิ้ง", 1],
    ["ช่างทำค้อนทอง", 1], ["แม่ทัพอัศวิน", 1], ["แม่มด", 1], ["แม่มดเวลา", 1], ["ผู้ชำระ", 1], ["นักอัญเชิญ", 1], ["แม่ทัพธนู", 1],
    ["หัวหน้าอัศวิน", 7.75], ["นักเวทย์ไฟ", 7.75], ["นักเวทย์น้ำแข็ง", 7.75], ["อัศวิน", 7.75], ["นักธนูเฉียบคม", 7.75],
    ["ศิษย์นักบวร", 7.75], ["ซามูไร", 7.75], ["ซามูไรดาบยาว", 7.75], ["ไวกิ้ง", 7.75], ["โจรป่า", 7.75],
  ]) },
  GACHA30013: { cost: 400000, pool: pool([
    ["Angle", 0.5], ["ผู้ชำนาญพิษ", 0.5], ["นักดาบคู่", 0.5], ["หัวหน้าเผ่าไวกิ้ง", 0.5], ["นักลอบสังหาร", 0.5],
    ["ท่านแม่ทัพสงคราม", 0.5], ["นักวางระเบิด", 0.5], ["นักบวชศักสิทธิ์", 0.5], ["ศาสตร์อัญเชิญ", 0.5], ["พ่อมดเวลา", 0.5],
    ["Bandit", 0.5], ["นักเวทย์ขาว", 0.5], ["นักวางเพลิง", 0.5], ["นินจา", 0.5], ["ผู้ใช้ค้อนสายรุ้ง", 0.5],
    ["แวมไพร์1000ปี", 0.5], ["ผู้ฝึกเวลา", 0.5],
    ["คาวบอย", 1], ["มือระเบิด", 1], ["นักวางพิษ", 1], ["อัศวินปราณ", 1], ["นักบวร", 1], ["นักธนูทอง", 1],
    ["แวมไพร์100ปี", 1], ["Duit", 1], ["จอมเวทย์ไฟ", 1], ["จอมเวทย์น้ำแข็ง", 1], ["รองเผ่าไวกิ้ง", 1],
    ["ช่างทำค้อนทอง", 1], ["แม่ทัพอัศวิน", 1], ["แม่มด", 1], ["แม่มดเวลา", 1], ["ผู้ชำระ", 1], ["นักอัญเชิญ", 1], ["แม่ทัพธนู", 1],
    ["หัวหน้าอัศวิน", 7.35], ["นักเวทย์ไฟ", 7.35], ["นักเวทย์น้ำแข็ง", 7.35], ["อัศวิน", 7.35], ["นักธนูเฉียบคม", 7.35],
    ["ศิษย์นักบวร", 7.35], ["ซามูไร", 7.35], ["ซามูไรดาบยาว", 7.35], ["ไวกิ้ง", 7.35], ["โจรป่า", 7.35],
  ]) },
};

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
      { name: "Apocalypse Plate",type: "Armor",     stat: "def", base: 400, mode: "flat",    rarity: "Legendary", rate: 0.10 },
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
// Boss reward tiers — ported from public/js/modes/BOSS/bossmap.js
// NOTE: only the reward tiers were ported (damage thresholds -> reward), not the
// enemy stat blocks (not needed for payouts). Keep this in sync if bossmap.js changes.
// ---------------------------------------------------------------------------
const BOSS_REWARD_TIERS = {
  slime: [
    { dmg: 300, money: [50, 100], items: { shardGray: [1, 2] } },
    { dmg: 1000, money: [100, 200], items: { shardGray: [1, 2] } },
    { dmg: 3000, money: [200, 400], items: { shardGray: [1, 2] } },
    { dmg: 5000, money: [400, 800], items: { shardGray: [1, 2] } },
    { dmg: 10000, money: [800, 1200], items: { shardGray: [2, 4] } },
    { dmg: 13000, money: [1200, 1500], items: { shardGray: [2, 4] } },
    { dmg: 15000, money: [1500, 1800], items: { shardGray: [1, 4], shardBlue: [1, 1] } },
    { dmg: 20000, money: [1800, 2200], items: { shardGray: [1, 4], shardBlue: [1, 1] } },
    { dmg: 24000, money: [2200, 2400], items: { shardGray: [1, 4], shardBlue: [1, 2] } },
    { dmg: 39000, money: [2400, 2800], items: { shardGray: [1, 4], shardBlue: [1, 3] } },
    { dmg: 44000, money: [2800, 3200], items: { shardGray: [1, 4], shardBlue: [1, 4] } },
    { dmg: 49000, money: [3200, 3800], items: { shardGray: [1, 4], shardBlue: [1, 5] } },
    { dmg: 55555, money: [3800, 4200], items: { shardGray: [1, 4], shardBlue: [2, 3] } },
    { dmg: 60000, money: [4200, 4500], items: { shardGray: [1, 4], shardBlue: [2, 4] } },
    { dmg: 70000, money: [3800, 4200], items: { shardGray: [1, 4], shardBlue: [2, 4], shardPurple: [1, 1] } },
    { dmg: 80000, money: [3800, 4200], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 2] } },
    { dmg: 90000, money: [4200, 4800], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 3] } },
    { dmg: 100000, money: [4800, 5200], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 3] } },
    { dmg: 120000, money: [5200, 5800], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [2, 4] } },
    { dmg: 130000, money: [3800, 4200], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 4] } },
    { dmg: 140000, money: [4200, 4800], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 4] } },
    { dmg: 150000, money: [4800, 6000], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 4] } },
    { dmg: 160000, money: [6000, 8000], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 4] } },
    { dmg: 170000, money: [8000, 10000], items: { shardGray: [1, 4], shardBlue: [1, 4], shardPurple: [1, 4] } },
    { dmg: 200000, money: [10000, 20000], items: { shardGray: [1, 5], shardBlue: [1, 5], shardPurple: [1, 5] } },
  ],
  dragon: [
    { dmg: 1000, money: [300, 500], items: { shardBlue: [1, 2] } },
    { dmg: 1500, money: [500, 1000], items: { shardBlue: [1, 3] } },
    { dmg: 4000, money: [1000, 1800], items: { shardBlue: [1, 4] } },
    { dmg: 8000, money: [1800, 3000], items: { shardBlue: [2, 4] } },
    { dmg: 13000, money: [3000, 5000], items: { shardBlue: [1, 4], shardPurple: [1, 2] } },
    { dmg: 18000, money: [5000, 10000], items: { shardBlue: [1, 4], shardPurple: [1, 3] } },
    { dmg: 23000, money: [10000, 15000], items: { shardBlue: [1, 4], shardPurple: [1, 3] } },
    { dmg: 30000, money: [15000, 23000], items: { shardBlue: [1, 4], shardPurple: [1, 4] } },
    { dmg: 35000, money: [23000, 30000], items: { shardBlue: [1, 4], shardPurple: [2, 4] } },
    { dmg: 40000, money: [30000, 40000], items: { shardBlue: [1, 4], shardPurple: [1, 4], shardGold: [1, 2] } },
    { dmg: 55555, money: [40000, 50000], items: { shardBlue: [1, 4], shardPurple: [1, 4], shardGold: [1, 3] } },
    { dmg: 70000, money: [50000, 80000], items: { shardBlue: [1, 4], shardPurple: [1, 4], shardGold: [1, 4] } },
    { dmg: 100000, money: [80000, 110000], items: { shardBlue: [1, 4], shardPurple: [1, 4], shardGold: [2, 4] } },
    { dmg: 140000, money: [110000, 150000], items: { shardBlue: [2, 5], shardPurple: [2, 5], shardGold: [2, 5] } },
    { dmg: 180000, money: [150000, 200000], items: { shardBlue: [2, 6], shardPurple: [2, 6], shardGold: [2, 6] } },
    { dmg: 220000, money: [200000, 500000], items: { shardBlue: [3, 6], shardPurple: [3, 6], shardGold: [3, 6] } },
    { dmg: 250000, money: [500000, 1000000], items: { shardBlue: [3, 6], shardPurple: [3, 6], shardGold: [3, 6], shardRed: [1, 2] } },
    { dmg: 300000, money: [1000000, 1400000], items: { shardBlue: [3, 6], shardPurple: [3, 6], shardGold: [3, 6], shardRed: [1, 3] } },
    { dmg: 350000, money: [1400000, 1800000], items: { shardBlue: [3, 6], shardPurple: [3, 6], shardGold: [3, 6], shardRed: [1, 4] } },
    { dmg: 400000, money: [1800000, 2200000], items: { shardBlue: [3, 6], shardPurple: [3, 6], shardGold: [3, 6], shardRed: [2, 4] } },
    { dmg: 450000, money: [2200000, 2500000], items: { shardBlue: [3, 6], shardPurple: [3, 6], shardGold: [3, 6], shardRed: [2, 5] } },
    { dmg: 500000, money: [2500000, 3000000], items: { shardBlue: [3, 6], shardPurple: [3, 6], shardGold: [3, 6], shardRed: [2, 6] } },
  ],
  golem: [
    { dmg: 8000, money: [500, 800], items: { shardGray: [3, 5] } },
    { dmg: 20000, money: [1200, 1800], items: { shardGold: [1, 2] } },
    { dmg: 40000, money: [2500, 4000], items: { shardGold: [2, 3], shardRed: [1, 2] } },
  ],
};
BOSS_REWARD_TIERS["เทพเจ้า"] = BOSS_REWARD_TIERS.golem; // bossmap.js gives it identical tiers to golem

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
