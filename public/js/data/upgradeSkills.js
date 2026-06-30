function goBack(){
  if (document.referrer) {
    // ถ้ามี referrer → กลับไปหน้านั้น
    window.location.href = document.referrer;
  } else {
    // ถ้าไม่มี (เช่นเปิดตรงๆ) → กลับไปหน้า game.html เป็นค่า default
    window.location.href = "game.html";
  }
}

// ✅ กำหนดเลเวลสูงสุด
const MAX_LEVEL = 3;

function renderUpgradeDeck() {
  const div = document.getElementById("deck-wrapper");
  div.innerHTML = "";

  let deck = JSON.parse(localStorage.getItem("deck") || "[]");

  deck.sort((a, b) => {
  // เรียงจำนวนดาวก่อน (มาก → น้อย)
  if ((b.stars || 0) !== (a.stars || 0)) {
    return (b.stars || 0) - (a.stars || 0);
  }

  // ต่อด้วยเลเวล (มาก → น้อย)
  if ((b.level || 0) !== (a.level || 0)) {
    return (b.level || 0) - (a.level || 0);
  }

  // สุดท้ายเรียงตามความแรร์ (Cosmic > Mythical > ...)
  const rarityOrder = {
    "Cosmic": 6,
    "Mythical": 5,
    "Legendary": 4,
    "Epic": 3,
    "Rare": 2,
    "Common": 1
  };
  let ra = rarityOrder[a.rarity] || 0;
  let rb = rarityOrder[b.rarity] || 0;
  return rb - ra;
});

  deck.forEach(card => {
    const el = document.createElement("div");
    const rarityClass = card.rarity ? card.rarity.toLowerCase() : "common";
    el.className = `card-box ${rarityClass}`;
    el.innerHTML = `
      <b>${card.name}</b>
      <div>⭐${card.stars || 1} | ${card.rarity || "Common"}</div>
      <div>Skill: ${card.skill}</div>
      <br><button class="card-select-btn" onclick="showSkillDetail('${card.id}')">เลือก</button>
    `;
    div.appendChild(el);
  });
}

function showSkillDetail(id) {
  const deck = JSON.parse(localStorage.getItem("deck") || "[]");
  const card = deck.find(c => c.id === id);
  if (!card) return;

  const container = document.getElementById("skillDetail");

  let match = card.skill.match(/(.+) L(\d+)/);
  let nextSkill = null, cost = null, shardType = null, shardName = "", chance = null;

  if (match) {
    let base = match[1];
    let level = parseInt(match[2]);

    if (level < MAX_LEVEL) {
      nextSkill = `${base} L${level+1}`;
      cost = 10 * level;

      if (card.rarity === "Epic") { shardType = "shardPurple"; shardName="🟣 ชาร์ดม่วง"; }
      else if (card.rarity === "Legendary") { shardType = "shardGold"; shardName="🟡 ชาร์ดทอง"; }
      else if (card.rarity === "Rare") { shardType = "shardBlue"; shardName="🔵 ชาร์ดน้ำเงิน"; }
      else if (card.rarity === "Mythical") { shardType = "shardRed"; shardName="🔴 ชาร์ดแดง"; }
      else if (card.rarity === "Cosmic") { shardType = "shardSky"; shardName="🌌 ชาร์ดฟ้า"; }
      else { shardType = "shardGray"; shardName="⚪ ชาร์ดเทา"; }

      const successRates = { 1: 0.20, 2: 0.05, 3: 0.01 };
      chance = successRates[level] ? (successRates[level] * 100).toFixed(0) + "%" : "0%";
    }
  }

  let bag = loadBag();
  let have = (bag[shardType] || 0);

  let barHtml = `<div class="progress-bar"><div id="progress-bar" class="progress-fill"></div></div>`;

 if (nextSkill) {
  let disabled = have < cost ? "disabled" : "";
  btnHtml = `<button class="upgrade-btn" onclick="upgradeSkill('${id}')" ${disabled}>
                ⬆ อัปเกรดเป็น ${nextSkill} 
                <br>(ใช้ ${have}/${cost} ${shardName})
                <br>💡 โอกาสสำเร็จ: ${chance}
             </button>`;
} else {
  // กรณีตันแล้ว → ใช้ progress bar เต็มสีเขียวแทน
  barHtml = `<div class="progress-bar">
               <div class="progress-fill" style="width:100%; background:linear-gradient(90deg,#06d6a0,#07f5b5)"></div>
             </div>`;
  btnHtml = `<p><b>Skill MAX</b></p>`;
}

container.innerHTML = `
  <p><b>${card.name}</b></p>
  <p>Skill ปัจจุบัน: ${card.skill}</p>
  ${barHtml}
  ${btnHtml}
`;
  
}

function upgradeSkill(id) {
  let deck = JSON.parse(localStorage.getItem("deck") || "[]");
  const card = deck.find(c => c.id === id);
  if (!card) return;

  // 🟢 ปิดปุ่มชั่วคราว
  const btn = document.querySelector(".upgrade-btn");
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  }

  let match = card.skill.match(/(.+) L(\d+)/);
  if (!match) return;

  let base = match[1];
  let level = parseInt(match[2]);
  if (level >= MAX_LEVEL) return;

  let shardType, shardName;
  if (card.rarity === "Epic") { shardType = "shardPurple"; shardName="🟣 ชาร์ดม่วง"; }
  else if (card.rarity === "Legendary") { shardType = "shardGold"; shardName="🟡 ชาร์ดทอง"; }
  else if (card.rarity === "Rare") { shardType = "shardBlue"; shardName="🔵 ชาร์ดน้ำเงิน"; }
  else if (card.rarity === "Mythical") { shardType = "shardRed"; shardName="🔴 ชาร์ดแดง"; }
  else if (card.rarity === "Cosmic") { shardType = "shardSky"; shardName="🌌 ชาร์ดฟ้า"; }
  else { shardType = "shardGray"; shardName="⚪ ชาร์ดเทา"; }

  let cost = 10 * level;
  let bag = JSON.parse(localStorage.getItem("bag") || "{}");
  if ((bag[shardType] || 0) < cost) return;

  bag[shardType] -= cost;
  localStorage.setItem("bag", JSON.stringify(bag));
  updateBagUI();

  const successRates = { 1: 0.20, 2: 0.05, 3: 0.01 };
  let chance = successRates[level] || 0;
  let roll = Math.random();

  let barWidth;
  let success = false;
  if (roll < chance) {
    barWidth = 100;
    success = true;
  } else {
    barWidth = Math.floor(roll * 100);
    if (barWidth >= 100) barWidth = 99;
  }

  const bar = document.getElementById("progress-bar");
  if (bar) {
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.width = barWidth + "%";
    }, 100);
  }

  // 🟢 หลังอนิเมชันเสร็จ → เปิดปุ่มคืน
  setTimeout(() => {
    if (success) {
      card.skill = `${base} L${level+1}`;
      localStorage.setItem("deck", JSON.stringify(deck));
    }
    renderUpgradeDeck();
    showSkillDetail(id);

    const btnBack = document.querySelector(".upgrade-btn");
    if (btnBack) {
      btnBack.disabled = false;
      btnBack.style.opacity = "1";
      btnBack.style.cursor = "pointer";
    }
  }, 1500);
}

renderUpgradeDeck();