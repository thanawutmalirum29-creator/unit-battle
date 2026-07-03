// routes/progress.js — for NORMAL mode, where stages are picked individually
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { MIN_MS_PER_STAGE } = require('../middleware/anticheat');

const router = express.Router();

// POST /api/progress/normal-clear { playerId, stage }
// Accepts the clear only if it's at most one stage ahead of what's already recorded
// (prevents calling this directly with a huge stage number to fake progress).
//
// This is done as a single atomic UPSERT instead of "SELECT current -> check -> UPDATE",
// because two concurrent requests for the same player (double-click, client retry on a
// slow network) could otherwise both read the same max_stage, both pass the order check,
// and let progress jump further than it should.
//
// BUG FIX: this route (unlike INF mode's /api/runs/:id/stage-clear, see anticheat.js)
// had no timing check at all — only "stage <= current+1". Nothing stopped a client from
// calling this in a tight loop with no delay, walking max_stage from 0 to hundreds of
// stages in well under a second. Because /api/economy/claim/normal trusts this table's
// max_stage as proof a stage was actually cleared, that let a player instantly unlock
// (and then, via their real authenticated session, claim money for) every NORMAL stage
// without ever playing them. Now enforced with the same MIN_MS_PER_STAGE gate INF runs
// already use, measured against this row's own updated_at (one bump per elapsed stage).
router.post('/normal-clear', asyncHandler(async (req, res) => {
  const { playerId, stage } = req.body || {};
  const stageNum = Number(stage);
  if (!playerId || !Number.isInteger(stageNum) || stageNum < 1) {
    return res.status(400).json({ error: 'invalid input' });
  }

  // Ensure a progress row exists, then attempt the bump atomically:
  // only succeeds (UPDATE branch) when stageNum is exactly current+1 or stageNum <= current
  // (re-clearing an already-cleared stage is a harmless no-op, not an error), AND enough
  // time has passed since the last recorded clear for this player.
  await pool.query(
    `INSERT INTO normal_progress (player_id, max_stage) VALUES ($1, 0)
     ON CONFLICT (player_id) DO NOTHING`,
    [playerId]
  );

  const before = await pool.query(`SELECT max_stage, updated_at FROM normal_progress WHERE player_id = $1`, [playerId]);
  const currentStage = before.rows[0]?.max_stage ?? 0;
  const lastUpdatedAt = before.rows[0]?.updated_at ? new Date(before.rows[0].updated_at).getTime() : 0;

  // Only the "advance by one" case needs throttling — re-reporting a stage already at
  // or below current is a harmless no-op and shouldn't be rate-limited.
  if (stageNum === currentStage + 1 && Date.now() - lastUpdatedAt < MIN_MS_PER_STAGE) {
    return res.status(429).json({ error: 'stage cleared faster than physically possible' });
  }

  const { rows } = await pool.query(
    `UPDATE normal_progress
     SET max_stage = GREATEST(max_stage, $2), updated_at = now()
     WHERE player_id = $1 AND $2 <= max_stage + 1
     RETURNING max_stage`,
    [playerId, stageNum]
  );

  if (rows.length === 0) {
    // either the row vanished (shouldn't happen) or stageNum was too far ahead
    const current = await pool.query(`SELECT max_stage FROM normal_progress WHERE player_id = $1`, [playerId]);
    const maxStage = current.rows[0]?.max_stage ?? 0;
    return res.status(400).json({ error: `stage out of order: already at ${maxStage}, got ${stageNum}` });
  }

  res.json({ ok: true, maxStage: rows[0].max_stage });
}));

// GET /api/progress/inf/:playerId
// Best-ever validated INF stage for this player — used to render the
// checkpoint-start buttons (every 25 stages) in inf.html.
router.get('/inf/:playerId', asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const { rows } = await pool.query(`SELECT max_stage FROM inf_progress WHERE player_id = $1`, [playerId]);
  res.json({ maxStage: rows[0]?.max_stage ?? 0 });
}));

// GET /api/progress/normal-leaderboard
router.get('/normal-leaderboard', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.username, np.max_stage, np.updated_at
     FROM normal_progress np
     JOIN players p ON p.id = np.player_id
     ORDER BY np.max_stage DESC, np.updated_at ASC
     LIMIT 50`
  );
  res.json(rows);
}));

module.exports = router;
