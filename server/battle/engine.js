'use strict';

// server/battle/engine.js
//
// พอร์ตตรรกะการต่อสู้ทั้งหมดจากฝั่ง client (public/js/skills/*.js, core/endroud.js,
// modes/BOSS/boss.js) มาไว้ที่นี่แบบไม่มี DOM/animation ใดๆ เพื่อให้ "เซิฟเป็นคนรันผลจริง"
// แทนที่ client — engine นี้ทำงานล้วนๆ กับ plain object (playerTeam/enemyTeam) และคืนค่า
// เป็น log array ของข้อความ + event ให้ route ชั้นบนใช้ต่อ (บันทึกผล/คำนวณรางวัล/ส่งกลับ client
// ให้เล่น replay animation)
//
// บั๊กที่เจอและแก้ระหว่างพอร์ต (เหมือนที่แก้ไว้ฝั่ง client แล้ว บวกที่เจอเพิ่ม):
//   - Time Stop ทุกเลเวลไม่เคยข้ามเทิร์นจริง (justApplied ไม่เคยถูกเคลียร์)      -> แก้แล้ว
//   - Mirror ไม่มีผลอะไรเลย (ไม่มีจุดไหนเช็คสถานะ)                              -> แก้แล้ว (สะท้อนดาเมจจริง)
//   - Cleanse L3 "กันดีบัฟ" ไม่มีผลจริง (DebuffResist ไม่เคยถูกเช็ค)             -> แก้แล้ว
//   - PhantomBoss "Shadow Shield" ไม่มีผลอะไรเลย (Shield ไม่เคยถูกเช็ค)         -> แก้แล้ว (ดูดซับดาเมจจริง)
//   - Summon L2 Golem ATK = 0 เสมอ (`user.hp * 0.0`)                            -> แก้แล้ว
//   - Summon L3 Golem เกิดมา HP เกิน maxHp ตัวเอง                                -> แก้แล้ว
//   - Lifesteal Lord ข้ามระบบกลาง getFinalAtk/getFinalDef + ดูดเลือด 180%        -> แก้แล้ว (100% + ใช้ระบบกลาง)
//   - BOSS mode: ตีธรรมดาใส่บอสโดนหักเลือด/นับดาเมจ "ซ้ำ 2 ครั้ง" ต่อ 1 การโจมตี
//     (ของเดิม boss.js เรียก applyDamage ผ่าน normalAttack() แล้วยังมีโค้ดอีกก้อนคำนวณ
//     dmg = atk-def แล้วหัก HP/นับดาเมจซ้ำเองอีกรอบ) -> engine นี้ไม่พอร์ตโค้ดซ้ำนั้นมาเลย
//     ปล่อยให้ normalAttack -> applyDamage คำนวณ/นับครั้งเดียวเหมือนทุกสกิลอื่น
//   - FoxBoss "ทำให้สับสน" คำนวณ atk-def ตรงๆ ข้าม getFinalAtk/getFinalDef        -> แก้แล้ว

const DEBUFF_TYPES = ['Poison', 'Burn', 'Silence', 'SkillBlockChance', 'Stun', 'TimeStop', 'DefenseDown'];

// ---------------------------------------------------------------------------
// Stat helpers (ตรงกับ public/js/skills/Intermediaryfunction.js)
// ---------------------------------------------------------------------------
function getFinalAtk(actor) {
  const base = actor.baseAtk ?? actor.atk ?? 0;
  const flatBuff = (actor.statusEffects || [])
    .filter(e => e.type === 'AttackBuffFlat')
    .reduce((sum, e) => sum + e.value, 0);
  const percentBuff = (actor.statusEffects || [])
    .filter(e => e.type === 'AttackBuffPercent')
    .reduce((sum, e) => sum + e.value, 0);
  return Math.floor((base + flatBuff) * (1 + percentBuff));
}

function getFinalDef(actor) {
  const base = actor.baseDef ?? actor.defBase ?? actor.def ?? 0;
  const defBuffs = (actor.statusEffects || []).filter(e => e.type === 'DefenseBuff').map(e => e.value);
  const bestBuff = defBuffs.length > 0 ? Math.max(...defBuffs) : 0;
  const defDebuffs = (actor.statusEffects || []).filter(e => e.type === 'DefenseDown').map(e => e.value);
  const worstDebuff = defDebuffs.length > 0 ? Math.max(...defDebuffs) : 0;
  const finalDef = base + bestBuff + (actor.tempDef || 0) - worstDebuff;
  return Math.max(0, finalDef);
}

function findFirstAlive(list) {
  return list.find(u => u.hp > 0) || null;
}

function isHealer(user) {
  const healerSkills = [
    'Heal L1', 'Heal L2', 'Heal L3',
    'AOE Heal L1', 'AOE Heal L2', 'AOE Heal L3', 'Bomb L1', 'Bomb L2', 'Bomb L3',
  ];
  return healerSkills.includes(user.baseSkill || user.skill);
}

function chooseTarget(user, enemies) {
  const alive = enemies.filter(e => e.hp > 0);
  if (alive.length === 0) return null;
  switch (user.class) {
    case 'Assassin':
      return alive.reduce((low, e) => (e.maxHp < low.maxHp ? e : low));
    case 'Mage':
      return alive.reduce((high, e) => (e.def < high.def ? e : high));
    default:
      return alive[0];
  }
}

// ---------------------------------------------------------------------------
// Status effects
// ---------------------------------------------------------------------------
function addStatusEffect(target, newEff, ctx) {
  if (!target.statusEffects) target.statusEffects = [];

  if (DEBUFF_TYPES.includes(newEff.type)) {
    const hasResist = target.statusEffects.some(e => e.type === 'DebuffResist');
    if (hasResist) {
      ctx.log(`🛡️ ${target.name} ต้านทาน ${newEff.type} ได้ (Debuff Resist)`, target.isEnemy ? 'enemy' : 'player');
      return;
    }
  }

  const existing = target.statusEffects.find(e => e.type === newEff.type);
  if (existing) {
    existing.turns = newEff.turns;
    existing.justApplied = true;
    if (newEff.value !== undefined) existing.value = newEff.value;
    if (newEff.damage !== undefined) existing.damage = newEff.damage;
    if (newEff.power !== undefined) existing.power = newEff.power;
  } else {
    newEff.justApplied = true;
    target.statusEffects.push(newEff);
  }
}

function applyStatusEffects(actor, ctx) {
  if (!actor.statusEffects) return;
  actor.silenced = false;
  actor.skipTurn = false;

  for (const eff of actor.statusEffects) {
    switch (eff.type) {
      case 'Poison':
        if (actor.hp > 0) {
          actor.hp -= eff.damage;
          ctx.log(`☠️ ${actor.name} โดนพิษ -${eff.damage} HP`, actor.isEnemy ? 'enemy' : 'player');
          eff.damage = Math.max(1, Math.floor(eff.damage * 0.7));
        }
        break;
      case 'Burn':
        if (actor.hp > 0) {
          actor.hp -= eff.damage;
          ctx.log(`🔥 ${actor.name} ถูกเผาไหม้ -${eff.damage} HP`, actor.isEnemy ? 'enemy' : 'player');
        }
        break;
      case 'Silence':
        ctx.log(`🔇 ${actor.name} ถูกปิดปาก ใช้สกิลไม่ได้`, actor.isEnemy ? 'enemy' : 'player');
        actor.silenced = true;
        break;
      case 'Stun':
        ctx.log(`💫 ${actor.name} ถูกสตัน ขยับไม่ได้`, actor.isEnemy ? 'enemy' : 'player');
        actor.skipTurn = true;
        break;
      case 'TimeStop':
        if (!eff.justApplied) {
          ctx.log(`⏳ ${actor.name} ถูกหยุดเวลา ไม่สามารถโจมตีได้`, actor.isEnemy ? 'enemy' : 'player');
          actor.skipTurn = true;
        }
        break;
      default:
        break;
    }
  }
}

function endRoundAll(allActors, ctx) {
  for (const actor of allActors) {
    if (!actor) continue;
    if (actor.cooldown > 0) actor.cooldown--;

    if (actor.statusEffects) {
      const expired = [];
      actor.statusEffects.forEach(eff => {
        // 🔧 FIX (พบระหว่างพอร์ต, ยืนยันด้วย smoke-test.js): แค่เคลียร์ justApplied อย่างเดียว
        // (ตามที่แก้ไว้รอบก่อน) ยังไม่พอ — TimeStop ใส่มาพร้อม turns:1 ซึ่งจะถูกลดเหลือ 0 และ
        // ถูกลบทิ้งทันทีที่ endRoundAll ของ "รอบเดียวกับที่ร่าย" ก่อนจะถึงรอบถัดไปที่มันควรจะบล็อกจริง
        // ผลคือ Time Stop ยังไม่บล็อกเทิร์นใครเลยแม้จะแก้ justApplied แล้ว ต้องเลื่อนการนับ turns
        // ออกไปอีก 1 รอบเฉพาะ TimeStop (ไม่แตะสถานะอื่นเพื่อไม่ให้ระยะเวลาบัพ/ดีบัฟอื่นเปลี่ยนไป)
        if (eff.type === 'TimeStop' && eff.justApplied) {
          eff.justApplied = false;
        } else {
          eff.justApplied = false;
          eff.turns--;
        }
        if (eff.turns <= 0) expired.push(eff.type);
      });
      actor.statusEffects = actor.statusEffects.filter(eff => eff.turns > 0);
      expired.forEach(type => {
        ctx.log(`⏳ สถานะ ${type} หมดเวลาแล้ว (${actor.name})`, 'system');
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Damage / heal core
// ---------------------------------------------------------------------------
function applyHeal(target, amount) {
  if (!target) return;
  target.hp = Math.min(target.maxHp, target.hp + amount);
}

async function applyDamage(attacker, target, dmg, ctx, options = {}) {
  if (!target) return;

  // PhantomBoss: หลบการโจมตี/สกิลของผู้เล่นแบบสุ่ม
  if (target.class === 'PhantomBoss' && attacker && !attacker.isEnemy) {
    const hpPercent = target.hp / target.maxHp;
    if (!attacker.skill && Math.random() < 0.5) {
      ctx.log(`💨 ${target.name} หลบการโจมตีของ ${attacker.name}!`, 'enemy');
      return;
    }
    if (attacker.skill && hpPercent < 0.3 && Math.random() < 0.2) {
      ctx.log(`💨 ${target.name} หลบสกิลของ ${attacker.name}!`, 'enemy');
      return;
    }
  }

  // 🔧 FIX: Shield (จาก PhantomBoss "Shadow Shield") เดิมไม่เคยดูดซับดาเมจจริง — ใส่ผลจริงตรงนี้
  let dmgAfterShield = dmg;
  if (target.statusEffects) {
    const shieldIdx = target.statusEffects.findIndex(e => e.type === 'Shield' && e.value > 0);
    if (shieldIdx !== -1 && dmgAfterShield > 0) {
      const shield = target.statusEffects[shieldIdx];
      const absorbed = Math.min(shield.value, dmgAfterShield);
      shield.value -= absorbed;
      dmgAfterShield -= absorbed;
      ctx.log(`🛡️ Shield ของ ${target.name} ดูดซับดาเมจ -${absorbed}`, target.isEnemy ? 'enemy' : 'player');
      if (shield.value <= 0) target.statusEffects.splice(shieldIdx, 1);
    }
  }

  target.hp -= dmgAfterShield;
  dmg = dmgAfterShield;

  // 🔧 FIX: Mirror ("สวนกลับ % ATK") — ใช้ครั้งเดียวแล้วหมด (consume)
  if (target.statusEffects && attacker && target !== attacker && dmg > 0) {
    const mirrorIdx = target.statusEffects.findIndex(e => e.type === 'Mirror');
    if (mirrorIdx !== -1) {
      const mirror = target.statusEffects[mirrorIdx];
      target.statusEffects.splice(mirrorIdx, 1);
      const reflectDmg = Math.max(1, Math.floor(getFinalAtk(target) * (mirror.power || 1)));
      ctx.log(`🪞 ${target.name} สะท้อนดาเมจกลับ ${attacker.name} -${reflectDmg} HP`, target.isEnemy ? 'enemy' : 'player');
      await applyDamage(target, attacker, reflectDmg, ctx, { noMove: true });
    }
  }

  if (ctx.trackDamage) ctx.trackDamage(attacker, target, dmg);
  if (target.instanceId === 'BOSS' && !target.isSummon && ctx.addBossDamage) {
    ctx.addBossDamage(dmg);
  }

  // Rebirth trigger
  if (target.skill?.startsWith('Rebirth') && !target.usedRebirth) {
    let healPercent = 0;
    if (target.skill === 'Rebirth L1') healPercent = 0.5;
    if (target.skill === 'Rebirth L2') healPercent = 0.7;
    if (target.skill === 'Rebirth L3') healPercent = 1.0;
    if (target.skill === 'Rebirth Lord') healPercent = 2;

    if (target.hp <= 0 || target.hp / target.maxHp < 0.1) {
      target.usedRebirth = true;
      const oldHp = Math.max(0, target.hp);
      target.hp = Math.min(target.maxHp * 2, Math.floor(target.maxHp * healPercent));
      const healed = target.hp - oldHp;

      ctx.log(`✨ ${target.name} ใช้ ${target.skill}! ฟื้นคืนชีพด้วย ${target.hp} HP และปล่อยระเบิดพลัง!`, target.isEnemy ? 'enemy' : 'player');

      const enemiesOfTarget = target.isEnemy ? ctx.playerTeam : ctx.enemyTeam;
      const aliveEnemies = enemiesOfTarget.filter(e => e.hp > 0);
      if (aliveEnemies.length > 0 && healed > 0) {
        const dmgPerEnemy = Math.max(1, Math.floor(healed / aliveEnemies.length));
        for (const e of aliveEnemies) {
          await applyDamage(target, e, dmgPerEnemy, ctx, { noMove: true });
        }
      }
      return;
    }
  }

  if (target.hp < 0) target.hp = 0;

  // BigBoss reactive heal
  if (target.class === 'BigBoss' && attacker && !attacker.isEnemy && attacker.skill) {
    if (Math.random() < 0.3) {
      const heal = Math.floor(target.maxHp * 0.002);
      target.hp = Math.min(target.maxHp, target.hp + heal);
      ctx.log(`💖 ${target.name} ฮีลตัวเอง +${heal} HP (BigBoss Reactive Heal)`, 'enemy');
    }
  }

  // UltraBoss instant-death chance when hit by a player skill
  if (target.class === 'UltraBoss' && attacker && !attacker.isEnemy && attacker.skill && !target.ultraDeathTriggered) {
    if (Math.random() < 0.1) {
      target.hp = 0;
      target.ultraDeathTriggered = true;
      ctx.log(`☠️ ${target.name} โดนสกิลเด็ดขาด! ตายทันที!`, 'enemy');
      ctx.onDeath?.(target, attacker);
      return;
    }
  }

  if (target.hp <= 0) {
    ctx.onDeath?.(target, attacker);
  }
}

// ---------------------------------------------------------------------------
// Basic actions
// ---------------------------------------------------------------------------
async function normalAttack(user, enemies, ctx) {
  const target = chooseTarget(user, enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const rawDmg = Math.max(1, Math.floor(atkFinal - defFinal));

  if (user.berserk || user.class === 'BigBoss' || user.class === 'GigaBoss' || user.class === 'Berserker') {
    if (!user.isBerserked && user.hp <= user.maxHp * 0.4) {
      user.isBerserked = true;
      ctx.log(`💢 ${user.name} เข้าสู่ Berserk Mode!`, user.isEnemy ? 'enemy' : 'player');
    }
    if (user.isBerserked) {
      const alive = enemies.filter(e => e.hp > 0);
      const chosen = [target];
      if (alive.length > 1) {
        const others = alive.filter(e => e !== target);
        chosen.push(others[Math.floor(Math.random() * others.length)]);
      }
      for (const t of chosen) {
        // 🔧 FIX: ของเดิม (client) hardcode 1.5x เสมอไม่ว่าจะเป็น Berserk Mode L1/L2/L3/Guardian
        // (ตั้งค่า multiplier ต่างกันจริงตอน activateBerserk แต่ normalAttack ไม่เคยอ่านค่านั้น)
        // ผลคือทุกเลเวลแรงเท่ากันหมด ที่นี่อ่านค่าจริงจาก user.berserk.multiplier แทน
        const berserkMultiplier = (user.berserk && user.berserk.multiplier) || 1.5;
        const berserkDmg = Math.floor(rawDmg * berserkMultiplier);
        ctx.log(`💥 ${user.name} (Berserk) โจมตีใส่ ${t.name} -${berserkDmg} HP`, user.isEnemy ? 'enemy' : 'player');
        await applyDamage(user, t, berserkDmg, ctx);
      }
      return true;
    }
  }

  ctx.log(`👊 ${user.name} โจมตี → ${target.name} -${rawDmg} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, rawDmg, ctx);

  if (user.class === 'Rogue' && Math.random() < 0.4) {
    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length > 0) {
      const extraTarget = alive[Math.floor(Math.random() * alive.length)];
      const extraAtkFinal = getFinalAtk(user);
      const extraDefFinal = getFinalDef(extraTarget);
      const extraRawDmg = Math.max(1, Math.floor(extraAtkFinal - extraDefFinal));
      ctx.log(`⚡ ${user.name} ได้โจมตีซ้ำใส่ ${extraTarget.name} -${extraRawDmg} HP`, user.isEnemy ? 'enemy' : 'player');
      await applyDamage(user, extraTarget, extraRawDmg, ctx);
    }
  }

  return true;
}

function healerIdle(user, ctx) {
  ctx.log(`${user.name} ยืนรอ ไม่ได้ทำอะไร`, user.isEnemy ? 'enemy' : 'player');
  return true;
}

// ---------------------------------------------------------------------------
// Skill implementations (ported from public/js/skills/Intermediaryfunction.js)
// ---------------------------------------------------------------------------
async function doHeal(user, allies, multiplier, level, ctx) {
  const candidates = allies.filter(a => a.hp > 0 && a.hp < a.maxHp);
  if (candidates.length === 0) {
    ctx.log(`❌ ${user.name} ไม่มีใครให้ฮีล`, user.isEnemy ? 'enemy' : 'player');
    return healerIdle(user, ctx);
  }
  candidates.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const ally = candidates[0];
  const atkFinal = getFinalAtk(user);
  const healAmount = Math.floor(atkFinal * multiplier);
  ctx.log(`💚 ${user.name} (Heal L${level}) → ฟื้น ${ally.name} +${healAmount} HP`, user.isEnemy ? 'enemy' : 'player');
  applyHeal(ally, healAmount);
  user.cooldown = 2;
  return true;
}

async function doAOEHeal(user, allies, multiplier, level, ctx) {
  const targets = allies.filter(a => a.hp > 0 && a.hp < a.maxHp);
  if (targets.length === 0) {
    ctx.log(`❌ ${user.name} ไม่มีใครให้ฮีล`, user.isEnemy ? 'enemy' : 'player');
    return healerIdle(user, ctx);
  }
  const atkFinal = getFinalAtk(user);
  for (const a of targets) {
    const healAmount = Math.floor(atkFinal * multiplier);
    ctx.log(`💖 ${user.name} (AOE Heal L${level}) → ฟื้น ${a.name} +${healAmount} HP`, user.isEnemy ? 'enemy' : 'player');
    applyHeal(a, healAmount);
  }
  user.cooldown = 2;
  return true;
}

async function doCharm(user, enemies, multiplier, level, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const allyTarget = findFirstAlive(enemies.filter(e => e !== target));
  if (!allyTarget) return false;
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(allyTarget);
  const dmg = Math.max(2, Math.floor(atkFinal * multiplier) - defFinal);
  ctx.log(`💘 ${user.name} (Charm L${level}) → ${target.name} หลงเสน่ห์โจมตี ${allyTarget.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(target, allyTarget, dmg, ctx);
  user.cooldown = 6;
  return true;
}

async function doRevive(user, allies, percent, level, ctx) {
  const deadAlly = allies.find(a => a.hp <= 0);
  if (!deadAlly) {
    ctx.log(`❌ ${user.name} ไม่มีใครให้ชุบชีวิต`, user.isEnemy ? 'enemy' : 'player');
    user.cooldown = 3;
    return true;
  }
  deadAlly.hp = Math.floor(deadAlly.maxHp * percent);
  ctx.log(`✨ ${user.name} (Revive L${level}) → ชุบชีวิต ${deadAlly.name} ฟื้น ${deadAlly.hp} HP`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = 6;
  return true;
}

async function doBloodTribute(user, allies, enemies, multiplier, level, ctx) {
  const livingEnemies = enemies.filter(e => e.hp > 0);
  if (livingEnemies.length === 0) return false;
  let totalDrain = 0;
  for (const e of livingEnemies) {
    const atkFinal = getFinalAtk(user);
    const dmg = Math.max(1, Math.floor(atkFinal * multiplier));
    ctx.log(`🩸 ${user.name} (Blood Tribute L${level}) → ดูดเลือด ${e.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
    await applyDamage(user, e, dmg, ctx);
    totalDrain += dmg;
  }
  const targetAlly = allies.filter(a => a.hp > 0).sort((a, b) => a.hp - b.hp)[0];
  if (targetAlly) {
    const heal = Math.min(totalDrain, targetAlly.maxHp - targetAlly.hp);
    if (heal > 0) {
      ctx.log(`💖 ${user.name} ฟื้นฟู ${targetAlly.name} +${heal} HP จากการดูดเลือด`, user.isEnemy ? 'enemy' : 'player');
      applyHeal(targetAlly, heal);
    }
  }
  user.cooldown = 5;
  return true;
}

async function doLifesteal(user, allies, enemies, healRate, level, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const dmg = Math.max(1, Math.floor(atkFinal - defFinal));
  const heal = Math.floor(dmg * healRate);
  ctx.log(`🩸 ${user.name} (Lifesteal L${level}) → โจมตี ${target.name} -${dmg} HP และฟื้น +${heal} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, dmg, ctx);
  if (heal > 0) applyHeal(user, heal);
  user.cooldown = 3;
  return true;
}

async function doLifestealLord(user, enemies, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const dmg = Math.max(1, Math.floor(atkFinal - defFinal));
  const heal = Math.floor(dmg * 1.0); // 🔧 ปรับจาก 180% เดิม ดู skillHandlers_partHP.js ฝั่ง client
  ctx.log(`🩸 ${user.name} (Lifesteal Lord) → โจมตี ${target.name} -${dmg} HP และฟื้น +${heal} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, dmg, ctx);
  if (heal > 0) applyHeal(user, heal);
  user.cooldown = 3;
  return true;
}

async function doPowerStrike(user, enemies, multiplier, level, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const dmg = Math.max(1, Math.floor(atkFinal * multiplier) - defFinal);
  ctx.log(`💥 ${user.name} (Power Strike L${level}) → ${target.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, dmg, ctx);
  user.cooldown = 4;
  return true;
}

async function doAOEAttack(user, enemies, divisor, level, ctx) {
  let used = false;
  for (const e of enemies) {
    if (e.hp > 0) {
      used = true;
      const atkFinal = getFinalAtk(user);
      const defFinal = getFinalDef(e);
      const rawDmg = atkFinal - defFinal;
      const dmg = Math.max(1, Math.floor(rawDmg / divisor));
      ctx.log(`🔥 ${user.name} (AOE Attack L${level}) → ${e.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
      await applyDamage(user, e, dmg, ctx);
    }
  }
  if (used) user.cooldown = 4;
  return used;
}

async function doAOEAttackBoss(user, enemies, ctx) {
  let used = false;
  for (const e of enemies) {
    if (e.hp > 0) {
      used = true;
      const atkFinal = getFinalAtk(user);
      const defFinal = getFinalDef(e);
      const rawDmg = atkFinal - defFinal;
      const dmg = Math.max(1, Math.floor(rawDmg * 1.2));
      ctx.log(`🔥 ${user.name} (AOE Attack) → ${e.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
      await applyDamage(user, e, dmg, ctx);
    }
  }
  if (used) user.cooldown = 4;
  return used;
}

async function doBombSkill(user, enemies, atkMultiplier, defDivisor, level, ctx) {
  const targets = enemies.filter(e => e.hp > 0);
  if (targets.length === 0) return false;
  const atkFinal = getFinalAtk(user);
  const baseDmg = Math.floor(atkFinal * atkMultiplier);
  ctx.log(`💣 ${user.name} ใช้ Bomb L${level}!`, user.isEnemy ? 'enemy' : 'player');
  for (const e of targets) {
    const defFinal = getFinalDef(e);
    const finalDmg = Math.max(1, Math.floor(baseDmg - defFinal / defDivisor));
    ctx.log(`💣💥 Bomb → ${e.name} -${finalDmg} HP`, user.isEnemy ? 'enemy' : 'player');
    await applyDamage(user, e, finalDmg, ctx, { noMove: true });
  }
  user.cooldown = 4;
  return true;
}

async function doCriticalSkill(user, enemies, multiplier, level, ctx) {
  const candidates = enemies.filter(e => e.hp > 0);
  if (candidates.length === 0) return false;
  candidates.sort((a, b) => a.maxHp - b.maxHp);
  const target = candidates[0];
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const dmg = Math.max(1, Math.floor(atkFinal * multiplier) - defFinal);
  ctx.log(`💥 ${user.name} (Critical L${level} - CRIT!) → ${target.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, dmg, ctx);
  user.cooldown = 2;
  return true;
}

async function doDoubleStrike(user, enemies, multiplier1, multiplier2, level, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const atk1 = getFinalAtk(user);
  const def1 = getFinalDef(target);
  const dmg1 = Math.max(1, Math.floor(atk1 * multiplier1) - def1);
  ctx.log(`🗡️ ${user.name} (Double L${level} - Hit 1) → ${target.name} -${dmg1} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, dmg1, ctx);
  if (target.hp > 0) {
    const atk2 = getFinalAtk(user);
    const def2 = getFinalDef(target);
    const dmg2 = Math.max(1, Math.floor(atk2 * multiplier2) - def2);
    ctx.log(`🗡️ ${user.name} (Double L${level} - Hit 2) → ${target.name} -${dmg2} HP`, user.isEnemy ? 'enemy' : 'player');
    await applyDamage(user, target, dmg2, ctx);
  }
  user.cooldown = 3;
  return true;
}

async function doPiercingShot(user, enemies, atkMultiplier, defDivider, level, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const dmg = Math.max(1, Math.floor(atkFinal * atkMultiplier) - Math.floor(defFinal / defDivider));
  ctx.log(`🎯 ${user.name} (Piercing Shot L${level}) → ${target.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, dmg, ctx);
  user.cooldown = 3;
  return true;
}

async function doPiercingShotMage(user, enemies, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const dmg = Math.max(1, Math.floor(atkFinal * 2) - Math.floor(defFinal / 2.5));
  ctx.log(`🎯 ${user.name} (Piercing Shot L3) → ${target.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
  await applyDamage(user, target, dmg, ctx);
  user.cooldown = 3;
  return true;
}

async function doTripleHit(user, enemies, atkMultiplier, level, ctx) {
  let target = findFirstAlive(enemies);
  if (!target) return false;
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  const baseDmg = Math.max(1, Math.floor(atkFinal * atkMultiplier) - defFinal);
  for (const i of [1, 2, 3]) {
    if (target && target.hp > 0) {
      const dmg = Math.max(1, Math.floor(baseDmg / Math.pow(2, i - 1)));
      ctx.log(`💢 ${user.name} (Triple Hit L${level} - Hit ${i}) → ${target.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
      await applyDamage(user, target, dmg, ctx);
    } else {
      const otherTargets = enemies.filter(e => e.hp > 0);
      if (otherTargets.length === 0) continue;
      const newTarget = otherTargets[Math.floor(Math.random() * otherTargets.length)];
      const dmg = Math.max(1, Math.floor((baseDmg / Math.pow(2, i - 1)) * 0.4));
      ctx.log(`💥 ${user.name} (Triple Hit L${level} - Bounce ${i}) → ${newTarget.name} -${dmg} HP`, user.isEnemy ? 'enemy' : 'player');
      await applyDamage(user, newTarget, dmg, ctx);
      target = newTarget;
    }
  }
  user.cooldown = 3;
  return true;
}

async function doDebuff(user, enemies, { type, multiplier, turns, level }, ctx) {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  const atkFinal = getFinalAtk(user);
  addStatusEffect(target, { type, turns, damage: Math.floor(atkFinal * multiplier) }, ctx);
  const emoji = type === 'Burn' ? '🔥' : type === 'Poison' ? '☠️' : type === 'Bleed' ? '🩸' : '❄️';
  ctx.log(`${emoji} ${user.name} (${type} L${level}) → ${target.name} ติด${type} ${turns} เทิร์น`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = type === 'Burn' ? 3 : 4;
  return true;
}

async function doDefenseBuff(user, allies, { divisor, turns = 2, aoe = false, level }, ctx) {
  const buffVal = Math.floor((user.baseDef ?? user.defBase ?? 0) / divisor);
  const targets = aoe ? allies.filter(a => a.hp > 0) : (allies.find(a => a.hp > 0) ? [allies.find(a => a.hp > 0)] : []);
  targets.forEach(a => addStatusEffect(a, { type: 'DefenseBuff', turns, value: buffVal }, ctx));
  ctx.log(`🛡️ ${user.name} (${aoe ? 'AOE ' : ''}Defense Buff L${level}) → DEF +${buffVal} ${aoe ? 'ให้ทีม ' : ''}(${turns} เทิร์น)`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = 6;
  return true;
}

async function doEnergyBoost(user, allies, { reduce = 1, healRatio = 0, logText = '', selfCd = 4 }, ctx) {
  allies.forEach(a => {
    if (a.hp > 0) {
      if (reduce === 1) {
        if (a.cooldown > 0) a.cooldown -= 1;
      } else if (reduce === 2) {
        if (a.cooldown > 1) a.cooldown -= 2;
        else if (a.cooldown > 0) a.cooldown = 0;
      }
      if (healRatio > 0) {
        const heal = Math.floor(getFinalAtk(user) * healRatio);
        applyHeal(a, heal);
      }
    }
  });
  ctx.log(`⚡ ${user.name} ${logText}`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = selfCd;
  return true;
}

async function doSilence(user, targets, { chance = 0.3, turns = 2, logText = '', selfCd = 5 }, ctx) {
  targets.forEach(e => {
    if (e.hp > 0) addStatusEffect(e, { type: 'SkillBlockChance', chance, turns }, ctx);
  });
  ctx.log(`🔇 ${user.name} ${logText}`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = selfCd;
  return true;
}

async function doSkillBoost(user, allies, { value = 0.3, turns = 3, logText = '', selfCd = 5 }, ctx) {
  allies.forEach(a => {
    if (a.hp > 0) {
      addStatusEffect(a, { type: 'SkillBoost', turns, value }, ctx);
      ctx.log(`✨ ${a.name} ${logText}`, user.isEnemy ? 'enemy' : 'player');
    }
  });
  user.cooldown = selfCd;
  return true;
}

async function doCleanse(user, allies, { healRatio = 0, resistTurns = 0, logText = '', selfCd = 5 }, ctx) {
  const atkFinal = getFinalAtk(user);
  allies.forEach(a => {
    if (a.hp > 0 && a.statusEffects) {
      a.statusEffects = a.statusEffects.filter(e => !['Poison', 'Burn', 'Silence', 'TimeStop'].includes(e.type));
      if (healRatio > 0) applyHeal(a, Math.floor(atkFinal * healRatio));
      if (resistTurns > 0) addStatusEffect(a, { type: 'DebuffResist', turns: resistTurns }, ctx);
    }
  });
  ctx.log(`💧 ${user.name} ${logText}`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = selfCd;
  return true;
}

async function doTimeStop(user, targets, { turns = 1, logText = '', cd = 4 }, ctx) {
  if (!targets || targets.length === 0) return false;
  targets.forEach(target => addStatusEffect(target, { type: 'TimeStop', turns, damage: 0 }, ctx));
  ctx.log(`⏳ ${user.name} ${logText}`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = cd;
  return true;
}

async function doStun(user, targets, { turns = 1, dmgMultiplier = 1, logText = '', cd = 5 }, ctx) {
  if (!targets || targets.length === 0) return false;
  for (const target of targets) {
    addStatusEffect(target, { type: 'Stun', turns }, ctx);
    const atkFinal = getFinalAtk(user);
    const defFinal = getFinalDef(target);
    const dmg = Math.max(1, Math.floor(atkFinal / dmgMultiplier) - defFinal);
    ctx.log(`💫 ${user.name} ${logText} → ${target.name} -${dmg} HP (สตัน ${turns} เทิร์น)`, user.isEnemy ? 'enemy' : 'player');
    await applyDamage(user, target, dmg, ctx);
  }
  user.cooldown = cd;
  return true;
}

function activateBerserk(user, multiplier, ctx) {
  user.berserk = { multiplier };
  ctx.log(`💪 ${user.name} เข้าสู่ Berserk Mode! พลังโจมตี x${multiplier}`, user.isEnemy ? 'enemy' : 'player');
}

async function doSummonMinions(user, allies, enemies, ctx) {
  if (user.hasSummoned) {
    ctx.log(`⚠️ ${user.name} ใช้ Summon ได้ครั้งเดียวต่อเกม`, 'enemy');
    return normalAttack(user, enemies, ctx);
  }
  const stamp = Date.now();
  const summons = [
    { name: 'ลูกน้อง 1', hp: 120, maxHp: 120, atk: 25, defBase: 10, tempDef: 0, def: 10, isEnemy: true, instanceId: `SUM-${stamp}-1`, skill: 'None', cooldown: 0, statusEffects: [], isSummon: true },
    { name: 'ลูกน้อง 2', hp: 120, maxHp: 120, atk: 25, defBase: 10, tempDef: 0, def: 10, isEnemy: true, instanceId: `SUM-${stamp}-2`, skill: 'None', cooldown: 0, statusEffects: [], isSummon: true },
  ];
  const idx = allies.indexOf(user);
  allies.splice(idx, 0, ...summons);
  user.hasSummoned = true;
  ctx.log(`🧟 ${user.name} ซัมมอนลูกน้อง 2 ตัวออกมา!`, 'enemy');
  user.cooldown = 8;
  return true;
}

function makeGolem({ user, team, hpMult, atkMult, defMult }) {
  const hp = Math.floor(user.hp * hpMult);
  return {
    name: 'Summoned Golem',
    hp,
    maxHp: hp,
    atk: Math.floor(user.hp * atkMult),
    def: Math.floor(user.hp * defMult),
    defBase: Math.floor(user.hp * defMult),
    tempDef: 0,
    cooldown: 0,
    skill: 'None',
    isEnemy: user.isEnemy,
    statusEffects: [],
    instanceId: `SUMMON-${Date.now()}`,
  };
}

async function doSummon(user, team, { hpMult, atkMult, defMult }, ctx) {
  for (let i = team.length - 1; i >= 0; i--) {
    if (team[i].name === 'Summoned Golem' && team[i].hp <= 0) team.splice(i, 1);
  }
  const existingGolem = team.find(m => m.name === 'Summoned Golem' && m.hp > 0);
  if (existingGolem) {
    ctx.log(`❌ ${user.name} มี Golem อยู่แล้ว ซัมมอนไม่ได้`, user.isEnemy ? 'enemy' : 'player');
    return false;
  }
  const summon = makeGolem({ user, team, hpMult, atkMult, defMult });
  const index = team.indexOf(user);
  if (index >= 0) team.splice(index, 0, summon);
  else team.push(summon);
  ctx.log(`🪨 ${user.name} อัญเชิญ Golem มาช่วย`, user.isEnemy ? 'enemy' : 'player');
  user.cooldown = 6;
  return true;
}

// ---------------------------------------------------------------------------
// Skill handler map (ported from skillHandlers_part*.js)
// ---------------------------------------------------------------------------
function buildSkillHandlers() {
  return {
    'None': async (user, allies, enemies, ctx) => {
      if (isHealer(user) || (user.lastSkill && isHealer({ skill: user.lastSkill }))) return healerIdle(user, ctx);
      return normalAttack(user, enemies, ctx);
    },
    'Power Strike L1': (u, a, e, ctx) => doPowerStrike(u, e, 1.3, 1, ctx),
    'Power Strike L2': (u, a, e, ctx) => doPowerStrike(u, e, 1.5, 2, ctx),
    'Power Strike L3': (u, a, e, ctx) => doPowerStrike(u, e, 1.8, 3, ctx),
    'AOE Attack L1': (u, a, e, ctx) => doAOEAttack(u, e, 2.0, 1, ctx),
    'AOE Attack L2': (u, a, e, ctx) => doAOEAttack(u, e, 1.5, 2, ctx),
    'AOE Attack L3': (u, a, e, ctx) => doAOEAttack(u, e, 1.2, 3, ctx),
    'AOE Attack Boss': (u, a, e, ctx) => doAOEAttackBoss(u, e, ctx),
    'Bomb L1': (u, a, e, ctx) => doBombSkill(u, e, 0.8, 1.2, 1, ctx),
    'Bomb L2': (u, a, e, ctx) => doBombSkill(u, e, 1.2, 1.3, 2, ctx),
    'Bomb L3': (u, a, e, ctx) => doBombSkill(u, e, 1.4, 1.4, 3, ctx),
    'Critical L1': (u, a, e, ctx) => doCriticalSkill(u, e, 1.3, 1, ctx),
    'Critical L2': (u, a, e, ctx) => doCriticalSkill(u, e, 1.8, 2, ctx),
    'Critical L3': (u, a, e, ctx) => doCriticalSkill(u, e, 2.2, 3, ctx),
    'Double Strike L1': (u, a, e, ctx) => doDoubleStrike(u, e, 1.0, 0.8, 1, ctx),
    'Double Strike L2': (u, a, e, ctx) => doDoubleStrike(u, e, 1.2, 1.0, 2, ctx),
    'Double Strike L3': (u, a, e, ctx) => doDoubleStrike(u, e, 1.5, 1.2, 3, ctx),
    'Piercing L1': (u, a, e, ctx) => doPiercingShot(u, e, 1.2, 2.0, 1, ctx),
    'Piercing L2': (u, a, e, ctx) => doPiercingShot(u, e, 1.5, 2.1, 2, ctx),
    'Piercing L3': (u, a, e, ctx) => doPiercingShot(u, e, 1.8, 2.2, 3, ctx),
    'Piercing Shot L1': (u, a, e, ctx) => doPiercingShot(u, e, 1.2, 2.0, 1, ctx),
    'Piercing Shot L2': (u, a, e, ctx) => doPiercingShot(u, e, 1.5, 2.1, 2, ctx),
    'Piercing Shot L3': (u, a, e, ctx) => doPiercingShot(u, e, 1.8, 2.2, 3, ctx),
    'Piercing Shot Mage': (u, a, e, ctx) => doPiercingShotMage(u, e, ctx),
    '3 hit target L1': (u, a, e, ctx) => doTripleHit(u, e, 0.8, 1, ctx),
    '3 hit target L2': (u, a, e, ctx) => doTripleHit(u, e, 1.0, 2, ctx),
    '3 hit target L3': (u, a, e, ctx) => doTripleHit(u, e, 1.3, 3, ctx),

    'Heal L1': (u, a, e, ctx) => doHeal(u, a, 0.5, 1, ctx),
    'Heal L2': (u, a, e, ctx) => doHeal(u, a, 1.0, 2, ctx),
    'Heal L3': (u, a, e, ctx) => doHeal(u, a, 1.5, 3, ctx),
    'AOE Heal L1': (u, a, e, ctx) => doAOEHeal(u, a, 0.4, 1, ctx),
    'AOE Heal L2': (u, a, e, ctx) => doAOEHeal(u, a, 0.8, 2, ctx),
    'AOE Heal L3': (u, a, e, ctx) => doAOEHeal(u, a, 1.3, 3, ctx),
    'Revive L1': (u, a, e, ctx) => doRevive(u, a, 0.2, 1, ctx),
    'Revive L2': (u, a, e, ctx) => doRevive(u, a, 0.4, 2, ctx),
    'Revive L3': (u, a, e, ctx) => doRevive(u, a, 0.6, 3, ctx),
    'Charm L1': (u, a, e, ctx) => doCharm(u, e, 1.0, 1, ctx),
    'Charm L2': (u, a, e, ctx) => doCharm(u, e, 1.2, 2, ctx),
    'Charm L3': (u, a, e, ctx) => doCharm(u, e, 1.5, 3, ctx),
    'Blood Tribute L1': (u, a, e, ctx) => doBloodTribute(u, a, e, 0.4, 1, ctx),
    'Blood Tribute L2': (u, a, e, ctx) => doBloodTribute(u, a, e, 0.6, 2, ctx),
    'Blood Tribute L3': (u, a, e, ctx) => doBloodTribute(u, a, e, 0.8, 3, ctx),
    'Lifesteal L1': (u, a, e, ctx) => doLifesteal(u, a, e, 0.3, 1, ctx),
    'Lifesteal L2': (u, a, e, ctx) => doLifesteal(u, a, e, 0.5, 2, ctx),
    'Lifesteal L3': (u, a, e, ctx) => doLifesteal(u, a, e, 0.7, 3, ctx),
    'Lifesteal Lord': (u, a, e, ctx) => doLifestealLord(u, e, ctx),

    'Berserk Mode L1': async (u, a, e, ctx) => { activateBerserk(u, 1.25, ctx); return normalAttack(u, e, ctx); },
    'Berserk Mode L2': async (u, a, e, ctx) => { activateBerserk(u, 1.5, ctx); return normalAttack(u, e, ctx); },
    'Berserk Mode L3': async (u, a, e, ctx) => { activateBerserk(u, 1.75, ctx); return normalAttack(u, e, ctx); },
    'Berserk Guardian': async (u, a, e, ctx) => { activateBerserk(u, 2.2, ctx); return normalAttack(u, e, ctx); },

    'Burn L1': (u, a, e, ctx) => doDebuff(u, e, { type: 'Burn', multiplier: 0.5, turns: 3, level: 1 }, ctx),
    'Burn L2': (u, a, e, ctx) => doDebuff(u, e, { type: 'Burn', multiplier: 0.8, turns: 3, level: 2 }, ctx),
    'Burn L3': (u, a, e, ctx) => doDebuff(u, e, { type: 'Burn', multiplier: 1.0, turns: 3, level: 3 }, ctx),
    'Poison L1': (u, a, e, ctx) => doDebuff(u, e, { type: 'Poison', multiplier: 0.8, turns: 3, level: 1 }, ctx),
    'Poison L2': (u, a, e, ctx) => doDebuff(u, e, { type: 'Poison', multiplier: 1.0, turns: 3, level: 2 }, ctx),
    'Poison L3': (u, a, e, ctx) => doDebuff(u, e, { type: 'Poison', multiplier: 1.3, turns: 3, level: 3 }, ctx),

    'Defense Buff L1': (u, a, e, ctx) => doDefenseBuff(u, a, { divisor: 5, level: 1 }, ctx),
    'Defense Buff L2': (u, a, e, ctx) => doDefenseBuff(u, a, { divisor: 4, level: 2 }, ctx),
    'Defense Buff L3': (u, a, e, ctx) => doDefenseBuff(u, a, { divisor: 3, level: 3 }, ctx),
    'AOE Defense Buff L1': (u, a, e, ctx) => doDefenseBuff(u, a, { divisor: 6, aoe: true, level: 1 }, ctx),
    'AOE Defense Buff L2': (u, a, e, ctx) => doDefenseBuff(u, a, { divisor: 5, aoe: true, level: 2 }, ctx),
    'AOE Defense Buff L3': (u, a, e, ctx) => doDefenseBuff(u, a, { divisor: 4, aoe: true, level: 3 }, ctx),

    'Energy Boost L1': (u, a, e, ctx) => doEnergyBoost(u, a, { reduce: 1, healRatio: 0, logText: '(Energy Boost L1) → ลดคูลดาวน์สกิลของทีมลง 1 เทิร์น', selfCd: 4 }, ctx),
    'Energy Boost L2': (u, a, e, ctx) => doEnergyBoost(u, a, { reduce: 1, healRatio: 0.3, logText: '(Energy Boost L2) → ลดคูลดาวน์ทีมลง 1 เทิร์น และฟื้นเล็กน้อย', selfCd: 3 }, ctx),
    'Energy Boost L3': (u, a, e, ctx) => doEnergyBoost(u, a, { reduce: 2, healRatio: 0, logText: '(Energy Boost L3) → ลดคูลดาวน์สกิลของทีมลง 2 เทิร์น!', selfCd: 5 }, ctx),

    'Silence L1': (u, a, e, ctx) => doSilence(u, [e.find(x => x.hp > 0)].filter(Boolean), { chance: 0.3, logText: 'ทำให้เป้าหมายมีโอกาสล้มเหลวในการใช้สกิล 30% (2 เทิร์น)' }, ctx),
    'Silence L2': (u, a, e, ctx) => doSilence(u, [e.find(x => x.hp > 0)].filter(Boolean), { chance: 0.4, logText: 'ทำให้เป้าหมายมีโอกาสล้มเหลวในการใช้สกิล 40% (2 เทิร์น)' }, ctx),
    'Silence L3': (u, a, e, ctx) => doSilence(u, [e.find(x => x.hp > 0)].filter(Boolean), { chance: 0.5, logText: 'ทำให้เป้าหมายมีโอกาสล้มเหลวในการใช้สกิล 50% (2 เทิร์น)' }, ctx),
    'AOE Silence L1': (u, a, e, ctx) => doSilence(u, e, { chance: 0.2, logText: 'กดดันทั้งทีมศัตรู ลดโอกาสใช้สกิล 20% (2 เทิร์น)' }, ctx),
    'AOE Silence L2': (u, a, e, ctx) => doSilence(u, e, { chance: 0.3, logText: 'กดดันทั้งทีมศัตรู ลดโอกาสใช้สกิล 30% (2 เทิร์น)' }, ctx),
    'AOE Silence L3': (u, a, e, ctx) => doSilence(u, e, { chance: 0.4, logText: 'กดดันทั้งทีมศัตรู ลดโอกาสใช้สกิล 40% (2 เทิร์น)' }, ctx),

    'Skill Boost L1': (u, a, e, ctx) => doSkillBoost(u, a, { value: 0.3, logText: 'ได้รับบัพ Skill Boost (+30% อัตราใช้สกิล 3 เทิร์น)' }, ctx),
    'Skill Boost L2': (u, a, e, ctx) => doSkillBoost(u, a, { value: 0.4, logText: 'ได้รับบัพ Skill Boost (+40% อัตราใช้สกิล 3 เทิร์น)' }, ctx),
    'Skill Boost L3': (u, a, e, ctx) => doSkillBoost(u, a, { value: 0.5, logText: 'ได้รับบัพ Skill Boost (+50% อัตราใช้สกิล 3 เทิร์น)' }, ctx),

    'Cleanse L1': (u, a, e, ctx) => doCleanse(u, a, { logText: '(Cleanse L1) → ล้างดีบัฟทั้งหมดออกจากทีม', selfCd: 5 }, ctx),
    'Cleanse L2': (u, a, e, ctx) => doCleanse(u, a, { healRatio: 0.3, logText: '(Cleanse L2) → ล้างดีบัฟ + ฟื้นเล็กน้อย', selfCd: 4 }, ctx),
    'Cleanse L3': (u, a, e, ctx) => doCleanse(u, a, { healRatio: 0.6, resistTurns: 1, logText: '(Cleanse L3) → ล้างดีบัฟ + ฟื้นมากขึ้น + กันดีบัฟ 1 เทิร์น', selfCd: 3 }, ctx),

    'Time Stop L1': (u, a, e, ctx) => doTimeStop(u, [findFirstAlive(e)].filter(Boolean), { turns: 1, logText: '(Time Stop L1) → หยุดเวลา 1 เทิร์น', cd: 5 }, ctx),
    'Time Stop L2': (u, a, e, ctx) => doTimeStop(u, [findFirstAlive(e)].filter(Boolean), { turns: 1, logText: '(Time Stop L2) → หยุดเวลา 1 เทิร์น', cd: 4 }, ctx),
    'Time Stop L3': (u, a, e, ctx) => doTimeStop(u, [findFirstAlive(e)].filter(Boolean), { turns: 1, logText: '(Time Stop L3) → หยุดเวลา 1 เทิร์น', cd: 3 }, ctx),
    'AOE Time Stop L1': (u, a, e, ctx) => doTimeStop(u, e.filter(x => x.hp > 0), { turns: 1, logText: '(AOE Time Stop L1) → ศัตรูทุกตัวหยุดเวลา 1 เทิร์น', cd: 7 }, ctx),
    'AOE Time Stop L2': (u, a, e, ctx) => doTimeStop(u, e.filter(x => x.hp > 0), { turns: 1, logText: '(AOE Time Stop L2) → ศัตรูทุกตัวหยุดเวลา 1 เทิร์น', cd: 6 }, ctx),
    'AOE Time Stop L3': (u, a, e, ctx) => doTimeStop(u, e.filter(x => x.hp > 0), { turns: 1, logText: '(AOE Time Stop L3) → ศัตรูทุกตัวหยุดเวลา 1 เทิร์น', cd: 5 }, ctx),

    'Mirror L1': async (u, a, e, ctx) => { addStatusEffect(u, { type: 'Mirror', turns: 2, power: 0.8 }, ctx); ctx.log(`🪞 ${u.name} เปิด Mirror (สวนกลับ 80% ATK ครั้งต่อไป)`, u.isEnemy ? 'enemy' : 'player'); u.cooldown = 4; return true; },
    'Mirror L2': async (u, a, e, ctx) => { addStatusEffect(u, { type: 'Mirror', turns: 1, power: 1.0 }, ctx); ctx.log(`🪞 ${u.name} เปิด Mirror (สวนกลับ 100% ATK ครั้งต่อไป)`, u.isEnemy ? 'enemy' : 'player'); u.cooldown = 4; return true; },
    'Mirror L3': async (u, a, e, ctx) => { addStatusEffect(u, { type: 'Mirror', turns: 1, power: 1.2 }, ctx); ctx.log(`🪞 ${u.name} เปิด Mirror (สวนกลับ 120% ATK ครั้งต่อไป)`, u.isEnemy ? 'enemy' : 'player'); u.cooldown = 4; return true; },

    'Stun L1': (u, a, e, ctx) => doStun(u, [findFirstAlive(e)].filter(Boolean), { turns: 1, dmgMultiplier: 1.3, logText: '(Stun L1)', cd: 5 }, ctx),
    'Stun L2': (u, a, e, ctx) => doStun(u, [findFirstAlive(e)].filter(Boolean), { turns: 1, dmgMultiplier: 1.1, logText: '(Stun L2)', cd: 5 }, ctx),
    'Stun L3': (u, a, e, ctx) => doStun(u, [findFirstAlive(e)].filter(Boolean), { turns: 1, dmgMultiplier: 0.9, logText: '(Stun L3)', cd: 5 }, ctx),
    'AOE Stun L1': (u, a, e, ctx) => doStun(u, e.filter(x => x.hp > 0), { turns: 1, dmgMultiplier: 1.6, logText: '(AOE Stun L1)', cd: 6 }, ctx),
    'AOE Stun L2': (u, a, e, ctx) => doStun(u, e.filter(x => x.hp > 0), { turns: 1, dmgMultiplier: 1.4, logText: '(AOE Stun L2)', cd: 6 }, ctx),
    'AOE Stun L3': (u, a, e, ctx) => doStun(u, e.filter(x => x.hp > 0), { turns: 1, dmgMultiplier: 1.2, logText: '(AOE Stun L3)', cd: 6 }, ctx),

    'SummonMinions': (u, a, e, ctx) => doSummonMinions(u, a, e, ctx),
    'Summon L1': (u, a, e, ctx) => doSummon(u, u.isEnemy ? ctx.enemyTeam : ctx.playerTeam, { hpMult: 1.01, atkMult: 0.08, defMult: 0.05 }, ctx),
    'Summon L2': (u, a, e, ctx) => doSummon(u, u.isEnemy ? ctx.enemyTeam : ctx.playerTeam, { hpMult: 1.01, atkMult: 0.085, defMult: 0.05 }, ctx),
    'Summon L3': (u, a, e, ctx) => doSummon(u, u.isEnemy ? ctx.enemyTeam : ctx.playerTeam, { hpMult: 1.02, atkMult: 0.09, defMult: 0.055 }, ctx),
  };
}

let SKILL_HANDLERS = null;
function getSkillHandlers() {
  if (!SKILL_HANDLERS) SKILL_HANDLERS = buildSkillHandlers();
  return SKILL_HANDLERS;
}

// ---------------------------------------------------------------------------
// useSkill dispatch (ported from public/js/skills/useSkill.js)
// ---------------------------------------------------------------------------
async function useSkill(user, allies, enemies, ctx) {
  user.lastSkill = user.skill;

  if (user.silenced) {
    ctx.log(`❌ ${user.name} ถูก Silence ใช้สกิลไม่ได้`, user.isEnemy ? 'enemy' : 'player');
    user.silenced = false;
    return normalAttack(user, enemies, ctx);
  }

  let skillChance = 0.4;
  if (user.class === 'Mage') skillChance = 0.6;
  if (user.class === 'MidBoss') skillChance = 0.6;
  if (user.class === 'BigBoss') skillChance = 0.7;
  if (user.class === 'UltraBoss') skillChance = 0.8;

  if (user.statusEffects && user.statusEffects.length > 0) {
    user.statusEffects.forEach(se => {
      if (se.type === 'SkillBoost') skillChance += se.value;
      if (se.type === 'SkillBlockChance') skillChance -= se.chance;
    });
  }
  skillChance = Math.max(0.05, Math.min(0.85, skillChance));

  if (Math.random() > skillChance) {
    return isHealer(user) ? healerIdle(user, ctx) : normalAttack(user, enemies, ctx);
  }

  const handler = getSkillHandlers()[user.skill];
  if (handler) {
    user.cooldown = undefined;
    const result = await handler(user, allies, enemies, ctx);
    if (user.cooldown === undefined) {
      user.cooldown = user.class === 'MidBoss' ? 2 : user.class === 'BigBoss' ? 2 : 4;
    }
    return result;
  }
  ctx.log(`⚠️ ไม่พบสกิล: ${user.skill}`, 'system');
  return normalAttack(user, enemies, ctx);
}

// ---------------------------------------------------------------------------
// Boss-only passives (ported from public/js/modes/BOSS/boss.js)
// ---------------------------------------------------------------------------
function tryMiniBossPassive(user, allies, ctx) {
  if (user.class === 'MiniBoss' && !user.hasSummoned) {
    const stamp = Date.now();
    const summons = [
      { name: 'ลูกน้อง 1', hp: 500, maxHp: 500, atk: 48, defBase: 50, tempDef: 0, def: 50, isEnemy: true, instanceId: `SUM-${stamp}-1`, skill: 'None', cooldown: 0, statusEffects: [], isSummon: true },
      { name: 'ลูกน้อง 2', hp: 120, maxHp: 120, atk: 25, defBase: 10, tempDef: 0, def: 10, isEnemy: true, instanceId: `SUM-${stamp}-2`, skill: 'Heal L2', cooldown: 0, statusEffects: [], isSummon: true },
    ];
    const idx = allies.indexOf(user);
    allies.splice(idx, 0, ...summons);
    user.hasSummoned = true;
    ctx.log(`🧟 ${user.name} เรียกลูกน้อง 2 ตัวออกมา (Passive)`, 'enemy');
  }
}

function tryMidBossPassive(user, allies, ctx) {
  if (user.class === 'MidBoss' && !user.hasSummoned) {
    const summon = { name: 'ลูกน้อง', hp: 200, maxHp: 200, atk: 40, defBase: 15, tempDef: 0, def: 15, isEnemy: true, instanceId: `SUM-${Date.now()}`, skill: 'None', cooldown: 0, statusEffects: [], isSummon: true };
    const idx = allies.indexOf(user);
    allies.splice(idx, 0, summon);
    user.hasSummoned = true;
    ctx.log(`🧟 ${user.name} ซัมมอนลูกน้อง 1 ตัว (Passive MidBoss)`, 'enemy');
  }
}

function tryBigBossPassive(user, allies, ctx) {
  if (user.class === 'BigBoss' && !user.hasSummoned) {
    const summon = { name: 'ลูกน้องบอสใหญ่', hp: 300, maxHp: 300, atk: 60, defBase: 20, tempDef: 0, def: 20, isEnemy: true, instanceId: `SUM-${Date.now()}`, skill: 'None', cooldown: 0, statusEffects: [], isSummon: true };
    const idx = allies.indexOf(user);
    allies.splice(idx, 0, summon);
    user.hasSummoned = true;
    ctx.log(`🧟 ${user.name} ซัมมอนลูกน้อง 1 ตัว (Passive BigBoss)`, 'enemy');
  }
}

function tryUltraBossPassive(user, allies, ctx) {
  if (user.class === 'UltraBoss' && !user.hasSummoned) {
    const summon = { name: 'MiniBoss ลูกน้อง', hp: 500, maxHp: 500, atk: 80, defBase: 30, tempDef: 0, def: 30, isEnemy: true, instanceId: `SUM-${Date.now()}`, skill: 'Stun L1', cooldown: 0, statusEffects: [], isSummon: true, class: 'MiniBoss' };
    const idx = allies.indexOf(user);
    allies.splice(idx, 0, summon);
    user.hasSummoned = true;
    ctx.log(`👑 ${user.name} ซัมมอน MiniBoss ลูกน้องออกมา!`, 'enemy');
  }
}

function tryPhantomBossPassive(user, ctx) {
  if (user.class === 'PhantomBoss' && !user.shadowShieldUsed) {
    if (user.hp / user.maxHp < 0.3) {
      const shield = Math.floor(user.maxHp * 0.1);
      addStatusEffect(user, { type: 'Shield', turns: 999, value: shield }, ctx);
      user.shadowShieldUsed = true;
      ctx.log(`🛡️ ${user.name} เปิดใช้ Shadow Shield (+${shield} Shield ครั้งเดียว)`, 'enemy');
    }
  }
}

async function tryFoxBossPassive(user, playerTeam, ctx) {
  if (user.class !== 'FoxBoss' || user.hp <= 0) return;
  const hpPercent = user.hp / user.maxHp;
  if (Math.random() < 0.4) {
    const players = playerTeam.filter(p => p.hp > 0);
    if (players.length > 1) {
      if (hpPercent < 0.3) {
        ctx.log(`🦊 ${user.name} ปล่อยพลังสะกด! ผู้เล่นทั้งทีมสับสนและหันมาตีกันเอง!`, 'enemy');
        for (const attacker of players) {
          let target = players[Math.floor(Math.random() * players.length)];
          while (target === attacker) target = players[Math.floor(Math.random() * players.length)];
          // 🔧 FIX: เดิมคำนวณ attacker.atk - target.def ตรงๆ ข้าม getFinalAtk/getFinalDef
          let dmg = Math.max(1, getFinalAtk(attacker) - getFinalDef(target));
          dmg = Math.floor(dmg * 1.5);
          ctx.log(`💥 ${attacker.name} (สับสน) โจมตี ${target.name} -${dmg} HP`, 'player');
          await applyDamage(attacker, target, dmg, ctx, { noMove: true });
        }
      } else {
        const attacker = players[Math.floor(Math.random() * players.length)];
        let target = players[Math.floor(Math.random() * players.length)];
        while (target === attacker) target = players[Math.floor(Math.random() * players.length)];
        const dmg = Math.max(1, getFinalAtk(attacker) - getFinalDef(target));
        ctx.log(`🦊 ${user.name} ทำให้ ${attacker.name} สับสน! โจมตี ${target.name} -${dmg} HP`, 'enemy');
        await applyDamage(attacker, target, dmg, ctx, { noMove: true });
      }
    }
  }
}

async function tryBossPassives(user, allies, enemies, ctx) {
  if (!user.isEnemy) return;
  tryMiniBossPassive(user, allies, ctx);
  tryMidBossPassive(user, allies, ctx);
  tryBigBossPassive(user, allies, ctx);
  tryUltraBossPassive(user, allies, ctx);
  tryPhantomBossPassive(user, ctx);
  await tryFoxBossPassive(user, enemies /* enemies-of-enemy = playerTeam */, ctx);
}

// ---------------------------------------------------------------------------
// Shared round runner — one call = one full "เทิร์น" (round), matching the
// terminology the game already uses (all alive units act once, interleaved).
// ---------------------------------------------------------------------------
async function runRound(state, ctx) {
  const { playerTeam, enemyTeam, mode } = state;
  ctx.playerTeam = playerTeam;
  ctx.enemyTeam = enemyTeam;

  const pAlive = playerTeam.filter(p => p.hp > 0);
  const eAlive = enemyTeam.filter(e => e.hp > 0);
  const maxLen = Math.max(pAlive.length, eAlive.length);
  const turnOrder = [];
  for (let i = 0; i < maxLen; i++) {
    if (pAlive[i]) turnOrder.push(pAlive[i]);
    if (eAlive[i]) turnOrder.push(eAlive[i]);
  }

  for (const actor of turnOrder) {
    if (actor.hp <= 0) continue;
    const allies = actor.isEnemy ? enemyTeam : playerTeam;
    const enemies = actor.isEnemy ? playerTeam : enemyTeam;

    applyStatusEffects(actor, ctx);
    if (actor.skipTurn) {
      actor.skipTurn = false;
      continue;
    }
    if (!enemies.some(t => t.hp > 0)) break;

    if (actor.cooldown && actor.cooldown > 0) {
      if (isHealer(actor)) healerIdle(actor, ctx);
      else await normalAttack(actor, enemies, ctx);
    } else {
      const used = await useSkill(actor, allies, enemies, ctx);
      if (used) {
        const counters = (actor.isEnemy ? playerTeam : enemyTeam).filter(ally => ally.hp > 0 && ally.class === 'Counter');
        for (const counter of counters) {
          if (Math.random() < 0.3) {
            const counterDmg = Math.floor(getFinalAtk(counter) * 1.3);
            ctx.log(`🔄 ${counter.name} (Counter) โจมตีสวนกลับใส่ ${actor.name}!`, counter.isEnemy ? 'enemy' : 'player');
            await applyDamage(counter, actor, counterDmg, ctx);
          }
        }
      } else if (isHealer(actor)) {
        healerIdle(actor, ctx);
      } else {
        await normalAttack(actor, enemies, ctx);
      }
    }

    // บอสมี passive พิเศษเพิ่มเติม (ทำงานเฉพาะโหมด boss)
    if (mode === 'boss') {
      await tryBossPassives(actor, allies, enemies, ctx);
    }

    if (!playerTeam.some(p => p.hp > 0)) return { finished: true, win: false };
    if (!enemyTeam.some(e => e.hp > 0)) return { finished: true, win: true };
  }

  endRoundAll([...playerTeam, ...enemyTeam], ctx);
  return { finished: false };
}

module.exports = {
  DEBUFF_TYPES,
  getFinalAtk,
  getFinalDef,
  findFirstAlive,
  isHealer,
  chooseTarget,
  addStatusEffect,
  applyStatusEffects,
  endRoundAll,
  applyHeal,
  applyDamage,
  normalAttack,
  healerIdle,
  useSkill,
  runRound,
  getSkillHandlers,
};
