// routes/progress.js — for NORMAL mode, where stages are picked individually
const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/progress/normal-clear { playerId, stage }
// Accepts the clear only if it's at most one stage ahead of what's already recorded
// (prevents calling this directly with a huge stage number to fake progress).
router.post('/normal-clear', async (req, res) => {
  const { playerId, stage } = req.body || {};
  const stageNum = Number(stage);
  if (!playerId || !Number.isInteger(stageNum) || stageNum < 1) {
    return res.status(400).json({ error: 'invalid input' });
  }

  const { rows } = await pool.query(
    `INSERT INTO normal_progress (player_id, max_stage) VALUES ($1, 0)
     ON CONFLICT (player_id) DO NOTHING`,
    [playerId]
  );
  const current = await pool.query(`SELECT max_stage FROM normal_progress WHERE player_id = $1`, [playerId]);
  const maxStage = current.rows[0].max_stage;

  if (stageNum > maxStage + 1) {
    return res.status(400).json({ error: `stage out of order: already at ${maxStage}, got ${stageNum}` });
  }

  if (stageNum > maxStage) {
    await pool.query(`UPDATE normal_progress SET max_stage = $2, updated_at = now() WHERE player_id = $1`, [playerId, stageNum]);
  }

  res.json({ ok: true, maxStage: Math.max(maxStage, stageNum) });
});

// GET /api/progress/normal-leaderboard
router.get('/normal-leaderboard', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.username, np.max_stage, np.updated_at
     FROM normal_progress np
     JOIN players p ON p.id = np.player_id
     ORDER BY np.max_stage DESC, np.updated_at ASC
     LIMIT 50`
  );
  res.json(rows);
});

module.exports = router;
