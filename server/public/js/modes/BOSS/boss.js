
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
   <span class=gicon-gear></span> เดิม addBossDamage() ตรงนี้เป็นคนยิง GameAPI.bossClaimTier เอง ทุกครั้งที่ดาเมจสะสม
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
// ไอคอน CSS (icons.css) + โทนสีต่อบอสหนึ่งตัว — วนใช้ 4 โทนซ้ำถ้ามีบอสมากกว่านี้
// แทนการสุ่ม hue แบบเดิม (ซึ่งให้สีมั่วๆ ไม่เข้าธีมเกม และซ้ำกับสีแดง/เขียวของ HP bar ได้)
const BOSS_THEME_ICON = { slime: "gicon-slime-king", dragon: "gicon-dragon", golem: "gicon-golem", "เทพเจ้า": "gicon-deity" };
const BOSS_THEME_CLASS = ["boss-theme-1", "boss-theme-2", "boss-theme-3", "boss-theme-4"];

function renderBossButtons(){
  const div = document.getElementById("bossList");
  if (!div) return;
  //  เดิม CSS ของการ์ดบอส (.boss-card/.boss-btn/.boss-card-info-btn) ถูก inject แบบ lazy
  // ตอนกดเปิดป๊อปอัปครั้งแรกเท่านั้น (ensureBossInfoOverlay) ทำให้ตอนโหลดหน้าครั้งแรก
  // การ์ดยังไม่มีสไตล์เลย เลยยืดเต็มความกว้างแบบไม่มีขีดจำกัด และปุ่มหลุดไปอยู่บรรทัดถัดไป
  // แทนที่จะลอยมุมขวาบนของการ์ด — เรียกตรงนี้เลยให้พร้อมใช้ตั้งแต่ render ครั้งแรก
  injectBossInfoStyles();
  div.className = "boss-list";
  div.innerHTML = "";

  const keys = Object.keys(BOSSES || {});
  keys.forEach((key, i) => {
    const b = BOSSES[key];
    const themeClass = BOSS_THEME_CLASS[i % BOSS_THEME_CLASS.length];
    const iconClass = BOSS_THEME_ICON[key] || "gicon-skull";

    const card = document.createElement("div");
    card.className = "boss-card " + themeClass;

    const btn = document.createElement("button");
    btn.className = "boss-btn";
    btn.innerHTML = `
      <span class="boss-btn-icon"><span class=${iconClass}></span></span>
      <span class="boss-btn-name">${b.name}</span>
      <span class="boss-btn-cta">ต่อสู้ <span class=gicon-arrow-right></span></span>
    `;
    btn.onclick = ()=> setBoss(key);

    //  ข้อมูล/ของดรอปของบอสตัวนี้ตัวเดียว — แยกของใครของมัน ไม่รวมกับบอสตัวอื่น
    const infoBtn = document.createElement("button");
    infoBtn.type = "button";
    infoBtn.className = "boss-info-btn boss-card-info-btn";
    infoBtn.setAttribute("aria-label", `รายละเอียด ${b.name} และของดรอป`);
    infoBtn.innerHTML = "<span class=gicon-warning></span>";
    infoBtn.onclick = (e) => {
      e.stopPropagation();
      openBossInfo(key);
    };

    card.appendChild(btn);
    card.appendChild(infoBtn);
    div.appendChild(card);
  });
}

/* =======================
   Boss Info Popup (<span class=gicon-warning></span> ปุ่มบนการ์ดของแต่ละบอส)
   แสดงสเตตัส/สกิล/ของดรอปของ "บอสตัวที่กดเท่านั้น" ของใครของมัน ไม่รวมทุกตัวไว้
   ในลิสต์เดียว (เดิมรวมหมดยาวเกินไป) อ่านตรงจาก BOSSES (bossmap.js) เลย
   เพิ่ม/แก้บอสหรือของดรอปที่ไฟล์นั้นไฟล์เดียว popup นี้จะอัปเดตตามอัตโนมัติ
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

/* การ์ดบอสแต่ละใบในลิสต์ — ปุ่มเลือกสู้ + ปุ่มข้อมูลของบอสตัวนั้นลอยอยู่มุมเดียวกัน */
.boss-card{
  position:relative;
  border-radius:var(--radius,14px);
  overflow:hidden;
  box-shadow:0 4px 12px rgba(0,0,0,.3);
  transition:transform .15s ease, box-shadow .15s ease;
}
.boss-card:hover{ transform:translateY(-3px); box-shadow:0 10px 22px rgba(0,0,0,.4); }
.boss-card .boss-btn{
  width:100%;
  height:100%;
  min-height:118px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;
  padding:18px 10px 14px;
  border-radius:var(--radius,14px);
  border:1px solid var(--border,rgba(255,255,255,.1));
  background:linear-gradient(160deg, var(--boss-c1,#1a2436), var(--boss-c2,#0c121b) 75%);
  color:var(--text,#e8edf5);
}
.boss-card .boss-btn:hover{ transform:none; filter:brightness(1.08); }
.boss-btn-icon{
  width:40px; height:40px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,.08);
  font-size:19px;
  color:var(--boss-accent,#7bd6ff);
  box-shadow:0 0 0 1px rgba(255,255,255,.08), 0 0 16px var(--boss-glow,rgba(123,214,255,.35));
}
.boss-btn-name{ font-weight:800; font-size:14px; text-align:center; line-height:1.2; }
.boss-btn-cta{ font-size:10.5px; color:var(--muted,#93a1b5); font-weight:600; letter-spacing:.3px; }

/* โทนสีต่อบอสหนึ่งตัว วนซ้ำทุก 4 ตัว ให้แต่ละการ์ดแยกจากกันด้วยสายตาโดยไม่ต้องพึ่ง hue สุ่ม */
.boss-card.boss-theme-1{ --boss-c1:#1a2436; --boss-c2:#0c121b; --boss-accent:#7bd6ff; --boss-glow:rgba(123,214,255,.35); }
.boss-card.boss-theme-2{ --boss-c1:#2a1730; --boss-c2:#120a1b; --boss-accent:#d9aaff; --boss-glow:rgba(168,85,247,.35); }
.boss-card.boss-theme-3{ --boss-c1:#312110; --boss-c2:#170f06; --boss-accent:#ffd54f; --boss-glow:rgba(255,213,79,.35); }
.boss-card.boss-theme-4{ --boss-c1:#331321; --boss-c2:#15070f; --boss-accent:#ff3da6; --boss-glow:rgba(255,61,166,.35); }
.boss-card-info-btn{
  position:absolute;
  top:6px;
  right:6px;
  width:24px;
  height:24px;
  font-size:13px;
  box-shadow:0 2px 6px rgba(0,0,0,.4);
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
  color:var(--text,#e8edf5);
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
  color:var(--text,#e8edf5);
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

// สร้าง "โครง" ป๊อปอัปครั้งเดียวไว้ใช้ซ้ำ — เนื้อหาข้างในถูกเติมใหม่ทุกครั้งที่เปิด
// ตามบอสตัวที่กด (ดู renderBossInfoPanel) แทนที่จะสร้างของทุกบอสไว้ล่วงหน้าในก้อนเดียว
let bossInfoOverlayEl = null;

function ensureBossInfoOverlay(){
  if (bossInfoOverlayEl) return bossInfoOverlayEl;

  injectBossInfoStyles();

  const overlay = document.createElement("div");
  overlay.id = "bossInfoOverlay";
  overlay.className = "boss-info-overlay";

  const panel = document.createElement("div");
  panel.className = "boss-info-panel";
  overlay.appendChild(panel);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  function openOverlay(){ overlay.classList.add("open"); }
  function closeOverlay(){ overlay.classList.remove("open"); }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOverlay();
  });

  overlay._open = openOverlay;
  overlay._close = closeOverlay;
  overlay._panel = panel;

  document.body.appendChild(overlay);
  bossInfoOverlayEl = overlay;
  return overlay;
}

// เติมเนื้อหาป๊อปอัปด้วยข้อมูล "บอสตัวเดียว" ที่ระบุเท่านั้น
function renderBossInfoPanel(panel, boss, overlay, bossKey){
  panel.innerHTML = "";

  const title = document.createElement("div");
  title.className = "boss-info-title";
  title.innerHTML = `<span class=gicon-note></span> รายละเอียด & ของดรอป`;
  panel.appendChild(title);

  const entry = document.createElement("div");
  entry.className = "boss-info-entry";

  const iconClass = BOSS_THEME_ICON[bossKey] || "gicon-skull";
  const h4 = document.createElement("h4");
  h4.innerHTML = `<span class=${iconClass}></span> ${boss.name}`;
  entry.appendChild(h4);

  const stats = document.createElement("div");
  stats.className = "boss-info-stats";
  const hp = boss.hp !== undefined ? boss.hp : 100000; // ค่า default เดียวกับตอนสร้างบอสจริง (prepareBossBattle)
  stats.innerHTML =
    `<span class=gicon-heart></span> HP ${hp.toLocaleString()}  <span class=gicon-battle></span> ATK ${boss.atk ?? "-"}  <span class=gicon-shield></span> DEF ${boss.def ?? "-"}` +
    (boss.skill ? `  <span class=gicon-sparkle></span> สกิล: ${boss.skill}` : "");
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
      `<span class=gicon-arrow-right></span> <span class=gicon-coin></span> ${moneyText} <br>` +
      `<span class="boss-info-drops"><span class=gicon-gift></span> ${dropsText}</span>`;
    entry.appendChild(row);
  });

  panel.appendChild(entry);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "boss-info-close";
  closeBtn.textContent = "ปิด";
  closeBtn.addEventListener("click", () => overlay._close());
  panel.appendChild(closeBtn);
}

function openBossInfo(bossKey){
  const boss = (BOSSES || {})[bossKey];
  if (!boss) return;
  const overlay = ensureBossInfoOverlay();
  renderBossInfoPanel(overlay._panel, boss, overlay, bossKey);
  overlay._open();
}

async function setBoss(key){
  if (battleRunning){ alert("กำลังสู้บอสอยู่"); return; }
  currentBossKey = key;
  currentBoss = BOSSES[key];
  prepareBossBattle();
  startBattle();
}

//  หมายเหตุ: enemyTeam/playerTeam ตรงนี้เป็นแค่ "พรีวิว" ให้เห็นก่อนกดสู้ — พอ startBattle()
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
  log(`<span class=${BOSS_THEME_ICON[currentBossKey] || "gicon-skull"}></span> เลือกบอส: ${currentBoss.name}`, "system");
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
  bossResultsShown = false; // <span class=gicon-dot-green></span> รีเซ็ตทุกครั้งที่เริ่มสู้ใหม่ กันเคสจบสู้ก่อนหน้าด้วย endBattle() แค่ครั้งเดียว
  if (window.HubUI) HubUI.enterBattle();

  playerTeam = startRes.playerTeam;
  enemyTeam = startRes.enemyTeam;
  renderBattlefield();

  const cancelBtn = document.getElementById("cancelBattleBtn");
  if (cancelBtn){
    cancelBtn.style.display="inline-block";
    cancelBtn.onclick = async ()=>{
      if (await uiConfirm("ยกเลิกการต่อสู้?", { icon: "<span class=gicon-x></span>" })){
        log("<span class=gicon-warning></span> การต่อสู้ถูกยกเลิก", "system");
        GameAPI.battleForfeit(battleId); // fire-and-forget
        if (window.HubUI) {
          HubUI.showResults({
            win: false,
            cancelled: true,
            title: "<span class=gicon-x></span> คุณยกเลิกการต่อสู้",
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
      log(`<span class=gicon-warning></span> เชื่อมต่อเซิฟไม่ได้ (${turnRes?.error || "network"}) — หยุดการต่อสู้`, "system");
      endBattle(false);
      return;
    }

    for (const entry of (turnRes.log || [])) {
      log(entry.msg, entry.side);
      await sleep(Math.max(120, getBattleSpeed() * 0.25));
    }

    //  FIX: เล่นแอนิเมชันโจมตี/ตัวเลขดาเมจจริงจากเหตุการณ์ที่เซิฟส่งกลับมา และ sync สถิติ
    // ดาเมจ "ทำ/รับ" ต่อหน่วยไปหน้าสรุปผล (ดู N-Mode.js สำหรับรายละเอียดเต็ม — root cause เดียวกัน)
    if (window.HubUI) HubUI.setDamageStats(turnRes.damageStats);
    if (typeof playTurnEvents === "function") await playTurnEvents(turnRes.events);

    playerTeam = turnRes.playerTeam;
    enemyTeam = turnRes.enemyTeam;
    damageDone = turnRes.bossDamageDealt || 0;
    if (window.HubUI) HubUI.setDamageDone?.(damageDone);
    renderBattlefield();
    updateAllHpBars();

    //  รางวัลไล่ tier ที่เซิฟจ่ายจริงระหว่างสู้ (ทุกเทิร์นที่ดาเมจสะสมข้ามเกณฑ์ใหม่)
    if (turnRes.rewards) {
      applyServerMoney(turnRes.rewards.money);
      applyServerBag(turnRes.rewards.bag);
      if (turnRes.rewards.moneyGain) log(`<span class=gicon-coin></span> ได้ ${turnRes.rewards.moneyGain} เหรียญ`, "system");
      for (const [key, amount] of Object.entries(turnRes.rewards.drops || {})) {
        log(`<span class=gicon-gift></span> ได้ ${amount}x ${key}`, "system");
      }
      if (window.HubUI) HubUI.addReward(turnRes.rewards.moneyGain, turnRes.rewards.drops);
    }

    if (turnRes.finished) {
      log(turnRes.win ? "<span class=gicon-party></span> โค่นบอสสำเร็จ!" : "<span class=gicon-skull></span> ทีมผู้เล่นพ่ายแพ้...", "system");
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
    log("<span class=gicon-skull></span> ทีมผู้เล่นพ่ายแพ้...", "system");
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
  //  เดิมเรียก GameAPI.bossRunFinish() ตรงนี้ แต่ตอนนี้ routes/battle.js ปิด run ให้เองแล้ว
  // ทุกครั้งที่ไฟต์จบ (ชนะ/แพ้/ยกเลิก) ไม่ต้องมีจุดเรียกซ้ำจาก client อีก

  //  ป้องกันโชว์ผลซ้ำ — เส้นทางฆ่าบอสมีจุดเรียก endBattle(true) มากกว่า 1 จุด
  // (ทั้งจาก handleDeath และจากลูปโจมตีธรรมดาโดยตรง) ส่วนกรณียกเลิกกลางคัน
  // ตัวปุ่มยกเลิกโชว์ผลของตัวเองไปแล้วก่อนเรียก endBattle(false) จึงข้ามตรงนี้
  if (bossResultsShown) { bossResultsShown = false; return; }
  bossResultsShown = true;
  if (window.HubUI) {
    HubUI.showResults({
      win,
      title: win ? "<span class=gicon-party></span> คุณชนะ! โค่นบอสสำเร็จ" : "<span class=gicon-skull></span> คุณแพ้... ทีมถูกโค่นทั้งหมด",
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
    <div style="font-size:9.5px">ATK:${toNum(unit.atk,0)} • DEF:${toNum(unit.def,0)}</div>
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
  log(`<span class=gicon-skull></span> ${unit.name} ตายแล้ว`, "system");
  updateAllHpBars();

  // ถ้าเป็นบอส  จบการต่อสู้
  if (unit.instanceId === "BOSS"){
    log(`<span class=gicon-party></span> ผู้เล่นชนะ! ${unit.name} ถูกโค่น`, "system");
    endBattle(true);
  } else {
    // ฝั่งผู้เล่นตายไปเรื่อย ๆ
    if (playerTeam.every(u => !u || u.hp <= 0)){
      log("<span class=gicon-skull></span> ทีมผู้เล่นพ่ายแพ้...", "system");
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
    log(`<span class=gicon-skull></span> ${user.name} เรียกลูกน้อง 2 ตัวออกมา (Passive)`, "enemy");

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
    log(`<span class=gicon-skull></span> ${user.name} ซัมมอนลูกน้อง 1 ตัว (Passive MidBoss)`, "enemy");

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
    log(`<span class=gicon-skull></span> ${user.name} ซัมมอนลูกน้อง 1 ตัว (Passive BigBoss)`, "enemy");

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
    log(`<span class=gicon-crown></span> ${user.name} ซัมมอน MiniBoss ลูกน้องออกมา!`, "enemy");

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
      log(`<span class=gicon-shield></span> ${user.name} เปิดใช้ Shadow Shield (+${shield} Shield ครั้งเดียว)`, "enemy");
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
        //  HP < 30%  ทีมสับสนทั้งทีม
        log(`<span class=gicon-wolf></span> ${user.name} ปล่อยพลังสะกด! ผู้เล่นทั้งทีมสับสนและหันมาตีกันเอง!`, "enemy");
        for (let attacker of players) {
          let target = players[Math.floor(Math.random() * players.length)];
          while (target === attacker) {
            target = players[Math.floor(Math.random() * players.length)];
          }
          let dmg = Math.max(1, attacker.atk - target.def);
          dmg = Math.floor(dmg * 1.5); // แรงขึ้น
          await applyDamage(attacker, target, dmg, `<span class=gicon-impact></span> ${attacker.name} (สับสน) โจมตี ${target.name} -${dmg} HP`, { noMove:true });
        }
      } else {
        //  ปกติ  แค่ 1 คนสับสน
        const attacker = players[Math.floor(Math.random() * players.length)];
        let target = players[Math.floor(Math.random() * players.length)];
        while (target === attacker) {
          target = players[Math.floor(Math.random() * players.length)];
        }
        let dmg = Math.max(1, attacker.atk - target.def);
        log(`<span class=gicon-wolf></span> ${user.name} ทำให้ ${attacker.name} สับสน! โจมตี ${target.name} -${dmg} HP`, "enemy");
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