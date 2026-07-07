// game-data/pvp-data.js
//
// Server-authoritative numbers for the PvP Ranked Arena ("สมรภูมิจัดอันดับ").
// Kept separate from routes/pvp.js the same way game-data/economy-data.js is
// kept separate from routes/economy.js — numbers can be retuned here without
// touching request-handling logic.

const START_RATING = 1000;
const SEASON_DURATION_DAYS = 30;
const DAILY_FREE_ATTACKS = 5;
const ATTACK_COOLDOWN_MINUTES = 10; // can't hit the same defender again within this window
const MAX_BATTLE_ROUNDS = 60; // safety cap — engine always terminates well before this in practice

// Bag currency awarded per attack + at season end — see player_economy.bag.
const PVP_MEDAL_KEY = 'pvpMedal';

// ---------------------------------------------------------------------------
// Tiers: continuous rating bands, each (except the top) split into 3 equal
// divisions (III lowest -> I highest) for display, mirroring the division
// conventions of mobile ranked ladders (Arena of Valor / Mobile Legends style).
// ---------------------------------------------------------------------------
const PVP_TIERS = [
  { key: 'bronze',   name: 'ทองแดง',   icon: '🥉', min: 0 },
  { key: 'silver',   name: 'เงิน',      icon: '🥈', min: 1000 },
  { key: 'gold',     name: 'ทอง',       icon: '🥇', min: 1200 },
  { key: 'platinum', name: 'แพลทินัม', icon: '💠', min: 1400 },
  { key: 'diamond',  name: 'เพชร',      icon: '💎', min: 1600 },
  { key: 'master',   name: 'มาสเตอร์', icon: '🔱', min: 1800 },
  { key: 'legend',   name: 'ตำนาน',    icon: '👑', min: 2000 },
];
const DIVISION_LABELS = ['III', 'II', 'I']; // index 0 = bottom of tier, 2 = top

function tierIndexForRating(rating) {
  for (let i = PVP_TIERS.length - 1; i >= 0; i--) {
    if (rating >= PVP_TIERS[i].min) return i;
  }
  return 0;
}

// Returns { key, name, icon, division (string|null), label } for a given rating.
// division/label are null-division ("") for the uncapped top tier (Legend) —
// standing there is shown by global rank instead of a division number.
function rankInfo(rating) {
  const idx = tierIndexForRating(rating);
  const tier = PVP_TIERS[idx];
  const next = PVP_TIERS[idx + 1];
  if (!next) {
    return { key: tier.key, name: tier.name, icon: tier.icon, division: null, label: `${tier.icon} ${tier.name}` };
  }
  const width = next.min - tier.min;
  const pos = Math.min(width - 1, Math.max(0, rating - tier.min));
  const divSize = width / 3;
  const divIndex = Math.min(2, Math.floor(pos / divSize));
  const division = DIVISION_LABELS[divIndex];
  return { key: tier.key, name: tier.name, icon: tier.icon, division, label: `${tier.icon} ${tier.name} ${division}` };
}

// ---------------------------------------------------------------------------
// Elo-style rating math. K is higher during a player's first 10 placement
// matches each season (faster to find their true level), then settles down.
// ---------------------------------------------------------------------------
const K_PLACEMENT = 48;
const K_NORMAL = 28;
const PLACEMENT_GAMES = 10;
const STREAK_BONUS_PER_WIN = 2; // extra rating per streak-win beyond the 2nd, only on a win
const STREAK_BONUS_CAP = 10;

function kFactor(gamesPlayed) {
  return gamesPlayed < PLACEMENT_GAMES ? K_PLACEMENT : K_NORMAL;
}

function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// Computes both sides' rating deltas for one resolved attack.
// attacker/defender: { rating, gamesPlayed, winStreak } (winStreak = attacker's
// streak BEFORE this battle). Returns { attackerDelta, defenderDelta, streakBonus }.
function computeEloDeltas({ attackerRating, defenderRating, attackerGames, defenderGames, attackerWinStreak, win }) {
  const scoreForAttacker = win ? 1 : 0;
  const expA = expectedScore(attackerRating, defenderRating);
  const kA = kFactor(attackerGames);
  const kD = kFactor(defenderGames);

  let attackerDelta = Math.round(kA * (scoreForAttacker - expA));
  const defenderDelta = Math.round(kD * ((1 - scoreForAttacker) - (1 - expA)));

  let streakBonus = 0;
  if (win) {
    const streakAfter = (attackerWinStreak || 0) + 1;
    if (streakAfter >= 3) streakBonus = Math.min(STREAK_BONUS_CAP, (streakAfter - 2) * STREAK_BONUS_PER_WIN);
    attackerDelta += streakBonus;
  }

  return { attackerDelta, defenderDelta, streakBonus };
}

// ---------------------------------------------------------------------------
// Per-attack rewards (money + medals), independent of season-end rewards.
// ---------------------------------------------------------------------------
const ATTACK_REWARDS = {
  win:  { money: 1000, medals: 12 },
  lose: { money: 250,  medals: 4 },
};
// Small consolation credited to the DEFENDER via mailbox — so being attacked
// while offline isn't purely a loss with nothing to show for it.
const DEFENSE_REWARDS = {
  successfulDefense: { money: 150, medals: 5 },
  lostDefense:       { money: 80,  medals: 2 },
};

// ---------------------------------------------------------------------------
// Season-end rewards: rank brackets (best) layered over flat per-tier rewards
// (everyone else) — delivered as mailbox rows, one per player, at season close.
// ---------------------------------------------------------------------------
const RANK_REWARD_BRACKETS = [
  { maxRank: 1,   money: 100000, medals: 500, subject: '🏆 แชมป์สมรภูมิประจำซีซั่น!' },
  { maxRank: 3,   money: 60000,  medals: 300, subject: '🥈 ท็อป 3 สมรภูมิ' },
  { maxRank: 10,  money: 35000,  medals: 200, subject: '🎖️ ท็อป 10 สมรภูมิ' },
  { maxRank: 50,  money: 20000,  medals: 120, subject: '⭐ ท็อป 50 สมรภูมิ' },
  { maxRank: 100, money: 12000,  medals: 80,  subject: '🎗️ ท็อป 100 สมรภูมิ' },
];
const TIER_SEASON_REWARDS = {
  legend:   { money: 15000, medals: 100 },
  master:   { money: 9000,  medals: 70 },
  diamond:  { money: 6000,  medals: 50 },
  platinum: { money: 4000,  medals: 35 },
  gold:     { money: 2500,  medals: 20 },
  silver:   { money: 1500,  medals: 12 },
  bronze:   { money: 800,   medals: 6 },
};

// Returns { money, medals, subject } — the best applicable reward for a final
// standing (bracket reward if it beats the flat tier reward, tier reward otherwise).
function seasonRewardFor(finalRank, tierKey) {
  const tierReward = TIER_SEASON_REWARDS[tierKey] || TIER_SEASON_REWARDS.bronze;
  const bracket = RANK_REWARD_BRACKETS.find(b => finalRank <= b.maxRank);
  if (bracket && bracket.money >= tierReward.money) {
    return { money: bracket.money, medals: bracket.medals, subject: bracket.subject };
  }
  const tierInfo = PVP_TIERS.find(t => t.key === tierKey) || PVP_TIERS[0];
  return { money: tierReward.money, medals: tierReward.medals, subject: `${tierInfo.icon} รางวัลจบซีซั่น — ระดับ${tierInfo.name}` };
}

module.exports = {
  START_RATING, SEASON_DURATION_DAYS, DAILY_FREE_ATTACKS, ATTACK_COOLDOWN_MINUTES, MAX_BATTLE_ROUNDS,
  PVP_MEDAL_KEY, PVP_TIERS, rankInfo, tierIndexForRating,
  kFactor, expectedScore, computeEloDeltas,
  ATTACK_REWARDS, DEFENSE_REWARDS, RANK_REWARD_BRACKETS, TIER_SEASON_REWARDS, seasonRewardFor,
};
