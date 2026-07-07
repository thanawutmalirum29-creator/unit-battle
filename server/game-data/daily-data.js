// game-data/daily-data.js — server-authoritative numbers for daily login streak
// + daily missions (routes/daily.js). Kept separate from routes/daily.js the same
// way game-data/economy-data.js is kept separate from routes/economy.js — numbers
// can be retuned here without touching request-handling logic.

// ---------------------------------------------------------------------------
// "Game day" boundary: resets at 04:00 Thailand time (UTC+7), same convention
// as currentGameDayStart()/currentGuildCycle() in game-data/guild-data.js.
// Not imported from there directly so this file (and routes/daily.js) has no
// dependency on the guild system — the math is duplicated on purpose, same
// small formula either place.
// ---------------------------------------------------------------------------
const THAILAND_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAILY_RESET_HOUR_MS = 4 * 60 * 60 * 1000; // 04:00
const DAY_MS = 24 * 60 * 60 * 1000;

// Integer that increments once per game day — stable identity for "today"
// used as the key for both daily_login_state.last_claim_day and
// daily_mission_progress.day_index.
function currentDayIndex() {
  const thaiNow = Date.now() + THAILAND_UTC_OFFSET_MS;
  return Math.floor((thaiNow - DAILY_RESET_HOUR_MS) / DAY_MS);
}

// When the given game day rolls over to the next one (real UTC Date, ISO string)
// — shown to the client as a countdown/"resets at" label.
function dayIndexEndsAt(dayIndex) {
  const thaiDayStart = dayIndex * DAY_MS + DAILY_RESET_HOUR_MS;
  const utcDayStart = thaiDayStart - THAILAND_UTC_OFFSET_MS;
  return new Date(utcDayStart + DAY_MS).toISOString();
}

// ---------------------------------------------------------------------------
// Daily login — 7-day reward cycle. streak 1..7 maps 1:1, streak 8 wraps back
// to the streak-1 reward, streak 15 also wraps to streak-1, etc. (see
// loginRewardForStreak below) so the streak keeps counting up forever
// (total_claims mirrors it) while the actual payout just repeats every week.
// ---------------------------------------------------------------------------
const LOGIN_REWARD_CYCLE = [
  { day: 1, money: 500, bagKey: null, bagQty: 0 },
  { day: 2, money: 800, bagKey: 'shardGray', bagQty: 20 },
  { day: 3, money: 1200, bagKey: 'shardBlue', bagQty: 10 },
  { day: 4, money: 1500, bagKey: 'memoryRare', bagQty: 10 },
  { day: 5, money: 2000, bagKey: 'shardPurple', bagQty: 5 },
  { day: 6, money: 2500, bagKey: 'memoryEpic', bagQty: 5 },
  { day: 7, money: 5000, bagKey: 'shardGold', bagQty: 5 }, // weekly capstone reward
];

function loginRewardForStreak(streak) {
  const idx = (Math.max(1, streak) - 1) % LOGIN_REWARD_CYCLE.length;
  return LOGIN_REWARD_CYCLE[idx];
}

// ---------------------------------------------------------------------------
// Daily missions — a fixed set active every game day (progress rows are keyed
// by day_index, so they naturally reset to 0/undone at the next 04:00
// rollover without any cron job). `type` is what db/dailyMissions.js
// bumpMissionProgress() matches against when a route reports progress.
// ---------------------------------------------------------------------------
const DAILY_MISSIONS = [
  {
    key: 'win_battle_3', type: 'win_battle', target: 3,
    label: 'ชนะการต่อสู้ 3 ครั้ง (โหมดใดก็ได้)',
    money: 300, bagKey: 'shardGray', bagQty: 5,
  },
  {
    key: 'win_battle_10', type: 'win_battle', target: 10,
    label: 'ชนะการต่อสู้ 10 ครั้ง (โหมดใดก็ได้)',
    money: 800, bagKey: 'shardBlue', bagQty: 5,
  },
  {
    key: 'gacha_roll_1', type: 'gacha_roll', target: 1,
    label: 'สุ่มตัวละคร (กาชา) 1 ครั้ง',
    money: 200, bagKey: null, bagQty: 0,
  },
  {
    key: 'shop_buy_1', type: 'shop_buy', target: 1,
    label: 'ซื้อการ์ดจากร้านค้า 1 ครั้ง',
    money: 200, bagKey: null, bagQty: 0,
  },
  {
    key: 'pvp_attack_1', type: 'pvp_attack', target: 1,
    label: 'โจมตีในสมรภูมิจัดอันดับ 1 ครั้ง',
    money: 300, bagKey: 'memoryRare', bagQty: 5,
  },
];

// Extra reward for clearing every mission above in the same game day.
const DAILY_BONUS_ALL = { money: 1000, bagKey: 'memoryEpic', bagQty: 3 };

function findMission(key) {
  return DAILY_MISSIONS.find((m) => m.key === key) || null;
}

module.exports = {
  currentDayIndex, dayIndexEndsAt,
  LOGIN_REWARD_CYCLE, loginRewardForStreak,
  DAILY_MISSIONS, DAILY_BONUS_ALL, findMission,
};
