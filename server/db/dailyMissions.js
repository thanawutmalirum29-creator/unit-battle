// db/dailyMissions.js — call from inside another route's own transaction right
// after it does something a mission tracks (a battle win, a gacha roll, a
// shop purchase, a PvP attack, ...). Never opens its own transaction/connection —
// always reuses the caller's `client` so a mid-request crash can't record mission
// progress for an action that itself got rolled back.
//
// Bumps all three mission boards (daily / weekly / monthly) in one call, so
// every existing call site (routes/battle.js, routes/pvp.js, routes/economy.js)
// feeds the new weekly/monthly boards automatically with no changes on their
// end — only this file needed to learn about the cycle boards.
const { currentDayIndex, DAILY_MISSIONS } = require('../game-data/daily-data');
const {
  currentGuildCycle, currentMonthCycle,
  WEEKLY_MISSIONS, MONTHLY_MISSIONS,
} = require('../game-data/cycle-quest-data');

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
       VALUES ($1, $2, $3, LEAST($4::int, $5::int))
       ON CONFLICT (player_id, day_index, mission_key)
       DO UPDATE SET progress = LEAST(daily_mission_progress.progress + $4::int, $5::int)`,
      [playerId, dayIndex, m.key, amount, m.target]
    );
  }

  await bumpCycleMissionProgress(client, playerId, 'weekly', currentGuildCycle(), WEEKLY_MISSIONS, type, amount);
  await bumpCycleMissionProgress(client, playerId, 'monthly', currentMonthCycle(), MONTHLY_MISSIONS, type, amount);
}

// Same capped-upsert idea as the daily loop above, just against
// cycle_mission_progress (keyed by scope + cycle_index instead of day_index).
async function bumpCycleMissionProgress(client, playerId, scope, cycleIndex, catalog, type, amount) {
  const matching = catalog.filter((m) => m.type === type);
  for (const m of matching) {
    await client.query(
      `INSERT INTO cycle_mission_progress (player_id, scope, cycle_index, mission_key, progress)
       VALUES ($1, $2, $3, $4, LEAST($5::int, $6::int))
       ON CONFLICT (player_id, scope, cycle_index, mission_key)
       DO UPDATE SET progress = LEAST(cycle_mission_progress.progress + $5::int, $6::int)`,
      [playerId, scope, cycleIndex, m.key, amount, m.target]
    );
  }
}

module.exports = { bumpMissionProgress };
