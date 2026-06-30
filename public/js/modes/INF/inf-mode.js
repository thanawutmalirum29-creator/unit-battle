let deck = JSON.parse(localStorage.getItem("deck") || "[]");
let selectedIndexes = [];
const maxTeamSize = 4;

let currentInfStage = 1;
let enemyTeam = [];
let playerTeam = [];
let battleRunning = false;
let autoMode = false;
let roundCount = 1;

function startInfAuto() {
  autoMode = true;
  startInfGame();
}

/* ============================
   START GAME
   ============================ */
function startInfGame() {
  if (selectedIndexes.length === 0) {
    alert("กรุณาเลือกทีมก่อน!");
    return;
  }
  currentInfStage = 1;
  GameAPI.infRunStart(); // server-tracked run starts here — server times the whole run, not the client
  document.getElementById("cancelBattleBtn").style.display = "inline-block";
  setInfStage(currentInfStage);
}

function setInfStage(n) {
  if (battleRunning) return;
  currentInfStage = n;
  document.getElementById("cancelBattleBtn").style.display = "inline-block";
  prepareInfBattle();
  startInfBattle();
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
   PREPARE BATTLE
   ============================ */
function prepareInfBattle() {
  const enemyData = INF_STAGES[currentInfStage];
  if (!enemyData) {
    alert("ไม่มีสเตจนี้");
    return;
  }

  const stageReward = INF_STAGE_REWARDS[currentInfStage] || 10;

  enemyTeam = enemyData.map((e, i) => {
    const baseReward = Math.floor(stageReward / enemyData.length);
    const bounty = Math.floor(baseReward * randomBetween(0.8, 1.2));
    return {
      ...e,
      maxHp: e.hp,
      defBase: e.def,
      instanceId: `E-${currentInfStage}-${i}`,
      tempDef: 0,
      cooldown: 0,
      isEnemy: true,
      statusEffects: [],
      reward: bounty
    };
  });

  if (currentInfStage === 1 || playerTeam.length === 0) {
    playerTeam = selectedIndexes.map((id, idx) => {
      const card = deck.find(c => c.id === id);
      if (!card) return null;

      const finalStats = getRenderStats(card);

      return {
        ...card,
        hp: finalStats.hp,
        atk: finalStats.atk,
        def: finalStats.def,
        maxHp: finalStats.hp,
        defBase: finalStats.def,
        skill: card.skill || null,
        instanceId: `P-${idx}`,
        tempDef: 0,
        cooldown: 0,
        isEnemy: false,
        statusEffects: [],
      };
    }).filter(c => c !== null);
  }

  renderBattlefield();
  log(`🌀 เตรียมทีม — INF Stage ${currentInfStage}`, "system");
  document.getElementById("infStageInfo").innerText = `Stage ${currentInfStage}`;
}

// ฟังก์ชันช่วยสุ่มเลขทศนิยม
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/* ============================
   BATTLE LOOP
   ============================ */
async function startInfBattle() {
  if (battleRunning) {
    alert("การต่อสู้กำลังดำเนินอยู่");
    return;
  }
  if (!playerTeam || playerTeam.length === 0) {
    alert("ยังไม่ได้เลือกทีม");
    return;
  }
  if (!enemyTeam || enemyTeam.length === 0) {
    alert("ยังไม่มีศัตรู");
    return;
  }

  document.getElementById("battleLog").innerHTML = "";
  battleRunning = true;
  log(`⚔️ เริ่มสู้ INF Stage ${currentInfStage} !`, "system");
  renderBattlefield();
  updateResult("");

  playerTeam.forEach((p) => {
    p.tempDef = p.tempDef || 0;
    p.cooldown = p.cooldown || 0;
  });
  enemyTeam.forEach((e) => {
    e.hp = e.hp;
    e.tempDef = e.tempDef || 0;
    e.cooldown = e.cooldown || 0;
  });

  let turn = 1;
  while (battleRunning) {
    log(`--- เทิร์น ${turn} ---`, "system");

    let turnOrder = [];
    let pAlive = playerTeam.filter((p) => p.hp > 0);
    let eAlive = enemyTeam.filter((e) => e.hp > 0);
    let maxLen = Math.max(pAlive.length, eAlive.length);

    for (let i = 0; i < maxLen; i++) {
      if (pAlive[i]) turnOrder.push(pAlive[i]);
      if (eAlive[i]) turnOrder.push(eAlive[i]);
    }

    for (let actor of turnOrder) {
      if (actor.hp <= 0) continue;
      let allies = actor.isEnemy ? enemyTeam : playerTeam;
      let enemies = actor.isEnemy ? playerTeam : enemyTeam;

      applyStatusEffects(actor);

      if (actor.skipTurn) {
        actor.skipTurn = false;
        continue;
      }
      if (!enemies.some((t) => t.hp > 0)) break;

      if (actor.cooldown && actor.cooldown > 0) {
        if (isHealer(actor)) {
          healerIdle(actor);
        } else {
          await normalAttack(actor, enemies);
        }
      } else {
        const used = await useSkill(actor, allies, enemies);

        if (used) {
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
          if (isHealer(actor)) {
            healerIdle(actor);
          } else {
            await normalAttack(actor, enemies);
          }
        }
      }

      if (!playerTeam.some((p) => p.hp > 0)) {
        log("💀 ทีมผู้เล่นพ่ายแพ้ทั้งหมด...", "system");
        updateResult("💀 คุณแพ้... เริ่มใหม่ที่ Stage 1");
        endInfBattle(false);
        return;
      }
      if (!enemyTeam.some((e) => e.hp > 0)) {
        log("🎉 ทีมศัตรูพ่ายแพ้ทั้งหมด!", "system");
        updateResult("🎉 คุณชนะ!");

        // แจกค่าหัวศัตรูแต่ละตัว
        let totalReward = enemyTeam.reduce((sum, e) => sum + (e.reward || 0), 0);
        addMoney(totalReward);
        updateMoneyUI();

        GameAPI.infStageClear(currentInfStage); // server validates order + timing before counting it
        endInfBattle(true);
        return;
      }

      await delay(getBattleSpeed());
    }

    endRoundAll();
    turn++;
    await delay(400);
  }
}

function endRound() {
  roundCount++;

  [...playerTeam, ...enemyTeam].forEach(actor => {
    if (actor.cooldown > 0) {
      actor.cooldown--;
    }
    if (actor.statusEffects) {
      actor.statusEffects.forEach(eff => eff.turns--);
      actor.statusEffects = actor.statusEffects.filter(eff => eff.turns > 0);
    }
  });
}

/* ============================
   END BATTLE
   ============================ */
function endInfBattle(win = false) {
  battleRunning = false;
  document.getElementById("cancelBattleBtn").style.display = "none";

  if (win) {
    if (INF_STAGES[currentInfStage + 1]) {
      currentInfStage++;
      setInfStage(currentInfStage);
    } else {
      log("🏆 เคลียร์ครบทุก INF Stage!", "system");
      updateResult("🏆 เคลียร์ครบทุก INF Stage!");
      GameAPI.infRunFinish(); // no more stages left — run is over, lock in the score
      if (!autoMode) alert("🎉 คุณชนะทุกด่านแล้ว! เกมจบ");
      setTimeout(() => {
        currentInfStage = 1;
        playerTeam = [];
        enemyTeam = [];
        renderBattlefield();
        if (autoMode) startInfGame();
      }, 2000);
    }
  } else {
    log("💀 ทีมผู้เล่นพ่ายแพ้...", "system");
    updateResult("💀 แพ้... เริ่มใหม่ที่ Stage 1");
    GameAPI.infRunFinish(); // run ends on death — score is whatever max_stage the server already has
    if (!autoMode) alert("💀 แพ้... เริ่มใหม่ที่ Stage 1");
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
document.getElementById("cancelBattleBtn").addEventListener("click", () => {
  if (confirm("คุณต้องการยกเลิกการต่อสู้หรือไม่?")) {
    cancelInfBattle();
  }
});

function cancelInfBattle() {
  battleRunning = false;
  document.getElementById("cancelBattleBtn").style.display = "none";
  log("⚠️ คุณกดยกเลิกการต่อสู้", "system");
  updateResult("❌ การต่อสู้ถูกยกเลิก");
  GameAPI.infRunFinish(); // cancelled run still gets closed out server-side, scored at current max_stage
  setTimeout(() => {
    currentInfStage = 1;
    playerTeam = [];
    enemyTeam = [];
    renderBattlefield();
  }, 1000);
}

/* ============================
   BATTLE SPEED
   ============================ */
const SPEEDS = { 1: 1300, 2: 1000, 3: 800, 4: 500 };
let speedMultiplier = parseInt(localStorage.getItem("speedMul") || "1", 10);

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
renderDeck();
updateBagUI();