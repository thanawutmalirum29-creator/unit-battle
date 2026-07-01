// routes/progress.js — for NORMAL mode, where stages are picked individually
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// POST /api/progress/normal-clear { playerId, stage }
// Accepts the clear only if it's at most one stage ahead of what's already recorded
// (prevents calling this directly with a huge stage number to fake progress).
//
// This is done as a single atomic UPSERT instead of "SELECT current -> check -> UPDATE",
// because two concurrent requests for the same player (double-click, client retry on a
// slow network) could otherwise both read the same max_stage, both pass the order check,
// and let progress jump further than it should.
router.post('/normal-clear', asyncHandler(async (req, res) => {
  const { playerId, stage } = req.body || {};
  const stageNum = Number(stage);
  if (!playerId || !Number.isInteger(stageNum) || stageNum < 1) {
    return res.status(400).json({ error: 'invalid input' });
  }

  // Ensure a progress row exists, then attempt the bump atomically:
  // only succeeds (UPDATE branch) when stageNum is exactly current+1 or stageNum <= current
  // (re-clearing an already-cleared stage is a harmless no-op, not an error).
  await pool.query(
    `INSERT INTO normal_progress (player_id, max_stage) VALUES ($1, 0)
     ON CONFLICT (player_id) DO NOTHING`,
    [playerId]
  );

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
