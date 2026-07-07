// 🟢 var แทน let/const: ชื่อพวกนี้ซ้ำกับ N-Mode.js/boss.js ในหน้ารวมโหมด (game.html)
var deck = JSON.parse(localStorage.getItem("deck") || "[]");
var selectedIndexes = loadSelectedTeam("inf"); // เด็คที่เลือกใช้ในหน้านี้ (จัดไว้จากหน้า "จัดเด็ค")
var maxTeamSize = 4;

var currentInfStage = 1;
var enemyTeam = [];
var playerTeam = [];
var battleRunning = false;
var autoMode = false;
var roundCount = 1;

function startInfAuto(startStage = 1) {
  autoMode = true;
  startInfGame(startStage);
}

/* ============================
   START GAME
   startStage: 1, or an unlocked checkpoint (25, 50, 75, ...)
   ============================ */
var currentInfRunId = null;
var currentInfBattleId = null;

async function startInfGame(startStage = 1) {
  if (selectedIndexes.length === 0) {
    alert("กรุณาเลือกทีมก่อน!");
    return;
  }
  if (battleRunning) return;

  // 🚫 กันเหนียว: selectedIndexes ใช้ localStorage ร่วมกับโหมด NORMAL/BOSS ถ้า
  // ผู้เล่นเลือกทีมที่มีตัวยืมไว้จากหน้าอื่นแล้วสลับมาหน้า INF โดยตรง (ไม่ผ่านการ
  // คลิกเลือกใน render.js ที่บล็อกไว้แล้ว) ให้เอาตัวยืมออกจากทีมตรงนี้อีกชั้น
  const deckNow = JSON.parse(localStorage.getItem("deck") || "[]");
  const hasBorrowedSelected = selectedIndexes.some(id => {
    const c = deckNow.find(c => c.id === id);
    return c && c.borrowed;
  });
  if (hasBorrowedSelected) {
    selectedIndexes = selectedIndexes.filter(id => {
      const c = deckNow.find(c => c.id === id);
      return !(c && c.borrowed);
    });
    localStorage.setItem("selectedIndexes", JSON.stringify(selectedIndexes));
    alert("ตัวละครที่ยืมมาจากเพื่อนไม่สามารถใช้ในด่าน INF ได้ ถูกเอาออกจากทีมให้แล้ว กรุณาเลือกทีมใหม่");
    if (typeof renderDeck === "function") renderDeck();
    return;
  }

  // 🔧 เดิมเรียก GameAPI.infRunStart() (routes/runs.js — เช็คแค่จังหวะเวลา ไม่รู้ว่าสู้จริงไหม)
  // ตอนนี้เซิฟรันการต่อสู้จริงเองทีละเทิร์น (routes/battle.js) — เริ่ม run ใหม่ตรงนี้เลย
  currentInfRunId = null;
  currentInfBattleId = null;
  const startRes = await GameAPI.battleStart("inf", selectedIndexes, { stage: startStage });
  if (!startRes || startRes.error) {
    alert("❌ " + (startRes?.error || "เริ่มเกมไม่สำเร็จ (เช็คอินเทอร์เน็ต/ล็อกอิน)"));
    autoMode = false;
    return;
  }
  currentInfRunId = startRes.runId;
  currentInfBattleId = startRes.battleId;
  playerTeam = startRes.playerTeam;
  enemyTeam = startRes.enemyTeam;

  currentInfStage = startStage;
  if (window.HubUI) { HubUI.enterBattle(); HubUI.resetDamageStats(); HubUI.resetRewards(); }
  document.getElementById("cancelBattleBtn").style.display = "inline-block";
  logClear?.();
  log(`⚔️ เริ่มสู้ INF Stage ${currentInfStage} !`, "system");
  renderBattlefield();
  document.getElementById("infStageInfo").innerText = `Stage ${currentInfStage}`;
  runInfBattleLoop();
}

// เข้าด่านถัดไปในรันเดียวกัน (runId เดิม) — ต่างจาก startInfGame ตรงที่ไม่สร้าง run ใหม่
async function setInfStage(n) {
  if (battleRunning) return;
  currentInfStage = n;
  const cancelBtn = document.getElementById("cancelBattleBtn");
  cancelBtn.style.display = "inline-block";
  cancelBtn.onclick = async () => {
    if (await uiConfirm("คุณต้องการยกเลิกการต่อสู้หรือไม่?")) {
      cancelInfBattle();
    }
  };

  const startRes = await GameAPI.battleStart("inf", selectedIndexes, { stage: n, runId: currentInfRunId });
  if (!startRes || startRes.error) {
    alert("❌ " + (startRes?.error || "ไปด่านถัดไปไม่สำเร็จ"));
    return;
  }
  currentInfRunId = startRes.runId;
  currentInfBattleId = startRes.battleId;
  playerTeam = startRes.playerTeam;
  enemyTeam = startRes.enemyTeam;

  logClear?.();
  log(`⚔️ เริ่มสู้ INF Stage ${currentInfStage} !`, "system");
  renderBattlefield();
  document.getElementById("infStageInfo").innerText = `Stage ${currentInfStage}`;
  runInfBattleLoop();
}

const STAGE1_FIXED_STATS = {
  Tank: { hp: 160, atk: 18, def: 16 },
  Warrior: { hp: 120, atk: 24, def: 12 },
  Healer: { hp: 96, atk: 16, def: 10 },
  Rogue: { hp: 92, atk: 44, def: 6 },
  Summoner: { hp: 104, atk: 8, def: 6 },
  Trickster: { hp: 96, atk: 16, def: 9 },
  Assassin: { hp: 99, atk: 19, def: 5 },
  CC: { hp: 100, atk: 16, def: 9 },
  Bomb: { hp: 84, atk: 40, def: 4 },
  
  Mage: { hp: 88, atk: 16, def: 6 },
  Helper: { hp: 96, atk: 16, def: 9 }
};
// สกิลฐาน ไม่รวม L1-L3
const STAGE1_BASE_SKILLS = {
  Tank: ["Defense Buff", "AOE Defense Buff"],
  Warrior: ["Power Strike", "AOE Attack", "Mirror", "Double Strike"],
  Healer: ["Heal", "AOE Heal", "Revive", "Revive"],
  Rogue: ["Critical", "Piercing Shot", "3 hit target"],
  Summoner: ["Summon"],
  Trickster: ["Poison", "Silence", , "Charm", "Blood Tribute", "AOE Silence"],
  Assassin: ["Critical", "Power Strike", "Double Strike", "Lifesteal"],
  
  CC: ["Stun", "Time Stop", "AOE Stun", "AOE Time Stop"],
  Bomb: ["Bomb"],
  Mage: ["Burn"],
  Helper: ["Cleanse", "Skill Boost", "Energy Boost"]
};

// ฟังก์ชันสุ่มเวอร์ชัน L1-L3 ตามเปอร์เซ็นต์ด่าน
function getSkillVersion(baseSkill, percent) {
  const rand = Math.random() * 100;
  let level = "L1";
  
  if (percent <= 20) {
    if (rand <= 80) level = "L1";
    else if (rand <= 95) level = "L2";
    else level = "L3";
  } else if (percent <= 40) {
    if (rand <= 60) level = "L1";
    else if (rand <= 90) level = "L2";
    else level = "L3";
  } else if (percent <= 60) {
    if (rand <= 40) level = "L1";
    else if (rand <= 90) level = "L2";
    else level = "L3";
  } else if (percent <= 80) {
    if (rand <= 20) level = "L1";
    else if (rand <= 85) level = "L2";
    else level = "L3";
  } else {
    if (rand <= 0) level = "L1";
    else if (rand <= 49) level = "L2";
    else level = "L3";
  }
  
  return `${baseSkill} ${level}`;
}

function generateInfStage(stageNumber, teamSize = 4) {
  const enemies = [];
  const POSITION_POOLS = [
    ["Tank", "Warrior"],
    ["Warrior", "Assassin",  "Trickster","Helper", "CC"],
    ["Rogue", "Trickster","Helper", "Bomb", "Healer", "Mage", "CC"],
    ["Rogue", "Trickster","Helper", "Bomb", "Healer", "Mage", "Summoner", "CC"]
  ];
  
  const usedClasses = new Set();
  
  for (let i = 0; i < teamSize; i++) {
    let pool = POSITION_POOLS[i] || Object.keys(STAGE1_FIXED_STATS);
    const available = pool.filter(cls => !usedClasses.has(cls));
    if (available.length === 0) available.push(...pool);
    
    const cls = available[Math.floor(Math.random() * available.length)];
    usedClasses.add(cls);
    
    const base = STAGE1_FIXED_STATS[cls];
    const scale = 1 + (stageNumber - 1) * 0.05;
    
    const hp = Math.floor(base.hp * scale);
    const atk = Math.floor(base.atk * scale);
    const def = Math.floor(base.def * scale);
    
    const stagePercent = (stageNumber / 50) * 100; // ใช้สำหรับสกิล L1-L3
    const baseSkills = STAGE1_BASE_SKILLS[cls];
    const skill = getSkillVersion(baseSkills[Math.floor(Math.random() * baseSkills.length)], stagePercent);
    
    enemies.push({
      name: `${cls} Lv${stageNumber}`,
      class: cls,
      hp,
      atk,
      def,
      skill,
      reward: Math.floor(stageNumber * 10 + Math.random() * 10)
    });
  }
  
  return enemies;
}

// สร้างด่านทั้งหมด
const MAX_INF_STAGE = 1000;
const INF_STAGES = {};
const INF_STAGE_REWARDS = {};

for (let s = 1; s <= MAX_INF_STAGE; s++) {
  INF_STAGES[s] = generateInfStage(s, 4);
  INF_STAGE_REWARDS[s] = s * 10 + Math.floor(Math.random() * 5);
}

/* ============================
   INF SHARD DROPS
   - ทุกด่านดรอปชาร์ด สุ่มชนิด (จาก 6 ชนิด) และสุ่มจำนวนชิ้นตามช่วงด่าน
   - ด่านสุดท้าย (MAX_INF_STAGE) ดรอปการันตีครบทุกชนิด ชนิดละ 1 ชิ้น
   ============================ */
const INF_SHARD_TYPES = ["shardGray", "shardBlue", "shardPurple", "shardGold", "shardRed","shardSky"];

// ช่วงด่าน -> จำนวนชิ้นที่ดรอป (ต่อครั้งที่ชนะ) ปรับ/เพิ่มช่วงต่อได้ตามต้องการในอนาคต
const INF_SHARD_PIECE_RANGES = [
  { min: 1,   max: 99,   pieces: [1, 3] },
  { min: 100, max: 222,  pieces: [2, 4] },
  { min: 223, max: 500,  pieces: [3, 5] },
  { min: 501, max: Infinity, pieces: [4, 5] }, // ตั้งแต่ 501 เป็นต้นไป (รวมถึงหากขยาย MAX_INF_STAGE เพิ่มในอนาคต)
];

function getInfShardPieceRange(stage) {
  for (const r of INF_SHARD_PIECE_RANGES) {
    if (stage >= r.min && stage <= r.max) return r.pieces;
  }
  return INF_SHARD_PIECE_RANGES[INF_SHARD_PIECE_RANGES.length - 1].pieces;
}

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// สุ่มดรอปชาร์ดสำหรับด่าน INF หนึ่งด่าน
function generateInfShardDrop(stage) {
  // ด่านสุดท้ายสุด: การันตีครบทุกชนิด ชนิดละ 1 ชิ้น
  if (stage === MAX_INF_STAGE) {
    const finalDrop = {};
    INF_SHARD_TYPES.forEach(type => { finalDrop[type] = 1; });
    return finalDrop;
  }

  const [minPieces, maxPieces] = getInfShardPieceRange(stage);
  const totalPieces = randomIntInclusive(minPieces, maxPieces);

  const drop = {};
  for (let i = 0; i < totalPieces; i++) {
    const type = INF_SHARD_TYPES[Math.floor(Math.random() * INF_SHARD_TYPES.length)];
    drop[type] = (drop[type] || 0) + 1;
  }
  return drop;
}

/* ============================
   PREPARE BATTLE
   ============================ */
// 🔧 prepareInfBattle() เดิมอยู่ตรงนี้ (สร้าง enemyTeam/playerTeam จาก INF_STAGES ในเครื่อง)
// ลบออกแล้ว เพราะตอนนี้ GameAPI.battleStart("inf", ...) ให้ทีมที่เซิฟสร้างจริงมาแทน
// (ดู startInfGame()/setInfStage() ด้านบน)

// ฟังก์ชันช่วยสุ่มเลขทศนิยม
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

async function runInfBattleLoop() {
  if (battleRunning) return;
  battleRunning = true;
  updateResult("");

  let turn = 1;
  while (battleRunning) {
    log(`--- เทิร์น ${turn} ---`, "system");

    const turnRes = await GameAPI.battleTurn(currentInfBattleId);
    if (!turnRes || turnRes.error) {
      log(`⚠️ เชื่อมต่อเซิฟไม่ได้ (${turnRes?.error || "network"}) — หยุดการต่อสู้`, "system");
      endInfBattle(false);
      return;
    }

    for (const entry of (turnRes.log || [])) {
      log(entry.msg, entry.side);
      await delay(Math.max(120, getBattleSpeed() * 0.25));
    }

    playerTeam = turnRes.playerTeam;
    enemyTeam = turnRes.enemyTeam;
    renderBattlefield();

    if (turnRes.finished) {
      if (turnRes.win) {
        log("🎉 ทีมศัตรูพ่ายแพ้ทั้งหมด!", "system");
        updateResult("🎉 คุณชนะ!");
        renderInfCheckpoints(); // may have just unlocked a new checkpoint (every 25 stages)
        if (turnRes.rewards) {
          applyServerMoney(turnRes.rewards.money);
          applyServerBag(turnRes.rewards.bag);
          for (const [key, amount] of Object.entries(turnRes.rewards.drops || {})) {
            log(`🎁 ได้ ${amount}x ${key}`, "system");
          }
          if (window.HubUI) HubUI.addReward(turnRes.rewards.moneyGain, turnRes.rewards.drops);
        }
      } else {
        log("💀 ทีมผู้เล่นพ่ายแพ้ทั้งหมด...", "system");
        updateResult("💀 คุณแพ้... เริ่มใหม่ที่ Stage 1");
      }
      endInfBattle(turnRes.win);
      return;
    }

    turn++;
    await delay(400);
  }
}

/* ============================
   END BATTLE
   ============================ */
function endInfBattle(win = false) {
  battleRunning = false;
  document.getElementById("cancelBattleBtn").style.display = "none";

  if (win) {
    if (currentInfStage < MAX_INF_STAGE) {
      // ยังไม่ใช่จุดจบของรัน (ยังไปต่อได้) — ไปด่านถัดไปเลย ไม่ต้องโชว์สรุปผล
      // (สถิติดาเมจ/รางวัลสะสมต่อเนื่องไปจนกว่าจะตายจริงหรือกดยกเลิก)
      currentInfStage++;
      setInfStage(currentInfStage);
    } else {
      log("🏆 เคลียร์ครบทุก INF Stage!", "system");
      updateResult("🏆 เคลียร์ครบทุก INF Stage!");
      // 🔧 เดิมเรียก GameAPI.infRunFinish() ตรงนี้ แต่ routes/battle.js ปิด run ให้เองแล้ว
      // เมื่อไม่มีด่านถัดไป (ดู hasNextStage ใน turn handler)
      if (window.HubUI) {
        HubUI.showResults({
          win: true,
          title: "🏆 เคลียร์ครบทุก INF Stage!",
          playerTeam: [...playerTeam],
          enemyTeam: [...enemyTeam],
        });
      } else if (!autoMode) {
        alert("🎉 คุณชนะทุกด่านแล้ว! เกมจบ");
      }
      setTimeout(() => {
        currentInfStage = 1;
        playerTeam = [];
        enemyTeam = [];
        renderBattlefield();
        if (autoMode) startInfGame();
      }, 2000);
    }
  } else {
    log("💀 ทีมผู้เล่นพ่ายแพ้ทั้งหมด...", "system");
    updateResult("💀 แพ้... เริ่มใหม่ที่ Stage 1");
    // 🔧 เดิมเรียก GameAPI.infRunFinish() ตรงนี้ แต่ routes/battle.js ปิด run ให้เองแล้วตอนแพ้
    if (window.HubUI) {
      HubUI.showResults({
        win: false,
        title: "💀 คุณแพ้... เริ่มใหม่ที่ Stage 1",
        extraNote: `ไปได้ถึง INF Stage ${currentInfStage}`,
        playerTeam: [...playerTeam],
        enemyTeam: [...enemyTeam],
      });
    } else if (!autoMode) {
      alert("💀 แพ้... เริ่มใหม่ที่ Stage 1");
    }
    setTimeout(() => {
      currentInfStage = 1;
      playerTeam = [];
      enemyTeam = [];
      renderBattlefield();
      if (autoMode) startInfGame();
    }, 500);
  }
}

/* ============================
   CANCEL BATTLE
   ============================ */
// 🟢 การกด cancelBattleBtn ตอนนี้ผูก onclick ไว้ใน setInfStage() แทน (ดูด้านบน)
// เพราะหน้ารวมโหมดใช้ปุ่มยกเลิกร่วมกันทั้ง 3 โหมด

function cancelInfBattle() {
  battleRunning = false;
  document.getElementById("cancelBattleBtn").style.display = "none";
  log("⚠️ คุณกดยกเลิกการต่อสู้", "system");
  updateResult("❌ การต่อสู้ถูกยกเลิก");
  if (window.HubUI) {
    HubUI.showResults({
      win: false,
      cancelled: true,
      title: "❌ คุณยกเลิกการต่อสู้",
      extraNote: `ไปได้ถึง INF Stage ${currentInfStage} — ได้รางวัลเท่าที่สะสมไว้เท่านั้น`,
      playerTeam: [...playerTeam],
      enemyTeam: [...enemyTeam],
    });
  }
  GameAPI.battleForfeit(currentInfBattleId); // fire-and-forget — server closes the run at current max_stage
  setTimeout(() => {
    currentInfStage = 1;
    playerTeam = [];
    enemyTeam = [];
    renderBattlefield();
  }, 1000);
}

/* ============================
   CHECKPOINT START LIST (every 25 stages)
   Unlocked once the player has ever validated-cleared that stage server-side.
   ============================ */
let infBestStage = 0;

async function renderInfCheckpoints() {
  const wrap = document.getElementById("infCheckpointList");
  if (!wrap) return;

  wrap.innerHTML = '<span style="opacity:.6;font-size:13px">กำลังโหลดจุดเช็คพอยต์...</span>';

  const { maxStage, ok } = await GameAPI.fetchInfProgress();
  infBestStage = maxStage;
  const unlockedCount = Math.floor(infBestStage / 25);

  wrap.innerHTML = "";

  // เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ หรือยังไม่ได้ล็อกอิน — บอกผู้เล่นตรงๆ แทนที่จะโชว์เหมือน
  // ยังไม่เคยผ่านด่าน 25 (ซึ่งอาจทำให้ผู้เล่นที่เคยปลดล็อกไว้แล้วงงว่าความคืบหน้าหาย)
  if (!ok) {
    wrap.innerHTML = '<span style="opacity:.6;font-size:13px">⚠️ โหลดจุดเช็คพอยต์ไม่ได้ (ออฟไลน์ หรือยังไม่ได้ล็อกอิน) — เล่นได้ตั้งแต่ด่าน 1 ปกติ</span>';
    return;
  }

  if (unlockedCount === 0) {
    wrap.innerHTML = '<span style="opacity:.6;font-size:13px">ผ่านด่าน 25 เพื่อปลดล็อกจุดเริ่มต้น</span>';
    return;
  }

  for (let i = 1; i <= unlockedCount; i++) {
    const stageNum = i * 25;
    const btn = document.createElement("button");
    btn.textContent = "🚩 เริ่มด่าน " + stageNum;
    btn.onclick = () => startInfGame(stageNum);
    wrap.appendChild(btn);
  }
}

/* ============================
   BATTLE SPEED
   ============================ */
var SPEEDS = { 1: 1300, 2: 1000, 3: 800, 4: 500 };
var speedMultiplier = parseInt(localStorage.getItem("speedMul") || "1", 10);

function getBattleSpeed() {
  return SPEEDS[speedMultiplier] || 1200;
}

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
   INIT UI
   ============================ */
updateBagUI();
renderInfCheckpoints();