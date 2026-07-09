async function normalAttack(user, enemies) {
  const target = chooseTarget(user, enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);
  let rawDmg = Math.max(1, Math.floor(atkFinal - defFinal));

  //  Berserk (อาชีพ/บอส/เงื่อนไขพิเศษ)
  if (user.berserk || user.class === "BigBoss" || user.class === "GigaBoss" || user.class === "Berserker") {
    if (!user.isBerserked && user.hp <= user.maxHp * 0.4) {
      user.isBerserked = true;
      log(`<span class=gicon-anger></span> ${user.name} เข้าสู่ Berserk Mode!`, user.isEnemy ? "enemy" : "player");
    }

    if (user.isBerserked) {
      const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
      showActionLabel(userEl, "<span class=gicon-anger></span> Berserk!", "fx-strike");

      // เลือกเป้าหมาย 2 ตัว
      const alive = enemies.filter(e => e.hp > 0);
      const chosen = [target];
      if (alive.length > 1) {
        const others = alive.filter(e => e !== target);
        chosen.push(others[Math.floor(Math.random() * others.length)]);
      }

      // โจมตีทั้ง 2 เป้าหมาย
      for (let t of chosen) {
        const berserkDmg = Math.floor(rawDmg * 1.5);
        log(`<span class=gicon-impact></span> ${user.name} (Berserk) โจมตีใส่ ${t.name} -${berserkDmg} HP`, user.isEnemy ? "enemy" : "player");
        await applyDamage(user, t, berserkDmg);
      }
      return true;
    }
  }

  //  โจมตีปกติ (อาชีพอื่น + Rogue ครั้งแรก)
  const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  announceNormalAttack(user);
  log(`<span class=gicon-muscle></span> ${user.name} โจมตี <span class=gicon-arrow-right></span> ${target.name} -${rawDmg} HP`, user.isEnemy ? "enemy" : "player");
  await applyDamage(user, target, rawDmg);

  //  Rogue โจมตีซ้ำ
  if (user.class === "Rogue" && Math.random() < 0.4) {
    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length > 0) {
      const extraTarget = alive[Math.floor(Math.random() * alive.length)];
      const extraAtkFinal = getFinalAtk(user);
      const extraDefFinal = getFinalDef(extraTarget);
      const extraRawDmg = Math.max(1, Math.floor(extraAtkFinal - extraDefFinal));

      log(`<span class=gicon-bolt></span> ${user.name} ได้โจมตีซ้ำใส่ ${extraTarget.name} -${extraRawDmg} HP`, user.isEnemy ? "enemy" : "player");
      await applyDamage(user, extraTarget, extraRawDmg);
    }
  }

  return true;
}


function healerIdle(user) {
  log(` ${user.name} ยืนรอ ไม่ได้ทำอะไร`, user.isEnemy ? "enemy" : "player");
  
  return true;
}
// isHealer ย้ายไปรวมไว้จุดเดียวที่ js/shared/battle-math.js แล้ว (เดิมก็อปมาไว้
// ที่นี่กับ server/battle/engine.js อีกชุด) โหลดเป็น global function ก่อนไฟล์นี้
// (ดู pages/*.html) เรียก isHealer(...) ตรงนี้ได้เหมือนเดิม


// ฟังก์ชันทำดาเมจแบบรวมศูนย์
async function applyDamage(attacker, target, dmg, logText, options = {}) {
  if (!target) return;
if (target.class === "PhantomBoss" && attacker && !attacker.isEnemy) {
  const hpPercent = target.hp / target.maxHp;
  if (!attacker.skill && Math.random() < 0.5) {
    log(`<span class=gicon-droplet></span> ${target.name} หลบการโจมตีของ ${attacker.name}!`, "enemy");
    return;
  }
  if (attacker.skill && hpPercent < 0.3 && Math.random() < 0.2) {
    log(`<span class=gicon-droplet></span> ${target.name} หลบสกิลของ ${attacker.name}!`, "enemy");
    return;
  }
}

  target.hp -= dmg;

  //  FIX: Mirror ("สวนกลับ % ATK") เดิมแค่ addStatusEffect(type:"Mirror") ไว้เฉยๆ
  // ไม่มีจุดไหนในเกมเช็คสถานะนี้เลย — ผู้เล่นเห็น log "เปิด Mirror" แต่ไม่มีอะไรเกิดขึ้นจริง
  // ใส่ผลจริงตรงนี้: ถ้าเป้าหมายที่โดนตี (และไม่ได้หลบ ดูเช็ค PhantomBoss ด้านบน) มี Mirror ค้างอยู่
  //  สะท้อนดาเมจกลับผู้โจมตี ใช้ครั้งเดียวแล้วหมด (consume) กันไม่ให้สะท้อนซ้ำได้ทุกครั้งที่โดนตี
  if (target.statusEffects && attacker && target !== attacker && dmg > 0) {
    const mirrorIdx = target.statusEffects.findIndex(e => e.type === "Mirror");
    if (mirrorIdx !== -1) {
      const mirror = target.statusEffects[mirrorIdx];
      target.statusEffects.splice(mirrorIdx, 1); // ใช้แล้วหมดไป (one-shot)

      const reflectDmg = Math.max(1, Math.floor(getFinalAtk(target) * (mirror.power || 1)));
      log(`<span class=gicon-mirror></span> ${target.name} สะท้อนดาเมจกลับ ${attacker.name} -${reflectDmg} HP`,
          target.isEnemy ? "enemy" : "player");

      // noMove: true กันไม่ให้เล่น animation เดินเข้าฟาดซ้อนกับแอนิเมชันหลักที่กำลังเล่นอยู่
      await applyDamage(target, attacker, reflectDmg, null, { noMove: true });
    }
  }

  //  เก็บสถิติดาเมจ ทำ/รับ ต่อหน่วย ไว้โชว์ในหน้าสรุปผลหลังจบการต่อสู้ (ดู hub-ui.js)
  if (window.HubUI && typeof HubUI.trackDamage === "function") {
    HubUI.trackDamage(attacker, target, dmg);
  }

  if (target.instanceId === "BOSS" && !target.isSummon) {
    addBossDamage(dmg);
  }

  //  Rebirth Trigger (คงไว้ตามเดิม)
  if (target.skill?.startsWith("Rebirth") && !target.usedRebirth) {
    let healPercent = 0;
    if (target.skill === "Rebirth L1") healPercent = 0.5;
    if (target.skill === "Rebirth L2") healPercent = 0.7;
    if (target.skill === "Rebirth L3") healPercent = 1.0;
    if (target.skill === "Rebirth Lord") healPercent = 2;

    if (target.hp <= 0 || target.hp / target.maxHp < 0.1) {
      target.usedRebirth = true;
      const oldHp = Math.max(0, target.hp);
      // healPercent can exceed 1.0 (Rebirth Lord = 200%) — this is an intentional overheal,
      // but target.hp must never be allowed past 2x maxHp or the HP bar math / damage formulas
      // downstream (anything assuming hp <= maxHp) can behave oddly.
      target.hp = Math.min(target.maxHp * 2, Math.floor(target.maxHp * healPercent));
      const healed = target.hp - oldHp;

      log(
        `<span class=gicon-sparkle></span> ${target.name} ใช้ ${target.skill}! ฟื้นคืนชีพด้วย ${target.hp} HP และปล่อยระเบิดพลัง!`,
        target.isEnemy ? "enemy" : "player"
      );

      // refresh the revived unit's own HP bar — the recursive applyDamage calls below
      // only update the splash targets' bars, not this one's.
      updateHpBar(target);

      const enemies = target.isEnemy ? playerTeam : enemyTeam;
      const aliveEnemies = enemies.filter(e => e.hp > 0);
      if (aliveEnemies.length > 0 && healed > 0) {
        const dmgPerEnemy = Math.max(1, Math.floor(healed / aliveEnemies.length));
        aliveEnemies.forEach(e => {
          applyDamage(
            target,
            e,
            dmgPerEnemy,
            `<span class=gicon-impact></span> พลัง Rebirth ระเบิดใส่ ${e.name} -${dmgPerEnemy} HP`,
            { noMove: true }
          );
        });
      }
      return;
    }
  }

  if (target.hp < 0) target.hp = 0;
  if (logText) {
    log(logText, attacker.isEnemy ? "enemy" : "player");
  }

  const attackerEl = document.querySelector(`[data-id="${attacker.instanceId}"]`);
  const targetEl   = document.querySelector(`[data-id="${target.instanceId}"]`);

  if (attackerEl && targetEl) {
    if (!options.noMove) {
      await playAttackAnimation(attackerEl, targetEl, attacker);
    }
    const base = getBattleSpeed();
    const hitDuration = Math.max(120, base * 0.05);

    showFloatingNumber(targetEl, dmg, "damage");

    targetEl.style.animationDuration = hitDuration + "ms";
    targetEl.classList.add("hit", "damaged");

    setTimeout(() => {
      targetEl.classList.remove("hit", "damaged");
      targetEl.style.removeProperty("animation-duration");
    }, hitDuration);
  }

  //  BigBoss Heal เมื่อถูกสกิลโจมตี
  if (target.class === "BigBoss" && attacker && !attacker.isEnemy && attacker.skill) {
    if (Math.random() < 0.3) {  // 30% chance
      const heal = Math.floor(target.maxHp * 0.05);
      target.hp = Math.min(target.maxHp, target.hp + heal);
log(`<span class=gicon-heart></span> ${target.name} ฮีลตัวเอง +${heal} HP (BigBoss Reactive Heal)`, "enemy");
updateHpBar(target);   // <span class=gicon-dot-green></span> อัปเดตทันที
    }
  }
  //  UltraBoss: โอกาสตายทันทีถ้าถูกผู้เล่นใช้สกิล
if (target.class === "UltraBoss" && attacker && !attacker.isEnemy && attacker.skill && !target.ultraDeathTriggered) {
  if (Math.random() < 0.1) { // 10% chance
    target.hp = 0;
    target.ultraDeathTriggered = true;
    log(`<span class=gicon-skull></span> ${target.name} โดนสกิลเด็ดขาด! ตายทันที!`, "enemy");
    updateHpBar(target);
    handleDeath(target, attacker);
    return;
  }
}
  //  อัปเดต HP bar เสมอ
  updateHpBar(target);

  //  เช็กการตายเสมอ
  if (target.hp <= 0) {
    handleDeath(target, attacker);
  }
}