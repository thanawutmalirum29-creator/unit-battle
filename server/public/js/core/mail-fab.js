// js/core/mail-fab.js — กล่องจดหมายลอยตัว (มุมขวาล่าง เหนือลูกบอลเมนู)
// เดิมกล่องจดหมายเป็นปุ่มฝังอยู่ในหน้าบัญชีเท่านั้น ย้ายมาเป็นลูกบอลลอยแบบเดียวกับ
// nav-fab.js เพื่อให้เปิดอ่าน/รับของจากทุกหน้าได้เลย ไม่ต้องกลับไปหน้าบัญชีก่อน
// วางซ้อนอยู่เหนือ navFabBall เสมอ (ตำแหน่งเดียวกัน แค่ขยับขึ้นไปตามความสูงของลูกบอล+ช่องไฟ)
//
// ต้องโหลดหลัง js/core/api.js (ใช้ GameAPI) และ js/core/ui-popup.js (ใช้ uiConfirm)
// โหลดก่อน/หลัง nav-fab.js ก็ได้ ไม่ผูกลำดับกัน

(function () {
  "use strict";

  const BALL_SIZE = 56;
  const EDGE_MARGIN = 10;
  const GAP_ABOVE_NAV_BALL = 14; // ระยะห่างเหนือลูกบอลเมนู
  const BOTTOM_SAFE_FALLBACK = 28; // px ใช้ตอนอ่าน safe-area-inset ไม่ได้ (เหมือน nav-fab.js)
  const TAP_TIME_THRESHOLD = 500; // ms
  const POLL_INTERVAL_MS = 45000; // เช็คจดหมายใหม่เป็นระยะระหว่างเปิดหน้าค้างไว้

  const BAG_LABELS = {
    memoryRare: "ความทรงจำ Rare", memoryEpic: "ความทรงจำ Epic",
    memoryLegendary: "ความทรงจำ Legendary", memoryMythical: "ความทรงจำ Mythical",
    memoryCosmic: "ความทรงจำ Cosmic", shardGray: "ชาร์ดเทา", shardBlue: "ชาร์ดน้ำเงิน",
    shardPurple: "ชาร์ดม่วง", shardGold: "ชาร์ดทอง", shardRed: "ชาร์ดแดง", shardSky: "ชาร์ดฟ้า",
  };

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function fmtMailDate(iso) {
    try {
      return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  }

  function injectStyles() {
    if (document.getElementById("mailFabStyles")) return;
    const style = document.createElement("style");
    style.id = "mailFabStyles";
    style.textContent = `
#mailFabBall{
  position:fixed;
  right:${EDGE_MARGIN}px;
  bottom:${EDGE_MARGIN + BOTTOM_SAFE_FALLBACK + BALL_SIZE + GAP_ABOVE_NAV_BALL}px;
  bottom:calc(${EDGE_MARGIN}px + max(env(safe-area-inset-bottom,0px), ${BOTTOM_SAFE_FALLBACK}px) + ${BALL_SIZE + GAP_ABOVE_NAV_BALL}px);
  width:${BALL_SIZE}px; height:${BALL_SIZE}px;
  margin:0; padding:0;
  border-radius:50%;
  border:1px solid var(--border, rgba(255,255,255,.15));
  background:linear-gradient(135deg,#2f3b52,#1a2130);
  color:#fff;
  font-size:22px;
  line-height:1;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 8px 20px rgba(0,0,0,.45),0 0 0 2px rgba(123,214,255,.15);
  cursor:pointer;
  z-index:9997;
  touch-action:manipulation;
  user-select:none;
  -webkit-user-select:none;
  visibility:hidden;
  opacity:0;
  transition:box-shadow .15s ease, opacity .2s ease;
}
#mailFabBall.mail-fab-ready{ visibility:visible; opacity:1; }
#mailFabBall:active{ filter:brightness(1.1); }

#mailFabDot{
  position:absolute;
  top:2px; right:2px;
  width:13px; height:13px;
  border-radius:50%;
  background:#e5484d;
  border:2px solid var(--bg-1,#0c121b);
  display:none;
  box-shadow:0 0 0 1px rgba(229,72,77,.5);
}
#mailFabDot.show{ display:block; }

.mail-fab-overlay{
  display:none; position:fixed; inset:0; background:rgba(4,6,10,.72);
  align-items:center; justify-content:center; padding:16px; z-index:10040;
  /*  บั๊กสีดำ: overlay นี้ถูก appendChild เข้า <html> โดยตรง (ดูล่างสุดของไฟล์)
     ไม่ใช่ <body> จึงไม่ได้รับ color:var(--text) จาก body{} ใน theme.css เลย —
     ตัวอักษรเลยตกไปใช้ค่า default ของเบราว์เซอร์ (ดำ) ซ้อนบนพื้นมืดของกล่องจดหมาย
     อ่านไม่ออก ต้องตั้ง color ตรงนี้เองแทนการพึ่ง inherit จาก body */
  color:var(--text,#e8edf5);
}
.mail-fab-overlay.open{ display:flex; }
.mail-fab-modal{
  width:100%; max-width:440px; max-height:82vh; overflow-y:auto;
  background:linear-gradient(180deg, var(--panel,#141d2b), var(--bg-2,#121a26));
  border:1px solid var(--border, rgba(255,255,255,.08));
  border-radius:var(--radius,14px);
  box-shadow:var(--shadow,0 8px 24px rgba(0,0,0,.45));
  padding:0;
}
.mail-fab-header{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 16px; border-bottom:1px solid var(--border);
  position:sticky; top:0;
  background:linear-gradient(180deg, var(--panel,#141d2b), var(--panel,#141d2b));
  z-index:1;
}
.mail-fab-header strong{ font-size:15px; }
.mail-fab-header button{ background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; line-height:1; padding:4px; }
.mail-fab-header button:hover{ color:var(--text); }

.mail-fab-list{ padding:10px; display:flex; flex-direction:column; gap:8px; }
.mail-fab-card{
  display:flex; align-items:flex-start; gap:10px; width:100%; text-align:left;
  padding:12px; border:1px solid var(--border); background:var(--panel-soft,rgba(255,255,255,.03));
  border-radius:12px; font-size:13.5px; color:inherit;
}
.mail-fab-card.unread{
  background:rgba(244,185,66,.08);
  border-color:rgba(244,185,66,.35);
}
.mail-fab-card-main{ flex:1; min-width:0; background:none; border:none; padding:0; text-align:left; cursor:pointer; color:inherit; font:inherit; }
.mail-fab-card-top{ display:flex; align-items:center; gap:7px; }
.mail-dot-sm{ width:8px; height:8px; border-radius:999px; flex-shrink:0; background:#f4b942; }
.mail-dot-sm.read{ background:transparent; border:1px solid var(--border); }
.mail-fab-subject{ font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text,#e8edf5); }
.mail-fab-meta{ font-size:11px; color:var(--muted); margin-top:3px; }
.mail-fab-tags{ display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
.mail-fab-tag{
  font-size:10.5px; padding:2px 7px; border-radius:999px;
  background:rgba(61,218,215,.12); border:1px solid rgba(61,218,215,.3); color:#8fecea;
}
.mail-fab-tag.claimed{ background:rgba(57,217,138,.1); border-color:rgba(57,217,138,.3); color:#7be8b3; }
.mail-fab-del{
  flex-shrink:0; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.3);
  color:#ff9d9d; border-radius:9px; width:32px; height:32px; cursor:pointer; font-size:14px;
  display:flex; align-items:center; justify-content:center;
}
.mail-fab-del:hover{ background:rgba(239,68,68,.18); }
.mail-fab-empty{ text-align:center; color:var(--muted); padding:44px 12px; font-size:13px; }

.mail-fab-detail{ padding:18px; }
.mail-fab-back{ background:none; border:none; color:var(--muted); font-size:12px; cursor:pointer; padding:0; margin-bottom:12px; }
.mail-fab-back:hover{ color:var(--text); }
.mail-fab-detail-subject{ font-weight:700; font-size:16px; margin-bottom:4px; color:var(--text,#e8edf5); }
.mail-fab-detail-meta{ color:var(--muted); font-size:11px; margin-bottom:14px; }
.mail-fab-detail-body{ font-size:13.5px; line-height:1.7; white-space:pre-wrap; color:var(--text,#e8edf5); }
.mail-fab-reward-box{
  margin-top:16px; display:flex; align-items:center; justify-content:space-between; gap:10px;
  background:rgba(61,218,215,.08); border:1px solid rgba(61,218,215,.3);
  border-radius:10px; padding:10px 12px; font-size:13px; flex-wrap:wrap;
}
.mail-fab-reward-actions{ display:flex; align-items:center; gap:8px; flex-shrink:0; }
.mail-fab-claim-btn{ background:#3ddad7; color:#08171a; border:none; border-radius:8px; padding:6px 14px; font-weight:700; cursor:pointer; }
.mail-fab-claimed-label{ color:#39d98a; font-weight:700; font-size:12.5px; }
.mail-fab-detail-del{
  margin-top:14px; width:100%; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.3);
  color:#ff9d9d; border-radius:9px; padding:9px; cursor:pointer; font-size:13px; font-weight:600;
}
.mail-fab-detail-del:hover{ background:rgba(239,68,68,.18); }
`;
    document.head.appendChild(style);
  }

  function buildBall() {
    const ball = document.createElement("button");
    ball.id = "mailFabBall";
    ball.type = "button";
    ball.setAttribute("aria-label", "กล่องจดหมาย");
    ball.innerHTML = `<span class=gicon-mailbox></span><span id="mailFabDot"></span>`;
    ball.addEventListener("contextmenu", (e) => e.preventDefault());
    return ball;
  }

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "mailFabOverlay";
    overlay.className = "mail-fab-overlay";

    const modal = document.createElement("div");
    modal.className = "mail-fab-modal";
    modal.addEventListener("click", (e) => e.stopPropagation());

    modal.innerHTML = `
      <div class="mail-fab-header">
        <strong><span class=gicon-mailbox></span> กล่องจดหมาย</strong>
        <button type="button" id="mailFabCloseBtn" aria-label="ปิด"><span class=gicon-x></span></button>
      </div>
      <div id="mailFabListView" class="mail-fab-list"></div>
      <div id="mailFabDetailView" class="mail-fab-detail" style="display:none"></div>
    `;

    overlay.appendChild(modal);
    overlay.addEventListener("click", () => closeModal());

    function openModal() { overlay.classList.add("open"); }
    function closeModal() {
      overlay.classList.remove("open");
      refreshBadge();
    }

    modal.querySelector("#mailFabCloseBtn").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });

    overlay._open = openModal;
    overlay._close = closeModal;
    return overlay;
  }

  async function refreshBadge() {
    const ball = document.getElementById("mailFabBall");
    if (!ball) return;
    if (!(window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn())) {
      ball.classList.remove("mail-fab-ready");
      return;
    }
    ball.classList.add("mail-fab-ready");
    const mail = await GameAPI.fetchMailbox();
    const unread = mail.filter((m) => !m.read).length;
    const dot = document.getElementById("mailFabDot");
    if (dot) dot.classList.toggle("show", unread > 0);
  }

  async function openList() {
    const overlay = document.getElementById("mailFabOverlay");
    overlay._open();
    document.getElementById("mailFabListView").style.display = "flex";
    document.getElementById("mailFabDetailView").style.display = "none";
    const listEl = document.getElementById("mailFabListView");
    listEl.innerHTML = '<div class="mail-fab-empty">กำลังโหลด…</div>';

    const mail = await GameAPI.fetchMailbox();
    if (mail.length === 0) {
      listEl.innerHTML = '<div class="mail-fab-empty">ไม่มีจดหมายในขณะนี้</div>';
      return;
    }
    listEl.innerHTML = "";
    for (const m of mail) {
      const card = document.createElement("div");
      card.className = "mail-fab-card" + (m.read ? "" : " unread");

      const tags = [];
      if (m.hasReward) tags.push(`<span class="mail-fab-tag${m.claimed ? " claimed" : ""}">${m.claimed ? "<span class=gicon-check></span> รับแล้ว" : "<span class=gicon-gift></span> มีของแนบ"}</span>`);

      card.innerHTML = `
        <button type="button" class="mail-fab-card-main" data-id="${m.id}">
          <div class="mail-fab-card-top">
            <span class="mail-dot-sm ${m.read ? "read" : ""}"></span>
            <span class="mail-fab-subject">${escapeHtml(m.subject)}</span>
          </div>
          <div class="mail-fab-meta">${fmtMailDate(m.createdAt)}</div>
          ${tags.length ? `<div class="mail-fab-tags">${tags.join("")}</div>` : ""}
        </button>
        <button type="button" class="mail-fab-del" data-id="${m.id}" aria-label="ลบจดหมาย" title="ลบจดหมาย"><span class=gicon-trash></span></button>
      `;
      card.querySelector(".mail-fab-card-main").addEventListener("click", () => openDetail(m.id));
      card.querySelector(".mail-fab-del").addEventListener("click", () => confirmAndDelete(m, () => openList()));
      listEl.appendChild(card);
    }
  }

  async function confirmAndDelete(mail, onDone) {
    const hasUnclaimedReward = mail.hasReward && !mail.claimed;
    const msg = hasUnclaimedReward
      ? "จดหมายนี้ยังมีของรางวัลที่ยังไม่ได้รับ ลบทิ้งจะเสียของรางวัลนี้ไปถาวร ยืนยันลบหรือไม่?"
      : "ลบจดหมายฉบับนี้หรือไม่?";
    const ok = window.uiConfirm ? await uiConfirm(msg) : window.confirm(msg);
    if (!ok) return;

    const result = await GameAPI.deleteMail(mail.id);
    if (result?.ok) {
      onDone();
      refreshBadge();
    } else {
      const errMsg = result?.error || "ลบจดหมายไม่สำเร็จ ลองใหม่อีกครั้ง";
      if (window.uiAlert) uiAlert(errMsg); else alert(errMsg);
    }
  }

  async function openDetail(mailId) {
    document.getElementById("mailFabListView").style.display = "none";
    const detailEl = document.getElementById("mailFabDetailView");
    detailEl.style.display = "block";
    detailEl.innerHTML = '<div class="mail-fab-empty">กำลังโหลด…</div>';

    const mail = await GameAPI.fetchMailDetail(mailId);
    if (!mail) { detailEl.innerHTML = '<div class="mail-fab-empty">โหลดจดหมายไม่สำเร็จ</div>'; return; }

    let rewardHtml = "";
    if (mail.reward) {
      const parts = [];
      if (mail.reward.money > 0) parts.push(`<span class=gicon-coin></span> ${mail.reward.money}`);
      if (mail.reward.bagKey) parts.push(`${typeof itemIconHTML === "function" ? itemIconHTML(mail.reward.bagKey) : ""}${BAG_LABELS[mail.reward.bagKey] || mail.reward.bagKey} × ${mail.reward.bagQty}`);
      if (mail.reward.card) parts.push(`<span class=gicon-user></span>‍<span class=gicon-handshake></span>‍<span class=gicon-user></span> ${escapeHtml(mail.reward.card.name)} (${escapeHtml(mail.reward.card.rarity)})`);
      if (mail.reward.equip) parts.push(`<span class=gicon-sword></span> ${escapeHtml(mail.reward.equip.name)} (${escapeHtml(mail.reward.equip.rarity)})`);

      rewardHtml = `
        <div class="mail-fab-reward-box">
          <span>${parts.join(" · ")}</span>
          <div class="mail-fab-reward-actions">
            ${mail.claimed
              ? `<span class="mail-fab-claimed-label"><span class=gicon-check></span> รับแล้ว</span><button type="button" class="mail-fab-del" id="mailFabClaimedDelBtn" aria-label="ลบจดหมาย" title="ลบจดหมาย"><span class=gicon-trash></span></button>`
              : `<button type="button" class="mail-fab-claim-btn" id="mailFabClaimBtn">รับไอเทม</button>`}
          </div>
        </div>`;
    }

    detailEl.innerHTML = `
      <button type="button" class="mail-fab-back" id="mailFabBackBtn"><span class=gicon-arrow-left></span> กลับ</button>
      <div class="mail-fab-detail-subject">${escapeHtml(mail.subject)}</div>
      <div class="mail-fab-detail-meta">${fmtMailDate(mail.createdAt)}</div>
      <div class="mail-fab-detail-body">${escapeHtml(mail.body)}</div>
      ${rewardHtml}
      ${!mail.reward ? `<button type="button" class="mail-fab-detail-del" id="mailFabPlainDelBtn"><span class=gicon-trash></span> ลบจดหมายนี้</button>` : ""}
    `;

    document.getElementById("mailFabBackBtn").addEventListener("click", () => { openList(); });

    const claimBtn = document.getElementById("mailFabClaimBtn");
    if (claimBtn) {
      claimBtn.addEventListener("click", async () => {
        claimBtn.disabled = true;
        claimBtn.textContent = "กำลังรับ…";
        const result = await GameAPI.claimMail(mailId);
        if (result?.ok) {
          openDetail(mailId); // re-render with "รับแล้ว" + ปุ่มลบ
          if (typeof renderAccountPage === "function") renderAccountPage(); // อัปเดตเงิน/กระเป๋าบนหน้าบัญชีถ้ามี
        } else {
          const errMsg = result?.error || "รับไอเทมไม่สำเร็จ ลองใหม่อีกครั้ง";
          if (window.uiAlert) uiAlert(errMsg); else alert(errMsg);
          claimBtn.disabled = false;
          claimBtn.textContent = "รับไอเทม";
        }
      });
    }

    const claimedDelBtn = document.getElementById("mailFabClaimedDelBtn");
    if (claimedDelBtn) {
      claimedDelBtn.addEventListener("click", () => confirmAndDelete({ id: mailId, hasReward: true, claimed: true }, () => openList()));
    }
    const plainDelBtn = document.getElementById("mailFabPlainDelBtn");
    if (plainDelBtn) {
      plainDelBtn.addEventListener("click", () => confirmAndDelete({ id: mailId, hasReward: false, claimed: false }, () => openList()));
    }
  }

  function setupTap(ball, overlay) {
    let pressing = false;
    let startTime = 0;

    // กัน "ghost click" ทะลุไปโดนสิ่งที่อยู่ใต้ลูกบอลพอดี (เหมือน nav-fab.js)
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
      if (elapsed < TAP_TIME_THRESHOLD) openList();
      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerCancel() { pressing = false; }

    ball.addEventListener("pointerdown", onPointerDown);
    ball.addEventListener("pointerup", onPointerUp);
    ball.addEventListener("pointercancel", onPointerCancel);
  }

  function init() {
    if (document.getElementById("mailFabBall")) return; // กันโหลดซ้ำ
    if (!window.GameAPI) return; // ต้องมี api.js ก่อน

    injectStyles();
    const ball = buildBall();
    const overlay = buildModal();
    // แปะไว้ใต้ <html> โดยตรง ไม่ใช่ <body> — เหตุผลเดียวกับ nav-fab.js (กัน UI scale
    // ที่สเกลเฉพาะ <body> ไปกระทบตำแหน่งลูกบอลนี้)
    document.documentElement.appendChild(ball);
    document.documentElement.appendChild(overlay);
    setupTap(ball, overlay);

    refreshBadge();
    setInterval(refreshBadge, POLL_INTERVAL_MS);

    // เผื่อหน้าที่ auth-ui.js เด้ง login แล้ว reload ทีหลัง / ล็อกอินสำเร็จหลังโหลดหน้า
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshBadge();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
