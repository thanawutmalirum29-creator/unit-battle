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
// localStorage["deck"] / ["equipBag"] are now read-only local caches of the server's
// player_economy.deck / .equip_bag (see core/deck.js + core/equipbag.js). Every
// mutation below (equip/unequip/delete) is applied on the server first; what gets
// written back locally is always the server's response, never a client guess.
function getDeck() {
  return JSON.parse(localStorage.getItem("deck") || "[]");
}
function getEquipBag() {
  return JSON.parse(localStorage.getItem("equipBag") || "[]");
}
// getRenderStats ย้ายไปรวมไว้จุดเดียวที่ js/shared/battle-math.js แล้ว (เดิมก็อป
// มาไว้ที่นี่ กับ core/render.js และ server/battle/team-builder.js อีกรวม 3 จุด —
// คอมเมนต์เดิมใน team-builder.js บอกตรงๆ ว่า "ported verbatim") โหลดเป็น global
// function ก่อนไฟล์นี้แล้ว (ดู pages/*.html) เรียก getRenderStats(...) ได้เหมือนเดิม
// =========================
// การจัดการ UI
// =========================
let currentPage = 1;
const pageSize = 12;

const EQUIP_TYPE_ICON = { Weapon: "<span class=gicon-battle></span>", Armor: "<span class=gicon-shield></span>", Accessory: "<span class=gicon-sparkle></span>" };

async function deleteAllCommonItems() {
  await deleteEquipByRarity("Common");
}

function renderEquipBag() {
  const div = document.getElementById("equipBag");
  if (!div) return;

  const bag = getEquipBag();
  div.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "equip-bag-panel";

  const toolbar = document.createElement("div");
  toolbar.className = "equip-bag-toolbar";
  toolbar.innerHTML = `
    <button id="deleteCommonBtn"><span class=gicon-trash></span> ลบ Common</button>
    <button id="deleteRareBtn"><span class=gicon-trash></span> ลบ Rare</button>
  `;
  panel.appendChild(toolbar);

  if (bag.length === 0) {
    const empty = document.createElement("p");
    empty.className = "equip-bag-empty";
    empty.innerHTML = "<span class=gicon-x></span> ยังไม่มีอุปกรณ์ในกระเป๋า — ลองไปสุ่มที่กาชาอุปกรณ์ดูสิ";
    panel.appendChild(empty);
    div.appendChild(panel);

    toolbar.querySelector("#deleteCommonBtn").onclick = async () => {
      if (await uiConfirm("คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ระดับ Common ทั้งหมด?")) deleteEquipByRarity("Common");
    };
    toolbar.querySelector("#deleteRareBtn").onclick = async () => {
      if (await uiConfirm("คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ระดับ Rare ทั้งหมด?")) deleteEquipByRarity("Rare");
    };
    return;
  }

  // เรียงของในกระเป๋า: แรร์สุดอยู่บนสุด (ซ้าย-ขวาสลับไปตามกริด 2 คอลัมน์โดยอัตโนมัติ)
  const sortedBag = [...bag].sort(sortEquipByRarityFirst);
  const totalPages = Math.ceil(sortedBag.length / pageSize);

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const items = sortedBag.slice(start, end);

  const grid = document.createElement("div");
  grid.className = "equip-bag-grid";

  items.forEach(eq => {
    const bonusTxt = eq.mode === "percent" ?
      `+${eq.bonus}% ${eq.stat.toUpperCase()}` :
      `+${eq.bonus} ${eq.stat.toUpperCase()}`;
    const icon = EQUIP_TYPE_ICON[eq.type] || "<span class=gicon-help></span>";

    const el = document.createElement("div");
    el.className = `equip-card rarity-${eq.rarity}`;
    el.title = "แตะเพื่อลบอุปกรณ์นี้";
    el.innerHTML = `
      <div class="equip-card-icon">${icon}</div>
      <div class="equip-card-name">${eq.name}</div>
      <div class="equip-card-rarity"><span class=gicon-star></span> ${eq.rarity}</div>
      <div class="equip-card-bonus">${bonusTxt}</div>
    `;
    el.onclick = async () => {
      if (await uiConfirm(`ต้องการลบ "${eq.name}" ออกจากกระเป๋าหรือไม่?`)) {
        deleteEquipItem(eq.id);
      }
    };

    grid.appendChild(el);
  });

  panel.appendChild(grid);

  // ปุ่มเปลี่ยนหน้า (แบบลูป)
  if (totalPages > 1) {
    const nav = document.createElement("div");
    nav.className = "equip-bag-pager";

    const prev = document.createElement("button");
    prev.innerHTML = "<span class=gicon-arrow-left></span>";
    prev.onclick = () => {
      currentPage = currentPage === 1 ? totalPages : currentPage - 1;
      renderEquipBag();
    };
    nav.appendChild(prev);

    const label = document.createElement("span");
    label.textContent = `หน้า ${currentPage}/${totalPages}`;
    nav.appendChild(label);

    const next = document.createElement("button");
    next.innerHTML = "<span class=gicon-arrow-right></span>";
    next.onclick = () => {
      currentPage = currentPage === totalPages ? 1 : currentPage + 1;
      renderEquipBag();
    };
    nav.appendChild(next);

    panel.appendChild(nav);
  }

  div.appendChild(panel);

  toolbar.querySelector("#deleteCommonBtn").onclick = async () => {
    if (await uiConfirm("คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ระดับ Common ทั้งหมด?")) deleteEquipByRarity("Common");
  };
  toolbar.querySelector("#deleteRareBtn").onclick = async () => {
    if (await uiConfirm("คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ระดับ Rare ทั้งหมด?")) deleteEquipByRarity("Rare");
  };
}
async function deleteEquipByRarity(rarity) {
  const before = getEquipBag().length;
  const data = await GameAPI.deleteEquipByRarityServer(rarity);
  if (!data || data.error) {
    alert("ลบอุปกรณ์ไม่สำเร็จ: "+ (data?.error || "network error"));
    return;
  }
  if (data.equipBag.length === before) {
    alert(`ไม่พบอุปกรณ์ระดับ ${rarity} ในกระเป๋า`);
  }
  applyServerEquipBag(data.equipBag);
}
async function deleteEquipItem(equipId) {
  const data = await GameAPI.deleteEquip(equipId);
  if (!data || data.error) {
    alert("ลบอุปกรณ์ไม่สำเร็จ: "+ (data?.error || "network error"));
    return;
  }
  applyServerEquipBag(data.equipBag); // รีเฟรช UI ผ่าน renderEquipBag ใน applyServerEquipBag
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

    //  ใช้ระบบกลางแทน getFinalStats
    const hpFinal  = getFinalHp(card);
    const atkFinal = getFinalAtk(card);
    const defFinal = getFinalDef(card);

    const el = document.createElement("div");
    el.className = "card";

    function slotLabel(label, eq) {
  if (!eq) return `${label}: -`;

  const rarity = eq.rarity ?? "Common"; // <span class=gicon-check></span> fallback ถ้าไม่มี
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
  ${slotLabel("<span class=gicon-battle></span> อาวุธ", weapon)}<br>
  ${slotLabel("<span class=gicon-shield></span> เกราะ", armor)}<br>
  ${slotLabel("<span class=gicon-sparkle></span> เสริม", acc)}<br>
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
    span.onclick = async () => {
      const cardId = span.dataset.card;
      const eqId = span.dataset.eqid;
      if (await uiConfirm("ถอดอุปกรณ์นี้ออกหรือไม่?")) {
        unequipItem(cardId, eqId);
      }
    };
  });
}

// =========================
// ถอดอุปกรณ์
// =========================
async function unequipItem(cardId, equipId) {
  const data = await GameAPI.unequipItemFromCard(cardId, equipId);
  if (!data || data.error) {
    alert("ถอดอุปกรณ์ไม่สำเร็จ: "+ (data?.error || "network error"));
    return;
  }
  applyServerDeck(data.deck);
  applyServerEquipBag(data.equipBag);
}

// =========================
// ใส่อุปกรณ์
// =========================
function chooseEquipForCard(cardId) {
  const bag = getEquipBag();
  if (bag.length === 0) {
    alert("ไม่มีอุปกรณ์ในกระเป๋า");
    return;
  }

  const popup = document.getElementById("equipPopup");
  popup.innerHTML = `<div class="equip-popup-close" onclick="closeEquipPopup()"><span class=gicon-x></span></div><h3>เลือกอุปกรณ์</h3>`;

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

async function equipItem(cardId, equipId) {
  const data = await GameAPI.equipItemOnCard(cardId, equipId);
  if (!data || data.error) {
    if (data?.error === "card already has 3 equips") {
      alert("ใส่อุปกรณ์ได้สูงสุด 3 ชิ้นเท่านั้น");
    } else {
      alert("ใส่อุปกรณ์ไม่สำเร็จ: "+ (data?.error || "network error"));
    }
    return;
  }
  applyServerDeck(data.deck);
  applyServerEquipBag(data.equipBag);
}
//  เรียงอุปกรณ์ในกระเป๋า: rarity แรร์สุดอยู่บนก่อน แล้วค่อยตาม bonus
function sortEquipByRarityFirst(a, b) {
  const rarityOrder = ["Legendary", "Epic", "Rare", "Common"];
  const rDiff = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
  if (rDiff !== 0) return rDiff;
  return b.bonus - a.bonus;
}

function sortEquipByPercentAndRarity(a, b) {
  const rarityOrder = ["Legendary", "Epic", "Rare", "Common"];

  // 1. อุปกรณ์ที่เป็น % มาก่อน
  if (a.mode === "percent" && b.mode !== "percent") return -1;
  if (a.mode !== "percent" && b.mode === "percent") return 1;

  // 2. ถ้าเป็น mode เดียวกัน
  if (a.mode === "percent" && b.mode === "percent") {
    // เรียง bonus (มาก  น้อย)
    if (b.bonus !== a.bonus) {
      return b.bonus - a.bonus;
    }
  }

  if (a.mode !== "percent" && b.mode !== "percent") {
    // เรียง bonus (มาก  น้อย)
    if (b.bonus !== a.bonus) {
      return b.bonus - a.bonus;
    }
  }

  // 3. ถ้า bonus เท่ากัน  เรียงตาม rarity
  return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
}
// =========================
// Init
// =========================
renderEquipBag(); 
renderDeckList();