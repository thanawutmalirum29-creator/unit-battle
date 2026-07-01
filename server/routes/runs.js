// routes/runs.js — server-authoritative run lifecycle
const express = require('express');
const { v4: uuid } = require('uuid');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { validateStageClear } = require('../middleware/anticheat');

const router = express.Router();

// POST /api/runs/start { playerId, mode: 'normal' | 'inf' }
router.post('/start', asyncHandler(async (req, res) => {
  const { playerId, mode } = req.body || {};
  if (!playerId || !['normal', 'inf'].includes(mode)) {
    return res.status(400).json({ error: 'invalid playerId or mode' });
  }

  const token = uuid();
  const { rows } = await pool.query(
    `INSERT INTO runs (player_id, mode, token) VALUES ($1, $2, $3)
     RETURNING id, started_at`,
    [playerId, mode, token]
  );

  res.json({ runId: rows[0].id, token, startedAt: rows[0].started_at });
}));

// POST /api/runs/:runId/stage-clear { token, stage, clientElapsedMs }
//
// Wrapped in a transaction with SELECT ... FOR UPDATE so the read-check-write of
// max_stage is atomic. Without the row lock, two concurrent stage-clear calls for the
// same run (e.g. a client retry after a slow/timed-out response) could both read the
// same max_stage, both pass validateStageClear, and both succeed — letting a stage jump
// happen or double-incrementing progress.
router.post('/:runId/stage-clear', asyncHandler(async (req, res) => {
  const { runId } = req.params;
  const { token, stage, clientElapsedMs } = req.body || {};
  const stageNum = Number(stage);

  if (!token || !Number.isInteger(stageNum)) {
    return res.status(400).json({ error: 'invalid token or stage' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(`SELECT * FROM runs WHERE id = $1 FOR UPDATE`, [runId]);
    const run = rows[0];
    if (!run || run.token !== token) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'invalid run/token' });
    }

    const check = validateStageClear(run, stageNum, Date.now());
    if (!check.ok) {
      await client.query(`UPDATE runs SET status = 'flagged', flag_reason = $2 WHERE id = $1`, [runId, check.reason]);
      await client.query('COMMIT');
      return res.status(400).json({ error: check.reason });
    }

    await client.query(
      `INSERT INTO run_stage_events (run_id, stage, client_elapsed_ms) VALUES ($1, $2, $3)
       ON CONFLICT (run_id, stage) DO NOTHING`,
      [runId, stageNum, clientElapsedMs ?? null]
    );
    await client.query(`UPDATE runs SET max_stage = $2 WHERE id = $1`, [runId, stageNum]);

    await client.query('COMMIT');
    res.json({ ok: true, maxStage: stageNum });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/runs/:runId/finish { token }
// Score and time are computed ENTIRELY from server-tracked data, never from client input.
router.post('/:runId/finish', asyncHandler(async (req, res) => {
  const { runId } = req.params;
  const { token } = req.body || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(`SELECT * FROM runs WHERE id = $1 FOR UPDATE`, [runId]);
    const run = rows[0];
    if (!run || run.token !== token) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'invalid run/token' });
    }
    if (run.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `run already ${run.status}` });
    }

    const finishedAt = new Date();
    const timeMs = finishedAt.getTime() - new Date(run.started_at).getTime();
    const score = run.max_stage * 100 + Math.max(0, 5000 - Math.floor(timeMs / 1000));

    await client.query(
      `UPDATE runs SET status = 'finished', finished_at = $2 WHERE id = $1`,
      [runId, finishedAt]
    );

    const player = await client.query(`SELECT team_id FROM players WHERE id = $1`, [run.player_id]);

    const entry = await client.query(
      `INSERT INTO leaderboard_entries (run_id, player_id, team_id, mode, max_stage, time_ms, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [runId, run.player_id, player.rows[0]?.team_id ?? null, run.mode, run.max_stage, timeMs, score]
    );

    await client.query('COMMIT');
    res.json(entry.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
