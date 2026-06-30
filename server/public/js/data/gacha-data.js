// ============================================================
// สเตตัสตัวละครทั้งหมด (rarity, hp, atk, def, skill, class) มาจาก
// CHARACTER_DB ในไฟล์ character-data.js ที่เดียว — ที่นี่เก็บแค่
// "อัตราออก (rate)" และ "ตู้กาชาไหนมีตัวไหนบ้าง" เท่านั้น
// ต้องโหลด character-data.js ก่อนไฟล์นี้เสมอ
// ============================================================

// สร้างการ์ดเด่นของแบนเนอร์ โดยดึงสเตตัสจาก CHARACTER_DB และไอคอนตาม rarity
function buildFeaturedCard(name, bannerName) {
  const card = buildCard({ name, bannerName });
  if (!card) return null;
  card.icon = RARITY_ICON[card.rarity] || "";
  return card;
}

const GACHA_POOLS = {
  GACHA10011: {
    cost:100,
    featuredCard: buildFeaturedCard("อัศวิน", "RARE1"),
    pool: [
      buildCard({ name: "อัศวิน", rate: 2 }),
      buildCard({ name: "นักเวทย์ไฟ", rate: 2 }),
      
      buildCard({ name: "นักรบฝึกหัด", rate: 16 }),
      buildCard({ name: "นักธนูฝึกหัด", rate: 16 }),
      buildCard({ name: "นักเวทย์ฝึกหัด", rate: 16 }),
      buildCard({ name: "โจรเริ่มต้น", rate: 16 }),
      buildCard({ name: "นักวางระเบิดฝึกหัด", rate: 16 }),
      buildCard({ name: "นักดาบฝึกหัด", rate: 16 })
    ]
  },
  GACHA10012: {
     cost:500,
    featuredCard: buildFeaturedCard("หัวหน้าอัศวิน", "RARE2"),
    pool: [
       buildCard({ name: "หัวหน้าอัศวิน", rate: 2 }),
       buildCard({ name: "อัศวิน", rate: 2 }),
      buildCard({ name: "นักเวทย์ไฟ", rate: 2 }),
      buildCard({ name: "นักธนูเฉียบคม", rate: 2 }),
      buildCard({ name: "ศิษย์นักบวร", rate: 2 }),
      
     buildCard({ name: "นักรบฝึกหัด", rate: 15 }),
      buildCard({ name: "นักธนูฝึกหัด", rate: 15 }),
      buildCard({ name: "นักเวทย์ฝึกหัด", rate: 15 }),
      buildCard({ name: "โจรเริ่มต้น", rate: 15 }),
      buildCard({ name: "นักวางระเบิดฝึกหัด", rate: 15 }),
      buildCard({ name: "นักดาบฝึกหัด", rate: 15 })
    ]
  },
  GACHA20011: {
    cost:2000,
    featuredCard: buildFeaturedCard("อัศวินปราณ", "EPIC1"),
    pool: [
     buildCard({ name: "อัศวินปราณ", rate: 0.9 }),
        buildCard({ name: "นักบวร", rate: 0.9 }),
        buildCard({ name: "นักธนูทอง", rate: 0.9 }),
        buildCard({ name: "แวมไพร์100ปี", rate: 0.9 }),
      
      buildCard({ name: "หัวหน้าอัศวิน", rate: 1.2 }),
       buildCard({ name: "นักเวทย์ไฟ", rate: 1.2 }),
       buildCard({ name: "นักเวทย์น้ำแข็ง", rate: 1.2 }),
      buildCard({ name: "อัศวิน", rate: 1.2 }),
      buildCard({ name: "นักธนูเฉียบคม", rate: 1.2 }),
      buildCard({ name: "ศิษย์นักบวร", rate: 1.2 }),
      buildCard({ name: "ซามูไร", rate: 1.2 }),
      buildCard({ name: "ซามูไรดาบยาว", rate: 1.2 }),
      buildCard({ name: "ไวกิ้ง", rate: 1.2 }),
      buildCard({ name: "โจรป่า", rate: 1.2 }),
       
     buildCard({ name: "นักรบฝึกหัด", rate: 14.066 }),
      buildCard({ name: "นักธนูฝึกหัด", rate: 14.066 }),
      buildCard({ name: "นักเวทย์ฝึกหัด", rate: 14.066 }),
      buildCard({ name: "โจรเริ่มต้น", rate: 14.066 }),
      buildCard({ name: "นักวางระเบิดฝึกหัด", rate: 14.066 }),
      buildCard({ name: "นักดาบฝึกหัด", rate: 14.066 })
    ]
  },
  GACHA20012: {
    cost:6000,
    featuredCard: buildFeaturedCard("มือระเบิด", "EPIC2"),
    pool: [
      buildCard({ name: "มือระเบิด", rate: 0.6666 }),
        buildCard({ name: "นักวางพิษ", rate: 0.6666 }),
        buildCard({ name: "อัศวินปราณ", rate: 0.6666 }),
        buildCard({ name: "นักบวร", rate: 0.6666 }),
        buildCard({ name: "นักธนูทอง", rate: 0.6666 }),
        buildCard({ name: "แวมไพร์100ปี", rate: 0.6666 }),
        buildCard({ name: "Duit", rate: 0.6666 }),
        buildCard({ name: "จอมเวทย์ไฟ", rate: 0.6666 }),
        buildCard({ name: "จอมเวทย์น้ำแข็ง", rate: 0.6666 }),
      
      buildCard({ name: "หัวหน้าอัศวิน", rate: 1.5 }),
       buildCard({ name: "นักเวทย์ไฟ", rate: 1.5 }),
       buildCard({ name: "นักเวทย์น้ำแข็ง", rate: 1.5 }),
      buildCard({ name: "อัศวิน", rate: 1.5 }),
      buildCard({ name: "นักธนูเฉียบคม", rate: 1.5 }),
      buildCard({ name: "ศิษย์นักบวร", rate: 1.5 }),
      buildCard({ name: "ซามูไร", rate: 1.5 }),
      buildCard({ name: "ซามูไรดาบยาว", rate: 1.5 }),
      buildCard({ name: "ไวกิ้ง", rate: 1.5 }),
      buildCard({ name: "โจรป่า", rate: 1.5 }),
       
     buildCard({ name: "นักรบฝึกหัด", rate: 13.166 }),
      buildCard({ name: "นักธนูฝึกหัด", rate: 13.166 }),
      buildCard({ name: "นักเวทย์ฝึกหัด", rate: 13.166 }),
      buildCard({ name: "โจรเริ่มต้น", rate: 13.166 }),
      buildCard({ name: "นักวางระเบิดฝึกหัด", rate: 13.166 }),
      buildCard({ name: "นักดาบฝึกหัด", rate: 13.166 })
    ]
  },
  GACHA20013: {
  cost:19000,
  featuredCard: buildFeaturedCard("คาวบอย", "EPIC3"),
  pool: [
    buildCard({ name: "คาวบอย", rate: 0.6 }),
       buildCard({ name: "มือระเบิด", rate: 0.6 }),
        buildCard({ name: "นักวางพิษ", rate: 0.6 }),
        buildCard({ name: "อัศวินปราณ", rate: 0.6 }),
        buildCard({ name: "นักบวร", rate: 0.6 }),
        buildCard({ name: "นักธนูทอง", rate: 0.6 }),
        buildCard({ name: "แวมไพร์100ปี", rate: 0.6 }),
        buildCard({ name: "Duit", rate: 0.6 }),
        buildCard({ name: "จอมเวทย์ไฟ", rate: 0.6 }),
        buildCard({ name: "จอมเวทย์น้ำแข็ง", rate: 0.6 }),
        buildCard({ name: "รองเผ่าไวกิ้ง", rate: 0.6 }),
        buildCard({ name: "ช่างทำค้อนทอง", rate: 0.6 }),
        buildCard({ name: "แม่ทัพอัศวิน", rate: 0.6 }),
        buildCard({ name: "แม่มด", rate: 0.6 }),
        buildCard({ name: "แม่มดเวลา", rate: 0.6 }),
        buildCard({ name: "ผู้ชำระ", rate: 0.6 }),
        buildCard({ name: "นักอัญเชิญ", rate: 0.6 }),
        buildCard({ name: "แม่ทัพธนู", rate: 0.6 }),
      
    buildCard({ name: "หัวหน้าอัศวิน", rate: 4.92 }),
       buildCard({ name: "นักเวทย์ไฟ", rate: 4.92 }),
       buildCard({ name: "นักเวทย์น้ำแข็ง", rate: 4.92 }),
      buildCard({ name: "อัศวิน", rate: 4.92 }),
      buildCard({ name: "นักธนูเฉียบคม", rate: 4.92 }),
      buildCard({ name: "ศิษย์นักบวร", rate: 4.92 }),
      buildCard({ name: "ซามูไร", rate: 4.92 }),
      buildCard({ name: "ซามูไรดาบยาว", rate: 4.92 }),
      buildCard({ name: "ไวกิ้ง", rate: 4.92 }),
      buildCard({ name: "โจรป่า", rate: 4.92 }),
       
    buildCard({ name: "นักรบฝึกหัด", rate: 6.666 }),
      buildCard({ name: "นักธนูฝึกหัด", rate: 6.666 }),
      buildCard({ name: "นักเวทย์ฝึกหัด", rate: 6.666 }),
      buildCard({ name: "โจรเริ่มต้น", rate: 6.666 }),
      buildCard({ name: "นักวางระเบิดฝึกหัด", rate: 6.666 }),
      buildCard({ name: "นักดาบฝึกหัด", rate: 6.666 })
  ]
},
GACHA30011: {
  cost:50000,
  featuredCard: buildFeaturedCard("Angle", "LEGENDARY1"),
  pool: [
    buildCard({ name: "Angle", rate: 0.3333 }),
    buildCard({ name: "ผู้ชำนาญพิษ", rate: 0.3333 }),
    buildCard({ name: "นักดาบคู่", rate: 0.3333 }),
  
     buildCard({ name: "คาวบอย", rate: 1 }),
       buildCard({ name: "มือระเบิด", rate: 1 }),
        buildCard({ name: "นักวางพิษ", rate: 1 }),
        buildCard({ name: "อัศวินปราณ", rate: 1 }),
        buildCard({ name: "นักบวร", rate: 1 }),
        buildCard({ name: "นักธนูทอง", rate: 1 }),
        buildCard({ name: "แวมไพร์100ปี", rate: 1 }),
        buildCard({ name: "Duit", rate: 1 }),
        buildCard({ name: "จอมเวทย์ไฟ", rate: 1 }),
        buildCard({ name: "จอมเวทย์น้ำแข็ง", rate: 1 }),
        buildCard({ name: "รองเผ่าไวกิ้ง", rate: 1 }),
        buildCard({ name: "ช่างทำค้อนทอง", rate: 1 }),
        buildCard({ name: "แม่ทัพอัศวิน", rate: 1 }),
        buildCard({ name: "แม่มด", rate: 1 }),
        buildCard({ name: "แม่มดเวลา", rate: 1 }),
        buildCard({ name: "ผู้ชำระ", rate: 1 }),
        buildCard({ name: "นักอัญเชิญ", rate: 1 }),
        buildCard({ name: "แม่ทัพธนู", rate: 1 }),
      
    buildCard({ name: "หัวหน้าอัศวิน", rate: 8.1 }),
       buildCard({ name: "นักเวทย์ไฟ", rate: 8.1 }),
       buildCard({ name: "นักเวทย์น้ำแข็ง", rate: 8.1 }),
      buildCard({ name: "อัศวิน", rate: 8.1 }),
      buildCard({ name: "นักธนูเฉียบคม", rate: 8.1 }),
      buildCard({ name: "ศิษย์นักบวร", rate: 8.1 }),
      buildCard({ name: "ซามูไร", rate: 8.1 }),
      buildCard({ name: "ซามูไรดาบยาว", rate: 8.1 }),
      buildCard({ name: "ไวกิ้ง", rate: 8.1 }),
      buildCard({ name: "โจรป่า", rate: 8.1 }),
  ]
},
GACHA30012: {
    cost:150000,
    featuredCard: buildFeaturedCard("ท่านแม่ทัพสงคราม", "LEGENDARY2"),
    pool: [
        buildCard({ name: "Angle", rate: 0.5 }),
    buildCard({ name: "ผู้ชำนาญพิษ", rate: 0.5 }),
    buildCard({ name: "นักดาบคู่", rate: 0.5 }),
        buildCard({ name: "หัวหน้าเผ่าไวกิ้ง", rate: 0.5 }),
        buildCard({ name: "นักลอบสังหาร", rate: 0.5 }),
        buildCard({ name: "ท่านแม่ทัพสงคราม", rate: 0.5 }),
        buildCard({ name: "นักวางระเบิด", rate: 0.5 }),
        buildCard({ name: "นักบวชศักสิทธิ์", rate: 0.5 }),
        buildCard({ name: "ศาสตร์อัญเชิญ", rate: 0.5 }),
      
        buildCard({ name: "คาวบอย", rate: 1 }),
       buildCard({ name: "มือระเบิด", rate: 1 }),
        buildCard({ name: "นักวางพิษ", rate: 1 }),
        buildCard({ name: "อัศวินปราณ", rate: 1 }),
        buildCard({ name: "นักบวร", rate: 1 }),
        buildCard({ name: "นักธนูทอง", rate: 1 }),
        buildCard({ name: "แวมไพร์100ปี", rate: 1 }),
        buildCard({ name: "Duit", rate: 1 }),
        buildCard({ name: "จอมเวทย์ไฟ", rate: 1 }),
        buildCard({ name: "จอมเวทย์น้ำแข็ง", rate: 1 }),
        buildCard({ name: "รองเผ่าไวกิ้ง", rate: 1 }),
        buildCard({ name: "ช่างทำค้อนทอง", rate: 1 }),
        buildCard({ name: "แม่ทัพอัศวิน", rate: 1 }),
        buildCard({ name: "แม่มด", rate: 1 }),
        buildCard({ name: "แม่มดเวลา", rate: 1 }),
        buildCard({ name: "ผู้ชำระ", rate: 1 }),
        buildCard({ name: "นักอัญเชิญ", rate: 1 }),
        buildCard({ name: "แม่ทัพธนู", rate: 1 }),
        
        buildCard({ name: "หัวหน้าอัศวิน", rate: 7.75 }),
       buildCard({ name: "นักเวทย์ไฟ", rate: 7.75 }),
       buildCard({ name: "นักเวทย์น้ำแข็ง", rate: 7.75 }),
      buildCard({ name: "อัศวิน", rate: 7.75 }),
      buildCard({ name: "นักธนูเฉียบคม", rate: 7.75 }),
      buildCard({ name: "ศิษย์นักบวร", rate: 7.75 }),
      buildCard({ name: "ซามูไร", rate: 7.75 }),
      buildCard({ name: "ซามูไรดาบยาว", rate: 7.75 }),
      buildCard({ name: "ไวกิ้ง", rate: 7.75 }),
      buildCard({ name: "โจรป่า", rate: 7.75 }),
  ]
},
GACHA30013: {
    cost:400000,
    featuredCard: buildFeaturedCard("Bandit", "LEGENDARY3"),
    pool: [
       buildCard({ name: "Angle", rate: 0.5 }),
    buildCard({ name: "ผู้ชำนาญพิษ", rate: 0.5 }),
    buildCard({ name: "นักดาบคู่", rate: 0.5 }),
        buildCard({ name: "หัวหน้าเผ่าไวกิ้ง", rate: 0.5 }),
        buildCard({ name: "นักลอบสังหาร", rate: 0.5 }),
        buildCard({ name: "ท่านแม่ทัพสงคราม", rate: 0.5 }),
        buildCard({ name: "นักวางระเบิด", rate: 0.5 }),
        buildCard({ name: "นักบวชศักสิทธิ์", rate: 0.5 }),
        buildCard({ name: "ศาสตร์อัญเชิญ", rate: 0.5 }),
        buildCard({ name: "พ่อมดเวลา", rate: 0.5 }),
        buildCard({ name: "Bandit", rate: 0.5 }),
         buildCard({ name: "นักเวทย์ขาว", rate: 0.5 }),
          buildCard({ name: "นักวางเพลิง", rate: 0.5 }),
        buildCard({ name: "นินจา", rate: 0.5 }),
        buildCard({ name: "ผู้ใช้ค้อนสายรุ้ง", rate: 0.5 }),
        buildCard({ name: "แวมไพร์1000ปี", rate: 0.5 }),
        buildCard({ name: "ผู้ฝึกเวลา", rate: 0.5 }),
      
         buildCard({ name: "คาวบอย", rate: 1 }),
       buildCard({ name: "มือระเบิด", rate: 1 }),
        buildCard({ name: "นักวางพิษ", rate: 1 }),
        buildCard({ name: "อัศวินปราณ", rate: 1 }),
        buildCard({ name: "นักบวร", rate: 1 }),
        buildCard({ name: "นักธนูทอง", rate: 1 }),
        buildCard({ name: "แวมไพร์100ปี", rate: 1 }),
        buildCard({ name: "Duit", rate: 1 }),
        buildCard({ name: "จอมเวทย์ไฟ", rate: 1 }),
        buildCard({ name: "จอมเวทย์น้ำแข็ง", rate: 1 }),
        buildCard({ name: "รองเผ่าไวกิ้ง", rate: 1 }),
        buildCard({ name: "ช่างทำค้อนทอง", rate: 1 }),
        buildCard({ name: "แม่ทัพอัศวิน", rate: 1 }),
        buildCard({ name: "แม่มด", rate: 1 }),
        buildCard({ name: "แม่มดเวลา", rate: 1 }),
        buildCard({ name: "ผู้ชำระ", rate: 1 }),
        buildCard({ name: "นักอัญเชิญ", rate: 1 }),
        buildCard({ name: "แม่ทัพธนู", rate: 1 }),
      
    buildCard({ name: "หัวหน้าอัศวิน", rate: 7.35 }),
       buildCard({ name: "นักเวทย์ไฟ", rate: 7.35 }),
       buildCard({ name: "นักเวทย์น้ำแข็ง", rate: 7.35 }),
      buildCard({ name: "อัศวิน", rate: 7.35 }),
      buildCard({ name: "นักธนูเฉียบคม", rate: 7.35 }),
      buildCard({ name: "ศิษย์นักบวร", rate: 7.35 }),
      buildCard({ name: "ซามูไร", rate: 7.35 }),
      buildCard({ name: "ซามูไรดาบยาว", rate: 7.35 }),
      buildCard({ name: "ไวกิ้ง", rate: 7.35 }),
      buildCard({ name: "โจรป่า", rate: 7.35 }),
        
  ]
}
};
