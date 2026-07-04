// routes/players.js — lightweight identity (no password; classroom-style usage)
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
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

// GET /api/players/search?q=... — search other players by exact public_id or
// partial username (case-insensitive), for the "add friend" page. Requires
// login so we know who's searching (to mark friends/pending requests).
router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) return res.json([]);

  const { rows } = await pool.query(
    `SELECT id, username, public_id
     FROM players
     WHERE id != $1
       AND status = 'active'
       AND (public_id = $2 OR username ILIKE $3)
     ORDER BY (public_id = $2) DESC, username ASC
     LIMIT 20`,
    [req.playerId, q, `%${q}%`]
  );

  const friendRows = await pool.query(`SELECT friend_id FROM friendships WHERE player_id = $1`, [req.playerId]);
  const friendIds = new Set(friendRows.rows.map((r) => r.friend_id));

  // pending requests involving me, either direction, so search results can show
  // "รอตอบรับ" (I sent it) vs "ตอบรับคำขอ" (they sent it to me) instead of a plain add button.
  const pendingRows = await pool.query(
    `SELECT id, sender_id, receiver_id FROM friend_requests WHERE status = 'pending' AND (sender_id = $1 OR receiver_id = $1)`,
    [req.playerId]
  );
  const sentTo = new Map();     // otherPlayerId -> requestId (I'm sender)
  const receivedFrom = new Map(); // otherPlayerId -> requestId (I'm receiver)
  for (const r of pendingRows.rows) {
    if (r.sender_id === req.playerId) sentTo.set(r.receiver_id, r.id);
    else receivedFrom.set(r.sender_id, r.id);
  }

  res.json(rows.map((r) => {
    let status = 'none';
    let requestId = null;
    if (friendIds.has(r.id)) {
      status = 'friends';
    } else if (sentTo.has(r.id)) {
      status = 'request_sent';
      requestId = sentTo.get(r.id);
    } else if (receivedFrom.has(r.id)) {
      status = 'request_received';
      requestId = receivedFrom.get(r.id);
    }
    return { playerId: r.id, username: r.username, publicId: r.public_id, status, requestId };
  }));
}));

// GET /api/players/friends — my friends list.
router.get('/friends', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.username, p.public_id, f.created_at
     FROM friendships f
     JOIN players p ON p.id = f.friend_id
     WHERE f.player_id = $1
     ORDER BY f.created_at DESC`,
    [req.playerId]
  );
  res.json(rows.map((r) => ({
    playerId: r.id, username: r.username, publicId: r.public_id, addedAt: r.created_at,
  })));
}));

// DELETE /api/players/friends/:friendId — unfriend (removes both directions).
router.delete('/friends/:friendId', requireAuth, asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  await pool.query(
    `DELETE FROM friendships WHERE (player_id = $1 AND friend_id = $2) OR (player_id = $2 AND friend_id = $1)`,
    [req.playerId, friendId]
  );
  res.json({ ok: true });
}));

// ============================================================================
// Friend requests — send / list / accept / reject / cancel.
// Sending a request never makes two players friends by itself; the receiver
// has to accept it (see /requests/:id/accept below).
// ============================================================================

// POST /api/players/friends/request { publicId }
router.post('/friends/request', requireAuth, asyncHandler(async (req, res) => {
  const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId.trim() : '';
  if (!publicId) return res.status(400).json({ error: 'missing publicId' });

  const target = await pool.query(
    `SELECT id, username, public_id FROM players WHERE public_id = $1 AND status = 'active'`,
    [publicId]
  );
  if (target.rows.length === 0) return res.status(404).json({ error: 'player not found' });
  const receiverId = target.rows[0].id;
  if (receiverId === req.playerId) return res.status(400).json({ error: 'cannot add yourself' });

  const alreadyFriends = await pool.query(
    `SELECT 1 FROM friendships WHERE player_id = $1 AND friend_id = $2`,
    [req.playerId, receiverId]
  );
  if (alreadyFriends.rows.length > 0) return res.status(409).json({ error: 'already friends' });

  // They already sent ME a pending request — accept theirs instead of creating
  // a duplicate in the other direction (avoids two dangling pending rows).
  const reverse = await pool.query(
    `SELECT id FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
    [receiverId, req.playerId]
  );
  if (reverse.rows.length > 0) {
    return res.status(409).json({ error: 'this player already sent you a request — accept it from your requests list' });
  }

  const { rows } = await pool.query(
    `INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)
     ON CONFLICT (sender_id, receiver_id) WHERE status = 'pending' DO NOTHING
     RETURNING id`,
    [req.playerId, receiverId]
  );
  if (rows.length === 0) return res.status(409).json({ error: 'request already sent' });

  res.json({ ok: true, requestId: rows[0].id, username: target.rows[0].username, publicId: target.rows[0].public_id });
}));

// GET /api/players/friends/requests — incoming pending requests (people who want to add me).
router.get('/friends/requests', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT fr.id, p.id AS player_id, p.username, p.public_id, fr.created_at
     FROM friend_requests fr
     JOIN players p ON p.id = fr.sender_id
     WHERE fr.receiver_id = $1 AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [req.playerId]
  );
  res.json(rows.map((r) => ({
    requestId: r.id, playerId: r.player_id, username: r.username, publicId: r.public_id, createdAt: r.created_at,
  })));
}));

// GET /api/players/friends/requests/sent — outgoing pending requests I sent.
router.get('/friends/requests/sent', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT fr.id, p.id AS player_id, p.username, p.public_id, fr.created_at
     FROM friend_requests fr
     JOIN players p ON p.id = fr.receiver_id
     WHERE fr.sender_id = $1 AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [req.playerId]
  );
  res.json(rows.map((r) => ({
    requestId: r.id, playerId: r.player_id, username: r.username, publicId: r.public_id, createdAt: r.created_at,
  })));
}));

// POST /api/players/friends/requests/:id/accept — only the receiver can accept.
router.post('/friends/requests/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT sender_id, receiver_id FROM friend_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'request not found or already handled' });
    }
    const { sender_id: senderId, receiver_id: receiverId } = rows[0];
    if (receiverId !== req.playerId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'not your request to accept' });
    }

    await client.query(`UPDATE friend_requests SET status = 'accepted', responded_at = now() WHERE id = $1`, [req.params.id]);
    await client.query(
      `INSERT INTO friendships (player_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING`,
      [senderId, receiverId]
    );

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/players/friends/requests/:id/reject — only the receiver can reject.
router.post('/friends/requests/:id/reject', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE friend_requests SET status = 'rejected', responded_at = now()
     WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
     RETURNING id`,
    [req.params.id, req.playerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'request not found or already handled' });
  res.json({ ok: true });
}));

// DELETE /api/players/friends/requests/:id — sender cancels their own pending request.
router.delete('/friends/requests/:id', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `DELETE FROM friend_requests WHERE id = $1 AND sender_id = $2 AND status = 'pending' RETURNING id`,
    [req.params.id, req.playerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'request not found or already handled' });
  res.json({ ok: true });
}));

module.exports = router;
