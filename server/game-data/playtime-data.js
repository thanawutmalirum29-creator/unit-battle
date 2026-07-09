// game-data/playtime-data.js — server-authoritative numbers for the
// heartbeat-tracked "total time online" system. Premium avatar frames/badges
// (game-data/cosmetics-data.js + badges-data.js, category 'playtime') are
// unlocked from this — real accumulated foreground time, NOT the same thing
// as the simpler login-streak frames/badges (category 'login'), which stay
// keyed off daily_login_state.total_claims (just showing up and claiming,
// see routes/daily.js). Playtime is meant to be the harder-to-fake, more
// premium track: you actually have to have the game open.
//
// player_playtime.total_online_seconds (db/schema.sql) is credited by
// POST /api/players/heartbeat — see routes/players.js. The route NEVER
// trusts a client-reported duration; it only ever credits the real
// wall-clock gap between this heartbeat and the player's own previously
// stored one, capped at HEARTBEAT_MAX_CREDIT_SECONDS. That cap is what
// stops a long-idle tab / backgrounded app / sleeping phone / a client that
// simply stops calling for an hour from getting credited as if the game had
// stayed open the whole gap — the client can't get MORE credit by sending
// heartbeats less often, and can't get credit for time it wasn't actually
// sending them.

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;  // flat 30-day "month" unit for milestone math, not a calendar month
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

// Client (public/js/core/api.js heartbeat(), called from the existing 20s
// setInterval in that same file) is expected to call roughly this often
// while the game is open AND in the foreground.
const HEARTBEAT_INTERVAL_SECONDS = 20;
// Cap on elapsed time credited per heartbeat call — a little over 2x the
// expected interval to comfortably absorb normal network/timer jitter
// without opening the door to crediting long unattended gaps.
const HEARTBEAT_MAX_CREDIT_SECONDS = 45;

// Thresholds premium playtime frames/badges are checked against — see
// game-data/cosmetics-data.js FRAME_CATALOG and game-data/badges-data.js
// BADGE_CATALOG, both category 'playtime'.
const PLAYTIME_MILESTONE_DAY = SECONDS_PER_DAY;       // 1 day accumulated online
const PLAYTIME_MILESTONE_MONTH = SECONDS_PER_MONTH;   // 30 days accumulated online
const PLAYTIME_MILESTONE_YEAR = SECONDS_PER_YEAR;     // 365 days accumulated online

// Breaks a total-seconds count into a human "X ปี Y เดือน Z วัน" style
// breakdown for display (account page) — greedy, largest unit first. Uses
// the same flat 30-day-month/365-day-year units as the milestones above, so
// the displayed breakdown and the unlock thresholds always agree.
function breakdownPlaytime(totalSeconds) {
  let remaining = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const years = Math.floor(remaining / SECONDS_PER_YEAR);
  remaining -= years * SECONDS_PER_YEAR;
  const months = Math.floor(remaining / SECONDS_PER_MONTH);
  remaining -= months * SECONDS_PER_MONTH;
  const days = Math.floor(remaining / SECONDS_PER_DAY);
  remaining -= days * SECONDS_PER_DAY;
  const hours = Math.floor(remaining / 3600);
  return { years, months, days, hours };
}

module.exports = {
  SECONDS_PER_DAY, SECONDS_PER_MONTH, SECONDS_PER_YEAR,
  HEARTBEAT_INTERVAL_SECONDS, HEARTBEAT_MAX_CREDIT_SECONDS,
  PLAYTIME_MILESTONE_DAY, PLAYTIME_MILESTONE_MONTH, PLAYTIME_MILESTONE_YEAR,
  breakdownPlaytime,
};
