// routes/battle.js — server-authoritative battle resolution.
//
// ก่อนหน้านี้ NORMAL/BOSS/INF ต่อสู้กันทั้งหมดฝั่ง client (public/js/skills/*, modes/*)
// แล้วแค่ "บอก" server ว่า "ฉันชนะด่าน N แล้ว" / "ฉันทำดาเมจ X แล้ว" — server เช็คได้แค่
// เรื่องจังหวะเวลา (เร็วเกินจริงไหม) ไม่เคยรู้จริงๆ ว่าการต่อสู้เกิดขึ้นจริงหรือใครชนะจริง
//
// เส้นทางนี้ทำให้ server เป็นคนรันผลจริงเอง ทีละเทิร์น:
//   POST /api/battle/start        — เริ่มไฟต์ สร้างทีมจากข้อมูลเด็ค/อุปกรณ์ที่ server เก็บเอง
//   POST /api/battle/:id/turn     — รันเทิร์นถัดไปจริงๆ (ผ่าน server/battle/engine.js)
//   POST /api/battle/:id/forfeit  — ยกเลิกไฟต์กลางคัน
//
// รางวัล/progress ที่บันทึกไว้ในตารางเดิม (normal_progress, runs, inf_progress,
// leaderboard_entries, reward_claims, player_economy) ตอนนี้ถูกเขียนจาก "ผลที่ server
// รันเอง" แทนที่จะเชื่อคำกล่าวอ้างของ client เพียงอย่างเดียว

const express = require('express');
const { v4: uuid } = require('uuid');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { bumpMissionProgress } = require('../db/dailyMissions');

const engine = require('../battle/engine');
const { STAGES, BOSSES } = require('../battle/stage-data');
const { generateInfStage, MAX_INF_STAGE: INF_MAX_FROM_DATA } = require('../battle/inf-data');
const { buildPlayerUnit, buildEnemyUnit, buildBossUnit } = require('../battle/team-builder');
const {
  STAGE_DROPS, STAGE_REWARDS,
  MAX_INF_STAGE, infStageReward, infShardDrop,
  BOSS_REWARD_TIERS, rollRange,
} = require('../game-data/economy-data');

const router = express.Router();
const INF_CHECKPOINT_INTERVAL = 25;

function mergeBag(bag, delta) {
  const next = { ...bag };
  for (const [k, v] of Object.entries(delta || {})) next[k] = (next[k] || 0) + v;
  return next;
}

async function getOrCreateEconomy(client, playerId) {
  await client.query(`INSERT INTO player_economy (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [playerId]);
  const { rows } = await client.query(`SELECT * FROM player_economy WHERE player_id = $1 FOR UPDATE`, [playerId]);
  return rows[0];
}

// สร้างทีมผู้เล่นจากเด็คจริงที่ server เก็บเอง (deck + equips) — ไม่เชื่อ stat ใดๆ จาก client
// cardIds: array of card id ที่ client "เลือก" ไว้ (ลำดับ/ตัวเลือกเท่านั้นที่รับจาก client ได้
// เพราะ stat จริงต้องมาจากเด็คที่ server เก็บ ไม่ใช่จากตัว card object ที่ client ส่งมาเอง)
function buildPlayerTeamFromDeck(deck, cardIds) {
  if (!Array.isArray(cardIds) || cardIds.length === 0 || cardIds.length > 4) return null;
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) return null;

  const units = [];
  for (let i = 0; i < cardIds.length; i++) {
    const card = deck.find(c => c.id === cardIds[i]);
    if (!card) return null; // การ์ดนี้ไม่มีในเด็คจริงของผู้เล่น
    units.push(buildPlayerUnit(card, i));
  }
  return units;
}

function sanitizeUnit(u) {
  // ตัด field ภายใน (getters/refs) ออก เหลือแค่สิ่งที่ client ต้องใช้ render
  const { name, class: cls, skill, hp, maxHp, atk, def, cooldown, isEnemy, statusEffects, instanceId } = u;
  return { name, class: cls, skill, hp, maxHp, atk, def, cooldown, isEnemy, statusEffects, instanceId };
}

function snapshot(state) {
  return {
    playerTeam: state.playerTeam.map(sanitizeUnit),
    enemyTeam: state.enemyTeam.map(sanitizeUnit),
  };
}

// ---------------------------------------------------------------------------
// POST /api/battle/start { mode, cardIds, stage?, bossKey?, runId? }
// ---------------------------------------------------------------------------
router.post('/start', requireAuth, asyncHandler(async (req, res) => {
  const { mode, cardIds } = req.body || {};
  if (!['normal', 'boss', 'inf'].includes(mode)) {
    return res.status(400).json({ error: 'invalid mode' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const econ = await getOrCreateEconomy(client, req.playerId);
    const deck = Array.isArray(econ.deck) ? econ.deck : [];

    const playerTeam = buildPlayerTeamFromDeck(deck, cardIds);
    if (!playerTeam) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid team selection' });
    }

    let enemyTeam, refKey, runId = null;

    if (mode === 'normal') {
      const stage = Number(req.body?.stage);
      if (!Number.isInteger(stage) || !STAGES[stage]) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid stage' });
      }
      const progress = await client.query(`SELECT max_stage FROM normal_progress WHERE player_id = $1`, [req.playerId]);
      const maxStage = progress.rows[0]?.max_stage ?? 0;
      if (stage > maxStage + 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `stage ${stage} not unlocked yet (max cleared: ${maxStage})` });
      }
      // 🔧 FIX: เดิม mode นี้ไม่มี runs row เลย ทำให้ไม่มีอะไรให้ leaderboard_entries อ้างอิง
      // (run_id เป็น NOT NULL) เลยไม่เคยมีการบันทึกอันดับให้โหมด NORMAL จริงๆ — สร้าง run
      // เล็กๆ ต่อ 1 ครั้งที่เลือกด่าน (start_stage = stage) ให้ leaderboard เขียนได้ตอนชนะ
      const token = uuid();
      const insR = await client.query(
        `INSERT INTO runs (player_id, mode, token, start_stage) VALUES ($1, 'normal', $2, $3) RETURNING id`,
        [req.playerId, token, stage]
      );
      runId = insR.rows[0].id;
      enemyTeam = STAGES[stage].map((e, i) => buildEnemyUnit(e, i, `E-${stage}`));
      refKey = String(stage);
    } else if (mode === 'boss') {
      const bossKey = req.body?.bossKey;
      const bossDef = BOSSES[bossKey];
      if (!bossDef) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid bossId' });
      }
      // หนึ่ง run ต่อบอสหนึ่งตัว (สะสมดาเมจ/tier ตลอด run เหมือนระบบเดิม) — reuse runId เดิมถ้ายังไม่จบ
      let runRow;
      if (req.body?.runId) {
        const r = await client.query(`SELECT * FROM runs WHERE id = $1 AND player_id = $2 AND status = 'active' FOR UPDATE`, [req.body.runId, req.playerId]);
        runRow = r.rows[0];
      }
      if (!runRow) {
        const token = uuid();
        const ins = await client.query(
          `INSERT INTO runs (player_id, mode, token, boss_id) VALUES ($1, 'boss', $2, $3) RETURNING *`,
          [req.playerId, token, bossKey]
        );
        runRow = ins.rows[0];
      }
      runId = runRow.id;
      enemyTeam = [buildBossUnit(bossDef, bossKey)];
      refKey = bossKey;
    } else {
      // inf
      const stage = Number(req.body?.stage) || 1;
      if (stage < 1 || stage > MAX_INF_STAGE) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid inf stage' });
      }
      const hasBorrowed = deck.some(c => cardIds.includes(c.id) && c.borrowed);
      if (hasBorrowed) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'ตัวละครที่ยืมมาจากเพื่อนไม่สามารถใช้ในด่าน INF ได้' });
      }

      let runRow;
      if (req.body?.runId) {
        const r = await client.query(`SELECT * FROM runs WHERE id = $1 AND player_id = $2 AND status = 'active' FOR UPDATE`, [req.body.runId, req.playerId]);
        runRow = r.rows[0];
        // ต่อ run เดิมได้เฉพาะด่านถัดไปจากที่ทำได้แล้วเท่านั้น (กัน skip ด่าน)
        if (runRow && stage !== runRow.max_stage + 1) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `stage out of order for this run: expected ${runRow.max_stage + 1}` });
        }
      }
      if (!runRow) {
        if (stage !== 1 && stage % INF_CHECKPOINT_INTERVAL !== 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'invalid checkpoint stage' });
        }
        if (stage !== 1) {
          const p = await client.query(`SELECT max_stage FROM inf_progress WHERE player_id = $1`, [req.playerId]);
          const best = p.rows[0]?.max_stage ?? 0;
          if (stage > best) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `checkpoint ${stage} not unlocked yet (best: ${best})` });
          }
        }
        const token = uuid();
        const ins = await client.query(
          `INSERT INTO runs (player_id, mode, token, max_stage, start_stage) VALUES ($1, 'inf', $2, $3, $3) RETURNING *`,
          [req.playerId, token, stage - 1]
        );
        runRow = ins.rows[0];
      }
      runId = runRow.id;
      enemyTeam = generateInfStage(stage, 4).map((e, i) => buildEnemyUnit(e, i, `INF-${stage}`));
      refKey = String(stage);
    }

    const state = { playerTeam, enemyTeam, mode, bossDamageDealt: 0, damageStats: {} };
    const session = await client.query(
      `INSERT INTO battle_sessions (player_id, mode, ref_key, run_id, round, state, status)
       VALUES ($1, $2, $3, $4, 0, $5, 'active') RETURNING id`,
      [req.playerId, mode, refKey, runId, JSON.stringify(state)]
    );

    await client.query('COMMIT');
    res.json({
      battleId: session.rows[0].id, runId, round: 0, bossDamageDealt: state.bossDamageDealt || 0,
      damageStats: state.damageStats, ...snapshot(state),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/battle/:battleId/turn — รันเทิร์นถัดไปจริงบน server
// ---------------------------------------------------------------------------
router.post('/:battleId/turn', requireAuth, asyncHandler(async (req, res) => {
  const { battleId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM battle_sessions WHERE id = $1 AND player_id = $2 FOR UPDATE`,
      [battleId, req.playerId]
    );
    const session = rows[0];
    if (!session) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'battle not found' });
    }
    if (session.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `battle already ${session.status}` });
    }

    const state = session.state;
    const logEntries = [];
    // 📊 ก่อนหน้านี้ ctx.trackDamage เป็น no-op ว่างเปล่า — ฝั่งเซิฟไม่เคยเก็บสถิติดาเมจ
    // "ทำ/รับ" ต่อหน่วยเลย (หน้าสรุปผลเลยโชว์ 0/0 ทุกตัวเสมอ ดู hub-ui.js showResults) และ
    // ไม่มีข้อมูลเหตุการณ์การตีให้ client เล่นแอนิเมชันโจมตีได้ (เดิมทำที่ client เองทั้งหมด
    // ผ่าน skills/attack.js แต่พอย้ายมารันจริงที่เซิฟ โค้ดชุดนั้นไม่ถูกเรียกอีกต่อไปแล้ว)
    // ตรงนี้ใช้ hook เดิมที่ battle/engine.js เรียกอยู่แล้วทุกครั้งที่มี applyDamage จริง
    // (ดู server/battle/engine.js บรรทัด ctx.trackDamage(attacker, target, dmg)) มาทำสองอย่าง:
    //   1) สะสมลง state.damageStats (คงอยู่ข้าม turn ทั้งไฟต์ — ส่งกลับให้ client โชว์ตอนจบ)
    //   2) เก็บ hitEvents ของ turn นี้ไว้ส่งกลับให้ client เล่นแอนิเมชันโจมตี/ตัวเลขดาเมจ
    if (!state.damageStats) state.damageStats = {};
    const damageStats = state.damageStats;
    function ensureStatEntry(unit) {
      if (!unit || !unit.instanceId) return null;
      if (!damageStats[unit.instanceId]) {
        damageStats[unit.instanceId] = { name: unit.name || '?', isEnemy: !!unit.isEnemy, dealt: 0, taken: 0 };
      }
      damageStats[unit.instanceId].name = unit.name || damageStats[unit.instanceId].name;
      damageStats[unit.instanceId].isEnemy = !!unit.isEnemy;
      return damageStats[unit.instanceId];
    }
    const hitEvents = [];
    const ctx = {
      log: (msg, side) => logEntries.push({ msg, side }),
      trackDamage: (attacker, target, dmg) => {
        if (!Number.isFinite(dmg) || dmg <= 0) return;
        const a = ensureStatEntry(attacker);
        const t = ensureStatEntry(target);
        if (a) a.dealt += dmg;
        if (t) t.taken += dmg;
        hitEvents.push({
          attackerId: attacker?.instanceId || null,
          attackerClass: attacker?.class || null,
          attackerIsEnemy: !!attacker?.isEnemy,
          targetId: target?.instanceId || null,
          dmg,
        });
      },
      addBossDamage: (dmg) => { state.bossDamageDealt = (state.bossDamageDealt || 0) + dmg; },
    };

    const result = await engine.runRound(state, ctx);
    const newRound = session.round + 1;

    let finished = result.finished === true;
    let win = result.win === true;
    let rewards = null;

    // 🎯 BOSS: จ่ายรางวัลไล่ tier ทุกเทิร์นที่ดาเมจสะสม (server-tracked) ข้ามเกณฑ์ — ไม่ต้องรอบอสตาย
    // (ของเดิม client เรียก claim-tier กลางไฟต์ได้เรื่อยๆ ระบบนี้ควรให้ผลแบบเดียวกัน)
    if (state.mode === 'boss') {
      const bossRewards = await payoutBossTiers(client, req.playerId, session, state, /* closeRun */ finished);
      if (bossRewards) rewards = bossRewards;
    }

    if (finished) {
      if (win && state.mode !== 'boss') {
        rewards = await grantWinRewards(client, req.playerId, session, state);
      } else if (!win) {
        // แพ้/ตายทั้งทีม → ปิด run (ถ้ามี — normal/inf/boss ทุกโหมดมี run ผูกอยู่แล้วตอนนี้)
        // และบันทึกอันดับด้วยถ้าเป็นโหมดที่ leaderboard รองรับ (normal/inf — ดู writeLeaderboardEntry)
        if (session.run_id) {
          const runRes = await client.query(
            `UPDATE runs SET status = 'finished', finished_at = now() WHERE id = $1 AND status = 'active' RETURNING *`,
            [session.run_id]
          );
          if (runRes.rows[0]) await writeLeaderboardEntry(client, req.playerId, runRes.rows[0]);
        }
      }
      if (win) await bumpMissionProgress(client, req.playerId, 'win_battle', 1);
    }

    await client.query(
      `UPDATE battle_sessions SET round = $2, state = $3, status = $4, updated_at = now() WHERE id = $1`,
      [battleId, newRound, JSON.stringify(state), finished ? (win ? 'won' : 'lost') : 'active']
    );

    await client.query('COMMIT');
    res.json({
      battleId, round: newRound, finished, win,
      log: logEntries, events: hitEvents, rewards, bossDamageDealt: state.bossDamageDealt || 0,
      damageStats: state.damageStats, ...snapshot(state),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// 🔧 FIX: เดิม endpoint นี้ (และ payoutBossTiers/forfeit ด้านล่าง) ไม่เคยเขียน leaderboard_entries
// เลยสักที่เดียว แปลว่าต่อให้ระบบต่อสู้ทั้งหมดย้ายมาเซิฟแล้ว "อันดับ" ที่ผู้ใช้อยากได้ก็ยังว่างเปล่า
// อยู่ดี — ฟังก์ชันนี้เขียนอันดับจริงจากข้อมูลที่เซิฟเก็บเองล้วนๆ (max_stage, started_at)
// ใช้สูตรคะแนนเดียวกับที่ routes/runs.js เดิมใช้ (ตอนนี้ปิดไปแล้วเพราะไม่มี auth เลย)
async function writeLeaderboardEntry(client, playerId, run) {
  if (!run || (run.mode !== 'normal' && run.mode !== 'inf')) return; // leaderboard.js รองรับแค่ 2 โหมดนี้
  const finishedAt = new Date();
  const timeMs = Math.max(0, finishedAt.getTime() - new Date(run.started_at).getTime());
  const score = run.max_stage * 100 + Math.max(0, 5000 - Math.floor(timeMs / 1000));
  const player = await client.query(`SELECT team_id FROM players WHERE id = $1`, [playerId]);
  await client.query(
    `INSERT INTO leaderboard_entries (run_id, player_id, team_id, mode, max_stage, time_ms, score)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [run.id, playerId, player.rows[0]?.team_id ?? null, run.mode, run.max_stage, timeMs, score]
  );
}

// grant rewards for a server-verified win — money/bag/progress all written here,
// never trusted from the client. Runs inside the caller's existing transaction.
async function grantWinRewards(client, playerId, session, state) {
  const econ = await getOrCreateEconomy(client, playerId);

  if (session.mode === 'normal') {
    const stage = Number(session.ref_key);
    await client.query(
      `INSERT INTO normal_progress (player_id, max_stage) VALUES ($1, $2)
       ON CONFLICT (player_id) DO UPDATE SET max_stage = GREATEST(normal_progress.max_stage, $2), updated_at = now()`,
      [playerId, stage]
    );
    // 🔧 FIX: ปิด run นี้ + บันทึกอันดับ (ดู writeLeaderboardEntry ด้านบน — เดิมไม่มีจุดนี้เลย)
    if (session.run_id) {
      const runRes = await client.query(
        `UPDATE runs SET max_stage = $2, status = 'finished', finished_at = now() WHERE id = $1 RETURNING *`,
        [session.run_id, stage]
      );
      await writeLeaderboardEntry(client, playerId, runRes.rows[0]);
    }
    const moneyGain = STAGE_REWARDS[stage] || 0;
    const drops = STAGE_DROPS[stage] || {};
    const newMoney = Number(econ.money) + moneyGain;
    const newBag = mergeBag(econ.bag, drops);
    await client.query(`UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`, [playerId, newMoney, JSON.stringify(newBag)]);
    return { moneyGain, drops, money: newMoney, bag: newBag };
  }

  if (session.mode === 'inf') {
    const stage = Number(session.ref_key);
    await client.query(
      `INSERT INTO run_stage_events (run_id, stage) VALUES ($1, $2) ON CONFLICT (run_id, stage) DO NOTHING`,
      [session.run_id, stage]
    );
    await client.query(`UPDATE runs SET max_stage = $2 WHERE id = $1`, [session.run_id, stage]);
    await client.query(
      `INSERT INTO inf_progress (player_id, max_stage) VALUES ($1, $2)
       ON CONFLICT (player_id) DO UPDATE SET max_stage = GREATEST(inf_progress.max_stage, $2), updated_at = now()`,
      [playerId, stage]
    );

    // 🔧 FIX: ถ้าเป็นด่านสุดท้ายจริงๆ (ไม่มีด่านต่อให้ไปต่อ) ให้ปิด run + บันทึกอันดับด้วย
    // (ระหว่างไต่ด่านปกติไม่ปิด run เพราะ client จะเริ่ม battle_session ใหม่สำหรับด่านถัดไปทันที)
    if (stage >= MAX_INF_STAGE) {
      const runRes = await client.query(
        `UPDATE runs SET status = 'finished', finished_at = now() WHERE id = $1 AND status = 'active' RETURNING *`,
        [session.run_id]
      );
      if (runRes.rows[0]) await writeLeaderboardEntry(client, playerId, runRes.rows[0]);
    }

    const moneyGain = infStageReward(stage);
    const drops = infShardDrop(stage);
    let newMoney = Number(econ.money), newBag = econ.bag;
    try {
      await client.query(
        `INSERT INTO reward_claims (player_id, run_id, mode, stage, money_awarded, items_awarded) VALUES ($1, $2, 'inf', $3, $4, $5)`,
        [playerId, session.run_id, stage, moneyGain, JSON.stringify(drops)]
      );
      newMoney += moneyGain;
      newBag = mergeBag(econ.bag, drops);
      await client.query(`UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`, [playerId, newMoney, JSON.stringify(newBag)]);
    } catch (e) {
      if (e.code !== '23505') throw e; // already claimed — harmless no-op
    }
    return { moneyGain, drops, money: newMoney, bag: newBag, stage };
  }

  return null; // (mode 'boss' is handled separately every turn — see payoutBossTiers)
}

// จ่ายรางวัลทุก tier ที่ดาเมจสะสม (server-tracked, ไม่ใช่ตัวเลขที่ client ส่งมา) ข้ามผ่านแล้ว
// แต่ยังไม่เคยจ่าย — รองรับ "จ่ายไล่ระดับระหว่างสู้" แบบเดิม เพราะฟังก์ชันนี้ถูกเรียกทุกเทิร์นที่ยังไม่จบ
// ไฟต์ก็ได้ ไม่จำเป็นต้องรอบอสตายเท่านั้น (ดู /:battleId/turn ด้านบน เรียกตอน finished; ถ้าต้องการ
// จ่ายระหว่างสู้แบบเรียลไทม์ทุกเทิร์น ให้ย้าย call นี้ออกไปเรียกทุกเทิร์นแทน)
async function payoutBossTiers(client, playerId, session, state, closeRun) {
  const tiers = BOSS_REWARD_TIERS[session.ref_key];
  if (!tiers) return null;

  const runRes = await client.query(`SELECT * FROM runs WHERE id = $1 FOR UPDATE`, [session.run_id]);
  const run = runRes.rows[0];
  let tierIndex = run.max_stage;
  const damageDone = state.bossDamageDealt || 0;

  const econ = await getOrCreateEconomy(client, playerId);
  let totalMoney = 0;
  const totalDrops = {};

  while (tiers[tierIndex] && damageDone >= tiers[tierIndex].dmg) {
    const tier = tiers[tierIndex];
    const moneyGain = rollRange(tier.money);
    const drops = {};
    if (tier.items) for (const [k, range] of Object.entries(tier.items)) drops[k] = rollRange(range);

    try {
      await client.query(
        `INSERT INTO reward_claims (player_id, run_id, mode, stage, money_awarded, items_awarded) VALUES ($1, $2, 'boss', $3, $4, $5)`,
        [playerId, session.run_id, tierIndex, moneyGain, JSON.stringify(drops)]
      );
      totalMoney += moneyGain;
      for (const [k, v] of Object.entries(drops)) totalDrops[k] = (totalDrops[k] || 0) + v;
    } catch (e) {
      if (e.code !== '23505') throw e;
    }
    tierIndex++;
  }

  if (tierIndex !== run.max_stage) {
    await client.query(`UPDATE runs SET max_stage = $2 WHERE id = $1`, [session.run_id, tierIndex]);
  }
  if (closeRun) {
    await client.query(`UPDATE runs SET status = 'finished', finished_at = now() WHERE id = $1 AND status = 'active'`, [session.run_id]);
  }

  if (totalMoney === 0 && Object.keys(totalDrops).length === 0) return null;
  const newMoney = Number(econ.money) + totalMoney;
  const newBag = mergeBag(econ.bag, totalDrops);
  await client.query(`UPDATE player_economy SET money = $2, bag = $3, updated_at = now() WHERE player_id = $1`, [playerId, newMoney, JSON.stringify(newBag)]);
  return { moneyGain: totalMoney, drops: totalDrops, money: newMoney, bag: newBag, tiersCleared: tierIndex - run.max_stage, damageDone };
}

// ---------------------------------------------------------------------------
// POST /api/battle/:battleId/forfeit
// ---------------------------------------------------------------------------
router.post('/:battleId/forfeit', requireAuth, asyncHandler(async (req, res) => {
  const { battleId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE battle_sessions SET status = 'forfeited', updated_at = now()
       WHERE id = $1 AND player_id = $2 AND status = 'active' RETURNING run_id`,
      [battleId, req.playerId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'battle not found or already finished' });
    }
    if (rows[0].run_id) {
      const runRes = await client.query(
        `UPDATE runs SET status = 'finished', finished_at = now() WHERE id = $1 AND status = 'active' RETURNING *`,
        [rows[0].run_id]
      );
      if (runRes.rows[0]) await writeLeaderboardEntry(client, req.playerId, runRes.rows[0]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
