function getRenderStats(card) {
  const baseHp  = card.baseHp ?? card.hp ?? 0;
  const baseAtk = card.baseAtk ?? card.atk ?? 0;
  const baseDef = card.baseDef ?? card.def ?? 0;

  let hp = baseHp;
  let atk = baseAtk;
  let def = baseDef;

  let hpPct = 0, atkPct = 0, defPct = 0;

  (card.equips || []).forEach(eq => {
    const mode = eq.mode || "flat";
    if (mode === "percent") {
      if (eq.stat === "hp")  hpPct  += eq.bonus;
      if (eq.stat === "atk") atkPct += eq.bonus;
      if (eq.stat === "def") defPct += eq.bonus;
    } else {
      if (eq.stat === "hp")  hp  += eq.bonus;
      if (eq.stat === "atk") atk += eq.bonus;
      if (eq.stat === "def") def += eq.bonus;
    }
  });

  hp  = Math.floor(hp  * (1 + hpPct  / 100));
  atk = Math.floor(atk * (1 + atkPct / 100));
  def = Math.floor(def * (1 + defPct / 100));

  return { hp, atk, def };
}
function renderStageButtons() {
  const stageList = document.getElementById("stageList");
  if (!stageList) return; // 🟢 ถ้าไม่มี element ก็ไม่ต้องทำอะไร
  stageList.innerHTML = "";
  const totalStages = Object.keys(STAGES).length; // สมมติ STAGES เก็บด่านทั้งหมด
  const maxToShow = 8;

  // คำนวณช่วงด่านที่จะแสดง
  let start = Math.max(1, unlockedStage - maxToShow + 1);
  let end = Math.min(unlockedStage, totalStages);

  for (let n = start; n <= end; n++) {
    const btn = document.createElement("button");
    btn.textContent = "Stage " + n;
    btn.id = "btn-stage-" + n;
    btn.onclick = () => setStage(n);

    if (n <= unlockedStage) {
      btn.disabled = false;
      btn.style.opacity = 1;
    } else {
      btn.disabled = true;
      btn.style.opacity = 0.4;
    }

    // 🎯 ทุกๆ 5 ด่าน ให้ปุ่มเป็นสีแดงส้มๆ
    if (n % 5 === 0) {
      btn.style.background = "linear-gradient(45deg, #ff0000, #ff8800)";
      btn.style.color = "white";
      btn.style.fontWeight = "bold";
      btn.style.boxShadow = "0 0 10px rgba(255, 0, 0, 0.7)";
    }

    stageList.appendChild(btn);
  }
}

function deepClone(obj) { 
  return JSON.parse(JSON.stringify(obj)); 
}

function getStarsDisplay(stars, isMaxed) {
  let out = (stars <= 5) ? "⭐".repeat(stars) : "🌟".repeat(stars - 5);
  return isMaxed ? `<span class="glow-stars">${out}</span>` : out;
}

function renderDeck() {
  const div = document.getElementById("deck-wrapper");
  div.innerHTML = "";
  const MAX_LEVEL = 10;
  const deck = JSON.parse(localStorage.getItem("deck") || "[]");

  // ✅ โหลดการเลือกทีมที่เคยเลือกไว้
  selectedIndexes = JSON.parse(localStorage.getItem("selectedIndexes") || "[]");

  // 🛠 แก้ปัญหาข้อมูลเก่า ถ้า selectedIndexes เก็บเป็น index (number) → แปลงเป็น id
  if (selectedIndexes.length > 0 && typeof selectedIndexes[0] === "number") {
    selectedIndexes = selectedIndexes
      .map(i => deck[i]?.id)
      .filter(Boolean);
    localStorage.setItem("selectedIndexes", JSON.stringify(selectedIndexes));
  }

  // ถ้าไม่มี id หรือ stars ให้สร้าง
  deck.forEach(card => {
    if (!card.id) card.id = "card-" + Date.now() + "-" + Math.random();
    if (!card.stars) card.stars = 1;
    if (!card.level) card.level = 1;
    if (card.locked === undefined) card.locked = false; 
    card.equips = card.equips || []; // 🟢 กัน null
  });
  localStorage.setItem("deck", JSON.stringify(deck));

  // ✅ เรียงตาม stars > level > rarity
  deck.sort((a, b) => {
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);

    const rarityOrder = {
      "Common": 1,
      "Rare": 2,
      "Epic": 3,
      "Legendary": 4,
      "Mythical": 5,
      "Cosmic": 6
    };
    const ra = rarityOrder[a.rarity] || 0;
    const rb = rarityOrder[b.rarity] || 0;
    return rb - ra;
  });

  deck.forEach((card) => {

// ใหม่
const stats = getRenderStats(card);

    const el = document.createElement("div");
    el.className = `card rarity-${card.rarity}` + 
                   (selectedIndexes.includes(card.id) ? " selected" : "");
    el.style.position = "relative";

    // ✅ เลือกการ์ดเข้าทีม
    el.onclick = () => {
      if (selectedIndexes.includes(card.id)) {
        selectedIndexes = selectedIndexes.filter(i => i !== card.id);
      } else {
        if (selectedIndexes.length >= maxTeamSize) {
          alert(`เลือกได้สูงสุด ${maxTeamSize} ตัว`);
          return;
        }
        selectedIndexes.push(card.id);
      }
      localStorage.setItem("selectedIndexes", JSON.stringify(selectedIndexes));
      renderDeck();
    };

    // 🎯 กดค้างเพื่อลบ (ขาย)
    let pressTimer;
    function startPress() {
      pressTimer = setTimeout(() => {
        if (card.locked) return;
        if (confirm(`ต้องการขายการ์ด ${card.name} ไหม?`)) {
          sellCard(card.id);
        }
      }, 600);
    }
    function cancelPress() { clearTimeout(pressTimer); }
    el.addEventListener("mousedown", startPress);
    el.addEventListener("mouseup", cancelPress);
    el.addEventListener("mouseleave", cancelPress);
    el.addEventListener("touchstart", startPress);
    el.addEventListener("touchend", cancelPress);
    el.addEventListener("touchcancel", cancelPress);

    // 🔒 ปุ่มล็อค/ปลดล็อค
    const lockBtn = document.createElement("div");
    lockBtn.textContent = card.locked ? "🔒" : "🔓";
    lockBtn.style.position = "absolute";
    lockBtn.style.top = "4px";
    lockBtn.style.right = "4px";
    lockBtn.style.cursor = "pointer";
    lockBtn.onclick = (e) => {
      e.stopPropagation();
      card.locked = !card.locked;
      localStorage.setItem("deck", JSON.stringify(deck));
      renderDeck();
    };

    // แสดง UI การ์ด
    const level = card.level || 1;
    let lvDisplay = `Lv.${level}`;
    if (card.stars >= 8 && level >= MAX_LEVEL) lvDisplay = "MAX";
    if (card.maxed) lvDisplay = "MAX";
    const starsDisplay = getStarsDisplay(card.stars, card.maxed);

    el.innerHTML = `
      <div class="title">${card.name}</div>
      <div class="title">${starsDisplay} ${lvDisplay}</div>
      <div style="margin-top:4px; font-size:10px">
        HP:${stats.hp} • ATK:${stats.atk} • DEF:${stats.def}
      </div>
      <div class="meta" style="margin-top:2px; font-size:12px">
        Skill:${card.skill}
      </div>
    `;
    el.appendChild(lockBtn);

    if (card.locked) {
      el.style.boxShadow = "inset 0 0 6px 3px ";
      el.style.background = "rgba(255, 215, 0, 0.12)";
    }

    div.appendChild(el);
  });

  // อัปเดต header
  const header = document.getElementById("deckHeader");
  if (header) {
    header.innerHTML = `เด็คของฉัน — เลือกการ์ดเป็นทีม (${deck.length}/100) 
      <button id="sellAllBtn" style="margin-left:10px; padding:4px 8px; font-size:12px;">💰 ขายทั้งหมด</button>
      <button id="clearSelectionBtn" style="margin-left:6px; padding:4px 8px; font-size:12px;">🧹 เคลียร์ทีม</button>`;

    document.getElementById("sellAllBtn").onclick = sellAllUnlocked;
    document.getElementById("clearSelectionBtn").onclick = clearSelection;
  }
}

function sellCard(cardId) {
  let deck = JSON.parse(localStorage.getItem("deck") || "[]");
  const idx = deck.findIndex(c => c.id === cardId);
  if (idx === -1) return;

  if (deck[idx].locked) {
    return;
  }

  const sold = deck.splice(idx, 1)[0];
  localStorage.setItem("deck", JSON.stringify(deck));

  const rarityPrice = {
    "Common": 50,
    "Rare": 500,
    "Epic": 5000,
    "Legendary": 30000,
    "Mythical": 100000,
    "Cosmic": 500000
  };

  const stars = sold.stars || 1;
  const base = rarityPrice[sold.rarity] || 5;
  const price = base * stars;

  addMoney(price);

  alert(`ขาย ${sold.name} (${sold.rarity}, ${stars}⭐) ได้ ${price} เหรียญ`);
  renderDeck();
}

function sellAllUnlocked() {
  let deck = JSON.parse(localStorage.getItem("deck") || "[]");
  if (deck.length === 0) {
    alert("❌ ไม่มีการ์ดในเด็ค");
    return;
  }

  const rarityPrice = {
    "Common": 50,
    "Rare": 500,
    "Epic": 5000,
    "Legendary": 30000,
    "Mythical": 100000,
    "Cosmic": 500000
  };

  let totalEarned = 0;
  let kept = [];

  deck.forEach(card => {
    if (card.locked) {
      kept.push(card);
    } else {
      const stars = card.stars || 1;
      const base = rarityPrice[card.rarity] || 5;
      totalEarned += base * stars;
    }
  });

  if (totalEarned === 0) {
    alert("❌ ไม่มีการ์ดที่ขายได้");
    return;
  }

  if (confirm(`คุณต้องการขายการ์ดทั้งหมดที่ไม่ได้ล็อค?\n\nคุณจะได้เงินรวม ${totalEarned} 💰`)) {
    addMoney(totalEarned);
    localStorage.setItem("deck", JSON.stringify(kept));
    alert(`✅ ขายเสร็จสิ้น ได้เงินรวม ${totalEarned} 💰`);
    renderDeck();
  }
}

function clearSelection() {
  selectedIndexes = [];
  localStorage.setItem("selectedIndexes", JSON.stringify(selectedIndexes));
  renderDeck();
}

// ทำให้การ์ดเล่น animation
function playAnim(cardEl, type) {
  if (!cardEl) return;
  cardEl.classList.add(type);
  setTimeout(() => cardEl.classList.remove(type), 300); // reset class
}

function findFirstAlive(list){
  return list.find(x => x.hp > 0);
}
renderDeck();