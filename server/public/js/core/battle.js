function findFirstAlive(list){
  return list.find(x => x.hp > 0);
}
function handleDeath(victim, killer) {
  if (victim.isEnemy && !victim._rewarded) {
    let reward = victim.reward || 0;

    // 🟢 ถ้า killer เป็น Thief → ได้เงินเพิ่ม 30%
    if (killer && killer.class === "Thief") {
      reward = Math.floor(reward * 1.3);
      log(`💎 โบนัสอาชีพ Thief! ได้ทองเพิ่ม 30%`, "system");
    }

    if (reward > 0) {
      addMoney(reward);
      updateMoneyUI();
      log(`💰 ได้รับ ${reward} จากการสังหาร ${victim.name}`, "system");
    }
    victim._rewarded = true;
  }
}

// 🔰 renderBattlefield ไม่เพิ่ม .shield อีกแล้ว
function renderBattlefield() {
  // ---------------- ผู้เล่น ----------------
  const pBox = document.getElementById("playerTeamBox");
  pBox.innerHTML = "";

  playerTeam.forEach(p => {
    const maxHp = p.maxHp ?? getFinalHp(p); // Max HP ต้นฉบับ, fallback เผื่อไม่มี
    const hpPercent = maxHp ? Math.max(0, (p.hp / maxHp) * 100) : 0;

    const atkNow = getFinalAtk(p);
    const defNow = getFinalDef(p);

    const el = document.createElement("div");
    el.className = "card-box player-card";
    el.setAttribute("data-id", p.instanceId);

    // 🔰 คงโล่ถ้ามีบัพ
    const hasShield = (p.statusEffects || []).some(se => se.type === "DefenseBuff");
    if (hasShield) el.classList.add("shield-active");

    el.innerHTML = `
      <div style="font-weight:700">${p.name}</div>
      <div class="hp-bar">
        <div class="hp-fill green" style="width:${hpPercent}%"></div>
        <div class="hp-fill red" data-red style="width:${p.lastHpPercent ?? hpPercent}%"></div>
      </div>
      <div class="meta">HP: ${Math.max(0, p.hp)} / ${maxHp}</div>
      <div style="font-size:13px">ATK: ${atkNow} • DEF: ${defNow}</div>
      <div class="meta">Skill: ${p.skill}</div>
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
    const hpPercent = maxHp ? Math.max(0, (e.hp / maxHp) * 100) : 0;

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
      <div style="font-size:13px">ATK: ${atkNow} • DEF: ${defNow}</div>
      <div class="meta">Skill: ${e.skill}</div>
    `;
    eBox.appendChild(el);

    setTimeout(() => {
      const redBar = el.querySelector("[data-red]");
      if (redBar) redBar.style.width = `${hpPercent}%`;
    }, 200);

    e.lastHpPercent = hpPercent;
  });
}