// game-data/cycle-quest-data.js — server-authoritative numbers for the
// weekly + monthly quest boards (routes/daily.js /weekly/* and /monthly/*).
// Deliberately the SAME shape/pattern as game-data/daily-data.js's
// DAILY_MISSIONS + DAILY_BONUS_ALL — just a bigger target, a bigger reward,
// and a longer-lived cycle key instead of day_index. `type` still matches
// what db/dailyMissions.js reports progress for (win_battle, gacha_roll,
// shop_buy, pvp_attack, ...), so every existing route that already calls
// bumpMissionProgress() feeds these boards too with zero changes on its end
// — see db/dailyMissions.js.

// ---------------------------------------------------------------------------
// Weekly cycle: reuses the exact same Sunday-04:00-Thailand week the guild
// system already runs on (game-data/guild-data.js currentGuildCycle /
// guildCycleEndsAt) — no reason to invent a second weekly clock.
// ---------------------------------------------------------------------------
const { currentGuildCycle, guildCycleEndsAt } = require('./guild-data');

// ---------------------------------------------------------------------------
// Monthly cycle: calendar month in Thailand time, rolling over on the 1st at
// 04:00 (same "game day" boundary convention as everywhere else, just at
// month granularity instead of day/week). Not a rolling 30-day window.
// ---------------------------------------------------------------------------
const THAILAND_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAILY_RESET_HOUR_MS = 4 * 60 * 60 * 1000; // 04:00

// Unique increasing integer, one per calendar month (year*12 + month).
// Subtracting the 04:00 reset hour before reading the calendar means the
// first ~4 hours of the 1st still count as the previous month's cycle —
// same trick currentDayIndex()/currentGuildCycle() use at day/week grain.
function currentMonthCycle() {
  const adjusted = new Date(Date.now() + THAILAND_UTC_OFFSET_MS - DAILY_RESET_HOUR_MS);
  return adjusted.getUTCFullYear() * 12 + adjusted.getUTCMonth();
}
// Start (as a real UTC Date) of a given monthly cycle number.
function monthCycleStartsAt(cycle) {
  const year = Math.floor(cycle / 12);
  const month = cycle % 12;
  const thaiWallMs = Date.UTC(year, month, 1, 4, 0, 0, 0); // month,1 04:00 Thai wall-clock
  return new Date(thaiWallMs - THAILAND_UTC_OFFSET_MS);
}
function monthCycleEndsAt(cycle) {
  return monthCycleStartsAt(cycle + 1).toISOString();
}

// ---------------------------------------------------------------------------
// Weekly missions — same `type`s daily missions use, just larger targets
// accumulated over the whole week. Rewards sit above the 7-day sum of
// showing up for dailies alone, so the board is worth doing on top of them,
// not just a slower duplicate.
// ---------------------------------------------------------------------------
const WEEKLY_MISSIONS = [
  {
    key: 'w_win_battle_20', type: 'win_battle', target: 20,
    label: 'ชนะการต่อสู้ 20 ครั้งภายในสัปดาห์นี้ (โหมดใดก็ได้)',
    money: 2000, bagKey: 'shardBlue', bagQty: 15,
  },
  {
    key: 'w_win_battle_60', type: 'win_battle', target: 60,
    label: 'ชนะการต่อสู้ 60 ครั้งภายในสัปดาห์นี้ (โหมดใดก็ได้)',
    money: 6000, bagKey: 'shardPurple', bagQty: 10,
  },
  {
    key: 'w_gacha_roll_10', type: 'gacha_roll', target: 10,
    label: 'สุ่มตัวละคร (กาชา) 10 ครั้งภายในสัปดาห์นี้',
    money: 1500, bagKey: 'memoryRare', bagQty: 10,
  },
  {
    key: 'w_shop_buy_10', type: 'shop_buy', target: 10,
    label: 'ซื้อการ์ดจากร้านค้า 10 ครั้งภายในสัปดาห์นี้',
    money: 1500, bagKey: 'shardGold', bagQty: 5,
  },
  {
    key: 'w_pvp_attack_10', type: 'pvp_attack', target: 10,
    label: 'โจมตีในสมรภูมิจัดอันดับ 10 ครั้งภายในสัปดาห์นี้',
    money: 2500, bagKey: 'memoryEpic', bagQty: 5,
  },
];
const WEEKLY_BONUS_ALL = { money: 8000, bagKey: 'shardGold', bagQty: 10 };

// ---------------------------------------------------------------------------
// Monthly missions — the biggest, slowest board. Targets roughly ~4-5x the
// weekly ones (a full month of consistent play, not just one good week).
// ---------------------------------------------------------------------------
const MONTHLY_MISSIONS = [
  {
    key: 'm_win_battle_100', type: 'win_battle', target: 100,
    label: 'ชนะการต่อสู้ 100 ครั้งภายในเดือนนี้ (โหมดใดก็ได้)',
    money: 10000, bagKey: 'shardPurple', bagQty: 20,
  },
  {
    key: 'm_win_battle_300', type: 'win_battle', target: 300,
    label: 'ชนะการต่อสู้ 300 ครั้งภายในเดือนนี้ (โหมดใดก็ได้)',
    money: 25000, bagKey: 'shardGold', bagQty: 15,
  },
  {
    key: 'm_gacha_roll_40', type: 'gacha_roll', target: 40,
    label: 'สุ่มตัวละคร (กาชา) 40 ครั้งภายในเดือนนี้',
    money: 8000, bagKey: 'memoryEpic', bagQty: 15,
  },
  {
    key: 'm_shop_buy_40', type: 'shop_buy', target: 40,
    label: 'ซื้อการ์ดจากร้านค้า 40 ครั้งภายในเดือนนี้',
    money: 8000, bagKey: 'shardGold', bagQty: 10,
  },
  {
    key: 'm_pvp_attack_40', type: 'pvp_attack', target: 40,
    label: 'โจมตีในสมรภูมิจัดอันดับ 40 ครั้งภายในเดือนนี้',
    money: 12000, bagKey: 'memoryLegendary', bagQty: 5,
  },
];
const MONTHLY_BONUS_ALL = { money: 40000, bagKey: 'shardRed', bagQty: 15 };

function findCycleMission(scope, key) {
  const catalog = scope === 'monthly' ? MONTHLY_MISSIONS : WEEKLY_MISSIONS;
  return catalog.find((m) => m.key === key) || null;
}

module.exports = {
  currentMonthCycle, monthCycleEndsAt,
  currentGuildCycle, guildCycleEndsAt, // re-exported so routes/daily.js has one import site for both cycles
  WEEKLY_MISSIONS, WEEKLY_BONUS_ALL,
  MONTHLY_MISSIONS, MONTHLY_BONUS_ALL,
  findCycleMission,
};
