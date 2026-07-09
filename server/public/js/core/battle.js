// findFirstAlive ย้ายไปรวมไว้จุดเดียวที่ js/shared/battle-math.js แล้ว (เดิมก็อป
// มาไว้ที่นี่ กับ core/render.js และ server/battle/engine.js อีกรวม 3 จุด) โหลด
// เป็น global function ก่อนไฟล์นี้ (ดู pages/*.html) เรียก findFirstAlive(...)
// ตรงนี้ได้เหมือนเดิม
//  ก่อนหน้านี้ addMoney(reward) ถูกเรียกตรงๆ ทุกครั้งที่ฆ่ามอนสเตอร์ — เป็นช่องโหว่
// ร้ายแรง เพราะ addMoney เป็น global function ที่เรียกจาก devtools console ได้เลย
// (addMoney(999999999)) โดยไม่ต้องเล่นเกมจริงด้วยซ้ำ เงินจริงตอนนี้จ่ายเฉพาะตอน
// จบด่านผ่าน GameAPI.claimNormalReward/claimInfReward (เซิฟคำนวณเอง — ดู N-Mode.js/
// inf-mode.js) ฟังก์ชันนี้เหลือแค่โชว์ log preview ให้ผู้เล่นเห็นระหว่างเล่น
// เหมือนกับที่ boss.js ทำ (logRewardPreview) ไม่ได้เพิ่มเงินจริงอีกต่อไป
function handleDeath(victim, killer) {
  if (victim.isEnemy && !victim._rewarded) {
    let reward = victim.reward || 0;

    if (killer && killer.class === "Thief") {
      reward = Math.floor(reward * 1.3);
      log(`<span class=gicon-gem></span> โบนัสอาชีพ Thief! ได้ทองเพิ่ม 30%`, "system");
    }

    if (reward > 0) {
      log(`<span class=gicon-coin></span> สังหาร ${victim.name} ได้ ${reward} เหรียญ`, "system");
    }
    victim._rewarded = true;
  }
}

//  renderBattlefield ไม่เพิ่ม .shield อีกแล้ว
function renderBattlefield() {
  // ---------------- ผู้เล่น ----------------
  const pBox = document.getElementById("playerTeamBox");
  pBox.innerHTML = "";

  playerTeam.forEach(p => {
    const maxHp = p.maxHp ?? getFinalHp(p); // Max HP ต้นฉบับ, fallback เผื่อไม่มี
    const hpPercent = maxHp ? Math.min(100, Math.max(0, (p.hp / maxHp) * 100)) : 0;

    const atkNow = getFinalAtk(p);
    const defNow = getFinalDef(p);

    const el = document.createElement("div");
    el.className = "card-box player-card";
    el.setAttribute("data-id", p.instanceId);

    //  คงโล่ถ้ามีบัพ
    const hasShield = (p.statusEffects || []).some(se => se.type === "DefenseBuff");
    if (hasShield) el.classList.add("shield-active");

    el.innerHTML = `
      <div style="font-weight:700">${p.name}</div>
      <div class="hp-bar">
        <div class="hp-fill green" style="width:${hpPercent}%"></div>
        <div class="hp-fill red" data-red style="width:${p.lastHpPercent ?? hpPercent}%"></div>
      </div>
      <div class="meta">HP: ${Math.max(0, p.hp)} / ${maxHp}</div>
      <div style="font-size:9.5px">ATK: ${atkNow} • DEF: ${defNow}</div>
      <div class="meta">Skill: ${p.skill}${p.cooldown > 0 ? ` <span class="skill-cd">⏳${p.cooldown}</span>` : ""}</div>
    `;
    pBox.appendChild(el);

    setTimeout(() => {
      const redBar = el.querySelector("[data-red]");
      if (redBar) redBar.style.width = `${hpPercent}%`;
    }, 200);

    p.lastHpPercent = hpPercent;
  });

  // ---------------- ศัตรู ----------------
  const eBox = document.getElementById("enemyTeamBox");
  eBox.innerHTML = "";

  enemyTeam.forEach(e => {
    const maxHp = e.maxHp ?? getFinalHp(e); // Max HP ต้นฉบับ, fallback เผื่อไม่มี
    const hpPercent = maxHp ? Math.min(100, Math.max(0, (e.hp / maxHp) * 100)) : 0;

    const atkNow = getFinalAtk(e);
    const defNow = getFinalDef(e);

    const el = document.createElement("div");
    el.className = "card-box enemy-card";
    el.setAttribute("data-id", e.instanceId);

    const hasShield = (e.statusEffects || []).some(se => se.type === "DefenseBuff");
    if (hasShield) el.classList.add("shield-active");

    el.innerHTML = `
      <div style="font-weight:700">${e.name}</div>
      <div class="hp-bar">
        <div class="hp-fill green" style="width:${hpPercent}%"></div>
        <div class="hp-fill red" data-red style="width:${e.lastHpPercent ?? hpPercent}%"></div>
      </div>
      <div class="meta">HP: ${Math.max(0, e.hp)} / ${maxHp}</div>
      <div style="font-size:9.5px">ATK: ${atkNow} • DEF: ${defNow}</div>
      <div class="meta">Skill: ${e.skill}${e.cooldown > 0 ? ` <span class="skill-cd">⏳${e.cooldown}</span>` : ""}</div>
    `;
    eBox.appendChild(el);

    setTimeout(() => {
      const redBar = el.querySelector("[data-red]");
      if (redBar) redBar.style.width = `${hpPercent}%`;
    }, 200);

    e.lastHpPercent = hpPercent;
  });
}