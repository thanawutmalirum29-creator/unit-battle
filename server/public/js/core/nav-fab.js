// js/core/nav-fab.js — ระบบเมนูเปลี่ยนหน้ากลาง (ลูกบอลลอยตายตัวมุมขวาล่าง)
// แทนที่แถบปุ่ม .mode-buttons เดิมที่ก็อปวางซ้ำทุกหน้า ด้วยลูกบอลลอยเดียว
// ลูกบอลถูก "ล็อก" ไว้ที่มุมขวาล่างเสมอ ลากไม่ได้ — กันปัญหาลูกบอลไปทับปุ่ม/การ์ดในเกม
// จนกดลูกบอลไม่ติด หรือกดโดนของที่อยู่ข้างใต้แทน
//
// กัน "ghost click" ทะลุไปโดนสิ่งที่อยู่ใต้ลูกบอลพอดี:
//  เบราว์เซอร์บางตัว (โดยเฉพาะ mobile webview) จะยิง compatibility "click"
//  เล็งไปที่ตำแหน่ง (x,y) ตอนปล่อยนิ้ว — ดักจับแล้วบล็อกทิ้งทุกครั้งที่แตะลูกบอล

(function () {
  "use strict";

  // ปลายทางเมนู — เรียงตามลำดับเดิมของแถบปุ่มที่เคยมีในทุกหน้า
  const NAV_ITEMS = [
    { href: "game.html", icon: "🎴", label: "NORMAL" },
    { href: "inf.html", icon: "🌀", label: "INF_MODE" },
    { href: "boss.html", icon: "👹", label: "BOSS" },
    { href: "shop.html", icon: "🏪", label: "SHOP" },
    { href: "upgrade.html", icon: "🌟", label: "UPGRADE" },
    { href: "upgradeskills.html", icon: "💪", label: "SKILLS" },
    { href: "GACHA.html", icon: "🔮", label: "GACHA" },
    { href: "GACHAE.html", icon: "🎰", label: "กาชาอุปกรณ์" },
    { href: "equip.html", icon: "🛡️", label: "สวมอุปกรณ์" },
    { href: "friends.html", icon: "👥", label: "เพื่อน" },
    { href: "guild.html", icon: "🛡️", label: "กิลด์" },
    { href: "account.html", icon: "👤", label: "บัญชี" },
  ];

  const BALL_SIZE = 56;
  const EDGE_MARGIN = 10;
  const TAP_TIME_THRESHOLD = 500;  // ms

  // ระยะกันชนพิเศษเฉพาะขอบล่าง: มือถือส่วนใหญ่ (iOS home indicator, แถบเจสเจอร์ Android)
  // มีโซนล่างสุดที่ระบบปฏิบัติการ "ดักจับ" การแตะไว้เอง ก่อนส่งอีเวนต์ให้หน้าเว็บ
  const BOTTOM_SAFE_FALLBACK = 28; // px ใช้ตอนอ่าน safe-area-inset ไม่ได้

  function currentFile() {
    const path = location.pathname.split("/").pop() || "";
    return path.toLowerCase();
  }

  function injectStyles() {
    if (document.getElementById("navFabStyles")) return;
    const style = document.createElement("style");
    style.id = "navFabStyles";
    style.textContent = `
#navFabBall{
  position:fixed;
  right:${EDGE_MARGIN}px;
  bottom:${EDGE_MARGIN + BOTTOM_SAFE_FALLBACK}px;
  bottom:calc(${EDGE_MARGIN}px + max(env(safe-area-inset-bottom,0px), ${BOTTOM_SAFE_FALLBACK}px));
  width:${BALL_SIZE}px; height:${BALL_SIZE}px;
  margin:0; padding:0;
  border-radius:50%;
  border:1px solid var(--border, rgba(255,255,255,.15));
  background:linear-gradient(135deg,var(--accent,#5c8bff),#3f63d6);
  color:#fff;
  font-size:22px;
  line-height:1;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 8px 20px rgba(0,0,0,.45),0 0 0 2px rgba(123,214,255,.25);
  cursor:pointer;
  z-index:9998;
  touch-action:manipulation;
  user-select:none;
  -webkit-user-select:none;
  visibility:hidden;
  transition:box-shadow .15s ease, opacity .2s ease;
}
#navFabBall.nav-fab-ready{ visibility:visible; }
#navFabBall:active{ filter:brightness(1.05); }

.nav-fab-overlay{
  position:fixed;
  inset:0;
  z-index:10050;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
  background:rgba(4,6,12,.6);
  backdrop-filter:blur(3px);
  -webkit-backdrop-filter:blur(3px);
  opacity:0;
  pointer-events:none;
  transition:opacity .15s ease;
}
.nav-fab-overlay.open{ opacity:1; pointer-events:auto; }

.nav-fab-panel{
  width:100%;
  max-width:420px;
  max-height:82vh;
  overflow-y:auto;
  background:linear-gradient(180deg, var(--panel,#141d2b), var(--bg-2,#121a26));
  border:1px solid var(--border, rgba(255,255,255,.08));
  border-radius:var(--radius,14px);
  box-shadow:var(--shadow,0 8px 24px rgba(0,0,0,.45));
  padding:18px 16px 16px;
  transform:translateY(10px) scale(.97);
  transition:transform .18s ease;
}
.nav-fab-overlay.open .nav-fab-panel{ transform:translateY(0) scale(1); }

.nav-fab-title{
  font-weight:800;
  font-size:16px;
  color:var(--text,#e8edf5);
  margin:0 0 12px;
  text-align:center;
}

.nav-fab-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:8px;
}
@media (min-width:420px){
  .nav-fab-grid{ grid-template-columns:repeat(3,1fr); }
}

.nav-fab-close{
  width:100%;
  margin-top:14px;
  padding:10px;
  border-radius:999px;
  border:1px solid var(--border, rgba(255,255,255,.08));
  background:var(--panel-soft,rgba(255,255,255,.04));
  color:var(--muted,#93a1b5);
  font-weight:700;
  cursor:pointer;
}
.nav-fab-close:hover{ color:var(--text,#e8edf5); }
`;
    document.head.appendChild(style);
  }

  function buildBall() {
    const ball = document.createElement("button");
    ball.id = "navFabBall";
    ball.type = "button";
    ball.setAttribute("aria-label", "เมนูเปลี่ยนหน้า");
    ball.textContent = "☰";
    ball.addEventListener("contextmenu", (e) => e.preventDefault());
    return ball;
  }

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "navFabOverlay";
    overlay.className = "nav-fab-overlay";

    const panel = document.createElement("div");
    panel.className = "nav-fab-panel";

    const title = document.createElement("div");
    title.className = "nav-fab-title";
    title.textContent = "ไปยังหน้าอื่น";
    panel.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "nav-fab-grid";

    const cur = currentFile();
    NAV_ITEMS.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "mode-button";
      btn.innerHTML = "<span>" + item.icon + " " + item.label + "</span>";
      if (item.href.toLowerCase() === cur) {
        btn.classList.add("active");
        btn.disabled = true;
        btn.setAttribute("aria-current", "page");
      } else {
        btn.addEventListener("click", () => {
          location.href = item.href;
        });
      }
      grid.appendChild(btn);
    });
    panel.appendChild(grid);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "nav-fab-close";
    closeBtn.textContent = "ปิด";
    closeBtn.addEventListener("click", () => closeModal());
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    function openModal() {
      overlay.classList.add("open");
    }
    function closeModal() {
      overlay.classList.remove("open");
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    overlay._open = openModal;
    overlay._close = closeModal;
    return overlay;
  }

  function setupTap(ball, overlay) {
    let pressing = false;
    let startTime = 0;

    // กัน "ghost click" ทะลุไปโดนปุ่ม/การ์ดที่อยู่ใต้ลูกบอลพอดี
    // เบราว์เซอร์บางตัวยิง compatibility "click" เล็งไปที่ตำแหน่ง (x,y) ตอนปล่อยนิ้ว
    // แม้ pointerdown/up จะเกิดบนลูกบอลก็ตาม — ดักจับแล้วบล็อกทิ้งทุกครั้งที่แตะลูกบอล
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
      if (elapsed < TAP_TIME_THRESHOLD) overlay._open();
      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerCancel() {
      pressing = false;
    }

    ball.addEventListener("pointerdown", onPointerDown);
    ball.addEventListener("pointerup", onPointerUp);
    ball.addEventListener("pointercancel", onPointerCancel);

    ball.classList.add("nav-fab-ready");
  }

  function init() {
    if (document.getElementById("navFabBall")) return; // กันโหลดซ้ำ

    // เอาแถบปุ่มเดิม (.mode-buttons) ที่เคยก็อปวางซ้ำทุกหน้าออก — ใช้ลูกบอลนี้แทนแล้ว
    document.querySelectorAll(".mode-buttons").forEach((el) => el.remove());

    injectStyles();
    const ball = buildBall();
    const overlay = buildModal();
    document.body.appendChild(ball);
    document.body.appendChild(overlay);
    setupTap(ball, overlay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
