// js/core/daily-fab.js — ล็อกอินรายวัน + ภารกิจรายวัน (ลูกบอลลอยตัว มุมขวาล่าง
// ซ้อนอยู่เหนือ mailFabBall เสมอ เหมือนที่ mail-fab.js ซ้อนอยู่เหนือ navFabBall)
//
// ต้องโหลดหลัง js/core/api.js (ใช้ GameAPI) และ js/core/ui-popup.js (ใช้ uiAlert)
// โหลดก่อน/หลัง mail-fab.js / nav-fab.js ก็ได้ ไม่ผูกลำดับกัน — แค่ตำแหน่งลูกบอล
// อ้างอิงค่าคงที่ชุดเดียวกัน (BALL_SIZE/EDGE_MARGIN/GAP) เพื่อเรียงซ้อนกันพอดี

(function () {
  "use strict";

  const BALL_SIZE = 56;
  const EDGE_MARGIN = 10;
  const GAP_ABOVE_NAV_BALL = 14;
  const BOTTOM_SAFE_FALLBACK = 28;
  const TAP_TIME_THRESHOLD = 500; // ms
  const POLL_INTERVAL_MS = 60000; // เช็คสถานะใหม่เป็นระยะระหว่างเปิดหน้าค้างไว้

  const BAG_LABELS = {
    memoryRare: "ความทรงจำ Rare", memoryEpic: "ความทรงจำ Epic",
    memoryLegendary: "ความทรงจำ Legendary", memoryMythical: "ความทรงจำ Mythical",
    memoryCosmic: "ความทรงจำ Cosmic", shardGray: "ชาร์ดเทา", shardBlue: "ชาร์ดน้ำเงิน",
    shardPurple: "ชาร์ดม่วง", shardGold: "ชาร์ดทอง", shardRed: "ชาร์ดแดง", shardSky: "ชาร์ดฟ้า",
  };

  // สำเนาฝั่ง client ของ LOGIN_REWARD_CYCLE (game-data/daily-data.js) — ใช้แค่
  // "แสดงผล" ของที่ได้ไปแล้วใต้กล่องที่เปิดแล้วในแถวสตรีค ไม่ได้ใช้คำนวณ/แจกของจริง
  // (ฝั่ง server ยังคง authoritative เหมือนเดิมทุกจุด) ถ้าปรับตัวเลขที่ server
  // ต้องแก้ชุดนี้ให้ตรงกันด้วยเพื่อไม่ให้ตัวเลขที่โชว์เพี้ยนจากของจริง
  const LOGIN_REWARD_CYCLE_DISPLAY = [
    { money: 500, bagKey: null, bagQty: 0 },
    { money: 800, bagKey: "shardGray", bagQty: 20 },
    { money: 1200, bagKey: "shardBlue", bagQty: 10 },
    { money: 1500, bagKey: "memoryRare", bagQty: 10 },
    { money: 2000, bagKey: "shardPurple", bagQty: 5 },
    { money: 2500, bagKey: "memoryEpic", bagQty: 5 },
    { money: 5000, bagKey: "shardGold", bagQty: 5 },
  ];

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function iconFor(key) {
    return typeof itemIconHTML === "function" ? itemIconHTML(key) : "";
  }

  // ย่อรางวัลเป็น HTML เดียว: " 500 · [icon]ชาร์ดเทา × 20"
  function rewardHTML(reward) {
    const parts = [];
    if (reward.money > 0) parts.push(`<span class="gicon-coin"></span> ${reward.money.toLocaleString()}`);
    if (reward.bagKey && reward.bagQty > 0) {
      parts.push(`${iconFor(reward.bagKey)}${BAG_LABELS[reward.bagKey] || reward.bagKey} × ${reward.bagQty}`);
    }
    return parts.join(" · ") || "-";
  }

  // เวอร์ชันย่อกว่าอีกที สำหรับใต้กล่องสตรีครายวัน (กว้างแค่ ~70px) — ไม่มีชื่อไอเทม
  // เต็ม แค่ไอคอน + จำนวน เช่น "500" หรือ "×20"
  function compactRewardHTML(reward) {
    const parts = [];
    if (reward.money > 0) parts.push(`<span class="gicon-coin"></span>${reward.money.toLocaleString()}`);
    if (reward.bagKey && reward.bagQty > 0) parts.push(`${iconFor(reward.bagKey)}×${reward.bagQty}`);
    return parts.join(" ");
  }

  function fmtCountdown(iso) {
    try {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) return "กำลังรีเซ็ต…";
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return `รีเซ็ตใน ${h} ชม. ${m} นาที`;
    } catch { return ""; }
  }

  function injectStyles() {
    if (document.getElementById("dailyFabStyles")) return;
    const style = document.createElement("style");
    style.id = "dailyFabStyles";
    style.textContent = `
#dailyFabBall{
  position:fixed;
  right:${EDGE_MARGIN}px;
  bottom:${EDGE_MARGIN + BOTTOM_SAFE_FALLBACK + (BALL_SIZE + GAP_ABOVE_NAV_BALL) * 2}px;
  bottom:calc(${EDGE_MARGIN}px + max(env(safe-area-inset-bottom,0px), ${BOTTOM_SAFE_FALLBACK}px) + ${(BALL_SIZE + GAP_ABOVE_NAV_BALL) * 2}px);
  width:${BALL_SIZE}px; height:${BALL_SIZE}px;
  margin:0; padding:0;
  border-radius:50%;
  border:1px solid var(--border, rgba(255,255,255,.15));
  background:linear-gradient(135deg,#3a2f52,#1c1a30);
  color:#fff;
  font-size:22px;
  line-height:1;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 8px 20px rgba(0,0,0,.45),0 0 0 2px rgba(244,185,66,.15);
  cursor:pointer;
  z-index:9996;
  touch-action:manipulation;
  user-select:none;
  -webkit-user-select:none;
  visibility:hidden;
  opacity:0;
  transition:box-shadow .15s ease, opacity .2s ease;
}
#dailyFabBall.daily-fab-ready{ visibility:visible; opacity:1; }
#dailyFabBall:active{ filter:brightness(1.1); }

#dailyFabDot{
  position:absolute;
  top:2px; right:2px;
  width:13px; height:13px;
  border-radius:50%;
  background:#f4b942;
  border:2px solid var(--bg-1,#0c121b);
  display:none;
  box-shadow:0 0 0 1px rgba(244,185,66,.5);
}
#dailyFabDot.show{ display:block; }

.daily-fab-overlay{
  display:none; position:fixed; inset:0; background:rgba(4,6,10,.72);
  align-items:center; justify-content:center; padding:16px; z-index:10041;
  color:var(--text,#e8edf5);
}
.daily-fab-overlay.open{ display:flex; }
.daily-fab-modal{
  width:100%; max-width:460px; max-height:86vh; overflow-y:auto;
  background:linear-gradient(180deg, var(--panel,#141d2b), var(--bg-2,#121a26));
  border:1px solid var(--border, rgba(255,255,255,.08));
  border-radius:var(--radius,14px);
  box-shadow:var(--shadow,0 8px 24px rgba(0,0,0,.45));
  padding:0;
}
.daily-fab-header{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 16px; border-bottom:1px solid var(--border);
  position:sticky; top:0;
  background:linear-gradient(180deg, var(--panel,#141d2b), var(--panel,#141d2b));
  z-index:1;
}
.daily-fab-header strong{ font-size:15px; color:var(--text,#e8edf5); }
.daily-fab-header button{ background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; line-height:1; padding:4px; }
.daily-fab-header button:hover{ color:var(--text); }

.daily-fab-tabs{ display:flex; gap:6px; padding:10px 12px 0; }
.daily-fab-tab{
  flex:1; text-align:center; padding:9px 6px; border-radius:10px 10px 0 0;
  background:var(--panel-soft,rgba(255,255,255,.03)); border:1px solid var(--border);
  border-bottom:none; color:var(--muted); font-size:13px; font-weight:700; cursor:pointer;
}
.daily-fab-tab.active{ color:var(--text); background:rgba(244,185,66,.1); border-color:rgba(244,185,66,.35); }

.daily-fab-body{ padding:14px 16px 18px; }
.daily-fab-countdown{ text-align:center; font-size:11.5px; color:var(--muted); margin-bottom:14px; }

/* ---- login tab ---- */
.daily-fab-streak-row{ display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:14px; }
.daily-fab-streak-day{
  flex:0 0 auto; width:70px; padding:10px 6px; border-radius:10px;
  border:1px solid var(--border); background:var(--panel-soft,rgba(255,255,255,.03));
  text-align:center; font-size:11px; color:var(--muted);
}
.daily-fab-streak-day.done{ border-color:rgba(57,217,138,.4); background:rgba(57,217,138,.08); color:#7be8b3; }
.daily-fab-streak-day.today{ border-color:rgba(244,185,66,.6); background:rgba(244,185,66,.12); color:#f4b942; box-shadow:0 0 0 1px rgba(244,185,66,.3); }
.daily-fab-streak-day-num{ font-weight:700; font-size:12.5px; margin-bottom:4px; }
.daily-fab-streak-day-reward{ font-size:15px; line-height:1.2; }
.daily-fab-streak-day-got{
  margin-top:4px; font-size:9.5px; line-height:1.3; color:#7be8b3;
  display:flex; flex-direction:column; align-items:center; gap:1px; white-space:nowrap;
}
.daily-fab-streak-day-got [class^="gicon-"]{ font-size:11px; vertical-align:-1px; margin-right:2px; }
.daily-fab-streak-day-got .item-icon{ width:10px; height:10px; margin-right:3px; vertical-align:-1px; }

.daily-fab-login-box{
  display:flex; flex-direction:column; align-items:center; gap:10px;
  padding:16px; border-radius:12px; background:rgba(244,185,66,.06);
  border:1px solid rgba(244,185,66,.25); text-align:center;
}
.daily-fab-login-streak-label{ font-size:13px; color:var(--muted); }
.daily-fab-login-reward{ font-size:16px; font-weight:700; color:var(--text,#e8edf5); }
.daily-fab-claim-btn{
  background:#f4b942; color:#1a1406; border:none; border-radius:9px;
  padding:9px 22px; font-weight:700; cursor:pointer; font-size:13.5px;
}
.daily-fab-claim-btn:disabled{ opacity:.55; cursor:default; }
.daily-fab-claimed-label{ color:#39d98a; font-weight:700; font-size:13px; }

/* ---- missions tab ---- */
.daily-fab-mission{
  padding:12px; border-radius:10px; border:1px solid var(--border);
  background:var(--panel-soft,rgba(255,255,255,.03)); margin-bottom:10px;
}
.daily-fab-mission.done{ border-color:rgba(244,185,66,.35); }
.daily-fab-mission.claimed{ border-color:rgba(57,217,138,.35); }
.daily-fab-mission-top{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
.daily-fab-mission-label{ font-size:13px; color:var(--text,#e8edf5); }
.daily-fab-mission-progress-text{ font-size:11.5px; color:var(--muted); flex-shrink:0; }
.daily-fab-progress-bar{ height:7px; border-radius:99px; background:rgba(255,255,255,.08); overflow:hidden; margin-bottom:8px; }
.daily-fab-progress-fill{ height:100%; background:linear-gradient(90deg,#f4b942,#ffd580); border-radius:99px; }
.daily-fab-mission-bottom{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12.5px; }
.daily-fab-mission-reward{ color:var(--muted); }
.daily-fab-mission-claim{
  background:#3ddad7; color:#08171a; border:none; border-radius:8px; padding:5px 14px;
  font-weight:700; cursor:pointer; font-size:12.5px; flex-shrink:0;
}
.daily-fab-mission-claim:disabled{ opacity:.5; cursor:default; }

.daily-fab-bonus{
  margin-top:6px; padding:12px; border-radius:10px;
  border:1px dashed rgba(244,185,66,.4); background:rgba(244,185,66,.06);
  display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12.5px;
}
.daily-fab-empty{ text-align:center; color:var(--muted); padding:30px 12px; font-size:13px; }
`;
    document.head.appendChild(style);
  }

  function buildBall() {
    const ball = document.createElement("button");
    ball.id = "dailyFabBall";
    ball.type = "button";
    ball.setAttribute("aria-label", "ล็อกอินรายวัน / ภารกิจรายวัน");
    ball.innerHTML = `<span class=gicon-gift></span><span id="dailyFabDot"></span>`;
    ball.addEventListener("contextmenu", (e) => e.preventDefault());
    return ball;
  }

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "dailyFabOverlay";
    overlay.className = "daily-fab-overlay";

    const modal = document.createElement("div");
    modal.className = "daily-fab-modal";
    modal.addEventListener("click", (e) => e.stopPropagation());

    modal.innerHTML = `
      <div class="daily-fab-header">
        <strong><span class=gicon-gift></span> ล็อกอิน &amp; ภารกิจรายวัน</strong>
        <button type="button" id="dailyFabCloseBtn" aria-label="ปิด"><span class=gicon-x></span></button>
      </div>
      <div class="daily-fab-tabs">
        <button type="button" class="daily-fab-tab active" id="dailyFabTabLogin">ล็อกอินรายวัน</button>
        <button type="button" class="daily-fab-tab" id="dailyFabTabMissions">ภารกิจรายวัน</button>
      </div>
      <div class="daily-fab-body" id="dailyFabBody">
        <div class="daily-fab-empty">กำลังโหลด…</div>
      </div>
    `;

    overlay.appendChild(modal);
    overlay.addEventListener("click", () => closeModal());
    modal.querySelector("#dailyFabCloseBtn").addEventListener("click", () => closeModal());
    modal.querySelector("#dailyFabTabLogin").addEventListener("click", () => setTab("login"));
    modal.querySelector("#dailyFabTabMissions").addEventListener("click", () => setTab("missions"));

    return overlay;
  }

  let activeTab = "login";
  let lastStatus = null;

  function setTab(tab) {
    activeTab = tab;
    document.getElementById("dailyFabTabLogin").classList.toggle("active", tab === "login");
    document.getElementById("dailyFabTabMissions").classList.toggle("active", tab === "missions");
    renderBody();
  }

  function renderBody() {
    const body = document.getElementById("dailyFabBody");
    if (!lastStatus) { body.innerHTML = '<div class="daily-fab-empty">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</div>'; return; }
    body.innerHTML = `<div class="daily-fab-countdown">${fmtCountdown(lastStatus.resetAt)}</div>` +
      (activeTab === "login" ? renderLoginTab(lastStatus) : renderMissionsTab(lastStatus));
    wireBodyEvents();
  }

  function renderLoginTab(status) {
    const login = status.login;
    const cycle = login.cycleLength || 7;
    // ตำแหน่งวันในรอบ 7 วันปัจจุบัน (1..cycle) ของ "วันนี้": ถ้ายังไม่เคลม คือวันที่
    // กำลังจะได้รับ (nextStreak), ถ้าเคลมแล้วคือวันที่เพิ่งรับไป (streak).
    const todayPos = ((((login.claimedToday ? login.streak : login.nextStreak) - 1) % cycle) + cycle) % cycle + 1;
    // จำนวนวันที่ "รับไปแล้ว" ในรอบนี้: ถ้าเคลมวันนี้แล้ว = todayPos วัน, ถ้ายัง = todayPos-1 วัน
    const doneCount = login.claimedToday ? todayPos : todayPos - 1;

    const days = [];
    for (let d = 1; d <= cycle; d++) {
      days.push({ d, isDone: d <= doneCount, isToday: d === todayPos && !login.claimedToday });
    }
    const streakRow = days.map((info) => {
      const dayReward = LOGIN_REWARD_CYCLE_DISPLAY[(info.d - 1) % LOGIN_REWARD_CYCLE_DISPLAY.length];
      return `
      <div class="daily-fab-streak-day${info.isDone ? " done" : ""}${info.isToday ? " today" : ""}">
        <div class="daily-fab-streak-day-num">วัน ${info.d}</div>
        <div class="daily-fab-streak-day-reward">${info.isDone ? "<span class=gicon-gift-open></span>" : "<span class=gicon-gift></span>"}</div>
        ${info.isDone ? `<div class="daily-fab-streak-day-got">${compactRewardHTML(dayReward)}</div>` : ""}
      </div>`;
    }).join("");

    return `
      <div class="daily-fab-streak-row">${streakRow}</div>
      <div class="daily-fab-login-box">
        <div class="daily-fab-login-streak-label">สตรีคล็อกอินต่อเนื่อง: <strong>${login.streak}</strong> วัน</div>
        <div class="daily-fab-login-reward">${rewardHTML(login.nextReward)}</div>
        ${login.claimedToday
          ? `<span class="daily-fab-claimed-label"><span class=gicon-check></span> รับรางวัลวันนี้แล้ว</span>`
          : `<button type="button" class="daily-fab-claim-btn" id="dailyFabLoginClaimBtn">รับรางวัลวันนี้</button>`}
      </div>
    `;
  }

  function renderMissionsTab(status) {
    const missionsHtml = status.missions.map((m) => {
      const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
      let action;
      if (m.claimed) action = `<span class="daily-fab-claimed-label"><span class=gicon-check></span> รับแล้ว</span>`;
      else if (m.done) action = `<button type="button" class="daily-fab-mission-claim" data-key="${m.key}">รับรางวัล</button>`;
      else action = `<span class="daily-fab-mission-progress-text">ยังไม่ครบ</span>`;

      return `
        <div class="daily-fab-mission${m.done ? " done" : ""}${m.claimed ? " claimed" : ""}">
          <div class="daily-fab-mission-top">
            <span class="daily-fab-mission-label">${escapeHtml(m.label)}</span>
            <span class="daily-fab-mission-progress-text">${m.progress}/${m.target}</span>
          </div>
          <div class="daily-fab-progress-bar"><div class="daily-fab-progress-fill" style="width:${pct}%"></div></div>
          <div class="daily-fab-mission-bottom">
            <span class="daily-fab-mission-reward">${rewardHTML(m.reward)}</span>
            ${action}
          </div>
        </div>`;
    }).join("");

    const bonus = status.bonus;
    const bonusAction = bonus.claimed
      ? `<span class="daily-fab-claimed-label"><span class=gicon-check></span> รับแล้ว</span>`
      : bonus.available
        ? `<button type="button" class="daily-fab-mission-claim" id="dailyFabBonusClaimBtn">รับโบนัส</button>`
        : `<span class="daily-fab-mission-progress-text">ทำภารกิจให้ครบก่อน</span>`;

    return `
      ${missionsHtml}
      <div class="daily-fab-bonus">
        <span><span class=gicon-star></span> โบนัสทำครบทุกภารกิจ: ${rewardHTML(bonus.reward)}</span>
        ${bonusAction}
      </div>
    `;
  }

  function wireBodyEvents() {
    const loginBtn = document.getElementById("dailyFabLoginClaimBtn");
    if (loginBtn) {
      loginBtn.addEventListener("click", async () => {
        loginBtn.disabled = true;
        loginBtn.textContent = "กำลังรับ…";
        const result = await GameAPI.dailyClaimLogin();
        if (result?.ok) {
          await refreshStatus();
          if (typeof renderAccountPage === "function") renderAccountPage();
        } else {
          const errMsg = result?.error || "รับรางวัลไม่สำเร็จ ลองใหม่อีกครั้ง";
          if (window.uiAlert) uiAlert(errMsg); else alert(errMsg);
          loginBtn.disabled = false;
          loginBtn.textContent = "รับรางวัลวันนี้";
        }
      });
    }

    document.querySelectorAll(".daily-fab-mission-claim[data-key]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "กำลังรับ…";
        const result = await GameAPI.dailyClaimMission(btn.dataset.key);
        if (result?.ok) {
          await refreshStatus();
          if (typeof renderAccountPage === "function") renderAccountPage();
        } else {
          const errMsg = result?.error || "รับรางวัลไม่สำเร็จ ลองใหม่อีกครั้ง";
          if (window.uiAlert) uiAlert(errMsg); else alert(errMsg);
          btn.disabled = false;
          btn.textContent = "รับรางวัล";
        }
      });
    });

    const bonusBtn = document.getElementById("dailyFabBonusClaimBtn");
    if (bonusBtn) {
      bonusBtn.addEventListener("click", async () => {
        bonusBtn.disabled = true;
        bonusBtn.textContent = "กำลังรับ…";
        const result = await GameAPI.dailyClaimBonus();
        if (result?.ok) {
          await refreshStatus();
          if (typeof renderAccountPage === "function") renderAccountPage();
        } else {
          const errMsg = result?.error || "รับโบนัสไม่สำเร็จ ลองใหม่อีกครั้ง";
          if (window.uiAlert) uiAlert(errMsg); else alert(errMsg);
          bonusBtn.disabled = false;
          bonusBtn.textContent = "รับโบนัส";
        }
      });
    }
  }

  async function refreshStatus() {
    const ball = document.getElementById("dailyFabBall");
    if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) {
      lastStatus = null;
      if (ball) ball.classList.remove("daily-fab-ready");
      return;
    }
    if (ball) ball.classList.add("daily-fab-ready");
    lastStatus = await GameAPI.dailyStatus();
    refreshBadgeFromStatus();
    if (document.getElementById("dailyFabOverlay")?.classList.contains("open")) renderBody();
  }

  function refreshBadgeFromStatus() {
    const dot = document.getElementById("dailyFabDot");
    if (!dot) return;
    const claimable = !!lastStatus && (
      !lastStatus.login.claimedToday
      || lastStatus.missions.some((m) => m.done && !m.claimed)
      || (lastStatus.bonus.available && !lastStatus.bonus.claimed)
    );
    dot.classList.toggle("show", claimable);
  }

  function openModal() {
    document.getElementById("dailyFabOverlay").classList.add("open");
    refreshStatus();
  }
  function closeModal() {
    document.getElementById("dailyFabOverlay").classList.remove("open");
  }

  function setupTap(ball) {
    let pressing = false;
    let startTime = 0;

    let ghostClickTimer = null;
    function suppressGhostClick(e) {
      e.stopPropagation();
      e.preventDefault();
      cleanupGhostGuard();
    }
    function cleanupGhostGuard() {
      document.removeEventListener("click", suppressGhostClick, true);
      if (ghostClickTimer != null) { clearTimeout(ghostClickTimer); ghostClickTimer = null; }
    }
    function armGhostClickGuard() {
      cleanupGhostGuard();
      document.addEventListener("click", suppressGhostClick, true);
      ghostClickTimer = setTimeout(cleanupGhostGuard, 500);
    }

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      pressing = true;
      startTime = performance.now();
      try { ball.setPointerCapture(e.pointerId); } catch (err) {}
      armGhostClickGuard();
      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerUp(e) {
      if (!pressing) return;
      pressing = false;
      try { ball.releasePointerCapture(e.pointerId); } catch (err) {}
      const elapsed = performance.now() - startTime;
      if (elapsed < TAP_TIME_THRESHOLD) openModal();
      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerCancel() { pressing = false; }

    ball.addEventListener("pointerdown", onPointerDown);
    ball.addEventListener("pointerup", onPointerUp);
    ball.addEventListener("pointercancel", onPointerCancel);
  }

  function init() {
    if (document.getElementById("dailyFabBall")) return; // กันโหลดซ้ำ
    if (!window.GameAPI) return; // ต้องมี api.js ก่อน

    injectStyles();
    const ball = buildBall();
    const overlay = buildModal();
    document.documentElement.appendChild(ball);
    document.documentElement.appendChild(overlay);
    setupTap(ball);

    refreshStatus();
    setInterval(refreshStatus, POLL_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshStatus();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
