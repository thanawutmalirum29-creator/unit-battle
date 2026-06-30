async function useSkill(user, allies, enemies) {
  user.lastSkill = user.skill;

  // ❌ ถ้าติด Silence แบบเก่า → โจมตีปกติ
  if (user.silenced) {
    log(`❌ ${user.name} ถูก Silence ใช้สกิลไม่ได้`, user.isEnemy ? "enemy" : "player");
    user.silenced = false;
    return normalAttack(user, enemies);
  }

  // 🎲 base chance 40%
  let skillChance = 0.4;

  // 🎯 Mage ได้พิเศษ 58%
  if (user.class === "Mage") {
    skillChance = 0.60;
  }

  // 🎯 MidBoss ได้พิเศษ 70%
  if (user.class === "MidBoss") {
    skillChance = 0.6;
  }
  // 🎯 BigBoss ได้พิเศษ 80%
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

  // ❌ ถ้าสุ่มไม่ติด → Healer idle, คนอื่นโจมตี
  if (Math.random() > skillChance) {
    if (isHealer(user)) {
      return healerIdle(user);   // ยืนเฉย ๆ
    } else {
      return normalAttack(user, enemies);
    }
  }

  // ✅ รวม skillHandlers
  const skillHandlers = {
  ...window.skillHandlers_partDMG,
  ...window.skillHandlers_partHP,
  ...window.skillHandlers_partEF1,
  ...window.skillHandlers_partSummon,
  };

  const handler = skillHandlers[user.skill];
  if (handler) {
    const result = await handler(user, allies, enemies);

    // 🕒 ตั้งคูลดาวน์ → MidBoss ไวกว่า
    user.cooldown = (user.class === "MidBoss") ? 2
               : (user.class === "BigBoss") ? 2
               : 4;

    return result;
  } else {
    log(`⚠️ ไม่พบสกิล: ${user.skill}`);
    return normalAttack(user, enemies);
  }
}


// ✅ ฟังก์ชันอ่านสถานะก่อนเทิร์น
function applyStatusEffects(actor) {
  if (!actor.statusEffects) return;

  actor.silenced = false;
  actor.skipTurn = false;

  for (let eff of actor.statusEffects) {
    switch (eff.type) {
      case "Poison":
        if (actor.hp > 0) {
          actor.hp -= eff.damage;
          log(`☠️ ${actor.name} โดนพิษ -${eff.damage} HP`,
              actor.isEnemy ? "enemy" : "player");
          eff.damage = Math.max(1, Math.floor(eff.damage * 0.7));
        }
        break;

      case "Burn":
        if (actor.hp > 0) {
          actor.hp -= eff.damage;
          log(`🔥 ${actor.name} ถูกเผาไหม้ -${eff.damage} HP`,
              actor.isEnemy ? "enemy" : "player");
        }
        break;

      case "Silence":
        log(`🔇 ${actor.name} ถูกปิดปาก ใช้สกิลไม่ได้`,
            actor.isEnemy ? "enemy" : "player");
        actor.silenced = true;
        break;

      case "Stun":
        log(`💫 ${actor.name} ถูกสตัน ขยับไม่ได้`,
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

// ✅ ฟังก์ชันเพิ่มสถานะ
function addStatusEffect(target, newEff) {
  if (!target.statusEffects) target.statusEffects = [];

  const existing = target.statusEffects.find(e => e.type === newEff.type);
  if (existing) {
    existing.turns = newEff.turns;
    existing.justApplied = true;
    if (newEff.value !== undefined) existing.value = newEff.value;
    if (newEff.damage !== undefined) existing.damage = newEff.damage;
  } else {
    newEff.justApplied = true;
    target.statusEffects.push(newEff);
  }
  renderBattlefield();
}

// ✅ ฟังก์ชันลดเวลาและเคลียร์สถานะ
function endTurnStatusDecay() {
  for (let actor of allActors) {
    if (!actor.statusEffects) continue;
    actor.statusEffects = actor.statusEffects.filter(eff => {
      // เทิร์นต่อไปให้มีผลเต็มที่
      eff.justApplied = false;
      eff.turns--;
      if (eff.turns <= 0) {
        log(`⏳ Debuff ${eff.type} หมดเวลาแล้ว`,
            actor.isEnemy ? "enemy" : "player");
        return false;
      }
      return true;
    });
  }
}
function chooseTarget(user, enemies) {
  const alive = enemies.filter(e => e.hp > 0);
  if (alive.length === 0) return null;

  switch (user.class) {
    case "Assassin":
      // เลือกศัตรูที่ maxHp น้อยที่สุด
      return alive.reduce((low, e) => e.maxHp < low.maxHp ? e : low);
    
    case "Mage":
      // เลือกศัตรูที่ def ต่ำที่สุด
      return alive.reduce((high, e) => e.def < high.def ? e : high);
    default:
      // ไม่มีอาชีพ → ตีตัวแรกสุดเหมือนเดิม
      return alive[0];
  }
}
