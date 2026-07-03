// js/core/pwa-register.js — ลงทะเบียน service worker เพื่อให้เว็บติดตั้งเป็นแอปได้ (PWA/TWA)
// ใช้ path แบบ absolute ("/sw.js") เจตนา ไม่ใช้ relative เพราะไฟล์หน้าเว็บอยู่ใต้ /pages/
// แต่ sw.js ต้อง scope ครอบทั้งเว็บ (ตั้งแต่ "/") ไม่ใช่แค่ /pages/
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[pwa] service worker register failed:", err);
    });
  });
})();
