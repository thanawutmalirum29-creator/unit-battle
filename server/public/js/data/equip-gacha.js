// =========================
// ข้อมูล EQUIP_GACHA_POOLS (2 ตู้)
// เพิ่มตู้ใหม่ได้ที่นี่เลย
// =========================
const EQUIP_GACHA_POOLS = {

  EQUIP_POOL_1: {
    cost: 60,
    featuredCard: {
      name: "Dragon Slayer",
      type: "Weapon",
      stat: "atk",
      base: 300,
      mode: "flat",
      rarity: "Legendary",
      bannerName: "ตู้อาวุธ & เกราะ",
      icon: "⚔️"
    },
    pool: [
      // ── Weapons ──
      // Flat ATK
      { name: "Bronze Sword",    type: "Weapon",    stat: "atk", base: 20,  mode: "flat",    rarity: "Common",    rate: 8.00 },
      { name: "Iron Sword",      type: "Weapon",    stat: "atk", base: 50,  mode: "flat",    rarity: "Common",    rate: 6.00 },
      { name: "Steel Sword",     type: "Weapon",    stat: "atk", base: 80,  mode: "flat",    rarity: "Rare",      rate: 4.00 },
      { name: "Flaming Dagger",  type: "Weapon",    stat: "atk", base: 120, mode: "flat",    rarity: "Rare",      rate: 3.00 },
      { name: "Shadow Katana",   type: "Weapon",    stat: "atk", base: 150, mode: "flat",    rarity: "Rare",      rate: 2.50 },
      { name: "Titan Axe",       type: "Weapon",    stat: "atk", base: 200, mode: "flat",    rarity: "Epic",      rate: 1.50 },
      { name: "Obsidian Blade",  type: "Weapon",    stat: "atk", base: 250, mode: "flat",    rarity: "Epic",      rate: 1.00 },
      { name: "Dragon Slayer",   type: "Weapon",    stat: "atk", base: 300, mode: "flat",    rarity: "Legendary", rate: 0.40 },
      { name: "Celestial Sword", type: "Weapon",    stat: "atk", base: 350, mode: "flat",    rarity: "Legendary", rate: 0.25 },
      { name: "Apocalypse Axe",  type: "Weapon",    stat: "atk", base: 400, mode: "flat",    rarity: "Legendary", rate: 0.10 },
      // Percent ATK
      { name: "Mystic Blade",    type: "Weapon",    stat: "atk", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Thunder Axe",     type: "Weapon",    stat: "atk", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Crystal Staff",   type: "Weapon",    stat: "atk", base: 6,   mode: "percent", rarity: "Rare",      rate: 1.80 },
      { name: "Dragon Fang",     type: "Weapon",    stat: "atk", base: 7,   mode: "percent", rarity: "Epic",      rate: 1.20 },
      { name: "Phoenix Blade",   type: "Weapon",    stat: "atk", base: 8,   mode: "percent", rarity: "Epic",      rate: 1.00 },
      { name: "Infinity Edge",   type: "Weapon",    stat: "atk", base: 19,  mode: "percent", rarity: "Legendary", rate: 0.10 },
      // ── Armor ──
      // Flat DEF
      { name: "Wooden Shield",   type: "Armor",     stat: "def", base: 20,  mode: "flat",    rarity: "Common",    rate: 8.00 },
      { name: "Iron Shield",     type: "Armor",     stat: "def", base: 50,  mode: "flat",    rarity: "Common",    rate: 6.00 },
      { name: "Steel Armor",     type: "Armor",     stat: "def", base: 80,  mode: "flat",    rarity: "Rare",      rate: 4.00 },
      { name: "Dragon Armor",    type: "Armor",     stat: "def", base: 120, mode: "flat",    rarity: "Rare",      rate: 3.00 },
      { name: "Titan Plate",     type: "Armor",     stat: "def", base: 150, mode: "flat",    rarity: "Rare",      rate: 2.50 },
      { name: "Obsidian Mail",   type: "Armor",     stat: "def", base: 200, mode: "flat",    rarity: "Epic",      rate: 1.50 },
      { name: "Celestial Plate", type: "Armor",     stat: "def", base: 250, mode: "flat",    rarity: "Epic",      rate: 1.00 },
      { name: "Aegis Shield",    type: "Armor",     stat: "def", base: 300, mode: "flat",    rarity: "Legendary", rate: 0.40 },
      { name: "Divine Armor",    type: "Armor",     stat: "def", base: 350, mode: "flat",    rarity: "Legendary", rate: 0.25 },
      { name: "Apocalypse Plate",type: "Armor",     stat: "def", base: 400, mode: "flat",    rarity: "Legendary", rate: 0.10 },
      // Percent DEF
      { name: "Guardian Shield", type: "Armor",     stat: "def", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Dragon Mail",     type: "Armor",     stat: "def", base: 7,   mode: "percent", rarity: "Epic",      rate: 1.20 },
      { name: "Infinity Aegis",  type: "Armor",     stat: "def", base: 19,  mode: "percent", rarity: "Legendary", rate: 0.10 },
    ]
  },

  EQUIP_POOL_2: {
    cost: 80,
    featuredCard: {
      name: "Divine Amulet",
      type: "Accessory",
      stat: "hp",
      base: 400,
      mode: "flat",
      rarity: "Legendary",
      bannerName: "ตู้เครื่องประดับ",
      icon: "✨"
    },
    pool: [
      // ── Accessories ──
      // Flat HP
      { name: "Silver Ring",            type: "Accessory", stat: "hp", base: 20,  mode: "flat",    rarity: "Common",    rate: 8.00 },
      { name: "Ruby Necklace",          type: "Accessory", stat: "hp", base: 50,  mode: "flat",    rarity: "Common",    rate: 6.00 },
      { name: "Emerald Bracelet",       type: "Accessory", stat: "hp", base: 80,  mode: "flat",    rarity: "Rare",      rate: 4.00 },
      { name: "Sapphire Ring",          type: "Accessory", stat: "hp", base: 120, mode: "flat",    rarity: "Rare",      rate: 3.00 },
      { name: "Golden Amulet",          type: "Accessory", stat: "hp", base: 150, mode: "flat",    rarity: "Rare",      rate: 2.50 },
      { name: "Diamond Bracelet",       type: "Accessory", stat: "hp", base: 200, mode: "flat",    rarity: "Epic",      rate: 1.50 },
      { name: "Titan Ring",             type: "Accessory", stat: "hp", base: 250, mode: "flat",    rarity: "Epic",      rate: 1.00 },
      { name: "Celestial Necklace",     type: "Accessory", stat: "hp", base: 300, mode: "flat",    rarity: "Legendary", rate: 0.40 },
      { name: "Apocalypse Ring",        type: "Accessory", stat: "hp", base: 350, mode: "flat",    rarity: "Legendary", rate: 0.25 },
      { name: "Divine Amulet",          type: "Accessory", stat: "hp", base: 400, mode: "flat",    rarity: "Legendary", rate: 0.10 },
      // Percent HP
      { name: "Amethyst Pendant",       type: "Accessory", stat: "hp", base: 5,   mode: "percent", rarity: "Rare",      rate: 2.00 },
      { name: "Topaz Ring",             type: "Accessory", stat: "hp", base: 6,   mode: "percent", rarity: "Rare",      rate: 1.80 },
      { name: "Celestial Locket",       type: "Accessory", stat: "hp", base: 7,   mode: "percent", rarity: "Rare",      rate: 1.60 },
      { name: "Dragon Heart Amulet",    type: "Accessory", stat: "hp", base: 8,   mode: "percent", rarity: "Epic",      rate: 1.20 },
      { name: "Phoenix Ring",           type: "Accessory", stat: "hp", base: 9,   mode: "percent", rarity: "Epic",      rate: 1.00 },
      { name: "Titan Pendant",          type: "Accessory", stat: "hp", base: 10,  mode: "percent", rarity: "Epic",      rate: 0.80 },
      { name: "Oblivion Ring",          type: "Accessory", stat: "hp", base: 11,  mode: "percent", rarity: "Epic",      rate: 0.60 },
      { name: "Eternal Pendant",        type: "Accessory", stat: "hp", base: 12,  mode: "percent", rarity: "Legendary", rate: 0.40 },
      { name: "Shadow Ring",            type: "Accessory", stat: "hp", base: 13,  mode: "percent", rarity: "Legendary", rate: 0.30 },
      { name: "Divine Pendant",         type: "Accessory", stat: "hp", base: 14,  mode: "percent", rarity: "Legendary", rate: 0.20 },
      { name: "Starlight Charm",        type: "Accessory", stat: "hp", base: 15,  mode: "percent", rarity: "Legendary", rate: 0.15 },
      { name: "Infinity Relic",         type: "Accessory", stat: "hp", base: 19,  mode: "percent", rarity: "Legendary", rate: 0.05 },
      // Bonus: Weapon & Armor ติดมาบ้างในตู้นี้ด้วย
      { name: "Steel Sword",            type: "Weapon",    stat: "atk", base: 80,  mode: "flat",   rarity: "Rare",      rate: 2.00 },
      { name: "Steel Armor",            type: "Armor",     stat: "def", base: 80,  mode: "flat",   rarity: "Rare",      rate: 2.00 },
      { name: "Mystic Blade",           type: "Weapon",    stat: "atk", base: 5,   mode: "percent",rarity: "Rare",      rate: 1.00 },
      { name: "Guardian Shield",        type: "Armor",     stat: "def", base: 5,   mode: "percent",rarity: "Rare",      rate: 1.00 },
    ]
  }

};

// =========================
// Utility
// =========================
function customRound(num) {
  return (num % 1) >= 0.5 ? Math.ceil(num) : Math.floor(num);
}

function bonusText(eq) {
  return eq.mode === "percent"
    ? `+${eq.bonus ?? eq.base}% ${eq.stat.toUpperCase()}`
    : `+${eq.bonus ?? eq.base} ${eq.stat.toUpperCase()}`;
}

function formatMoney(num) {
  if (num >= 1e33) return (num / 1e33).toFixed(1) + "g";
  if (num >= 1e30) return (num / 1e30).toFixed(1) + "f";
  if (num >= 1e27) return (num / 1e27).toFixed(1) + "d";
  if (num >= 1e24) return (num / 1e24).toFixed(1) + "c";
  if (num >= 1e21) return (num / 1e21).toFixed(1) + "b";
  if (num >= 1e18) return (num / 1e18).toFixed(1) + "a";
  if (num >= 1e15) return (num / 1e15).toFixed(1) + "Q";
  if (num >= 1e12) return (num / 1e12).toFixed(1) + "T";
  if (num >= 1e9)  return (num / 1e9).toFixed(1)  + "B";
  if (num >= 1e6)  return (num / 1e6).toFixed(1)  + "M";
  if (num >= 1e3)  return (num / 1e3).toFixed(1)  + "K";
  return num.toString();
}

function weightedPickEquip(pool) {
  const total = pool.reduce((s, it) => s + it.rate, 0);
  let r = Math.random() * total;
  for (const it of pool) {
    if (r < it.rate) return it;
    r -= it.rate;
  }
  return pool[pool.length - 1];
}

// =========================
// EquipBag helpers
// =========================
function getEquipBag() {
  return JSON.parse(localStorage.getItem("equipBag") || "[]");
}
function saveEquipBag(bag) {
  localStorage.setItem("equipBag", JSON.stringify(bag));
}

// =========================
// Render ตู้กาชา (เหมือน GACHA.html)
// =========================
function renderEquipGachaBoxes() {
  const wrap = document.querySelector(".gacha-container");
  if (!wrap) return;
  wrap.innerHTML = "";

  for (const key in EQUIP_GACHA_POOLS) {
    const poolObj = EQUIP_GACHA_POOLS[key];
    const f = poolObj.featuredCard;
    const cost1   = poolObj.cost;
    const cost3   = Math.floor(cost1 * 3 * 0.9);
    const cost10  = Math.floor(cost1 * 10 * 0.8);
    const bonusTxt = f.mode === "percent"
      ? `+${f.base}% ${f.stat.toUpperCase()}`
      : `+${f.base} ${f.stat.toUpperCase()}`;
    const typeIcon = f.type === "Weapon" ? "⚔️" : f.type === "Armor" ? "🛡️" : "✨";

    const box = document.createElement("div");
    box.className = "gacha-box";
    box.innerHTML = `
      <div class="gacha-header">
        <span>${f.icon} ${f.bannerName}</span>
        <button onclick="showEquipRates('${key}')">!</button>
      </div>
      <div class="gacha-featured">
        <div class="card rarity-${f.rarity}">
          <div class="title">${f.name}</div>
          <div class="meta">${typeIcon} ${f.type} • ⭐ ${f.rarity}</div>
          <div style="margin-top:4px; font-size:12px">${bonusTxt}</div>
        </div>
      </div>
      <div class="gacha-actions">
        <button onclick="gachaEquipPull('${key}', 1)">สุ่ม 1 (${formatMoney(cost1)}💰)</button>
        <button onclick="gachaEquipPull('${key}', 3)">สุ่ม 3 (${formatMoney(cost3)}💰)</button>
        <button onclick="gachaEquipPull('${key}', 10)">สุ่ม 10 (${formatMoney(cost10)}💰)</button>
      </div>
    `;
    wrap.appendChild(box);
  }
}

// =========================
// ป๊อปอัพอัตราดรอป
// =========================
let _currentEquipRatePool = null;

function showEquipRates(poolKey) {
  _currentEquipRatePool = poolKey;
  const pool = EQUIP_GACHA_POOLS[poolKey].pool;

  // รวม rate ตาม rarity
  const grouped = {};
  pool.forEach(it => {
    if (!grouped[it.rarity]) grouped[it.rarity] = { rate: 0, items: [] };
    grouped[it.rarity].rate += it.rate;
    grouped[it.rarity].items.push(it);
  });

  const total = pool.reduce((s, it) => s + it.rate, 0);
  const rarityOrder = ["Legendary", "Epic", "Rare", "Common"];
  let html = "";

  for (const rarity of rarityOrder) {
    if (!grouped[rarity]) continue;
    const g = grouped[rarity];
    const pct = ((g.rate / total) * 100).toFixed(2);
    html += `
      <div class="rate-row ${rarity}">
        <span>${rarity}</span>
        <span>${pct}%</span>
      </div>
      <div class="char-grid">
        ${g.items.map(it => {
          const txt = it.mode === "percent" ? `+${it.base}%` : `+${it.base}`;
          return `<div>• ${it.name} (${txt} ${it.stat.toUpperCase()})</div>`;
        }).join("")}
      </div>
    `;
  }

  document.getElementById("rateDetails").innerHTML = html;
  document.getElementById("ratePopup").classList.remove("hidden");
  document.body.classList.add("no-scroll");
}

function closeEquipRatePopup() {
  document.getElementById("ratePopup").classList.add("hidden");
  document.body.classList.remove("no-scroll");
}

// =========================
// สุ่มอุปกรณ์
// =========================
function gachaEquipPull(poolKey, count) {
  const poolObj = EQUIP_GACHA_POOLS[poolKey];
  const pool = poolObj.pool;
  const cost1  = poolObj.cost;
  const cost3  = Math.floor(cost1 * 3 * 0.9);
  const cost10 = Math.floor(cost1 * 10 * 0.8);
  const totalCost = count === 10 ? cost10 : count === 3 ? cost3 : cost1;

  let money = loadMoney();
  if (money < totalCost) {
    alert("💰 เงินไม่พอ! ขาดอีก " + (totalCost - money) + "💰");
    return;
  }
  money -= totalCost;
  saveMoney(money);
  updateMoneyUI(money);

  const results = [];
  for (let i = 0; i < count; i++) {
    const template = weightedPickEquip(pool);
    const item = {
      id: "equip-" + Date.now() + "-" + Math.random(),
      name: template.name,
      type: template.type,
      stat: template.stat,
      rarity: template.rarity,
      bonus: customRound(template.base),
      mode: template.mode || "flat",
    };
    results.push(item);
  }

  let bag = getEquipBag();
  bag.push(...results);
  saveEquipBag(bag);

  showEquipResults(results);
}

// =========================
// แสดงผลการสุ่ม (เหมือน GACHA.html)
// =========================
async function showEquipResults(results) {
  const overlay = document.getElementById("gachaOverlay");
  const skipBtn = document.getElementById("skipButton");
  let skipped = false;

  overlay.style.display = "flex";
  document.body.classList.add("no-scroll");

  Array.from(overlay.querySelectorAll(".gacha-fly-card, .gacha-static-card, .result-wrap"))
       .forEach(el => el.remove());

  const rarityRank = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };

  function cleanup() {
    overlay.style.display = "none";
    Array.from(overlay.querySelectorAll(".gacha-fly-card, .gacha-static-card, .result-wrap"))
         .forEach(el => el.remove());
    skipBtn.classList.add("hidden");
    document.body.classList.remove("no-scroll");
    if (typeof renderEquipBag === "function") renderEquipBag();
  }

  function cardHTML(eq) {
    const typeIcon = eq.type === "Weapon" ? "⚔️" : eq.type === "Armor" ? "🛡️" : "✨";
    return `
      <div style="font-size:16px">${typeIcon} ${eq.name}</div>
      <div>⭐ ${eq.rarity}</div>
      <div style="font-size:12px">${bonusText(eq)}</div>
    `;
  }

  function renderAll() {
    Array.from(overlay.querySelectorAll(".gacha-fly-card, .gacha-static-card, .result-wrap"))
         .forEach(el => el.remove());

    const wrap = document.createElement("div");
    wrap.className = "result-wrap";
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:20px;margin-top:30px;";

    const sorted = [...results].sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));

    if (results.length === 3) {
      const best = sorted[0];
      const bestEl = document.createElement("div");
      bestEl.className = `gacha-static-card rarity-${best.rarity}`;
      bestEl.style.margin = "0 auto";
      bestEl.innerHTML = cardHTML(best);
      wrap.appendChild(bestEl);

      const bottomRow = document.createElement("div");
      bottomRow.style.cssText = "display:flex;gap:12px;justify-content:center;";
      sorted.slice(1).forEach(eq => {
        const el = document.createElement("div");
        el.className = `gacha-static-card rarity-${eq.rarity}`;
        el.innerHTML = cardHTML(eq);
        bottomRow.appendChild(el);
      });
      wrap.appendChild(bottomRow);
    } else {
      const container = document.createElement("div");
      container.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;justify-content:center;max-width:600px;";
      sorted.forEach(eq => {
        const el = document.createElement("div");
        el.className = `gacha-static-card rarity-${eq.rarity}`;
        el.innerHTML = cardHTML(eq);
        container.appendChild(el);
      });
      wrap.appendChild(container);
    }

    let closeBtn = overlay.querySelector(".close-btn");
    if (!closeBtn) {
      closeBtn = document.createElement("button");
      closeBtn.className = "close-btn";
      closeBtn.innerText = "ปิด";
      closeBtn.style.cssText = "padding:8px 16px;border:none;border-radius:6px;background:#607d8b;color:white;font-weight:bold;cursor:pointer;";
      closeBtn.onclick = cleanup;
      wrap.appendChild(closeBtn);
    }

    overlay.appendChild(wrap);
  }

  skipBtn.onclick = () => {
    skipped = true;
    renderAll();
    skipBtn.classList.add("hidden");
  };

  for (let i = 0; i < results.length; i++) {
    if (skipped) break;
    const eq = results[i];
    const el = document.createElement("div");
    el.className = `gacha-fly-card rarity-${eq.rarity}`;
    el.innerHTML = `<div style="font-size:18px">${eq.name}</div><div>⭐ ${eq.rarity}</div><div style="font-size:12px">${bonusText(eq)}</div>`;
    overlay.appendChild(el);

    if (i === 0) skipBtn.classList.remove("hidden");
    await new Promise(r => setTimeout(r, 1000));
    el.classList.add("fade-out");
    await new Promise(r => setTimeout(r, 200));
    el.remove();
  }

  if (!skipped) {
    setTimeout(() => {
      renderAll();
      skipBtn.classList.add("hidden");
    }, 200);
  }
}

document.addEventListener("DOMContentLoaded", renderEquipGachaBoxes);
