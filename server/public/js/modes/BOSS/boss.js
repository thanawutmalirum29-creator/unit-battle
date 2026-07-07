
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
   Stage Reward by Damage
   🔧 เดิม addBossDamage() ตรงนี้เป็นคนยิง GameAPI.bossClaimTier เอง ทุกครั้งที่ดาเมจสะสม
   ข้ามเกณฑ์ — ตอนนี้ routes/battle.js (payoutBossTiers) จ่ายให้อัตโนมัติทุกเทิร์นแล้ว
   (ดู turnRes.rewards ใน startBattle() ด้านล่าง) เหลือแค่ resetStageRewards() ไว้เคลียร์
   ตัวแปรแสดงผล damageDone/stageRewardGiven ตอนเริ่มสู้บอสตัวใหม่
   ======================= */
var damageDone = 0;
var stageRewardGiven = [];
var roundCount = 1;
function resetStageRewards(){
  damageDone = 0;
  stageRewardGiven = [];
}

/* =======================
   Global State
   ======================= */
var currentBossKey = null;
var currentBoss = null;
var battleRunning = false;
var playerTeam = [];
var enemyTeam = [];
var maxTeamSize = 4;

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

/* =======================
   Boss Info Popup (❗ ปุ่มข้างๆ ปุ่มเลือกบอส)
   แสดงสเตตัส/สกิล/ของดรอปแต่ละสเตจของบอสทุกตัว อ่านตรงจาก BOSSES
   (bossmap.js) เลย เพิ่ม/แก้บอสหรือของดรอปที่ไฟล์นั้นไฟล์เดียว
   popup นี้จะอัปเดตตามอัตโนมัติไม่ต้องมาแก้ที่นี่อีก
   ======================= */

// ใช้ชื่อ/ไอคอนไอเทมจาก bag.js (BAG_DISPLAY_ITEMS + itemIconHTML) ให้ตรงกับที่โชว์ในกระเป๋า
// ไม่ต้องมี mapping ชื่อไอเทมซ้ำอีกชุด — ถ้า bag.js โหลดไม่ทันหรือไม่มีไอดีนี้ ก็ fallback เป็นไอดีดิบ
function bossItemLabel(id){
  const item = (typeof BAG_DISPLAY_ITEMS !== "undefined" ? BAG_DISPLAY_ITEMS : [])
    .find(it => it.id === id);
  if (!item) return id;
  const icon = typeof itemIconHTML === "function" ? itemIconHTML(id) : "";
  return `${icon}${item.label}`;
}

function injectBossInfoStyles(){
  if (document.getElementById("bossInfoStyles")) return;
  const style = document.createElement("style");
  style.id = "bossInfoStyles";
  style.textContent = `
.boss-section-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin:0 0 8px;
}
.boss-section-header h3{ margin:0; }
.boss-info-btn{
  flex:0 0 auto;
  width:32px; height:32px;
  border-radius:50%;
  border:1px solid var(--border, rgba(255,255,255,.08));
  background:var(--panel, #141d2b);
  color:var(--gold,#ffd54f);
  font-size:16px;
  font-weight:800;
  line-height:1;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  transition:background .15s ease, color .15s ease;
}
.boss-info-btn:hover{
  background:linear-gradient(135deg,var(--accent,#5c8bff),#3f63d6);
  border-color:transparent;
  color:#fff;
}

.boss-info-overlay{
  position:fixed;
  inset:0;
  z-index:10050;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
  background:rgba(4,6,12,.6);
  backdrop-filter:blur(3px);
  -webkit-backdrop-filter:blur(3px);
  opacity:0;
  pointer-events:none;
  transition:opacity .15s ease;
}
.boss-info-overlay.open{ opacity:1; pointer-events:auto; }

.boss-info-panel{
  width:100%;
  max-width:520px;
  max-height:82vh;
  overflow-y:auto;
  background:linear-gradient(180deg, var(--panel,#141d2b), var(--bg-2,#121a26));
  border:1px solid var(--border, rgba(255,255,255,.08));
  border-radius:var(--radius,14px);
  box-shadow:var(--shadow,0 8px 24px rgba(0,0,0,.45));
  padding:18px 16px 16px;
  transform:translateY(10px) scale(.97);
  transition:transform .18s ease;
}
.boss-info-overlay.open .boss-info-panel{ transform:translateY(0) scale(1); }

.boss-info-title{
  font-weight:800;
  font-size:16px;
  color:var(--text,#e8edf5);
  margin:0 0 12px;
  text-align:center;
}

.boss-info-entry{
  border:1px solid var(--border, rgba(255,255,255,.08));
  border-radius:var(--radius-sm,9px);
  background:var(--panel-soft,rgba(255,255,255,.04));
  padding:10px 12px;
  margin:0 0 10px;
}
.boss-info-entry h4{
  margin:0 0 4px;
  font-size:15px;
  color:var(--accent-2,#7bd6ff);
}
.boss-info-stats{
  font-size:12px;
  color:var(--muted,#93a1b5);
  margin:0 0 8px;
}
.boss-info-stage{
  font-size:12.5px;
  line-height:1.6;
  padding:5px 0;
  border-top:1px dashed var(--border, rgba(255,255,255,.08));
}
.boss-info-stage:first-of-type{ border-top:none; }
.boss-info-stage b{ color:var(--gold,#ffd54f); }
.boss-info-drops{ color:var(--text,#e8edf5); opacity:.9; }

.boss-info-close{
  width:100%;
  margin-top:6px;
  padding:10px;
  border-radius:999px;
  border:1px solid var(--border, rgba(255,255,255,.08));
  background:var(--panel-soft,rgba(255,255,255,.04));
  color:var(--muted,#93a1b5);
  font-weight:700;
  cursor:pointer;
}
.boss-info-close:hover{ color:var(--text,#e8edf5); }
`;
  document.head.appendChild(style);
}

function buildBossInfoOverlay(){
  const overlay = document.createElement("div");
  overlay.id = "bossInfoOverlay";
  overlay.className = "boss-info-overlay";

  const panel = document.createElement("div");
  panel.className = "boss-info-panel";

  const title = document.createElement("div");
  title.className = "boss-info-title";
  title.textContent = "📖 รายละเอียดบอส & ของดรอป";
  panel.appendChild(title);

  Object.values(BOSSES || {}).forEach((boss) => {
    const entry = document.createElement("div");
    entry.className = "boss-info-entry";

    const h4 = document.createElement("h4");
    h4.textContent = `🐉 ${boss.name}`;
    entry.appendChild(h4);

    const stats = document.createElement("div");
    stats.className = "boss-info-stats";
    const hp = boss.hp !== undefined ? boss.hp : 100000; // ค่า default เดียวกับตอนสร้างบอสจริง (prepareBossBattle)
    stats.textContent =
      `❤️ HP ${hp.toLocaleString()}  ⚔️ ATK ${boss.atk ?? "-"}  🛡️ DEF ${boss.def ?? "-"}` +
      (boss.skill ? `  ✨ สกิล: ${boss.skill}` : "");
    entry.appendChild(stats);

    (boss.stages || []).forEach((stage, idx) => {
      const row = document.createElement("div");
      row.className = "boss-info-stage";

      const moneyText = Array.isArray(stage.reward?.money)
        ? `${stage.reward.money[0].toLocaleString()}-${stage.reward.money[1].toLocaleString()}`
        : "-";

      const dropsText = Object.entries(stage.reward?.items || {})
        .map(([id, range]) => `${bossItemLabel(id)} x${range[0]}-${range[1]}`)
        .join(", ") || "—";

      row.innerHTML =
        `<b>Stage ${idx + 1}</b> (ดาเมจสะสม ${stage.dmg.toLocaleString()}+) ` +
        `→ <span class=gicon-coin></span> ${moneyText} <br>` +
        `<span class="boss-info-drops">🎁 ${dropsText}</span>`;
      entry.appendChild(row);
    });

    panel.appendChild(entry);
  });

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "boss-info-close";
  closeBtn.textContent = "ปิด";
  closeBtn.addEventListener("click", () => closeBossInfo());
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeBossInfo();
  });

  function openBossInfo(){ overlay.classList.add("open"); }
  function closeBossInfo(){ overlay.classList.remove("open"); }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBossInfo();
  });

  overlay._open = openBossInfo;
  return overlay;
}

function setupBossInfoButton(){
  const btn = document.getElementById("bossInfoBtn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  injectBossInfoStyles();
  const overlay = buildBossInfoOverlay();
  document.body.appendChild(overlay);

  btn.addEventListener("click", () => overlay._open());
}

async function setBoss(key){
  if (battleRunning){ alert("กำลังสู้บอสอยู่"); return; }
  currentBossKey = key;
  currentBoss = BOSSES[key];
  prepareBossBattle();
  startBattle();
}

// 🔧 หมายเหตุ: enemyTeam/playerTeam ตรงนี้เป็นแค่ "พรีวิว" ให้เห็นก่อนกดสู้ — พอ startBattle()
// เรียก GameAPI.battleStart() จริง ทีมจริง (stat จากเด็ค+อุปกรณ์ที่เซิฟเก็บเอง) จะมาทับตรงนี้
function prepareBossBattle(){
  if (!currentBoss) return;

  enemyTeam = [{
    name: currentBoss.name,
    atk: toNum(currentBoss.atk, 0),
    def: toNum(currentBoss.def, 0),
    hp: toNum(currentBoss.hp, 100000),
    maxHp: toNum(currentBoss.hp, 100000),
    skill: currentBoss.skill,
    class: currentBoss.class || null,
    isEnemy: true,
    instanceId: "BOSS",
    cooldown: 0,
    statusEffects: []
  }];

  resetStageRewards();
  if (window.HubUI) { HubUI.resetDamageStats(); HubUI.resetRewards(); }

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
   Battle Loop — เซิฟรันผลจริงทีละเทิร์น (ดู routes/battle.js, server/battle/engine.js)
   ก่อนหน้านี้ตีธรรมดาใส่บอสโดนหักเลือด/นับดาเมจซ้ำ 2 รอบ (ผ่าน normalAttack() ปกติ
   แล้วมีโค้ดอีกก้อนคำนวณ atk-def หัก HP อีกรอบ) ผลคือบอสตายเร็วกว่าที่ควรเท่าตัว และ
   ระบบ tier reward ก็รับดาเมจเข้าไป 2 เท่าด้วย — เซิฟรุ่นใหม่คำนวณครั้งเดียวถูกต้อง
   ======================= */
async function startBattle(){
  if (!currentBoss || battleRunning) return;

  const selected = loadSelectedTeam("boss");
  const cardIds = selected.slice(0, maxTeamSize);
  const startRes = await GameAPI.battleStart("boss", cardIds, { bossKey: currentBossKey });
  if (!startRes || startRes.error) {
    alert("เริ่มสู้บอสไม่สำเร็จ: " + (startRes?.error || "ไม่ทราบสาเหตุ (เช็คอินเทอร์เน็ต/ล็อกอิน)"));
    return;
  }
  const battleId = startRes.battleId;
  currentBossRunId = startRes.runId;

  battleRunning = true;
  bossResultsShown = false; // 🟢 รีเซ็ตทุกครั้งที่เริ่มสู้ใหม่ กันเคสจบสู้ก่อนหน้าด้วย endBattle() แค่ครั้งเดียว
  if (window.HubUI) HubUI.enterBattle();

  playerTeam = startRes.playerTeam;
  enemyTeam = startRes.enemyTeam;
  renderBattlefield();

  const cancelBtn = document.getElementById("cancelBattleBtn");
  if (cancelBtn){
    cancelBtn.style.display="inline-block";
    cancelBtn.onclick = async ()=>{
      if (await uiConfirm("❌ ยกเลิกการต่อสู้?")){
        log("⚠️ การต่อสู้ถูกยกเลิก", "system");
        GameAPI.battleForfeit(battleId); // fire-and-forget
        if (window.HubUI) {
          HubUI.showResults({
            win: false,
            cancelled: true,
            title: "❌ คุณยกเลิกการต่อสู้",
            extraNote: "การยกเลิกกลางคันนับเป็นแพ้ — ได้รางวัลตามดาเมจที่ทำได้จริงเท่านั้น",
            playerTeam: [...playerTeam],
            enemyTeam: [...enemyTeam],
          });
          bossResultsShown = true;
        }
        endBattle(false);
      }
    };
  }

  let turn = 1;
  while (battleRunning){
    log(`--- เทิร์น ${turn} ---`, "system");

    const turnRes = await GameAPI.battleTurn(battleId);
    if (!turnRes || turnRes.error) {
      log(`⚠️ เชื่อมต่อเซิฟไม่ได้ (${turnRes?.error || "network"}) — หยุดการต่อสู้`, "system");
      endBattle(false);
      return;
    }

    for (const entry of (turnRes.log || [])) {
      log(entry.msg, entry.side);
      await sleep(Math.max(120, getBattleSpeed() * 0.25));
    }

    playerTeam = turnRes.playerTeam;
    enemyTeam = turnRes.enemyTeam;
    damageDone = turnRes.bossDamageDealt || 0;
    if (window.HubUI) HubUI.setDamageDone?.(damageDone);
    renderBattlefield();
    updateAllHpBars();

    // 🎯 รางวัลไล่ tier ที่เซิฟจ่ายจริงระหว่างสู้ (ทุกเทิร์นที่ดาเมจสะสมข้ามเกณฑ์ใหม่)
    if (turnRes.rewards) {
      applyServerMoney(turnRes.rewards.money);
      applyServerBag(turnRes.rewards.bag);
      if (turnRes.rewards.moneyGain) log(`<span class=gicon-coin></span> ได้ ${turnRes.rewards.moneyGain} เหรียญ`, "system");
      for (const [key, amount] of Object.entries(turnRes.rewards.drops || {})) {
        log(`🎁 ได้ ${amount}x ${key}`, "system");
      }
      if (window.HubUI) HubUI.addReward(turnRes.rewards.moneyGain, turnRes.rewards.drops);
    }

    if (turnRes.finished) {
      log(turnRes.win ? "🎉 โค่นบอสสำเร็จ!" : "💀 ทีมผู้เล่นพ่ายแพ้...", "system");
      endBattle(turnRes.win);
      return;
    }

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

var bossResultsShown = false;
var currentBossRunId = null;
function endBattle(win){
  battleRunning = false;
  const cancelBtn = document.getElementById("cancelBattleBtn");
  if (cancelBtn) cancelBtn.style.display="none";
  renderBossButtons();
  // 🔧 เดิมเรียก GameAPI.bossRunFinish() ตรงนี้ แต่ตอนนี้ routes/battle.js ปิด run ให้เองแล้ว
  // ทุกครั้งที่ไฟต์จบ (ชนะ/แพ้/ยกเลิก) ไม่ต้องมีจุดเรียกซ้ำจาก client อีก

  // 🟢 ป้องกันโชว์ผลซ้ำ — เส้นทางฆ่าบอสมีจุดเรียก endBattle(true) มากกว่า 1 จุด
  // (ทั้งจาก handleDeath และจากลูปโจมตีธรรมดาโดยตรง) ส่วนกรณียกเลิกกลางคัน
  // ตัวปุ่มยกเลิกโชว์ผลของตัวเองไปแล้วก่อนเรียก endBattle(false) จึงข้ามตรงนี้
  if (bossResultsShown) { bossResultsShown = false; return; }
  bossResultsShown = true;
  if (window.HubUI) {
    HubUI.showResults({
      win,
      title: win ? "🎉 คุณชนะ! โค่นบอสสำเร็จ" : "💀 คุณแพ้... ทีมถูกโค่นทั้งหมด",
      playerTeam: [...playerTeam],
      enemyTeam: [...enemyTeam],
    });
  }
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
var SPEEDS = { 1: 1300, 2: 1000, 3: 800 ,4:500};
var speedMultiplier = parseInt(localStorage.getItem("speedMul") || "1", 10);

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
setupBossInfoButton();
updateBagUI();
updateMoneyUI();