let deck = JSON.parse(localStorage.getItem("deck") || "[]");            
let selectedIndexes = [];   
const maxTeamSize = 4;
let currentStage = null;
let enemyTeam = [];           
let playerTeam = [];           // team chosen for battle (cloned)
let battleRunning = false;
let unlockedStage = parseInt(localStorage.getItem("unlockedStage") || "1");
let roundCount = 1;
/* ============================
   STAGE SELECTION
   ============================ */

function setStage(n){
  if (battleRunning){ alert("ไม่สามารถเปลี่ยนสเตจขณะต่อสู้ได้"); return; }
  if (!STAGES[n]){ alert("ไม่มีสเตจนี้"); return; }
  currentStage = n;
  prepareBattle();
  document.querySelectorAll(".stage-list button").forEach(b => b.style.outline = "none");
  document.getElementById("btn-stage-" + n).style.outline = "3px solid rgba(255,255,255,0.06)";
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

  battleRunning = true;
  document.getElementById("cancelBattleBtn").style.display = "inline-block";
  logClear();
  log(`⚔️ เริ่มสู้ สเตจ ${currentStage} !`, "system");
  renderBattlefield();
  updateResult("");

  // ensure starting states
  playerTeam.forEach(p => { p.hp = p.hp; p.tempDef = p.tempDef || 0; p.cooldown = p.cooldown || 0; });
  enemyTeam.forEach(e => { e.hp = e.hp; e.tempDef = e.tempDef || 0; e.cooldown = e.cooldown || 0; });

  let turn = 1;
  while (battleRunning){
    log(`--- เทิร์น ${turn} ---`, "system");

    // จัดลำดับสลับแบบข้ามเฉพาะตัวที่ยังมีชีวิต
    let turnOrder = [];
    let pAlive = playerTeam.filter(p => p.hp > 0);
    let eAlive = enemyTeam.filter(e => e.hp > 0);
    let maxLen = Math.max(pAlive.length, eAlive.length);

    for (let i = 0; i < maxLen; i++) {
      if (pAlive[i]) turnOrder.push(pAlive[i]);
      if (eAlive[i]) turnOrder.push(eAlive[i]);
    }

    // 🔁 ดำเนินการตามลำดับเทิร์น
    for (let actor of turnOrder){
      if (actor.hp <= 0) continue;
      let allies = actor.isEnemy ? enemyTeam : playerTeam;
      let enemies = actor.isEnemy ? playerTeam : playerTeam;
      enemies = actor.isEnemy ? playerTeam : enemyTeam;
      applyStatusEffects(actor);

      if (actor.skipTurn) {
        actor.skipTurn = false; 
        continue;
      }
      if (!enemies.some(t => t.hp > 0)) break;

      if (actor.cooldown && actor.cooldown > 0){
        if (isHealer(actor)) {
          healerIdle(actor);
        } else {
          await normalAttack(actor, enemies);
        }
      } else {
        const used = await useSkill(actor, allies, enemies);

        if (used) {
          // ✅ Trigger Counter
          const counters = (actor.isEnemy ? playerTeam : enemyTeam).filter(
            ally => ally.hp > 0 && ally.class === "Counter"
          );

          for (let counter of counters) {
            if (Math.random() < 0.3) {
              const counterDmg = Math.floor((counter.atk + (counter.tempAtk || 0)) * 1.3);
              log(`🔄 ${counter.name} (Counter) โจมตีสวนกลับใส่ ${actor.name}!`,
                  counter.isEnemy ? "enemy" : "player");

              await applyDamage(counter, actor, counterDmg,
                `💥 ${counter.name} โจมตีสวนกลับ → ${actor.name}`);
            }
          }
        } else {
          // ❌ ใช้สกิลไม่สำเร็จ → โจมตีธรรมดา
          if (isHealer(actor)) {
            healerIdle(actor);
          } else {
            await normalAttack(actor, enemies);
          }
        }
      }

      // ✅ ตรวจสอบเงื่อนไขจบการต่อสู้
      if (!playerTeam.some(p => p.hp > 0)){
        log("💀 ทีมผู้เล่นพ่ายแพ้ทั้งหมด...", "system");
        updateResult("💀 คุณแพ้... ลองใหม่อีกครั้ง");
        endBattle(false);
        return;
      }
      if (!enemyTeam.some(e => e.hp > 0)){
        log("🎉 ทีมศัตรูพ่ายแพ้ทั้งหมด!", "system");
        updateResult("🎉 คุณชนะ!");
        if (currentStage >= unlockedStage) {
          unlockedStage = currentStage + 1;
          localStorage.setItem("unlockedStage", unlockedStage);
        }
        GameAPI.reportNormalClear(currentStage); // server-side leaderboard record (fire-and-forget)

        // 💰🧩 เงิน+ดรอปตอนนี้เซิฟเป็นคนคำนวณและจ่ายจริง (กันแก้ STAGE_REWARDS/STAGE_DROPS ฝั่ง client)
        GameAPI.claimNormalReward(currentStage).then((result) => {
          if (result && result.ok) {
            applyServerMoney(result.money);
            applyServerBag(result.bag);
            for (const [key, amount] of Object.entries(result.drops || {})) {
              log(`🎁 ได้ ${amount}x ${key}`, "system");
            }
          } else {
            console.warn("[N-Mode] claim reward failed:", result?.error);
          }
        });

        endBattle(true);
        return;
      }

      await delay(getBattleSpeed());
    }

    // 🟢 จบรอบใหญ่ → ลด cooldown ของทุกตัว
   endRoundAll();
   renderBattlefield(); // ⏳ ให้ตัวเลขคูลดาวน์บนการ์ดอัปเดตทันทีตอนจบเทิร์นใหญ่

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
document.getElementById("cancelBattleBtn").addEventListener("click", () => {
  if(confirm("คุณต้องการยกเลิกการต่อสู้หรือไม่?")){
    log("⚠️ การต่อสู้ถูกยกเลิก", "system");
    updateResult("❌ คุณยกเลิกการต่อสู้");
    endBattlecancle(false);
  }
});

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

/* ============================
   Initialization
   ============================ */
updateBagUI();
renderDeck();
renderStageButtons();
updateMoneyUI();
// allow Start Battle from UI buttons