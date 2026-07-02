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

// ✅ กำหนดเลเวลสูงสุด (ต้องตรงกับ SKILL_UPGRADE_MAX_LEVEL บนเซิฟ)
const MAX_LEVEL = 3;

const SHARD_KEY_BY_RARITY = {
  Common: "shardGray", Rare: "shardBlue", Epic: "shardPurple",
  Legendary: "shardGold", Mythical: "shardRed", Cosmic: "shardSky",
};
const SHARD_NAME_BY_KEY = {
  shardGray: "⚪ ชาร์ดเทา", shardBlue: "🔵 ชาร์ดน้ำเงิน", shardPurple: "🟣 ชาร์ดม่วง",
  shardGold: "🟡 ชาร์ดทอง", shardRed: "🔴 ชาร์ดแดง", shardSky: "🌌 ชาร์ดฟ้า",
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

  let barHtml = `<div class="progress-bar"><div id="progress-bar" class="progress-fill"></div></div>`;
  let btnHtml;

  if (nextSkill) {
    const loggedIn = window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn();
    const disabled = (!loggedIn || have < cost) ? "disabled" : "";
    btnHtml = `<button class="upgrade-btn" onclick="upgradeSkill('${id}')" ${disabled}>
                  ⬆ อัปเกรดเป็น ${nextSkill}
                  <br>(ใช้ ${have}/${cost} ${shardName})
                  <br>💡 โอกาสสำเร็จ: ${chance}
               </button>
               ${!loggedIn ? '<div class="muted" style="margin-top:6px">ต้องเข้าสู่ระบบ (username + PIN) ก่อนอัปเกรด</div>' : ''}`;
  } else {
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
