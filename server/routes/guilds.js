// routes/guilds.js — full guild system: membership + roles, join requests /
// invites, guild chat, donation -> contribution, a contribution-spending guild
// shop, a weekly co-op guild boss, and cross-guild ranking.
//
// Every mutation that touches money/contribution/HP runs inside a transaction
// with a row lock (same discipline as routes/economy.js) so double-taps and
// concurrent requests from different members can't double-spend, over-join a
// full guild, or double-mail boss rewards.
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, blockGuests } = require('../middleware/auth');
const { getMembership, isLeaderOrOfficer, ensureGuildBossStateTx, grantGuildExpTx } = require('../db/guildHelpers');
const {
  GUILD_NAME_MIN, GUILD_NAME_MAX, GUILD_TAG_MIN, GUILD_TAG_MAX,
  GUILD_DESC_MAX, GUILD_CREATE_COST, GUILD_EMBLEMS, GUILD_JOIN_MODES,
  DONATION_MIN, DONATION_MAX, DONATION_DAILY_LIMIT, contributionForDonation,
  DONATION_DAILY_MONEY_CAP, DONATION_DAILY_CONTRIBUTION_CAP, DONATION_DAILY_GUILD_EXP_CAP,
  currentGameDayStart, currentGameDayEnd,
  GUILD_SHOP_CATALOG, findShopItem,
  currentGuildCycle, guildCycleEndsAt,
  GUILD_BOSS_NAME, GUILD_BOSS_ATTACKS_PER_DAY, computeBossAttackDamage,
  GUILD_MAX_LEVEL, GUILD_EXP_PER_CONTRIBUTION, GUILD_EXP_PER_BOSS_DAMAGE, expProgress,
  GUILD_CAPACITY_EXPANSION_MIN_LEVEL, GUILD_CAPACITY_EXPANSION_COST,
  computeMaxMembers,
} = require('../game-data/guild-data');

const router = express.Router();

function guildSummary(row) {
  const progress = expProgress(Number(row.exp) || 0);
  return {
    id: row.guild_id || row.id,
    name: row.name,
    tag: row.tag,
    description: row.description,
    emblem: row.emblem,
    leaderId: row.leader_id,
    joinMode: row.join_mode,
    maxMembers: row.max_members,
    treasuryMoney: Number(row.treasury_money),
    totalContribution: Number(row.total_contribution),
    createdAt: row.guild_created_at || row.created_at,
    exp: Number(row.exp) || 0,
    level: progress.level,
    maxLevel: GUILD_MAX_LEVEL,
    expIntoLevel: progress.intoLevel,
    expForNextLevel: progress.forNextLevel, // null once GUILD_MAX_LEVEL is reached
    extraCapacityPurchased: !!row.extra_capacity_purchased,
    capacityExpansionAvailable: !row.extra_capacity_purchased && progress.level >= GUILD_CAPACITY_EXPANSION_MIN_LEVEL,
  };
}

// ---------------------------------------------------------------------------
// GET /api/guilds/mine — my guild + my membership info, or { guild: null }.
// ---------------------------------------------------------------------------
router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.json({ guild: null });

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM guild_members WHERE guild_id = $1`,
    [membership.guild_id]
  );

  const { rows: donationRows } = await pool.query(
    `SELECT COUNT(*)::int AS n,
            COALESCE(SUM(amount), 0)::bigint AS money_sum,
            COALESCE(SUM(contribution_awarded), 0)::bigint AS contribution_sum,
            COALESCE(SUM(guild_exp_awarded), 0)::bigint AS exp_sum
     FROM guild_donations WHERE player_id = $1 AND created_at >= $2`,
    [req.playerId, currentGameDayStart()]
  );
  const d = donationRows[0];

  res.json({
    guild: guildSummary(membership),
    memberCount: countRows[0].n,
    myRole: membership.role,
    myContributionLifetime: Number(membership.contribution_lifetime),
    myContributionBalance: Number(membership.contribution_balance),
    myBossDamageCycle: Number(membership.boss_damage_cycle),
    joinedAt: membership.joined_at,
    myDonationToday: {
      donationsCount: d.n, donationsCountCap: DONATION_DAILY_LIMIT,
      money: Number(d.money_sum), moneyCap: DONATION_DAILY_MONEY_CAP,
      contribution: Number(d.contribution_sum), contributionCap: DONATION_DAILY_CONTRIBUTION_CAP,
      guildExp: Number(d.exp_sum), guildExpCap: DONATION_DAILY_GUILD_EXP_CAP,
      resetsAt: currentGameDayEnd().toISOString(),
    },
  });
}));

// ---------------------------------------------------------------------------
// GET /api/guilds/list?q= — browse/search guilds to join (excludes none of
// mine specifically, but the client hides "join" actions once already in one).
// ---------------------------------------------------------------------------
router.get('/list', requireAuth, asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const params = [];
  let where = '';
  if (q.length > 0) {
    params.push(`%${q}%`);
    where = `WHERE g.name ILIKE $${params.length} OR g.tag ILIKE $${params.length}`;
  }
  params.push(50);
  const { rows } = await pool.query(
    `SELECT g.*, p.username AS leader_username,
            (SELECT COUNT(*)::int FROM guild_members m WHERE m.guild_id = g.id) AS member_count
     FROM guilds g
     JOIN players p ON p.id = g.leader_id
     ${where}
     ORDER BY g.total_contribution DESC
     LIMIT $${params.length}`,
    params
  );
  res.json(rows.map((r) => ({
    ...guildSummary(r),
    leaderUsername: r.leader_username,
    memberCount: r.member_count,
    full: r.member_count >= r.max_members,
  })));
}));

// ---------------------------------------------------------------------------
// GET /api/guilds/ranking — top guilds by lifetime contribution.
// ---------------------------------------------------------------------------
router.get('/ranking', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, p.username AS leader_username,
            (SELECT COUNT(*)::int FROM guild_members m WHERE m.guild_id = g.id) AS member_count
     FROM guilds g
     JOIN players p ON p.id = g.leader_id
     ORDER BY g.total_contribution DESC, g.created_at ASC
     LIMIT 50`
  );
  res.json(rows.map((r, i) => ({
    rank: i + 1,
    ...guildSummary(r),
    leaderUsername: r.leader_username,
    memberCount: r.member_count,
  })));
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/create { name, tag, description, emblem, joinMode }
// ---------------------------------------------------------------------------
router.post('/create', requireAuth, blockGuests, asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const tag = typeof req.body?.tag === 'string' ? req.body.tag.trim().toUpperCase() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, GUILD_DESC_MAX) : '';
  const emblem = GUILD_EMBLEMS.includes(req.body?.emblem) ? req.body.emblem : GUILD_EMBLEMS[0];
  const joinMode = GUILD_JOIN_MODES.includes(req.body?.joinMode) ? req.body.joinMode : 'apply';

  if (name.length < GUILD_NAME_MIN || name.length > GUILD_NAME_MAX) {
    return res.status(400).json({ error: `ชื่อกิลด์ต้องยาว ${GUILD_NAME_MIN}-${GUILD_NAME_MAX} ตัวอักษร` });
  }
  if (tag.length < GUILD_TAG_MIN || tag.length > GUILD_TAG_MAX || !/^[A-Z0-9ก-๙]+$/.test(tag)) {
    return res.status(400).json({ error: `แท็กกิลด์ต้องยาว ${GUILD_TAG_MIN}-${GUILD_TAG_MAX} ตัวอักษร (ตัวอักษร/ตัวเลขเท่านั้น)` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(`SELECT 1 FROM guild_members WHERE player_id = $1`, [req.playerId]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'คุณอยู่ในกิลด์อยู่แล้ว ต้องออกจากกิลด์เดิมก่อน' });
    }

    await client.query(`INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [req.playerId]);
    const econ = await client.query(`SELECT money FROM player_economy WHERE player_id = $1 FOR UPDATE`, [req.playerId]);
    if (Number(econ.rows[0].money) < GUILD_CREATE_COST) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `เงินไม่พอ ต้องใช้ ${GUILD_CREATE_COST.toLocaleString()} เพื่อสร้างกิลด์` });
    }

    let guildRow;
    try {
      const inserted = await client.query(
        `INSERT INTO guilds (name, tag, description, emblem, leader_id, join_mode)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, tag, description, emblem, req.playerId, joinMode]
      );
      guildRow = inserted.rows[0];
    } catch (err) {
      if (err.code === '23505') { // unique_violation
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'ชื่อหรือแท็กกิลด์นี้ถูกใช้ไปแล้ว' });
      }
      throw err;
    }

    await client.query(
      `INSERT INTO guild_members (player_id, guild_id, role) VALUES ($1, $2, 'leader')`,
      [req.playerId, guildRow.id]
    );
    await client.query(
      `UPDATE player_economy SET money = money - $2, updated_at = now() WHERE player_id = $1`,
      [req.playerId, GUILD_CREATE_COST]
    );

    await client.query('COMMIT');
    res.json({ ok: true, guild: guildSummary(guildRow) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// PATCH /api/guilds/settings { description, joinMode, emblem } — leader only.
// ---------------------------------------------------------------------------
router.patch('/settings', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });
  if (membership.role !== 'leader') return res.status(403).json({ error: 'หัวหน้ากิลด์เท่านั้นที่แก้ไขได้' });

  const fields = [];
  const params = [membership.guild_id];
  if (typeof req.body?.description === 'string') {
    params.push(req.body.description.trim().slice(0, GUILD_DESC_MAX));
    fields.push(`description = $${params.length}`);
  }
  if (GUILD_JOIN_MODES.includes(req.body?.joinMode)) {
    params.push(req.body.joinMode);
    fields.push(`join_mode = $${params.length}`);
  }
  if (GUILD_EMBLEMS.includes(req.body?.emblem)) {
    params.push(req.body.emblem);
    fields.push(`emblem = $${params.length}`);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'ไม่มีข้อมูลให้แก้ไข' });

  const { rows } = await pool.query(
    `UPDATE guilds SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  res.json({ ok: true, guild: guildSummary(rows[0]) });
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/expand-capacity — leader only, one-time, paid from the
// shared treasury (not personal contribution) since it benefits every member.
// Requires the guild to already be at the level-based member cap (level 30+).
// ---------------------------------------------------------------------------
router.post('/expand-capacity', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const membership = await client.query(`SELECT * FROM guild_members WHERE player_id = $1`, [req.playerId]);
    if (membership.rows.length === 0 || membership.rows[0].role !== 'leader') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'หัวหน้ากิลด์เท่านั้น' });
    }

    const guildRes = await client.query(`SELECT * FROM guilds WHERE id = $1 FOR UPDATE`, [membership.rows[0].guild_id]);
    const guild = guildRes.rows[0];
    const level = expProgress(Number(guild.exp) || 0).level;

    if (guild.extra_capacity_purchased) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'ขยายจำนวนสมาชิกไปแล้ว ทำได้ครั้งเดียวต่อกิลด์' });
    }
    if (level < GUILD_CAPACITY_EXPANSION_MIN_LEVEL) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: `ต้องการกิลด์เลเวล ${GUILD_CAPACITY_EXPANSION_MIN_LEVEL} ขึ้นไป (ตอนนี้เลเวล ${level})` });
    }
    if (Number(guild.treasury_money) < GUILD_CAPACITY_EXPANSION_COST) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `คลังกิลด์ไม่พอ ต้องใช้ ${GUILD_CAPACITY_EXPANSION_COST.toLocaleString()}` });
    }

    const newMaxMembers = computeMaxMembers(level, true);
    const updated = await client.query(
      `UPDATE guilds SET treasury_money = treasury_money - $2, extra_capacity_purchased = true, max_members = $3
       WHERE id = $1 RETURNING *`,
      [guild.id, GUILD_CAPACITY_EXPANSION_COST, newMaxMembers]
    );

    await client.query('COMMIT');
    res.json({ ok: true, guild: guildSummary(updated.rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/:id/join — instant join, only when join_mode = 'open'.
// ---------------------------------------------------------------------------
router.post('/:id/join', requireAuth, blockGuests, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(`SELECT 1 FROM guild_members WHERE player_id = $1`, [req.playerId]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'คุณอยู่ในกิลด์อยู่แล้ว' });
    }

    const guildRes = await client.query(
      `SELECT g.*, (SELECT COUNT(*)::int FROM guild_members m WHERE m.guild_id = g.id) AS member_count
       FROM guilds g WHERE g.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (guildRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
    }
    const guild = guildRes.rows[0];
    if (guild.join_mode !== 'open') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'กิลด์นี้ไม่เปิดให้เข้าร่วมได้ทันที ต้องส่งคำขอหรือรอคำเชิญ' });
    }
    if (guild.member_count >= guild.max_members) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'กิลด์นี้เต็มแล้ว' });
    }

    await client.query(
      `INSERT INTO guild_members (player_id, guild_id, role) VALUES ($1, $2, 'member')`,
      [req.playerId, guild.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, guild: guildSummary(guild) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/:id/apply { message } — for join_mode = 'apply'.
// ---------------------------------------------------------------------------
router.post('/:id/apply', requireAuth, blockGuests, asyncHandler(async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 200) : '';

  const existing = await pool.query(`SELECT 1 FROM guild_members WHERE player_id = $1`, [req.playerId]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'คุณอยู่ในกิลด์อยู่แล้ว' });

  const guildRes = await pool.query(`SELECT * FROM guilds WHERE id = $1`, [req.params.id]);
  if (guildRes.rows.length === 0) return res.status(404).json({ error: 'ไม่พบกิลด์นี้' });
  if (guildRes.rows[0].join_mode !== 'apply') {
    return res.status(403).json({ error: 'กิลด์นี้ไม่รับคำขอเข้าร่วมแบบนี้' });
  }

  const { rows } = await pool.query(
    `INSERT INTO guild_join_requests (guild_id, player_id, message) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, player_id) WHERE status = 'pending' DO NOTHING
     RETURNING id`,
    [req.params.id, req.playerId, message]
  );
  if (rows.length === 0) return res.status(409).json({ error: 'คุณส่งคำขอไปกิลด์นี้อยู่แล้ว รอการตอบรับ' });

  res.json({ ok: true, requestId: rows[0].id });
}));

// GET /api/guilds/requests/mine — join requests I've sent that are still pending.
router.get('/requests/mine', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.guild_id, g.name, g.tag, r.message, r.created_at
     FROM guild_join_requests r JOIN guilds g ON g.id = r.guild_id
     WHERE r.player_id = $1 AND r.status = 'pending' ORDER BY r.created_at DESC`,
    [req.playerId]
  );
  res.json(rows.map((r) => ({
    requestId: r.id, guildId: r.guild_id, guildName: r.name, guildTag: r.tag,
    message: r.message, createdAt: r.created_at,
  })));
}));

// DELETE /api/guilds/requests/mine/:id — cancel my own pending application.
router.delete('/requests/mine/:id', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE guild_join_requests SET status = 'cancelled', responded_at = now()
     WHERE id = $1 AND player_id = $2 AND status = 'pending' RETURNING id`,
    [req.params.id, req.playerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบคำขอนี้' });
  res.json({ ok: true });
}));

// GET /api/guilds/requests — pending applications to MY guild (leader/officer only).
router.get('/requests', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership || !isLeaderOrOfficer(membership.role)) {
    return res.status(403).json({ error: 'ต้องเป็นหัวหน้าหรือรองหัวหน้ากิลด์' });
  }
  const { rows } = await pool.query(
    `SELECT r.id, p.id AS player_id, p.username, p.public_id, r.message, r.created_at
     FROM guild_join_requests r JOIN players p ON p.id = r.player_id
     WHERE r.guild_id = $1 AND r.status = 'pending' ORDER BY r.created_at DESC`,
    [membership.guild_id]
  );
  res.json(rows.map((r) => ({
    requestId: r.id, playerId: r.player_id, username: r.username, publicId: r.public_id,
    message: r.message, createdAt: r.created_at,
  })));
}));

router.post('/requests/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership || !isLeaderOrOfficer(membership.role)) {
    return res.status(403).json({ error: 'ต้องเป็นหัวหน้าหรือรองหัวหน้ากิลด์' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqRow = await client.query(
      `SELECT * FROM guild_join_requests WHERE id = $1 AND guild_id = $2 AND status = 'pending' FOR UPDATE`,
      [req.params.id, membership.guild_id]
    );
    if (reqRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบคำขอนี้ หรือถูกจัดการไปแล้ว' });
    }
    const applicantId = reqRow.rows[0].player_id;

    const alreadyIn = await client.query(`SELECT 1 FROM guild_members WHERE player_id = $1`, [applicantId]);
    if (alreadyIn.rows.length > 0) {
      await client.query(`UPDATE guild_join_requests SET status = 'cancelled', responded_at = now() WHERE id = $1`, [req.params.id]);
      await client.query('COMMIT');
      return res.status(409).json({ error: 'ผู้เล่นนี้เข้ากิลด์อื่นไปแล้ว' });
    }

    const guildRes = await client.query(
      `SELECT max_members, (SELECT COUNT(*)::int FROM guild_members m WHERE m.guild_id = guilds.id) AS member_count
       FROM guilds WHERE id = $1 FOR UPDATE`,
      [membership.guild_id]
    );
    if (guildRes.rows[0].member_count >= guildRes.rows[0].max_members) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'กิลด์เต็มแล้ว' });
    }

    await client.query(`INSERT INTO guild_members (player_id, guild_id, role) VALUES ($1, $2, 'member')`, [applicantId, membership.guild_id]);
    await client.query(`UPDATE guild_join_requests SET status = 'accepted', responded_at = now() WHERE id = $1`, [req.params.id]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.post('/requests/:id/reject', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership || !isLeaderOrOfficer(membership.role)) {
    return res.status(403).json({ error: 'ต้องเป็นหัวหน้าหรือรองหัวหน้ากิลด์' });
  }
  const { rows } = await pool.query(
    `UPDATE guild_join_requests SET status = 'rejected', responded_at = now()
     WHERE id = $1 AND guild_id = $2 AND status = 'pending' RETURNING id`,
    [req.params.id, membership.guild_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบคำขอนี้' });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Invites (join_mode = 'invite', but leader/officer can also invite people
// into an 'open' or 'apply' guild as a shortcut).
// ---------------------------------------------------------------------------
router.post('/invite', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership || !isLeaderOrOfficer(membership.role)) {
    return res.status(403).json({ error: 'ต้องเป็นหัวหน้าหรือรองหัวหน้ากิลด์' });
  }
  const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId.trim() : '';
  if (!publicId) return res.status(400).json({ error: 'missing publicId' });

  const target = await pool.query(`SELECT id, username, is_guest FROM players WHERE public_id = $1 AND status = 'active'`, [publicId]);
  if (target.rows.length === 0) return res.status(404).json({ error: 'ไม่พบผู้เล่นนี้' });
  if (target.rows[0].is_guest) return res.status(400).json({ error: 'ผู้เล่นนี้ใช้บัญชีชั่วคราว ไม่สามารถเชิญเข้ากิลด์ได้' });
  const inviteeId = target.rows[0].id;

  const alreadyIn = await pool.query(`SELECT 1 FROM guild_members WHERE player_id = $1`, [inviteeId]);
  if (alreadyIn.rows.length > 0) return res.status(409).json({ error: 'ผู้เล่นนี้อยู่ในกิลด์อื่นอยู่แล้ว' });

  const { rows } = await pool.query(
    `INSERT INTO guild_invites (guild_id, inviter_id, invitee_id) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, invitee_id) WHERE status = 'pending' DO NOTHING RETURNING id`,
    [membership.guild_id, req.playerId, inviteeId]
  );
  if (rows.length === 0) return res.status(409).json({ error: 'มีคำเชิญที่ยังไม่ตอบรับส่งไปแล้ว' });

  res.json({ ok: true, inviteId: rows[0].id, username: target.rows[0].username });
}));

router.get('/invites/mine', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.id, g.id AS guild_id, g.name, g.tag, g.emblem, p.username AS inviter_username, i.created_at
     FROM guild_invites i
     JOIN guilds g ON g.id = i.guild_id
     JOIN players p ON p.id = i.inviter_id
     WHERE i.invitee_id = $1 AND i.status = 'pending' ORDER BY i.created_at DESC`,
    [req.playerId]
  );
  res.json(rows.map((r) => ({
    inviteId: r.id, guildId: r.guild_id, guildName: r.name, guildTag: r.tag, emblem: r.emblem,
    inviterUsername: r.inviter_username, createdAt: r.created_at,
  })));
}));

router.post('/invites/:id/accept', requireAuth, blockGuests, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inv = await client.query(
      `SELECT * FROM guild_invites WHERE id = $1 AND invitee_id = $2 AND status = 'pending' FOR UPDATE`,
      [req.params.id, req.playerId]
    );
    if (inv.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบคำเชิญนี้ หรือถูกจัดการไปแล้ว' });
    }

    const alreadyIn = await client.query(`SELECT 1 FROM guild_members WHERE player_id = $1`, [req.playerId]);
    if (alreadyIn.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'คุณอยู่ในกิลด์อยู่แล้ว' });
    }

    const guildRes = await client.query(
      `SELECT max_members, (SELECT COUNT(*)::int FROM guild_members m WHERE m.guild_id = guilds.id) AS member_count
       FROM guilds WHERE id = $1 FOR UPDATE`,
      [inv.rows[0].guild_id]
    );
    if (guildRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'กิลด์นี้ถูกยุบไปแล้ว' });
    }
    if (guildRes.rows[0].member_count >= guildRes.rows[0].max_members) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'กิลด์เต็มแล้ว' });
    }

    await client.query(`INSERT INTO guild_members (player_id, guild_id, role) VALUES ($1, $2, 'member')`, [req.playerId, inv.rows[0].guild_id]);
    await client.query(`UPDATE guild_invites SET status = 'accepted', responded_at = now() WHERE id = $1`, [req.params.id]);
    // Tidy up: any other pending invites/applications I had elsewhere no longer matter.
    await client.query(`UPDATE guild_invites SET status = 'cancelled', responded_at = now() WHERE invitee_id = $1 AND status = 'pending'`, [req.playerId]);
    await client.query(`UPDATE guild_join_requests SET status = 'cancelled', responded_at = now() WHERE player_id = $1 AND status = 'pending'`, [req.playerId]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.post('/invites/:id/reject', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE guild_invites SET status = 'rejected', responded_at = now()
     WHERE id = $1 AND invitee_id = $2 AND status = 'pending' RETURNING id`,
    [req.params.id, req.playerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบคำเชิญนี้' });
  res.json({ ok: true });
}));

// DELETE /api/guilds/invites/:id — leader/officer cancels an invite they sent.
router.delete('/invites/:id', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership || !isLeaderOrOfficer(membership.role)) {
    return res.status(403).json({ error: 'ต้องเป็นหัวหน้าหรือรองหัวหน้ากิลด์' });
  }
  const { rows } = await pool.query(
    `UPDATE guild_invites SET status = 'cancelled', responded_at = now()
     WHERE id = $1 AND guild_id = $2 AND status = 'pending' RETURNING id`,
    [req.params.id, membership.guild_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบคำเชิญนี้' });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// GET /api/guilds/members — full member list of my guild.
// ---------------------------------------------------------------------------
router.get('/members', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });

  const { rows } = await pool.query(
    `SELECT gm.player_id, gm.role, gm.contribution_lifetime, gm.contribution_balance,
            gm.boss_damage_cycle, gm.boss_damage_lifetime, gm.joined_at,
            p.username, p.public_id, p.status, p.suspended_until, p.last_seen_at
     FROM guild_members gm JOIN players p ON p.id = gm.player_id
     WHERE gm.guild_id = $1
     ORDER BY (gm.role = 'leader') DESC, (gm.role = 'officer') DESC, gm.contribution_lifetime DESC`,
    [membership.guild_id]
  );
  res.json(rows.map((r) => ({
    playerId: r.player_id, username: r.username, publicId: r.public_id, role: r.role,
    contributionLifetime: Number(r.contribution_lifetime), contributionBalance: Number(r.contribution_balance),
    bossDamageCycle: Number(r.boss_damage_cycle), bossDamageLifetime: Number(r.boss_damage_lifetime),
    joinedAt: r.joined_at,
    accountStatus: r.status, suspendedUntil: r.suspended_until, lastSeenAt: r.last_seen_at,
  })));
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/leave
// ---------------------------------------------------------------------------
router.post('/leave', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const membership = await client.query(
      `SELECT * FROM guild_members WHERE player_id = $1 FOR UPDATE`, [req.playerId]
    );
    if (membership.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });
    }
    const { guild_id: guildId, role } = membership.rows[0];

    if (role === 'leader') {
      const others = await client.query(`SELECT COUNT(*)::int AS n FROM guild_members WHERE guild_id = $1 AND player_id != $2`, [guildId, req.playerId]);
      if (others.rows[0].n > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'หัวหน้ากิลด์ต้องโอนตำแหน่งให้คนอื่นก่อน หรือยุบกิลด์ ถ้าจะออก' });
      }
      // Sole member leaving = disbanding.
      await disbandGuildTx(client, guildId);
      await client.query('COMMIT');
      return res.json({ ok: true, disbanded: true });
    }

    await client.query(`DELETE FROM guild_members WHERE player_id = $1`, [req.playerId]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/disband — leader only, wipes the guild and everything in it.
// ---------------------------------------------------------------------------
router.post('/disband', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const membership = await client.query(`SELECT * FROM guild_members WHERE player_id = $1 FOR UPDATE`, [req.playerId]);
    if (membership.rows.length === 0 || membership.rows[0].role !== 'leader') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'หัวหน้ากิลด์เท่านั้นที่ยุบกิลด์ได้' });
    }
    await disbandGuildTx(client, membership.rows[0].guild_id);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

async function disbandGuildTx(client, guildId) {
  await client.query(`DELETE FROM guild_chat_messages WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_donations WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_shop_purchases WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_boss_attacks WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_boss_state WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_join_requests WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_invites WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_members WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guilds WHERE id = $1`, [guildId]);
}

// ---------------------------------------------------------------------------
// POST /api/guilds/kick { playerId } — leader/officer. Officers can't kick
// other officers or the leader.
// ---------------------------------------------------------------------------
router.post('/kick', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.body?.playerId;
  if (!targetId) return res.status(400).json({ error: 'missing playerId' });
  if (targetId === req.playerId) return res.status(400).json({ error: 'ใช้ปุ่มออกจากกิลด์แทน' });

  const membership = await getMembership(pool, req.playerId);
  if (!membership || !isLeaderOrOfficer(membership.role)) {
    return res.status(403).json({ error: 'ต้องเป็นหัวหน้าหรือรองหัวหน้ากิลด์' });
  }

  const target = await pool.query(`SELECT role FROM guild_members WHERE player_id = $1 AND guild_id = $2`, [targetId, membership.guild_id]);
  if (target.rows.length === 0) return res.status(404).json({ error: 'ไม่พบสมาชิกคนนี้ในกิลด์' });
  if (membership.role === 'officer' && target.rows[0].role !== 'member') {
    return res.status(403).json({ error: 'รองหัวหน้าเตะได้เฉพาะสมาชิกทั่วไป' });
  }
  if (target.rows[0].role === 'leader') return res.status(403).json({ error: 'เตะหัวหน้ากิลด์ไม่ได้' });

  await pool.query(`DELETE FROM guild_members WHERE player_id = $1 AND guild_id = $2`, [targetId, membership.guild_id]);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/promote / demote / transfer-leadership { playerId } — leader only.
// ---------------------------------------------------------------------------
router.post('/promote', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.body?.playerId;
  const membership = await getMembership(pool, req.playerId);
  if (!membership || membership.role !== 'leader') return res.status(403).json({ error: 'หัวหน้ากิลด์เท่านั้น' });
  const { rows } = await pool.query(
    `UPDATE guild_members SET role = 'officer' WHERE player_id = $1 AND guild_id = $2 AND role = 'member' RETURNING player_id`,
    [targetId, membership.guild_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบสมาชิกที่แต่งตั้งได้' });
  res.json({ ok: true });
}));

router.post('/demote', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.body?.playerId;
  const membership = await getMembership(pool, req.playerId);
  if (!membership || membership.role !== 'leader') return res.status(403).json({ error: 'หัวหน้ากิลด์เท่านั้น' });
  const { rows } = await pool.query(
    `UPDATE guild_members SET role = 'member' WHERE player_id = $1 AND guild_id = $2 AND role = 'officer' RETURNING player_id`,
    [targetId, membership.guild_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบรองหัวหน้าคนนี้' });
  res.json({ ok: true });
}));

router.post('/transfer-leadership', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.body?.playerId;
  if (!targetId) return res.status(400).json({ error: 'missing playerId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const membership = await client.query(`SELECT * FROM guild_members WHERE player_id = $1 FOR UPDATE`, [req.playerId]);
    if (membership.rows.length === 0 || membership.rows[0].role !== 'leader') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'หัวหน้ากิลด์เท่านั้น' });
    }
    const guildId = membership.rows[0].guild_id;
    const target = await client.query(`SELECT 1 FROM guild_members WHERE player_id = $1 AND guild_id = $2`, [targetId, guildId]);
    if (target.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบสมาชิกคนนี้ในกิลด์' });
    }

    await client.query(`UPDATE guild_members SET role = 'officer' WHERE player_id = $1`, [req.playerId]);
    await client.query(`UPDATE guild_members SET role = 'leader' WHERE player_id = $1`, [targetId]);
    await client.query(`UPDATE guilds SET leader_id = $1 WHERE id = $2`, [targetId, guildId]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Guild chat — simple polling: GET recent messages (optionally afterId=N to
// only fetch what's new), POST to send. Rate-limited to 1 message / 1.5s / player.
// ---------------------------------------------------------------------------
router.get('/chat', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });

  const afterId = Number(req.query.afterId) || 0;
  const { rows } = afterId > 0
    ? await pool.query(
        `SELECT * FROM guild_chat_messages WHERE guild_id = $1 AND id > $2 ORDER BY id ASC LIMIT 200`,
        [membership.guild_id, afterId]
      )
    : await pool.query(
        `SELECT * FROM (
           SELECT * FROM guild_chat_messages WHERE guild_id = $1 ORDER BY id DESC LIMIT 50
         ) t ORDER BY id ASC`,
        [membership.guild_id]
      );

  res.json(rows.map((r) => ({
    id: r.id, playerId: r.player_id, username: r.username, message: r.message, createdAt: r.created_at,
  })));
}));

router.post('/chat', requireAuth, asyncHandler(async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 300) : '';
  if (!message) return res.status(400).json({ error: 'ข้อความว่างเปล่า' });

  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });

  const last = await pool.query(
    `SELECT created_at FROM guild_chat_messages WHERE player_id = $1 ORDER BY id DESC LIMIT 1`,
    [req.playerId]
  );
  if (last.rows.length > 0 && Date.now() - new Date(last.rows[0].created_at).getTime() < 1500) {
    return res.status(429).json({ error: 'พิมพ์เร็วไปหน่อย รอสักครู่' });
  }

  const me = await pool.query(`SELECT username FROM players WHERE id = $1`, [req.playerId]);
  const { rows } = await pool.query(
    `INSERT INTO guild_chat_messages (guild_id, player_id, username, message) VALUES ($1, $2, $3, $4) RETURNING *`,
    [membership.guild_id, req.playerId, me.rows[0].username, message]
  );
  res.json({ ok: true, message: { id: rows[0].id, playerId: req.playerId, username: me.rows[0].username, message, createdAt: rows[0].created_at } });
}));

// ---------------------------------------------------------------------------
// POST /api/guilds/donate { amount } — money -> guild treasury + contribution.
// ---------------------------------------------------------------------------
router.post('/donate', requireAuth, asyncHandler(async (req, res) => {
  const amount = Math.floor(Number(req.body?.amount));
  if (!Number.isFinite(amount) || amount < DONATION_MIN || amount > DONATION_MAX) {
    return res.status(400).json({ error: `บริจาคได้ระหว่าง ${DONATION_MIN.toLocaleString()} - ${DONATION_MAX.toLocaleString()}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const membership = await client.query(`SELECT * FROM guild_members WHERE player_id = $1 FOR UPDATE`, [req.playerId]);
    if (membership.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });
    }

    const dayStart = currentGameDayStart();
    const dayStats = await client.query(
      `SELECT COUNT(*)::int AS n,
              COALESCE(SUM(amount), 0)::bigint AS money_sum,
              COALESCE(SUM(contribution_awarded), 0)::bigint AS contribution_sum,
              COALESCE(SUM(guild_exp_awarded), 0)::bigint AS exp_sum
       FROM guild_donations WHERE player_id = $1 AND created_at >= $2`,
      [req.playerId, dayStart]
    );
    const stats = dayStats.rows[0];
    if (stats.n >= DONATION_DAILY_LIMIT) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: `บริจาคได้สูงสุด ${DONATION_DAILY_LIMIT} ครั้งต่อวัน` });
    }
    const moneyDonatedToday = Number(stats.money_sum);
    if (moneyDonatedToday + amount > DONATION_DAILY_MONEY_CAP) {
      await client.query('ROLLBACK');
      return res.status(429).json({
        error: `บริจาคเงินได้สูงสุด ${DONATION_DAILY_MONEY_CAP.toLocaleString()} ต่อวัน (บริจาคไปแล้ววันนี้ ${moneyDonatedToday.toLocaleString()})`,
      });
    }

    await client.query(`INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [req.playerId]);
    const econ = await client.query(`SELECT money FROM player_economy WHERE player_id = $1 FOR UPDATE`, [req.playerId]);
    if (Number(econ.rows[0]?.money || 0) < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'เงินไม่พอ' });
    }

    // Contribution points and guild EXP each have their own daily cap per
    // player (reset with dayStart above). Extra money beyond what earns the
    // capped amount still goes to the treasury — it just stops personally
    // rewarding the donor for the rest of the game day.
    const rawContribution = contributionForDonation(amount);
    const contributionLeftToday = Math.max(0, DONATION_DAILY_CONTRIBUTION_CAP - Number(stats.contribution_sum));
    const contribution = Math.min(rawContribution, contributionLeftToday);

    const rawExp = contribution * GUILD_EXP_PER_CONTRIBUTION;
    const expLeftToday = Math.max(0, DONATION_DAILY_GUILD_EXP_CAP - Number(stats.exp_sum));
    const expAwarded = Math.min(rawExp, expLeftToday);

    const guildId = membership.rows[0].guild_id;

    await client.query(`UPDATE player_economy SET money = money - $2, updated_at = now() WHERE player_id = $1`, [req.playerId, amount]);
    await client.query(
      `UPDATE guild_members SET contribution_lifetime = contribution_lifetime + $2, contribution_balance = contribution_balance + $2
       WHERE player_id = $1`,
      [req.playerId, contribution]
    );
    await client.query(
      `UPDATE guilds SET treasury_money = treasury_money + $2, total_contribution = total_contribution + $3 WHERE id = $1`,
      [guildId, amount, contribution]
    );
    await client.query(
      `INSERT INTO guild_donations (guild_id, player_id, amount, contribution_awarded, guild_exp_awarded) VALUES ($1, $2, $3, $4, $5)`,
      [guildId, req.playerId, amount, contribution, expAwarded]
    );
    const levelResult = await grantGuildExpTx(client, guildId, expAwarded);

    await client.query('COMMIT');
    res.json({
      ok: true, contribution, donationsLeftToday: DONATION_DAILY_LIMIT - stats.n - 1,
      moneyDonatedToday: moneyDonatedToday + amount, moneyCapToday: DONATION_DAILY_MONEY_CAP,
      contributionEarnedToday: Number(stats.contribution_sum) + contribution, contributionCapToday: DONATION_DAILY_CONTRIBUTION_CAP,
      guildExpEarnedToday: Number(stats.exp_sum) + expAwarded, guildExpCapToday: DONATION_DAILY_GUILD_EXP_CAP,
      contributionCapped: contribution < rawContribution,
      dailyResetAt: currentGameDayEnd().toISOString(),
      guildLevel: levelResult?.level, leveledUp: !!levelResult?.leveledUp,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Guild shop — spends contribution_balance, personal weekly purchase limits.
// ---------------------------------------------------------------------------
router.get('/shop', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });

  const cycle = currentGuildCycle();
  const [purchaseRows, playerRow] = await Promise.all([
    pool.query(
      `SELECT item_key, COUNT(*)::int AS n FROM guild_shop_purchases WHERE player_id = $1 AND cycle = $2 GROUP BY item_key`,
      [req.playerId, cycle]
    ),
    pool.query(`SELECT owned_frames FROM players WHERE id = $1`, [req.playerId]),
  ]);
  const boughtByKey = new Map(purchaseRows.rows.map((r) => [r.item_key, r.n]));
  const ownedFrames = new Set(playerRow.rows[0]?.owned_frames || []);
  const guildLevel = expProgress(Number(membership.exp) || 0).level;

  res.json({
    myBalance: Number(membership.contribution_balance),
    guildLevel,
    cycleEndsAt: guildCycleEndsAt(cycle),
    catalog: GUILD_SHOP_CATALOG.map((item) => {
      // กรอบปก (avatar frame) items are a one-time cosmetic purchase, not a
      // weekly-refreshing consumable — once owned, permanently blocked
      // regardless of what the weekly purchase count says.
      const owned = !!item.rewardFrameKey && ownedFrames.has(item.rewardFrameKey);
      return {
        ...item,
        locked: guildLevel < item.minLevel,
        owned,
        purchasedThisCycle: boughtByKey.get(item.key) || 0,
        remaining: owned || guildLevel < item.minLevel ? 0 : Math.max(0, item.limit - (boughtByKey.get(item.key) || 0)),
      };
    }),
  });
}));

router.post('/shop/buy', requireAuth, asyncHandler(async (req, res) => {
  const item = findShopItem(req.body?.itemKey);
  if (!item) return res.status(400).json({ error: 'ไม่พบไอเทมนี้ในร้านค้ากิลด์' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const membership = await client.query(`SELECT gm.*, g.exp FROM guild_members gm JOIN guilds g ON g.id = gm.guild_id WHERE gm.player_id = $1 FOR UPDATE OF gm`, [req.playerId]);
    if (membership.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });
    }
    const guildLevel = expProgress(Number(membership.rows[0].exp) || 0).level;
    if (guildLevel < item.minLevel) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: `ต้องการกิลด์เลเวล ${item.minLevel} ขึ้นไป (ตอนนี้เลเวล ${guildLevel})` });
    }
    if (Number(membership.rows[0].contribution_balance) < item.cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'แต้มบริจาคไม่พอ' });
    }

    // กรอบปก (avatar frame) items are a one-time cosmetic — block repurchase
    // permanently once owned, independent of the weekly cycle/limit below.
    let playerRow = null;
    if (item.rewardFrameKey) {
      playerRow = await client.query(`SELECT owned_frames FROM players WHERE id = $1 FOR UPDATE`, [req.playerId]);
      const ownedFrames = playerRow.rows[0]?.owned_frames || [];
      if (ownedFrames.includes(item.rewardFrameKey)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'คุณมีกรอบปกนี้อยู่แล้ว' });
      }
    }

    const cycle = currentGuildCycle();
    const boughtCount = await client.query(
      `SELECT COUNT(*)::int AS n FROM guild_shop_purchases WHERE player_id = $1 AND cycle = $2 AND item_key = $3`,
      [req.playerId, cycle, item.key]
    );
    if (boughtCount.rows[0].n >= item.limit) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: 'ซื้อไอเทมนี้ครบโควตาสัปดาห์นี้แล้ว' });
    }

    await client.query(`UPDATE guild_members SET contribution_balance = contribution_balance - $2 WHERE player_id = $1`, [req.playerId, item.cost]);
    await client.query(
      `INSERT INTO guild_shop_purchases (guild_id, player_id, cycle, item_key, cost) VALUES ($1, $2, $3, $4, $5)`,
      [membership.rows[0].guild_id, req.playerId, cycle, item.key, item.cost]
    );

    if (item.rewardFrameKey) {
      // Cosmetic-only reward — no money/bag payload, just grant ownership.
      const ownedFrames = playerRow.rows[0]?.owned_frames || [];
      const newOwnedFrames = [...ownedFrames, item.rewardFrameKey];
      await client.query(`UPDATE players SET owned_frames = $2 WHERE id = $1`, [req.playerId, JSON.stringify(newOwnedFrames)]);

      await client.query('COMMIT');
      return res.json({ ok: true, frame: item.rewardFrameKey, balanceLeft: Number(membership.rows[0].contribution_balance) - item.cost });
    }

    await client.query(`INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [req.playerId]);
    const econ = await client.query(`SELECT money, bag FROM player_economy WHERE player_id = $1 FOR UPDATE`, [req.playerId]);
    const newMoney = Number(econ.rows[0].money) + (item.rewardMoney || 0);
    const newBag = { ...econ.rows[0].bag };
    if (item.rewardBagKey && item.rewardBagQty) {
      newBag[item.rewardBagKey] = (newBag[item.rewardBagKey] || 0) + item.rewardBagQty;
    }
    await client.query(
      `UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newMoney, JSON.stringify(newBag)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, money: newMoney, bag: newBag, balanceLeft: Number(membership.rows[0].contribution_balance) - item.cost });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// Guild boss — shared weekly HP pool. GET rolls the cycle over (and mails
// last week's rewards) if needed before reporting state.
// ---------------------------------------------------------------------------
router.get('/boss', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });

  const client = await pool.connect();
  let state;
  try {
    await client.query('BEGIN');
    state = await ensureGuildBossStateTx(client, membership.guild_id);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const attacksToday = await pool.query(
    `SELECT COUNT(*)::int AS n FROM guild_boss_attacks WHERE player_id = $1 AND attacked_at > now() - interval '24 hours'`,
    [req.playerId]
  );
  const mine = await pool.query(`SELECT boss_damage_cycle FROM guild_members WHERE player_id = $1`, [req.playerId]);
  const top = await pool.query(
    `SELECT p.username, gm.boss_damage_cycle FROM guild_members gm JOIN players p ON p.id = gm.player_id
     WHERE gm.guild_id = $1 AND gm.boss_damage_cycle > 0 ORDER BY gm.boss_damage_cycle DESC LIMIT 10`,
    [membership.guild_id]
  );

  res.json({
    bossName: GUILD_BOSS_NAME,
    cycle: Number(state.cycle),
    cycleEndsAt: guildCycleEndsAt(Number(state.cycle)),
    maxHp: Number(state.max_hp),
    currentHp: Number(state.current_hp),
    defeated: !!state.defeated_at,
    myDamageCycle: Number(mine.rows[0]?.boss_damage_cycle || 0),
    attacksToday: attacksToday.rows[0].n,
    attacksLeftToday: Math.max(0, GUILD_BOSS_ATTACKS_PER_DAY - attacksToday.rows[0].n),
    topDamage: top.rows.map((r) => ({ username: r.username, damage: Number(r.boss_damage_cycle) })),
  });
}));

router.post('/boss/attack', requireAuth, asyncHandler(async (req, res) => {
  const membership = await getMembership(pool, req.playerId);
  if (!membership) return res.status(404).json({ error: 'คุณยังไม่ได้อยู่ในกิลด์' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const state = await ensureGuildBossStateTx(client, membership.guild_id);
    if (state.current_hp <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'บอสกิลด์ถูกปราบไปแล้วในสัปดาห์นี้ รอสัปดาห์หน้า' });
    }

    const attacksToday = await client.query(
      `SELECT COUNT(*)::int AS n FROM guild_boss_attacks WHERE player_id = $1 AND attacked_at > now() - interval '24 hours'`,
      [req.playerId]
    );
    if (attacksToday.rows[0].n >= GUILD_BOSS_ATTACKS_PER_DAY) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: `โจมตีได้สูงสุด ${GUILD_BOSS_ATTACKS_PER_DAY} ครั้งต่อวัน` });
    }

    const econ = await client.query(`SELECT deck FROM player_economy WHERE player_id = $1`, [req.playerId]);
    const damage = computeBossAttackDamage(econ.rows[0]?.deck);
    const newHp = Math.max(0, Number(state.current_hp) - damage);

    await client.query(
      `UPDATE guild_boss_state SET current_hp = $2, defeated_at = CASE WHEN $2 <= 0 THEN now() ELSE defeated_at END, updated_at = now() WHERE guild_id = $1`,
      [membership.guild_id, newHp]
    );
    await client.query(
      `UPDATE guild_members SET boss_damage_cycle = boss_damage_cycle + $2, boss_damage_lifetime = boss_damage_lifetime + $2 WHERE player_id = $1`,
      [req.playerId, damage]
    );
    await client.query(
      `INSERT INTO guild_boss_attacks (guild_id, player_id, cycle, damage) VALUES ($1, $2, $3, $4)`,
      [membership.guild_id, req.playerId, Number(state.cycle), damage]
    );
    const levelResult = await grantGuildExpTx(client, membership.guild_id, damage * GUILD_EXP_PER_BOSS_DAMAGE);

    await client.query('COMMIT');
    res.json({
      ok: true, damage, currentHp: newHp, maxHp: Number(state.max_hp),
      defeated: newHp <= 0, attacksLeftToday: GUILD_BOSS_ATTACKS_PER_DAY - attacksToday.rows[0].n - 1,
      guildLevel: levelResult?.level, leveledUp: !!levelResult?.leveledUp,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
