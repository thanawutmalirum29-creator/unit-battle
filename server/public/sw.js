// sw.js — Service worker พื้นฐานสำหรับทำให้เว็บติดตั้งเป็นแอปได้ (PWA/TWA)
// แคชเฉพาะไฟล์หน้าตา (html/css/js/icons) เพื่อให้เปิดแอปได้เร็ว/ออฟไลน์ได้บางส่วน
// ส่วน /api/* ปล่อยผ่านเน็ตเวิร์กเสมอ ห้ามแคชเด็ดขาด เพราะเป็นข้อมูลเกมสด (เงิน, กระเป๋า, ผลสุ่ม ฯลฯ)

const CACHE_VERSION = "ub-shell-v1";
const APP_SHELL = [
  "/",
  "/pages/game.html",
  "/pages/inf.html",
  "/pages/boss.html",
  "/pages/shop.html",
  "/pages/upgrade.html",
  "/pages/upgradeskills.html",
  "/pages/GACHA.html",
  "/pages/GACHAE.html",
  "/pages/equip.html",
  "/pages/account.html",
  "/css/theme.css",
  "/css/game.css",
  "/css/skills.css",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // ไม่ให้ install ล้มทั้งกระบวนถ้าไฟล์ใดไฟล์หนึ่งโหลดพลาด (เช่นระหว่างพัฒนา ไฟล์ path เปลี่ยน)
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return; // POST /api/... ฯลฯ ปล่อยผ่านตามปกติเสมอ

  // ข้อมูลเกม/เศรษฐกิจ/ล็อกอิน ต้องสดเสมอ ห้ามแคช
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req));
    return;
  }

  // ไฟล์หน้าตา: network-first แล้วสำรองด้วยแคช กันเน็ตหลุดหรือ Railway ดีดชั่วคราว
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
