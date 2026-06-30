
// ตัวอย่าง pool การ์ดแต่ละ rarity
// หมายเหตุ: สเตตัสของตัวละคร (rarity, hp, atk, def, skill, class) ของ
// Legendary/Epic/Rare ดึงมาจาก CHARACTER_DB ในไฟล์ character-data.js
// ที่เดียวกับที่หน้ากาชาใช้ (gacha-data.js) — ต้องโหลด character-data.js
// ก่อนไฟล์นี้เสมอ ส่วนการ์ด Cosmic/Mythical เป็นการ์ดเฉพาะร้านค้า
// (ไม่มีในกาชา) จึงยังคงระบุสเตตัสไว้ตรงนี้ตามเดิม
const CARD_POOL={
  Cosmic: [
    { name: "Cosmic Titan", rarity: "Cosmic", atk: 100, hp: 120, def: 40, skill: "None", price: 1000000 },
    { name: "Void Dragon", rarity: "Cosmic", atk: 95, hp: 100, def: 35, skill: "Meteor", price: 1200000 }
  ],
  Mythical: [
    { name: "Dragon", rarity: "Mythical", atk: 70, hp: 80, def: 30, skill: "Fire", price: 20000000 },
    { name: "Phoenix", rarity: "Mythical", atk: 65, hp: 75, def: 28, skill: "Rebirth", price: 20000000 }
  ],
  Legendary:[buildCard({name:"Angle",price:1500000}),buildCard({name:"ผู้ชำนาญพิษ",price:1500000}),buildCard({name:"นักดาบคู่",price:1500000}),buildCard({name:"หัวหน้าเผ่าไวกิ้ง",price:1500000}),buildCard({name:"นักลอบสังหาร",price:1500000}),buildCard({name:"ท่านแม่ทัพสงคราม",price:1500000}),buildCard({name:"นักวางระเบิด",price:1500000}),buildCard({name:"นักบวชศักสิทธิ์",price:1500000}),buildCard({name:"ศาสตร์อัญเชิญ",price:1500000}),buildCard({name:"พ่อมดเวลา",price:1500000}),buildCard({name:"Bandit",price:1500000}),buildCard({name:"นักเวทย์ขาว",price:1500000}),buildCard({name:"นักวางเพลิง",price:1500000}),buildCard({name:"นินจา",price:1500000}),buildCard({name:"ผู้ใช้ค้อนสายรุ้ง",price:1500000}),buildCard({name:"แวมไพร์1000ปี",price:1500000}),buildCard({name:"ผู้ฝึกเวลา",price:1500000})],Epic:[buildCard({name:"คาวบอย",price:55000}),buildCard({name:"มือระเบิด",price:55000}),buildCard({name:"นักวางพิษ",price:55000}),buildCard({name:"อัศวินปราณ",price:55000}),buildCard({name:"นักบวร",price:55000}),buildCard({name:"นักธนูทอง",price:55000}),buildCard({name:"แวมไพร์100ปี",price:55000}),buildCard({name:"Duit",price:55000}),buildCard({name:"จอมเวทย์ไฟ",price:55000}),buildCard({name:"จอมเวทย์น้ำแข็ง",price:55000}),buildCard({name:"รองเผ่าไวกิ้ง",price:55000}),buildCard({name:"ช่างทำค้อนทอง",price:55000}),buildCard({name:"แม่ทัพอัศวิน",price:55000}),buildCard({name:"แม่มด",price:55000}),buildCard({name:"แม่มดเวลา",price:55000}),buildCard({name:"ผู้ชำระ",price:55000}),buildCard({name:"นักอัญเชิญ",price:55000}),buildCard({name:"แม่ทัพธนู",price:55000})],Rare:[buildCard({name:"หัวหน้าอัศวิน",price:2000}),buildCard({name:"นักเวทย์ไฟ",price:2000}),buildCard({name:"นักเวทย์น้ำแข็ง",price:2000}),buildCard({name:"อัศวิน",price:2000}),buildCard({name:"นักธนูเฉียบคม",price:2000}),buildCard({name:"ศิษย์นักบวร",price:2000}),buildCard({name:"ซามูไร",price:2000}),buildCard({name:"ซามูไรดาบยาว",price:2000}),buildCard({name:"ไวกิ้ง",price:2000}),buildCard({name:"โจรป่า",price:2000})]};

// ฟังก์ชันสุ่มการ์ดหรือการ์ดว่าง
// 🔑 กุญแจ XOR
const PRICE_KEY = 251029;

// ราคาที่เข้ารหัสเก็บในระบบ
const ENCODED_PRICE = {
  Cosmic: 1265445,
  Mythical: 755029,
  Legendary: 401029,
  Epic: 301029,
  Rare: 253057
};

// ราคาจริงคำนวณจาก priceCode
function decodePrice(encoded) {
  return encoded ^ PRICE_KEY;
}

// ฟังก์ชันสุ่มการ์ด
function randomCard(rarity, emptyChance){
  if(Math.random() < emptyChance) return null;
  const pool = CARD_POOL[rarity];
  return pool[Math.floor(Math.random()*pool.length)];
}

// ฟังก์ชันสร้างร้านค้า 20 ใบ
function generateShopDeck(){
  const cards = [];
  cards.push(randomCard("Cosmic", 0.9999));
  for(let i=0;i<2;i++) cards.push(randomCard("Mythical", 0.8));
  for(let i=0;i<4;i++) cards.push(randomCard("Legendary", 0.6));
  for(let i=0;i<5;i++) cards.push(randomCard("Epic", 0.5));
  for(let i=0;i<8;i++) cards.push(randomCard("Rare", 0.3));
  return cards.filter(c => c !== null);
}

// ระบบร้านค้า
if (typeof window.REFRESH_INTERVAL === "undefined") window.REFRESH_INTERVAL = 300000;

function getCycle(){
  return Math.floor(Date.now() / REFRESH_INTERVAL);
}

function refreshShopByDeck(){
  const currentCycle = getCycle();
  const savedCycle = parseInt(localStorage.getItem("shop_cycle") || "-1", 10);

  if(savedCycle === currentCycle){
    const saved = localStorage.getItem("shop_cards");
    if(saved){
      window.SHOP_CARDS = JSON.parse(saved);
      const savedLocked = localStorage.getItem("shop_locked");
      if(savedLocked) window.shop_locked = JSON.parse(savedLocked);
      if(typeof applyFilters==="function") applyFilters();
      return;
    }
  }

  const newDeck = generateShopDeck();
  window.SHOP_CARDS = newDeck;
  localStorage.setItem("shop_cards", JSON.stringify(newDeck));
  localStorage.setItem("shop_cycle", currentCycle);
  localStorage.setItem("shop_locked", JSON.stringify({
    Cosmic:false, Mythical:false, Legendary:false, Epic:false, Rare:false
  }));
  if(typeof applyFilters==="function") applyFilters();
}

// ฟังก์ชันซื้อการ์ด
function buyCard(card){
  const realPrice = decodePrice(card.priceCode);
  console.log(`ซื้อการ์ด ${card.name} จ่ายจริง: ${realPrice}`);
  // หักเงินผู้เล่นจาก realPrice
}

// เริ่มต้นร้านค้า
refreshShopByDeck();