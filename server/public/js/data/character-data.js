// ============================================================
// CHARACTER_DB — แหล่งข้อมูลกลางของ "สเตตัสตัวละคร" ทั้งหมดในเกม
// ทั้งหน้ากาชาตัวละคร (gacha-data.js) และหน้าร้านค้า (shop-data.js)
// ดึงสเตตัส (rarity, hp, atk, def, skill, class) จากไฟล์นี้ที่เดียว
// ถ้าจะ "ปรับสเตตัสตัวละคร" ในอนาคต ให้แก้ที่ไฟล์นี้ไฟล์เดียวพอ
// ไม่ต้องไปไล่แก้ทั้งใน gacha-data.js และ shop-data.js อีกต่อไป
// ============================================================
const CHARACTER_DB = {
  "นักดาบฝึกหัด": { rarity: "Common", hp: 150, atk: 30, def: 15, skill: "Power Strike L1", class: "Warrior" },
  "นักธนูฝึกหัด": { rarity: "Common", hp: 115, atk: 55, def: 8, skill: "Piercing Shot L1", class: "Rogue" },
  "นักรบฝึกหัด": { rarity: "Common", hp: 200, atk: 22, def: 20, skill: "Defense Buff L1", class: "Tank" },
  "นักวางระเบิดฝึกหัด": { rarity: "Common", hp: 105, atk: 50, def: 5, skill: "Bomb L1", class: "Bomb" },
  "นักเวทย์ฝึกหัด": { rarity: "Common", hp: 110, atk: 20, def: 8, skill: "Burn L1", class: "Mage" },
  "โจรเริ่มต้น": { rarity: "Common", hp: 125, atk: 24, def: 6, skill: "Critical L1", class: "Assassin" },
  "ซามูไร": { rarity: "Rare", hp: 180, atk: 38, def: 18, skill: "Double Strike L1", class: "Warrior" },
  "ซามูไรดาบยาว": { rarity: "Rare", hp: 175, atk: 38, def: 18, skill: "AOE Attack L1", class: "Warrior" },
  "นักธนูเฉียบคม": { rarity: "Rare", hp: 149, atk: 71, def: 10, skill: "Piercing Shot L1", class: "Rogue" },
  "นักเวทย์น้ำแข็ง": { rarity: "Rare", hp: 145, atk: 26, def: 10, skill: "Freeze L1", class: "Mage" },
  "นักเวทย์ไฟ": { rarity: "Rare", hp: 143, atk: 26, def: 10, skill: "Burn L1", class: "Mage" },
  "ศิษย์นักบวร": { rarity: "Rare", hp: 156, atk: 26, def: 16, skill: "Heal L1", class: "Healer" },
  "หัวหน้าอัศวิน": { rarity: "Rare", hp: 276, atk: 30, def: 28, skill: "AOE Defense Buff L1", class: "Tank" },
  "อัศวิน": { rarity: "Rare", hp: 260, atk: 29, def: 26, skill: "Defense Buff L1", class: "Tank" },
  "โจรป่า": { rarity: "Rare", hp: 162, atk: 31, def: 8, skill: "Critical L1", class: "Assassin" },
  "ไวกิ้ง": { rarity: "Rare", hp: 195, atk: 39, def: 19, skill: "Power Strike L1", class: "Warrior" },
  "Duit": { rarity: "Epic", hp: 203, atk: 30, def: 21, skill: "AOE Heal L1", class: "Healer" },
  "คาวบอย": { rarity: "Epic", hp: 190, atk: 90, def: 13, skill: "3 hit target L1", class: "Rogue1" },
  "จอมเวทย์น้ำแข็ง": { rarity: "Epic", hp: 190, atk: 34, def: 13, skill: "Freeze L1", class: "Mage" },
  "จอมเวทย์ไฟ": { rarity: "Epic", hp: 185, atk: 34, def: 19, skill: "Burn L1", class: "Mage" },
  "ช่างทำค้อนทอง": { rarity: "Epic", hp: 200, atk: 32, def: 18, skill: "Stun L1", class: "CC" },
  "นักธนูทอง": { rarity: "Epic", hp: 194, atk: 92, def: 13, skill: "Piercing Shot L1", class: "Rogue" },
  "นักบวร": { rarity: "Epic", hp: 203, atk: 34, def: 21, skill: "Heal L1", class: "Healer" },
  "นักวางพิษ": { rarity: "Epic", hp: 203, atk: 40, def: 18, skill: "Poison L1", class: "Trickster" },
  "นักอัญเชิญ": { rarity: "Epic", hp: 220, atk: 17, def: 13, skill: "Summon L1", class: "Summoner" },
  "ผู้ชำระ": { rarity: "Epic", hp: 200, atk: 34, def: 18, skill: "Cleanse L1", class: "Helper" },
  "มือระเบิด": { rarity: "Epic", hp: 177, atk: 84, def: 8, skill: "Bomb L1", class: "Bomb" },
  "รองเผ่าไวกิ้ง": { rarity: "Epic", hp: 253, atk: 51, def: 25, skill: "Power Strike L1", class: "Warrior" },
  "อัศวินปราณ": { rarity: "Epic", hp: 338, atk: 38, def: 34, skill: "AOE Defense Buff L1", class: "Tank" },
  "แม่ทัพธนู": { rarity: "Epic", hp: 205, atk: 98, def: 14, skill: "3 hit target L1", class: "Rogue" },
  "แม่ทัพอัศวิน": { rarity: "Epic", hp: 359, atk: 39, def: 36, skill: "Aoe Defense Buff L1", class: "Tank" },
  "แม่มด": { rarity: "Epic", hp: 200, atk: 34, def: 18, skill: "Silence L1", class: "Helper" },
  "แม่มดเวลา": { rarity: "Epic", hp: 200, atk: 34, def: 18, skill: "Energy Boost L1", class: "Helper" },
  "แวมไพร์100ปี": { rarity: "Epic", hp: 211, atk: 40, def: 10, skill: "Lifesteal L1", class: "Assassin" },
  "Angle": { rarity: "Legendary", hp: 264, atk: 39, def: 27, skill: "AOE Heal L1", class: "Healer" },
  "Bandit": { rarity: "Legendary", hp: 252, atk: 120, def: 17, skill: "3 hit target L1", class: "Rogue1" },
  "ท่านแม่ทัพสงคราม": { rarity: "Legendary", hp: 439, atk: 49, def: 4, skill: "Berserk L1", class: "Tank" },
  "นักดาบคู่": { rarity: "Legendary", hp: 329, atk: 66, def: 32, skill: "Double Strike L1", class: "Warrior" },
  "นักบวชศักสิทธิ์": { rarity: "Legendary", hp: 264, atk: 44, def: 27, skill: "Heal L1", class: "Healer" },
  "นักลอบสังหาร": { rarity: "Legendary", hp: 274, atk: 52, def: 13, skill: "Critical L1", class: "Assassin" },
  "นักวางระเบิด": { rarity: "Legendary", hp: 230, atk: 109, def: 10, skill: "Bomb L1", class: "Bomb" },
  "นักวางเพลิง": { rarity: "Legendary", hp: 264, atk: 44, def: 23, skill: "Burn L1", class: "Trickster" },
  "นักเวทย์ขาว": { rarity: "Legendary", hp: 264, atk: 44, def: 23, skill: "Cleanse L1", class: "Healer" },
  "นินจา": { rarity: "Legendary", hp: 1050, atk: 85, def: 28, skill: "Piercing Shot L1", class: "Rogue2" },
  "ผู้ชำนาญพิษ": { rarity: "Legendary", hp: 264, atk: 52, def: 23, skill: "Poison L1", class: "Trickster" },
  "ผู้ฝึกเวลา": { rarity: "Legendary", hp: 274, atk: 44, def: 23, skill: "Time Stop L1", class: "CC" },
  "ผู้ใช้ค้อนสายรุ้ง": { rarity: "Legendary", hp: 260, atk: 42, def: 23, skill: "Stun L1", class: "CC" },
  "พ่อมดเวลา": { rarity: "Legendary", hp: 264, atk: 44, def: 23, skill: "Energy Boost L1", class: "Healer" },
  "ศาสตร์อัญเชิญ": { rarity: "Legendary", hp: 286, atk: 22, def: 17, skill: "Summon L1", class: "Summoner" },
  "หัวหน้าเผ่าไวกิ้ง": { rarity: "Legendary", hp: 329, atk: 66, def: 32, skill: "AOE Defense Buff L1", class: "Warrior" },
  "แวมไพร์1000ปี": { rarity: "Legendary", hp: 274, atk: 52, def: 13, skill: "Lifesteal L2", class: "Assassin" },
};

// ไอคอนต่อ rarity (ใช้กับ featuredCard ของกาชา)
const RARITY_ICON = {
  Common: "",
  Rare: "🩵",
  Epic: "💜",
  Legendary: "💛"
};

// ดึงสเตตัสเต็มของตัวละครจากชื่อ คืนค่าเป็น object ใหม่เสมอ (กัน mutate ของเดิม)
function getCharacterStats(name) {
  const base = CHARACTER_DB[name];
  if (!base) {
    console.warn(`[CHARACTER_DB] ไม่พบตัวละครชื่อ "${name}" ในฐานข้อมูลกลาง`);
    return null;
  }
  return { name, ...base };
}

// รวม object เสริม (เช่น rate, price, bannerName) เข้ากับสเตตัสจาก CHARACTER_DB
function buildCard(entry) {
  const stats = getCharacterStats(entry.name);
  if (!stats) return null;
  return { ...stats, ...entry };
}

// ============================================================
// ทำให้ไฟล์นี้โหลดได้ทั้ง 2 ทาง:
//  - ฝั่ง client: โหลดผ่าน <script> ตามปกติ (ตัวแปร/ฟังก์ชันข้างบนกลาย
//    เป็น global ให้ไฟล์อื่นที่โหลดทีหลังใช้ได้เลย เหมือนเดิมทุกประการ)
//  - ฝั่ง server: require('.../public/js/data/character-data') ได้ตรงๆ
// เงื่อนไข `typeof module !== "undefined"` เป็น false เสมอในเบราว์เซอร์
// (ไม่มี `module` ในสคริปต์ปกติ) จึงไม่กระทบพฤติกรรมฝั่ง client เลย
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CHARACTER_DB, getCharacterStats, buildCard, RARITY_ICON };
}
