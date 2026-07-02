// routes/players.js — lightweight identity (no password; classroom-style usage)
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { generateUniquePublicId } = require('../utils/publicId');

const router = express.Router();

// POST /api/players/identify { username }
// Creates the player if new, otherwise returns existing id. Idempotent.
router.post('/identify', asyncHandler(async (req, res) => {
  const { username: rawUsername } = req.body || {};
  const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
  if (!username || username.length < 2 || username.length > 32) {
    return res.status(400).json({ error: 'invalid username' });
  }

  // public_id is only assigned on first insert (ON CONFLICT keeps the existing one,
  // since EXCLUDED.public_id would otherwise overwrite it with a fresh value every call).
  const publicId = await generateUniquePublicId(pool);

  const { rows } = await pool.query(
    `INSERT INTO players (username, public_id) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id, username, team_id, public_id, status`,
    [username, publicId]
  );

  if (rows[0].status !== 'active') {
    return res.status(403).json({ error: `account ${rows[0].status}` });
  }
  // self-heal: pre-patch rows that matched an existing username but never got a public_id
  if (!rows[0].public_id) {
    await pool.query(`UPDATE players SET public_id = $1 WHERE id = $2`, [publicId, rows[0].id]);
    rows[0].public_id = publicId;
  }

  res.json(rows[0]);
}));

// POST /api/players/join-team { playerId, teamName }
router.post('/join-team', asyncHandler(async (req, res) => {
  const { playerId, teamName: rawTeamName } = req.body || {};
  const teamName = typeof rawTeamName === 'string' ? rawTeamName.trim() : '';
  if (!playerId || !teamName) return res.status(400).json({ error: 'missing fields' });

  const team = await pool.query(
    `INSERT INTO teams (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [teamName]
  );

  const updated = await pool.query(
    `UPDATE players SET team_id = $1 WHERE id = $2 RETURNING id`,
    [team.rows[0].id, playerId]
  );

  // playerId didn't match any row — fail loudly instead of silently reporting success
  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'player not found' });
  }

  res.json({ ok: true, teamId: team.rows[0].id });
}));

module.exports = router;
