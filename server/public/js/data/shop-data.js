
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

// ระบบร้านค้า — ตอนนี้เซิฟเป็นคนคุมรายการ+ราคาทั้งหมด (ดู routes/economy.js, game-data/economy-data.js)
// เก็บ CARD_POOL ไว้ข้างบนแค่เพื่ออ้างอิง/แสดงผลอื่นๆ ที่อาจยังใช้อยู่ ไม่ใช้เป็นแหล่งราคาจริงอีกต่อไป

async function refreshShopByDeck(){
  const data = await GameAPI.shopGetCurrent();
  if (!data) {
    console.warn("[shop] โหลดร้านค้าจากเซิฟไม่สำเร็จ (ออฟไลน์?)");
    return;
  }
  window.SHOP_CARDS = data.cards; // แต่ละใบมี slotIndex + price จริงจากเซิฟ
  window.SHOP_NEXT_REFRESH_AT = data.nextRefreshAt;
  if (typeof applyFilters === "function") applyFilters();
}

// ฟังก์ชันซื้อการ์ด — ยิงไปเซิฟ เซิฟเช็คเงิน/สล็อต/ซื้อซ้ำเองทั้งหมด
async function buyCard(card){
  if (!GameAPI.isLoggedIn()) {
    alert("ต้องเข้าสู่ระบบ (username + PIN) ก่อนซื้อของ");
    return;
  }
  const result = await GameAPI.shopBuy(card.slotIndex);
  if (!result || !result.ok) {
    alert("ซื้อไม่สำเร็จ: " + (result?.error || "unknown error"));
    return;
  }
  applyServerMoney(result.money);
  console.log(`ซื้อการ์ด ${result.card.name} สำเร็จ`);
  return result;
}

// เริ่มต้นร้านค้า — refresh อัตโนมัติทุกครั้งที่ cycle เปลี่ยน (ตาม nextRefreshAt ที่เซิฟบอกมา)
refreshShopByDeck();
setInterval(() => {
  if (window.SHOP_NEXT_REFRESH_AT && Date.now() >= window.SHOP_NEXT_REFRESH_AT) refreshShopByDeck();
}, 5000);