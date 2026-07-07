// routes/daily.js — daily login streak + daily missions.
// Same server-authoritative pattern as routes/economy.js: every mutation runs
// inside a transaction with a row lock, so a double-tap/client retry can't
// double-pay a login claim or a mission claim.
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const {
  currentDayIndex, dayIndexEndsAt,
  LOGIN_REWARD_CYCLE, loginRewardForStreak,
  DAILY_MISSIONS, DAILY_BONUS_ALL, findMission,
} = require('../game-data/daily-data');

const router = express.Router();

async function getOrCreateEconomy(client, playerId) {
  await client.query(
    `INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [playerId]
  );
  const { rows } = await client.query(
    `SELECT * FROM player_economy WHERE player_id = $1 FOR UPDATE`,
    [playerId]
  );
  return rows[0];
}

function creditReward(client, playerId, econ, reward) {
  const newMoney = Number(econ.money) + Number(reward.money || 0);
  const newBag = { ...econ.bag };
  if (reward.bagKey && Number(reward.bagQty) > 0) {
    newBag[reward.bagKey] = (newBag[reward.bagKey] || 0) + Number(reward.bagQty);
  }
  return client.query(
    `UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`,
    [playerId, newMoney, JSON.stringify(newBag)]
  ).then(() => ({ money: newMoney, bag: newBag }));
}

// ---------------------------------------------------------------------------
// GET /api/daily/status — everything the daily-login/missions widget needs to render.
// ---------------------------------------------------------------------------
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const dayIndex = currentDayIndex();

  const loginRes = await pool.query(`SELECT * FROM daily_login_state WHERE player_id = $1`, [req.playerId]);
  const login = loginRes.rows[0] || null;
  const claimedToday = !!login && login.last_claim_day === dayIndex;
  const nextStreak = !login
    ? 1
    : (claimedToday ? login.streak : (login.last_claim_day === dayIndex - 1 ? login.streak + 1 : 1));

  const missionRows = await pool.query(
    `SELECT mission_key, progress, claimed_at FROM daily_mission_progress WHERE player_id = $1 AND day_index = $2`,
    [req.playerId, dayIndex]
  );
  const byKey = {};
  missionRows.rows.forEach((r) => { byKey[r.mission_key] = r; });

  const missions = DAILY_MISSIONS.map((m) => {
    const row = byKey[m.key];
    const progress = Math.min(row ? row.progress : 0, m.target);
    return {
      key: m.key,
      label: m.label,
      target: m.target,
      progress,
      done: progress >= m.target,
      claimed: !!row?.claimed_at,
      reward: { money: m.money || 0, bagKey: m.bagKey || null, bagQty: m.bagQty || 0 },
    };
  });
  const allClaimed = missions.every((m) => m.claimed);
  const bonusRow = byKey['_bonus_all'];

  res.json({
    dayIndex,
    resetAt: dayIndexEndsAt(dayIndex),
    login: {
      streak: login ? login.streak : 0,
      claimedToday,
      nextStreak,
      nextReward: loginRewardForStreak(nextStreak),
      cycleLength: LOGIN_REWARD_CYCLE.length,
      totalClaims: login ? login.total_claims : 0,
    },
    missions,
    bonus: {
      reward: DAILY_BONUS_ALL,
      available: allClaimed,
      claimed: !!bonusRow?.claimed_at,
    },
  });
}));

// ---------------------------------------------------------------------------
// POST /api/daily/login/claim — claim today's login reward, advancing the streak.
// ---------------------------------------------------------------------------
router.post('/login/claim', requireAuth, asyncHandler(async (req, res) => {
  const dayIndex = currentDayIndex();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO daily_login_state (player_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [req.playerId]
    );
    const { rows } = await client.query(
      `SELECT * FROM daily_login_state WHERE player_id = $1 FOR UPDATE`,
      [req.playerId]
    );
    const state = rows[0];

    if (state.last_claim_day === dayIndex) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'วันนี้รับรางวัลล็อกอินไปแล้ว' });
    }

    const newStreak = (state.last_claim_day === dayIndex - 1) ? state.streak + 1 : 1;
    const reward = loginRewardForStreak(newStreak);

    const econ = await getOrCreateEconomy(client, req.playerId);
    const { money, bag } = await creditReward(client, req.playerId, econ, reward);

    await client.query(
      `UPDATE daily_login_state SET streak = $2, last_claim_day = $3, total_claims = total_claims + 1, updated_at = now() WHERE player_id = $1`,
      [req.playerId, newStreak, dayIndex]
    );

    await client.query('COMMIT');
    res.json({ ok: true, streak: newStreak, reward, money, bag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/daily/missions/claim { key } — claim one completed mission's reward.
// ---------------------------------------------------------------------------
router.post('/missions/claim', requireAuth, asyncHandler(async (req, res) => {
  const key = String(req.body?.key || '');
  const mission = findMission(key);
  if (!mission) return res.status(400).json({ error: 'invalid mission key' });
  const dayIndex = currentDayIndex();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM daily_mission_progress WHERE player_id = $1 AND day_index = $2 AND mission_key = $3 FOR UPDATE`,
      [req.playerId, dayIndex, key]
    );
    const row = rows[0];
    if (!row || row.progress < mission.target) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ภารกิจยังไม่สำเร็จ' });
    }
    if (row.claimed_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'รับรางวัลภารกิจนี้ไปแล้ว' });
    }

    const econ = await getOrCreateEconomy(client, req.playerId);
    const { money, bag } = await creditReward(client, req.playerId, econ, {
      money: mission.money, bagKey: mission.bagKey, bagQty: mission.bagQty,
    });

    await client.query(
      `UPDATE daily_mission_progress SET claimed_at = now() WHERE player_id = $1 AND day_index = $2 AND mission_key = $3`,
      [req.playerId, dayIndex, key]
    );

    await client.query('COMMIT');
    res.json({ ok: true, money, bag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/daily/missions/claim-bonus — extra reward once every mission today is claimed.
// ---------------------------------------------------------------------------
router.post('/missions/claim-bonus', requireAuth, asyncHandler(async (req, res) => {
  const dayIndex = currentDayIndex();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const keys = DAILY_MISSIONS.map((m) => m.key);
    const { rows } = await client.query(
      `SELECT mission_key, claimed_at FROM daily_mission_progress
       WHERE player_id = $1 AND day_index = $2 AND mission_key = ANY($3)`,
      [req.playerId, dayIndex, keys]
    );
    const claimedSet = new Set(rows.filter((r) => r.claimed_at).map((r) => r.mission_key));
    const allClaimed = keys.every((k) => claimedSet.has(k));
    if (!allClaimed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ยังทำภารกิจวันนี้ไม่ครบทุกข้อ' });
    }

    const bonusRes = await client.query(
      `SELECT * FROM daily_mission_progress WHERE player_id = $1 AND day_index = $2 AND mission_key = '_bonus_all' FOR UPDATE`,
      [req.playerId, dayIndex]
    );
    if (bonusRes.rows[0]?.claimed_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'รับโบนัสนี้ไปแล้ว' });
    }

    const econ = await getOrCreateEconomy(client, req.playerId);
    const { money, bag } = await creditReward(client, req.playerId, econ, DAILY_BONUS_ALL);

    await client.query(
      `INSERT INTO daily_mission_progress (player_id, day_index, mission_key, progress, claimed_at)
       VALUES ($1, $2, '_bonus_all', 1, now())
       ON CONFLICT (player_id, day_index, mission_key) DO UPDATE SET claimed_at = now()`,
      [req.playerId, dayIndex]
    );

    await client.query('COMMIT');
    res.json({ ok: true, money, bag });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
