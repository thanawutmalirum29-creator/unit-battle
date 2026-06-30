function goBack(){
  if (document.referrer) {
    // ถ้ามี referrer → กลับไปหน้านั้น
    window.location.href = document.referrer;
  } else {
    // ถ้าไม่มี (เช่นเปิดตรงๆ) → กลับไปหน้า game.html เป็นค่า default
    window.location.href = "game.html";
  }
}

// === CONFIG ===
// base cost เริ่มต้นต่อแรร์ (จะเอามาคูณกับเลเวล)
const BASE_COST_BY_RARITY = {
  Common: 200,
  Rare: 450,
  Epic: 800,
  Legendary: 2000,
  Mythical: 4700,
  Cosmic: 12700
};

// ตาราง % ความสำเร็จต่อเลเวล (ทุกการ์ดใช้เหมือนกัน)
const SUCCESS_RATE_TABLE = {
  1: 90,
  2: 80,
  3: 70,
  4: 60,
  5: 50,
  6: 40,
  7: 30,
  8: 20,
  9: 10,
  10:5,
};
const DUPLICATE_COST_BY_RARITY = {
  Common: 6,
  Rare: 5,
  Epic: 4,
  Legendary: 3,
  Mythical: 2,
  Cosmic: 1
};

function calcUpgradeCost(card) {
  const rarity = card.rarity || "Common";
  const baseCost = BASE_COST_BY_RARITY[rarity] || 100;
  return Math.round(baseCost * (card.level ** 1.4) * (card.stars ** 3));
}
const MAX_LEVEL = 10;

let money = loadMoney();
let deck = JSON.parse(localStorage.getItem("deck") || "[]");
// === Growth config (ซ่อนไว้ ไม่ต้องแสดงบทบาท) ===
function rarityStep(c){
  switch(c.rarity){
    case "Mythical": return 1.002;
    case "Cosmic": return 1.0021;
    default: return 1;
  }
}

// เดาบทบาทครั้งแรกจากสเกลฐานของกาชา (ไม่ต้องโชว์)
function ensureRole(c){
  if (c.class) return c.class;
  const h = (c.hp  || 0) / 300; // สเกลคร่าว ๆ จากฐานในกาชา
  const a = (c.atk || 0) / 40;
  const d = (c.def || 0) / 20;
  c.class = (a>=h && a>=d) ? "Striker" : (d>=h && d>=a) ? "Tank" : "Balanced";
  return c.class;
}

function applyLevelGrowth(c){
  // ถ้าไม่มี hpReal → ใช้ hp เป็นค่าเริ่มต้น
  c.hpReal = c.hpReal ?? c.hp;
  c.atkReal = c.atkReal ?? c.atk;
  c.defReal = c.defReal ?? c.def;

  const r = rarityStep(c);

  // ✅ ใช้สูตรเดียวกันสำหรับทุกอาชีพ
  c.hpReal  = c.hpReal  * 1.029575 * r;
  c.atkReal = c.atkReal * 1.029575 * r;
  c.defReal = c.defReal * 1.029575 * r;

  // ปัดค่าใหม่กลับไปเก็บ
  c.hp  = Math.round(c.hpReal);
  c.atk = Math.round(c.atkReal);
  c.def = Math.round(c.defReal);
}
// ==== แก้ applyClassUpgrade ให้เรียกอันนี้แทน ====
function applyClassUpgrade(c) {
  applyLevelGrowth(c); 
}
// เวอร์ชันจำลองสำหรับพรีวิว
function simulateLevelGrowth(clone, nextLevel){
  const tmp = JSON.parse(JSON.stringify(clone));
  tmp.level = (typeof nextLevel === "number") ? nextLevel : tmp.level;
  applyLevelGrowth(tmp);
  return { hp: tmp.hp, atk: tmp.atk, def: tmp.def };
}
// === NEW: ฟังก์ชันแยกการ sort ===
function sortDeck() {
  const rarityOrder = { "Common": 1, "Rare": 2, "Epic": 3, "Legendary": 4, "Mythical": 5, "Cosmic": 6 };
  deck.sort((a, b) => {
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0); 
    if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
    const ra = rarityOrder[a.rarity] || 0;
    const rb = rarityOrder[b.rarity] || 0;
    return rb - ra;
  });
}


function renderDeck() {
  const div = document.getElementById("deck-wrapper");
  div.innerHTML = "";

  if (deck.length === 0) {
    div.innerHTML = "<div>ยังไม่มีการ์ดในเด็ค (ไปสุ่ม Gacha ก่อน)</div>";
    return;
  }

  deck.forEach((card, idx) => {
    if (!card.level) card.level = 1;
    if (!card.stars) card.stars = 1;

    const rarity = card.rarity || "Common";
    const isMaxed = card.maxed === true;

    // 🟢 การแสดงเลเวล
    let lvDisplay = "";
    if (isMaxed) {
      lvDisplay = "MAX";
    } else if (card.level >= MAX_LEVEL) {
      if (card.stars < 5) {
        lvDisplay = "MAX";
      } else if (card.stars < 8) {
        lvDisplay = "MAX ";
      } else {
        lvDisplay = "MAX";   // ⭐8 Lv.10 → MAX
        card.maxed = true;
      }
    } else {
      lvDisplay = `Lv.${card.level}`;
    }

    function getStarsDisplay(stars, isMaxed) {
      let out = (stars <= 5) ? "⭐".repeat(stars) : "🌟".repeat(stars - 5);
      return isMaxed ? `<span class="glow-stars">${out}</span>` : out;
    }
    const starsDisplay = getStarsDisplay(card.stars, isMaxed);

    let extraHTML = "";
    if (!isMaxed) {
      if (card.stars >= 8 && card.level >= MAX_LEVEL) {
        // 🟢 8⭐ Lv.10 → MAX ทันที ไม่ต้องอัปต่อ
        extraHTML = `<div class="meta" style="color:#ffd700;font-weight:bold;">MAX LEVEL</div>`;
        card.maxed = true;
      } else if (card.level >= MAX_LEVEL && card.stars >= 5 && card.stars < 8) {
        // ⭐5–7 ที่ Lv.10 → ใช้การ์ดซ้ำขึ้นดาว
        const sim = simulateNextUpgrade(card);
        const rarity = card.rarity || "Common";
const rarityFactor = DUPLICATE_COST_BY_RARITY[rarity] || 1;
const need = (card.stars - 4) * rarityFactor;
        const have = deck.filter((cc, j) => cc.name === card.name && j !== idx && !cc.locked).length;
        extraHTML = `
          <div class="meta" style="color:#ffeb3b;font-weight:bold;"></div>
          <div class="meta">🌟 ต้องใช้การ์ด: ${have}/${need}</div>
          <div class="meta">${sim.note}: HP → ${sim.next.hp} | ATK → ${sim.next.atk} | DEF → ${sim.next.def}</div>
          <div class="progress-bar"><div id="progress-${idx}" class="progress-fill" style="width:${Math.min(100,(have/need)*100)}%"></div></div>
          <button id="upgrade-btn-${idx}" onclick="upgradeCard(${idx})">⬆️ ขึ้นดาว</button>
        `;
      } else {
        // การอัปเกรดปกติ
        const cost = calcUpgradeCost(card);
      
const successRate = Math.max(1, (SUCCESS_RATE_TABLE[card.level] ?? 50) - (card.stars - 1) * Math.floor(10**1.1));


        const sim = simulateNextUpgrade(card);
        const maxNote = sim.willMax ? ` <span style="color:#80e27e;font-weight:bold;">→ จะเป็น MAX</span>` : "";

        // 🟢 เพิ่มส่วนการันตีด้วยชาร์ด
        const shardMap = {
          Common: "shardGray",
          Rare: "shardBlue",
          Epic: "shardPurple",
          Legendary: "shardGold",
          Mythical: "shardRed",
          Cosmic: "shardSky"
        };
        const rarity = card.rarity || "Common";
        const shardKey = shardMap[rarity];
        const bag = loadBag();
        const needShards = 10;
        const haveShards = bag[shardKey] || 0;

        extraHTML = `
          <div class="meta">💰 Cost: ${cost} | 🎯 Success: ${successRate}%</div>
          <div class="meta">: HP → ${sim.next.hp} | ATK → ${sim.next.atk} | DEF → ${sim.next.def}${maxNote}</div>
          <div class="progress-bar"><div id="progress-${idx}" class="progress-fill"></div></div>
          <button id="upgrade-btn-${idx}" onclick="upgradeCard(${idx})">⬆️ อัพเกรด</button>
          <button onclick="guaranteeUpgrade(${idx})">💎 การันตี (${haveShards}/${needShards})</button>
        `;
      }
    } else {
      // กรณีการ์ด maxed ไปแล้ว
      extraHTML = `<div class="meta" style="color:#ffd700;font-weight:bold;">MAX LEVEL</div>`;
    }
    const def = card.def !== undefined ? card.def : "?";

    const el = document.createElement("div");
    el.className = "card-box rarity-" + rarity;
    el.innerHTML = `
      <div class="title">${card.name} ${starsDisplay} ${lvDisplay}</div>
      <div class="meta">Rarity: ${rarity}</div>
      <div class="meta">HP: ${card.hp} | ATK: ${card.atk} | DEF:${def}</div>
      <div class="meta">Skill: ${card.skill || "None"}</div>
      ${extraHTML}
    `;
    div.appendChild(el);
  });
}

function upgradeCard(i) {
  let c = deck[i];
  if (!c.stars) c.stars = 1;
  if (c.maxed) return;

  const btn = document.getElementById("upgrade-btn-" + i);
const gbtn = document.querySelector(`#deck-wrapper .card-box:nth-child(${i+1}) button[onclick="guaranteeUpgrade(${i})"]`);
if (btn) {
  btn.disabled = true;
  btn.style.opacity = "0.5";
  btn.style.cursor = "not-allowed";
}
if (gbtn) {
  gbtn.disabled = true;
  gbtn.style.opacity = "0.5";
  gbtn.style.cursor = "not-allowed";
}

  // 🟢 เช็กใหม่: ถ้าเป็น 8⭐ Lv.10 → MAX เลย
  if (c.stars >= 8 && c.level >= MAX_LEVEL) {
    c.level = "MAX";
    c.maxed = true;
    alert(`🌟 ${c.name} ถึงขีดสุดแล้ว! (MAX)`);
    localStorage.setItem("deck", JSON.stringify(deck));
    renderDeck();
    return;
  }

  const lv = c.level;
  const cost = calcUpgradeCost(c);

  // ⭐5–7 ที่เลเวล 10 → ใช้การ์ดซ้ำขึ้นดาว
  if (lv >= MAX_LEVEL && c.stars >= 5 && c.stars < 8) {
  const rarity = c.rarity || "Common";
  const rarityFactor = DUPLICATE_COST_BY_RARITY[rarity] || 1;
  const need = (c.stars - 4) * rarityFactor;
    const sameCards = deck.filter((cc, j) => cc.name === c.name && j !== i && !cc.locked);

    if (sameCards.length >= need) {
      let removed = 0;
      deck = deck.filter((cc, j) => {
        if (j !== i && cc.name === c.name && !cc.locked && removed < need) {
          removed++;
          return false;
        }
        return true;
      });

      setTimeout(() => {
        c.stars++;
        c.level = 1;

        // บวก stat เวลาขึ้นดาว
        if (!c.maxed) {
  applyClassUpgrade(c);
}

        alert(`🌟 ${c.name} ขึ้นเป็น ${c.stars}⭐ Lv.1 แล้ว!`);
        localStorage.setItem("deck", JSON.stringify(deck));
        renderDeck();
      }, 500);
    } else {
      alert(`❌ ต้องใช้การ์ด ${c.name} อีก ${need} ใบ`);
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      }
    }
    return;
  }

  // === กรณีปกติ (⭐1–4 หรือ ⭐5–7 ที่ยังไม่ MAX) ===
  const successRate = Math.max(1, (SUCCESS_RATE_TABLE[lv] ?? 50) - (c.stars - 1) * Math.floor(10**1.1))-0.5;

  if (money < cost) {
    alert(`💰 เงินไม่พอ! ต้องใช้ ${cost} แต่มี ${money}`);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
    return;
  }

  money -= cost;
  updateMoneyUI();

  const bar = document.getElementById("progress-" + i);
  if (bar) bar.style.width = "0%";

  setTimeout(() => {
    const roll = Math.random() * 100;
    let percent = 0;

    if (roll <= successRate) {
      percent = 100;

      if (c.level !== "MAX") c.level++;

      if (typeof c.level === "number" && c.level > MAX_LEVEL) {
        if (c.stars < 5) {
          c.stars++;
          c.level = 1;
        } else if (c.stars >= 8) {
          c.level = "MAX";
          c.maxed = true;
        }
      }

      if (!c.maxed) {
  applyClassUpgrade(c);
}
    }  else {

  const distance = Math.abs(roll - successRate); // ยิ่งใกล้เรทยิ่งดี
  const maxDistance = Math.max(successRate, 100 - successRate);

  // closeness = 1 เมื่อ roll = successRate, = 0 เมื่อไกลสุด
  const closeness = 1 - (distance / maxDistance);

  // บาร์จะแสดงผล 0–99% ตามความใกล้เคียง
  percent = Math.max(5, Math.round(closeness * 100));
}

    if (bar) bar.style.width = percent + "%";

    localStorage.setItem("deck", JSON.stringify(deck));

    setTimeout(() => {
      renderDeck(); // ❌ ไม่ sort → อยู่ตำแหน่งเดิม
      const btnBack = document.getElementById("upgrade-btn-" + i);
const gbtnBack = document.querySelector(`#deck-wrapper .card-box:nth-child(${i+1}) button[onclick="guaranteeUpgrade(${i})"]`);
if (btnBack) {
  btnBack.disabled = false;
  btnBack.style.opacity = "1";
  btnBack.style.cursor = "pointer";
}
if (gbtnBack) {
  gbtnBack.disabled = false;
  gbtnBack.style.opacity = "1";
  gbtnBack.style.cursor = "pointer";
}
    }, 1200);

  }, 100);
}
function simulateNextUpgrade(card) {
  const clone = JSON.parse(JSON.stringify(card));
  const currHp = clone.hp || 0;
  const currAtk = clone.atk || 0;
  const currDef = clone.def || 0;

  // ⭐5–7 MAX → ใช้การ์ดซ้ำขึ้นดาว
  if (clone.level >= MAX_LEVEL && clone.stars >= 5 && clone.stars < 8) {
    return { note: "", next: { hp: currHp, atk: currAtk, def: currDef }, willMax: false };
  }

  // 🟢 8⭐ ที่ Lv.10 → MAX ทันที
  if (clone.stars >= 8 && clone.level >= MAX_LEVEL) {
    return {
      note: "MAX แล้ว",
      next: { hp: currHp, atk: currAtk, def: currDef },
      willMax: true
    };
  }

  let nextLevel = (clone.level === "MAX") ? "MAX" : clone.level + 1;
  let willMax = false;

  if (typeof nextLevel === "number" && nextLevel > MAX_LEVEL) {
    if (clone.stars < 5) {
      clone.stars++;
      nextLevel = 1;
    } else if (clone.stars >= 8) {
      nextLevel = "MAX";
      willMax = true;
    } else {
      nextLevel = MAX_LEVEL;
    }
  }

  // 🟢 ใช้สูตรเดียวกับอัปจริง
  if (!clone.maxed && nextLevel !== "MAX") {
    clone.level = nextLevel;
    applyClassUpgrade(clone);
  }

  return { note: "อัปเกรดปกติ", next: { hp: clone.hp, atk: clone.atk, def: clone.def }, willMax };
}
function guaranteeUpgrade(i) {
  let c = deck[i];
  if (!c.stars) c.stars = 1;
  if (c.maxed) return;
  

  const shardMap = {
    Common: "shardGray",
    Rare: "shardBlue",
    Epic: "shardPurple",
    Legendary: "shardGold",
    Mythical: "shardRed",
    Cosmic: "shardSky"
  };
  const rarity = c.rarity || "Common";
  const shardKey = shardMap[rarity];
  let bag = loadBag();

  const needShards = 10;
  if (bag[shardKey] < needShards) {
    alert(`❌ ต้องใช้ ${needShards} ${shardKey} แต่มี ${bag[shardKey]}`);
    return;
  }

  // หักชาร์ด
  addToBag(shardKey, -needShards);
  const btn = document.querySelector(`#deck-wrapper .card-box:nth-child(${i+1}) button[onclick="guaranteeUpgrade(${i})"]`);
const nbtn = document.getElementById("upgrade-btn-" + i);
if (btn) {
  btn.disabled = true;
  btn.style.opacity = "0.5";
  btn.style.cursor = "not-allowed";
}
if (nbtn) {
  nbtn.disabled = true;
  nbtn.style.opacity = "0.5";
  nbtn.style.cursor = "not-allowed";
}
  // หา progress bar
  const bar = document.getElementById("progress-" + i);
  if (bar) bar.style.width = "0%";

  setTimeout(() => {
    // อัปเกรดสำเร็จแน่นอน
    if (c.level < MAX_LEVEL) {
      c.level++;
    } else {
      if (c.stars < 5) {
        c.stars++;
        c.level = 1;
      } else if (c.stars >= 8) {
        c.maxed = true;
        c.level = "MAX";
      }
    }

    // บวกสเตตัสเหมือนอัปปกติ
    applyClassUpgrade(c);
    

    if (bar) bar.style.width = "100%";  // 🟢 ทำอนิเมชันบาร์เต็ม

    setTimeout(() => {
      
      localStorage.setItem("deck", JSON.stringify(deck));
      renderDeck();
      const btnBack = document.querySelector(`#deck-wrapper .card-box:nth-child(${i+1}) button[onclick="guaranteeUpgrade(${i})"]`);
const nbtnBack = document.getElementById("upgrade-btn-" + i);
if (btnBack) {
  btnBack.disabled = false;
  btnBack.style.opacity = "1";
  btnBack.style.cursor = "pointer";
}
if (nbtnBack) {
  nbtnBack.disabled = false;
  nbtnBack.style.opacity = "1";
  nbtnBack.style.cursor = "pointer";
}
    }, 1200);  // รอให้บาร์วิ่งเสร็จก่อน
  }, 100);
}
// === โหลดครั้งแรก: sort ก่อนแสดง ===
updateMoneyUI();
sortDeck();
renderDeck();