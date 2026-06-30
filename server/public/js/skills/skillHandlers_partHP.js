window.skillHandlers_partHP = {
"Heal L1": (user, allies, enemies) => doHeal(user, allies, 0.5, 1),
"Heal L2": (user, allies, enemies) => doHeal(user, allies, 1.0, 2),
"Heal L3": (user, allies, enemies) => doHeal(user, allies, 1.5, 3),

"AOE Heal L1": (user, allies, enemies) => doAOEHeal(user, allies, 0.4, 1),
"AOE Heal L2": (user, allies, enemies) => doAOEHeal(user, allies, 0.8, 2),
"AOE Heal L3": (user, allies, enemies) => doAOEHeal(user, allies, 1.3, 3),
  
"Revive L1": (user, allies, enemies) => doRevive(user, allies, 0.2, 1),
"Revive L2": (user, allies, enemies) => doRevive(user, allies, 0.4, 2),
"Revive L3": (user, allies, enemies) => doRevive(user, allies, 0.6, 3),

"Charm L1": (user, allies, enemies) => doCharm(user, enemies, 1.0, 1),
"Charm L2": (user, allies, enemies) => doCharm(user, enemies, 1.2, 2),
"Charm L3": (user, allies, enemies) => doCharm(user, enemies, 1.5, 3),

"Blood Tribute L1": (user, allies, enemies) => doBloodTribute(user, allies, enemies, 0.4, 1),
"Blood Tribute L2": (user, allies, enemies) => doBloodTribute(user, allies, enemies, 0.6, 2),
"Blood Tribute L3": (user, allies, enemies) => doBloodTribute(user, allies, enemies, 0.8, 3),

"Lifesteal L1": (user, allies, enemies) => doLifesteal(user, allies, enemies, 0.3, 1),
"Lifesteal L2": (user, allies, enemies) => doLifesteal(user, allies, enemies, 0.5, 2),
"Lifesteal L3": (user, allies, enemies) => doLifesteal(user, allies, enemies, 0.7, 3),

"Lifesteal Lord": async (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  if (!target) return false;
  
  const atkFinal = user.atk + (user.tempAtk || 0);
  const defFinal = (target.defBase || 0) + (target.tempDef || 0);
  
  const dmg = Math.max(1, Math.floor(atkFinal - defFinal));
  const heal = Math.floor(dmg * 1.8); // 0%
  
  // ฟื้นฟู
  user.hp = Math.min(user.maxHp, user.hp + heal);
  updateHpBar(user);
  
  // 📝 log
  log(
    `🩸 ${user.name} (Lifesteal L1) → โจมตี ${target.name} -${dmg} HP และฟื้น +${heal} HP`,
    user.isEnemy ? "enemy" : "player"
  );
  
  // 📌 applyDamage แค่บันทึกผล
  await applyDamage(user, target, dmg);
  
  // เอฟเฟกต์ฟื้นเลือด
  const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (userEl) {
    userEl.classList.add("lifesteal-heal");
    setTimeout(() => userEl.classList.remove("lifesteal-heal"), 1000);
  }
  
  user.cooldown = 3;
  return true;
},
};