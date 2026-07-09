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

  //  FIX: เดิมอ่าน user.atk/target.defBase ตรงๆ (ข้าม getFinalAtk/getFinalDef) ทำให้สกิลนี้
  // ไม่นับ AttackBuffPercent/DefenseBuff จาก statusEffects เหมือนสกิลดาเมจตัวอื่นๆ ทั้งหมดในเกม
  // ปรับให้ใช้ระบบกลางเดียวกันเพื่อความสอดคล้อง
  const atkFinal = getFinalAtk(user);
  const defFinal = getFinalDef(target);

  const dmg = Math.max(1, Math.floor(atkFinal - defFinal));
  //  FIX: เดิมดูดเลือด 180% ของดาเมจ (เทียบกับ Lifesteal L1-L3 ปกติที่ 30%/50%/70%) ซึ่งมากเกิน
  // ไปกว่าลำดับการสเกลปกติเยอะมาก ปรับลงมาที่ 100% ให้ยังแรงกว่า L3 ชัดเจน (สมกับเป็นสกิลระดับ Lord)
  // แต่ไม่ทำให้ผู้ใช้แทบอมตะเมื่อสลับใช้ทุก 3 เทิร์น — ปรับตัวเลขนี้ได้ตามที่ต้องการบาลานซ์จริง
  const heal = Math.floor(dmg * 1.0);

  //  log
  log(
    `<span class=gicon-blood></span> ${user.name} (Lifesteal Lord) <span class=gicon-arrow-right></span> โจมตี ${target.name} -${dmg} HP และฟื้น +${heal} HP`,
    user.isEnemy ? "enemy" : "player"
  );

  //  applyDamage แค่บันทึกผล
  await applyDamage(user, target, dmg);

  //  FIX: เดิม set user.hp ตรงๆ แล้วเรียก updateHpBar เอง ไม่ผ่าน applyHeal() เหมือนสกิลอื่น
  // (พลาดโอกาสได้ float number/animation ที่ applyHeal() มีให้ และผิดแพทเทิร์นของทั้งไฟล์นี้)
  if (heal > 0) {
    applyHeal(user, user, heal);
  }

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