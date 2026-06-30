// routes/players.js — lightweight identity (no password; classroom-style usage)
const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/players/identify { username }
// Creates the player if new, otherwise returns existing id. Idempotent.
router.post('/identify', async (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string' || username.length < 2 || username.length > 32) {
    return res.status(400).json({ error: 'invalid username' });
  }

  const { rows } = await pool.query(
    `INSERT INTO players (username) VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id, username, team_id`,
    [username]
  );
  res.json(rows[0]);
});

// POST /api/players/join-team { playerId, teamName }
router.post('/join-team', async (req, res) => {
  const { playerId, teamName } = req.body || {};
  if (!playerId || !teamName) return res.status(400).json({ error: 'missing fields' });

  const team = await pool.query(
    `INSERT INTO teams (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [teamName]
  );
  await pool.query(`UPDATE players SET team_id = $1 WHERE id = $2`, [team.rows[0].id, playerId]);
  res.json({ ok: true, teamId: team.rows[0].id });
});

module.exports = router;
