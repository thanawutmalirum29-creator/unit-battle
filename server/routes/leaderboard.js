// routes/leaderboard.js
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/leaderboard/:mode  (normal | inf) — top individual runs
router.get('/:mode', asyncHandler(async (req, res) => {
  const { mode } = req.params;
  if (!['normal', 'inf'].includes(mode)) return res.status(400).json({ error: 'invalid mode' });

  const { rows } = await pool.query(
    `SELECT le.id, p.username, le.max_stage, le.time_ms, le.score, le.created_at
     FROM leaderboard_entries le
     JOIN players p ON p.id = le.player_id
     WHERE le.mode = $1
     ORDER BY le.max_stage DESC, le.time_ms ASC
     LIMIT 50`,
    [mode]
  );
  res.json(rows);
}));

// GET /api/leaderboard/teams/summary — total team score across all modes
router.get('/teams/summary', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT t.name AS team_name, SUM(le.score) AS total_score, COUNT(*) AS runs
     FROM leaderboard_entries le
     JOIN teams t ON t.id = le.team_id
     GROUP BY t.name
     ORDER BY total_score DESC`
  );
  res.json(rows);
}));

module.exports = router;
