// routes/runs.js — server-authoritative run lifecycle
const express = require('express');
const { v4: uuid } = require('uuid');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { validateStageClear } = require('../middleware/anticheat');

const router = express.Router();

// INF checkpoints only exist every 25 stages (25, 50, 75, ...), same rule the
// client uses to render the checkpoint buttons.
const INF_CHECKPOINT_INTERVAL = 25;

// 🔒 ALL THREE ROUTES BELOW ARE DISABLED.
//
// /start had NO auth at all — it read `playerId` straight from the request body, so
// anyone could POST as any player. /stage-clear only checked that the timing was
// "physically plausible" (validateStageClear) — it never verified a real battle
// happened. Chained together (start -> repeated stage-clear -> finish), this let
// anyone fabricate a leaderboard_entries row with an arbitrary max_stage/score for
// ANY player, with zero authentication and zero real gameplay.
//
// routes/battle.js is the replacement: every endpoint requires requireAuth, the
// server runs the actual fight turn-by-turn itself (server/battle/engine.js), and it
// now writes leaderboard_entries directly when a run concludes (win, loss, or
// forfeit) using the same score formula this file used. Keeping this file mounted
// with real logic would leave that exact bypass open, so every route here now just
// returns 410.
router.post('/start', asyncHandler(async (req, res) => {
  return res.status(410).json({ error: 'gone: use /api/battle/start instead' });
}));

router.post('/:runId/stage-clear', asyncHandler(async (req, res) => {
  return res.status(410).json({ error: 'gone: progress is now recorded by /api/battle turns' });
}));

router.post('/:runId/finish', asyncHandler(async (req, res) => {
  return res.status(410).json({ error: 'gone: /api/battle writes the leaderboard entry itself' });
}));

module.exports = router;
