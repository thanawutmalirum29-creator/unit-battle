// game-data/badges-data.js
//
// Achievement medals / rank tags shown on the account page ("บัญชีของฉัน").
// Every badge is unlocked automatically once the player's real, server-known
// stats cross its threshold — nothing here can be granted by the client.
// Players may EQUIP up to MAX_EQUIPPED_BADGES of their unlocked badges at a
// time to show off (see routes/players.js GET/PUT /api/players/badges).
//
// Adding a new badge later = add one entry below + (if it needs a new stat)
// wire that stat into computePlayerBadgeStats() in routes/players.js. No
// schema change needed — unlocked status is always derived, never stored.
// -----------------------------------------------------------------------------

const MAX_EQUIPPED_BADGES = 3;

// category = grouping shown in the UI. tier = 1..N within a category, just
// for sort order (higher tier = harder to get).
const BADGE_CATALOG = [
  // --- ด่านเนื้อเรื่อง (NORMAL mode progress, normal_progress.max_stage) ---
  { key: 'stage_20', category: 'stage', tier: 1, icon: '⚔️', name: 'นักผจญภัย', desc: 'ผ่านด่านที่ 20 ในโหมดเนื้อเรื่อง', stat: 'normalStage', min: 20 },
  { key: 'stage_60', category: 'stage', tier: 2, icon: '🛡️', name: 'นักรบผู้กล้า', desc: 'ผ่านด่านที่ 60 ในโหมดเนื้อเรื่อง', stat: 'normalStage', min: 60 },
  { key: 'stage_100', category: 'stage', tier: 3, icon: '👑', name: 'จอมทัพ', desc: 'ผ่านด่านที่ 100 ในโหมดเนื้อเรื่อง', stat: 'normalStage', min: 100 },
  { key: 'stage_145', category: 'stage', tier: 4, icon: '🌌', name: 'ผู้พิชิตบัลลังก์จักรวาล', desc: 'ผ่านด่านสุดท้าย (145) ในโหมดเนื้อเรื่อง', stat: 'normalStage', min: 145 },

  // --- โหมดไม่สิ้นสุด (INF mode progress, inf_progress.max_stage) ---
  { key: 'inf_50', category: 'inf', tier: 1, icon: '♾️', name: 'นักท่องนิรันดร์', desc: 'ไปถึงด่านที่ 50 ในโหมดไม่สิ้นสุด', stat: 'infStage', min: 50 },
  { key: 'inf_150', category: 'inf', tier: 2, icon: '♾️', name: 'ผู้พิชิตอนันต์', desc: 'ไปถึงด่านที่ 150 ในโหมดไม่สิ้นสุด', stat: 'infStage', min: 150 },
  { key: 'inf_300', category: 'inf', tier: 3, icon: '♾️', name: 'เจ้าแห่งมิติไม่สิ้นสุด', desc: 'ไปถึงด่านที่ 300 ในโหมดไม่สิ้นสุด', stat: 'infStage', min: 300 },

  // --- กิลด์ (guild level, via current guild membership) ---
  { key: 'guild_5', category: 'guild', tier: 1, icon: '🏰', name: 'สมาชิกกิลด์', desc: 'อยู่ในกิลด์ที่มีเลเวล 5 ขึ้นไป', stat: 'guildLevel', min: 5 },
  { key: 'guild_20', category: 'guild', tier: 2, icon: '🏰', name: 'เสาหลักกิลด์', desc: 'อยู่ในกิลด์ที่มีเลเวล 20 ขึ้นไป', stat: 'guildLevel', min: 20 },
  { key: 'guild_35', category: 'guild', tier: 3, icon: '🏰', name: 'ผู้พิทักษ์กิลด์', desc: 'อยู่ในกิลด์ที่มีเลเวล 35 ขึ้นไป', stat: 'guildLevel', min: 35 },

  // --- บอสกิลด์ (guild_members.boss_damage_lifetime) ---
  { key: 'boss_100k', category: 'boss', tier: 1, icon: '🐉', name: 'นักล่าบอส', desc: 'สร้างดาเมจสะสมให้บอสกิลด์ 100,000', stat: 'bossDamageLifetime', min: 100000 },
  { key: 'boss_1m', category: 'boss', tier: 2, icon: '🐉', name: 'ผู้สังหารเงามืด', desc: 'สร้างดาเมจสะสมให้บอสกิลด์ 1,000,000', stat: 'bossDamageLifetime', min: 1000000 },
  { key: 'boss_5m', category: 'boss', tier: 3, icon: '🐉', name: 'ตำนานผู้พิฆาต', desc: 'สร้างดาเมจสะสมให้บอสกิลด์ 5,000,000', stat: 'bossDamageLifetime', min: 5000000 },

  // --- การบริจาคกิลด์ (guild_members.contribution_lifetime) ---
  { key: 'donate_500', category: 'donate', tier: 1, icon: '💰', name: 'ผู้สนับสนุนกิลด์', desc: 'สะสมแต้มคอนทริบิวชันตลอดกาล 500', stat: 'contributionLifetime', min: 500 },
  { key: 'donate_5000', category: 'donate', tier: 2, icon: '💎', name: 'ผู้อุปถัมภ์ใหญ่', desc: 'สะสมแต้มคอนทริบิวชันตลอดกาล 5,000', stat: 'contributionLifetime', min: 5000 },

  // --- อันดับลีดเดอร์บอร์ด (top-10 finish in any mode, ever) ---
  { key: 'leaderboard_top10', category: 'rank', tier: 1, icon: '🏆', name: 'ตำนานลีดเดอร์บอร์ด', desc: 'เคยติดอันดับ Top 10 ในลีดเดอร์บอร์ดโหมดใดก็ได้', stat: 'leaderboardTop10', min: 1 },
];

function findBadge(key) {
  return BADGE_CATALOG.find((b) => b.key === key) || null;
}

// stats: { normalStage, infStage, guildLevel, bossDamageLifetime, contributionLifetime, leaderboardTop10 }
// leaderboardTop10 is a boolean; everything else is a number. Missing stats
// are treated as 0/false, so a badge simply never unlocks rather than throwing.
function computeUnlockedBadgeKeys(stats) {
  const s = stats || {};
  return BADGE_CATALOG
    .filter((b) => (b.stat === 'leaderboardTop10' ? !!s.leaderboardTop10 : Number(s[b.stat] || 0) >= b.min))
    .map((b) => b.key);
}

module.exports = { MAX_EQUIPPED_BADGES, BADGE_CATALOG, findBadge, computeUnlockedBadgeKeys };
