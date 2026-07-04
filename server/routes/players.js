// routes/players.js — lightweight identity (no password; classroom-style usage)
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, blockGuests } = require('../middleware/auth');
const { generateUniquePublicId } = require('../utils/publicId');
const { MAX_EQUIPPED_BADGES, BADGE_CATALOG, findBadge, computeUnlockedBadgeKeys } = require('../game-data/badges-data');
const { AVATAR_CATALOG, findAvatar, FRAME_CATALOG, findFrame, computeUnlockedAchievementFrameKeys } = require('../game-data/cosmetics-data');

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
router.get('/search', requireAuth, blockGuests, asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) return res.json([]);

  const { rows } = await pool.query(
    `SELECT id, username, public_id
     FROM players
     WHERE id != $1
       AND status = 'active'
       AND is_guest = false
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
    `SELECT p.id, p.username, p.public_id, f.created_at,
            p.status, p.suspended_until, p.last_seen_at
     FROM friendships f
     JOIN players p ON p.id = f.friend_id
     WHERE f.player_id = $1
     ORDER BY f.created_at DESC`,
    [req.playerId]
  );
  res.json(rows.map((r) => ({
    playerId: r.id, username: r.username, publicId: r.public_id, addedAt: r.created_at,
    accountStatus: r.status, suspendedUntil: r.suspended_until, lastSeenAt: r.last_seen_at,
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
router.post('/friends/request', requireAuth, blockGuests, asyncHandler(async (req, res) => {
  const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId.trim() : '';
  if (!publicId) return res.status(400).json({ error: 'missing publicId' });

  const target = await pool.query(
    `SELECT id, username, public_id, is_guest FROM players WHERE public_id = $1 AND status = 'active'`,
    [publicId]
  );
  if (target.rows.length === 0) return res.status(404).json({ error: 'player not found' });
  if (target.rows[0].is_guest) return res.status(400).json({ error: 'ผู้เล่นนี้ใช้บัญชีชั่วคราว ไม่สามารถเพิ่มเพื่อนได้' });
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

// ============================================================================
// Achievement badges ("เหรียญความสำเร็จ") — see game-data/badges-data.js.
// Unlocked status is always computed live from real stats, never stored;
// only which of the unlocked badges the player has chosen to EQUIP is
// persisted (players.equipped_badges).
// ============================================================================

// Gathers the handful of stats badges are checked against. Missing rows
// (e.g. never played INF, not in a guild) just fall back to 0/false rather
// than failing — a player with no guild simply can't have guild/boss/donate
// badges unlocked yet.
async function computePlayerBadgeStats(playerId) {
  const [normalRow, infRow, guildRow, top10Row] = await Promise.all([
    pool.query(`SELECT max_stage FROM normal_progress WHERE player_id = $1`, [playerId]),
    pool.query(`SELECT max_stage FROM inf_progress WHERE player_id = $1`, [playerId]),
    pool.query(
      `SELECT g.level AS guild_level, gm.boss_damage_lifetime, gm.contribution_lifetime
       FROM guild_members gm JOIN guilds g ON g.id = gm.guild_id
       WHERE gm.player_id = $1`,
      [playerId]
    ),
    pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM (
           SELECT player_id, RANK() OVER (PARTITION BY mode ORDER BY score DESC) AS rnk
           FROM leaderboard_entries
         ) ranked WHERE ranked.player_id = $1 AND ranked.rnk <= 10
       ) AS top10`,
      [playerId]
    ),
  ]);

  return {
    normalStage: normalRow.rows[0]?.max_stage || 0,
    infStage: infRow.rows[0]?.max_stage || 0,
    guildLevel: guildRow.rows[0]?.guild_level || 0,
    bossDamageLifetime: Number(guildRow.rows[0]?.boss_damage_lifetime || 0),
    contributionLifetime: Number(guildRow.rows[0]?.contribution_lifetime || 0),
    leaderboardTop10: !!top10Row.rows[0]?.top10,
  };
}

// GET /api/players/badges — full catalog, which keys are unlocked, and which
// (unlocked) keys are currently equipped.
router.get('/badges', requireAuth, asyncHandler(async (req, res) => {
  const stats = await computePlayerBadgeStats(req.playerId);
  const unlockedKeys = computeUnlockedBadgeKeys(stats);
  const unlockedSet = new Set(unlockedKeys);

  const { rows } = await pool.query(`SELECT equipped_badges FROM players WHERE id = $1`, [req.playerId]);
  // Only ever report equipped badges that are STILL unlocked — guards against
  // a badge becoming un-earnable after the fact (e.g. leaving the guild that
  // gave a guild-level badge); nothing deletes the stored key, it just stops
  // being shown as equipped until re-earned.
  const equipped = (rows[0]?.equipped_badges || []).filter((k) => unlockedSet.has(k));

  res.json({
    maxEquipped: MAX_EQUIPPED_BADGES,
    equipped,
    badges: BADGE_CATALOG.map((b) => ({
      key: b.key, category: b.category, tier: b.tier, icon: b.icon, name: b.name, desc: b.desc,
      unlocked: unlockedSet.has(b.key),
    })),
  });
}));

// PUT /api/players/badges/equipped { badges: [key, ...] } — up to MAX_EQUIPPED_BADGES,
// every key must be a real badge the player currently has unlocked.
router.put('/badges/equipped', requireAuth, asyncHandler(async (req, res) => {
  const requested = Array.isArray(req.body?.badges) ? req.body.badges : null;
  if (!requested) return res.status(400).json({ error: 'badges must be an array' });

  const uniqueKeys = [...new Set(requested.filter((k) => typeof k === 'string'))];
  if (uniqueKeys.length > MAX_EQUIPPED_BADGES) {
    return res.status(400).json({ error: `can only equip up to ${MAX_EQUIPPED_BADGES} badges` });
  }
  if (uniqueKeys.some((k) => !findBadge(k))) {
    return res.status(400).json({ error: 'unknown badge key' });
  }

  const stats = await computePlayerBadgeStats(req.playerId);
  const unlockedSet = new Set(computeUnlockedBadgeKeys(stats));
  const notUnlocked = uniqueKeys.filter((k) => !unlockedSet.has(k));
  if (notUnlocked.length > 0) {
    return res.status(400).json({ error: 'badge not unlocked yet', badges: notUnlocked });
  }

  await pool.query(`UPDATE players SET equipped_badges = $1 WHERE id = $2`, [JSON.stringify(uniqueKeys), req.playerId]);
  res.json({ ok: true, equipped: uniqueKeys });
}));

// ============================================================================
// Profile cosmetics — "ปก" (avatar icon) + "กรอบปก" (avatar frame).
// See game-data/cosmetics-data.js.
//   - Avatars are freely selectable (players.avatar_icon).
//   - Frames come from two sources: achievement (unlocked status derived
//     live from the same stats as badges, never stored) and guild shop
//     (ownership persisted in players.owned_frames — see routes/guilds.js
//     POST /shop/buy). Only one frame can be equipped at a time.
// ============================================================================

// GET /api/players/cosmetics — avatar catalog + current avatar, and the full
// frame catalog annotated with unlocked/owned status + which frame is equipped.
router.get('/cosmetics', requireAuth, asyncHandler(async (req, res) => {
  const [stats, row] = await Promise.all([
    computePlayerBadgeStats(req.playerId),
    pool.query(`SELECT avatar_icon, equipped_frame, owned_frames FROM players WHERE id = $1`, [req.playerId]),
  ]);
  const player = row.rows[0] || {};
  const achievementUnlocked = new Set(computeUnlockedAchievementFrameKeys(stats));
  const owned = new Set(Array.isArray(player.owned_frames) ? player.owned_frames : []);

  // A frame stops being shown as equipped if it's no longer available (e.g.
  // an achievement frame tied to a guild the player has since left) — same
  // self-healing behavior as equipped badges above.
  const isAvailable = (key) => achievementUnlocked.has(key) || owned.has(key);
  const equippedFrame = player.equipped_frame && isAvailable(player.equipped_frame) ? player.equipped_frame : null;

  res.json({
    avatar: {
      current: player.avatar_icon || 'shield',
      catalog: AVATAR_CATALOG,
    },
    frames: {
      equipped: equippedFrame,
      catalog: FRAME_CATALOG.map((f) => ({
        key: f.key, category: f.category, tier: f.tier, name: f.name, desc: f.desc, source: f.source,
        unlocked: isAvailable(f.key),
      })),
    },
  });
}));

// PUT /api/players/avatar { avatar } — set the "ปก" (avatar icon). Freely
// selectable from AVATAR_CATALOG, no unlock condition.
router.put('/avatar', requireAuth, asyncHandler(async (req, res) => {
  const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar : '';
  if (!findAvatar(avatar)) return res.status(400).json({ error: 'unknown avatar key' });

  await pool.query(`UPDATE players SET avatar_icon = $1 WHERE id = $2`, [avatar, req.playerId]);
  res.json({ ok: true, avatar });
}));

// PUT /api/players/frame { frame } — equip a "กรอบปก" (avatar frame), or pass
// frame: null to remove it. Must be a frame the player currently has
// available (unlocked via achievement, or owned from the guild shop).
router.put('/frame', requireAuth, asyncHandler(async (req, res) => {
  const requested = req.body?.frame;
  if (requested !== null && typeof requested !== 'string') {
    return res.status(400).json({ error: 'frame must be a string or null' });
  }

  if (requested === null) {
    await pool.query(`UPDATE players SET equipped_frame = NULL WHERE id = $1`, [req.playerId]);
    return res.json({ ok: true, equipped: null });
  }

  if (!findFrame(requested)) return res.status(400).json({ error: 'unknown frame key' });

  const [stats, row] = await Promise.all([
    computePlayerBadgeStats(req.playerId),
    pool.query(`SELECT owned_frames FROM players WHERE id = $1`, [req.playerId]),
  ]);
  const achievementUnlocked = new Set(computeUnlockedAchievementFrameKeys(stats));
  const owned = new Set(row.rows[0]?.owned_frames || []);
  if (!achievementUnlocked.has(requested) && !owned.has(requested)) {
    return res.status(400).json({ error: 'frame not unlocked yet' });
  }

  await pool.query(`UPDATE players SET equipped_frame = $1 WHERE id = $2`, [requested, req.playerId]);
  res.json({ ok: true, equipped: requested });
}));

module.exports = router;
