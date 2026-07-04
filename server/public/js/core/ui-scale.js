// js/core/ui-scale.js
//
// ปรับขนาด UI ทั้งเกม (ฟอนต์ กริด ปุ่ม การ์ด ฯลฯ พร้อมกันทั้งหมด) ตามค่าที่ผู้เล่น
// ตั้งไว้ในหน้าบัญชี > ⚙️ ตั้งค่า. เก็บค่าไว้ใน localStorage เท่านั้น (ไม่ผูกกับ
// เซิร์ฟเวอร์ เพราะเป็นความชอบส่วนตัวล้วนๆ ไม่ใช่ข้อมูลเกม) จึงใช้ได้ทันทีแม้ไม่ได้
// ล็อกอิน และแยกอิสระต่ออุปกรณ์/เบราว์เซอร์แต่ละเครื่อง
//
// ใช้ CSS `zoom` บน <html> แทนการไล่แก้ font-size/กริดทีละที่ — ทั้งเกมเขียน CSS
// เป็น px ตรงๆ (ไม่ใช่ rem) การรื้อทุกไฟล์ CSS ให้ใช้หน่วย relative จะเสี่ยงพังเยอะ
// กว่ามาก ส่วน `zoom` รองรับ Chrome/Edge/Safari และ Firefox ตั้งแต่เวอร์ชันใหม่ๆ
// (เบราว์เซอร์เก่าที่ไม่รองรับก็แค่ไม่ย่อ/ขยาย ไม่ทำให้หน้าเว็บพัง)
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

  function apply(scale) {
    document.documentElement.style.zoom = scale;
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
})();
