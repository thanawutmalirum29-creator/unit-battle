// js/core/scroll-lock.js — ล็อกไม่ให้ฉากเกมด้านหลังเลื่อน เวลามีป๊อปอัป/โมดัลเปิดอยู่
// ------------------------------------------------------------------------------
// ในเกมนี้มีป๊อปอัป/โมดัลเป็นสิบๆ ตัวกระจายอยู่ทุกหน้า (หน้าบัญชี, กล่องจดหมาย,
// รางวัลรายวัน, เมนูนำทาง, เลือกอุปกรณ์, กาชา, เลือกผู้ช่วยกิลด์ ฯลฯ) แต่ละตัวเปิด/ปิด
// ด้วยวิธีต่างกัน (บ้าง toggle class "open", บ้าง toggle class "hidden", บ้างสลับ
// style.display เอง) ถ้าจะไล่แก้ทีละตัวจะยุ่งและพลาดง่ายเวลามีป๊อปอัปใหม่เพิ่มมาทีหลัง
//
// จึงตรวจจับแบบทั่วไปแทน โดยอาศัยจุดร่วมที่ป๊อปอัป/โมดัลแบบเต็มจอ "ทุกตัว" ในเกมนี้
// ใช้เหมือนกันคือ position:fixed คลุมเกือบเต็มวิวพอร์ต (inset:0 หรือ top/left:0 +
// width/height:100%) ตอนเปิดอยู่ — ต่างจากลูกบอลลอย/แถบเมนูที่เป็น position:fixed
// เหมือนกันแต่ตัวเล็กกว่ามาก จึงแยกออกจากกันได้ด้วยขนาดจริงบนจอ (bounding rect)
//
// อาศัยพฤติกรรมของ ui-scale.js ที่ auto-lift ทุก element ที่เป็น position:fixed
// ให้กลายเป็นลูกโดยตรงของ <html> อยู่แล้วเสมอ (ไม่ว่าจะประกาศไว้ตรงไหนในมาร์กอัป
// เดิม หรือสร้างขึ้นทีหลังด้วย JS) เลยแค่สแกน document.documentElement.children
// (ลูกชั้นเดียว) ก็เจอป๊อปอัปทุกตัวในเกม โดยไม่ต้องไล่ querySelectorAll ทั้งหน้าเว็บ
// ซึ่งจะช้ากว่ามากและอาจกระทบเฟรมเรตตอนต่อสู้
(function () {
  if (window.__scrollLockInstalled) return;
  window.__scrollLockInstalled = true;

  let locked = false;
  let rafPending = false;

  function isFullscreenOverlayVisible(el) {
    if (!(el instanceof Element)) return false;
    let cs;
    try { cs = getComputedStyle(el); } catch (e) { return false; }
    if (cs.position !== "fixed") return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (parseFloat(cs.opacity || "1") === 0) return false;
    if (cs.pointerEvents === "none") return false;
    // ต้องคลุมเกือบเต็มจอ ถึงจะนับเป็น "ป๊อปอัปพื้นหลังมืด" จริงๆ — กันไม่ให้ไปเข้าใจผิด
    // ลูกบอลลอย/แถบโปรไฟล์/สแต็กยูทิลิตี้ (ซึ่งก็ position:fixed เหมือนกัน แต่ตัวเล็ก)
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.8 || r.height < innerHeight * 0.8) return false;
    return true;
  }

  function anyOverlayOpen() {
    const kids = document.documentElement.children;
    for (let i = 0; i < kids.length; i++) {
      if (isFullscreenOverlayVisible(kids[i])) return true;
    }
    return false;
  }

  function applyLock(shouldLock) {
    if (shouldLock === locked) return;
    locked = shouldLock;
    const html = document.documentElement;
    const body = document.body;
    if (locked) {
      html.style.overflow = "hidden";
      if (body) body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      if (body) body.style.overflow = "";
    }
  }

  function check() {
    rafPending = false;
    applyLock(anyOverlayOpen());
  }

  function scheduleCheck() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(check);
  }

  function start() {
    scheduleCheck();
    // childList: จับตอนป๊อปอัปถูกย้าย/สร้างเป็นลูกของ <html> (ตอนเปิดครั้งแรก)
    // attributes(class/style) แบบ subtree: จับตอน toggle class "open"/"hidden"
    // หรือสลับ style.display ของป๊อปอัปที่เป็นลูกของ <html> อยู่แล้ว
    const mo = new MutationObserver(scheduleCheck);
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    window.addEventListener("resize", scheduleCheck);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
