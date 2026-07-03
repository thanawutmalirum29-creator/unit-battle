// หมายเหตุ: ค่าเงินฝั่ง client เก็บเป็นตัวเลขตรงๆ ไม่เข้ารหัสแล้ว
// เพราะเซิร์ฟเวอร์เป็น source of truth อยู่แล้ว ต่อให้แก้ localStorage ตรงๆ ก็ไม่มีผลจริง
// (แค่ตัวเลขที่โชว์ผิดชั่วคราวจนกว่าจะ sync ใหม่จากเซิร์ฟเวอร์)

// ----------------- ฟังก์ชันเข้ารหัส (คงชื่อเดิมไว้ ไม่ต้องแก้จุดที่เรียกใช้) -----------------
function encryptMoney(num) {
    const n = Number(num);
    return Number.isFinite(n) ? String(n) : "400";
}

// ----------------- ฟังก์ชันถอดรหัส -----------------
function decryptMoney(enc) {
    if (enc === null || enc === undefined || enc === "") return 400; // ค่าเริ่มต้น 400
    const result = parseInt(enc, 10);
    if (!Number.isFinite(result) || result < 0) {
        console.warn("Money data corrupted! Reset to default.");
        return 400;
    }
    return result;
}

// ----------------- ซิงค์จากเซิฟเวอร์ (source of truth) -----------------
// เรียกหลัง login และหลังทุก action ที่ตอบ money กลับมา (claim reward / ซื้อของ / กาชา)
// ห้ามคำนวณเงินเองฝั่ง client อีกต่อไปสำหรับ action ที่มีเซิฟรองรับแล้ว
function applyServerMoney(serverMoney) {
    if (typeof serverMoney !== "number") return;
    saveMoney(serverMoney);
    updateMoneyUI(serverMoney);
}

async function syncMoneyFromServer() {
    if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) return;
    const state = await GameAPI.fetchEconomyState();
    if (state && typeof state.money === "number") applyServerMoney(state.money);
}


function loadMoney() {
    const enc = localStorage.getItem("deckgame_money");
    let money = decryptMoney(enc);
    return money;
}

// ----------------- บันทึกเงิน -----------------
function saveMoney(amount) {
    localStorage.setItem("deckgame_money", encryptMoney(amount));
}

// ----------------- เพิ่ม/ลบเงิน -----------------
function addMoney(amount) {
    const delta = Number(amount);
    if (!Number.isFinite(delta)) {
        console.warn("addMoney: ignoring non-numeric amount", amount);
        return;
    }
    let money = loadMoney();
    money += delta;
    if (money < 0) money = 0;
    saveMoney(money);
    updateMoneyUI(money);
}

// ----------------- อัปเดต UI -----------------
function updateMoneyUI(money) {
    if(money === undefined) money = loadMoney();
    const el = document.getElementById("moneyWindow");
    if(el) el.innerText = "💰 " + formatMoney(money);
}

// ----------------- เริ่มต้น -----------------
updateMoneyUI();

// ----------------- ฟังก์ชัน format -----------------
function formatMoney(num) {
  if (num >= 1_000_000_000_000_000_000_000_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000_000_000_000_000_000_000_000_000 * 10) / 10 + "g";
  }
  if (num >= 1_000_000_000_000_000_000_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000_000_000_000_000_000_000_000 * 10) / 10 + "f";
  }
  if (num >= 1_000_000_000_000_000_000_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000_000_000_000_000_000_000 * 10) / 10 + "e";
  }
  if (num >= 1_000_000_000_000_000_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000_000_000_000_000_000 * 10) / 10 + "d";
  }
  if (num >= 1_000_000_000_000_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000_000_000_000_000 * 10) / 10 + "c";
  }
  if (num >= 1_000_000_000_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000_000_000_000 * 10) / 10 + "b";
  }
  if (num >= 1_000_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000_000 * 10) / 10 + "a";
  }
  if (num >= 1_000_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000_000 * 10) / 10 + "Q";
  }
  if (num >= 1_000_000_000_000) {
    return Math.floor(num / 1_000_000_000_000 * 10) / 10 + "T";
  }
  if (num >= 1_000_000_000) {
    return Math.floor(num / 1_000_000_000 * 10) / 10 + "B";
  }
  if (num >= 1_000_000) {
    return Math.floor(num / 1_000_000 * 10) / 10 + "M";
  }
  if (num >= 1_000) {
    return Math.floor(num / 1_000 * 10) / 10 + "K";
  }
  return num.toString();
}

// เรียก sync อัตโนมัติเมื่อ login แล้วและหน้าโหลดเสร็จ (auth-ui.js reload หน้าหลัง login สำเร็จอยู่แล้ว
// แต่เผื่อกรณี session ยังอยู่จาก localStorage ตั้งแต่แรกโดยไม่ผ่าน modal)
document.addEventListener("DOMContentLoaded", () => {
    if (window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn()) {
        syncMoneyFromServer();
        if (typeof syncBagFromServer === "function") syncBagFromServer();
    }
});
