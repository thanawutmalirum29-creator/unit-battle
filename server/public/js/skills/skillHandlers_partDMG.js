window.skillHandlers_partDMG= {
    "None": async (user, allies, enemies) => {
    if (isHealer(user) || (user.lastSkill && isHealer({ skill: user.lastSkill }))) {
      return healerIdle(user);
    }
    return normalAttack(user, enemies);
  },
"Power Strike L1": (user, allies, enemies) => doPowerStrike(user, enemies, 1.3, 1),
"Power Strike L2": (user, allies, enemies) => doPowerStrike(user, enemies, 1.5, 2),
"Power Strike L3": (user, allies, enemies) => doPowerStrike(user, enemies, 1.8, 3),

"AOE Attack L1": (user, allies, enemies) => doAOEAttack(user, enemies, 2.0, 1),
"AOE Attack L2": (user, allies, enemies) => doAOEAttack(user, enemies, 1.5, 2),
"AOE Attack L3": (user, allies, enemies) => doAOEAttack(user, enemies, 1.2, 3),

"AOE Attack Boss": async (user, allies, enemies) => {
  let used = false;

  for (const e of enemies) {
    if (e.hp > 0) {
      used = true;

      const atkFinal = getFinalAtk(user);
      const defFinal = getFinalDef(e);

      const rawDmg = atkFinal - defFinal;
      const dmg = Math.max(1, Math.floor(rawDmg *1.2));

      // 📝 log ดาเมจก่อน
      log(`🔥 ${user.name} (AOE Attack) → ${e.name} -${dmg} HP`, user.isEnemy ? "enemy" : "player");

      // 📌 applyDamage แค่บันทึกผล
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
},

"Bomb L1": (user, allies, enemies) => doBombSkill(user, enemies, 0.8, 1.2, "bomb-hit-l1", 1),
"Bomb L2": (user, allies, enemies) => doBombSkill(user, enemies, 1.2, 1.3, "bomb-hit-l2", 2),
"Bomb L3": (user, allies, enemies) => doBombSkill(user, enemies, 1.4, 1.4, "bomb-hit-l3", 3),

"Critical L1": (user, allies, enemies) => doCriticalSkill(user, enemies, 1.3, 1),
"Critical L2": (user, allies, enemies) => doCriticalSkill(user, enemies, 1.8, 2),
"Critical L3": (user, allies, enemies) => doCriticalSkill(user, enemies, 2.2, 3),

"Double Strike L1": (user, allies, enemies) => doDoubleStrike(user, enemies, 1.0, 0.8, 1),
"Double Strike L2": (user, allies, enemies) => doDoubleStrike(user, enemies, 1.2, 1.0, 2),
"Double Strike L3": (user, allies, enemies) => doDoubleStrike(user, enemies, 1.5, 1.2, 3),
  "Piercing L1": (user, allies, enemies) => doPiercingShot(user, enemies, 1.2, 2.0, 1),
"Piercing L2": (user, allies, enemies) => doPiercingShot(user, enemies, 1.5, 2.1, 2),
"Piercing L3": (user, allies, enemies) => doPiercingShot(user, enemies, 1.8, 2.2, 3),
"Piercing Shot L1": (user, allies, enemies) => doPiercingShot(user, enemies, 1.2, 2.0, 1),
"Piercing Shot L2": (user, allies, enemies) => doPiercingShot(user, enemies, 1.5, 2.1, 2),
"Piercing Shot L3": (user, allies, enemies) => doPiercingShot(user, enemies, 1.8, 2.2, 3),

"Piercing Shot Mage": async (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  if (!target) return false;

  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);

  const dmg = Math.max(
    1,
    Math.floor(atkFinal * 2) - Math.floor(defFinal / 2.5)
  );

  log(`🎯 ${user.name} (Piercing Shot L3) → ${target.name} -${dmg} HP`,
      user.isEnemy ? "enemy" : "player");
  await applyDamage(user, target, dmg);

  const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (casterEl) {
    casterEl.classList.add("pierce-cast");
    setTimeout(() => casterEl.classList.remove("pierce-cast"), 400);
  }

  const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);
  if (targetEl) {
    targetEl.classList.add("pierce-hit");
    setTimeout(() => targetEl.classList.remove("pierce-hit"), 400);
  }

  user.cooldown = 3;
  return true;
},

"3 hit target L1": (user, allies, enemies) => doTripleHit(user, allies, enemies, 0.8, 1),
"3 hit target L2": (user, allies, enemies) => doTripleHit(user, allies, enemies, 1.0, 2),
"3 hit target L3": (user, allies, enemies) => doTripleHit(user, allies, enemies, 1.3, 3),

};