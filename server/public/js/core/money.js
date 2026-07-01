// 🔐 Config Key
const KEY1 = [17, 31, 73, 53, 91, 29]; // ชั้นแรก XOR
const KEY2 = [11, 47, 23, 89, 67];     // ชั้นสอง XOR + shift

// ----------------- ฟังก์ชันเข้ารหัส -----------------
function encryptMoney(num) {
    let str = num.toString().split('');
    let step1 = str.map((c,i) => c.charCodeAt(0) ^ KEY1[i % KEY1.length]);
    let step2 = step1.map((v,i) => ((v ^ KEY2[i % KEY2.length]) + 13) % 256);
    return step2.join(',');
}

// ----------------- ฟังก์ชันถอดรหัส -----------------
function decryptMoney(enc) {
    if(!enc) return 400; // ค่าเริ่มต้น 400
    try {
        let arr = enc.split(',').map(Number);
        if (arr.some(Number.isNaN)) throw new Error('corrupt segment');
        let step1 = arr.map((v,i) => ((v - 13 + 256) % 256) ^ KEY2[i % KEY2.length]);
        let step2 = step1.map((v,i) => String.fromCharCode(v ^ KEY1[i % KEY1.length]));
        const result = parseInt(step2.join(''), 10);
        if (!Number.isFinite(result) || result < 0) throw new Error('invalid decrypted value');
        return result;
    } catch (e) {
        console.warn("Money data corrupted! Reset to default.");
        return 400;
    }
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
