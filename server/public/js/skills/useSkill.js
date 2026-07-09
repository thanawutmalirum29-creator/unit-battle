async function useSkill(user, allies, enemies) {
  user.lastSkill = user.skill;

  //  ถ้าติด Silence แบบเก่า  โจมตีปกติ
  if (user.silenced) {
    log(`<span class=gicon-x></span> ${user.name} ถูก Silence ใช้สกิลไม่ได้`, user.isEnemy ? "enemy" : "player");
    user.silenced = false;
    return normalAttack(user, enemies);
  }

  //  base chance 40%
  let skillChance = 0.4;

  //  Mage ได้พิเศษ 60%
  if (user.class === "Mage") {
    skillChance = 0.60;
  }

  //  MidBoss ได้พิเศษ 60%
  if (user.class === "MidBoss") {
    skillChance = 0.6;
  }
  //  BigBoss ได้พิเศษ 80%
if (user.class === "BigBoss") {
  skillChance = 0.7;
}
if (user.class === "UltraBoss") {
  skillChance = 0.8;
}

  // รวม Buff/Debuff ที่เก็บใน statusEffects
  if (user.statusEffects && user.statusEffects.length > 0) {
    user.statusEffects.forEach(se => {
      if (se.type === "SkillBoost") {
        skillChance += se.value; // +0.2 = +20%
      }
      if (se.type === "SkillBlockChance") {
        skillChance -= se.chance; // -0.3 = -30%
      }
    });
  }

  // กันไม่ให้ต่ำกว่า 5% หรือเกิน 85%
  skillChance = Math.max(0.05, Math.min(0.85, skillChance));

  //  ถ้าสุ่มไม่ติด  Healer idle, คนอื่นโจมตี
  if (Math.random() > skillChance) {
    if (isHealer(user)) {
      return healerIdle(user);   // ยืนเฉย ๆ
    } else {
      return normalAttack(user, enemies);
    }
  }

  //  รวม skillHandlers
  const skillHandlers = {
  ...window.skillHandlers_partDMG,
  ...window.skillHandlers_partHP,
  ...window.skillHandlers_partEF1,
  ...window.skillHandlers_partSummon,
  };

  const handler = skillHandlers[user.skill];
  if (handler) {
    //  บอกชัดๆ ว่ากำลังใช้สกิลอะไร ก่อนเอฟเฟกต์เดิมจะเล่น
    announceSkill(user, user.skill);

    // Sentinel so we can tell whether the handler set its own (deliberately tuned)
    // cooldown, e.g. Revive=6, Defense Buff=6, Critical=2, Time Stop=3-7, Summon=6/8...
    // Without this, every skill's custom cooldown gets discarded below.
    user.cooldown = undefined;
    const result = await handler(user, allies, enemies);

    //  ตั้งคูลดาวน์เริ่มต้น  ใช้เฉพาะกรณี handler ไม่ได้กำหนดคูลดาวน์เอง (เช่น Berserk Mode)
    if (user.cooldown === undefined) {
      user.cooldown = (user.class === "MidBoss") ? 2
                 : (user.class === "BigBoss") ? 2
                 : 4;
    }

    return result;
  } else {
    log(`<span class=gicon-warning></span> ไม่พบสกิล: ${user.skill}`);
    return normalAttack(user, enemies);
  }
}


//  ฟังก์ชันอ่านสถานะก่อนเทิร์น
function applyStatusEffects(actor) {
  if (!actor.statusEffects) return;

  actor.silenced = false;
  actor.skipTurn = false;

  for (let eff of actor.statusEffects) {
    switch (eff.type) {
      case "Poison":
        if (actor.hp > 0) {
          actor.hp -= eff.damage;
          log(`<span class=gicon-skull></span> ${actor.name} โดนพิษ -${eff.damage} HP`,
              actor.isEnemy ? "enemy" : "player");
          eff.damage = Math.max(1, Math.floor(eff.damage * 0.7));
        }
        break;

      case "Burn":
        if (actor.hp > 0) {
          actor.hp -= eff.damage;
          log(`<span class=gicon-fire></span> ${actor.name} ถูกเผาไหม้ -${eff.damage} HP`,
              actor.isEnemy ? "enemy" : "player");
        }
        break;

      case "Silence":
        log(`<span class=gicon-mute></span> ${actor.name} ถูกปิดปาก ใช้สกิลไม่ได้`,
            actor.isEnemy ? "enemy" : "player");
        actor.silenced = true;
        break;

      case "Stun":
        log(`<span class=gicon-sparkle></span> ${actor.name} ถูกสตัน ขยับไม่ได้`,
            actor.isEnemy ? "enemy" : "player");
        actor.skipTurn = true;
        break;

      case "TimeStop":
        // ⏳ ให้มีผลเฉพาะเทิร์นถัดไป (ไม่ทำงานถ้าเพิ่งใส่)
        if (!eff.justApplied) {
          log(`⏳ ${actor.name} ถูกหยุดเวลา ไม่สามารถโจมตีได้`,
              actor.isEnemy ? "enemy" : "player");
          actor.skipTurn = true;
        }
        break;
    }
  }

  renderBattlefield();
}

//  FIX: รายชื่อสถานะที่ถือว่าเป็น "ดีบัฟ" — ใช้กันโดย DebuffResist (มาจาก Cleanse L3)
// เดิม Cleanse L3 ใส่สถานะ "DebuffResist" ให้แต่ไม่มีจุดไหนในเกมเช็คมันเลย (dead status)
// ผลคือ "กันดีบัฟ 1 เทิร์น" ที่บอกผู้เล่นไม่มีผลจริงอะไรเลย
const DEBUFF_TYPES = ["Poison", "Burn", "Silence", "SkillBlockChance", "Stun", "TimeStop", "DefenseDown"];

//  ฟังก์ชันเพิ่มสถานะ
function addStatusEffect(target, newEff) {
  if (!target.statusEffects) target.statusEffects = [];

  //  FIX: เช็ค DebuffResist ก่อนใส่ดีบัฟใหม่ (ของเดิมไม่เช็คอะไรเลย)
  if (DEBUFF_TYPES.includes(newEff.type)) {
    const hasResist = target.statusEffects.some(e => e.type === "DebuffResist");
    if (hasResist) {
      log(`<span class=gicon-shield></span> ${target.name} ต้านทาน ${newEff.type} ได้ (Debuff Resist)`,
          target.isEnemy ? "enemy" : "player");
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
  renderBattlefield();
}

//  หมายเหตุ: เดิมมีฟังก์ชัน endTurnStatusDecay() อยู่ตรงนี้ แต่ไม่มีที่ไหนในเกมเรียกใช้เลย
// (ทุกโหมดเรียก endRoundAll() ใน core/endroud.js แทน) ทำให้ eff.justApplied ไม่เคยถูกเคลียร์
// เป็น false เลยตลอดเกม — นี่คือสาเหตุที่สกิล Time Stop ทุกเลเวลไม่เคยข้ามเทิร์นเป้าหมายได้จริง
// (เช็ค `if (!eff.justApplied)` ใน applyStatusEffects() ด้านล่างไม่เคยผ่าน)
// ลบฟังก์ชันที่ตายแล้วนี้ทิ้ง แล้วย้าย logic เคลียร์ justApplied ไปไว้ใน endRoundAll() แทน
// (จุดเดียวที่ทุกโหมดเรียกจริง) — ดู core/endroud.js
// chooseTarget ย้ายไปรวมไว้จุดเดียวที่ js/shared/battle-math.js แล้ว (เดิมก็อป
// มาไว้ที่นี่กับ server/battle/engine.js อีกชุด) โหลดเป็น global function ก่อน
// ไฟล์นี้แล้ว (ดู pages/*.html) เรียก chooseTarget(...) ตรงนี้ได้เหมือนเดิม
