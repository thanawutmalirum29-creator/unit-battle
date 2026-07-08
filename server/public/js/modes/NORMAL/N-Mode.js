// 🟢 var แทน let/const ตรงนี้ เพราะหน้ารวมโหมด (game.html) โหลดสคริปต์ของทั้ง 3 โหมด
// ไว้ในเอกสารเดียวกัน — ชื่อพวกนี้ซ้ำกับ boss.js/inf-mode.js ถ้าประกาศด้วย let/const
// จะเกิด SyntaxError ทันที (redeclare ไม่ได้ข้าม <script> ในเอกสารเดียวกัน) ส่วน var
// ประกาศซ้ำได้ปกติ ไม่มีปัญหาอะไร เพราะจริงๆ ก็ตั้งใจให้เป็นตัวแปร global ร่วมกันอยู่แล้ว
var deck = JSON.parse(localStorage.getItem("deck") || "[]");            
var selectedIndexes = loadSelectedTeam("normal"); // เด็คที่เลือกใช้ในหน้านี้ (จัดไว้จากหน้า "จัดเด็ค")
var maxTeamSize = 4;
var currentStage = null;
var enemyTeam = [];           
var playerTeam = [];           // team chosen for battle (cloned)
var battleRunning = false;
var unlockedStage = parseInt(localStorage.getItem("unlockedStage") || "1");
var roundCount = 1;
/* ============================
   STAGE SELECTION
   ============================ */

function setStage(n){
  if (battleRunning){ alert("ไม่สามารถเปลี่ยนสเตจขณะต่อสู้ได้"); return; }
  if (!STAGES[n]){ alert("ไม่มีสเตจนี้"); return; }
  currentStage = n;
  prepareBattle();
  document.querySelectorAll(".stage-list button").forEach(b => b.classList.remove("stage-selected"));
  document.getElementById("btn-stage-" + n)?.classList.add("stage-selected");
  startBattle()
}



function prepareBattle(){
  if (!currentStage){ alert("กรุณาเลือกสเตจก่อน"); return; }
  if (selectedIndexes.length === 0){  return; }

  enemyTeam = STAGES[currentStage].map((e,i)=> {
  const inst = deepClone(e);
  inst.instanceId = "E-"+currentStage+"-"+i+"-"+Date.now();
  inst.maxHp = inst.hp;
  inst.defBase = inst.def;
  inst.tempDef = 0;
  inst.cooldown = 0;
  inst.isEnemy = true;
  inst.statusEffects = [];  
  return inst;
});

playerTeam = selectedIndexes.map((cardId, i) => {
  const originalDeck = JSON.parse(localStorage.getItem("deck") || "[]");
  const found = originalDeck.find(d => d.id === cardId);
  if (!found) return null;
  const c = deepClone(found);

  // 🟢 คำนวณค่าสุดท้ายจากอุปกรณ์
  const finalStats =getRenderStats(c);
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
renderBattlefield();
logClear();
log(`🛡️ เตรียมทีมเสร็จ — สเตจ ${currentStage}`, "system");
log(`👥 ทีมผู้เล่น: ${playerTeam.map(x=>x.name).join(", ")}`, "system");
log(`👾 ทีมศัตรู: ${enemyTeam.map(x=>x.name).join(", ")}`, "system");}

async function startBattle(){
  if (battleRunning){ alert("การต่อสู้กำลังดำเนินอยู่"); return; }
  if (!currentStage){ alert("กรุณาเลือกสเตจก่อน"); return; }
  if (!playerTeam || playerTeam.length === 0){ alert("จัดเตรียมทีมให้เรียบ"); return; }
  if (!enemyTeam || enemyTeam.length === 0){ alert("ยังไม่มีศัตรู — กดเตรียมทีมและศัตรูก่อน"); return; }

  // 🔐 เซิฟเป็นคนรันผลจริง — ต้องมีการ์ดที่เลือกไว้จริง (ไม่เกิน 4 ตัว ไม่ซ้ำ) ส่งไปให้เซิฟ
  // ตรวจสอบว่ามีอยู่ในเด็คจริงก่อน แล้วสร้างทีม/คำนวณ stat เองจาก deck+equips ที่เก็บไว้
  const cardIds = selectedIndexes.slice(0, maxTeamSize);
  const startRes = await GameAPI.battleStart("normal", cardIds, { stage: currentStage });
  if (!startRes || startRes.error) {
    alert("เริ่มการต่อสู้ไม่สำเร็จ: " + (startRes?.error || "ไม่ทราบสาเหตุ (เช็คอินเทอร์เน็ต/ล็อกอิน)"));
    return;
  }
  const battleId = startRes.battleId;

  battleRunning = true;
  if (window.HubUI) { HubUI.enterBattle(); HubUI.resetDamageStats(); HubUI.resetRewards(); }
  const cancelBtn = document.getElementById("cancelBattleBtn");
  cancelBtn.style.display = "inline-block";
  cancelBtn.onclick = async () => {
    if (await uiConfirm("คุณต้องการยกเลิกการต่อสู้หรือไม่?")) {
      log("⚠️ การต่อสู้ถูกยกเลิก", "system");
      updateResult("❌ คุณยกเลิกการต่อสู้");
      GameAPI.battleForfeit(battleId); // fire-and-forget
      if (window.HubUI) {
        HubUI.showResults({
          win: false,
          cancelled: true,
          title: "❌ คุณยกเลิกการต่อสู้",
          extraNote: "การยกเลิกกลางคันนับเป็นแพ้ — ได้รางวัลเท่าที่สะสมไว้เท่านั้น",
          playerTeam: [...playerTeam],
          enemyTeam: [...enemyTeam],
        });
      }
      endBattlecancle(false);
    }
  };
  logClear();
  log(`⚔️ เริ่มสู้ สเตจ ${currentStage} !`, "system");

  // sync กับ snapshot เริ่มต้นที่เซิฟสร้างจริง (แทนของที่เตรียมไว้ฝั่ง client)
  playerTeam = startRes.playerTeam;
  enemyTeam = startRes.enemyTeam;
  renderBattlefield();
  updateResult("");

  let turn = 1;
  while (battleRunning) {
    log(`--- เทิร์น ${turn} ---`, "system");

    const turnRes = await GameAPI.battleTurn(battleId);
    if (!turnRes || turnRes.error) {
      log(`⚠️ เชื่อมต่อเซิฟไม่ได้ (${turnRes?.error || "network"}) — หยุดการต่อสู้`, "system");
      updateResult("⚠️ เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
      endBattlecancle(false);
      return;
    }

    // เล่น log ของเทิร์นนี้ทีละบรรทัด (แทน animation ทีละสกิลแบบเดิม เพราะผลจริงคำนวณที่เซิฟแล้ว)
    for (const entry of (turnRes.log || [])) {
      log(entry.msg, entry.side);
      await delay(Math.max(120, getBattleSpeed() * 0.25));
    }

    // 🔧 FIX: เล่นแอนิเมชันโจมตี/ตัวเลขดาเมจจริงจากเหตุการณ์ที่เซิฟส่งกลับมา (เดิมหายไปเพราะ
    // battle ย้ายไปรันที่เซิฟแล้วไม่มีอะไรเรียก skills/attack.js อีก) และ sync สถิติดาเมจ
    // "ทำ/รับ" ต่อหน่วยไปหน้าสรุปผล (เดิมค้าง 0/0 เพราะ ctx.trackDamage ฝั่งเซิฟเป็น no-op)
    if (window.HubUI) HubUI.setDamageStats(turnRes.damageStats);
    if (typeof playTurnEvents === "function") await playTurnEvents(turnRes.events);

    playerTeam = turnRes.playerTeam;
    enemyTeam = turnRes.enemyTeam;
    renderBattlefield();

    if (turnRes.finished) {
      if (turnRes.win) {
        log("🎉 ทีมศัตรูพ่ายแพ้ทั้งหมด!", "system");
        updateResult("🎉 คุณชนะ!");
        if (currentStage >= unlockedStage) {
          unlockedStage = currentStage + 1;
          localStorage.setItem("unlockedStage", unlockedStage);
        }
        // 💰🧩 รางวัลนี้เซิฟจ่ายจริงไปแล้วตอนรันเทิร์นสุดท้าย (ดู routes/battle.js) แค่โชว์ผลที่ได้กลับมา
        const rewards = turnRes.rewards;
        if (rewards) {
          applyServerMoney(rewards.money);
          applyServerBag(rewards.bag);
          for (const [key, amount] of Object.entries(rewards.drops || {})) {
            log(`🎁 ได้ ${amount}x ${key}`, "system");
          }
          if (window.HubUI) HubUI.addReward(rewards.moneyGain, rewards.drops);
        }
        if (window.HubUI) {
          HubUI.showResults({
            win: true,
            title: "🎉 คุณชนะ!",
            playerTeam: [...playerTeam],
            enemyTeam: [...enemyTeam],
          });
        }
      } else {
        log("💀 ทีมผู้เล่นพ่ายแพ้ทั้งหมด...", "system");
        updateResult("💀 คุณแพ้... ลองใหม่อีกครั้ง");
        if (window.HubUI) {
          HubUI.showResults({
            win: false,
            title: "💀 คุณแพ้... ลองใหม่อีกครั้ง",
            playerTeam: [...playerTeam],
            enemyTeam: [...enemyTeam],
          });
        }
      }
      endBattle(turnRes.win);
      return;
    }

    turn++;
    await delay(400);
  }
}

function endBattle(win=false){
  battleRunning = false;
document.getElementById("cancelBattleBtn").style.display = "none";
  setTimeout(() => {
    playerTeam = [];
    enemyTeam = [];
    renderBattlefield();
    renderStageButtons(); // อัปเดตสถานะปุ่มสเตจ
  }, 500);
}

function endBattlecancle (win=false){
  battleRunning = false;
document.getElementById("cancelBattleBtn").style.display = "none";
  
    playerTeam = [];
    enemyTeam = [];
    renderBattlefield();
    renderStageButtons(); 
}
// 🟢 การกด cancelBattleBtn ตอนนี้ผูก onclick ไว้ตรงจุดเริ่มสู้ใน startBattle() แทน
// (ดูด้านบน) เพราะหน้ารวมโหมดใช้ปุ่มยกเลิกร่วมกันทั้ง 3 โหมด — ใครเริ่มสู้ล่าสุด
// onclick จะชี้ไปที่โหมดนั้นเสมอ ไม่ต้องมี addEventListener ซ้อนกันหลายชั้น

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

/* ============================
   Initialization
   ============================ */
updateBagUI();
renderStageButtons();
updateMoneyUI();

// 🟢 localStorage เป็นแค่ cache ฝั่งเครื่อง — ด่านที่ปลดล็อคจริงถูกบันทึกไว้ในเซิร์ฟเวอร์แล้ว
// (ทุกครั้งที่ชนะจะยิง GameAPI.reportNormalClear) แต่ก่อนหน้านี้ไม่เคยมีการดึงค่านั้นกลับมาโหลด
// เลย ทำให้เปิดเกมบนเครื่อง/เบราว์เซอร์/การติดตั้ง PWA อื่น หรือหลังเคลียร์ข้อมูลเบราว์เซอร์
// แล้วเห็นเหมือนด่านที่ปลดล็อคหายไปทั้งที่เซิร์ฟเวอร์ยังมีอยู่ — ตรงนี้ดึงค่าจากเซิร์ฟเวอร์มา
// เทียบกับ localStorage แล้วใช้ค่าที่มากกว่า (กันเคสออฟไลน์ที่ localStorage อาจนำหน้าชั่วคราว)
(async () => {
  const { maxStage, ok } = await GameAPI.fetchNormalProgress();
  if (!ok) return; // ออฟไลน์ / ยังไม่ได้ล็อกอิน — เล่นต่อด้วยค่า localStorage เดิมไปก่อน
  const serverUnlocked = maxStage + 1;
  if (serverUnlocked > unlockedStage) {
    unlockedStage = serverUnlocked;
    localStorage.setItem("unlockedStage", unlockedStage);
    renderStageButtons();
  }
})();

// allow Start Battle from UI buttons