function getFinalHp(actor) {
  const base = actor.baseHp ?? actor.hp ?? 0;

  // Buff HP
  const flatBuff = (actor.statusEffects || [])
    .filter(e => e.type === "HpBuffFlat")
    .reduce((sum, e) => sum + e.value, 0);

  const percentBuff = (actor.statusEffects || [])
    .filter(e => e.type === "HpBuffPercent")
    .reduce((sum, e) => sum + e.value, 0);

  return Math.floor((base + flatBuff) * (1 + percentBuff));
}

// ✅ getFinalAtk ใหม่ (ไม่รวมอุปกรณ์ซ้ำ)
function getFinalAtk(actor) {
  const base = actor.baseAtk ?? actor.atk ?? 0;

  const flatBuff = (actor.statusEffects || [])
    .filter(e => e.type === "AttackBuffFlat")
    .reduce((sum, e) => sum + e.value, 0);

  const percentBuff = (actor.statusEffects || [])
    .filter(e => e.type === "AttackBuffPercent")
    .reduce((sum, e) => sum + e.value, 0);

  return Math.floor((base + flatBuff) * (1 + percentBuff));
}

// ✅ getFinalDef ใหม่ (ไม่รวมอุปกรณ์ซ้ำ)
function getFinalDef(actor) {
  const base = actor.baseDef ?? actor.defBase ?? actor.def ?? 0;

  const defBuffs = (actor.statusEffects || [])
    .filter(e => e.type === "DefenseBuff")
    .map(e => e.value);
  const bestBuff = defBuffs.length > 0 ? Math.max(...defBuffs) : 0;

  const defDebuffs = (actor.statusEffects || [])
    .filter(e => e.type === "DefenseDown")
    .map(e => e.value);
  const worstDebuff = defDebuffs.length > 0 ? Math.max(...defDebuffs) : 0;

  const finalDef = base + bestBuff + (actor.tempDef || 0) - worstDebuff;
  return Math.max(0, finalDef);
}

// ✅ Final Skill Boost (เพิ่มโอกาสใช้สกิล/ลดคูลดาวน์)
function getFinalSkillBoost(actor) {
  const boosts = (actor.statusEffects || [])
    .filter(e => e.type === "SkillBoost")
    .map(e => e.value);

  return boosts.length > 0 ? Math.max(...boosts) : 0;
}

// ✅ Final Speed (ใช้ถ้ามีระบบความเร็ว)
function getFinalSpeed(actor) {
  let base = actor.spd || 0;

  const speedBuffs = (actor.statusEffects || [])
    .filter(e => e.type === "SpeedBuff")
    .map(e => e.value);

  const bestBuff = speedBuffs.length > 0 ? Math.max(...speedBuffs) : 0;

  return base + bestBuff;
}

// 💖 การฮีล
async function doHeal(user, allies, multiplier, level) {
  const candidates = allies.filter(a => a.hp > 0 && a.hp < a.maxHp);
  if (candidates.length === 0) {
    log(`❌ ${user.name} ไม่มีใครให้ฮีล`, user.isEnemy ? "enemy" : "player");
    return healerIdle(user);
  }

  // เลือกตัวที่เลือดเหลือน้อยสุด (เป็น %)
  candidates.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
  const ally = candidates[0];

  // คำนวณ Heal
  const atkFinal = getFinalAtk(user); // ✅ ดึงจากระบบกลาง
  const healAmount = Math.floor(atkFinal * multiplier);

  ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);

  // Log
  log(
    `💚 ${user.name} (Heal L${level}) → ฟื้น ${ally.name} +${healAmount} HP`,
    user.isEnemy ? "enemy" : "player"
  );

  applyHeal(user, ally, healAmount);

  user.cooldown = 2;
  return true;
}
async function doAOEHeal(user, allies, multiplier, level) {
  const targets = allies.filter(a => a.hp > 0 && a.hp < a.maxHp);

  if (targets.length === 0) {
    log(`❌ ${user.name} ไม่มีใครให้ฮีล`, user.isEnemy ? "enemy" : "player");
    return healerIdle(user);
  }

  const atkFinal = getFinalAtk(user); // ✅ ดึงจากระบบกลาง (รวม buff/debuff)

  for (let a of targets) {
    const healAmount = Math.floor(atkFinal * multiplier);
    a.hp = Math.min(a.maxHp, a.hp + healAmount);

    // log
    log(
      `💖 ${user.name} (AOE Heal L${level}) → ฟื้น ${a.name} +${healAmount} HP`,
      user.isEnemy ? "enemy" : "player"
    );

    applyHeal(user, a, healAmount);
  }

  user.cooldown = 2;
  return true;
}
async function doCharm(user, enemies, multiplier, level) {
  const target = findFirstAlive(enemies); // คนที่ถูก Charm
  if (!target) return false;

  const allyTarget = findFirstAlive(enemies.filter(e => e !== target)); // เพื่อนที่โดนโจมตี
  if (!allyTarget) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(allyTarget);

  const dmg = Math.max(2, Math.floor(atkFinal * multiplier) - defFinal);

  // 📝 log
  log(
    `💘 ${user.name} (Charm L${level}) → ${target.name} หลงเสน่ห์โจมตี ${allyTarget.name} -${dmg} HP`,
    user.isEnemy ? "enemy" : "player"
  );

  // ใช้ target โจมตี allyTarget
  await applyDamage(target, allyTarget, dmg);

  // เอฟเฟกต์ charmed
  const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
  if (targetEl) {
    targetEl.classList.add("charmed");
    setTimeout(() => targetEl.classList.remove("charmed"), 1200);
  }

  user.cooldown = 6;
  return true;
}
async function doRevive(user, allies, percent, level) {
  const deadAlly = allies.find(a => a.hp <= 0);
  if (!deadAlly) {
    log(`❌ ${user.name} ไม่มีใครให้ชุบชีวิต`, user.isEnemy ? "enemy" : "player");
    user.cooldown = 3;
    return true;
  }

  // คืน HP ตามเปอร์เซ็นต์
  deadAlly.hp = Math.floor(deadAlly.maxHp * percent);

  // log
  log(
    `✨ ${user.name} (Revive L${level}) → ชุบชีวิต ${deadAlly.name} ฟื้น ${deadAlly.hp} HP`,
    user.isEnemy ? "enemy" : "player"
  );

  // เอฟเฟกต์ revive
  const targetEl = document.querySelector(`[data-id="${deadAlly.instanceId}"]`);
  if (targetEl) {
    targetEl.classList.add("revive");
    setTimeout(() => targetEl.classList.remove("revive"), 1200);
  }

  // เอฟเฟกต์ caster
  const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (casterEl) {
    casterEl.classList.add("heal");
    setTimeout(() => casterEl.classList.remove("heal"), 800);
  }

  updateHpBar(deadAlly);

  user.cooldown = 6;
  return true;
}
async function doBloodTribute(user, allies, enemies, multiplier, level) {
  const livingEnemies = enemies.filter(e => e.hp > 0);
  if (livingEnemies.length === 0) return false;

  let totalDrain = 0;

  for (let e of livingEnemies) {
    const atkFinal = getFinalAtk(user);
    const dmg = Math.max(1, Math.floor(atkFinal * multiplier));

    log(`🩸 ${user.name} (Blood Tribute L${level}) → ดูดเลือด ${e.name} -${dmg} HP`,
        user.isEnemy ? "enemy" : "player");

    await applyDamage(user, e, dmg);
    totalDrain += dmg;
  }

  // ✅ ฟื้นฟูให้เพื่อนที่เลือดน้อยที่สุด
  const targetAlly = allies.filter(a => a.hp > 0).sort((a, b) => a.hp - b.hp)[0];
  if (targetAlly) {
    const heal = Math.min(totalDrain, targetAlly.maxHp - targetAlly.hp);
    if (heal > 0) {
      targetAlly.hp += heal;

      log(`💖 ${user.name} ฟื้นฟู ${targetAlly.name} +${heal} HP จากการดูดเลือด`,
          user.isEnemy ? "enemy" : "player");

      applyHeal(user, targetAlly, heal);

      const allyEl = document.querySelector(`[data-id="${targetAlly.instanceId}"]`);
      if (allyEl) {
        allyEl.classList.add("healed");
        setTimeout(() => allyEl.classList.remove("healed"), 1000);
      }
    }
  }

  user.cooldown = 5;
  return true;
}
async function doLifesteal(user, allies, enemies, healRate, level) {
  const target = findFirstAlive(enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);

  const dmg = Math.max(1, Math.floor(atkFinal - defFinal));
  const heal = Math.floor(dmg * healRate);

  // 📌 ฟื้นฟูเลือดตัวเอง
  if (heal > 0) {
    user.hp = Math.min(user.maxHp, user.hp + heal);
    applyHeal(user, user, heal);
  }

  // 📝 log
  log(
    `🩸 ${user.name} (Lifesteal L${level}) → โจมตี ${target.name} -${dmg} HP และฟื้น +${heal} HP`,
    user.isEnemy ? "enemy" : "player"
  );

  await applyDamage(user, target, dmg);

  // เอฟเฟกต์ฟื้นเลือด
  const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (userEl) {
    userEl.classList.add("lifesteal-heal");
    setTimeout(() => userEl.classList.remove("lifesteal-heal"), 1000);
  }

  user.cooldown = 3;
  return true;
}
async function doPowerStrike(user, enemies, multiplier, level) {
  const target = findFirstAlive(enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);

  const dmg = Math.max(1, Math.floor(atkFinal * multiplier) - defFinal);

  const attackerEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  const targetEl   = document.querySelector(`[data-id="${target.instanceId}"]`);

  if (attackerEl && targetEl) {
    await playPowerStrikeEffect(attackerEl, targetEl);
  }

  log(`💥 ${user.name} (Power Strike L${level}) → ${target.name} -${dmg} HP`, 
      user.isEnemy ? "enemy" : "player");

  await applyDamage(user, target, dmg);

  user.cooldown = 4;
  return true;
}
async function doAOEAttack(user, enemies, divisor, level) {
  let used = false;

  for (const e of enemies) {
    if (e.hp > 0) {
      used = true;

      const atkFinal = getFinalAtk(user);
      const defFinal = getFinalDef(e);

      const rawDmg = atkFinal - defFinal;
      const dmg = Math.max(1, Math.floor(rawDmg / divisor));

      // 📝 log
      log(`🔥 ${user.name} (AOE Attack L${level}) → ${e.name} -${dmg} HP`, 
          user.isEnemy ? "enemy" : "player");

      await applyDamage(user, e, dmg);

      const targetEl = document.querySelector(`[data-id="${e.instanceId}"]`);
      if (targetEl) {
        targetEl.classList.add("aoe-hit");
        setTimeout(() => targetEl.classList.remove("aoe-hit"), 600);
      }
    }
  }

  if (used) {
    const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
    if (casterEl) {
      casterEl.classList.add("aoe-cast");
      setTimeout(() => casterEl.classList.remove("aoe-cast"), 600);
    }
    user.cooldown = 4;
  }

  return used;
}
async function doBombSkill(user, enemies, atkMultiplier, defDivisor, effectId, level) {
  const targets = enemies.filter(e => e.hp > 0);
  if (targets.length === 0) return false;

  const atkFinal = getFinalAtk(user);
  const baseDmg = Math.floor(atkFinal * atkMultiplier);

  log(`💣 ${user.name} ใช้ Bomb L${level}!`, user.isEnemy ? "enemy" : "player");

  for (let e of targets) {
    const defFinal = getFinalDef(e);
    const finalDmg = Math.max(1, Math.floor(baseDmg - (defFinal / defDivisor)));

    log(`💣💥 Bomb → ${e.name} -${finalDmg} HP`, user.isEnemy ? "enemy" : "player");
    await applyDamage(user, e, finalDmg, { noMove: true });
  }

  await playBombEffect(targets, effectId);
  user.cooldown = 4;
  return true;
}
async function doCriticalSkill(user, enemies, multiplier, level) {
  const candidates = enemies.filter(e => e.hp > 0);
  if (candidates.length === 0) return false;

  // เลือกเป้าหมาย Max HP น้อยสุด
  candidates.sort((a, b) => a.maxHp - b.maxHp);
  const target = candidates[0];

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);

  const dmg = Math.max(1, Math.floor(atkFinal * multiplier) - defFinal);

  log(
    `💥 ${user.name} (Critical L${level} - CRIT!) → ${target.name} -${dmg} HP`,
    user.isEnemy ? "enemy" : "player"
  );
  await applyDamage(user, target, dmg);

  // เอฟเฟกต์คริ
  const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
  if (targetEl) {
    targetEl.classList.add("critical-hit");
    setTimeout(() => targetEl.classList.remove("critical-hit"), 600);
  }

  user.cooldown = 2;
  return true;
}
async function doDoubleStrike(user, enemies, multiplier1, multiplier2, level) {
  const target = findFirstAlive(enemies);
  if (!target) return false;

  // 🗡️ โจมตีครั้งที่ 1
  const atk1 = getFinalAtk(user);
  const def1 = getFinalDef(target);
  const dmg1 = Math.max(1, Math.floor(atk1 * multiplier1) - def1);

  log(`🗡️ ${user.name} (Double L${level} - Hit 1) → ${target.name} -${dmg1} HP`, user.isEnemy ? "enemy" : "player");
  await applyDamage(user, target, dmg1);

  const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
  if (targetEl) {
    targetEl.classList.add("double-strike-hit");
    setTimeout(() => targetEl.classList.remove("double-strike-hit"), 300);
  }

  // 🗡️ โจมตีครั้งที่ 2 (ดีเลย์ 200ms)
  if (target.hp > 0) {
    setTimeout(async () => {
      const atk2 = getFinalAtk(user);
      const def2 = getFinalDef(target);
      const dmg2 = Math.max(1, Math.floor(atk2 * multiplier2) - def2);

      log(`🗡️ ${user.name} (Double L${level} - Hit 2) → ${target.name} -${dmg2} HP`, user.isEnemy ? "enemy" : "player");
      await applyDamage(user, target, dmg2);

      if (targetEl) {
        targetEl.classList.add("double-strike-hit");
        setTimeout(() => targetEl.classList.remove("double-strike-hit"), 300);
      }
    }, 200);
  }

  user.cooldown = 3;
  return true;
}
async function doPiercingShot(user, enemies, atkMultiplier, defDivider, level) {
  const target = findFirstAlive(enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);

  const dmg = Math.max(
    1,
    Math.floor(atkFinal * atkMultiplier) - Math.floor(defFinal / defDivider)
  );

  log(`🎯 ${user.name} (Piercing Shot L${level}) → ${target.name} -${dmg} HP`,
      user.isEnemy ? "enemy" : "player");
  await applyDamage(user, target, dmg);

  // เอฟเฟกต์การร่าย
  const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (casterEl) {
    casterEl.classList.add("pierce-cast");
    setTimeout(() => casterEl.classList.remove("pierce-cast"), 400);
  }

  // เอฟเฟกต์โดนโจมตี
  const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
  if (targetEl) {
    targetEl.classList.add("pierce-hit");
    setTimeout(() => targetEl.classList.remove("pierce-hit"), 400);
  }

  user.cooldown = 3;
  return true;
}
async function doTripleHit(user, allies, enemies, atkMultiplier, level) {
  let target = findFirstAlive(enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);

  let baseDmg = Math.max(1, Math.floor(atkFinal * atkMultiplier) - defFinal);

  const hits = [1, 2, 3];
  hits.forEach((i, idx) => {
    setTimeout(async () => {
      if (target && target.hp > 0) {
        // 🔥 ตีเป้าหมายหลัก
        const dmg = Math.max(1, Math.floor(baseDmg / Math.pow(2, i - 1)));
        log(`💢 ${user.name} (Triple Hit L${level} - Hit ${i}) → ${target.name} -${dmg} HP`,
            user.isEnemy ? "enemy" : "player");
        await applyDamage(user, target, dmg);
      } else {
        // ถ้าเป้าตาย → หาเป้าหมายใหม่
        const otherTargets = enemies.filter(e => e.hp > 0);
        if (otherTargets.length === 0) return;

        const newTarget = otherTargets[Math.floor(Math.random() * otherTargets.length)];
        const dmg = Math.max(1, Math.floor((baseDmg / Math.pow(2, i - 1)) * 0.4));
        log(`💥 ${user.name} (Triple Hit L${level} - Bounce ${i}) → ${newTarget.name} -${dmg} HP`,
            user.isEnemy ? "enemy" : "player");
        await applyDamage(user, newTarget, dmg);
        target = newTarget;
      }

      // เอฟเฟกต์ตี
      const targetEl = document.querySelector(`[data-id="${target?.instanceId}"]`);
      if (targetEl) {
        targetEl.classList.add("triple-hit");
        setTimeout(() => targetEl.classList.remove("triple-hit"), 300);
      }
    }, idx * 200);
  });

  user.cooldown = 3;
  return true;
}
async function doDebuff(user, allies, enemies, { type, multiplier, turns, level }) {
  const target = findFirstAlive(enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);

  addStatusEffect(target, {
    type,
    turns,
    damage: Math.floor(atkFinal * multiplier)
  });

  log(
    `${type === "Burn" ? "🔥" : type === "Poison" ? "☠️" : type === "Bleed" ? "🩸" : "❄️"} ` +
    `${user.name} (${type} L${level}) → ${target.name} ติด${type} ${turns} เทิร์น`,
    user.isEnemy ? "enemy" : "player"
  );

  const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
  if (targetEl) {
    targetEl.classList.add(type.toLowerCase());
    setTimeout(() => targetEl.classList.remove(type.toLowerCase()), 1200);
  }

  user.cooldown = (type === "Burn" ? 3 : 4); // 🔥 Burn CD 3, พิษ 4
  return true;
}
function updateShieldUI(actor) {
  const el = document.querySelector(`[data-id="${actor.instanceId}"]`);
  if (!el) return;

  // ตรวจสอบว่ามีบัพ DefenseBuff อยู่หรือไม่
  const hasBuff = (actor.statusEffects || []).some(e => e.type === "DefenseBuff");
  
  if (hasBuff) {
    el.classList.add("shield", "shield-active"); // คงโล่ไว้
  } else {
    el.classList.remove("shield", "shield-active");
  }
}
async function doDefenseBuff(user, allies, { divisor, turns = 2, aoe = false, level }) {
  const buffVal = Math.floor(user.defBase / divisor);

  // ถ้าเป็น AOE → ให้ทุกคน
  // ถ้าไม่ใช่ AOE → ให้แค่ตัวแรกที่ยังมี HP
  const targets = aoe ? allies : allies.find(a => a.hp > 0) ? [allies.find(a => a.hp > 0)] : [];

  targets.forEach(a => {
    addStatusEffect(a, { type: "DefenseBuff", turns, value: buffVal });

    // เล่น animation แวบเดียว
    const el = document.querySelector(`[data-id="${a.instanceId}"]`);
    if (el) {
      el.classList.add("shield");          
      setTimeout(() => el.classList.remove("shield"), 500); 
    }

    // คงโล่ไว้ตลอดบัพ
    updateShieldUI(a);
  });

  log(
    `🛡️ ${user.name} (${aoe ? "AOE " : ""}Defense Buff L${level}) → DEF +${buffVal} ${aoe ? "ให้ทีม " : ""}(${turns} เทิร์น)`,
    user.isEnemy ? "enemy" : "player"
  );

  user.cooldown = 6;
  return true;
}
async function doEnergyBoost(user, allies, {
  reduce = 1,
  healRatio = 0,
  logText = "",
  selfCd = 4
}) {
  allies.forEach(a => {
    if (a.hp > 0) {
      // ลดคูลดาวน์
      if (reduce === 1) {
        if (a.cooldown > 0) a.cooldown -= 1;
      } else if (reduce === 2) {
        if (a.cooldown > 1) a.cooldown -= 2;
        else if (a.cooldown > 0) a.cooldown = 0;
      }

      // ฮีลถ้ามีค่า healRatio
      if (healRatio > 0) {
        const heal = Math.floor(user.atk * healRatio);
        a.hp = Math.min(a.maxHp, a.hp + heal);
        applyHeal(user, a, heal);
      }

      // เอฟเฟกต์แสดงพลังงาน
      const targetEl = document.querySelector(`[data-id="${a.instanceId}"]`);
      if (targetEl) {
        targetEl.classList.add("energy");
        setTimeout(() => targetEl.classList.remove("energy"), 600);
      }
    }
  });

  // log
  log(`⚡ ${user.name} ${logText}`, user.isEnemy ? "enemy" : "player");

  // แสดง caster animation
  const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (casterEl) {
    casterEl.classList.add("energy");
    setTimeout(() => casterEl.classList.remove("energy"), 600);
  }

  user.cooldown = selfCd;
  return true;
}
async function doSilence(user, targets, {
  chance = 0.3,
  turns = 2,
  logText = "",
  selfCd = 5
}) {
  targets.forEach(e => {
    if (e.hp > 0) {
      addStatusEffect(e, { type: "SkillBlockChance", chance, turns });

      const targetEl = document.querySelector(`[data-id="${e.instanceId}"]`);
      if (targetEl) {
        targetEl.classList.add("silence");
        setTimeout(() => targetEl.classList.remove("silence"), 1000);
      }
    }
  });

  log(`🔇 ${user.name} ${logText}`, user.isEnemy ? "enemy" : "player");

  user.cooldown = selfCd;
  return true;
}
async function doSkillBoost(user, allies, {
  value = 0.3,
  turns = 3,
  logText = "",
  selfCd = 5
}) {
  allies.forEach(a => {
    if (a.hp > 0) {
      addStatusEffect(a, { type: "SkillBoost", turns, value });

      log(`✨ ${a.name} ${logText}`, user.isEnemy ? "enemy" : "player");

      const targetEl = document.querySelector(`[data-id="${a.instanceId}"]`);
      if (targetEl) {
        targetEl.classList.add("skillboost");
        setTimeout(() => targetEl.classList.remove("skillboost"), 800);
      }
    }
  });

  const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (casterEl) {
    casterEl.classList.add("skillboost");
    setTimeout(() => casterEl.classList.remove("skillboost"), 800);
  }

  user.cooldown = selfCd;
  return true;
}
async function doCleanse(user, allies, {
  healRatio = 0,      // อัตราฟื้นจาก ATK
  resistTurns = 0,    // กันดีบัฟกี่เทิร์น
  logText = "",
  selfCd = 5
}) {
  const atkFinal = getFinalAtk(user);

  allies.forEach(a => {
    if (a.hp > 0 && a.statusEffects) {
      // 🔹 ล้างดีบัฟ
      a.statusEffects = a.statusEffects.filter(e =>
        !["Poison", "Burn", "Silence", "TimeStop"].includes(e.type)
      );

      // 🔹 ฟื้นถ้ามี
      if (healRatio > 0) {
        const heal = Math.floor(atkFinal * healRatio);
        a.hp = Math.min(a.maxHp, a.hp + heal);
        applyHeal(user, a, heal);
      }

      // 🔹 กันดีบัฟ
      if (resistTurns > 0) {
        addStatusEffect(a, { type: "DebuffResist", turns: resistTurns });
      }

      // เอฟเฟกต์แสดงผล
      const targetEl = document.querySelector(`[data-id="${a.instanceId}"]`);
      if (targetEl) {
        targetEl.classList.add("cleanse");
        setTimeout(() => targetEl.classList.remove("cleanse"), 800);
      }
    }
  });

  // 🔹 Log
  log(
    `💧 ${user.name} ${logText}`,
    user.isEnemy ? "enemy" : "player"
  );

  // 🔹 เอฟเฟกต์ผู้ร่าย
  const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (casterEl) {
    casterEl.classList.add("cleanse");
    setTimeout(() => casterEl.classList.remove("cleanse"), 800);
  }

  user.cooldown = selfCd;
  return true;
}
async function doTimeStop(user, targets, {
  turns = 1,
  logText = "",
  cd = 4
}) {
  if (!targets || targets.length === 0) return false;

  targets.forEach(target => {
    addStatusEffect(target, { type: "TimeStop", turns, damage: 0 });

    const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
    if (targetEl) {
      targetEl.classList.add("timestop");
      setTimeout(() => targetEl.classList.remove("timestop"), 1000);
    }
  });

  log(
    `⏳ ${user.name} ${logText}`,
    user.isEnemy ? "enemy" : "player"
  );

  user.cooldown = cd;
  return true;
}
async function doStun(user, targets, {
  turns = 1,
  dmgMultiplier = 1,
  logText = "",
  cd = 5
}) {
  if (!targets || targets.length === 0) return false;

  for (let target of targets) {
    // ใส่สถานะสตัน
    addStatusEffect(target, { type: "Stun", turns });

    // ดาเมจ (ลด/เพิ่มตาม dmgMultiplier)
    const atkFinal = getFinalAtk(user);
    const defFinal = getFinalDef(target);
    const dmg = Math.max(1, Math.floor(atkFinal / dmgMultiplier) - defFinal);

    log(
      `💫 ${user.name} ${logText} → ${target.name} -${dmg} HP (สตัน ${turns} เทิร์น)`,
      user.isEnemy ? "enemy" : "player"
    );

    await applyDamage(user, target, dmg);

    // effect UI
    const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
    if (targetEl) {
      targetEl.classList.add("stunned");
      setTimeout(() => targetEl.classList.remove("stunned"), 1200);
    }
  }

  user.cooldown = cd;
  return true;
}
