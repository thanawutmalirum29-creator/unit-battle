// routes/pvp.js — PvP Ranked Arena ("สมรภูมิจัดอันดับ")
//
// Async ladder: no live matchmaking/sockets. Each player sets a DEFENSE team
// (4 cards from their own server-owned deck). Attacking someone resolves the
// whole battle immediately, server-side, in one request — reusing the exact
// same turn engine as PvE (server/battle/engine.js) run round-by-round until
// it finishes, instead of polling turn-by-turn like routes/battle.js does for
// animated PvE fights. That's fine here: nobody needs to *watch* an opponent's
// snapshot team fight in real time, only see the result + a replay-able log.
//
// Season lifecycle: seasons are pre-configured (30 days default) but the game
// isn't live yet, so nothing auto-starts. An admin explicitly starts the first
// season (POST /api/admin/pvp/season/start, see routes/admin.js). Once a
// season IS active, ensureSeasonState() below lazily rolls it over to the next
// one the moment its end date has passed and any player touches a PvP route —
// same "check on request, no cron job" pattern as the suspended_until account
// check (see db/accountStatus.js).
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { bumpMissionProgress } = require('../db/dailyMissions');
const engine = require('../battle/engine');
const { buildPlayerUnit } = require('../battle/team-builder');
const {
  START_RATING, DAILY_FREE_ATTACKS, ATTACK_COOLDOWN_MINUTES, MAX_BATTLE_ROUNDS,
  PVP_MEDAL_KEY, rankInfo, computeEloDeltas, ATTACK_REWARDS, DEFENSE_REWARDS, seasonRewardFor,
} = require('../game-data/pvp-data');

const router = express.Router();

// ---------------------------------------------------------------------------
// Small local helpers (deliberately not shared with routes/battle.js — same
// pattern as economy.js/guilds.js each keeping their own tiny bag helper).
// ---------------------------------------------------------------------------
function mergeBag(bag, delta) {
  const next = { ...(bag || {}) };
  for (const [k, v] of Object.entries(delta || {})) next[k] = (next[k] || 0) + v;
  return next;
}

async function getOrCreateEconomy(client, playerId) {
  await client.query(`INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [playerId]);
  const { rows } = await client.query(`SELECT * FROM player_economy WHERE player_id = $1 FOR UPDATE`, [playerId]);
  return rows[0];
}

// Builds a battle-ready team from cardIds against a real deck — validates
// that every id actually belongs to that deck (never trust card stats from
// the client, only which ids they picked), mirrors buildPlayerTeamFromDeck
// in routes/battle.js.
function buildTeamFromDeck(deck, cardIds, asEnemy) {
  if (!Array.isArray(cardIds) || cardIds.length === 0 || cardIds.length > 4) return null;
  if (new Set(cardIds).size !== cardIds.length) return null;
  const units = [];
  for (let i = 0; i < cardIds.length; i++) {
    const card = deck.find(c => c.id === cardIds[i]);
    if (!card) return null;
    const unit = buildPlayerUnit(card, i);
    if (asEnemy) {
      unit.isEnemy = true;
      unit.instanceId = `D-${i}-${card.id}`;
    }
    units.push(unit);
  }
  return units;
}

function sanitizeUnit(u) {
  const { name, class: cls, skill, hp, maxHp, atk, def, isEnemy } = u;
  return { name, class: cls, skill, hp, maxHp, atk, def, isEnemy };
}

// ---------------------------------------------------------------------------
// Season lifecycle — lazily ensures exactly one row is the "current" season
// context, rolling an expired active season into 'ended' (+ distributing
// rewards + writing pvp_season_history) and immediately opening the next one.
// Called at the top of every player-facing route below.
// ---------------------------------------------------------------------------
async function ensureSeasonState(client) {
  let { rows } = await client.query(
    `SELECT * FROM pvp_seasons WHERE status IN ('active','upcoming') ORDER BY season_number DESC LIMIT 1`
  );
  let season = rows[0];

  if (!season) {
    const ins = await client.query(
      `INSERT INTO pvp_seasons (season_number, status) VALUES (1, 'upcoming') RETURNING *`
    );
    season = ins.rows[0];
  }

  if (season.status === 'active' && new Date(season.ends_at) <= new Date()) {
    await finalizeSeason(client, season);
    const next = await client.query(
      `INSERT INTO pvp_seasons (season_number, status, starts_at, ends_at)
       VALUES ($1, 'active', now(), now() + ($2 || ' days')::interval) RETURNING *`,
      [season.season_number + 1, season.duration_days]
    );
    season = next.rows[0];
  }

  return season;
}

// Freezes final standings into pvp_season_history, mails out rank/tier rewards,
// and updates each player's lifetime-best rating. Runs inside the caller's
// transaction (ensureSeasonState is always called at the start of a route's
// own BEGIN...COMMIT block).
async function finalizeSeason(client, season) {
  const { rows: standings } = await client.query(
    `SELECT player_id, rating, wins, losses,
            RANK() OVER (ORDER BY rating DESC) AS final_rank
     FROM pvp_ratings WHERE season_id = $1`,
    [season.id]
  );

  for (const row of standings) {
    const tierKey = rankInfo(row.rating).key;
    const reward = seasonRewardFor(Number(row.final_rank), tierKey);

    const mailRes = await client.query(
      `INSERT INTO mailbox (player_id, subject, body, reward_money, reward_bag_key, reward_bag_qty, sent_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'system')
       RETURNING id`,
      [
        row.player_id, reward.subject,
        `จบซีซั่นที่ ${season.season_number} ด้วยอันดับ #${row.final_rank} (เรตติ้ง ${row.rating}) — ${row.wins} ชนะ / ${row.losses} แพ้`,
        reward.money, PVP_MEDAL_KEY, reward.medals,
      ]
    );

    await client.query(
      `INSERT INTO pvp_season_history (season_id, player_id, final_rank, final_rating, tier_key, wins, losses, reward_mail_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (season_id, player_id) DO NOTHING`,
      [season.id, row.player_id, row.final_rank, row.rating, tierKey, row.wins, row.losses, mailRes.rows[0].id]
    );

    await client.query(
      `UPDATE players SET pvp_best_rating_lifetime = GREATEST(pvp_best_rating_lifetime, $2) WHERE id = $1`,
      [row.player_id, row.rating]
    );
  }

  await client.query(
    `UPDATE pvp_seasons SET status = 'ended', ended_at = now(), rewards_distributed_at = now() WHERE id = $1`,
    [season.id]
  );
}

async function ensureRatingRow(client, seasonId, playerId) {
  await client.query(
    `INSERT INTO pvp_ratings (season_id, player_id, rating) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [seasonId, playerId, START_RATING]
  );
  const { rows } = await client.query(
    `SELECT * FROM pvp_ratings WHERE season_id = $1 AND player_id = $2 FOR UPDATE`,
    [seasonId, playerId]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// GET /api/pvp/status — season info + my rating/tier/rank/attacks-remaining.
// ---------------------------------------------------------------------------
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const season = await ensureSeasonState(client);

    let myRating = null, rank = null, attacksUsed = 0, hasDefense = false;
    if (season.status === 'active') {
      const ratingRow = await ensureRatingRow(client, season.id, req.playerId);
      myRating = ratingRow;
      const rankRes = await client.query(
        `SELECT COUNT(*) + 1 AS rank FROM pvp_ratings WHERE season_id = $1 AND rating > $2`,
        [season.id, ratingRow.rating]
      );
      rank = Number(rankRes.rows[0].rank);

      const dailyRes = await client.query(
        `SELECT attacks_used FROM pvp_daily WHERE player_id = $1 AND day = CURRENT_DATE`,
        [req.playerId]
      );
      attacksUsed = dailyRes.rows[0]?.attacks_used || 0;

      const defRes = await client.query(`SELECT card_ids FROM pvp_defense WHERE player_id = $1`, [req.playerId]);
      hasDefense = Array.isArray(defRes.rows[0]?.card_ids) && defRes.rows[0].card_ids.length > 0;
    }

    await client.query('COMMIT');
    res.json({
      season: {
        seasonNumber: season.season_number,
        status: season.status,
        startsAt: season.starts_at,
        endsAt: season.ends_at,
        durationDays: season.duration_days,
      },
      rating: myRating ? myRating.rating : null,
      wins: myRating ? myRating.wins : 0,
      losses: myRating ? myRating.losses : 0,
      winStreak: myRating ? myRating.win_streak : 0,
      rankInfo: myRating ? rankInfo(myRating.rating) : null,
      globalRank: rank,
      attacksUsedToday: attacksUsed,
      attacksRemainingToday: Math.max(0, DAILY_FREE_ATTACKS - attacksUsed),
      dailyFreeAttacks: DAILY_FREE_ATTACKS,
      hasDefenseTeam: hasDefense,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/pvp/defense { cardIds } — set/replace defense team.
// ---------------------------------------------------------------------------
router.post('/defense', requireAuth, asyncHandler(async (req, res) => {
  const { cardIds } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = Array.isArray(econ.deck) ? econ.deck : [];
    const team = buildTeamFromDeck(deck, cardIds, false);
    if (!team) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid defense team selection' });
    }
    await client.query(
      `INSERT INTO pvp_defense (player_id, card_ids, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (player_id) DO UPDATE SET card_ids = $2, updated_at = now()`,
      [req.playerId, JSON.stringify(cardIds)]
    );
    await client.query('COMMIT');
    res.json({ ok: true, cardIds });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.get('/defense', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT card_ids, updated_at FROM pvp_defense WHERE player_id = $1`, [req.playerId]);
  res.json({ cardIds: rows[0]?.card_ids || [], updatedAt: rows[0]?.updated_at || null });
}));

// ---------------------------------------------------------------------------
// GET /api/pvp/opponents — up to 5 matchmaking candidates near my rating,
// excluding myself and anyone I've attacked within the cooldown window.
// ---------------------------------------------------------------------------
router.get('/opponents', requireAuth, asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const season = await ensureSeasonState(client);
    if (season.status !== 'active') {
      await client.query('ROLLBACK');
      return res.json({ seasonActive: false, opponents: [] });
    }
    const myRating = await ensureRatingRow(client, season.id, req.playerId);

    const { rows } = await client.query(
      `SELECT r.player_id, r.rating, r.wins, r.losses, p.username
       FROM pvp_ratings r
       JOIN players p ON p.id = r.player_id
       JOIN pvp_defense d ON d.player_id = r.player_id AND jsonb_array_length(d.card_ids) > 0
       WHERE r.season_id = $1
         AND r.player_id != $2
         AND p.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM pvp_battles b
           WHERE b.attacker_id = $2 AND b.defender_id = r.player_id
             AND b.created_at > now() - ($3 || ' minutes')::interval
         )
       ORDER BY ABS(r.rating - $4) ASC
       LIMIT 20`,
      [season.id, req.playerId, ATTACK_COOLDOWN_MINUTES, myRating.rating]
    );

    await client.query('COMMIT');

    // Pick up to 5 at random out of the closest-20 pool, so it's not always
    // literally the single closest rating every refresh.
    const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, 5);
    res.json({
      seasonActive: true,
      opponents: shuffled.map(o => ({
        playerId: o.player_id,
        username: o.username,
        rating: o.rating,
        wins: o.wins,
        losses: o.losses,
        rankInfo: rankInfo(o.rating),
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/pvp/attack { opponentId, cardIds } — resolve the whole battle now.
// ---------------------------------------------------------------------------
router.post('/attack', requireAuth, asyncHandler(async (req, res) => {
  const { opponentId, cardIds } = req.body || {};
  if (!opponentId || opponentId === req.playerId) {
    return res.status(400).json({ error: 'invalid opponent' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const season = await ensureSeasonState(client);
    if (season.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ยังไม่มีซีซั่นที่เปิดใช้งานอยู่ตอนนี้' });
    }

    // ---- daily ticket ----
    const dailyRes = await client.query(
      `INSERT INTO pvp_daily (player_id, day, attacks_used) VALUES ($1, CURRENT_DATE, 0)
       ON CONFLICT (player_id, day) DO UPDATE SET attacks_used = pvp_daily.attacks_used
       RETURNING attacks_used`,
      [req.playerId]
    );
    if (dailyRes.rows[0].attacks_used >= DAILY_FREE_ATTACKS) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ตั๋วโจมตีวันนี้หมดแล้ว กลับมาใหม่พรุ่งนี้' });
    }

    // ---- cooldown against the same defender ----
    const cooldownRes = await client.query(
      `SELECT 1 FROM pvp_battles WHERE attacker_id = $1 AND defender_id = $2
         AND created_at > now() - ($3 || ' minutes')::interval`,
      [req.playerId, opponentId, ATTACK_COOLDOWN_MINUTES]
    );
    if (cooldownRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `เพิ่งโจมตีผู้เล่นคนนี้ไป กรุณารออีก ${ATTACK_COOLDOWN_MINUTES} นาที` });
    }

    // ---- build both teams ----
    const attackerEcon = await getOrCreateEconomy(client, req.playerId);
    const attackerDeck = Array.isArray(attackerEcon.deck) ? attackerEcon.deck : [];
    const playerTeam = buildTeamFromDeck(attackerDeck, cardIds, false);
    if (!playerTeam) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid team selection' });
    }

    const defRes = await client.query(`SELECT card_ids FROM pvp_defense WHERE player_id = $1`, [opponentId]);
    const defenderEcon = await client.query(`SELECT deck FROM player_economy WHERE player_id = $1`, [opponentId]);
    const defenderDeck = Array.isArray(defenderEcon.rows[0]?.deck) ? defenderEcon.rows[0].deck : [];
    const defenseCardIds = Array.isArray(defRes.rows[0]?.card_ids) ? defRes.rows[0].card_ids : [];
    // A defense card may have since been sold/upgraded away — only fight with
    // whatever of the saved defense ids still exist in the opponent's deck.
    const stillOwnedIds = defenseCardIds.filter(id => defenderDeck.some(c => c.id === id));
    const enemyTeam = buildTeamFromDeck(defenderDeck, stillOwnedIds, true);
    if (!enemyTeam) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ผู้เล่นคนนี้ยังไม่มีทีมป้องกันที่ใช้ได้ ลองเลือกคนอื่น' });
    }

    // ---- lock + load both rating rows ----
    const attackerRating = await ensureRatingRow(client, season.id, req.playerId);
    const defenderRating = await ensureRatingRow(client, season.id, opponentId);

    // ---- run the fight, start to finish, right now ----
    const state = { playerTeam, enemyTeam, mode: 'pvp' };
    const fullLog = [];
    let win = false, rounds = 0;
    for (let i = 0; i < MAX_BATTLE_ROUNDS; i++) {
      const roundLog = [];
      const ctx = { log: (msg, side) => roundLog.push({ msg, side }), trackDamage: () => {}, addBossDamage: () => {} };
      const result = await engine.runRound(state, ctx);
      rounds++;
      fullLog.push({ round: rounds, entries: roundLog });
      if (result.finished) { win = result.win === true; break; }
    }

    // ---- Elo ----
    const attackerGames = attackerRating.wins + attackerRating.losses;
    const defenderGames = defenderRating.wins + defenderRating.losses;
    const { attackerDelta, defenderDelta } = computeEloDeltas({
      attackerRating: attackerRating.rating, defenderRating: defenderRating.rating,
      attackerGames, defenderGames, attackerWinStreak: attackerRating.win_streak, win,
    });
    const newAttackerRating = Math.max(0, attackerRating.rating + attackerDelta);
    const newDefenderRating = Math.max(0, defenderRating.rating + defenderDelta);

    await client.query(
      `UPDATE pvp_ratings SET rating = $3, wins = wins + $4, losses = losses + $5,
         win_streak = $6, best_streak = GREATEST(best_streak, $6), updated_at = now()
       WHERE season_id = $1 AND player_id = $2`,
      [season.id, req.playerId, newAttackerRating, win ? 1 : 0, win ? 0 : 1, win ? attackerRating.win_streak + 1 : 0]
    );
    await client.query(
      `UPDATE pvp_ratings SET rating = $3, wins = wins + $4, losses = losses + $5,
         win_streak = $6, best_streak = GREATEST(best_streak, $6), updated_at = now()
       WHERE season_id = $1 AND player_id = $2`,
      [season.id, opponentId, newDefenderRating, win ? 0 : 1, win ? 1 : 0, win ? 0 : defenderRating.win_streak + 1]
    );
    await client.query(`UPDATE players SET pvp_best_rating_lifetime = GREATEST(pvp_best_rating_lifetime, $2) WHERE id = $1`, [req.playerId, newAttackerRating]);
    await client.query(`UPDATE players SET pvp_best_rating_lifetime = GREATEST(pvp_best_rating_lifetime, $2) WHERE id = $1`, [opponentId, newDefenderRating]);

    await client.query(
      `INSERT INTO pvp_battles (season_id, attacker_id, defender_id, win,
         attacker_rating_before, attacker_rating_after, defender_rating_before, defender_rating_after, log)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [season.id, req.playerId, opponentId, win, attackerRating.rating, newAttackerRating, defenderRating.rating, newDefenderRating, JSON.stringify(fullLog)]
    );
    await client.query(
      `UPDATE pvp_daily SET attacks_used = attacks_used + 1 WHERE player_id = $1 AND day = CURRENT_DATE`,
      [req.playerId]
    );
    await bumpMissionProgress(client, req.playerId, 'pvp_attack', 1);

    // ---- attacker reward (credited immediately) ----
    const attackerReward = win ? ATTACK_REWARDS.win : ATTACK_REWARDS.lose;
    const newMoney = Number(attackerEcon.money) + attackerReward.money;
    const newBag = mergeBag(attackerEcon.bag, { [PVP_MEDAL_KEY]: attackerReward.medals });
    await client.query(`UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`, [req.playerId, newMoney, JSON.stringify(newBag)]);

    // ---- defender consolation (mailed, since they weren't online for this) ----
    const attackerName = (await client.query(`SELECT username FROM players WHERE id = $1`, [req.playerId])).rows[0]?.username || 'ผู้เล่นนิรนาม';
    const defReward = win ? DEFENSE_REWARDS.lostDefense : DEFENSE_REWARDS.successfulDefense;
    const defenderWon = !win;
    await client.query(
      `INSERT INTO mailbox (player_id, subject, body, reward_money, reward_bag_key, reward_bag_qty, sent_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'system')`,
      [
        opponentId,
        defenderWon ? '🛡️ ป้องกันสมรภูมิสำเร็จ!' : '⚔️ มีผู้บุกสมรภูมิของคุณ',
        `${attackerName} โจมตีทีมป้องกันของคุณและ${defenderWon ? 'พ่ายแพ้กลับไป' : 'เอาชนะไปได้'} — เรตติ้งของคุณเปลี่ยน ${defenderDelta >= 0 ? '+' : ''}${defenderDelta} (${defenderRating.rating} → ${newDefenderRating})`,
        defReward.money, PVP_MEDAL_KEY, defReward.medals,
      ]
    );

    await client.query('COMMIT');
    res.json({
      win, rounds, log: fullLog,
      playerTeam: state.playerTeam.map(sanitizeUnit),
      enemyTeam: state.enemyTeam.map(sanitizeUnit),
      attackerRatingBefore: attackerRating.rating, attackerRatingAfter: newAttackerRating, attackerDelta,
      defenderRatingBefore: defenderRating.rating, defenderRatingAfter: newDefenderRating, defenderDelta,
      rankInfo: rankInfo(newAttackerRating),
      rewards: { money: attackerReward.money, medals: attackerReward.medals },
      money: newMoney, bag: newBag,
      attacksRemainingToday: Math.max(0, DAILY_FREE_ATTACKS - (dailyRes.rows[0].attacks_used + 1)),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// GET /api/pvp/leaderboard?limit=100
// ---------------------------------------------------------------------------
router.get('/leaderboard', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const season = await ensureSeasonState(client);
    if (season.status !== 'active') {
      await client.query('COMMIT');
      return res.json({ seasonActive: false, entries: [] });
    }
    const { rows } = await client.query(
      `SELECT p.username, r.player_id, r.rating, r.wins, r.losses,
              RANK() OVER (ORDER BY r.rating DESC) AS rnk
       FROM pvp_ratings r JOIN players p ON p.id = r.player_id
       WHERE r.season_id = $1
       ORDER BY r.rating DESC LIMIT $2`,
      [season.id, limit]
    );
    await client.query('COMMIT');
    res.json({
      seasonActive: true,
      entries: rows.map(r => ({
        rank: Number(r.rnk), playerId: r.player_id, username: r.username,
        rating: r.rating, wins: r.wins, losses: r.losses, rankInfo: rankInfo(r.rating),
        isMe: r.player_id === req.playerId,
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// GET /api/pvp/history — my last 30 battles, either side.
// ---------------------------------------------------------------------------
router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.*, ap.username AS attacker_name, dp.username AS defender_name
     FROM pvp_battles b
     JOIN players ap ON ap.id = b.attacker_id
     JOIN players dp ON dp.id = b.defender_id
     WHERE b.attacker_id = $1 OR b.defender_id = $1
     ORDER BY b.created_at DESC LIMIT 30`,
    [req.playerId]
  );
  res.json(rows.map(r => {
    const wasAttacker = r.attacker_id === req.playerId;
    const iWon = wasAttacker ? r.win : !r.win;
    return {
      id: r.id,
      role: wasAttacker ? 'attacker' : 'defender',
      opponentName: wasAttacker ? r.defender_name : r.attacker_name,
      won: iWon,
      ratingBefore: wasAttacker ? r.attacker_rating_before : r.defender_rating_before,
      ratingAfter: wasAttacker ? r.attacker_rating_after : r.defender_rating_after,
      delta: (wasAttacker ? r.attacker_rating_after - r.attacker_rating_before : r.defender_rating_after - r.defender_rating_before),
      createdAt: r.created_at,
    };
  }));
}));

// GET /api/pvp/history/:battleId — full round-by-round log for replay.
router.get('/history/:battleId', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM pvp_battles WHERE id = $1 AND (attacker_id = $2 OR defender_id = $2)`,
    [req.params.battleId, req.playerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'battle not found' });
  res.json({ log: rows[0].log, win: rows[0].win, createdAt: rows[0].created_at });
}));

module.exports = router;
