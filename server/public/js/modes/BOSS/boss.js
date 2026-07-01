
/* =======================
   Utilities
   ======================= */
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
function toNum(v, fallback=0){ 
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/* =======================
   Rewards (UI-only log; actual crediting happens via GameAPI.bossClaimTier, see addBossDamage)
   ======================= */
function logRewardPreview(reward){
  if (!reward) return;
  if (reward.items) {
    for (const key of Object.keys(reward.items)) {
      log(`🎁 ได้ ${key} (รอเซิฟยืนยันจำนวน)`, "system");
    }
  }
}

/* =======================
   Stage Reward by Damage
   ======================= */
let damageDone = 0;
let stageRewardGiven = [];
let roundCount = 1;
function resetStageRewards(){
  damageDone = 0;
  stageRewardGiven = [];
}

function addBossDamage(dmg){
  damageDone += dmg;

  const boss = BOSSES[currentBossKey];
  if (!boss || !boss.stages) return;

  boss.stages.forEach((stage, idx)=>{
    if (damageDone >= stage.dmg && !stageRewardGiven[idx]){
      stageRewardGiven[idx] = true; // กันยิงซ้ำฝั่ง client; เซิฟก็กันซ้ำอีกชั้นด้วย UNIQUE constraint
      logRewardPreview(stage.reward);
      log(`🏆 ผ่าน Stage ${idx+1} ของ ${boss.name} (ดาเมจสะสม ${stage.dmg}+ )`, "system");

      if (window.GameAPI) {
        GameAPI.bossClaimTier(idx, damageDone).then((result) => {
          if (result && result.ok) {
            applyServerMoney(result.money);
            applyServerBag(result.bag);
            log(`💰 ได้ ${result.moneyGain} เหรียญ`, "system");
            for (const [key, amount] of Object.entries(result.drops || {})) {
              log(`🎁 ยืนยัน ${amount}x ${key}`, "system");
            }
          } else {
            console.warn("[Boss] claim tier failed:", result?.error);
          }
        });
      }
    }
  });
}

/* =======================
   Global State
   ======================= */
let currentBossKey = null;
let currentBoss = null;
let battleRunning = false;
let playerTeam = [];
let enemyTeam = [];
let maxTeamSize = 4;

/* =======================
   Team Prep
   ======================= */
function renderBossButtons(){
  const div = document.getElementById("bossList");
  if (!div) return;
  div.className = "boss-list";
  div.innerHTML = "";

  const keys = Object.keys(BOSSES || {});
  keys.forEach((key, i) => {
    const b = BOSSES[key];
    const btn = document.createElement("button");
    btn.className = "boss-btn";
    btn.textContent = `🐉 ${b.name}`;
    btn.onclick = ()=> setBoss(key);

    const hue = 120 - (i * 30);
    btn.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
    btn.style.color = "white";

    div.appendChild(btn);
  });
}

async function setBoss(key){
  if (battleRunning){ alert("กำลังสู้บอสอยู่"); return; }
  currentBossKey = key;
  currentBoss = BOSSES[key];
  if (window.GameAPI) await GameAPI.bossRunStart(key); // ต้องรอ runId ก่อน ไม่งั้น claim reward tier แรกจะพลาด
  prepareBossBattle();
  startBattle();
}

function prepareBossBattle(){
  if (!currentBoss) return;

  // บอสมี HP จริง → สามารถตายได้
  enemyTeam = [{
    name: currentBoss.name,
    atk: toNum(currentBoss.atk, 0),
    defBase: toNum(currentBoss.def, 0),
    tempDef: 0,
    get def(){ return toNum(this.defBase,0) + toNum(this.tempDef,0); },
    hp: toNum(currentBoss.hp, 100000),
    maxHp: toNum(currentBoss.hp, 100000),
    skill: currentBoss.skill,
    class: currentBoss.class || null,
    isEnemy: true,
    instanceId: "BOSS",
    cooldown: 0,
    statusEffects: []
  }];

  const deck = JSON.parse(localStorage.getItem("deck")||"[]");
  const selected = JSON.parse(localStorage.getItem("selectedIndexes")||"[]");

  playerTeam = selectedIndexes.map((cardId, i) => {
  const originalDeck = JSON.parse(localStorage.getItem("deck") || "[]");
  const found = originalDeck.find(d => d.id === cardId);
  if (!found) return null;
  const c = deepClone(found);

  // 🟢 คำนวณค่าสุดท้ายจากอุปกรณ์
  const finalStats = getFinalStats(c);
  c.hp = finalStats.hp;
  c.atk = finalStats.atk;
  c.def = finalStats.def;

  // 🟢 กัน skill หาย
  c.skill = found.skill || c.skill || null;

  c.instanceId = c.instanceId || ("P-" + i + "-" + Date.now());
  c.maxHp = c.hp;
  c.defBase = c.def;
  c.tempDef = 0;
  c.cooldown = 0;
  c.usedSkill = false;
  c.isEnemy = false;
  c.statusEffects = [];
  return c;
}).filter(Boolean);

  resetStageRewards();

  logClear?.();
  log(`🐉 เลือกบอส: ${currentBoss.name}`, "system");
  renderBattlefield();
  updateAllHpBars();
}
function getFinalStats(actor) {
  return {
    hp: getFinalHp(actor),
    atk: getFinalAtk(actor),
    def: getFinalDef(actor)
  };
}
/* =======================
   Battle Loop
   ======================= */
async function startBattle(){
  if (!currentBoss || battleRunning) return;
  battleRunning = true;

  const cancelBtn = document.getElementById("cancelBattleBtn");
  if (cancelBtn){
    cancelBtn.style.display="inline-block";
    cancelBtn.onclick = ()=>{
      if (confirm("❌ ยกเลิกการต่อสู้?")){
        log("⚠️ การต่อสู้ถูกยกเลิก", "system");
        endBattle(false);
      }
    };
  }

  let turn = 1;
  while (battleRunning){
    log(`--- เทิร์น ${turn} ---`, "system");

    for (let actor of [...playerTeam, ...enemyTeam]){
      if (!battleRunning) break;
      if (!actor || actor.hp<=0) continue;

      const allies  = actor.isEnemy ? enemyTeam : playerTeam;
      const enemies = actor.isEnemy ? playerTeam : enemyTeam;

      // 🟣 Passive ของบอส
      tryMiniBossPassive(actor, allies);
      tryMidBossPassive(actor, allies);
      tryBigBossPassive(actor, allies);
      tryUltraBossPassive(actor, allies);
      tryPhantomBossPassive(actor);
      await tryFoxBossPassive(actor, allies, enemies); // 🦊 เพิ่มตรงนี้

      // 🟢 ใช้สกิลหรือโจมตี
      if (!useSkill?.(actor, allies, enemies)) {
        if (isHealer?.(actor)){
          healerIdle?.(actor);
        } else {
          normalAttack?.(actor, enemies);

          // ✅ ถ้าเป็นฝั่งผู้เล่นโจมตีบอส → ลด HP จริง + เก็บดาเมจสะสม
          if (!actor.isEnemy && enemies[0] && enemies[0].instanceId === "BOSS"){
            const dmg = Math.max(1, actor.atk - enemies[0].def);
            enemies[0].hp = Math.max(0, enemies[0].hp - dmg);

            if (!enemies[0].isSummon) {
              addBossDamage(dmg);
            }

            if (enemies[0].hp <= 0){
              handleDeath(enemies[0]); // บอสตายได้
              endBattle(true);
              return;
            }
          }
        }
      }

      updateAllHpBars();
      if (checkWinLose()) return;

      await sleep(getBattleSpeed());
    }

endRoundAll();
renderBattlefield(); // ⏳ ให้ตัวเลขคูลดาวน์บนการ์ดอัปเดตทันทีตอนจบเทิร์นใหญ่

    turn++;
    await sleep(300);
  }
}
function endRound() {
  roundCount++;

  [...playerTeam, ...enemyTeam].forEach(actor => {
    // ลด cooldown
    if (actor.cooldown > 0) {
      actor.cooldown--;
    }

    // ลดเทิร์นของบัพ/ดีบัพที่ติดอยู่
    if (actor.statusEffects) {
      actor.statusEffects.forEach(eff => eff.turns--);
      actor.statusEffects = actor.statusEffects.filter(eff => eff.turns > 0);
    }
  });
}


function checkWinLose(){
  const playersAlive = playerTeam.some(u => u && u.hp>0);

  if (!playersAlive){
    log("💀 ทีมผู้เล่นพ่ายแพ้...", "system");
    endBattle(false);
    return true;
  }
  return false;
}

function endBattle(win){
  battleRunning = false;
  const cancelBtn = document.getElementById("cancelBattleBtn");
  if (cancelBtn) cancelBtn.style.display="none";
  renderBossButtons();
  if (window.GameAPI) GameAPI.bossRunFinish();
}

/* =======================
   Render
   ======================= */
function renderBattlefield(){
  const pBox = document.getElementById("playerTeamBox");
  const eBox = document.getElementById("enemyTeamBox");
  if (pBox) pBox.innerHTML = "";
  if (eBox) eBox.innerHTML = "";

  playerTeam.forEach(p => {
    const el = createUnitCard(p, false);
    pBox && pBox.appendChild(el);
  });

  enemyTeam.forEach(e => {
    const el = createUnitCard(e, true);
    eBox && eBox.appendChild(el);
  });
}

function createUnitCard(unit, isEnemy){
  const wrap = document.createElement("div");
  wrap.className = `card-box ${isEnemy ? "enemy-card":"player-card"}`;
  wrap.setAttribute("data-id", unit.instanceId);

  const hpPct = unit.maxHp ? clamp((toNum(unit.hp,0)/toNum(unit.maxHp,1))*100,0,100) : 0;

  wrap.innerHTML = `
    <div style="font-weight:700">${unit.name}</div>
    <div class="hp-bar">
      <div class="hp-fill ${isEnemy?"red":"green"}" style="width:${hpPct}%"></div>
    </div>
    <div class="meta">HP: ${toNum(unit.hp,0)} / ${toNum(unit.maxHp,0)}</div>
    <div style="font-size:13px">ATK:${toNum(unit.atk,0)} • DEF:${toNum(unit.def,0)}</div>
    <div class="meta">Skill: ${unit.skill || "-"}${unit.cooldown > 0 ? ` <span class="skill-cd">⏳${unit.cooldown}</span>` : ""}</div>
  `;
  return wrap;
}

function updateAllHpBars(){
  [...playerTeam, ...enemyTeam].forEach(updateUnitHpBar);
}

function updateUnitHpBar(unit){
  const card = document.querySelector(`.card-box[data-id="${unit.instanceId}"]`);
  if (!card) return;
  const fillEl  = card.querySelector(".hp-fill");

  const hp = clamp(toNum(unit.hp,0), 0, toNum(unit.maxHp,0));
  const max= Math.max(1, toNum(unit.maxHp,1));
  const pct = clamp((hp/max)*100, 0, 100);

  if (fillEl) fillEl.style.width = pct + "%";

  const meta = card.querySelectorAll(".meta")[0];
  if (meta) meta.textContent = `HP: ${hp} / ${max}`;
}
function handleDeath(unit){
  unit.hp = 0;
  log(`☠️ ${unit.name} ตายแล้ว`, "system");
  updateAllHpBars();

  // ถ้าเป็นบอส → จบการต่อสู้
  if (unit.instanceId === "BOSS"){
    log(`🎉 ผู้เล่นชนะ! ${unit.name} ถูกโค่น`, "system");
    endBattle(true);
  } else {
    // ฝั่งผู้เล่นตายไปเรื่อย ๆ
    if (playerTeam.every(u => !u || u.hp <= 0)){
      log("💀 ทีมผู้เล่นพ่ายแพ้...", "system");
      endBattle(false);
    }
  }
}
/* =======================
   Battle Speed Control
   ======================= */
const SPEEDS = { 1: 1300, 2: 1000, 3: 800 ,4:500};
let speedMultiplier = parseInt(localStorage.getItem("speedMul") || "1", 10);

function getBattleSpeed(){
  return SPEEDS[speedMultiplier] || 1500;
}

// หลัง DOM พร้อมแล้ว (สคริปต์ของคุณอยู่ท้าย body อยู่แล้ว จึง query ได้เลย)
document.querySelectorAll(".speed-btn").forEach(btn => {
  const mul = parseInt(btn.dataset.mul, 10);
  if (mul === speedMultiplier) btn.classList.add("active");
  btn.addEventListener("click", () => {
    speedMultiplier = mul;
    localStorage.setItem("speedMul", String(speedMultiplier));
    document.querySelectorAll(".speed-btn").forEach(b => b.classList.toggle("active", b === btn));
  });
});
function tryMiniBossPassive(user, allies) {
  if (user.class === "MiniBoss" && !user.hasSummoned) {
    const summons = [
      { name:"ลูกน้อง 1", hp:500, maxHp:500, atk:48, defBase:50, tempDef:0,
        get def(){ return this.defBase + this.tempDef; }, isEnemy:true,
        instanceId: "SUM-"+Date.now()+"-1", skill:"None", cooldown:0, statusEffects:[], isSummon:true },
      { name:"ลูกน้อง 2", hp:120, maxHp:120, atk:25, defBase:10, tempDef:0,
        get def(){ return this.defBase + this.tempDef; }, isEnemy:true,
        instanceId: "SUM-"+Date.now()+"-2", skill:"Heal L2", cooldown:0, statusEffects:[], isSummon:true }
    ];

    const idx = allies.indexOf(user);
    allies.splice(idx, 0, ...summons);

    user.hasSummoned = true;
    log(`🧟 ${user.name} เรียกลูกน้อง 2 ตัวออกมา (Passive)`, "enemy");

    renderBattlefield();
    updateAllHpBars();
  }
}
function tryMidBossPassive(user, allies) {
  if (user.class === "MidBoss" && !user.hasSummoned) {
    const summon = {
      name: "ลูกน้อง",
      hp: 200, maxHp: 200, atk: 40, defBase: 15, tempDef: 0,
      get def(){ return this.defBase + this.tempDef; },
      isEnemy: true,
      instanceId: "SUM-"+Date.now(),
      skill: "None",
      cooldown: 0,
      statusEffects: [],
      isSummon: true
    };

    const idx = allies.indexOf(user);
    allies.splice(idx, 0, summon);

    user.hasSummoned = true;
    log(`🧟 ${user.name} ซัมมอนลูกน้อง 1 ตัว (Passive MidBoss)`, "enemy");

    renderBattlefield();
    updateAllHpBars();
  }
}
function tryBigBossPassive(user, allies) {
  if (user.class === "BigBoss" && !user.hasSummoned) {
    const summon = {
      name: "ลูกน้องบอสใหญ่",
      hp: 300, maxHp: 300, atk: 60, defBase: 20, tempDef: 0,
      get def(){ return this.defBase + this.tempDef; },
      isEnemy: true,
      instanceId: "SUM-"+Date.now(),
      skill: "None",
      cooldown: 0,
      statusEffects: [],
      isSummon: true
    };

    const idx = allies.indexOf(user);
    allies.splice(idx, 0, summon);

    user.hasSummoned = true;
    log(`🧟 ${user.name} ซัมมอนลูกน้อง 1 ตัว (Passive BigBoss)`, "enemy");

    renderBattlefield();
    updateAllHpBars();
  }
}
function tryUltraBossPassive(user, allies) {
  if (user.class === "UltraBoss" && !user.hasSummoned) {
    const summon = {
      name: "MiniBoss ลูกน้อง",
      hp: 500, maxHp: 500, atk: 80, defBase: 30, tempDef: 0,
      get def(){ return this.defBase + this.tempDef; },
      isEnemy: true,
      instanceId: "SUM-"+Date.now(),
      skill: "Stun L1",   // MiniBoss มีสกิลเล็ก
      cooldown: 0,
      statusEffects: [],
      isSummon: true,
      class: "MiniBoss"
    };

    const idx = allies.indexOf(user);
    allies.splice(idx, 0, summon);

    user.hasSummoned = true;
    log(`👑 ${user.name} ซัมมอน MiniBoss ลูกน้องออกมา!`, "enemy");

    renderBattlefield();
    updateAllHpBars();
  }
}
function tryPhantomBossPassive(user) {
  if (user.class === "PhantomBoss" && !user.shadowShieldUsed) {
    if (user.hp / user.maxHp < 0.3) {
      const shield = Math.floor(user.maxHp * 0.1);
      addStatusEffect(user, { type: "Shield", turns: 999, value: shield });
      user.shadowShieldUsed = true;
      log(`🛡️ ${user.name} เปิดใช้ Shadow Shield (+${shield} Shield ครั้งเดียว)`, "enemy");
      updateAllHpBars();
    }
  }
}

async function tryFoxBossPassive(user, allies, enemies) {
  if (user.class !== "FoxBoss" || user.hp <= 0) return;

  const hpPercent = user.hp / user.maxHp;

  // โอกาส 40%
  if (Math.random() < 0.4) {
    const players = playerTeam.filter(p => p.hp > 0);
    if (players.length > 1) {
      if (hpPercent < 0.3) {
        // 🦊 HP < 30% → ทีมสับสนทั้งทีม
        log(`🦊 ${user.name} ปล่อยพลังสะกด! ผู้เล่นทั้งทีมสับสนและหันมาตีกันเอง!`, "enemy");
        for (let attacker of players) {
          let target = players[Math.floor(Math.random() * players.length)];
          while (target === attacker) {
            target = players[Math.floor(Math.random() * players.length)];
          }
          let dmg = Math.max(1, attacker.atk - target.def);
          dmg = Math.floor(dmg * 1.5); // แรงขึ้น
          await applyDamage(attacker, target, dmg, `💥 ${attacker.name} (สับสน) โจมตี ${target.name} -${dmg} HP`, { noMove:true });
        }
      } else {
        // 🦊 ปกติ → แค่ 1 คนสับสน
        const attacker = players[Math.floor(Math.random() * players.length)];
        let target = players[Math.floor(Math.random() * players.length)];
        while (target === attacker) {
          target = players[Math.floor(Math.random() * players.length)];
        }
        let dmg = Math.max(1, attacker.atk - target.def);
        log(`🦊 ${user.name} ทำให้ ${attacker.name} สับสน! โจมตี ${target.name} -${dmg} HP`, "enemy");
        await applyDamage(attacker, target, dmg, null, { noMove:true });
      }
    }
  }
}
/* =======================
   Init
   ======================= */
renderBossButtons();
updateBagUI();
updateMoneyUI();