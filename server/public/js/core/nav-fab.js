// js/core/nav-fab.js — ระบบเมนูเปลี่ยนหน้ากลาง (ลูกบอลลอยได้ทั่วจอ)
// แทนที่แถบปุ่ม .mode-buttons เดิมที่ก็อปวางซ้ำทุกหน้า ด้วยลูกบอลลอยเดียว
// ลากไปวางตรงไหนก็ได้ (ไม่หลุดจอ), กดที่ลูกบอล (ไม่ใช่ลาก) เพื่อเปิดเมนูกลางจอ
// จำตำแหน่งล่าสุดไว้ใน localStorage ข้ามหน้า
//
// จุดที่เน้นเรื่องประสิทธิภาพตอนลาก:
//  - ใช้ Pointer Events ตัวเดียวคุมทั้งเมาส์/นิ้ว/ปากกา (ไม่ผูก mousemove+touchmove ซ้ำ)
//  - ขยับลูกบอลด้วย CSS transform (translate3d) เท่านั้น ไม่แตะ left/top
//    → ไม่ trigger layout/reflow ระหว่างลาก อยู่บน compositor thread ล้วนๆ
//  - รวมการอัปเดตตำแหน่งไว้ใน requestAnimationFrame เดียว ต่อเฟรม
//    (พอ pointermove ถี่ๆ ก็แค่จำพิกัดล่าสุดไว้ ไม่ set style ทุกอีเวนต์)
//  - touch-action:none กับ pointer capture กันการชนกับสกอลล์หน้า

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
    { href: "account.html", icon: "👤", label: "บัญชี" },
  ];

  const POS_KEY = "navFabPos";     // { fx, fy } ตำแหน่งศูนย์กลางลูกบอล แบบสัดส่วนของจอ (0..1)
  const BALL_SIZE = 56;
  const EDGE_MARGIN = 10;
  const TAP_MOVE_THRESHOLD = 6;    // px — ขยับไม่เกินนี้ถือว่าเป็นการ "กด" ไม่ใช่ "ลาก"
  const TAP_TIME_THRESHOLD = 500;  // ms

  // ระยะกันชนพิเศษเฉพาะขอบล่าง: มือถือส่วนใหญ่ (iOS home indicator, แถบเจสเจอร์ Android)
  // มีโซนล่างสุดที่ระบบปฏิบัติการ "ดักจับ" การแตะไว้เอง (เช่น ปัดขึ้นเพื่อกลับหน้าโฮม)
  // ก่อนที่จะส่งอีเวนต์ให้หน้าเว็บเลย — ต่อให้ลูกบอลอยู่ตรงนั้นพอดี กด "ติด" แค่ในทางสายตา
  // แต่ pointerup ไม่มาถึงจริง จึงเปิดเมนูไม่ได้ ต้องกันไม่ให้ลูกบอลถูกลากเข้าไปโซนนี้
  const BOTTOM_SAFE_FALLBACK = 28; // px ใช้ตอนอ่าน safe-area-inset ไม่ได้
  const TOP_SAFE_FALLBACK = 24;    // px กันโซนบนสุด (status bar / notch / dynamic island)
  let _cachedBottomInset = null;
  let _cachedTopInset = null;
  function bottomSafeInset() {
    if (_cachedBottomInset != null) return _cachedBottomInset;
    try {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;";
      document.body.appendChild(probe);
      const inset = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
      probe.remove();
      _cachedBottomInset = Math.max(inset, 0);
    } catch (e) { _cachedBottomInset = 0; }
    return _cachedBottomInset;
  }
  function topSafeInset() {
    if (_cachedTopInset != null) return _cachedTopInset;
    try {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:0;height:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none;";
      document.body.appendChild(probe);
      const inset = parseFloat(getComputedStyle(probe).paddingTop) || 0;
      probe.remove();
      _cachedTopInset = Math.max(inset, 0);
    } catch (e) { _cachedTopInset = 0; }
    return _cachedTopInset;
  }

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
  left:0; top:0;
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
  cursor:grab;
  z-index:9998;
  touch-action:none;
  user-select:none;
  -webkit-user-select:none;
  will-change:transform;
  visibility:hidden;
  transition:box-shadow .15s ease, opacity .2s ease;
}
#navFabBall.nav-fab-ready{ visibility:visible; }
#navFabBall.dragging{
  cursor:grabbing;
  box-shadow:0 12px 28px rgba(0,0,0,.55),0 0 0 3px rgba(123,214,255,.45);
  transition:none;
}
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

  function setupDrag(ball, overlay) {
    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0;     // พิกัดนิ้ว/เมาส์ตอนกดลง
    let originX = 0, originY = 0;   // ศูนย์กลางลูกบอลตอนกดลง
    let pendingX = null, pendingY = null;
    let rafId = null;
    let startTime = 0;

    function clamp(x, y) {
      const half = BALL_SIZE / 2;
      const bottomSafe = EDGE_MARGIN + Math.max(bottomSafeInset(), BOTTOM_SAFE_FALLBACK);
      const topSafe = EDGE_MARGIN + Math.max(topSafeInset(), TOP_SAFE_FALLBACK);
      const minX = half + EDGE_MARGIN;
      const maxX = window.innerWidth - half - EDGE_MARGIN;
      const minY = half + topSafe;
      const maxY = window.innerHeight - half - bottomSafe;
      return {
        x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
        y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
      };
    }

    // ขยับด้วย transform ล้วนๆ (ไม่แตะ left/top) เพื่อไม่ให้เกิด layout ระหว่างลาก
    function applyPosition(cx, cy) {
      const half = BALL_SIZE / 2;
      ball.style.transform = "translate3d(" + (cx - half) + "px," + (cy - half) + "px,0)";
    }

    function currentCenter() {
      const r = ball.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function savePosition(cx, cy) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({
          fx: cx / window.innerWidth,
          fy: cy / window.innerHeight,
        }));
      } catch (e) { /* localStorage ไม่พร้อมใช้งาน — ข้าม ไม่กระทบการเล่น */ }
    }

    function loadPosition() {
      try {
        const raw = localStorage.getItem(POS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (typeof data.fx !== "number" || typeof data.fy !== "number") return null;
        return { x: data.fx * window.innerWidth, y: data.fy * window.innerHeight };
      } catch (e) { return null; }
    }

    function scheduleFrame() {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingX != null) applyPosition(pendingX, pendingY);
      });
    }

    function initialPlace() {
      let pos = loadPosition();
      if (!pos) {
        // ค่าเริ่มต้น: มุมล่างขวา เหนือขอบจอนิดหน่อย
        const half = BALL_SIZE / 2;
        pos = {
          x: window.innerWidth - half - EDGE_MARGIN - 8,
          y: window.innerHeight - half - EDGE_MARGIN - 90,
        };
      }
      const c = clamp(pos.x, pos.y);
      applyPosition(c.x, c.y);
      ball.classList.add("nav-fab-ready");
    }

    function reclamp() {
      const c0 = currentCenter();
      const c = clamp(c0.x, c0.y);
      applyPosition(c.x, c.y);
      savePosition(c.x, c.y);
    }

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      moved = false;
      startTime = performance.now();
      try { ball.setPointerCapture(e.pointerId); } catch (err) {}
      const c = currentCenter();
      originX = c.x; originY = c.y;
      startX = e.clientX; startY = e.clientY;
      ball.classList.add("dragging");
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD)) {
        moved = true;
      }
      if (!moved) return;
      const target = clamp(originX + dx, originY + dy);
      pendingX = target.x; pendingY = target.y;
      scheduleFrame();
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      ball.classList.remove("dragging");
      try { ball.releasePointerCapture(e.pointerId); } catch (err) {}

      if (moved) {
        if (pendingX != null) savePosition(pendingX, pendingY);
      } else {
        const elapsed = performance.now() - startTime;
        if (elapsed < TAP_TIME_THRESHOLD) overlay._open();
      }
      pendingX = null; pendingY = null;
    }

    ball.addEventListener("pointerdown", onPointerDown);
    ball.addEventListener("pointermove", onPointerMove);
    ball.addEventListener("pointerup", onPointerUp);
    ball.addEventListener("pointercancel", onPointerUp);

    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", () => {
      _cachedBottomInset = null;
      _cachedTopInset = null;
      setTimeout(reclamp, 120);
    });

    initialPlace();
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
    setupDrag(ball, overlay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
