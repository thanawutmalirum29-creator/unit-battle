'use strict';

// ported verbatim from public/js/core/render.js — pure function, no DOM
function getRenderStats(card) {
  const baseHp = card.baseHp ?? card.hp ?? 0;
  const baseAtk = card.baseAtk ?? card.atk ?? 0;
  const baseDef = card.baseDef ?? card.def ?? 0;

  let hp = baseHp, atk = baseAtk, def = baseDef;
  let hpPct = 0, atkPct = 0, defPct = 0;

  (card.equips || []).forEach(eq => {
    const mode = eq.mode || 'flat';
    if (mode === 'percent') {
      if (eq.stat === 'hp') hpPct += eq.bonus;
      if (eq.stat === 'atk') atkPct += eq.bonus;
      if (eq.stat === 'def') defPct += eq.bonus;
    } else {
      if (eq.stat === 'hp') hp += eq.bonus;
      if (eq.stat === 'atk') atk += eq.bonus;
      if (eq.stat === 'def') def += eq.bonus;
    }
  });

  hp = Math.floor(hp * (1 + hpPct / 100));
  atk = Math.floor(atk * (1 + atkPct / 100));
  def = Math.floor(def * (1 + defPct / 100));
  return { hp, atk, def };
}

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

module.exports = { getRenderStats, buildPlayerUnit, buildEnemyUnit, buildBossUnit };
