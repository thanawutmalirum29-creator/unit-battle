
// ตัวอย่าง pool การ์ดแต่ละ rarity
const CARD_POOL={
  Cosmic: [
    { name: "Cosmic Titan", rarity: "Cosmic", atk: 100, hp: 120, def: 40, skill: "None", price: 1000000 },
    { name: "Void Dragon", rarity: "Cosmic", atk: 95, hp: 100, def: 35, skill: "Meteor", price: 1200000 }
  ],
  Mythical: [
    { name: "Dragon", rarity: "Mythical", atk: 70, hp: 80, def: 30, skill: "Fire", price: 20000000 },
    { name: "Phoenix", rarity: "Mythical", atk: 65, hp: 75, def: 28, skill: "Rebirth", price: 20000000 }
  ],
  Legendary:[{name:"Angle",rarity:"Legendary",hp:264,atk:39,def:27,skill:"AOE Heal L1",class:"Healer",price:1500000},{name:"ผู้ชำนาญพิษ",rarity:"Legendary",hp:264,atk:52,def:23,skill:"Poison L1",class:"Trickster",price:1500000},{name:"นักดาบคู่",rarity:"Legendary",hp:329,atk:66,def:32,skill:"Double Strike L1",class:"Warrior",price:1500000},{name:"หัวหน้าเผ่าไวกิ้ง",rarity:"Legendary",hp:329,atk:66,def:32,skill:"AOE Defense Buff L1",class:"Warrior",price:1500000},{name:"นักลอบสังหาร",rarity:"Legendary",hp:274,atk:52,def:13,skill:"Critical L1",class:"Assassin",price:1500000},{name:"ท่านแม่ทัพสงคราม",rarity:"Legendary",hp:439,atk:49,def:4,skill:"Berserk L1",class:"Tank",price:1500000},{name:"นักวางระเบิด",rarity:"Legendary",hp:230,atk:109,def:10,skill:"Bomb L1",class:"Bomb",price:1500000},{name:"นักบวชศักสิทธิ์",rarity:"Legendary",hp:264,atk:44,def:27,skill:"Heal L1",class:"Healer",price:1500000},{name:"ศาสตร์อัญเชิญ",rarity:"Legendary",hp:286,atk:22,def:17,skill:"Summon L1",class:"Summoner",price:1500000},{name:"พ่อมดเวลา",rarity:"Legendary",hp:264,atk:44,def:23,skill:"Energy Boost L1",class:"Healer",price:1500000},{name:"Bandit",rarity:"Legendary",hp:252,atk:120,def:17,skill:"3 hit target L1",class:"Rogue1",price:1500000},{name:"นักเวทย์ขาว",rarity:"Legendary",hp:264,atk:44,def:23,skill:"Cleanse L1",class:"Healer",price:1500000},{name:"นักวางเพลิง",rarity:"Legendary",hp:264,atk:44,def:23,skill:"Burn L1",class:"Trickster",price:1500000},{name:"นินจา",rarity:"Legendary",hp:1050,atk:85,def:28,skill:"Piercing Shot L1",class:"Rogue2",price:1500000},{name:"ผู้ใช้ค้อนสายรุ้ง",rarity:"Legendary",hp:260,atk:42,def:23,skill:"Stun L1",class:"CC",price:1500000},{name:"แวมไพร์1000ปี",rarity:"Legendary",hp:274,atk:52,def:13,skill:"Lifesteal L2",class:"Assassin",price:1500000},{name:"ผู้ฝึกเวลา",rarity:"Legendary",hp:274,atk:44,def:23,skill:"Time Stop L1",class:"CC",price:1500000}],Epic:[{name:"คาวบอย",rarity:"Epic",hp:190,atk:90,def:13,skill:"3 hit target L1",class:"Rogue1",price:55000},{name:"มือระเบิด",rarity:"Epic",hp:177,atk:84,def:8,skill:"Bomb L1",class:"Bomb",price:55000},{name:"นักวางพิษ",rarity:"Epic",hp:203,atk:40,def:18,skill:"Poison L1",class:"Trickster",price:55000},{name:"อัศวินปราณ",rarity:"Epic",hp:338,atk:38,def:34,skill:"AOE Defense Buff L1",class:"Tank",price:55000},{name:"นักบวร",rarity:"Epic",hp:203,atk:34,def:21,skill:"Heal L1",class:"Healer",price:55000},{name:"นักธนูทอง",rarity:"Epic",hp:194,atk:92,def:13,skill:"Piercing Shot L1",class:"Rogue",price:55000},{name:"แวมไพร์100ปี",rarity:"Epic",hp:211,atk:40,def:10,skill:"Lifesteal L1",class:"Assassin",price:55000},{name:"Duit",rarity:"Epic",hp:203,atk:30,def:21,skill:"AOE Heal L1",class:"Healer",price:55000},{name:"จอมเวทย์ไฟ",rarity:"Epic",hp:185,atk:34,def:19,skill:"Burn L1",class:"Mage",price:55000},{name:"จอมเวทย์น้ำแข็ง",rarity:"Epic",hp:190,atk:34,def:13,skill:"Freeze L1",class:"Mage",price:55000},{name:"รองเผ่าไวกิ้ง",rarity:"Epic",hp:253,atk:51,def:25,skill:"Power Strike L1",class:"Warrior",price:55000},{name:"ช่างทำค้อนทอง",rarity:"Epic",hp:200,atk:32,def:18,skill:"Stun L1",class:"CC",price:55000},{name:"แม่ทัพอัศวิน",rarity:"Epic",hp:359,atk:39,def:36,skill:"Aoe Defense Buff L1",class:"Tank",price:55000},{name:"แม่มด",rarity:"Epic",hp:200,atk:34,def:18,skill:"Silence L1",class:"Helper",price:55000},{name:"แม่มดเวลา",rarity:"Epic",hp:200,atk:34,def:18,skill:"Energy Boost L1",class:"Helper",price:55000},{name:"ผู้ชำระ",rarity:"Epic",hp:200,atk:34,def:18,skill:"Cleanse L1",class:"Helper",price:55000},{name:"นักอัญเชิญ",rarity:"Epic",hp:220,atk:17,def:13,skill:"Summon L1",class:"Summoner",price:55000},{name:"แม่ทัพธนู",rarity:"Epic",hp:205,atk:98,def:14,skill:"3 hit target L1",class:"Rogue",price:55000}],Rare:[{name:"หัวหน้าอัศวิน",rarity:"Rare",hp:276,atk:30,def:28,skill:"AOE Defense Buff L1",class:"Tank",price:2000},{name:"นักเวทย์ไฟ",rarity:"Rare",hp:143,atk:26,def:10,skill:"Burn L1",class:"Mage",price:2000},{name:"นักเวทย์น้ำแข็ง",rarity:"Rare",hp:145,atk:26,def:10,skill:"Freeze L1",class:"Mage",price:2000},{name:"อัศวิน",rarity:"Rare",hp:260,atk:29,def:26,skill:"Defense Buff L1",class:"Tank",price:2000},{name:"นักธนูเฉียบคม",rarity:"Rare",hp:149,atk:71,def:10,skill:"Piercing Shot L1",class:"Rogue",price:2000},{name:"ศิษย์นักบวร",rarity:"Rare",hp:156,atk:26,def:16,skill:"Heal L1",class:"Healer",price:2000},{name:"ซามูไร",rarity:"Rare",hp:180,atk:38,def:18,skill:"Double Strike L1",class:"Warrior",price:2000},{name:"ซามูไรดาบยาว",rarity:"Rare",hp:175,atk:38,def:18,skill:"AOE Attack L1",class:"Warrior",price:2000},{name:"ไวกิ้ง",rarity:"Rare",hp:195,atk:39,def:19,skill:"Power Strike L1",class:"Warrior",price:2000},{name:"โจรป่า",rarity:"Rare",hp:162,atk:31,def:8,skill:"Critical L1",class:"Assassin",price:2000}]};

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