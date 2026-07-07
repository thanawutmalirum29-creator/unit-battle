// routes/progress.js — for NORMAL mode, where stages are picked individually
const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { MIN_MS_PER_STAGE } = require('../middleware/anticheat');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 🔒 DISABLED — see routes/battle.js instead.
// เดิม endpoint นี้รับ `playerId` ตรงๆ จาก request body โดยไม่มี requireAuth เลย และเช็คแค่
// จังหวะเวลา (MIN_MS_PER_STAGE) ไม่ได้ยืนยันว่ามีการต่อสู้จริงเกิดขึ้น — ใครก็ยิง POST ใส่
// playerId ของตัวเอง (หรือของคนอื่นถ้ารู้ id) วนลูปตามจังหวะเวลาที่กำหนด แล้วปลดล็อกทุกด่านได้
// โดยไม่ต้องสู้เลยสักครั้ง จากนั้นก็ไปเรียก /api/economy/claim/normal เก็บเงิน/ไอเทมจริงได้ตามนั้น
// ตอนนี้ routes/battle.js เป็นคนรันผลการต่อสู้จริงเอง (ทีละเทิร์น) แล้วอัพเดต normal_progress
// พร้อมจ่ายรางวัลเองทันทีที่ชนะจริง — ไม่ต้องมี endpoint แยกให้ client มา "รายงานผล" อีกต่อไป
router.post('/normal-clear', asyncHandler(async (req, res) => {
  return res.status(410).json({ error: 'gone: normal-clear is now recorded automatically by /api/battle on a verified win' });
}));

// GET /api/progress/normal/:playerId
// Best-ever validated NORMAL stage for this player — used to restore which stages
// are unlocked when the game is opened (was previously only kept in localStorage,
// so progress was lost on a new device/browser/PWA install even though the server
// already had it recorded via /normal-clear).
//
// 🔧 FIX (security): this route had NO auth at all and trusted the :playerId in the
// URL directly — the client only ever calls it with its own id (see api.js), but
// nothing stopped anyone from swapping in any other player's UUID and reading their
// stage progress. There's no legitimate case for looking up someone else's progress
// here, so this now requires a valid session and ignores the URL param entirely,
// always answering for req.playerId (the account the token belongs to).
router.get('/normal/:playerId', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT max_stage FROM normal_progress WHERE player_id = $1`, [req.playerId]);
  res.json({ maxStage: rows[0]?.max_stage ?? 0 });
}));

// GET /api/progress/inf/:playerId
// Best-ever validated INF stage for this player — used to render the
// checkpoint-start buttons (every 25 stages) in inf.html.
// 🔧 FIX (security): same IDOR as /normal/:playerId above — now requires auth and
// always answers for req.playerId, never the URL param.
router.get('/inf/:playerId', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT max_stage FROM inf_progress WHERE player_id = $1`, [req.playerId]);
  res.json({ maxStage: rows[0]?.max_stage ?? 0 });
}));

// GET /api/progress/normal-leaderboard
router.get('/normal-leaderboard', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.username, np.max_stage, np.updated_at
     FROM normal_progress np
     JOIN players p ON p.id = np.player_id
     ORDER BY np.max_stage DESC, np.updated_at ASC
     LIMIT 50`
  );
  res.json(rows);
}));

module.exports = router;
