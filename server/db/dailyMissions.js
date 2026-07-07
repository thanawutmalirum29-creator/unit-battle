// db/dailyMissions.js — call from inside another route's own transaction right
// after it does something a daily mission tracks (a battle win, a gacha roll, a
// shop purchase, a PvP attack, ...). Never opens its own transaction/connection —
// always reuses the caller's `client` so a mid-request crash can't record mission
// progress for an action that itself got rolled back.
const { currentDayIndex, DAILY_MISSIONS } = require('../game-data/daily-data');

// Bumps every active mission of the given `type` by `amount` (default 1),
// capped at that mission's target — so calling this more times than needed
// (or with a bigger amount than intended) can never let a mission "overshoot"
// into a claimable state it hasn't actually earned.
async function bumpMissionProgress(client, playerId, type, amount = 1) {
  const dayIndex = currentDayIndex();
  const matching = DAILY_MISSIONS.filter((m) => m.type === type);
  for (const m of matching) {
    await client.query(
      `INSERT INTO daily_mission_progress (player_id, day_index, mission_key, progress)
       VALUES ($1, $2, $3, LEAST($4, $5))
       ON CONFLICT (player_id, day_index, mission_key)
       DO UPDATE SET progress = LEAST(daily_mission_progress.progress + $4, $5)`,
      [playerId, dayIndex, m.key, amount, m.target]
    );
  }
}

module.exports = { bumpMissionProgress };
