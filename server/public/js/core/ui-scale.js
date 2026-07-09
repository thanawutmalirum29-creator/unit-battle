// js/core/ui-scale.js
//
// ปรับขนาด UI ทั้งเกม (ฟอนต์ กริด ปุ่ม การ์ด ฯลฯ พร้อมกันทั้งหมด) ตามค่าที่ผู้เล่น
// ตั้งไว้ในหน้าบัญชี >  ตั้งค่า. เก็บค่าไว้ใน localStorage เท่านั้น (ไม่ผูกกับ
// เซิร์ฟเวอร์ เพราะเป็นความชอบส่วนตัวล้วนๆ ไม่ใช่ข้อมูลเกม) จึงใช้ได้ทันทีแม้ไม่ได้
// ล็อกอิน และแยกอิสระต่ออุปกรณ์/เบราว์เซอร์แต่ละเครื่อง
//
// ใช้ CSS `zoom` บน <body> (ไม่ใช่ <html>) แทนการไล่แก้ font-size/กริดทีละที่ — ทั้งเกม
// เขียน CSS เป็น px ตรงๆ (ไม่ใช่ rem) การรื้อทุกไฟล์ CSS ให้ใช้หน่วย relative จะเสี่ยง
// พังเยอะกว่ามาก ส่วน `zoom` รองรับ Chrome/Edge/Safari และ Firefox ตั้งแต่เวอร์ชันใหม่ๆ
// (เบราว์เซอร์เก่าที่ไม่รองรับก็แค่ไม่ย่อ/ขยาย ไม่ทำให้หน้าเว็บพัง) — ต้องเป็น <body> ไม่ใช่
// <html> เพราะลูกบอลลอย/ป๊อปอัปทั้งหมด (นอก <body>) ต้องไม่โดนสเกลตามไปด้วย ดูเหตุผล
// เต็มๆ ที่คอมเมนต์เหนือฟังก์ชัน apply() ด้านล่าง
//
// ต้องแปะสคริปต์นี้ไว้เป็นตัวแรกสุดในทุกหน้า (ก่อน pwa-register.js) และห้ามใส่
// `defer`/`async` — รันแบบ blocking ตั้งแต่ต้น <head> เพื่อกันเห็นจอกระพริบตอน
// ขนาดเปลี่ยนหลังเนื้อหาโหลดเสร็จไปแล้ว
(function () {
  const KEY = "uiScale";
  const MIN = 0.7;
  const MAX = 1.3;
  const DEFAULT = 1;
  const STEP = 0.05;

  function clamp(v) {
    return Math.min(MAX, Math.max(MIN, v));
  }

  function get() {
    const raw = parseFloat(localStorage.getItem(KEY));
    return Number.isFinite(raw) ? clamp(raw) : DEFAULT;
  }

  // ฉีดเป็นกฎ CSS ใส่ <body> แทนที่จะเซ็ต zoom ตรงๆ ที่ <html> — ตอนสคริปต์นี้รัน
  // (บล็อกตั้งแต่ต้น <head>) document.body ยังไม่มีด้วยซ้ำ แต่การแปะกฎ CSS ไว้ก่อน
  // แบบนี้ browser จะเอาไปใช้กับ <body> เองทันทีที่ parse ถึง โดยไม่ต้องรอ DOM ready
  //
  // เหตุผลที่ต้องสเกลที่ <body> ไม่ใช่ <html>: การเซ็ต zoom ให้ <html> ทำให้ <html>
  // กลายเป็น containing block ใหม่ของลูกหลานที่เป็น position:fixed ทั้งหมด — ลูกบอล
  // เมนู/กล่องจดหมาย (nav-fab.js/mail-fab.js) กับป๊อปอัปต่างๆ (ui-popup.js ฯลฯ) เลย
  // ไปยึดตำแหน่งกับ "ทั้งเอกสาร" แทน "จอที่เห็น" พอสเกลที่ <body> แทน แล้วย้าย
  // ลูกบอล/ป๊อปอัปทั้งหมดให้เป็นลูกของ <html> โดยตรง (ไม่ใช่ลูกของ <body>) พวกนี้
  // จะไม่โดน containing block ของ <body> ครอบ เลยลอยชิดขวาล่าง/กลางจอได้เสมอ
  // ไม่ว่าจะปรับขนาด UI เป็นเท่าไหร่ก็ตาม
  let styleEl = null;
  function styleTag() {
    if (styleEl) return styleEl;
    styleEl = document.createElement("style");
    styleEl.id = "uiScaleStyle";
    document.head.appendChild(styleEl);
    return styleEl;
  }

  function apply(scale) {
    const tag = styleTag();
    tag.textContent = scale === DEFAULT ? "" : `body{ zoom:${scale}; }`;
  }

  function set(scale) {
    const clamped = clamp(Number(scale) || DEFAULT);
    localStorage.setItem(KEY, String(clamped));
    apply(clamped);
    return clamped;
  }

  function reset() {
    return set(DEFAULT);
  }

  apply(get()); // ใช้ค่าที่เคยตั้งไว้ทันที ก่อนหน้าเว็บ render เสร็จ

  window.UIScale = { get, set, reset, MIN, MAX, DEFAULT, STEP };

  // ---------------------------------------------------------------------
  // AUTO-LIFT: ย้ายทุกอย่างที่เป็น position:fixed ออกจาก <body> ไปเป็นลูกของ <html>
  // โดยอัตโนมัติ — ครอบคลุมทั้งของที่เขียนไว้ในมาร์กอัปอยู่แล้ว (เช่น #ratePopup,
  // #gachaOverlay, .equip-popup, #acctSettingsOverlay, #adminOverlay,
  // .helper-picker-overlay, .skill-panel) และของที่หน้าไหนสร้างเพิ่มทีหลังด้วย
  // JS โดยไม่รู้ตัวว่าต้องย้าย — กันไม่ให้ต้องไล่แก้ไฟล์ทีละหน้าทุกครั้งที่มีป๊อปอัป
  // ใหม่โผล่ขึ้นมา ถ้าลืมย้ายเอง ระบบนี้จะย้ายให้อัตโนมัติเสมอ
  function liftIfFixed(el) {
    if (!(el instanceof Element)) return;
    if (el.parentNode === document.documentElement) return; // ย้ายไปแล้ว
    if (el === document.body) return;
    let pos;
    try { pos = getComputedStyle(el).position; } catch (e) { return; }
    if (pos === "fixed") document.documentElement.appendChild(el);
  }

  function scanSubtree(root) {
    if (!(root instanceof Element)) return;
    liftIfFixed(root);
    // เช็คลูกหลานด้วย เผื่อ overlay ที่ fixed ซ่อนอยู่ลึกกว่าหนึ่งชั้น
    const kids = root.querySelectorAll ? root.querySelectorAll("*") : [];
    for (const el of kids) liftIfFixed(el);
  }

  function startAutoLift() {
    if (document.body) scanSubtree(document.body);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => scanSubtree(node));
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startAutoLift);
  } else {
    startAutoLift();
  }
})();
