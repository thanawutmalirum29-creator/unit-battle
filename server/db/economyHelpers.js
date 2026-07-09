'use strict';

// server/db/economyHelpers.js
//
// ✅ รวมศูนย์: getOrCreateEconomy() ก็อป-วางเหมือนกันเป๊ะอยู่ 5 ที่ (routes/battle.js,
// routes/pvp.js, routes/daily.js, routes/economy.js, routes/helpers.js) และ mergeBag()
// อีก 3 ที่ (routes/battle.js, routes/pvp.js, routes/economy.js — pvp.js ถึงกับมีคอมเมนต์
// บอกตรงๆ ว่า "deliberately not shared") ก่อนหน้านี้ถ้าจะแก้ query หรือแก้สูตรรวมกระเป๋า
// ต้องไล่แก้ทีละไฟล์ ระหว่างทางไฟล์เหล่านี้ก็หลุดไม่ตรงกันไปแล้วจริงๆ ด้วย:
// mergeBag ใน routes/economy.js ไม่มี `delta || {}` กันเหนียว (ถ้า delta เป็น
// undefined จะพังทันที) ในขณะที่ battle.js/pvp.js กันไว้แล้ว — รวมมาไว้ที่นี่ที่เดียว
// ใช้เวอร์ชันที่กันเหนียวครบทุกจุดเรียก แก้ query/สูตรที่นี่ที่เดียวพอ

// รวมกระเป๋าไอเทม/ชาร์ด/ทรัพยากรแบบ key:count เข้ากับส่วนต่าง (delta) ที่จะบวกเพิ่ม
function mergeBag(bag, delta) {
  const next = { ...(bag || {}) };
  for (const [k, v] of Object.entries(delta || {})) next[k] = (next[k] || 0) + v;
  return next;
}

// ดึงแถว player_economy ของผู้เล่น (สร้างแถวถ้ายังไม่มี) พร้อมล็อกแถวไว้ (FOR UPDATE)
// สำหรับใช้ต่อใน transaction เดียวกัน — ต้องเรียกภายใน client.query('BEGIN') ... ('COMMIT')
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

module.exports = { mergeBag, getOrCreateEconomy };
