// public/js/data/upgradeSkills.js — card SKILL upgrade UI (bumps "Name LN" in
// card.skill; separate mechanic from the card LEVEL upgrades in upgrade.js).
//
// Previously this whole file rolled its own RNG and wrote bag+deck straight to
// localStorage — bypassing loadBag()/saveBag() and loadDeck()/applyServerDeck()
// entirely (raw JSON.parse/localStorage.setItem calls). That corrupted the
// encrypted bag payload (bag.js's hash check would then reset it) and got
// silently overwritten by syncBagFromServer()/syncDeckFromServer() on the next
// page load — i.e. the shard cost AND the skill level-up both looked like they
// "reverted". See routes/economy.js POST /skills/upgrade for the real fix: the
// server now owns the cost, the RNG roll, and the deck/bag update.

function goBack(){
  if (document.referrer) {
    window.location.href = document.referrer;
  } else {
    window.location.href = "game.html";
  }
}

//  กำหนดเลเวลสูงสุด (ต้องตรงกับ SKILL_UPGRADE_MAX_LEVEL บนเซิฟ)
const MAX_LEVEL = 3;

const SHARD_KEY_BY_RARITY = {
  Common: "shardGray", Rare: "shardBlue", Epic: "shardPurple",
  Legendary: "shardGold", Mythical: "shardRed", Cosmic: "shardSky",
};
const SHARD_NAME_BY_KEY = {
  shardGray: "ชาร์ดเทา", shardBlue: "ชาร์ดน้ำเงิน", shardPurple: "ชาร์ดม่วง",
  shardGold: "ชาร์ดทอง", shardRed: "ชาร์ดแดง", shardSky: "ชาร์ดฟ้า",
};

function renderUpgradeDeck() {
  const div = document.getElementById("deck-wrapper");
  div.innerHTML = "";

  let deck = typeof loadDeck === "function" ? loadDeck() : [];

  deck.sort((a, b) => {
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
    const rarityOrder = { Cosmic: 6, Mythical: 5, Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
    return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
  });

  const countBadge = document.getElementById("deckCount");
  if (countBadge) countBadge.textContent = `${deck.length} ใบ`;

  deck.forEach(card => {
    const el = document.createElement("div");
    const rarityClass = card.rarity ? card.rarity.toLowerCase() : "common";
    el.className = `card-box ${rarityClass}`;

    // ระดับสกิลปัจจุบัน แกะจาก "ชื่อสกิล LN" เพื่อโชว์ป้ายเลเวล + ริบบิ้น MAX
    // บนตัวการ์ดเอง (ไม่ต้องกดเข้าไปดูรายละเอียดก่อนถึงจะรู้ว่าใบไหนตันแล้ว)
    const skillMatch = typeof card.skill === "string" ? card.skill.match(/L(\d+)/) : null;
    const skillLevel = skillMatch ? parseInt(skillMatch[1], 10) : 0;
    const isMax = skillLevel >= MAX_LEVEL;

    el.innerHTML = `
      ${isMax ? '<span class="max-ribbon">MAX</span>' : ""}
      <div class="title"><b>${card.name}</b>${skillLevel ? `<span class="skill-lv-pill">Lv.${skillLevel}</span>` : ""}</div>
      <div class="stars-row"><span class="glow-stars">${"<span class=gicon-star></span>".repeat(Math.min(card.stars || 1, 6))}</span></div>
      <div class="meta">${card.rarity || "Common"}</div>
      <div class="meta card-skill-line"><span class="ico ico-bolt" aria-hidden="true"></span>${card.skill}</div>
      <button class="card-select-btn" onclick="showSkillDetail('${card.id}')">เลือก</button>
    `;
    div.appendChild(el);
  });
}

function showSkillDetail(id) {
  const deck = typeof loadDeck === "function" ? loadDeck() : [];
  const card = deck.find(c => c.id === id);
  if (!card) return;

  const container = document.getElementById("skillDetail");

  let match = typeof card.skill === "string" ? card.skill.match(/(.+) L(\d+)/) : null;
  let nextSkill = null, cost = null, shardKey = null, chance = null;

  if (match) {
    let base = match[1];
    let level = parseInt(match[2], 10);

    if (level < MAX_LEVEL) {
      nextSkill = `${base} L${level + 1}`;
      cost = 10 * level;
      shardKey = SHARD_KEY_BY_RARITY[card.rarity || "Common"];
      const successRates = { 1: 0.20, 2: 0.05, 3: 0.01 };
      chance = successRates[level] ? (successRates[level] * 100).toFixed(0) + "%" : "0%";
    }
  }

  const bag = typeof loadBag === "function" ? loadBag() : {};
  const have = shardKey ? (bag[shardKey] || 0) : 0;
  const shardName = shardKey ? (SHARD_NAME_BY_KEY[shardKey] || shardKey) : "";
  const shardIcon = shardKey && typeof itemIconHTML === "function" ? itemIconHTML(shardKey) : "";

  // หัวการ์ด: วงกลมอักษรย่อสีตาม rarity + ชื่อ + ป้าย rarity — ให้รู้ทันทีว่ากำลัง
  // ดูใบไหนอยู่ โดยไม่ต้องเลื่อนสายตาไปมองการ์ดที่เลือกไว้ด้านบนอีกที
  const rarity = card.rarity || "Common";
  const headHtml = `
    <div class="skill-detail-head">
      <span class="skill-emblem rarity-${rarity}">${(card.name || "?").charAt(0)}</span>
      <div class="skill-detail-title">
        <b>${card.name}</b>
        <span class="rarity-pill rarity-${rarity}">${rarity}</span>
      </div>
    </div>`;

  let barHtml = `<div class="progress-bar"><div id="progress-bar" class="progress-fill"></div></div>`;
  let btnHtml;

  if (nextSkill) {
    const loggedIn = window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn();
    const disabled = (!loggedIn || have < cost) ? "disabled" : "";
    const shortHtml = have < cost ? '<span class="stat-pill warn">ชาร์ดไม่พอ</span>' : '';
    btnHtml = `
      <div class="stat-pills">
        <span class="stat-pill">${shardIcon}${have}/${cost} ${shardName}</span>
        <span class="stat-pill chance"><span class="ico ico-spark" aria-hidden="true"></span>โอกาสสำเร็จ ${chance}</span>
        ${shortHtml}
      </div>
      <button class="upgrade-btn" onclick="upgradeSkill('${id}')" ${disabled}>
        <span class="ico ico-up" aria-hidden="true"></span>อัปเกรดเป็น ${nextSkill}
      </button>
      ${!loggedIn ? '<div class="muted" style="margin-top:6px">ต้องเข้าสู่ระบบ (username + PIN) ก่อนอัปเกรด</div>' : ''}`;
  } else {
    barHtml = `<div class="progress-bar">
                 <div class="progress-fill" style="width:100%; background:linear-gradient(90deg,#06d6a0,#07f5b5)"></div>
               </div>`;
    btnHtml = `<p class="skill-max-tag"><span class="ico ico-medal" aria-hidden="true"></span><b>Skill MAX</b> — อัปเกรดสกิลใบนี้ครบแล้ว</p>`;
  }

  container.innerHTML = `
    ${headHtml}
    <p class="skill-current-line">Skill ปัจจุบัน: <b>${card.skill}</b></p>
    ${barHtml}
    ${btnHtml}
  `;
}

// Server owns the cost, the RNG roll, and the deck/bag write — this just calls
// it and re-renders from whatever comes back. Matches guaranteeUpgrade() in
// public/js/data/upgrade.js.
async function upgradeSkill(id) {
  if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) {
    alert("ต้องเข้าสู่ระบบ (username + PIN) ก่อนอัปเกรด");
    return;
  }

  const btn = document.querySelector(".upgrade-btn");
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  }

  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = "0%";

  const result = await GameAPI.skillUpgrade(id);
  if (!result || !result.ok) {
    alert("อัปเกรดไม่สำเร็จ: " + (result?.error || "unknown error"));
    if (btn) { btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer"; }
    return;
  }

  applyServerBag(result.bag);
  if (bar) bar.style.width = result.success ? "100%" : "40%";

  setTimeout(async () => {
    // this endpoint only returns the one card, not the whole deck — sync the
    // full deck from the server the same way guaranteeUpgrade() does.
    if (typeof syncDeckFromServer === "function") await syncDeckFromServer();
    renderUpgradeDeck();
    showSkillDetail(id);

    const btnBack = document.querySelector(".upgrade-btn");
    if (btnBack) { btnBack.disabled = false; btnBack.style.opacity = "1"; btnBack.style.cursor = "pointer"; }
  }, 1200);
}

async function bootUpgradeSkills() {
  if (window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn() && typeof syncDeckFromServer === "function") {
    await syncDeckFromServer();
  }
  renderUpgradeDeck();
}
document.addEventListener("DOMContentLoaded", bootUpgradeSkills);
