// =========================
// LocalStorage Helpers
// =========================
function goBack(){
  if (document.referrer) {
    window.location.href = document.referrer;
  } else {
    window.location.href = "game.html";
  }
}
function getDeck() {
  return JSON.parse(localStorage.getItem("deck") || "[]");
}
function saveDeck(deck) {
  localStorage.setItem("deck", JSON.stringify(deck));
}
function getEquipBag() {
  return JSON.parse(localStorage.getItem("equipBag") || "[]");
}
function saveEquipBag(bag) {
  localStorage.setItem("equipBag", JSON.stringify(bag));
}
function getRenderStats(card) {
  const baseHp  = card.baseHp ?? card.hp ?? 0;
  const baseAtk = card.baseAtk ?? card.atk ?? 0;
  const baseDef = card.baseDef ?? card.def ?? 0;

  let hp = baseHp;
  let atk = baseAtk;
  let def = baseDef;

  let hpPct = 0, atkPct = 0, defPct = 0;

  (card.equips || []).forEach(eq => {
    const mode = eq.mode || "flat"; // ✅ fallback ถ้า item เก่าไม่มี mode

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

  // ✅ apply % bonuses หลังจากรวม flat แล้ว
  hp  = Math.floor(hp  * (1 + hpPct  / 100));
  atk = Math.floor(atk * (1 + atkPct / 100));
  def = Math.floor(def * (1 + defPct / 100));

  return { hp, atk, def };
}
// =========================
// การจัดการ UI
// =========================
let currentPage = 1;
const pageSize = 6;
function deleteAllCommonItems() {
  let bag = getEquipBag();
  const filtered = bag.filter(e => e.rarity !== "Common");

  if (filtered.length === bag.length) {
    alert("ไม่พบอุปกรณ์ระดับ Common ในกระเป๋า");
    return;
  }

  saveEquipBag(filtered);
  renderEquipBag();
}
function renderEquipBag() {
  const div = document.getElementById("equipBag");
  if (!div) return;
  
  const bag = getEquipBag();
  div.innerHTML = `
   
    <button id="deleteCommonBtn">🗑️ ลบCommon</button>
    <button id="deleteRareBtn">🗑️ ลบRare</button>
  `;
  
  // ถ้าไม่มีอุปกรณ์เลย
  if (bag.length === 0) {
    div.innerHTML += "<p>❌ ยังไม่มีอุปกรณ์</p>";
    return;
  }
  
  // ปุ่มลบ Common
  const deleteCommonBtn = document.getElementById("deleteCommonBtn");
  deleteCommonBtn.onclick = () => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ระดับ Common ทั้งหมด?")) {
      deleteEquipByRarity("Common");
    }
  };
  
  // ปุ่มลบ Rare
  const deleteRareBtn = document.getElementById("deleteRareBtn");
  deleteRareBtn.onclick = () => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ระดับ Rare ทั้งหมด?")) {
      deleteEquipByRarity("Rare");
    }
  };
  
  // เรียงของในกระเป๋า
  const sortedBag = [...bag].sort(sortEquipByPercentAndRarity);
  const totalPages = Math.ceil(sortedBag.length / pageSize);
  
  // ปรับ currentPage ให้อยู่ในขอบเขต (ป้องกันหน้าว่าง)
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }
  
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const items = sortedBag.slice(start, end);
  
  // แสดงรายการอุปกรณ์
  items.forEach(eq => {
    const el = document.createElement("div");
    el.className = `equip rarity-${eq.rarity}`;
    const bonusTxt = eq.mode === "percent" ?
      `+${eq.bonus}% ${eq.stat.toUpperCase()}` :
      `+${eq.bonus} ${eq.stat.toUpperCase()}`;
    el.textContent = `${eq.rarity} ${eq.name} (${bonusTxt})`;
    
    el.style.cursor = "pointer";
    el.title = "คลิกเพื่อลบอุปกรณ์นี้";
    el.onclick = () => {
      if (confirm(`ต้องการลบ "${eq.name}" ออกจากกระเป๋าหรือไม่?`)) {
        deleteEquipItem(eq.id);
      }
    };
    
    div.appendChild(el);
  });
  
  // ปุ่มเปลี่ยนหน้า (แบบลูป)
  if (totalPages > 1) {
    const nav = document.createElement("div");
    nav.innerHTML = `หน้า ${currentPage}/${totalPages} `;
    
    const prev = document.createElement("button");
    prev.textContent = "⬅️";
    prev.onclick = () => {
      currentPage = currentPage === 1 ? totalPages : currentPage - 1;
      renderEquipBag();
    };
    nav.appendChild(prev);
    
    const next = document.createElement("button");
    next.textContent = "➡️";
    next.onclick = () => {
      currentPage = currentPage === totalPages ? 1 : currentPage + 1;
      renderEquipBag();
    };
    nav.appendChild(next);
    
    div.appendChild(nav);
  }
}
function deleteEquipByRarity(rarity) {
  let bag = getEquipBag();
  const filtered = bag.filter(e => e.rarity !== rarity);

  if (filtered.length === bag.length) {
    alert(`ไม่พบอุปกรณ์ระดับ ${rarity} ในกระเป๋า`);
    return;
  }

  saveEquipBag(filtered);
  renderEquipBag();
}
function deleteEquipItem(equipId) {
  let bag = getEquipBag();
  const index = bag.findIndex(e => e.id === equipId);
  if (index === -1) return;

  bag.splice(index, 1); // ลบออกจากกระเป๋า
  saveEquipBag(bag);
  renderEquipBag(); // รีเฟรช UI
}

function renderDeckList() {
  const div = document.getElementById("deckList");
  if (!div) return;
  div.innerHTML = "";

  const deck = getDeck();
  deck.forEach(card => {
    // เก็บค่า base จากการ์ดดิบเท่านั้น (ครั้งเดียวตอนสร้างการ์ด)
if (card.baseHp == null) card.baseHp = card.hp ?? 0;
if (card.baseAtk == null) card.baseAtk = card.atk ?? 0;
if (card.baseDef == null) card.baseDef = card.def ?? 0;

    card.equips = card.equips || [];

    const weapon = card.equips.find(e => e.type === "Weapon");
    const armor  = card.equips.find(e => e.type === "Armor");
    const acc    = card.equips.find(e => e.type === "Accessory");

    // ✅ ใช้ระบบกลางแทน getFinalStats
    const hpFinal  = getFinalHp(card);
    const atkFinal = getFinalAtk(card);
    const defFinal = getFinalDef(card);

    const el = document.createElement("div");
    el.className = "card";

    function slotLabel(label, eq) {
  if (!eq) return `${label}: -`;

  const rarity = eq.rarity ?? "Common"; // ✅ fallback ถ้าไม่มี
  const rarityClass = `equip-rarity-${rarity}`;

  const bonusTxt = eq.mode === "percent"
    ? `+${eq.bonus}% ${eq.stat.toUpperCase()}`
    : `+${eq.bonus} ${eq.stat.toUpperCase()}`;

  return `
    <span class="equip-slot ${rarityClass}" data-card="${card.id}" data-eqid="${eq.id}">
      ${label}: ${rarity} ${eq.name} (${bonusTxt})
    </span>`;
}

    const stats = getRenderStats(card);

el.innerHTML = `
  <b>${card.name}</b> (Lv.${card.level || 1})<br>
  HP:${stats.hp} • ATK:${stats.atk} • DEF:${stats.def}<br>
  ${slotLabel("⚔️ อาวุธ", weapon)}<br>
  ${slotLabel("🛡️ เกราะ", armor)}<br>
  ${slotLabel("✨ เสริม", acc)}<br>
`;

    const equipBtn = document.createElement("button");
    equipBtn.textContent = "ใส่อุปกรณ์";
    equipBtn.onclick = () => chooseEquipForCard(card.id);
    el.appendChild(document.createElement("br"));
    el.appendChild(equipBtn);

    div.appendChild(el);
  });

  document.querySelectorAll(".equip-slot").forEach(span => {
    span.style.cursor = "pointer";
    span.onclick = () => {
      const cardId = span.dataset.card;
      const eqId = span.dataset.eqid;
      if (confirm("ถอดอุปกรณ์นี้ออกหรือไม่?")) {
        unequipItem(cardId, eqId);
      }
    };
  });
}

// =========================
// ถอดอุปกรณ์
// =========================
function unequipItem(cardId, equipId) {
  let deck = getDeck();
  let bag = getEquipBag();

  const card = deck.find(c => c.id === cardId);
  if (!card || !card.equips) return;

  const idx = card.equips.findIndex(e => e.id === equipId);
  if (idx === -1) return;

  const eq = card.equips[idx];
  bag.push(eq);
  card.equips.splice(idx, 1);

  saveDeck(deck);
  saveEquipBag(bag);
  renderDeckList();
  renderEquipBag();
}

// =========================
// ใส่อุปกรณ์
// =========================
function chooseEquipForCard(cardId) {
  const bag = getEquipBag();
  if (bag.length === 0) {
    alert("❌ ไม่มีอุปกรณ์ในกระเป๋า");
    return;
  }

  const popup = document.getElementById("equipPopup");
  popup.innerHTML = `<div class="equip-popup-close" onclick="closeEquipPopup()">❌</div><h3>เลือกอุปกรณ์</h3>`;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const sortedBag = [...bag].sort(sortEquipByPercentAndRarity);
  const items = sortedBag.slice(start, end);

  items.forEach((e, i) => {
    const rarityClass = `equip-rarity-${e.rarity}`;
    const bonusTxt = e.mode === "percent"
      ? `+${e.bonus}% ${e.stat.toUpperCase()}`
      : `+${e.bonus} ${e.stat.toUpperCase()}`;

    const itemEl = document.createElement("div");
    itemEl.className = `equip-item ${rarityClass}`;
    itemEl.innerHTML = `${i + 1}) ${e.rarity} ${e.name} (${bonusTxt})`;
    itemEl.onclick = () => {
      equipItem(cardId, e.id);
      closeEquipPopup();
    };

    popup.appendChild(itemEl);
  });

  popup.style.display = "block";
}

function closeEquipPopup() {
  const popup = document.getElementById("equipPopup");
  popup.style.display = "none";
}

function equipItem(cardId, equipId) {
  let deck = getDeck();
  let bag = getEquipBag();

  const card = deck.find(c => c.id === cardId);
  const eq = bag.find(e => e.id === equipId);
  if (!card || !eq) return;

  card.equips = card.equips || [];

  // ถ้ามีอุปกรณ์ชนิดเดียวกันอยู่แล้ว → ถอดออกก่อน
  const existingIndex = card.equips.findIndex(e => e.type === eq.type);
  if (existingIndex !== -1) {
    const oldEq = card.equips[existingIndex];
    bag.push(oldEq);
    card.equips.splice(existingIndex, 1);
  }

  if (card.equips.length >= 3) {
    alert(`❌ ${card.name} ใส่อุปกรณ์ได้สูงสุด 3 ชิ้นเท่านั้น`);
    return;
  }

  card.equips.push(eq);
  bag = bag.filter(e => e.id !== equipId);

  saveDeck(deck);
  saveEquipBag(bag);
  renderDeckList();
  renderEquipBag();
}
function sortEquipByPercentAndRarity(a, b) {
  const rarityOrder = ["Legendary", "Epic", "Rare", "Common"];

  // 1. อุปกรณ์ที่เป็น % มาก่อน
  if (a.mode === "percent" && b.mode !== "percent") return -1;
  if (a.mode !== "percent" && b.mode === "percent") return 1;

  // 2. ถ้าเป็น mode เดียวกัน
  if (a.mode === "percent" && b.mode === "percent") {
    // เรียง bonus (มาก → น้อย)
    if (b.bonus !== a.bonus) {
      return b.bonus - a.bonus;
    }
  }

  if (a.mode !== "percent" && b.mode !== "percent") {
    // เรียง bonus (มาก → น้อย)
    if (b.bonus !== a.bonus) {
      return b.bonus - a.bonus;
    }
  }

  // 3. ถ้า bonus เท่ากัน → เรียงตาม rarity
  return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
}
// =========================
// Init
// =========================
renderEquipBag(); 
renderDeckList();