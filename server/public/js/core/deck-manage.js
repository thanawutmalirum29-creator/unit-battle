// js/core/deck-manage.js — แผงจัดเด็คแบบเต็ม รองรับ 5 เด็ค (ตั้งชื่อเองได้) + ขายการ์ด
//
// ผู้เล่นจัดเด็คได้ 5 ชุดพร้อมกัน (ค่าเริ่มต้นชื่อ "เด็ค1"-"เด็ค5", ตั้งชื่อเองได้)
// หน้านี้ (pages/deck.html) ใช้แก้ทีละเด็คผ่านแท็บด้านบน ส่วนหน้าต่อสู้แต่ละหน้า
// (game/inf/boss) แค่เลือกว่าจะ "ใช้" เด็คไหนจาก 5 ชุดนี้ (ดู team-select-ui.js)

let teamDecks = loadTeamDecks();
let activeEditSlot = 0; // แท็บเด็คที่กำลังแก้ไขอยู่ตอนนี้
const maxTeamSize = 4; // จำนวนการ์ดสูงสุดต่อ 1 เด็ค

function injectDeckTabStyles() {
  if (document.getElementById("deckTabStyles")) return;
  const style = document.createElement("style");
  style.id = "deckTabStyles";
  style.textContent = `
.deck-tabs{ display:flex; gap:8px; flex-wrap:wrap; margin:0 0 12px; }
.deck-tab{ display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:var(--radius-sm); border:1.5px solid var(--border,rgba(255,255,255,.12)); background:rgba(255,255,255,.03); cursor:pointer; }
.deck-tab.active{ border-color:var(--accent,#5c8bff); box-shadow:0 0 10px rgba(92,139,255,.4); }
.deck-tab-name{ font-weight:700; font-size:13px; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.deck-tab-rename-btn{ background:transparent; border:none; color:var(--muted); font-size:12px; padding:2px 4px; line-height:1; border-radius:4px; cursor:pointer; }
.deck-tab-rename-btn:hover{ background:rgba(255,255,255,.08); color:var(--text,#e8edf5); }
.deck-tab-count{ font-size:11.5px; color:var(--muted); white-space:nowrap; }
`;
  document.head.appendChild(style);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderDeckTabs() {
  const mount = document.getElementById("deckTabs");
  if (!mount) return;
  injectDeckTabStyles();

  mount.innerHTML = teamDecks.map((d, i) => `
    <div class="deck-tab${i === activeEditSlot ? " active" : ""}" data-slot="${i}">
      <span class="deck-tab-name">${escapeHtml(d.name)}</span>
      <button type="button" class="deck-tab-rename-btn" data-slot="${i}" title="เปลี่ยนชื่อเด็ค" aria-label="เปลี่ยนชื่อเด็ค"><span class=gicon-pencil></span></button>
      <span class="deck-tab-count">${d.indexes.length}/${maxTeamSize}</span>
    </div>
  `).join("");

  mount.querySelectorAll(".deck-tab").forEach((tabEl) => {
    tabEl.addEventListener("click", (e) => {
      if (e.target.classList.contains("deck-tab-rename-btn")) return; // กดปุ่มเปลี่ยนชื่อไม่สลับแท็บ
      const slot = parseInt(tabEl.dataset.slot, 10);
      if (slot === activeEditSlot) return;
      activeEditSlot = slot;
      renderDeckTabs();
      renderDeck();
    });
  });

  //  เปลี่ยนชื่อเด็คผ่านป๊อปอัป (uiPrompt) แทนที่ <input> แบบพิมพ์สดในแท็บ —
  // ช่องพิมพ์สดเดิมกดสลับหน้า/กดปุ่มย้อนกลับระหว่างพิมพ์ได้ ทำให้ค่าที่พิมพ์ค้าง
  // หายหรือไม่ถูกบันทึก ป๊อปอัปกันปัญหานี้เพราะต้องกด "ตกลง"/"ยกเลิก" ให้จบก่อน
  mount.querySelectorAll(".deck-tab-rename-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const slot = parseInt(btn.dataset.slot, 10);
      const input = await uiPrompt("ตั้งชื่อเด็ค (สูงสุด 12 ตัวอักษร)", teamDecks[slot].name);
      if (input === null) return; // กดยกเลิก
      const name = input.trim();
      teamDecks[slot].name = name ? name.slice(0, 12) : defaultDeckName(slot);
      saveTeamDecks(teamDecks);
      renderDeckTabs();
      if (slot === activeEditSlot) renderDeck();
    });
  });
}

function renderDeck() {
  const div = document.getElementById("deck-wrapper");
  if (!div) return;
  div.innerHTML = "";
  const MAX_LEVEL = 10;
  const deck = JSON.parse(localStorage.getItem("deck") || "[]");
  const deckIds = new Set(deck.map((c) => c.id));

  // ถ้าไม่มี id หรือ stars ให้สร้าง
  deck.forEach(card => {
    if (!card.id) card.id = "card-" + Date.now() + "-" + Math.random();
    if (!card.stars) card.stars = 1;
    if (!card.level) card.level = 1;
    // การ์ดที่ยืมมาจากเพื่อน (ระบบขอความช่วยเหลือ) ล็อคอัตโนมัติกันขาย/ลืมปลดล็อค —
    // เซิฟก็บล็อคการขาย/อัพเกรดการ์ดพวกนี้อยู่แล้ว (routes/economy.js), นี่แค่กันสับสนฝั่ง UI
    if (card.borrowed) card.locked = true;
    else if (card.locked === undefined) card.locked = false;
    card.equips = card.equips || []; // <span class=gicon-dot-green></span> กัน null
  });
  localStorage.setItem("deck", JSON.stringify(deck));

  //  กันเด็คค้าง id ของการ์ดที่ไม่มีอยู่แล้ว (เช่น ขายทิ้งไปจากหน้าอื่น)
  let teamDecksChanged = false;
  teamDecks.forEach((d) => {
    const cleaned = d.indexes.filter((id) => deckIds.has(id));
    if (cleaned.length !== d.indexes.length) {
      d.indexes = cleaned;
      teamDecksChanged = true;
    }
  });
  if (teamDecksChanged) saveTeamDecks(teamDecks);

  const activeIndexes = teamDecks[activeEditSlot].indexes;

  //  เรียงตาม stars > level > rarity
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

    const stats = getRenderStats(card);

    const selectOrder = activeIndexes.indexOf(card.id); // -1 ถ้ายังไม่ถูกเลือกเข้าเด็คนี้

    const el = document.createElement("div");
    el.className = `card rarity-${card.rarity}` + 
                   (selectOrder !== -1 ? " selected" : "");
    el.style.position = "relative";

    //  เลือกการ์ดเข้าเด็คที่กำลังแก้ไขอยู่ (การ์ดใบเดียวใช้ซ้ำได้หลายเด็ค)
    el.onclick = () => {
      if (activeIndexes.includes(card.id)) {
        teamDecks[activeEditSlot].indexes = activeIndexes.filter(i => i !== card.id);
      } else {
        if (activeIndexes.length >= maxTeamSize) {
          alert(`เลือกได้สูงสุด ${maxTeamSize} ตัวต่อเด็ค`);
          return;
        }
        activeIndexes.push(card.id);
      }
      saveTeamDecks(teamDecks);
      renderDeckTabs();
      renderDeck();
    };

    //  กดค้างเพื่อลบ (ขาย)
    let pressTimer;
    function startPress() {
      pressTimer = setTimeout(async () => {
        if (card.locked) return;
        //  กันขายการ์ดที่ถูกใช้อยู่ในเด็คไหนก็ตาม (ไม่ใช่แค่เด็คที่กำลังแก้ไข) —
        // ไม่งั้นตำแหน่งในเด็คจะเพี้ยน/มีการ์ดหายไปโดยไม่ตั้งใจตอนกดค้างเผลอ
        const usedIn = teamDecks.filter(d => d.indexes.includes(card.id)).map(d => d.name);
        if (usedIn.length > 0) {
          alert(`ขายไม่ได้ — การ์ดนี้ถูกใช้อยู่ในเด็ค: ${usedIn.join(", ")}\nนำออกจากเด็คก่อนถึงจะขายได้`);
          return;
        }
        if (await uiConfirm(`ต้องการขายการ์ด ${card.name} ไหม?`)) {
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

    //  ปุ่มล็อค/ปลดล็อค — บันทึกขึ้นเซิฟเวอร์ด้วย (กันหายตอนล็อกอินใหม่/สลับเครื่อง)
    const lockBtn = document.createElement("div");
    lockBtn.innerHTML = card.locked ? "<span class=gicon-lock></span>" : "<span class=gicon-unlock></span>";
    lockBtn.style.position = "absolute";
    lockBtn.style.top = "4px";
    lockBtn.style.right = "4px";
    lockBtn.style.cursor = "pointer";
    lockBtn.onclick = async (e) => {
      e.stopPropagation();
      const nextLocked = !card.locked;
      card.locked = nextLocked;
      localStorage.setItem("deck", JSON.stringify(deck));
      renderDeck();

      if (window.GameAPI && GameAPI.isLoggedIn()) {
        const result = await GameAPI.setCardLock(card.id, nextLocked);
        if (result && result.ok) {
          applyServerDeck(result.deck); // ให้เซิฟเวอร์เป็นสำเนาหลัก เผื่อมีการเปลี่ยนแปลงอื่นแทรกมาระหว่างนี้
        } else {
          // เซิฟบันทึกไม่สำเร็จ (เช่นหลุดล็อกอินระหว่างนั้น) — ย้อนสถานะกลับฝั่งเครื่อง
          // กันหน้าจอโชว์ล็อคอยู่ทั้งที่จริงไม่ได้ถูกบันทึก
          card.locked = !nextLocked;
          localStorage.setItem("deck", JSON.stringify(deck));
          renderDeck();
          alert("บันทึกสถานะล็อคไม่สำเร็จ: " + (result?.error || "unknown error"));
        }
      }
    };

    // แสดง UI การ์ด
    const level = card.level || 1;
    let lvDisplay = `Lv.${level}`;
    if (card.stars >= 8 && level >= MAX_LEVEL) lvDisplay = "MAX";
    if (card.maxed) lvDisplay = "MAX";
    const starsDisplay = getStarsDisplay(card.stars, card.maxed);

    //  การ์ดใบนี้ถูกใช้ในเด็คอื่นด้วยไหม (นอกจากเด็คที่กำลังแก้ไขอยู่)
    const usedInOtherDecks = teamDecks
      .map((d, i) => (i !== activeEditSlot && d.indexes.includes(card.id)) ? d.name : null)
      .filter(Boolean);

    el.innerHTML = `
      <div class="title" style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${card.name}</div>
      <div class="title" style="font-size:9.5px">${starsDisplay} ${lvDisplay}</div>
      <div style="margin-top:3px; font-size:9.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
        HP:${stats.hp} • ATK:${stats.atk} • DEF:${stats.def}
      </div>
      <div class="meta" style="margin-top:2px; font-size:9.5px">
        Skill:${card.skill}
      </div>
      ${card.borrowed ? `<div class="meta" style="margin-top:2px; font-size:9px; color:#7dd3fc;"><span class=gicon-handshake></span> ยืมจาก ${card.lenderName || "เพื่อน"} • เหลือ ${Number.isFinite(card.roundsLeft) ? card.roundsLeft : 20} รอบ</div>` : ""}
      ${usedInOtherDecks.length > 0 ? `<div class="meta" style="margin-top:2px; font-size:9px; color:var(--muted);"><span class=gicon-note></span> อยู่ในเด็คอื่น: ${usedInOtherDecks.map(escapeHtml).join(", ")}</div>` : ""}
    `;
    el.appendChild(lockBtn);

    //  เลขลำดับในเด็คนี้ (มุมซ้ายบน) แสดงเฉพาะการ์ดที่ถูกเลือกเข้าเด็คที่กำลังแก้
    if (selectOrder !== -1) {
      const orderBadge = document.createElement("div");
      orderBadge.className = "team-order-badge";
      orderBadge.textContent = selectOrder + 1;
      el.appendChild(orderBadge);
    }

    if (card.locked) {
      el.style.boxShadow = "inset 0 0 6px 3px ";
      el.style.background = "rgba(255, 215, 0, 0.12)";
    }

    div.appendChild(el);
  });

  // อัปเดต header
  const header = document.getElementById("deckHeader");
  if (header) {
    header.innerHTML = `กำลังจัด: ${escapeHtml(teamDecks[activeEditSlot].name)} — เลือกการ์ดเป็นทีม (${deck.length}/100)
      <button id="sellAllBtn" style="margin-left:10px; padding:4px 8px; font-size:12px;"><span class=gicon-coin></span> ขายทั้งหมด</button>
      <button id="clearSelectionBtn" style="margin-left:6px; padding:4px 8px; font-size:12px;"><span class=gicon-trash></span> เคลียร์เด็คนี้</button>`;

    document.getElementById("sellAllBtn").onclick = sellAllUnlocked;
    document.getElementById("clearSelectionBtn").onclick = clearSelection;
  }
}

//  ขายการ์ด — เซิฟเป็นคนตรวจว่าการ์ดมีจริงในเด็คของเซิฟ + คิดราคาเอง (ดู
// routes/economy.js POST /sell, game-data/economy-data.js calcSellPrice).
// ห้ามคำนวณราคา/เพิ่มเงินเองฝั่ง client อีกต่อไป
async function sellCard(cardId) {
  const deck = JSON.parse(localStorage.getItem("deck") || "[]");
  const card = deck.find(c => c.id === cardId);
  if (!card) return;

  if (card.locked) {
    return;
  }

  //  กันขายการ์ดที่ถูกใช้อยู่ในเด็คไหนก็ตาม (เผื่อเรียกจากที่อื่นนอกเหนือจากปุ่มกดค้าง
  // ด้านบน ที่เช็คไปแล้วรอบหนึ่ง — กันไว้สองชั้นไม่ให้เด็คเพี้ยนตำแหน่ง)
  const usedIn = teamDecks.filter(d => d.indexes.includes(cardId)).map(d => d.name);
  if (usedIn.length > 0) {
    alert(`ขายไม่ได้ — การ์ดนี้ถูกใช้อยู่ในเด็ค: ${usedIn.join(", ")}\nนำออกจากเด็คก่อนถึงจะขายได้`);
    return;
  }

  if (!window.GameAPI || !GameAPI.isLoggedIn()) {
    alert("ต้องเข้าสู่ระบบ (username + PIN) ก่อนขายการ์ด");
    return;
  }

  const result = await GameAPI.sellCard(cardId);
  if (!result || !result.ok) {
    alert("ขายไม่สำเร็จ: " + (result?.error || "unknown error"));
    return;
  }

  applyServerMoney(result.money);
  applyServerDeck(result.deck);
  removeCardFromAllDecks(cardId);
  alert(`ขาย ${result.sold.name} (${result.sold.rarity}, ${result.sold.stars || 1}) ได้ ${result.price} เหรียญ`);
}

async function sellAllUnlocked() {
  const deck = JSON.parse(localStorage.getItem("deck") || "[]");
  if (deck.length === 0) {
    alert("ไม่มีการ์ดในเด็ค");
    return;
  }

  //  ป้องกันการ์ดที่ถูกใช้อยู่ในเด็คไหนก็ตาม (ไม่ใช่แค่เด็คที่กำลังแก้ไขอยู่)
  const usedIds = new Set(teamDecks.flatMap(d => d.indexes));
  const cardIds = deck
    .filter(c => !c.locked && !usedIds.has(c.id))
    .map(c => c.id);
  if (cardIds.length === 0) {
    alert("ไม่มีการ์ดที่ขายได้ (การ์ดที่เหลือถูกล็อค หรืออยู่ในเด็คใดเด็คหนึ่ง)");
    return;
  }

  if (!window.GameAPI || !GameAPI.isLoggedIn()) {
    alert("ต้องเข้าสู่ระบบ (username + PIN) ก่อนขายการ์ด");
    return;
  }

  if (!(await uiConfirm(`คุณต้องการขายการ์ดทั้งหมดที่ไม่ได้ล็อคและไม่ได้อยู่ในเด็คไหนเลย (${cardIds.length} ใบ)?`))) return;

  //  เซิฟเป็นคนตรวจว่าการ์ดแต่ละใบมีจริง + คิดราคาเอง ไม่เชื่อยอดรวมจาก client
  const result = await GameAPI.sellAllCards(cardIds);
  if (!result || !result.ok) {
    alert("ขายไม่สำเร็จ: " + (result?.error || "unknown error"));
    return;
  }

  applyServerMoney(result.money);
  applyServerDeck(result.deck);
  alert(`ขายเสร็จสิ้น ได้เงินรวม ${result.totalEarned} `);
}

// ตัด id การ์ดที่ขายไปแล้วออกจากทุกเด็ค (กันเด็คค้าง id ที่ไม่มีการ์ดจริงแล้ว)
function removeCardFromAllDecks(cardId) {
  let changed = false;
  teamDecks.forEach((d) => {
    if (d.indexes.includes(cardId)) {
      d.indexes = d.indexes.filter(id => id !== cardId);
      changed = true;
    }
  });
  if (changed) saveTeamDecks(teamDecks);
}

function clearSelection() {
  teamDecks[activeEditSlot].indexes = [];
  saveTeamDecks(teamDecks);
  renderDeckTabs();
  renderDeck();
}

renderDeckTabs();
renderDeck();
