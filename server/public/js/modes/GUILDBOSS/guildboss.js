// js/modes/GUILDBOSS/guildboss.js
//
// เวอร์ชันบอสกิลด์ของ modes/BOSS/boss.js — ต่อสู้จริงแบบเทิร์นเดียวกับระบบ Boss เดี่ยว
// (ผ่าน POST /api/battle/start mode:"guildboss" แล้ว POST /api/battle/:id/turn รันเทิร์นจริง
// ที่เซิฟ, ดูสกิล/แอนิเมชันได้เต็มรูปแบบเหมือนบอสเดี่ยว) ต่างจาก boss.js ตรงที่:
//   - ไม่มีหน้าเลือก "จะสู้บอสตัวไหน" เพราะกิลด์มีบอสตัวเดียว (โหลดสถานะจาก
//     GameAPI.guildBossStatus() มาโชว์เป็นพรีวิวก่อนกดสู้แทน)
//   - ดาเมจที่ทำได้ไปหักจาก HP กองกลางของกิลด์ (ใช้ร่วมกันทั้งกิลด์) ไม่ใช่ HP ส่วนตัว
//   - ไม่มีระบบรางวัลเงิน/ไอเทมต่อเทิร์นแบบบอสเดี่ยว — ได้ EXP กิลด์ + ของรางวัลตามด่านสะสม
//     ความเสียหายที่หน้ากิลด์แทน (ดู routes/guilds.js)
//   - จบไฟต์แล้วพากลับไปหน้ากิลด์ (แท็บบอส) แทนที่จะกลับไปหน้าเลือกโหมด

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

var battleRunning = false;
var playerTeam = [];
var enemyTeam = [];
var maxTeamSize = 4;
var currentBossPreview = null; // { bossName, currentHp, maxHp, defeated, attacksLeftToday }
var bossResultsShown = false;

/* =======================
   พรีวิวบอสกิลด์ (โหลดสถานะจริงจากเซิฟก่อนกดสู้)
   ======================= */
async function loadGuildBossPreview() {
  const mount = document.getElementById("guildbossPreview");
  const startBtn = document.getElementById("guildbossStartBtn");
  if (!mount) return;

  mount.innerHTML = '<p class="empty-hint">กำลังโหลดสถานะบอสกิลด์…</p>';
  if (startBtn) startBtn.disabled = true;

  const data = await GameAPI.guildBossStatus();
  if (!data || data.error) {
    mount.innerHTML = `<p class="empty-hint"><span class=gicon-warning></span> ${data?.error || "โหลดสถานะบอสกิลด์ไม่สำเร็จ — ต้องอยู่ในกิลด์ก่อน"}</p>`;
    return;
  }

  currentBossPreview = data;
  const pct = data.maxHp > 0 ? clamp((data.currentHp / data.maxHp) * 100, 0, 100) : 0;

  mount.innerHTML = `
    <div class="section-header boss-section-header">
      <h3><span class=gicon-skull></span> ${data.bossName}</h3>
    </div>
    <div class="hp-bar" style="height:14px; margin:8px 0">
      <div class="hp-fill red" style="width:${pct}%"></div>
    </div>
    <div class="meta">HP กองกลาง: ${data.currentHp.toLocaleString()} / ${data.maxHp.toLocaleString()}</div>
    <div class="meta">โจมตีได้อีกวันนี้: ${data.attacksLeftToday} / ${data.attacksLeftToday + data.attacksToday}</div>
    ${data.defeated ? '<p class="empty-hint"><span class=gicon-party></span> บอสถูกปราบแล้วในสัปดาห์นี้ — รอสัปดาห์หน้า</p>' : ""}
  `;

  if (startBtn) startBtn.disabled = data.defeated || data.attacksLeftToday <= 0 || battleRunning;
}

function backToGuild() {
  location.href = "guild.html?tab=boss";
}

/* =======================
   Battle Loop — เหมือน boss.js เป๊ะๆ แค่ mode เป็น "guildboss" และไม่มี bossKey
   (ดู routes/battle.js, server/battle/engine.js — เซิฟรันผลจริงทีละเทิร์นเหมือนกันทุกโหมด)
   ======================= */
async function startBattle() {
  if (battleRunning) return;
  if (!currentBossPreview || currentBossPreview.defeated || currentBossPreview.attacksLeftToday <= 0) {
    alert("ตอนนี้โจมตีบอสกิลด์ไม่ได้ (ถูกปราบแล้ว หรือโจมตีครบวันนี้แล้ว)");
    return;
  }

  const selected = loadSelectedTeam("guildboss");
  const cardIds = selected.slice(0, maxTeamSize);
  if (!cardIds.length) {
    alert("เลือกทีมก่อนถึงจะสู้ได้");
    return;
  }

  const startRes = await GameAPI.battleStart("guildboss", cardIds, {});
  if (!startRes || startRes.error) {
    alert("เริ่มสู้บอสกิลด์ไม่สำเร็จ: " + (startRes?.error || "ไม่ทราบสาเหตุ (เช็คอินเทอร์เน็ต/ล็อกอิน)"));
    return;
  }
  const battleId = startRes.battleId;

  battleRunning = true;
  bossResultsShown = false;
  if (window.HubUI) HubUI.enterBattle();

  playerTeam = startRes.playerTeam;
  enemyTeam = startRes.enemyTeam;
  logClear?.();
  log(`<span class=gicon-skull></span> เริ่มโจมตี ${currentBossPreview.bossName}`, "system");
  renderBattlefield();

  let guildDamageTotal = 0;
  let lastGuildHp = currentBossPreview.currentHp;
  let lastGuildMaxHp = currentBossPreview.maxHp;
  let guildDefeated = false;
  let guildLeveledUp = false;
  let guildLevel = null;

  const cancelBtn = document.getElementById("cancelBattleBtn");
  if (cancelBtn) {
    cancelBtn.style.display = "inline-block";
    cancelBtn.onclick = async () => {
      if (await uiConfirm("ยกเลิกการต่อสู้?", { icon: "<span class=gicon-x></span>" })) {
        log("<span class=gicon-warning></span> การต่อสู้ถูกยกเลิก", "system");
        GameAPI.battleForfeit(battleId); // fire-and-forget — ดาเมจที่ทำไปแล้วถูกหักลง HP กองกลางไปทุกเทิร์นแล้ว ไม่หายไปไหน
        if (window.HubUI) {
          HubUI.showResults({
            win: false,
            cancelled: true,
            title: "<span class=gicon-x></span> คุณยกเลิกการต่อสู้",
            extraNote: `ยกเลิกกลางคัน — ดาเมจที่ทำได้จริง (${guildDamageTotal.toLocaleString()}) หักจาก HP กองกลางไปแล้ว`,
            playerTeam: [...playerTeam],
            enemyTeam: [...enemyTeam],
            onContinue: backToGuild,
          });
          bossResultsShown = true;
        }
        endBattle(false, { guildDamageTotal, lastGuildHp, lastGuildMaxHp, guildDefeated, guildLeveledUp, guildLevel });
      }
    };
  }

  let turn = 1;
  while (battleRunning) {
    log(`--- เทิร์น ${turn} ---`, "system");

    const turnRes = await GameAPI.battleTurn(battleId);
    if (!turnRes || turnRes.error) {
      log(`<span class=gicon-warning></span> เชื่อมต่อเซิฟไม่ได้ (${turnRes?.error || "network"}) — หยุดการต่อสู้`, "system");
      endBattle(false, { guildDamageTotal, lastGuildHp, lastGuildMaxHp, guildDefeated, guildLeveledUp, guildLevel });
      return;
    }

    for (const entry of turnRes.log || []) {
      log(entry.msg, entry.side);
      await sleep(Math.max(120, getBattleSpeed() * 0.25));
    }

    if (window.HubUI) HubUI.setDamageStats(turnRes.damageStats);
    if (typeof playTurnEvents === "function") await playTurnEvents(turnRes.events);

    playerTeam = turnRes.playerTeam;
    enemyTeam = turnRes.enemyTeam;
    renderBattlefield();
    updateAllHpBars();

    // rewards ต่อเทิร์นของโหมดนี้ = { damage, currentHp, maxHp, defeated, guildLevel, leveledUp }
    // (ดู routes/battle.js — เขียนลง guild_boss_state จริงทุกเทิร์นที่มีดาเมจใหม่)
    if (turnRes.rewards) {
      const r = turnRes.rewards;
      guildDamageTotal += r.damage || 0;
      lastGuildHp = r.currentHp;
      lastGuildMaxHp = r.maxHp;
      if (r.defeated) guildDefeated = true;
      if (r.leveledUp) { guildLeveledUp = true; guildLevel = r.guildLevel; }
      if (r.damage) log(`<span class=gicon-impact></span> HP กองกลางกิลด์ -${r.damage.toLocaleString()} (เหลือ ${Math.max(0, r.currentHp).toLocaleString()})`, "system");
      if (r.defeated) log("<span class=gicon-party></span> HP กองกลางกิลด์หมดแล้ว! บอสกิลด์ถูกปราบ!", "system");
      if (r.leveledUp) log(`<span class=gicon-crown></span> กิลด์เลื่อนเป็นเลเวล ${r.guildLevel}!`, "system");
    }

    if (turnRes.finished || guildDefeated) {
      log(turnRes.win ? "<span class=gicon-party></span> โค่นบอสสำเร็จ!" : "<span class=gicon-skull></span> ทีมผู้เล่นพ่ายแพ้...", "system");
      endBattle(turnRes.win || guildDefeated, { guildDamageTotal, lastGuildHp, lastGuildMaxHp, guildDefeated, guildLeveledUp, guildLevel });
      return;
    }

    turn++;
    await sleep(300);
  }
}

function endBattle(win, summary) {
  battleRunning = false;
  const cancelBtn = document.getElementById("cancelBattleBtn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (bossResultsShown) { bossResultsShown = false; return; }
  bossResultsShown = true;

  summary = summary || {};
  const notes = [`ดาเมจที่ทำได้รวม: ${(summary.guildDamageTotal || 0).toLocaleString()}`];
  if (summary.guildDefeated) notes.push("<span class=gicon-party></span> HP กองกลางกิลด์หมดแล้ว! บอสกิลด์ถูกปราบ!");
  if (summary.guildLeveledUp) notes.push(`<span class=gicon-crown></span> กิลด์เลื่อนเป็นเลเวล ${summary.guildLevel}!`);

  if (window.HubUI) {
    HubUI.showResults({
      win,
      title: win
        ? (summary.guildDefeated ? "<span class=gicon-party></span> คุณชนะ! บอสกิลด์ถูกปราบ!" : "<span class=gicon-party></span> คุณชนะการต่อสู้!")
        : "<span class=gicon-skull></span> ทีมพ่ายแพ้...",
      extraNote: notes.join("<br>"),
      playerTeam: [...playerTeam],
      enemyTeam: [...enemyTeam],
      onContinue: backToGuild,
    });
  }
}

/* =======================
   Render (เหมือน boss.js)
   ======================= */
function renderBattlefield() {
  const pBox = document.getElementById("playerTeamBox");
  const eBox = document.getElementById("enemyTeamBox");
  if (pBox) pBox.innerHTML = "";
  if (eBox) eBox.innerHTML = "";

  playerTeam.forEach((p) => {
    const el = createUnitCard(p, false);
    pBox && pBox.appendChild(el);
  });

  enemyTeam.forEach((e) => {
    const el = createUnitCard(e, true);
    eBox && eBox.appendChild(el);
  });
}

function createUnitCard(unit, isEnemy) {
  const wrap = document.createElement("div");
  wrap.className = `card-box ${isEnemy ? "enemy-card" : "player-card"}`;
  wrap.setAttribute("data-id", unit.instanceId);

  const hpPct = unit.maxHp ? clamp((toNum(unit.hp, 0) / toNum(unit.maxHp, 1)) * 100, 0, 100) : 0;

  wrap.innerHTML = `
    <div style="font-weight:700">${unit.name}</div>
    <div class="hp-bar">
      <div class="hp-fill ${isEnemy ? "red" : "green"}" style="width:${hpPct}%"></div>
    </div>
    <div class="meta">HP: ${toNum(unit.hp, 0)} / ${toNum(unit.maxHp, 0)}</div>
    <div style="font-size:9.5px">ATK:${toNum(unit.atk, 0)} • DEF:${toNum(unit.def, 0)}</div>
    <div class="meta">Skill: ${unit.skill || "-"}${unit.cooldown > 0 ? ` <span class="skill-cd">⏳${unit.cooldown}</span>` : ""}</div>
  `;
  return wrap;
}

function updateAllHpBars() {
  [...playerTeam, ...enemyTeam].forEach(updateUnitHpBar);
}

function updateUnitHpBar(unit) {
  const card = document.querySelector(`.card-box[data-id="${unit.instanceId}"]`);
  if (!card) return;
  const fillEl = card.querySelector(".hp-fill");

  const hp = clamp(toNum(unit.hp, 0), 0, toNum(unit.maxHp, 0));
  const max = Math.max(1, toNum(unit.maxHp, 1));
  const pct = clamp((hp / max) * 100, 0, 100);

  if (fillEl) fillEl.style.width = pct + "%";

  const meta = card.querySelectorAll(".meta")[0];
  if (meta) meta.textContent = `HP: ${hp} / ${max}`;
}

/* =======================
   Battle Speed Control (เหมือน boss.js)
   ======================= */
var SPEEDS = { 1: 1300, 2: 1000, 3: 800, 4: 500 };
var speedMultiplier = parseInt(localStorage.getItem("speedMul") || "1", 10);

function getBattleSpeed() {
  return SPEEDS[speedMultiplier] || 1500;
}

document.querySelectorAll(".speed-btn").forEach((btn) => {
  const mul = parseInt(btn.dataset.mul, 10);
  if (mul === speedMultiplier) btn.classList.add("active");
  btn.addEventListener("click", () => {
    speedMultiplier = mul;
    localStorage.setItem("speedMul", String(speedMultiplier));
    document.querySelectorAll(".speed-btn").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

/* =======================
   Init
   ======================= */
const guildbossStartBtn = document.getElementById("guildbossStartBtn");
if (guildbossStartBtn) guildbossStartBtn.addEventListener("click", startBattle);
const guildbossBackBtn = document.getElementById("guildbossBackBtn");
if (guildbossBackBtn) guildbossBackBtn.addEventListener("click", backToGuild);
loadGuildBossPreview();
