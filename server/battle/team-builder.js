'use strict';

// ✅ getRenderStats เดิมก็อป "verbatim" มาจาก public/js/core/render.js (และก็อปซ้ำที่
// public/js/data/equip.js อีกจุด รวม 3 ที่) รวมมาไว้จุดเดียวที่
// server/public/js/shared/battle-math.js แล้ว ไฟล์นั้นใช้ได้ทั้ง <script> ฝั่ง client
// และ require() ฝั่งนี้จากซอร์สเดียวกันจริงๆ — แก้สูตรคำนวณสเตตัสจากอุปกรณ์ที่นั่นที่
// เดียว ตัวเลขที่โชว์ในหน้าเด็ค/หน้าอุปกรณ์กับสเตตัสจริงที่ใช้สู้จะตรงกันเสมอ
const { getRenderStats } = require('../public/js/shared/battle-math.js');

// การ์ดในเด็คของผู้เล่น (ที่เซิฟดึงมาจาก player_economy.deck เอง — authoritative)
// -> หน่วยต่อสู้ ตรงตาม prepareBattle() ของทุกโหมดฝั่ง client
function buildPlayerUnit(card, index) {
  const stats = getRenderStats(card);
  return {
    name: card.name,
    class: card.class || null,
    skill: card.skill || 'None',
    baseHp: stats.hp,
    baseAtk: stats.atk,
    baseDef: stats.def,
    hp: stats.hp,
    maxHp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    defBase: stats.def,
    tempDef: 0,
    cooldown: 0,
    isEnemy: false,
    statusEffects: [],
    instanceId: `P-${index}-${card.id}`,
    sourceCardId: card.id,
  };
}

// ศัตรูจาก STAGES / INF generateInfStage() — ตรงตาม enemyTeam mapping ฝั่ง client
function buildEnemyUnit(template, index, prefix) {
  return {
    name: template.name,
    class: template.class || null,
    skill: template.skill || 'None',
    baseHp: template.hp,
    baseAtk: template.atk,
    baseDef: template.def,
    hp: template.hp,
    maxHp: template.hp,
    atk: template.atk,
    def: template.def,
    defBase: template.def,
    tempDef: 0,
    cooldown: 0,
    isEnemy: true,
    statusEffects: [],
    instanceId: `${prefix}-${index}-${Date.now()}`,
  };
}

function buildBossUnit(bossDef, bossKey) {
  return {
    name: bossDef.name,
    class: bossDef.class || null,
    skill: bossDef.skill || 'None',
    baseHp: bossDef.hp,
    baseAtk: bossDef.atk,
    baseDef: bossDef.def,
    hp: bossDef.hp,
    maxHp: bossDef.hp,
    atk: bossDef.atk,
    def: bossDef.def,
    defBase: bossDef.def,
    tempDef: 0,
    cooldown: 0,
    isEnemy: true,
    statusEffects: [],
    instanceId: 'BOSS', // ⚠️ engine.applyDamage เช็ค instanceId === "BOSS" เพื่อรู้ว่าต้องนับดาเมจสะสม
    bossKey,
  };
}

// เหมือน buildBossUnit ด้านบน แต่ hp มาจาก guild_boss_state.current_hp จริง (HP กองกลาง
// ที่กิลด์ตีร่วมกันสะสมทั้งสัปดาห์) ไม่ใช่ค่าคงที่จาก bossDef แบบบอสเดี่ยว — atk/def/skill
// มาจาก GUILD_BOSS_COMBAT (game-data/guild-data.js)
function buildGuildBossUnit(name, hp, combat) {
  return {
    name,
    class: combat.class || null,
    skill: combat.skill,
    baseHp: hp,
    baseAtk: combat.atk,
    baseDef: combat.def,
    hp,
    maxHp: hp,
    atk: combat.atk,
    def: combat.def,
    defBase: combat.def,
    tempDef: 0,
    cooldown: 0,
    isEnemy: true,
    statusEffects: [],
    instanceId: 'BOSS', // engine.applyDamage เช็ค instanceId === "BOSS" เพื่อนับดาเมจสะสม (ctx.addBossDamage)
  };
}

module.exports = { getRenderStats, buildPlayerUnit, buildEnemyUnit, buildBossUnit, buildGuildBossUnit };
