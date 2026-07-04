// game-data/cosmetics-data.js
//
// Profile cosmetics shown on the account page (and anywhere else a player's
// profile appears): "ปก" (avatar icon) and "กรอบปก" (avatar frame).
//
//   AVATAR_CATALOG — freely selectable, no unlock condition. Just a picture
//   the player likes; players.avatar_icon stores the chosen key.
//
//   FRAME_CATALOG  — two ways to get one:
//     source: 'achievement' — same idea as game-data/badges-data.js: unlocked
//       status is always DERIVED LIVE from real server-known stats, never
//       stored. Harder achievement = higher tier = flashier frame ("ยิ่งยาก
//       ยิ่งเท่"). Reuses the exact same stats routes/players.js already
//       computes for badges (computePlayerBadgeStats), so no new stat
//       plumbing is needed.
//     source: 'guild_shop' — sold in the guild shop for contribution points
//       (see game-data/guild-data.js GUILD_SHOP_CATALOG rewardFrameKey
//       items). Ownership IS persisted (players.owned_frames) since it's a
//       one-time purchase, not a live-derived stat.
//
// A player can have only ONE frame equipped at a time (players.equipped_frame),
// unlike badges (up to MAX_EQUIPPED_BADGES).
// -----------------------------------------------------------------------------

const AVATAR_CATALOG = [
  { key: 'shield', icon: '🛡️', name: 'โล่นักรบ' },
  { key: 'sword', icon: '⚔️', name: 'ดาบคู่' },
  { key: 'dragon', icon: '🐉', name: 'มังกร' },
  { key: 'wolf', icon: '🐺', name: 'หมาป่า' },
  { key: 'eagle', icon: '🦅', name: 'อินทรี' },
  { key: 'fire', icon: '🔥', name: 'เปลวเพลิง' },
  { key: 'ice', icon: '❄️', name: 'น้ำแข็ง' },
  { key: 'lightning', icon: '⚡', name: 'สายฟ้า' },
  { key: 'star', icon: '⭐', name: 'ดวงดาว' },
  { key: 'moon', icon: '🌙', name: 'จันทรา' },
  { key: 'crown', icon: '👑', name: 'มงกุฎ' },
  { key: 'skull', icon: '💀', name: 'กะโหลก' },
  { key: 'ghost', icon: '👻', name: 'วิญญาณ' },
  { key: 'demon', icon: '😈', name: 'ปีศาจ' },
  { key: 'angel', icon: '😇', name: 'เทวทูต' },
  { key: 'robot', icon: '🤖', name: 'จักรกล' },
  { key: 'alien', icon: '👽', name: 'เอเลี่ยน' },
  { key: 'ninja', icon: '🥷', name: 'นินจา' },
  { key: 'wizard', icon: '🧙', name: 'จอมเวท' },
  { key: 'genie', icon: '🧞', name: 'ยักษ์จินนี่' },
];

function findAvatar(key) {
  return AVATAR_CATALOG.find((a) => a.key === key) || null;
}

// tier is purely cosmetic (border color/glow), same 1-4 scale as badge tiers.
const FRAME_CATALOG = [
  // --- ด่านเนื้อเรื่อง (normalStage) ---
  { key: 'frame_stage_30', source: 'achievement', category: 'stage', tier: 1, name: 'กรอบนักผจญภัย', desc: 'ผ่านด่านที่ 30 ในโหมดเนื้อเรื่อง', stat: 'normalStage', min: 30 },
  { key: 'frame_stage_80', source: 'achievement', category: 'stage', tier: 2, name: 'กรอบนักรบผู้กล้า', desc: 'ผ่านด่านที่ 80 ในโหมดเนื้อเรื่อง', stat: 'normalStage', min: 80 },
  { key: 'frame_stage_145', source: 'achievement', category: 'stage', tier: 4, name: 'กรอบผู้พิชิตบัลลังก์จักรวาล', desc: 'ผ่านด่านสุดท้าย (145) ในโหมดเนื้อเรื่อง', stat: 'normalStage', min: 145 },

  // --- โหมดไม่สิ้นสุด (infStage) ---
  { key: 'frame_inf_100', source: 'achievement', category: 'inf', tier: 2, name: 'กรอบนักท่องนิรันดร์', desc: 'ไปถึงด่านที่ 100 ในโหมดไม่สิ้นสุด', stat: 'infStage', min: 100 },
  { key: 'frame_inf_300', source: 'achievement', category: 'inf', tier: 4, name: 'กรอบเจ้าแห่งมิติไม่สิ้นสุด', desc: 'ไปถึงด่านที่ 300 ในโหมดไม่สิ้นสุด', stat: 'infStage', min: 300 },

  // --- กิลด์ (guildLevel) ---
  { key: 'frame_guild_20', source: 'achievement', category: 'guild', tier: 2, name: 'กรอบเสาหลักกิลด์', desc: 'อยู่ในกิลด์ที่มีเลเวล 20 ขึ้นไป', stat: 'guildLevel', min: 20 },
  { key: 'frame_guild_40', source: 'achievement', category: 'guild', tier: 3, name: 'กรอบผู้พิทักษ์กิลด์', desc: 'อยู่ในกิลด์ที่มีเลเวลสูงสุด (40 ขึ้นไป)', stat: 'guildLevel', min: 40 },

  // --- บอสกิลด์ (bossDamageLifetime) ---
  { key: 'frame_boss_1m', source: 'achievement', category: 'boss', tier: 2, name: 'กรอบผู้สังหารเงามืด', desc: 'สร้างดาเมจสะสมให้บอสกิลด์ 1,000,000', stat: 'bossDamageLifetime', min: 1000000 },
  { key: 'frame_boss_5m', source: 'achievement', category: 'boss', tier: 3, name: 'กรอบตำนานผู้พิฆาต', desc: 'สร้างดาเมจสะสมให้บอสกิลด์ 5,000,000', stat: 'bossDamageLifetime', min: 5000000 },

  // --- อันดับลีดเดอร์บอร์ด ---
  { key: 'frame_leaderboard_top10', source: 'achievement', category: 'rank', tier: 3, name: 'กรอบตำนานลีดเดอร์บอร์ด', desc: 'เคยติดอันดับ Top 10 ในลีดเดอร์บอร์ดโหมดใดก็ได้', stat: 'leaderboardTop10', min: 1 },

  // --- ร้านค้ากิลด์ (see game-data/guild-data.js GUILD_SHOP_CATALOG) ---
  { key: 'frame_guild_shop_dragon', source: 'guild_shop', category: 'guild_shop', tier: 3, name: 'กรอบมังกรทองกิลด์', desc: 'ซื้อได้ในร้านค้ากิลด์' },
  { key: 'frame_guild_shop_phoenix', source: 'guild_shop', category: 'guild_shop', tier: 4, name: 'กรอบฟีนิกซ์เพลิงกิลด์', desc: 'ซื้อได้ในร้านค้ากิลด์' },
];

function findFrame(key) {
  return FRAME_CATALOG.find((f) => f.key === key) || null;
}

// stats: same shape as badges-data.js computeUnlockedBadgeKeys expects
// ({ normalStage, infStage, guildLevel, bossDamageLifetime, contributionLifetime, leaderboardTop10 }).
// Only considers source:'achievement' entries — guild_shop frames are never
// "unlocked" this way, only owned (see owned_frames on the players table).
function computeUnlockedAchievementFrameKeys(stats) {
  const s = stats || {};
  return FRAME_CATALOG
    .filter((f) => f.source === 'achievement')
    .filter((f) => (f.stat === 'leaderboardTop10' ? !!s.leaderboardTop10 : Number(s[f.stat] || 0) >= f.min))
    .map((f) => f.key);
}

module.exports = {
  AVATAR_CATALOG, findAvatar,
  FRAME_CATALOG, findFrame,
  computeUnlockedAchievementFrameKeys,
};
