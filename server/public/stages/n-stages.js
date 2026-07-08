// ============================================================
// n-stages.js — ข้อมูลศัตรูโหมด "ปกติ" (NORMAL)
// โครงสร้างใหม่: แบ่งเป็น 5 "บิ๊กสเตจ" (chapter) บิ๊กสเตจละ 100 ด่าน = 500 ด่านทั้งหมด
//   - ด่าน 1-100   = บิ๊กสเตจ 1 (ปกติ)
//   - ด่าน 101-200 = บิ๊กสเตจ 2 (ด่านชุดเดิม แต่ค่าพลังศัตรูแรงขึ้น)
//   - ด่าน 201-300 = บิ๊กสเตจ 3
//   - ด่าน 301-400 = บิ๊กสเตจ 4
//   - ด่าน 401-500 = บิ๊กสเตจ 5
// ปลดล็อคบิ๊กสเตจถัดไปโดยอัตโนมัติเมื่อผ่านด่านสุดท้ายของบิ๊กสเตจก่อนหน้า
// (unlockedStage เดินต่อเนื่อง 1..500 อยู่แล้ว ไม่ต้องมี logic แยกส่วน)
// ทุก 5 ด่านเป็นด่านบอส (ด่านที่ n % 5 === 0) มี 3 ตัว ไม่มี field class เหมือนเดิม
// ด่านปกตินอกนั้นมี 4 ตัวเสมอ (Tank/DPS/CC-Mage/Healer)
// ============================================================
const STAGES = {
  // ============ บิ๊กสเตจ 1 — ปกติ (ด่าน 1-100) ============
  1: [ // ทุ่งสไลม์นิรันดร์
    { name:"สไลม์หินยักษ์", class:"Tank", hp:200, atk:22, def:20, skill:"Defense Buff L1" },
    { name:"สไลม์เพลิงกริช", class:"Warrior", hp:150, atk:40, def:15, skill:"Double Strike L1" },
    { name:"สไลม์พิษเขี้ยว", class:"Mage", hp:110, atk:60, def:10, skill:"AOE Attack L1" },
    { name:"สไลม์น้ำอมฤต", class:"Healer", hp:120, atk:28, def:12, skill:"Heal L1" }
  ],
  2: [ // ทุ่งสไลม์นิรันดร์
    { name:"อสูรเมือกดำ", class:"Tank", hp:204, atk:22, def:20, skill:"Defense Buff L1" },
    { name:"อสูรเมือกกรด", class:"Berserk", hp:163, atk:45, def:14, skill:"Berserk Mode L1" },
    { name:"อสูรเมือกพิษร้าย", class:"Rogue", hp:118, atk:65, def:10, skill:"Piercing Shot L1" },
    { name:"อสูรเมือกชโลมยา", class:"Healer", hp:122, atk:29, def:12, skill:"AOE Heal L1" }
  ],
  3: [ // ทุ่งสไลม์นิรันดร์
    { name:"วุ้นราชายักษ์", class:"Tank", hp:208, atk:23, def:21, skill:"Defense Buff L1" },
    { name:"วุ้นเดือดพลุ่ง", class:"Warrior", hp:156, atk:42, def:16, skill:"Power Strike L1" },
    { name:"วุ้นจอมพิษ", class:"CC", hp:114, atk:50, def:12, skill:"Stun L1" },
    { name:"วุ้นชโลมบุญ", class:"Healer", hp:125, atk:29, def:12, skill:"Cleanse L1" }
  ],
  4: [ // ทุ่งสไลม์นิรันดร์
    { name:"ปีศาจเมือกอสูร", class:"Tank", hp:212, atk:23, def:21, skill:"Defense Buff L1" },
    { name:"ปีศาจเมือกเหล็ก", class:"Berserk", hp:170, atk:47, def:15, skill:"Berserk Mode L1" },
    { name:"ปีศาจเมือกสะกด", class:"Rogue", hp:123, atk:68, def:11, skill:"Bomb L1" },
    { name:"ปีศาจเมือกฟื้นคืน", class:"Healer", hp:127, atk:30, def:13, skill:"Heal L1" }
  ],
  5: [ // ทุ่งสไลม์นิรันดร์
    { name:"ราชันสไลม์มหึมา", hp:410, atk:73, def:32, skill:"AOE Attack L2" },
    { name:"อัศวินสไลม์ผลึก", hp:186, atk:49, def:18, skill:"Double Strike L2" },
    { name:"นักบวชสไลม์เมือก", hp:150, atk:35, def:15, skill:"Cleanse L2" }
  ],
  6: [ // ป่าก็อบลิน
    { name:"ก็อบลินโล่หนาม", class:"Tank", hp:220, atk:24, def:22, skill:"AOE Defense Buff L1" },
    { name:"ก็อบลินคลั่งเลือด", class:"Warrior", hp:165, atk:44, def:17, skill:"Double Strike L1" },
    { name:"ก็อบลินธนูพิษ", class:"Mage", hp:121, atk:66, def:11, skill:"Burn L1" },
    { name:"หมอผีก็อบลิน", class:"Healer", hp:132, atk:31, def:13, skill:"Heal L1" }
  ],
  7: [ // ป่าก็อบลิน
    { name:"ก็อบลินขี่หมาป่า", class:"Tank", hp:225, atk:25, def:22, skill:"AOE Defense Buff L1" },
    { name:"ก็อบลินขวานคู่", class:"Berserk", hp:180, atk:49, def:16, skill:"Berserk Mode L1" },
    { name:"ก็อบลินจอมเวทดำ", class:"Rogue", hp:130, atk:72, def:11, skill:"Piercing Shot L1" },
    { name:"ก็อบลินหมองู", class:"Healer", hp:135, atk:31, def:13, skill:"AOE Heal L1" }
  ],
  8: [ // ป่าก็อบลิน
    { name:"โทรลป่าพิทักษ์", class:"Tank", hp:229, atk:25, def:23, skill:"AOE Defense Buff L1" },
    { name:"โทรลป่าคลั่ง", class:"Warrior", hp:172, atk:46, def:17, skill:"Power Strike L1" },
    { name:"โทรลนักล่าเงา", class:"CC", hp:126, atk:55, def:14, skill:"AOE Silence L1" },
    { name:"โทรลหมอผีราก", class:"Healer", hp:137, atk:32, def:14, skill:"Cleanse L1" }
  ],
  9: [ // ป่าก็อบลิน
    { name:"ยักษ์ป่าพิทักษ์", class:"Tank", hp:233, atk:26, def:23, skill:"AOE Defense Buff L1" },
    { name:"ยักษ์ป่ากระบองเหล็ก", class:"Berserk", hp:187, atk:51, def:16, skill:"Berserk Mode L1" },
    { name:"ยักษ์ป่าจอมมนตร์", class:"Rogue", hp:135, atk:75, def:12, skill:"Bomb L1" },
    { name:"ยักษ์ป่านักบวชไม้", class:"Healer", hp:140, atk:33, def:14, skill:"Heal L1" }
  ],
  10: [ // ป่าก็อบลิน
    { name:"จอมทัพก็อบลินเขี้ยวเหล็ก", hp:452, atk:81, def:36, skill:"Berserk Mode L2" },
    { name:"แม่ทัพก็อบลินขวานคู่", hp:205, atk:55, def:21, skill:"Double Strike L2" },
    { name:"หมองูก็อบลินมนตร์ดำ", hp:164, atk:38, def:16, skill:"Cleanse L2" }
  ],
  11: [ // ที่ราบออร์ค
    { name:"ออร์คผู้พิทักษ์", class:"Tank", hp:243, atk:27, def:24, skill:"Defense Buff L1" },
    { name:"ออร์คนักรบเถื่อน", class:"Warrior", hp:182, atk:49, def:18, skill:"Double Strike L1" },
    { name:"ออร์คนักธนูเขี้ยวแหลม", class:"Mage", hp:133, atk:73, def:12, skill:"AOE Attack L1" },
    { name:"หมอผีออร์คกระดูก", class:"Healer", hp:146, atk:34, def:15, skill:"Heal L1" }
  ],
  12: [ // ที่ราบออร์ค
    { name:"ออร์คขี่หมูป่า", class:"Tank", hp:247, atk:27, def:25, skill:"Defense Buff L1" },
    { name:"ออร์คเพชฌฆาต", class:"Berserk", hp:198, atk:54, def:17, skill:"Berserk Mode L1" },
    { name:"ออร์คจอมเวทเลือด", class:"Rogue", hp:143, atk:79, def:12, skill:"Piercing Shot L1" },
    { name:"ออร์คนักบวชกระดูก", class:"Healer", hp:148, atk:35, def:15, skill:"AOE Heal L1" }
  ],
  13: [ // ที่ราบออร์ค
    { name:"ยักษ์ใหญ่หัวหน้าเผ่า", class:"Tank", hp:252, atk:28, def:25, skill:"Defense Buff L1" },
    { name:"ยักษ์ใหญ่ขวานคู่", class:"Warrior", hp:189, atk:50, def:19, skill:"Power Strike L1" },
    { name:"ยักษ์ใหญ่นักซุ่ม", class:"CC", hp:139, atk:61, def:15, skill:"Silence L1" },
    { name:"ยักษ์ใหญ่หมอผี", class:"Healer", hp:151, atk:35, def:15, skill:"Cleanse L1" }
  ],
  14: [ // ที่ราบออร์ค
    { name:"ไซคลอปส์พิทักษ์ทุ่ง", class:"Tank", hp:257, atk:28, def:26, skill:"Defense Buff L1" },
    { name:"ไซคลอปส์กระทืบดิน", class:"Berserk", hp:206, atk:57, def:18, skill:"Berserk Mode L1" },
    { name:"ไซคลอปส์สะกดจิต", class:"Rogue", hp:149, atk:82, def:13, skill:"Bomb L1" },
    { name:"ไซคลอปส์นักบวชหิน", class:"Healer", hp:154, atk:36, def:15, skill:"Heal L1" }
  ],
  15: [ // ที่ราบออร์ค
    { name:"หัวหน้าเผ่าออร์คทมิฬ", hp:498, atk:89, def:39, skill:"AOE Attack L2" },
    { name:"ยอดนักรบออร์คสายเลือด", hp:227, atk:60, def:23, skill:"Double Strike L2" },
    { name:"จอมเวทออร์คหินภูเขาไฟ", hp:181, atk:43, def:18, skill:"Cleanse L2" }
  ],
  16: [ // ปราสาทเงามืด
    { name:"อัศวินเงามืด", class:"Tank", hp:267, atk:29, def:27, skill:"AOE Defense Buff L1" },
    { name:"ไวเวิร์นทมิฬ", class:"Warrior", hp:200, atk:53, def:20, skill:"Double Strike L1" },
    { name:"เนโครแมนเซอร์วิญญาณเก่า", class:"Mage", hp:147, atk:80, def:13, skill:"Burn L1" },
    { name:"นักธนูรัตติกาล", class:"Healer", hp:160, atk:37, def:16, skill:"Heal L1" }
  ],
  17: [ // ปราสาทเงามืด
    { name:"อัศวินกระดูกผุ", class:"Tank", hp:272, atk:30, def:27, skill:"AOE Defense Buff L1" },
    { name:"การ์กอยล์หินดำ", class:"Berserk", hp:218, atk:60, def:19, skill:"Berserk Mode L1" },
    { name:"จอมเวทเงามืด", class:"Rogue", hp:158, atk:87, def:14, skill:"Piercing Shot L1" },
    { name:"นักบวชเงามืด", class:"Healer", hp:163, atk:38, def:16, skill:"AOE Heal L1" }
  ],
  18: [ // ปราสาทเงามืด
    { name:"อัศวินวิญญาณพิทักษ์", class:"Tank", hp:278, atk:31, def:28, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเลือดสาป", class:"Warrior", hp:208, atk:56, def:21, skill:"Power Strike L1" },
    { name:"นักฆ่าเงาราตรี", class:"CC", hp:153, atk:67, def:17, skill:"Charm L1" },
    { name:"นักบวชคำสาป", class:"Healer", hp:167, atk:39, def:17, skill:"Cleanse L1" }
  ],
  19: [ // ปราสาทเงามืด
    { name:"โกเลมกระดูกยักษ์", class:"Tank", hp:283, atk:31, def:28, skill:"AOE Defense Buff L1" },
    { name:"อัศวินดำผู้ทรยศ", class:"Berserk", hp:227, atk:62, def:20, skill:"Berserk Mode L1" },
    { name:"จอมเวทมนตร์มืด", class:"Rogue", hp:164, atk:91, def:14, skill:"Bomb L1" },
    { name:"ปีศาจนักบวชดำ", class:"Healer", hp:170, atk:40, def:17, skill:"Heal L1" }
  ],
  20: [ // ปราสาทเงามืด
    { name:"ราชันมังกรแดง", hp:549, atk:98, def:43, skill:"Berserk Mode L2" },
    { name:"อัศวินหวาดผวา", hp:248, atk:67, def:25, skill:"Double Strike L2" },
    { name:"ศาสดาแห่งรัตติกาล", hp:199, atk:46, def:20, skill:"Cleanse L2" }
  ],
  21: [ // เขาวงกตคริสตัล
    { name:"โกเลมคริสตัล", class:"Tank", hp:294, atk:32, def:29, skill:"Defense Buff L1" },
    { name:"อัศวินแก้วเจียระไน", class:"Warrior", hp:221, atk:59, def:22, skill:"Double Strike L1" },
    { name:"นักเวทคริสตัลเรืองแสง", class:"Mage", hp:162, atk:88, def:15, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งแสง", class:"Healer", hp:177, atk:41, def:18, skill:"Heal L1" }
  ],
  22: [ // เขาวงกตคริสตัล
    { name:"ยักษ์หินอัญมณี", class:"Tank", hp:300, atk:33, def:30, skill:"Defense Buff L1" },
    { name:"อัศวินปริซึม", class:"Berserk", hp:240, atk:66, def:21, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาคริสตัล", class:"Rogue", hp:174, atk:96, def:15, skill:"Piercing Shot L1" },
    { name:"นักพรตอัญมณี", class:"Healer", hp:180, atk:42, def:18, skill:"AOE Heal L1" }
  ],
  23: [ // เขาวงกตคริสตัล
    { name:"การ์เดี้ยนคริสตัลยักษ์", class:"Tank", hp:306, atk:34, def:31, skill:"Defense Buff L1" },
    { name:"อัศวินสายฟ้าคริสตัล", class:"Warrior", hp:229, atk:61, def:23, skill:"Power Strike L1" },
    { name:"จอมเวทมนตร์สะกดแสง", class:"CC", hp:168, atk:73, def:18, skill:"AOE Stun L1" },
    { name:"นักบวชแสงบริสุทธิ์", class:"Healer", hp:184, atk:43, def:18, skill:"Cleanse L1" }
  ],
  24: [ // เขาวงกตคริสตัล
    { name:"ไททันคริสตัลศักดิ์สิทธิ์", class:"Tank", hp:312, atk:34, def:31, skill:"Defense Buff L1" },
    { name:"ดราก้อนคริสตัลจิ๋ว", class:"Berserk", hp:249, atk:69, def:22, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงตัดเพชร", class:"Rogue", hp:181, atk:100, def:16, skill:"Bomb L1" },
    { name:"เทพธิดาคริสตัล", class:"Healer", hp:187, atk:44, def:19, skill:"Heal L1" }
  ],
  25: [ // เขาวงกตคริสตัล
    { name:"จ้าวเขาวงกตคริสตัล", hp:604, atk:108, def:48, skill:"AOE Attack L2" },
    { name:"อัศวินปริซึมมรณะ", hp:274, atk:74, def:28, skill:"Double Strike L2" },
    { name:"นักบวชแสงนิรันดร์", hp:220, atk:52, def:22, skill:"Cleanse L2" }
  ],
  26: [ // ทะเลทรายวิญญาณ
    { name:"มัมมี่พิทักษ์สุสาน", class:"Tank", hp:324, atk:36, def:32, skill:"AOE Defense Buff L1" },
    { name:"นักรบทรายศักดิ์สิทธิ์", class:"Warrior", hp:243, atk:65, def:24, skill:"Double Strike L1" },
    { name:"จอมเวทวิญญาณทราย", class:"Mage", hp:178, atk:97, def:16, skill:"Burn L1" },
    { name:"นักบวชแห่งซากศพ", class:"Healer", hp:194, atk:45, def:19, skill:"Heal L1" }
  ],
  27: [ // ทะเลทรายวิญญาณ
    { name:"สฟิงซ์พิทักษ์", class:"Tank", hp:330, atk:36, def:33, skill:"AOE Defense Buff L1" },
    { name:"แมงป่องยักษ์เพลิง", class:"Berserk", hp:264, atk:73, def:23, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาทะเลทราย", class:"Rogue", hp:192, atk:106, def:17, skill:"Piercing Shot L1" },
    { name:"หมอผีทรายศักดิ์สิทธิ์", class:"Healer", hp:198, atk:46, def:20, skill:"AOE Heal L1" }
  ],
  28: [ // ทะเลทรายวิญญาณ
    { name:"อสูรทรายกลืนกิน", class:"Tank", hp:337, atk:37, def:34, skill:"AOE Defense Buff L1" },
    { name:"นักรบผีดิบทะเลทราย", class:"Warrior", hp:253, atk:67, def:25, skill:"Power Strike L1" },
    { name:"จอมเวทมนตร์สะกดทราย", class:"CC", hp:185, atk:81, def:20, skill:"Stun L1" },
    { name:"นักบวชโอเอซิส", class:"Healer", hp:202, atk:47, def:20, skill:"Cleanse L1" }
  ],
  29: [ // ทะเลทรายวิญญาณ
    { name:"โกเลมทรายเพลิง", class:"Tank", hp:343, atk:38, def:34, skill:"AOE Defense Buff L1" },
    { name:"อัศวินหุ่นทรายศักดิ์สิทธิ์", class:"Berserk", hp:275, atk:76, def:24, skill:"Berserk Mode L1" },
    { name:"นักธนูพายุทราย", class:"Rogue", hp:199, atk:110, def:17, skill:"Bomb L1" },
    { name:"เทพีแห่งโอเอซิส", class:"Healer", hp:206, atk:48, def:21, skill:"Heal L1" }
  ],
  30: [ // ทะเลทรายวิญญาณ
    { name:"ฟาโรห์ผู้คืนชีพ", hp:665, atk:119, def:53, skill:"Berserk Mode L2" },
    { name:"องครักษ์มัมมี่นิรันดร์", hp:302, atk:81, def:30, skill:"Double Strike L2" },
    { name:"นักบวชแห่งสุสานทอง", hp:241, atk:56, def:24, skill:"Cleanse L2" }
  ],
  31: [ // หนองบึงพิษ
    { name:"ยักษ์หนองบึง", class:"Tank", hp:357, atk:39, def:36, skill:"Defense Buff L1" },
    { name:"กบยักษ์พิษ", class:"Warrior", hp:268, atk:71, def:27, skill:"Double Strike L1" },
    { name:"แม่มดหนองน้ำ", class:"Mage", hp:196, atk:107, def:18, skill:"AOE Attack L1" },
    { name:"หมอยาสมุนไพรพิษ", class:"Healer", hp:214, atk:50, def:21, skill:"Heal L1" }
  ],
  32: [ // หนองบึงพิษ
    { name:"เต่ายักษ์เกราะพิษ", class:"Tank", hp:364, atk:40, def:36, skill:"Defense Buff L1" },
    { name:"จระเข้เพชฌฆาต", class:"Berserk", hp:291, atk:80, def:25, skill:"Berserk Mode L1" },
    { name:"งูเห่ายักษ์แว่นทอง", class:"Rogue", hp:211, atk:116, def:18, skill:"Piercing Shot L1" },
    { name:"นักบวชบึงมืด", class:"Healer", hp:218, atk:51, def:22, skill:"AOE Heal L1" }
  ],
  33: [ // หนองบึงพิษ
    { name:"ฮิปโปยักษ์พิษบึง", class:"Tank", hp:371, atk:41, def:37, skill:"Defense Buff L1" },
    { name:"นาคาพิษหนองน้ำ", class:"Warrior", hp:278, atk:74, def:28, skill:"Power Strike L1" },
    { name:"แม่มดสะกดวิญญาณ", class:"CC", hp:204, atk:89, def:22, skill:"AOE Silence L1" },
    { name:"นักพรตดอกบัวพิษ", class:"Healer", hp:223, atk:52, def:22, skill:"Cleanse L1" }
  ],
  34: [ // หนองบึงพิษ
    { name:"ไฮดร้าพิษน้อย", class:"Tank", hp:378, atk:42, def:38, skill:"Defense Buff L1" },
    { name:"อสูรบึงเน่าเปื่อย", class:"Berserk", hp:303, atk:83, def:26, skill:"Berserk Mode L1" },
    { name:"นักฆ่าพรางตัวในหมอกพิษ", class:"Rogue", hp:219, atk:121, def:19, skill:"Bomb L1" },
    { name:"เทพีแห่งหนองน้ำ", class:"Healer", hp:227, atk:53, def:23, skill:"Heal L1" }
  ],
  35: [ // หนองบึงพิษ
    { name:"เจ้าแห่งหนองบึงมรณะ", hp:733, atk:131, def:58, skill:"AOE Attack L2" },
    { name:"ไฮดร้าพิษสามหัว", hp:332, atk:89, def:33, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งบึงดำ", hp:266, atk:62, def:26, skill:"Cleanse L2" }
  ],
  36: [ // ภูเขาไฟอสูร
    { name:"ยักษ์หินลาวา", class:"Tank", hp:393, atk:43, def:39, skill:"AOE Defense Buff L1" },
    { name:"อสูรเพลิงกรงเล็บ", class:"Warrior", hp:295, atk:79, def:29, skill:"Double Strike L1" },
    { name:"จอมเวทเปลวไฟ", class:"Mage", hp:216, atk:118, def:20, skill:"Burn L1" },
    { name:"นักบวชแห่งเถ้าถ่าน", class:"Healer", hp:236, atk:55, def:24, skill:"Heal L1" }
  ],
  37: [ // ภูเขาไฟอสูร
    { name:"ซาลาแมนเดอร์ยักษ์", class:"Tank", hp:401, atk:44, def:40, skill:"AOE Defense Buff L1" },
    { name:"มารเพลิงบ้าคลั่ง", class:"Berserk", hp:321, atk:88, def:28, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาลาวา", class:"Rogue", hp:232, atk:128, def:20, skill:"Piercing Shot L1" },
    { name:"หมอผีแห่งภูเขาไฟ", class:"Healer", hp:241, atk:56, def:24, skill:"AOE Heal L1" }
  ],
  38: [ // ภูเขาไฟอสูร
    { name:"โกเลมลาวาไหลนอง", class:"Tank", hp:409, atk:45, def:41, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะเพลิง", class:"Warrior", hp:306, atk:82, def:31, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดไฟ", class:"CC", hp:225, atk:98, def:25, skill:"Silence L1" },
    { name:"เทพีแห่งเถ้าธุลี", class:"Healer", hp:245, atk:57, def:25, skill:"Cleanse L1" }
  ],
  39: [ // ภูเขาไฟอสูร
    { name:"ฟีนิกซ์ดำผู้ล่มสลาย", class:"Tank", hp:417, atk:46, def:42, skill:"AOE Defense Buff L1" },
    { name:"ดราก้อนเพลิงน้อย", class:"Berserk", hp:333, atk:92, def:29, skill:"Berserk Mode L1" },
    { name:"นักธนูอัคคี", class:"Rogue", hp:242, atk:133, def:21, skill:"Bomb L1" },
    { name:"นักบวชศักดิ์สิทธิ์แห่งไฟ", class:"Healer", hp:250, atk:58, def:25, skill:"Heal L1" }
  ],
  40: [ // ภูเขาไฟอสูร
    { name:"เจ้าภูเขาไฟปีศาจ", hp:808, atk:144, def:64, skill:"Berserk Mode L2" },
    { name:"ซาลาแมนเดอร์ราชันเพลิง", hp:367, atk:98, def:37, skill:"Double Strike L2" },
    { name:"นักบวชแห่งลาวาศักดิ์สิทธิ์", hp:293, atk:68, def:29, skill:"Cleanse L2" }
  ],
  41: [ // ธารน้ำแข็งนิรันดร์
    { name:"โยติสหิมะ", class:"Tank", hp:433, atk:48, def:43, skill:"Defense Buff L1" },
    { name:"หมาป่าน้ำแข็ง", class:"Warrior", hp:325, atk:87, def:32, skill:"Double Strike L1" },
    { name:"แม่มดน้ำแข็ง", class:"Mage", hp:238, atk:130, def:22, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งหิมะ", class:"Healer", hp:260, atk:61, def:26, skill:"Heal L1" }
  ],
  42: [ // ธารน้ำแข็งนิรันดร์
    { name:"ยักษ์น้ำแข็งพิทักษ์", class:"Tank", hp:441, atk:49, def:44, skill:"Defense Buff L1" },
    { name:"หมีขาวเพชฌฆาต", class:"Berserk", hp:353, atk:97, def:31, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาหิมะ", class:"Rogue", hp:256, atk:141, def:22, skill:"Piercing Shot L1" },
    { name:"หมอผีธารน้ำแข็ง", class:"Healer", hp:265, atk:62, def:26, skill:"AOE Heal L1" }
  ],
  43: [ // ธารน้ำแข็งนิรันดร์
    { name:"โกเลมน้ำแข็งยักษ์", class:"Tank", hp:450, atk:50, def:45, skill:"Defense Buff L1" },
    { name:"อัศวินเกราะน้ำแข็ง", class:"Warrior", hp:338, atk:90, def:34, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดหนาว", class:"CC", hp:248, atk:108, def:27, skill:"Charm L1" },
    { name:"เทพีแห่งลมหนาว", class:"Healer", hp:270, atk:63, def:27, skill:"Cleanse L1" }
  ],
  44: [ // ธารน้ำแข็งนิรันดร์
    { name:"มังกรน้ำแข็งน้อย", class:"Tank", hp:459, atk:50, def:46, skill:"Defense Buff L1" },
    { name:"ยักษ์หิมะจอมพลัง", class:"Berserk", hp:367, atk:101, def:32, skill:"Berserk Mode L1" },
    { name:"นักธนูพายุหิมะ", class:"Rogue", hp:266, atk:147, def:23, skill:"Bomb L1" },
    { name:"นักบวชแห่งขั้วโลก", class:"Healer", hp:275, atk:64, def:28, skill:"Heal L1" }
  ],
  45: [ // ธารน้ำแข็งนิรันดร์
    { name:"ราชินีน้ำแข็งนิรันดร์", hp:889, atk:159, def:70, skill:"AOE Attack L2" },
    { name:"โยติสหิมะจอมพิโรธ", hp:404, atk:108, def:40, skill:"Double Strike L2" },
    { name:"นักบวชแห่งความหนาวเหน็บ", hp:323, atk:75, def:32, skill:"Cleanse L2" }
  ],
  46: [ // นครใต้พิภพ
    { name:"อสูรถ้ำลึก", class:"Tank", hp:477, atk:52, def:48, skill:"AOE Defense Buff L1" },
    { name:"นักรบเงาใต้ดิน", class:"Warrior", hp:358, atk:95, def:36, skill:"Double Strike L1" },
    { name:"จอมเวทมืดใต้พิภพ", class:"Mage", hp:262, atk:143, def:24, skill:"Burn L1" },
    { name:"นักบวชแห่งความมืด", class:"Healer", hp:286, atk:67, def:29, skill:"Heal L1" }
  ],
  47: [ // นครใต้พิภพ
    { name:"ดาร์กเอลฟ์พิทักษ์", class:"Tank", hp:486, atk:53, def:49, skill:"AOE Defense Buff L1" },
    { name:"ดาร์กเอลฟ์นักฆ่า", class:"Berserk", hp:389, atk:107, def:34, skill:"Berserk Mode L1" },
    { name:"ดาร์กเอลฟ์นักธนู", class:"Rogue", hp:282, atk:156, def:24, skill:"Piercing Shot L1" },
    { name:"ดาร์กเอลฟ์นักบวช", class:"Healer", hp:292, atk:68, def:29, skill:"AOE Heal L1" }
  ],
  48: [ // นครใต้พิภพ
    { name:"แมงมุมยักษ์ราชินี", class:"Tank", hp:496, atk:55, def:50, skill:"AOE Defense Buff L1" },
    { name:"อัศวินใยดำ", class:"Warrior", hp:372, atk:99, def:37, skill:"Power Strike L1" },
    { name:"แม่มดใยพิษสะกด", class:"CC", hp:273, atk:119, def:30, skill:"AOE Stun L1" },
    { name:"นักพรตใต้พิภพ", class:"Healer", hp:297, atk:69, def:30, skill:"Cleanse L1" }
  ],
  49: [ // นครใต้พิภพ
    { name:"บีฮีมอธถ้ำลึก", class:"Tank", hp:505, atk:56, def:51, skill:"AOE Defense Buff L1" },
    { name:"โกเลมหินใต้พิภพ", class:"Berserk", hp:404, atk:111, def:35, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาไร้แสง", class:"Rogue", hp:293, atk:162, def:25, skill:"Bomb L1" },
    { name:"เทพีแห่งนครมืด", class:"Healer", hp:303, atk:71, def:30, skill:"Heal L1" }
  ],
  50: [ // นครใต้พิภพ
    { name:"จักรพรรดินครใต้พิภพ", hp:979, atk:175, def:77, skill:"Berserk Mode L2" },
    { name:"แมงมุมราชินีมฤตยู", hp:444, atk:118, def:45, skill:"Double Strike L2" },
    { name:"นักบวชแห่งรัตติกาลนิรันดร์", hp:355, atk:83, def:36, skill:"Cleanse L2" }
  ],
  51: [ // สวนสวรรค์ร้าง
    { name:"ผู้พิทักษ์สวนศักดิ์สิทธิ์", class:"Tank", hp:525, atk:58, def:53, skill:"Defense Buff L1" },
    { name:"อัศวินปีกขาวเสื่อมสลาย", class:"Warrior", hp:394, atk:105, def:39, skill:"Double Strike L1" },
    { name:"นางฟ้าจอมเวทเศร้าหมอง", class:"Mage", hp:289, atk:158, def:26, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งสวรรค์ร้าง", class:"Healer", hp:315, atk:74, def:32, skill:"Heal L1" }
  ],
  52: [ // สวนสวรรค์ร้าง
    { name:"ต้นไม้ยักษ์วิญญาณ", class:"Tank", hp:536, atk:59, def:54, skill:"Defense Buff L1" },
    { name:"กริฟฟินคลั่ง", class:"Berserk", hp:428, atk:118, def:37, skill:"Berserk Mode L1" },
    { name:"นักฆ่าปีกเงา", class:"Rogue", hp:311, atk:171, def:27, skill:"Piercing Shot L1" },
    { name:"เทพธิดาน้ำตา", class:"Healer", hp:321, atk:75, def:32, skill:"AOE Heal L1" }
  ],
  53: [ // สวนสวรรค์ร้าง
    { name:"โกเลมไม้ศักดิ์สิทธิ์", class:"Tank", hp:546, atk:60, def:55, skill:"Defense Buff L1" },
    { name:"อัศวินแสงเสื่อมทราม", class:"Warrior", hp:409, atk:109, def:41, skill:"Power Strike L1" },
    { name:"นางฟ้าสะกดวิญญาณ", class:"CC", hp:300, atk:131, def:33, skill:"Stun L1" },
    { name:"มหาปุโรหิตแห่งเอเดน", class:"Healer", hp:328, atk:76, def:33, skill:"Cleanse L1" }
  ],
  54: [ // สวนสวรรค์ร้าง
    { name:"ยูนิคอร์นดำผู้แปดเปื้อน", class:"Tank", hp:557, atk:61, def:56, skill:"Defense Buff L1" },
    { name:"เพกาซัสเพลิงพิโรธ", class:"Berserk", hp:445, atk:122, def:39, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงจันทร์", class:"Rogue", hp:323, atk:178, def:28, skill:"Bomb L1" },
    { name:"อาร์คแองเจิลผู้เศร้าโศก", class:"Healer", hp:334, atk:78, def:33, skill:"Heal L1" }
  ],
  55: [ // สวนสวรรค์ร้าง
    { name:"เทพผู้ล่มสลายแห่งเอเดน", hp:1077, atk:193, def:85, skill:"AOE Attack L2" },
    { name:"อัศวินปีกดำไร้ศรัทธา", hp:490, atk:130, def:49, skill:"Double Strike L2" },
    { name:"มหาปุโรหิตผู้ถูกสาป", hp:391, atk:91, def:39, skill:"Cleanse L2" }
  ],
  56: [ // หุบผาสายฟ้า
    { name:"นกอินทรีสายฟ้า", class:"Tank", hp:579, atk:64, def:58, skill:"AOE Defense Buff L1" },
    { name:"นักรบเมฆพายุ", class:"Warrior", hp:434, atk:116, def:43, skill:"Double Strike L1" },
    { name:"จอมเวทสายฟ้า", class:"Mage", hp:318, atk:174, def:29, skill:"Burn L1" },
    { name:"นักบวชแห่งเมฆา", class:"Healer", hp:347, atk:81, def:35, skill:"Heal L1" }
  ],
  57: [ // หุบผาสายฟ้า
    { name:"ยักษ์ฟ้าคะนอง", class:"Tank", hp:590, atk:65, def:59, skill:"AOE Defense Buff L1" },
    { name:"ไซคลอปส์สายฟ้า", class:"Berserk", hp:472, atk:130, def:41, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาพายุ", class:"Rogue", hp:342, atk:189, def:29, skill:"Piercing Shot L1" },
    { name:"หมอผีแห่งลมกรด", class:"Healer", hp:354, atk:83, def:35, skill:"AOE Heal L1" }
  ],
  58: [ // หุบผาสายฟ้า
    { name:"โกเลมหินสายฟ้า", class:"Tank", hp:601, atk:66, def:60, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะทองแดง", class:"Warrior", hp:451, atk:120, def:45, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดฟ้าร้อง", class:"CC", hp:331, atk:144, def:36, skill:"AOE Silence L1" },
    { name:"เทพีแห่งสายลม", class:"Healer", hp:361, atk:84, def:36, skill:"Cleanse L1" }
  ],
  59: [ // หุบผาสายฟ้า
    { name:"ไทฟูนอสูรจอมพิโรธ", class:"Tank", hp:613, atk:67, def:61, skill:"AOE Defense Buff L1" },
    { name:"การ์กอยล์สายฟ้า", class:"Berserk", hp:490, atk:135, def:43, skill:"Berserk Mode L1" },
    { name:"นักธนูจอมพายุ", class:"Rogue", hp:356, atk:196, def:31, skill:"Bomb L1" },
    { name:"นักบวชแห่งเมฆพิโรธ", class:"Healer", hp:368, atk:86, def:37, skill:"Heal L1" }
  ],
  60: [ // หุบผาสายฟ้า
    { name:"จ้าวหุบผาสายฟ้า", hp:1188, atk:212, def:94, skill:"Berserk Mode L2" },
    { name:"ไซคลอปส์อสุนีบาต", hp:539, atk:144, def:54, skill:"Double Strike L2" },
    { name:"นักบวชแห่งพายุนิรันดร์", hp:431, atk:100, def:43, skill:"Cleanse L2" }
  ],
  61: [ // ป่าต้องคำสาป
    { name:"หมีเงาต้องสาป", class:"Tank", hp:637, atk:70, def:64, skill:"Defense Buff L1" },
    { name:"หมาป่าวิญญาณ", class:"Warrior", hp:478, atk:127, def:48, skill:"Double Strike L1" },
    { name:"แม่มดป่าต้องสาป", class:"Mage", hp:350, atk:191, def:32, skill:"AOE Attack L1" },
    { name:"นักพรตต้นไม้ผุ", class:"Healer", hp:382, atk:89, def:38, skill:"Heal L1" }
  ],
  62: [ // ป่าต้องคำสาป
    { name:"เอนท์ดำผู้เสื่อมทราม", class:"Tank", hp:650, atk:71, def:65, skill:"Defense Buff L1" },
    { name:"หมาป่าเลือดสาป", class:"Berserk", hp:520, atk:143, def:45, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาในป่าลึก", class:"Rogue", hp:377, atk:208, def:32, skill:"Piercing Shot L1" },
    { name:"หมอผีรากไม้ดำ", class:"Healer", hp:390, atk:91, def:39, skill:"AOE Heal L1" }
  ],
  63: [ // ป่าต้องคำสาป
    { name:"โกเลมไม้ผุพัง", class:"Tank", hp:662, atk:73, def:66, skill:"Defense Buff L1" },
    { name:"อัศวินไม้เลื้อยรัดกาย", class:"Warrior", hp:497, atk:132, def:50, skill:"Power Strike L1" },
    { name:"แม่มดสะกดวิญญาณป่า", class:"CC", hp:364, atk:159, def:40, skill:"Silence L1" },
    { name:"นักบวชป่าศักดิ์สิทธิ์เสื่อมสลาย", class:"Healer", hp:397, atk:93, def:40, skill:"Cleanse L1" }
  ],
  64: [ // ป่าต้องคำสาป
    { name:"ทรีเอนท์เก่าแก่ผู้พิโรธ", class:"Tank", hp:675, atk:74, def:68, skill:"Defense Buff L1" },
    { name:"หมีเงายักษ์", class:"Berserk", hp:540, atk:149, def:47, skill:"Berserk Mode L1" },
    { name:"นักธนูใบไม้พิษ", class:"Rogue", hp:392, atk:216, def:34, skill:"Bomb L1" },
    { name:"เทพีแห่งป่าร้าง", class:"Healer", hp:405, atk:95, def:41, skill:"Heal L1" }
  ],
  65: [ // ป่าต้องคำสาป
    { name:"เจ้าป่าต้องคำสาป", hp:1307, atk:234, def:103, skill:"AOE Attack L2" },
    { name:"หมาป่าเงาจอมพิโรธ", hp:593, atk:159, def:60, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งรากดำ", hp:475, atk:110, def:47, skill:"Cleanse L2" }
  ],
  66: [ // วิหารจันทร์เสี้ยว
    { name:"องครักษ์วิหารจันทร์", class:"Tank", hp:702, atk:77, def:70, skill:"AOE Defense Buff L1" },
    { name:"นักรบแสงจันทร์", class:"Warrior", hp:526, atk:140, def:53, skill:"Double Strike L1" },
    { name:"จอมเวทราตรี", class:"Mage", hp:386, atk:211, def:35, skill:"Burn L1" },
    { name:"นักบวชแห่งจันทร์เสี้ยว", class:"Healer", hp:421, atk:98, def:42, skill:"Heal L1" }
  ],
  67: [ // วิหารจันทร์เสี้ยว
    { name:"รูปปั้นหินเฝ้าวิหาร", class:"Tank", hp:715, atk:79, def:72, skill:"AOE Defense Buff L1" },
    { name:"นักฆ่าเงาจันทรา", class:"Berserk", hp:572, atk:157, def:50, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงเงิน", class:"Rogue", hp:415, atk:229, def:36, skill:"Piercing Shot L1" },
    { name:"หมอผีแห่งราตรีกาล", class:"Healer", hp:429, atk:100, def:43, skill:"AOE Heal L1" }
  ],
  68: [ // วิหารจันทร์เสี้ยว
    { name:"โกเลมหินวิหารโบราณ", class:"Tank", hp:729, atk:80, def:73, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะเงิน", class:"Warrior", hp:547, atk:146, def:55, skill:"Power Strike L1" },
    { name:"แม่มดจันทร์สะกดจิต", class:"CC", hp:401, atk:175, def:44, skill:"Charm L1" },
    { name:"มหาปุโรหิตแห่งจันทรา", class:"Healer", hp:438, atk:102, def:44, skill:"Cleanse L1" }
  ],
  69: [ // วิหารจันทร์เสี้ยว
    { name:"หมาป่าจันทร์เพ็ญ", class:"Tank", hp:744, atk:82, def:74, skill:"AOE Defense Buff L1" },
    { name:"อัศวินดำแห่งราตรีกาล", class:"Berserk", hp:595, atk:164, def:52, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาไร้เสียง", class:"Rogue", hp:431, atk:238, def:37, skill:"Bomb L1" },
    { name:"เทพีแห่งแสงจันทร์", class:"Healer", hp:446, atk:104, def:45, skill:"Heal L1" }
  ],
  70: [ // วิหารจันทร์เสี้ยว
    { name:"มหาปุโรหิตแห่งจันทร์เสี้ยว", hp:1440, atk:258, def:114, skill:"Berserk Mode L2" },
    { name:"องครักษ์เงาจันทรา", hp:654, atk:175, def:66, skill:"Double Strike L2" },
    { name:"นักฆ่าเงาราชินีราตรี", hp:523, atk:122, def:52, skill:"Cleanse L2" }
  ],
  71: [ // เกาะร้างกลางทะเลเลือด
    { name:"โจรสลัดผีดิบ", class:"Tank", hp:773, atk:85, def:77, skill:"Defense Buff L1" },
    { name:"นักรบทะเลเลือด", class:"Warrior", hp:580, atk:155, def:58, skill:"Double Strike L1" },
    { name:"จอมเวทคลื่นเลือด", class:"Mage", hp:425, atk:232, def:39, skill:"AOE Attack L1" },
    { name:"หมอเรือผีสิง", class:"Healer", hp:464, atk:108, def:46, skill:"Heal L1" }
  ],
  72: [ // เกาะร้างกลางทะเลเลือด
    { name:"ครีเจอร์ทะเลลึกยักษ์", class:"Tank", hp:788, atk:87, def:79, skill:"Defense Buff L1" },
    { name:"ฉลามปีศาจ", class:"Berserk", hp:630, atk:173, def:55, skill:"Berserk Mode L1" },
    { name:"นักฆ่าใต้คลื่นเลือด", class:"Rogue", hp:457, atk:252, def:39, skill:"Piercing Shot L1" },
    { name:"นักบวชเรืออับปาง", class:"Healer", hp:473, atk:110, def:47, skill:"AOE Heal L1" }
  ],
  73: [ // เกาะร้างกลางทะเลเลือด
    { name:"โกเลมปะการังดำ", class:"Tank", hp:803, atk:88, def:80, skill:"Defense Buff L1" },
    { name:"อัศวินเรือผี", class:"Warrior", hp:603, atk:161, def:60, skill:"Power Strike L1" },
    { name:"เงือกสะกดจิตมรณะ", class:"CC", hp:442, atk:193, def:48, skill:"AOE Stun L1" },
    { name:"เทพีแห่งเกาะร้าง", class:"Healer", hp:482, atk:112, def:48, skill:"Cleanse L1" }
  ],
  74: [ // เกาะร้างกลางทะเลเลือด
    { name:"คราเคนน้อยแห่งทะเลเลือด", class:"Tank", hp:819, atk:90, def:82, skill:"Defense Buff L1" },
    { name:"กัปตันผีดิบไร้หัว", class:"Berserk", hp:655, atk:180, def:57, skill:"Berserk Mode L1" },
    { name:"นักฆ่าใต้เงาคลื่น", class:"Rogue", hp:475, atk:262, def:41, skill:"Bomb L1" },
    { name:"นักบวชแห่งวิญญาณเรืออับปาง", class:"Healer", hp:491, atk:115, def:49, skill:"Heal L1" }
  ],
  75: [ // เกาะร้างกลางทะเลเลือด
    { name:"กัปตันผีแห่งทะเลเลือด", hp:1587, atk:284, def:125, skill:"AOE Attack L2" },
    { name:"คราเคนพิฆาต", hp:720, atk:192, def:72, skill:"Double Strike L2" },
    { name:"เงือกราชินีมรณะ", hp:576, atk:135, def:57, skill:"Cleanse L2" }
  ],
  76: [ // ดงเห็ดพิษ
    { name:"ก้อนเห็ดยักษ์พิษ", class:"Tank", hp:851, atk:94, def:85, skill:"AOE Defense Buff L1" },
    { name:"สปอร์แมงป่องพิษ", class:"Warrior", hp:638, atk:170, def:64, skill:"Double Strike L1" },
    { name:"แม่มดเชื้อรา", class:"Mage", hp:468, atk:255, def:43, skill:"Burn L1" },
    { name:"หมอยาเชื้อราศักดิ์สิทธิ์", class:"Healer", hp:511, atk:119, def:51, skill:"Heal L1" }
  ],
  77: [ // ดงเห็ดพิษ
    { name:"ยักษ์เห็ดเรืองแสง", class:"Tank", hp:868, atk:95, def:87, skill:"AOE Defense Buff L1" },
    { name:"แมลงยักษ์พิษร้าย", class:"Berserk", hp:694, atk:191, def:61, skill:"Berserk Mode L1" },
    { name:"นักฆ่าในหมอกสปอร์", class:"Rogue", hp:503, atk:278, def:43, skill:"Piercing Shot L1" },
    { name:"นักพรตดอกเห็ดบุญ", class:"Healer", hp:521, atk:122, def:52, skill:"AOE Heal L1" }
  ],
  78: [ // ดงเห็ดพิษ
    { name:"โกเลมเชื้อราดำ", class:"Tank", hp:885, atk:97, def:88, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะเห็ดพิษ", class:"Warrior", hp:664, atk:177, def:66, skill:"Power Strike L1" },
    { name:"แม่มดสะกดสปอร์มึนเมา", class:"CC", hp:487, atk:212, def:53, skill:"Stun L1" },
    { name:"เทพีแห่งเห็ดวิเศษ", class:"Healer", hp:531, atk:124, def:53, skill:"Cleanse L1" }
  ],
  79: [ // ดงเห็ดพิษ
    { name:"ไฮดร้าเชื้อราพิษ", class:"Tank", hp:902, atk:99, def:90, skill:"AOE Defense Buff L1" },
    { name:"อสูรสปอร์ระเบิด", class:"Berserk", hp:722, atk:198, def:63, skill:"Berserk Mode L1" },
    { name:"นักธนูลูกดอกพิษ", class:"Rogue", hp:523, atk:289, def:45, skill:"Bomb L1" },
    { name:"นักบวชแห่งป่าเห็ดต้องห้าม", class:"Healer", hp:541, atk:126, def:54, skill:"Heal L1" }
  ],
  80: [ // ดงเห็ดพิษ
    { name:"เจ้าป่าเห็ดพิษมรณะ", hp:1748, atk:313, def:138, skill:"Berserk Mode L2" },
    { name:"ไฮดร้าสปอร์พิฆาต", hp:793, atk:212, def:79, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งเชื้อราดำ", hp:635, atk:148, def:63, skill:"Cleanse L2" }
  ],
  81: [ // ป้อมปราการเหล็กกล้า
    { name:"ทหารเหล็กยาม", class:"Tank", hp:938, atk:103, def:94, skill:"Defense Buff L1" },
    { name:"นักรบเกราะเหล็ก", class:"Warrior", hp:703, atk:188, def:70, skill:"Double Strike L1" },
    { name:"วิศวกรเวทมนตร์", class:"Mage", hp:516, atk:281, def:47, skill:"AOE Attack L1" },
    { name:"นักบวชสนามรบ", class:"Healer", hp:563, atk:131, def:56, skill:"Heal L1" }
  ],
  82: [ // ป้อมปราการเหล็กกล้า
    { name:"โกเลมเหล็กกล้า", class:"Tank", hp:956, atk:105, def:96, skill:"Defense Buff L1" },
    { name:"อัศวินเครื่องจักรบ้าคลั่ง", class:"Berserk", hp:765, atk:210, def:67, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาป้อมปราการ", class:"Rogue", hp:554, atk:306, def:48, skill:"Piercing Shot L1" },
    { name:"หมอสนามเหล็กกล้า", class:"Healer", hp:574, atk:134, def:57, skill:"AOE Heal L1" }
  ],
  83: [ // ป้อมปราการเหล็กกล้า
    { name:"ไททันเหล็กยักษ์", class:"Tank", hp:975, atk:107, def:97, skill:"Defense Buff L1" },
    { name:"อัศวินเกราะเพชร", class:"Warrior", hp:731, atk:195, def:73, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดโลหะ", class:"CC", hp:536, atk:234, def:58, skill:"AOE Silence L1" },
    { name:"เทพีแห่งป้อมปราการ", class:"Healer", hp:585, atk:136, def:58, skill:"Cleanse L1" }
  ],
  84: [ // ป้อมปราการเหล็กกล้า
    { name:"เมคาดราก้อนต้นแบบ", class:"Tank", hp:994, atk:109, def:99, skill:"Defense Buff L1" },
    { name:"นายพลเหล็กกล้าไร้ปราณี", class:"Berserk", hp:795, atk:219, def:70, skill:"Berserk Mode L1" },
    { name:"นักธนูกระสุนเหล็ก", class:"Rogue", hp:576, atk:318, def:50, skill:"Bomb L1" },
    { name:"นักบวชผู้พิทักษ์ป้อม", class:"Healer", hp:596, atk:139, def:60, skill:"Heal L1" }
  ],
  85: [ // ป้อมปราการเหล็กกล้า
    { name:"จอมทัพเหล็กกล้าไร้ปราณี", hp:1925, atk:344, def:152, skill:"AOE Attack L2" },
    { name:"เมคาดราก้อนพิฆาต", hp:874, atk:233, def:87, skill:"Double Strike L2" },
    { name:"นักบวชแห่งป้อมปราการนิรันดร์", hp:699, atk:163, def:70, skill:"Cleanse L2" }
  ],
  86: [ // ทุ่งดอกไม้ผีสิง
    { name:"ต้นไม้ผีสิงพิทักษ์ทุ่ง", class:"Tank", hp:1033, atk:114, def:103, skill:"AOE Defense Buff L1" },
    { name:"วิญญาณดอกไม้พิโรธ", class:"Warrior", hp:774, atk:207, def:77, skill:"Double Strike L1" },
    { name:"แม่มดดอกไม้ราตรี", class:"Mage", hp:568, atk:310, def:52, skill:"Burn L1" },
    { name:"นักบวชแห่งกลีบดอกโรยรา", class:"Healer", hp:620, atk:145, def:62, skill:"Heal L1" }
  ],
  87: [ // ทุ่งดอกไม้ผีสิง
    { name:"หุ่นฟางผีสิง", class:"Tank", hp:1053, atk:116, def:105, skill:"AOE Defense Buff L1" },
    { name:"ผีเสื้อยักษ์พิษ", class:"Berserk", hp:842, atk:232, def:74, skill:"Berserk Mode L1" },
    { name:"นักฆ่าในทุ่งหมอก", class:"Rogue", hp:611, atk:337, def:53, skill:"Piercing Shot L1" },
    { name:"นางไม้แห่งดอกไม้ร่วง", class:"Healer", hp:632, atk:147, def:63, skill:"AOE Heal L1" }
  ],
  88: [ // ทุ่งดอกไม้ผีสิง
    { name:"โกเลมดอกไม้ต้องสาป", class:"Tank", hp:1073, atk:118, def:107, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะกลีบกุหลาบดำ", class:"Warrior", hp:805, atk:215, def:80, skill:"Power Strike L1" },
    { name:"แม่มดสะกดกลิ่นหอมมรณะ", class:"CC", hp:590, atk:258, def:64, skill:"Silence L1" },
    { name:"เทพีแห่งทุ่งดอกไม้ร้าง", class:"Healer", hp:644, atk:150, def:64, skill:"Cleanse L1" }
  ],
  89: [ // ทุ่งดอกไม้ผีสิง
    { name:"ไฮดร้าเถาวัลย์ผีสิง", class:"Tank", hp:1094, atk:120, def:109, skill:"AOE Defense Buff L1" },
    { name:"อสูรดอกไม้เลือด", class:"Berserk", hp:875, atk:241, def:77, skill:"Berserk Mode L1" },
    { name:"นักธนูหนามพิษ", class:"Rogue", hp:635, atk:350, def:55, skill:"Bomb L1" },
    { name:"นักบวชแห่งฤดูใบไม้ร่วง", class:"Healer", hp:657, atk:153, def:66, skill:"Heal L1" }
  ],
  90: [ // ทุ่งดอกไม้ผีสิง
    { name:"เจ้าแห่งทุ่งดอกไม้ผีสิง", hp:2120, atk:379, def:167, skill:"Berserk Mode L2" },
    { name:"วิญญาณกุหลาบดำมรณะ", hp:963, atk:256, def:97, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งกลิ่นหอมมรณะ", hp:769, atk:179, def:77, skill:"Cleanse L2" }
  ],
  91: [ // หุบเขาสุริยะ
    { name:"องครักษ์สุริยะ", class:"Tank", hp:1137, atk:125, def:114, skill:"Defense Buff L1" },
    { name:"นักรบเปลวสุริยัน", class:"Warrior", hp:853, atk:227, def:85, skill:"Double Strike L1" },
    { name:"จอมเวทแสงอาทิตย์", class:"Mage", hp:626, atk:341, def:57, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งรุ่งอรุณ", class:"Healer", hp:682, atk:159, def:68, skill:"Heal L1" }
  ],
  92: [ // หุบเขาสุริยะ
    { name:"ฟีนิกซ์ทองคำน้อย", class:"Tank", hp:1159, atk:128, def:116, skill:"Defense Buff L1" },
    { name:"สิงโตเพลิงสุริยะ", class:"Berserk", hp:928, atk:255, def:81, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาแดด", class:"Rogue", hp:673, atk:371, def:58, skill:"Piercing Shot L1" },
    { name:"มหาปุโรหิตแห่งสุริยะ", class:"Healer", hp:696, atk:162, def:70, skill:"AOE Heal L1" }
  ],
  93: [ // หุบเขาสุริยะ
    { name:"โกเลมทองคำศักดิ์สิทธิ์", class:"Tank", hp:1182, atk:130, def:118, skill:"Defense Buff L1" },
    { name:"อัศวินเกราะสุริยะ", class:"Warrior", hp:887, atk:236, def:89, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดแสงจ้า", class:"CC", hp:650, atk:284, def:71, skill:"Charm L1" },
    { name:"เทพีแห่งอรุณรุ่ง", class:"Healer", hp:709, atk:165, def:71, skill:"Cleanse L1" }
  ],
  94: [ // หุบเขาสุริยะ
    { name:"ไทแทนสุริยะยักษ์", class:"Tank", hp:1205, atk:133, def:121, skill:"Defense Buff L1" },
    { name:"ดราก้อนทองคำผู้พิทักษ์", class:"Berserk", hp:964, atk:265, def:84, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงทอง", class:"Rogue", hp:699, atk:386, def:60, skill:"Bomb L1" },
    { name:"นักบวชสูงสุดแห่งสุริยัน", class:"Healer", hp:723, atk:169, def:72, skill:"Heal L1" }
  ],
  95: [ // หุบเขาสุริยะ
    { name:"ราชันสุริยะทองคำ", hp:2335, atk:418, def:184, skill:"AOE Attack L2" },
    { name:"ฟีนิกซ์เพลิงสุริยัน", hp:1059, atk:283, def:106, skill:"Double Strike L2" },
    { name:"มหาปุโรหิตแห่งดวงอาทิตย์", hp:848, atk:198, def:85, skill:"Cleanse L2" }
  ],
  96: [ // บัลลังก์เทพจุติ
    { name:"องครักษ์เทพจุติ", class:"Tank", hp:1253, atk:138, def:125, skill:"AOE Defense Buff L1" },
    { name:"นักรบเทพผู้ล่มสลาย", class:"Warrior", hp:939, atk:251, def:94, skill:"Double Strike L1" },
    { name:"จอมเวทแห่งบัลลังก์", class:"Mage", hp:689, atk:376, def:63, skill:"Burn L1" },
    { name:"นักบวชสูงสุดแห่งเทวสถาน", class:"Healer", hp:752, atk:175, def:75, skill:"Heal L1" }
  ],
  97: [ // บัลลังก์เทพจุติ
    { name:"ไททันจุติพิทักษ์บัลลังก์", class:"Tank", hp:1277, atk:140, def:128, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเทพผู้พิโรธ", class:"Berserk", hp:1022, atk:281, def:89, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาแห่งเทวสถาน", class:"Rogue", hp:741, atk:409, def:64, skill:"Piercing Shot L1" },
    { name:"เทพีผู้เฝ้าบัลลังก์", class:"Healer", hp:766, atk:179, def:77, skill:"AOE Heal L1" }
  ],
  98: [ // บัลลังก์เทพจุติ
    { name:"โกเลมเทพศักดิ์สิทธิ์", class:"Tank", hp:1302, atk:143, def:130, skill:"AOE Defense Buff L1" },
    { name:"อาร์คแองเจิลผู้ตกสวรรค์", class:"Warrior", hp:976, atk:260, def:98, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดมิติ", class:"CC", hp:716, atk:312, def:78, skill:"AOE Stun L1" },
    { name:"มหาปุโรหิตสูงสุดแห่งจุติ", class:"Healer", hp:781, atk:182, def:78, skill:"Cleanse L1" }
  ],
  99: [ // บัลลังก์เทพจุติ
    { name:"ไทแทนจุติจอมพลัง", class:"Tank", hp:1327, atk:146, def:133, skill:"AOE Defense Buff L1" },
    { name:"ดราก้อนเทพเจ้าจอมพิโรธ", class:"Berserk", hp:1062, atk:292, def:93, skill:"Berserk Mode L1" },
    { name:"นักธนูแห่งวันสิ้นโลก", class:"Rogue", hp:770, atk:425, def:66, skill:"Bomb L1" },
    { name:"เทพธิดาผู้เฝ้าประตูมิติ", class:"Healer", hp:796, atk:186, def:80, skill:"Heal L1" }
  ],
  100: [ // บัลลังก์เทพจุติ
    { name:"เทพจุติผู้ล่มสลาย", hp:2571, atk:460, def:203, skill:"Berserk Mode L2" },
    { name:"อัครเทวดาผู้ทรยศ", hp:1167, atk:312, def:116, skill:"Double Strike L2" },
    { name:"มหาปุโรหิตแห่งวาระสุดท้าย", hp:934, atk:217, def:93, skill:"Cleanse L2" }
  ],
  // ============ บิ๊กสเตจ 2 — ยาก (ด่าน 101-200) ============
  101: [ // ทุ่งสไลม์นิรันดร์
    { name:"สไลม์หินยักษ์", class:"Tank", hp:1380, atk:152, def:138, skill:"Defense Buff L1" },
    { name:"สไลม์เพลิงกริช", class:"Warrior", hp:1035, atk:276, def:103, skill:"Double Strike L1" },
    { name:"สไลม์พิษเขี้ยว", class:"Mage", hp:759, atk:414, def:69, skill:"AOE Attack L1" },
    { name:"สไลม์น้ำอมฤต", class:"Healer", hp:828, atk:193, def:83, skill:"Heal L1" }
  ],
  102: [ // ทุ่งสไลม์นิรันดร์
    { name:"อสูรเมือกดำ", class:"Tank", hp:1407, atk:155, def:141, skill:"Defense Buff L1" },
    { name:"อสูรเมือกกรด", class:"Berserk", hp:1125, atk:309, def:98, skill:"Berserk Mode L1" },
    { name:"อสูรเมือกพิษร้าย", class:"Rogue", hp:816, atk:450, def:70, skill:"Piercing Shot L1" },
    { name:"อสูรเมือกชโลมยา", class:"Healer", hp:844, atk:197, def:84, skill:"AOE Heal L1" }
  ],
  103: [ // ทุ่งสไลม์นิรันดร์
    { name:"วุ้นราชายักษ์", class:"Tank", hp:1434, atk:158, def:143, skill:"Defense Buff L1" },
    { name:"วุ้นเดือดพลุ่ง", class:"Warrior", hp:1075, atk:287, def:108, skill:"Power Strike L1" },
    { name:"วุ้นจอมพิษ", class:"CC", hp:789, atk:344, def:86, skill:"Stun L1" },
    { name:"วุ้นชโลมบุญ", class:"Healer", hp:860, atk:201, def:86, skill:"Cleanse L1" }
  ],
  104: [ // ทุ่งสไลม์นิรันดร์
    { name:"ปีศาจเมือกอสูร", class:"Tank", hp:1462, atk:161, def:146, skill:"Defense Buff L1" },
    { name:"ปีศาจเมือกเหล็ก", class:"Berserk", hp:1170, atk:322, def:102, skill:"Berserk Mode L1" },
    { name:"ปีศาจเมือกสะกด", class:"Rogue", hp:848, atk:468, def:73, skill:"Bomb L1" },
    { name:"ปีศาจเมือกฟื้นคืน", class:"Healer", hp:877, atk:205, def:88, skill:"Heal L1" }
  ],
  105: [ // ทุ่งสไลม์นิรันดร์
    { name:"ราชันสไลม์มหึมา", hp:2831, atk:507, def:224, skill:"AOE Attack L2" },
    { name:"อัศวินสไลม์ผลึก", hp:1286, atk:343, def:129, skill:"Double Strike L2" },
    { name:"นักบวชสไลม์เมือก", hp:1028, atk:240, def:102, skill:"Cleanse L2" }
  ],
  106: [ // ป่าก็อบลิน
    { name:"ก็อบลินโล่หนาม", class:"Tank", hp:1519, atk:167, def:152, skill:"AOE Defense Buff L1" },
    { name:"ก็อบลินคลั่งเลือด", class:"Warrior", hp:1140, atk:304, def:114, skill:"Double Strike L1" },
    { name:"ก็อบลินธนูพิษ", class:"Mage", hp:836, atk:456, def:76, skill:"Burn L1" },
    { name:"หมอผีก็อบลิน", class:"Healer", hp:912, atk:213, def:91, skill:"Heal L1" }
  ],
  107: [ // ป่าก็อบลิน
    { name:"ก็อบลินขี่หมาป่า", class:"Tank", hp:1549, atk:170, def:155, skill:"AOE Defense Buff L1" },
    { name:"ก็อบลินขวานคู่", class:"Berserk", hp:1239, atk:341, def:108, skill:"Berserk Mode L1" },
    { name:"ก็อบลินจอมเวทดำ", class:"Rogue", hp:898, atk:496, def:77, skill:"Piercing Shot L1" },
    { name:"ก็อบลินหมองู", class:"Healer", hp:929, atk:217, def:93, skill:"AOE Heal L1" }
  ],
  108: [ // ป่าก็อบลิน
    { name:"โทรลป่าพิทักษ์", class:"Tank", hp:1579, atk:174, def:158, skill:"AOE Defense Buff L1" },
    { name:"โทรลป่าคลั่ง", class:"Warrior", hp:1184, atk:316, def:118, skill:"Power Strike L1" },
    { name:"โทรลนักล่าเงา", class:"CC", hp:869, atk:379, def:95, skill:"AOE Silence L1" },
    { name:"โทรลหมอผีราก", class:"Healer", hp:948, atk:221, def:95, skill:"Cleanse L1" }
  ],
  109: [ // ป่าก็อบลิน
    { name:"ยักษ์ป่าพิทักษ์", class:"Tank", hp:1610, atk:177, def:161, skill:"AOE Defense Buff L1" },
    { name:"ยักษ์ป่ากระบองเหล็ก", class:"Berserk", hp:1288, atk:354, def:113, skill:"Berserk Mode L1" },
    { name:"ยักษ์ป่าจอมมนตร์", class:"Rogue", hp:934, atk:515, def:81, skill:"Bomb L1" },
    { name:"ยักษ์ป่านักบวชไม้", class:"Healer", hp:966, atk:225, def:97, skill:"Heal L1" }
  ],
  110: [ // ป่าก็อบลิน
    { name:"จอมทัพก็อบลินเขี้ยวเหล็ก", hp:3118, atk:558, def:246, skill:"Berserk Mode L2" },
    { name:"แม่ทัพก็อบลินขวานคู่", hp:1416, atk:377, def:141, skill:"Double Strike L2" },
    { name:"หมองูก็อบลินมนตร์ดำ", hp:1133, atk:265, def:113, skill:"Cleanse L2" }
  ],
  111: [ // ที่ราบออร์ค
    { name:"ออร์คผู้พิทักษ์", class:"Tank", hp:1673, atk:184, def:167, skill:"Defense Buff L1" },
    { name:"ออร์คนักรบเถื่อน", class:"Warrior", hp:1255, atk:335, def:126, skill:"Double Strike L1" },
    { name:"ออร์คนักธนูเขี้ยวแหลม", class:"Mage", hp:920, atk:502, def:84, skill:"AOE Attack L1" },
    { name:"หมอผีออร์คกระดูก", class:"Healer", hp:1004, atk:234, def:100, skill:"Heal L1" }
  ],
  112: [ // ที่ราบออร์ค
    { name:"ออร์คขี่หมูป่า", class:"Tank", hp:1706, atk:188, def:171, skill:"Defense Buff L1" },
    { name:"ออร์คเพชฌฆาต", class:"Berserk", hp:1365, atk:375, def:119, skill:"Berserk Mode L1" },
    { name:"ออร์คจอมเวทเลือด", class:"Rogue", hp:990, atk:546, def:85, skill:"Piercing Shot L1" },
    { name:"ออร์คนักบวชกระดูก", class:"Healer", hp:1024, atk:239, def:102, skill:"AOE Heal L1" }
  ],
  113: [ // ที่ราบออร์ค
    { name:"ยักษ์ใหญ่หัวหน้าเผ่า", class:"Tank", hp:1739, atk:191, def:174, skill:"Defense Buff L1" },
    { name:"ยักษ์ใหญ่ขวานคู่", class:"Warrior", hp:1305, atk:348, def:130, skill:"Power Strike L1" },
    { name:"ยักษ์ใหญ่นักซุ่ม", class:"CC", hp:957, atk:417, def:104, skill:"Silence L1" },
    { name:"ยักษ์ใหญ่หมอผี", class:"Healer", hp:1044, atk:244, def:104, skill:"Cleanse L1" }
  ],
  114: [ // ที่ราบออร์ค
    { name:"ไซคลอปส์พิทักษ์ทุ่ง", class:"Tank", hp:1773, atk:195, def:177, skill:"Defense Buff L1" },
    { name:"ไซคลอปส์กระทืบดิน", class:"Berserk", hp:1419, atk:390, def:124, skill:"Berserk Mode L1" },
    { name:"ไซคลอปส์สะกดจิต", class:"Rogue", hp:1029, atk:567, def:89, skill:"Bomb L1" },
    { name:"ไซคลอปส์นักบวชหิน", class:"Healer", hp:1064, atk:248, def:106, skill:"Heal L1" }
  ],
  115: [ // ที่ราบออร์ค
    { name:"หัวหน้าเผ่าออร์คทมิฬ", hp:3435, atk:615, def:271, skill:"AOE Attack L2" },
    { name:"ยอดนักรบออร์คสายเลือด", hp:1559, atk:416, def:156, skill:"Double Strike L2" },
    { name:"จอมเวทออร์คหินภูเขาไฟ", hp:1248, atk:291, def:124, skill:"Cleanse L2" }
  ],
  116: [ // ปราสาทเงามืด
    { name:"อัศวินเงามืด", class:"Tank", hp:1843, atk:203, def:184, skill:"AOE Defense Buff L1" },
    { name:"ไวเวิร์นทมิฬ", class:"Warrior", hp:1382, atk:369, def:138, skill:"Double Strike L1" },
    { name:"เนโครแมนเซอร์วิญญาณเก่า", class:"Mage", hp:1014, atk:553, def:92, skill:"Burn L1" },
    { name:"นักธนูรัตติกาล", class:"Healer", hp:1106, atk:258, def:111, skill:"Heal L1" }
  ],
  117: [ // ปราสาทเงามืด
    { name:"อัศวินกระดูกผุ", class:"Tank", hp:1879, atk:207, def:188, skill:"AOE Defense Buff L1" },
    { name:"การ์กอยล์หินดำ", class:"Berserk", hp:1503, atk:413, def:132, skill:"Berserk Mode L1" },
    { name:"จอมเวทเงามืด", class:"Rogue", hp:1090, atk:601, def:94, skill:"Piercing Shot L1" },
    { name:"นักบวชเงามืด", class:"Healer", hp:1127, atk:263, def:113, skill:"AOE Heal L1" }
  ],
  118: [ // ปราสาทเงามืด
    { name:"อัศวินวิญญาณพิทักษ์", class:"Tank", hp:1916, atk:211, def:192, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเลือดสาป", class:"Warrior", hp:1437, atk:383, def:144, skill:"Power Strike L1" },
    { name:"นักฆ่าเงาราตรี", class:"CC", hp:1054, atk:460, def:115, skill:"Charm L1" },
    { name:"นักบวชคำสาป", class:"Healer", hp:1149, atk:268, def:115, skill:"Cleanse L1" }
  ],
  119: [ // ปราสาทเงามืด
    { name:"โกเลมกระดูกยักษ์", class:"Tank", hp:1953, atk:215, def:195, skill:"AOE Defense Buff L1" },
    { name:"อัศวินดำผู้ทรยศ", class:"Berserk", hp:1562, atk:430, def:137, skill:"Berserk Mode L1" },
    { name:"จอมเวทมนตร์มืด", class:"Rogue", hp:1133, atk:625, def:98, skill:"Bomb L1" },
    { name:"ปีศาจนักบวชดำ", class:"Healer", hp:1172, atk:273, def:117, skill:"Heal L1" }
  ],
  120: [ // ปราสาทเงามืด
    { name:"ราชันมังกรแดง", hp:3783, atk:677, def:299, skill:"Berserk Mode L2" },
    { name:"อัศวินหวาดผวา", hp:1717, atk:458, def:171, skill:"Double Strike L2" },
    { name:"ศาสดาแห่งรัตติกาล", hp:1374, atk:321, def:137, skill:"Cleanse L2" }
  ],
  121: [ // เขาวงกตคริสตัล
    { name:"โกเลมคริสตัล", class:"Tank", hp:2030, atk:223, def:203, skill:"Defense Buff L1" },
    { name:"อัศวินแก้วเจียระไน", class:"Warrior", hp:1523, atk:406, def:152, skill:"Double Strike L1" },
    { name:"นักเวทคริสตัลเรืองแสง", class:"Mage", hp:1117, atk:609, def:102, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งแสง", class:"Healer", hp:1218, atk:284, def:122, skill:"Heal L1" }
  ],
  122: [ // เขาวงกตคริสตัล
    { name:"ยักษ์หินอัญมณี", class:"Tank", hp:2070, atk:228, def:207, skill:"Defense Buff L1" },
    { name:"อัศวินปริซึม", class:"Berserk", hp:1656, atk:455, def:145, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาคริสตัล", class:"Rogue", hp:1200, atk:662, def:103, skill:"Piercing Shot L1" },
    { name:"นักพรตอัญมณี", class:"Healer", hp:1242, atk:290, def:124, skill:"AOE Heal L1" }
  ],
  123: [ // เขาวงกตคริสตัล
    { name:"การ์เดี้ยนคริสตัลยักษ์", class:"Tank", hp:2110, atk:232, def:211, skill:"Defense Buff L1" },
    { name:"อัศวินสายฟ้าคริสตัล", class:"Warrior", hp:1582, atk:422, def:158, skill:"Power Strike L1" },
    { name:"จอมเวทมนตร์สะกดแสง", class:"CC", hp:1160, atk:506, def:127, skill:"AOE Stun L1" },
    { name:"นักบวชแสงบริสุทธิ์", class:"Healer", hp:1266, atk:295, def:127, skill:"Cleanse L1" }
  ],
  124: [ // เขาวงกตคริสตัล
    { name:"ไททันคริสตัลศักดิ์สิทธิ์", class:"Tank", hp:2151, atk:237, def:215, skill:"Defense Buff L1" },
    { name:"ดราก้อนคริสตัลจิ๋ว", class:"Berserk", hp:1721, atk:473, def:151, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงตัดเพชร", class:"Rogue", hp:1248, atk:688, def:108, skill:"Bomb L1" },
    { name:"เทพธิดาคริสตัล", class:"Healer", hp:1291, atk:301, def:129, skill:"Heal L1" }
  ],
  125: [ // เขาวงกตคริสตัล
    { name:"จ้าวเขาวงกตคริสตัล", hp:4167, atk:746, def:329, skill:"AOE Attack L2" },
    { name:"อัศวินปริซึมมรณะ", hp:1892, atk:505, def:189, skill:"Double Strike L2" },
    { name:"นักบวชแสงนิรันดร์", hp:1513, atk:353, def:152, skill:"Cleanse L2" }
  ],
  126: [ // ทะเลทรายวิญญาณ
    { name:"มัมมี่พิทักษ์สุสาน", class:"Tank", hp:2236, atk:246, def:224, skill:"AOE Defense Buff L1" },
    { name:"นักรบทรายศักดิ์สิทธิ์", class:"Warrior", hp:1677, atk:447, def:168, skill:"Double Strike L1" },
    { name:"จอมเวทวิญญาณทราย", class:"Mage", hp:1230, atk:671, def:112, skill:"Burn L1" },
    { name:"นักบวชแห่งซากศพ", class:"Healer", hp:1341, atk:313, def:134, skill:"Heal L1" }
  ],
  127: [ // ทะเลทรายวิญญาณ
    { name:"สฟิงซ์พิทักษ์", class:"Tank", hp:2279, atk:251, def:228, skill:"AOE Defense Buff L1" },
    { name:"แมงป่องยักษ์เพลิง", class:"Berserk", hp:1824, atk:501, def:160, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาทะเลทราย", class:"Rogue", hp:1322, atk:729, def:114, skill:"Piercing Shot L1" },
    { name:"หมอผีทรายศักดิ์สิทธิ์", class:"Healer", hp:1368, atk:319, def:137, skill:"AOE Heal L1" }
  ],
  128: [ // ทะเลทรายวิญญาณ
    { name:"อสูรทรายกลืนกิน", class:"Tank", hp:2324, atk:256, def:232, skill:"AOE Defense Buff L1" },
    { name:"นักรบผีดิบทะเลทราย", class:"Warrior", hp:1743, atk:465, def:174, skill:"Power Strike L1" },
    { name:"จอมเวทมนตร์สะกดทราย", class:"CC", hp:1278, atk:558, def:139, skill:"Stun L1" },
    { name:"นักบวชโอเอซิส", class:"Healer", hp:1394, atk:325, def:139, skill:"Cleanse L1" }
  ],
  129: [ // ทะเลทรายวิญญาณ
    { name:"โกเลมทรายเพลิง", class:"Tank", hp:2369, atk:261, def:237, skill:"AOE Defense Buff L1" },
    { name:"อัศวินหุ่นทรายศักดิ์สิทธิ์", class:"Berserk", hp:1895, atk:521, def:166, skill:"Berserk Mode L1" },
    { name:"นักธนูพายุทราย", class:"Rogue", hp:1374, atk:758, def:118, skill:"Bomb L1" },
    { name:"เทพีแห่งโอเอซิส", class:"Healer", hp:1421, atk:332, def:142, skill:"Heal L1" }
  ],
  130: [ // ทะเลทรายวิญญาณ
    { name:"ฟาโรห์ผู้คืนชีพ", hp:4589, atk:821, def:362, skill:"Berserk Mode L2" },
    { name:"องครักษ์มัมมี่นิรันดร์", hp:2084, atk:555, def:208, skill:"Double Strike L2" },
    { name:"นักบวชแห่งสุสานทอง", hp:1666, atk:389, def:167, skill:"Cleanse L2" }
  ],
  131: [ // หนองบึงพิษ
    { name:"ยักษ์หนองบึง", class:"Tank", hp:2462, atk:271, def:246, skill:"Defense Buff L1" },
    { name:"กบยักษ์พิษ", class:"Warrior", hp:1847, atk:492, def:185, skill:"Double Strike L1" },
    { name:"แม่มดหนองน้ำ", class:"Mage", hp:1354, atk:739, def:123, skill:"AOE Attack L1" },
    { name:"หมอยาสมุนไพรพิษ", class:"Healer", hp:1477, atk:345, def:148, skill:"Heal L1" }
  ],
  132: [ // หนองบึงพิษ
    { name:"เต่ายักษ์เกราะพิษ", class:"Tank", hp:2510, atk:276, def:251, skill:"Defense Buff L1" },
    { name:"จระเข้เพชฌฆาต", class:"Berserk", hp:2008, atk:552, def:176, skill:"Berserk Mode L1" },
    { name:"งูเห่ายักษ์แว่นทอง", class:"Rogue", hp:1456, atk:803, def:126, skill:"Piercing Shot L1" },
    { name:"นักบวชบึงมืด", class:"Healer", hp:1506, atk:351, def:151, skill:"AOE Heal L1" }
  ],
  133: [ // หนองบึงพิษ
    { name:"ฮิปโปยักษ์พิษบึง", class:"Tank", hp:2559, atk:282, def:256, skill:"Defense Buff L1" },
    { name:"นาคาพิษหนองน้ำ", class:"Warrior", hp:1920, atk:512, def:192, skill:"Power Strike L1" },
    { name:"แม่มดสะกดวิญญาณ", class:"CC", hp:1408, atk:614, def:154, skill:"AOE Silence L1" },
    { name:"นักพรตดอกบัวพิษ", class:"Healer", hp:1536, atk:358, def:154, skill:"Cleanse L1" }
  ],
  134: [ // หนองบึงพิษ
    { name:"ไฮดร้าพิษน้อย", class:"Tank", hp:2609, atk:287, def:261, skill:"Defense Buff L1" },
    { name:"อสูรบึงเน่าเปื่อย", class:"Berserk", hp:2087, atk:574, def:183, skill:"Berserk Mode L1" },
    { name:"นักฆ่าพรางตัวในหมอกพิษ", class:"Rogue", hp:1513, atk:835, def:130, skill:"Bomb L1" },
    { name:"เทพีแห่งหนองน้ำ", class:"Healer", hp:1566, atk:365, def:157, skill:"Heal L1" }
  ],
  135: [ // หนองบึงพิษ
    { name:"เจ้าแห่งหนองบึงมรณะ", hp:5054, atk:904, def:399, skill:"AOE Attack L2" },
    { name:"ไฮดร้าพิษสามหัว", hp:2294, atk:612, def:230, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งบึงดำ", hp:1835, atk:428, def:184, skill:"Cleanse L2" }
  ],
  136: [ // ภูเขาไฟอสูร
    { name:"ยักษ์หินลาวา", class:"Tank", hp:2712, atk:298, def:271, skill:"AOE Defense Buff L1" },
    { name:"อสูรเพลิงกรงเล็บ", class:"Warrior", hp:2034, atk:542, def:203, skill:"Double Strike L1" },
    { name:"จอมเวทเปลวไฟ", class:"Mage", hp:1492, atk:814, def:136, skill:"Burn L1" },
    { name:"นักบวชแห่งเถ้าถ่าน", class:"Healer", hp:1627, atk:380, def:163, skill:"Heal L1" }
  ],
  137: [ // ภูเขาไฟอสูร
    { name:"ซาลาแมนเดอร์ยักษ์", class:"Tank", hp:2765, atk:304, def:276, skill:"AOE Defense Buff L1" },
    { name:"มารเพลิงบ้าคลั่ง", class:"Berserk", hp:2212, atk:608, def:194, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาลาวา", class:"Rogue", hp:1604, atk:885, def:138, skill:"Piercing Shot L1" },
    { name:"หมอผีแห่งภูเขาไฟ", class:"Healer", hp:1659, atk:387, def:166, skill:"AOE Heal L1" }
  ],
  138: [ // ภูเขาไฟอสูร
    { name:"โกเลมลาวาไหลนอง", class:"Tank", hp:2819, atk:310, def:282, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะเพลิง", class:"Warrior", hp:2114, atk:564, def:211, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดไฟ", class:"CC", hp:1550, atk:677, def:169, skill:"Silence L1" },
    { name:"เทพีแห่งเถ้าธุลี", class:"Healer", hp:1691, atk:395, def:169, skill:"Cleanse L1" }
  ],
  139: [ // ภูเขาไฟอสูร
    { name:"ฟีนิกซ์ดำผู้ล่มสลาย", class:"Tank", hp:2874, atk:316, def:287, skill:"AOE Defense Buff L1" },
    { name:"ดราก้อนเพลิงน้อย", class:"Berserk", hp:2299, atk:632, def:201, skill:"Berserk Mode L1" },
    { name:"นักธนูอัคคี", class:"Rogue", hp:1667, atk:920, def:144, skill:"Bomb L1" },
    { name:"นักบวชศักดิ์สิทธิ์แห่งไฟ", class:"Healer", hp:1724, atk:402, def:172, skill:"Heal L1" }
  ],
  140: [ // ภูเขาไฟอสูร
    { name:"เจ้าภูเขาไฟปีศาจ", hp:5567, atk:996, def:439, skill:"Berserk Mode L2" },
    { name:"ซาลาแมนเดอร์ราชันเพลิง", hp:2527, atk:674, def:253, skill:"Double Strike L2" },
    { name:"นักบวชแห่งลาวาศักดิ์สิทธิ์", hp:2022, atk:471, def:202, skill:"Cleanse L2" }
  ],
  141: [ // ธารน้ำแข็งนิรันดร์
    { name:"โยติสหิมะ", class:"Tank", hp:2987, atk:329, def:299, skill:"Defense Buff L1" },
    { name:"หมาป่าน้ำแข็ง", class:"Warrior", hp:2240, atk:597, def:224, skill:"Double Strike L1" },
    { name:"แม่มดน้ำแข็ง", class:"Mage", hp:1643, atk:896, def:149, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งหิมะ", class:"Healer", hp:1792, atk:418, def:179, skill:"Heal L1" }
  ],
  142: [ // ธารน้ำแข็งนิรันดร์
    { name:"ยักษ์น้ำแข็งพิทักษ์", class:"Tank", hp:3045, atk:335, def:305, skill:"Defense Buff L1" },
    { name:"หมีขาวเพชฌฆาต", class:"Berserk", hp:2436, atk:670, def:213, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาหิมะ", class:"Rogue", hp:1766, atk:974, def:152, skill:"Piercing Shot L1" },
    { name:"หมอผีธารน้ำแข็ง", class:"Healer", hp:1827, atk:426, def:183, skill:"AOE Heal L1" }
  ],
  143: [ // ธารน้ำแข็งนิรันดร์
    { name:"โกเลมน้ำแข็งยักษ์", class:"Tank", hp:3105, atk:342, def:310, skill:"Defense Buff L1" },
    { name:"อัศวินเกราะน้ำแข็ง", class:"Warrior", hp:2329, atk:621, def:233, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดหนาว", class:"CC", hp:1708, atk:745, def:186, skill:"Charm L1" },
    { name:"เทพีแห่งลมหนาว", class:"Healer", hp:1863, atk:435, def:186, skill:"Cleanse L1" }
  ],
  144: [ // ธารน้ำแข็งนิรันดร์
    { name:"มังกรน้ำแข็งน้อย", class:"Tank", hp:3165, atk:348, def:317, skill:"Defense Buff L1" },
    { name:"ยักษ์หิมะจอมพลัง", class:"Berserk", hp:2532, atk:696, def:222, skill:"Berserk Mode L1" },
    { name:"นักธนูพายุหิมะ", class:"Rogue", hp:1836, atk:1013, def:158, skill:"Bomb L1" },
    { name:"นักบวชแห่งขั้วโลก", class:"Healer", hp:1899, atk:443, def:190, skill:"Heal L1" }
  ],
  145: [ // ธารน้ำแข็งนิรันดร์
    { name:"ราชินีน้ำแข็งนิรันดร์", hp:6131, atk:1097, def:484, skill:"AOE Attack L2" },
    { name:"โยติสหิมะจอมพิโรธ", hp:2783, atk:742, def:278, skill:"Double Strike L2" },
    { name:"นักบวชแห่งความหนาวเหน็บ", hp:2226, atk:520, def:223, skill:"Cleanse L2" }
  ],
  146: [ // นครใต้พิภพ
    { name:"อสูรถ้ำลึก", class:"Tank", hp:3290, atk:362, def:329, skill:"AOE Defense Buff L1" },
    { name:"นักรบเงาใต้ดิน", class:"Warrior", hp:2467, atk:658, def:247, skill:"Double Strike L1" },
    { name:"จอมเวทมืดใต้พิภพ", class:"Mage", hp:1809, atk:987, def:164, skill:"Burn L1" },
    { name:"นักบวชแห่งความมืด", class:"Healer", hp:1974, atk:461, def:197, skill:"Heal L1" }
  ],
  147: [ // นครใต้พิภพ
    { name:"ดาร์กเอลฟ์พิทักษ์", class:"Tank", hp:3354, atk:369, def:335, skill:"AOE Defense Buff L1" },
    { name:"ดาร์กเอลฟ์นักฆ่า", class:"Berserk", hp:2683, atk:738, def:235, skill:"Berserk Mode L1" },
    { name:"ดาร์กเอลฟ์นักธนู", class:"Rogue", hp:1945, atk:1073, def:168, skill:"Piercing Shot L1" },
    { name:"ดาร์กเอลฟ์นักบวช", class:"Healer", hp:2012, atk:470, def:201, skill:"AOE Heal L1" }
  ],
  148: [ // นครใต้พิภพ
    { name:"แมงมุมยักษ์ราชินี", class:"Tank", hp:3419, atk:376, def:342, skill:"AOE Defense Buff L1" },
    { name:"อัศวินใยดำ", class:"Warrior", hp:2565, atk:684, def:256, skill:"Power Strike L1" },
    { name:"แม่มดใยพิษสะกด", class:"CC", hp:1881, atk:821, def:205, skill:"AOE Stun L1" },
    { name:"นักพรตใต้พิภพ", class:"Healer", hp:2052, atk:479, def:205, skill:"Cleanse L1" }
  ],
  149: [ // นครใต้พิภพ
    { name:"บีฮีมอธถ้ำลึก", class:"Tank", hp:3486, atk:383, def:349, skill:"AOE Defense Buff L1" },
    { name:"โกเลมหินใต้พิภพ", class:"Berserk", hp:2789, atk:767, def:244, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาไร้แสง", class:"Rogue", hp:2022, atk:1116, def:174, skill:"Bomb L1" },
    { name:"เทพีแห่งนครมืด", class:"Healer", hp:2092, atk:488, def:209, skill:"Heal L1" }
  ],
  150: [ // นครใต้พิภพ
    { name:"จักรพรรดินครใต้พิภพ", hp:6753, atk:1208, def:533, skill:"Berserk Mode L2" },
    { name:"แมงมุมราชินีมฤตยู", hp:3066, atk:818, def:307, skill:"Double Strike L2" },
    { name:"นักบวชแห่งรัตติกาลนิรันดร์", hp:2452, atk:573, def:245, skill:"Cleanse L2" }
  ],
  151: [ // สวนสวรรค์ร้าง
    { name:"ผู้พิทักษ์สวนศักดิ์สิทธิ์", class:"Tank", hp:3623, atk:399, def:362, skill:"Defense Buff L1" },
    { name:"อัศวินปีกขาวเสื่อมสลาย", class:"Warrior", hp:2718, atk:725, def:272, skill:"Double Strike L1" },
    { name:"นางฟ้าจอมเวทเศร้าหมอง", class:"Mage", hp:1993, atk:1087, def:181, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งสวรรค์ร้าง", class:"Healer", hp:2174, atk:507, def:217, skill:"Heal L1" }
  ],
  152: [ // สวนสวรรค์ร้าง
    { name:"ต้นไม้ยักษ์วิญญาณ", class:"Tank", hp:3694, atk:406, def:369, skill:"Defense Buff L1" },
    { name:"กริฟฟินคลั่ง", class:"Berserk", hp:2955, atk:813, def:259, skill:"Berserk Mode L1" },
    { name:"นักฆ่าปีกเงา", class:"Rogue", hp:2143, atk:1182, def:185, skill:"Piercing Shot L1" },
    { name:"เทพธิดาน้ำตา", class:"Healer", hp:2216, atk:517, def:222, skill:"AOE Heal L1" }
  ],
  153: [ // สวนสวรรค์ร้าง
    { name:"โกเลมไม้ศักดิ์สิทธิ์", class:"Tank", hp:3766, atk:414, def:377, skill:"Defense Buff L1" },
    { name:"อัศวินแสงเสื่อมทราม", class:"Warrior", hp:2825, atk:753, def:282, skill:"Power Strike L1" },
    { name:"นางฟ้าสะกดวิญญาณ", class:"CC", hp:2071, atk:904, def:226, skill:"Stun L1" },
    { name:"มหาปุโรหิตแห่งเอเดน", class:"Healer", hp:2260, atk:527, def:226, skill:"Cleanse L1" }
  ],
  154: [ // สวนสวรรค์ร้าง
    { name:"ยูนิคอร์นดำผู้แปดเปื้อน", class:"Tank", hp:3840, atk:422, def:384, skill:"Defense Buff L1" },
    { name:"เพกาซัสเพลิงพิโรธ", class:"Berserk", hp:3072, atk:845, def:269, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงจันทร์", class:"Rogue", hp:2227, atk:1229, def:192, skill:"Bomb L1" },
    { name:"อาร์คแองเจิลผู้เศร้าโศก", class:"Healer", hp:2304, atk:538, def:230, skill:"Heal L1" }
  ],
  155: [ // สวนสวรรค์ร้าง
    { name:"เทพผู้ล่มสลายแห่งเอเดน", hp:7437, atk:1331, def:587, skill:"AOE Attack L2" },
    { name:"อัศวินปีกดำไร้ศรัทธา", hp:3376, atk:900, def:338, skill:"Double Strike L2" },
    { name:"มหาปุโรหิตผู้ถูกสาป", hp:2701, atk:630, def:270, skill:"Cleanse L2" }
  ],
  156: [ // หุบผาสายฟ้า
    { name:"นกอินทรีสายฟ้า", class:"Tank", hp:3991, atk:439, def:399, skill:"AOE Defense Buff L1" },
    { name:"นักรบเมฆพายุ", class:"Warrior", hp:2993, atk:798, def:299, skill:"Double Strike L1" },
    { name:"จอมเวทสายฟ้า", class:"Mage", hp:2195, atk:1197, def:200, skill:"Burn L1" },
    { name:"นักบวชแห่งเมฆา", class:"Healer", hp:2394, atk:559, def:239, skill:"Heal L1" }
  ],
  157: [ // หุบผาสายฟ้า
    { name:"ยักษ์ฟ้าคะนอง", class:"Tank", hp:4069, atk:448, def:407, skill:"AOE Defense Buff L1" },
    { name:"ไซคลอปส์สายฟ้า", class:"Berserk", hp:3255, atk:895, def:285, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาพายุ", class:"Rogue", hp:2360, atk:1302, def:203, skill:"Piercing Shot L1" },
    { name:"หมอผีแห่งลมกรด", class:"Healer", hp:2441, atk:570, def:244, skill:"AOE Heal L1" }
  ],
  158: [ // หุบผาสายฟ้า
    { name:"โกเลมหินสายฟ้า", class:"Tank", hp:4148, atk:456, def:415, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะทองแดง", class:"Warrior", hp:3111, atk:830, def:311, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดฟ้าร้อง", class:"CC", hp:2281, atk:995, def:249, skill:"AOE Silence L1" },
    { name:"เทพีแห่งสายลม", class:"Healer", hp:2489, atk:581, def:249, skill:"Cleanse L1" }
  ],
  159: [ // หุบผาสายฟ้า
    { name:"ไทฟูนอสูรจอมพิโรธ", class:"Tank", hp:4229, atk:465, def:423, skill:"AOE Defense Buff L1" },
    { name:"การ์กอยล์สายฟ้า", class:"Berserk", hp:3383, atk:930, def:296, skill:"Berserk Mode L1" },
    { name:"นักธนูจอมพายุ", class:"Rogue", hp:2453, atk:1353, def:211, skill:"Bomb L1" },
    { name:"นักบวชแห่งเมฆพิโรธ", class:"Healer", hp:2537, atk:592, def:254, skill:"Heal L1" }
  ],
  160: [ // หุบผาสายฟ้า
    { name:"จ้าวหุบผาสายฟ้า", hp:8191, atk:1466, def:647, skill:"Berserk Mode L2" },
    { name:"ไซคลอปส์อสุนีบาต", hp:3718, atk:991, def:371, skill:"Double Strike L2" },
    { name:"นักบวชแห่งพายุนิรันดร์", hp:2975, atk:695, def:298, skill:"Cleanse L2" }
  ],
  161: [ // ป่าต้องคำสาป
    { name:"หมีเงาต้องสาป", class:"Tank", hp:4395, atk:483, def:440, skill:"Defense Buff L1" },
    { name:"หมาป่าวิญญาณ", class:"Warrior", hp:3296, atk:879, def:330, skill:"Double Strike L1" },
    { name:"แม่มดป่าต้องสาป", class:"Mage", hp:2417, atk:1319, def:220, skill:"AOE Attack L1" },
    { name:"นักพรตต้นไม้ผุ", class:"Healer", hp:2637, atk:615, def:264, skill:"Heal L1" }
  ],
  162: [ // ป่าต้องคำสาป
    { name:"เอนท์ดำผู้เสื่อมทราม", class:"Tank", hp:4481, atk:493, def:448, skill:"Defense Buff L1" },
    { name:"หมาป่าเลือดสาป", class:"Berserk", hp:3585, atk:986, def:314, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาในป่าลึก", class:"Rogue", hp:2599, atk:1434, def:224, skill:"Piercing Shot L1" },
    { name:"หมอผีรากไม้ดำ", class:"Healer", hp:2689, atk:627, def:269, skill:"AOE Heal L1" }
  ],
  163: [ // ป่าต้องคำสาป
    { name:"โกเลมไม้ผุพัง", class:"Tank", hp:4568, atk:503, def:457, skill:"Defense Buff L1" },
    { name:"อัศวินไม้เลื้อยรัดกาย", class:"Warrior", hp:3426, atk:914, def:343, skill:"Power Strike L1" },
    { name:"แม่มดสะกดวิญญาณป่า", class:"CC", hp:2513, atk:1096, def:274, skill:"Silence L1" },
    { name:"นักบวชป่าศักดิ์สิทธิ์เสื่อมสลาย", class:"Healer", hp:2741, atk:640, def:274, skill:"Cleanse L1" }
  ],
  164: [ // ป่าต้องคำสาป
    { name:"ทรีเอนท์เก่าแก่ผู้พิโรธ", class:"Tank", hp:4657, atk:512, def:466, skill:"Defense Buff L1" },
    { name:"หมีเงายักษ์", class:"Berserk", hp:3726, atk:1025, def:326, skill:"Berserk Mode L1" },
    { name:"นักธนูใบไม้พิษ", class:"Rogue", hp:2701, atk:1490, def:233, skill:"Bomb L1" },
    { name:"เทพีแห่งป่าร้าง", class:"Healer", hp:2794, atk:652, def:279, skill:"Heal L1" }
  ],
  165: [ // ป่าต้องคำสาป
    { name:"เจ้าป่าต้องคำสาป", hp:9021, atk:1614, def:712, skill:"AOE Attack L2" },
    { name:"หมาป่าเงาจอมพิโรธ", hp:4095, atk:1093, def:409, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งรากดำ", hp:3276, atk:765, def:328, skill:"Cleanse L2" }
  ],
  166: [ // วิหารจันทร์เสี้ยว
    { name:"องครักษ์วิหารจันทร์", class:"Tank", hp:4841, atk:532, def:484, skill:"AOE Defense Buff L1" },
    { name:"นักรบแสงจันทร์", class:"Warrior", hp:3631, atk:968, def:363, skill:"Double Strike L1" },
    { name:"จอมเวทราตรี", class:"Mage", hp:2662, atk:1452, def:242, skill:"Burn L1" },
    { name:"นักบวชแห่งจันทร์เสี้ยว", class:"Healer", hp:2905, atk:678, def:290, skill:"Heal L1" }
  ],
  167: [ // วิหารจันทร์เสี้ยว
    { name:"รูปปั้นหินเฝ้าวิหาร", class:"Tank", hp:4935, atk:543, def:494, skill:"AOE Defense Buff L1" },
    { name:"นักฆ่าเงาจันทรา", class:"Berserk", hp:3948, atk:1086, def:345, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงเงิน", class:"Rogue", hp:2862, atk:1579, def:247, skill:"Piercing Shot L1" },
    { name:"หมอผีแห่งราตรีกาล", class:"Healer", hp:2961, atk:691, def:296, skill:"AOE Heal L1" }
  ],
  168: [ // วิหารจันทร์เสี้ยว
    { name:"โกเลมหินวิหารโบราณ", class:"Tank", hp:5031, atk:553, def:503, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะเงิน", class:"Warrior", hp:3774, atk:1006, def:377, skill:"Power Strike L1" },
    { name:"แม่มดจันทร์สะกดจิต", class:"CC", hp:2767, atk:1208, def:302, skill:"Charm L1" },
    { name:"มหาปุโรหิตแห่งจันทรา", class:"Healer", hp:3019, atk:704, def:302, skill:"Cleanse L1" }
  ],
  169: [ // วิหารจันทร์เสี้ยว
    { name:"หมาป่าจันทร์เพ็ญ", class:"Tank", hp:5130, atk:564, def:513, skill:"AOE Defense Buff L1" },
    { name:"อัศวินดำแห่งราตรีกาล", class:"Berserk", hp:4104, atk:1129, def:359, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาไร้เสียง", class:"Rogue", hp:2975, atk:1641, def:256, skill:"Bomb L1" },
    { name:"เทพีแห่งแสงจันทร์", class:"Healer", hp:3078, atk:718, def:308, skill:"Heal L1" }
  ],
  170: [ // วิหารจันทร์เสี้ยว
    { name:"มหาปุโรหิตแห่งจันทร์เสี้ยว", hp:9937, atk:1778, def:784, skill:"Berserk Mode L2" },
    { name:"องครักษ์เงาจันทรา", hp:4510, atk:1203, def:451, skill:"Double Strike L2" },
    { name:"นักฆ่าเงาราชินีราตรี", hp:3609, atk:842, def:361, skill:"Cleanse L2" }
  ],
  171: [ // เกาะร้างกลางทะเลเลือด
    { name:"โจรสลัดผีดิบ", class:"Tank", hp:5332, atk:586, def:533, skill:"Defense Buff L1" },
    { name:"นักรบทะเลเลือด", class:"Warrior", hp:3999, atk:1066, def:400, skill:"Double Strike L1" },
    { name:"จอมเวทคลื่นเลือด", class:"Mage", hp:2932, atk:1599, def:267, skill:"AOE Attack L1" },
    { name:"หมอเรือผีสิง", class:"Healer", hp:3199, atk:746, def:320, skill:"Heal L1" }
  ],
  172: [ // เกาะร้างกลางทะเลเลือด
    { name:"ครีเจอร์ทะเลลึกยักษ์", class:"Tank", hp:5436, atk:598, def:544, skill:"Defense Buff L1" },
    { name:"ฉลามปีศาจ", class:"Berserk", hp:4348, atk:1196, def:380, skill:"Berserk Mode L1" },
    { name:"นักฆ่าใต้คลื่นเลือด", class:"Rogue", hp:3153, atk:1739, def:272, skill:"Piercing Shot L1" },
    { name:"นักบวชเรืออับปาง", class:"Healer", hp:3261, atk:761, def:326, skill:"AOE Heal L1" }
  ],
  173: [ // เกาะร้างกลางทะเลเลือด
    { name:"โกเลมปะการังดำ", class:"Tank", hp:5542, atk:610, def:554, skill:"Defense Buff L1" },
    { name:"อัศวินเรือผี", class:"Warrior", hp:4156, atk:1108, def:416, skill:"Power Strike L1" },
    { name:"เงือกสะกดจิตมรณะ", class:"CC", hp:3048, atk:1330, def:332, skill:"AOE Stun L1" },
    { name:"เทพีแห่งเกาะร้าง", class:"Healer", hp:3325, atk:776, def:332, skill:"Cleanse L1" }
  ],
  174: [ // เกาะร้างกลางทะเลเลือด
    { name:"คราเคนน้อยแห่งทะเลเลือด", class:"Tank", hp:5650, atk:621, def:565, skill:"Defense Buff L1" },
    { name:"กัปตันผีดิบไร้หัว", class:"Berserk", hp:4520, atk:1243, def:395, skill:"Berserk Mode L1" },
    { name:"นักฆ่าใต้เงาคลื่น", class:"Rogue", hp:3277, atk:1808, def:282, skill:"Bomb L1" },
    { name:"นักบวชแห่งวิญญาณเรืออับปาง", class:"Healer", hp:3390, atk:791, def:339, skill:"Heal L1" }
  ],
  175: [ // เกาะร้างกลางทะเลเลือด
    { name:"กัปตันผีแห่งทะเลเลือด", hp:10944, atk:1958, def:864, skill:"AOE Attack L2" },
    { name:"คราเคนพิฆาต", hp:4968, atk:1325, def:497, skill:"Double Strike L2" },
    { name:"เงือกราชินีมรณะ", hp:3974, atk:927, def:398, skill:"Cleanse L2" }
  ],
  176: [ // ดงเห็ดพิษ
    { name:"ก้อนเห็ดยักษ์พิษ", class:"Tank", hp:5872, atk:646, def:587, skill:"AOE Defense Buff L1" },
    { name:"สปอร์แมงป่องพิษ", class:"Warrior", hp:4404, atk:1174, def:440, skill:"Double Strike L1" },
    { name:"แม่มดเชื้อรา", class:"Mage", hp:3230, atk:1762, def:294, skill:"Burn L1" },
    { name:"หมอยาเชื้อราศักดิ์สิทธิ์", class:"Healer", hp:3523, atk:822, def:352, skill:"Heal L1" }
  ],
  177: [ // ดงเห็ดพิษ
    { name:"ยักษ์เห็ดเรืองแสง", class:"Tank", hp:5987, atk:659, def:599, skill:"AOE Defense Buff L1" },
    { name:"แมลงยักษ์พิษร้าย", class:"Berserk", hp:4789, atk:1317, def:419, skill:"Berserk Mode L1" },
    { name:"นักฆ่าในหมอกสปอร์", class:"Rogue", hp:3472, atk:1916, def:299, skill:"Piercing Shot L1" },
    { name:"นักพรตดอกเห็ดบุญ", class:"Healer", hp:3592, atk:838, def:359, skill:"AOE Heal L1" }
  ],
  178: [ // ดงเห็ดพิษ
    { name:"โกเลมเชื้อราดำ", class:"Tank", hp:6103, atk:671, def:610, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะเห็ดพิษ", class:"Warrior", hp:4578, atk:1221, def:458, skill:"Power Strike L1" },
    { name:"แม่มดสะกดสปอร์มึนเมา", class:"CC", hp:3357, atk:1465, def:366, skill:"Stun L1" },
    { name:"เทพีแห่งเห็ดวิเศษ", class:"Healer", hp:3662, atk:854, def:366, skill:"Cleanse L1" }
  ],
  179: [ // ดงเห็ดพิษ
    { name:"ไฮดร้าเชื้อราพิษ", class:"Tank", hp:6222, atk:684, def:622, skill:"AOE Defense Buff L1" },
    { name:"อสูรสปอร์ระเบิด", class:"Berserk", hp:4978, atk:1369, def:436, skill:"Berserk Mode L1" },
    { name:"นักธนูลูกดอกพิษ", class:"Rogue", hp:3609, atk:1991, def:311, skill:"Bomb L1" },
    { name:"นักบวชแห่งป่าเห็ดต้องห้าม", class:"Healer", hp:3733, atk:871, def:373, skill:"Heal L1" }
  ],
  180: [ // ดงเห็ดพิษ
    { name:"เจ้าป่าเห็ดพิษมรณะ", hp:12054, atk:2157, def:952, skill:"Berserk Mode L2" },
    { name:"ไฮดร้าสปอร์พิฆาต", hp:5472, atk:1459, def:547, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งเชื้อราดำ", hp:4377, atk:1021, def:438, skill:"Cleanse L2" }
  ],
  181: [ // ป้อมปราการเหล็กกล้า
    { name:"ทหารเหล็กยาม", class:"Tank", hp:6467, atk:711, def:647, skill:"Defense Buff L1" },
    { name:"นักรบเกราะเหล็ก", class:"Warrior", hp:4851, atk:1293, def:485, skill:"Double Strike L1" },
    { name:"วิศวกรเวทมนตร์", class:"Mage", hp:3557, atk:1940, def:323, skill:"AOE Attack L1" },
    { name:"นักบวชสนามรบ", class:"Healer", hp:3880, atk:905, def:388, skill:"Heal L1" }
  ],
  182: [ // ป้อมปราการเหล็กกล้า
    { name:"โกเลมเหล็กกล้า", class:"Tank", hp:6594, atk:725, def:659, skill:"Defense Buff L1" },
    { name:"อัศวินเครื่องจักรบ้าคลั่ง", class:"Berserk", hp:5275, atk:1451, def:462, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาป้อมปราการ", class:"Rogue", hp:3824, atk:2110, def:330, skill:"Piercing Shot L1" },
    { name:"หมอสนามเหล็กกล้า", class:"Healer", hp:3956, atk:923, def:396, skill:"AOE Heal L1" }
  ],
  183: [ // ป้อมปราการเหล็กกล้า
    { name:"ไททันเหล็กยักษ์", class:"Tank", hp:6722, atk:739, def:672, skill:"Defense Buff L1" },
    { name:"อัศวินเกราะเพชร", class:"Warrior", hp:5042, atk:1344, def:504, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดโลหะ", class:"CC", hp:3697, atk:1613, def:403, skill:"AOE Silence L1" },
    { name:"เทพีแห่งป้อมปราการ", class:"Healer", hp:4033, atk:941, def:403, skill:"Cleanse L1" }
  ],
  184: [ // ป้อมปราการเหล็กกล้า
    { name:"เมคาดราก้อนต้นแบบ", class:"Tank", hp:6853, atk:754, def:685, skill:"Defense Buff L1" },
    { name:"นายพลเหล็กกล้าไร้ปราณี", class:"Berserk", hp:5483, atk:1508, def:480, skill:"Berserk Mode L1" },
    { name:"นักธนูกระสุนเหล็ก", class:"Rogue", hp:3975, atk:2193, def:343, skill:"Bomb L1" },
    { name:"นักบวชผู้พิทักษ์ป้อม", class:"Healer", hp:4112, atk:959, def:411, skill:"Heal L1" }
  ],
  185: [ // ป้อมปราการเหล็กกล้า
    { name:"จอมทัพเหล็กกล้าไร้ปราณี", hp:13275, atk:2376, def:1048, skill:"AOE Attack L2" },
    { name:"เมคาดราก้อนพิฆาต", hp:6026, atk:1607, def:603, skill:"Double Strike L2" },
    { name:"นักบวชแห่งป้อมปราการนิรันดร์", hp:4821, atk:1125, def:482, skill:"Cleanse L2" }
  ],
  186: [ // ทุ่งดอกไม้ผีสิง
    { name:"ต้นไม้ผีสิงพิทักษ์ทุ่ง", class:"Tank", hp:7123, atk:784, def:712, skill:"AOE Defense Buff L1" },
    { name:"วิญญาณดอกไม้พิโรธ", class:"Warrior", hp:5342, atk:1425, def:534, skill:"Double Strike L1" },
    { name:"แม่มดดอกไม้ราตรี", class:"Mage", hp:3918, atk:2137, def:356, skill:"Burn L1" },
    { name:"นักบวชแห่งกลีบดอกโรยรา", class:"Healer", hp:4274, atk:997, def:427, skill:"Heal L1" }
  ],
  187: [ // ทุ่งดอกไม้ผีสิง
    { name:"หุ่นฟางผีสิง", class:"Tank", hp:7262, atk:799, def:726, skill:"AOE Defense Buff L1" },
    { name:"ผีเสื้อยักษ์พิษ", class:"Berserk", hp:5810, atk:1598, def:508, skill:"Berserk Mode L1" },
    { name:"นักฆ่าในทุ่งหมอก", class:"Rogue", hp:4212, atk:2324, def:363, skill:"Piercing Shot L1" },
    { name:"นางไม้แห่งดอกไม้ร่วง", class:"Healer", hp:4357, atk:1017, def:436, skill:"AOE Heal L1" }
  ],
  188: [ // ทุ่งดอกไม้ผีสิง
    { name:"โกเลมดอกไม้ต้องสาป", class:"Tank", hp:7404, atk:814, def:740, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเกราะกลีบกุหลาบดำ", class:"Warrior", hp:5553, atk:1481, def:555, skill:"Power Strike L1" },
    { name:"แม่มดสะกดกลิ่นหอมมรณะ", class:"CC", hp:4072, atk:1777, def:444, skill:"Silence L1" },
    { name:"เทพีแห่งทุ่งดอกไม้ร้าง", class:"Healer", hp:4442, atk:1037, def:444, skill:"Cleanse L1" }
  ],
  189: [ // ทุ่งดอกไม้ผีสิง
    { name:"ไฮดร้าเถาวัลย์ผีสิง", class:"Tank", hp:7548, atk:830, def:755, skill:"AOE Defense Buff L1" },
    { name:"อสูรดอกไม้เลือด", class:"Berserk", hp:6038, atk:1661, def:528, skill:"Berserk Mode L1" },
    { name:"นักธนูหนามพิษ", class:"Rogue", hp:4378, atk:2415, def:377, skill:"Bomb L1" },
    { name:"นักบวชแห่งฤดูใบไม้ร่วง", class:"Healer", hp:4529, atk:1057, def:453, skill:"Heal L1" }
  ],
  190: [ // ทุ่งดอกไม้ผีสิง
    { name:"เจ้าแห่งทุ่งดอกไม้ผีสิง", hp:14621, atk:2616, def:1154, skill:"Berserk Mode L2" },
    { name:"วิญญาณกุหลาบดำมรณะ", hp:6637, atk:1770, def:664, skill:"Double Strike L2" },
    { name:"แม่มดใหญ่แห่งกลิ่นหอมมรณะ", hp:5310, atk:1239, def:531, skill:"Cleanse L2" }
  ],
  191: [ // หุบเขาสุริยะ
    { name:"องครักษ์สุริยะ", class:"Tank", hp:7845, atk:863, def:785, skill:"Defense Buff L1" },
    { name:"นักรบเปลวสุริยัน", class:"Warrior", hp:5884, atk:1569, def:588, skill:"Double Strike L1" },
    { name:"จอมเวทแสงอาทิตย์", class:"Mage", hp:4315, atk:2354, def:392, skill:"AOE Attack L1" },
    { name:"นักบวชแห่งรุ่งอรุณ", class:"Healer", hp:4707, atk:1098, def:471, skill:"Heal L1" }
  ],
  192: [ // หุบเขาสุริยะ
    { name:"ฟีนิกซ์ทองคำน้อย", class:"Tank", hp:7998, atk:880, def:800, skill:"Defense Buff L1" },
    { name:"สิงโตเพลิงสุริยะ", class:"Berserk", hp:6399, atk:1760, def:560, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาแดด", class:"Rogue", hp:4639, atk:2559, def:400, skill:"Piercing Shot L1" },
    { name:"มหาปุโรหิตแห่งสุริยะ", class:"Healer", hp:4799, atk:1120, def:480, skill:"AOE Heal L1" }
  ],
  193: [ // หุบเขาสุริยะ
    { name:"โกเลมทองคำศักดิ์สิทธิ์", class:"Tank", hp:8154, atk:897, def:815, skill:"Defense Buff L1" },
    { name:"อัศวินเกราะสุริยะ", class:"Warrior", hp:6116, atk:1631, def:612, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดแสงจ้า", class:"CC", hp:4485, atk:1957, def:489, skill:"Charm L1" },
    { name:"เทพีแห่งอรุณรุ่ง", class:"Healer", hp:4892, atk:1142, def:489, skill:"Cleanse L1" }
  ],
  194: [ // หุบเขาสุริยะ
    { name:"ไทแทนสุริยะยักษ์", class:"Tank", hp:8313, atk:914, def:831, skill:"Defense Buff L1" },
    { name:"ดราก้อนทองคำผู้พิทักษ์", class:"Berserk", hp:6651, atk:1829, def:582, skill:"Berserk Mode L1" },
    { name:"นักธนูแสงทอง", class:"Rogue", hp:4822, atk:2660, def:416, skill:"Bomb L1" },
    { name:"นักบวชสูงสุดแห่งสุริยัน", class:"Healer", hp:4988, atk:1164, def:499, skill:"Heal L1" }
  ],
  195: [ // หุบเขาสุริยะ
    { name:"ราชันสุริยะทองคำ", hp:16103, atk:2882, def:1271, skill:"AOE Attack L2" },
    { name:"ฟีนิกซ์เพลิงสุริยัน", hp:7309, atk:1949, def:731, skill:"Double Strike L2" },
    { name:"มหาปุโรหิตแห่งดวงอาทิตย์", hp:5848, atk:1365, def:585, skill:"Cleanse L2" }
  ],
  196: [ // บัลลังก์เทพจุติ
    { name:"องครักษ์เทพจุติ", class:"Tank", hp:8641, atk:950, def:864, skill:"AOE Defense Buff L1" },
    { name:"นักรบเทพผู้ล่มสลาย", class:"Warrior", hp:6480, atk:1728, def:648, skill:"Double Strike L1" },
    { name:"จอมเวทแห่งบัลลังก์", class:"Mage", hp:4752, atk:2592, def:432, skill:"Burn L1" },
    { name:"นักบวชสูงสุดแห่งเทวสถาน", class:"Healer", hp:5184, atk:1210, def:518, skill:"Heal L1" }
  ],
  197: [ // บัลลังก์เทพจุติ
    { name:"ไททันจุติพิทักษ์บัลลังก์", class:"Tank", hp:8809, atk:969, def:881, skill:"AOE Defense Buff L1" },
    { name:"อัศวินเทพผู้พิโรธ", class:"Berserk", hp:7047, atk:1938, def:617, skill:"Berserk Mode L1" },
    { name:"นักฆ่าเงาแห่งเทวสถาน", class:"Rogue", hp:5109, atk:2819, def:440, skill:"Piercing Shot L1" },
    { name:"เทพีผู้เฝ้าบัลลังก์", class:"Healer", hp:5285, atk:1233, def:529, skill:"AOE Heal L1" }
  ],
  198: [ // บัลลังก์เทพจุติ
    { name:"โกเลมเทพศักดิ์สิทธิ์", class:"Tank", hp:8981, atk:988, def:898, skill:"AOE Defense Buff L1" },
    { name:"อาร์คแองเจิลผู้ตกสวรรค์", class:"Warrior", hp:6736, atk:1796, def:674, skill:"Power Strike L1" },
    { name:"จอมเวทสะกดมิติ", class:"CC", hp:4939, atk:2155, def:539, skill:"AOE Stun L1" },
    { name:"มหาปุโรหิตสูงสุดแห่งจุติ", class:"Healer", hp:5388, atk:1257, def:539, skill:"Cleanse L1" }
  ],
  199: [ // บัลลังก์เทพจุติ
    { name:"ไทแทนจุติจอมพลัง", class:"Tank", hp:9156, atk:1007, def:916, skill:"AOE Defense Buff L1" },
    { name:"ดราก้อนเทพเจ้าจอมพิโรธ", class:"Berserk", hp:7325, atk:2014, def:641, skill:"Berserk Mode L1" },
    { name:"นักธนูแห่งวันสิ้นโลก", class:"Rogue", hp:5310, atk:2930, def:458, skill:"Bomb L1" },
    { name:"เทพธิดาผู้เฝ้าประตูมิติ", class:"Healer", hp:5494, atk:1282, def:549, skill:"Heal L1" }
  ],
  200: [ // บัลลังก์เทพจุติ
    { name:"เทพจุติผู้ล่มสลาย", hp:17735, atk:3174, def:1400, skill:"Berserk Mode L2" },
    { name:"อัครเทวดาผู้ทรยศ", hp:8051, atk:2147, def:805, skill:"Double Strike L2" },
    { name:"มหาปุโรหิตแห่งวาระสุดท้าย", hp:6441, atk:1503, def:644, skill:"Cleanse L2" }
  ],
  // ============ บิ๊กสเตจ 3 — โหด (ด่าน 201-300) ============
  201: [ // ทุ่งสไลม์นิรันดร์
    { name:"สไลม์หินยักษ์", class:"Tank", hp:9516, atk:1047, def:952, skill:"Defense Buff L2" },
    { name:"สไลม์เพลิงกริช", class:"Warrior", hp:7137, atk:1903, def:714, skill:"Double Strike L2" },
    { name:"สไลม์พิษเขี้ยว", class:"Mage", hp:5234, atk:2855, def:476, skill:"AOE Attack L2" },
    { name:"สไลม์น้ำอมฤต", class:"Healer", hp:5710, atk:1332, def:571, skill:"Heal L2" }
  ],
  202: [ // ทุ่งสไลม์นิรันดร์
    { name:"อสูรเมือกดำ", class:"Tank", hp:9702, atk:1067, def:970, skill:"Defense Buff L2" },
    { name:"อสูรเมือกกรด", class:"Berserk", hp:7762, atk:2134, def:679, skill:"Berserk Mode L2" },
    { name:"อสูรเมือกพิษร้าย", class:"Rogue", hp:5627, atk:3105, def:485, skill:"Piercing Shot L2" },
    { name:"อสูรเมือกชโลมยา", class:"Healer", hp:5821, atk:1358, def:582, skill:"AOE Heal L2" }
  ],
  203: [ // ทุ่งสไลม์นิรันดร์
    { name:"วุ้นราชายักษ์", class:"Tank", hp:9891, atk:1088, def:989, skill:"Defense Buff L2" },
    { name:"วุ้นเดือดพลุ่ง", class:"Warrior", hp:7418, atk:1978, def:742, skill:"Power Strike L2" },
    { name:"วุ้นจอมพิษ", class:"CC", hp:5440, atk:2374, def:593, skill:"Stun L2" },
    { name:"วุ้นชโลมบุญ", class:"Healer", hp:5935, atk:1385, def:593, skill:"Cleanse L2" }
  ],
  204: [ // ทุ่งสไลม์นิรันดร์
    { name:"ปีศาจเมือกอสูร", class:"Tank", hp:10084, atk:1109, def:1008, skill:"Defense Buff L2" },
    { name:"ปีศาจเมือกเหล็ก", class:"Berserk", hp:8067, atk:2219, def:706, skill:"Berserk Mode L2" },
    { name:"ปีศาจเมือกสะกด", class:"Rogue", hp:5849, atk:3227, def:504, skill:"Bomb L2" },
    { name:"ปีศาจเมือกฟื้นคืน", class:"Healer", hp:6050, atk:1412, def:605, skill:"Heal L2" }
  ],
  205: [ // ทุ่งสไลม์นิรันดร์
    { name:"ราชันสไลม์มหึมา", hp:19534, atk:3495, def:1542, skill:"AOE Attack L3" },
    { name:"อัศวินสไลม์ผลึก", hp:8868, atk:2364, def:887, skill:"Double Strike L3" },
    { name:"นักบวชสไลม์เมือก", hp:7093, atk:1655, def:710, skill:"Cleanse L3" }
  ],
  206: [ // ป่าก็อบลิน
    { name:"ก็อบลินโล่หนาม", class:"Tank", hp:10481, atk:1153, def:1048, skill:"AOE Defense Buff L2" },
    { name:"ก็อบลินคลั่งเลือด", class:"Warrior", hp:7861, atk:2096, def:786, skill:"Double Strike L2" },
    { name:"ก็อบลินธนูพิษ", class:"Mage", hp:5765, atk:3144, def:524, skill:"Burn L2" },
    { name:"หมอผีก็อบลิน", class:"Healer", hp:6289, atk:1467, def:629, skill:"Heal L2" }
  ],
  207: [ // ป่าก็อบลิน
    { name:"ก็อบลินขี่หมาป่า", class:"Tank", hp:10686, atk:1175, def:1069, skill:"AOE Defense Buff L2" },
    { name:"ก็อบลินขวานคู่", class:"Berserk", hp:8548, atk:2351, def:748, skill:"Berserk Mode L2" },
    { name:"ก็อบลินจอมเวทดำ", class:"Rogue", hp:6198, atk:3419, def:534, skill:"Piercing Shot L2" },
    { name:"ก็อบลินหมองู", class:"Healer", hp:6411, atk:1496, def:641, skill:"AOE Heal L2" }
  ],
  208: [ // ป่าก็อบลิน
    { name:"โทรลป่าพิทักษ์", class:"Tank", hp:10894, atk:1198, def:1089, skill:"AOE Defense Buff L2" },
    { name:"โทรลป่าคลั่ง", class:"Warrior", hp:8170, atk:2179, def:817, skill:"Power Strike L2" },
    { name:"โทรลนักล่าเงา", class:"CC", hp:5992, atk:2615, def:654, skill:"AOE Silence L2" },
    { name:"โทรลหมอผีราก", class:"Healer", hp:6536, atk:1525, def:654, skill:"Cleanse L2" }
  ],
  209: [ // ป่าก็อบลิน
    { name:"ยักษ์ป่าพิทักษ์", class:"Tank", hp:11106, atk:1222, def:1111, skill:"AOE Defense Buff L2" },
    { name:"ยักษ์ป่ากระบองเหล็ก", class:"Berserk", hp:8885, atk:2443, def:777, skill:"Berserk Mode L2" },
    { name:"ยักษ์ป่าจอมมนตร์", class:"Rogue", hp:6442, atk:3554, def:555, skill:"Bomb L2" },
    { name:"ยักษ์ป่านักบวชไม้", class:"Healer", hp:6664, atk:1555, def:666, skill:"Heal L2" }
  ],
  210: [ // ป่าก็อบลิน
    { name:"จอมทัพก็อบลินเขี้ยวเหล็ก", hp:21514, atk:3850, def:1698, skill:"Berserk Mode L3" },
    { name:"แม่ทัพก็อบลินขวานคู่", hp:9766, atk:2605, def:976, skill:"Double Strike L3" },
    { name:"หมองูก็อบลินมนตร์ดำ", hp:7813, atk:1823, def:781, skill:"Cleanse L3" }
  ],
  211: [ // ที่ราบออร์ค
    { name:"ออร์คผู้พิทักษ์", class:"Tank", hp:11544, atk:1270, def:1154, skill:"Defense Buff L2" },
    { name:"ออร์คนักรบเถื่อน", class:"Warrior", hp:8658, atk:2309, def:866, skill:"Double Strike L2" },
    { name:"ออร์คนักธนูเขี้ยวแหลม", class:"Mage", hp:6349, atk:3463, def:577, skill:"AOE Attack L2" },
    { name:"หมอผีออร์คกระดูก", class:"Healer", hp:6926, atk:1616, def:693, skill:"Heal L2" }
  ],
  212: [ // ที่ราบออร์ค
    { name:"ออร์คขี่หมูป่า", class:"Tank", hp:11769, atk:1295, def:1177, skill:"Defense Buff L2" },
    { name:"ออร์คเพชฌฆาต", class:"Berserk", hp:9415, atk:2589, def:824, skill:"Berserk Mode L2" },
    { name:"ออร์คจอมเวทเลือด", class:"Rogue", hp:6826, atk:3766, def:588, skill:"Piercing Shot L2" },
    { name:"ออร์คนักบวชกระดูก", class:"Healer", hp:7061, atk:1648, def:706, skill:"AOE Heal L2" }
  ],
  213: [ // ที่ราบออร์ค
    { name:"ยักษ์ใหญ่หัวหน้าเผ่า", class:"Tank", hp:11998, atk:1320, def:1200, skill:"Defense Buff L2" },
    { name:"ยักษ์ใหญ่ขวานคู่", class:"Warrior", hp:8999, atk:2400, def:900, skill:"Power Strike L2" },
    { name:"ยักษ์ใหญ่นักซุ่ม", class:"CC", hp:6599, atk:2880, def:720, skill:"Silence L2" },
    { name:"ยักษ์ใหญ่หมอผี", class:"Healer", hp:7199, atk:1680, def:720, skill:"Cleanse L2" }
  ],
  214: [ // ที่ราบออร์ค
    { name:"ไซคลอปส์พิทักษ์ทุ่ง", class:"Tank", hp:12232, atk:1346, def:1223, skill:"Defense Buff L2" },
    { name:"ไซคลอปส์กระทืบดิน", class:"Berserk", hp:9786, atk:2691, def:856, skill:"Berserk Mode L2" },
    { name:"ไซคลอปส์สะกดจิต", class:"Rogue", hp:7095, atk:3914, def:612, skill:"Bomb L2" },
    { name:"ไซคลอปส์นักบวชหิน", class:"Healer", hp:7339, atk:1713, def:734, skill:"Heal L2" }
  ],
  215: [ // ที่ราบออร์ค
    { name:"หัวหน้าเผ่าออร์คทมิฬ", hp:23695, atk:4240, def:1871, skill:"AOE Attack L3" },
    { name:"ยอดนักรบออร์คสายเลือด", hp:10756, atk:2868, def:1075, skill:"Double Strike L3" },
    { name:"จอมเวทออร์คหินภูเขาไฟ", hp:8605, atk:2008, def:860, skill:"Cleanse L3" }
  ],
  216: [ // ปราสาทเงามืด
    { name:"อัศวินเงามืด", class:"Tank", hp:12714, atk:1399, def:1271, skill:"AOE Defense Buff L2" },
    { name:"ไวเวิร์นทมิฬ", class:"Warrior", hp:9536, atk:2543, def:954, skill:"Double Strike L2" },
    { name:"เนโครแมนเซอร์วิญญาณเก่า", class:"Mage", hp:6993, atk:3814, def:636, skill:"Burn L2" },
    { name:"นักธนูรัตติกาล", class:"Healer", hp:7628, atk:1780, def:763, skill:"Heal L2" }
  ],
  217: [ // ปราสาทเงามืด
    { name:"อัศวินกระดูกผุ", class:"Tank", hp:12962, atk:1426, def:1296, skill:"AOE Defense Buff L2" },
    { name:"การ์กอยล์หินดำ", class:"Berserk", hp:10370, atk:2852, def:907, skill:"Berserk Mode L2" },
    { name:"จอมเวทเงามืด", class:"Rogue", hp:7518, atk:4148, def:648, skill:"Piercing Shot L2" },
    { name:"นักบวชเงามืด", class:"Healer", hp:7777, atk:1815, def:778, skill:"AOE Heal L2" }
  ],
  218: [ // ปราสาทเงามืด
    { name:"อัศวินวิญญาณพิทักษ์", class:"Tank", hp:13215, atk:1454, def:1321, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเลือดสาป", class:"Warrior", hp:9911, atk:2643, def:991, skill:"Power Strike L2" },
    { name:"นักฆ่าเงาราตรี", class:"CC", hp:7268, atk:3172, def:793, skill:"Charm L2" },
    { name:"นักบวชคำสาป", class:"Healer", hp:7929, atk:1850, def:793, skill:"Cleanse L2" }
  ],
  219: [ // ปราสาทเงามืด
    { name:"โกเลมกระดูกยักษ์", class:"Tank", hp:13472, atk:1482, def:1347, skill:"AOE Defense Buff L2" },
    { name:"อัศวินดำผู้ทรยศ", class:"Berserk", hp:10778, atk:2964, def:943, skill:"Berserk Mode L2" },
    { name:"จอมเวทมนตร์มืด", class:"Rogue", hp:7814, atk:4311, def:674, skill:"Bomb L2" },
    { name:"ปีศาจนักบวชดำ", class:"Healer", hp:8083, atk:1886, def:808, skill:"Heal L2" }
  ],
  220: [ // ปราสาทเงามืด
    { name:"ราชันมังกรแดง", hp:26097, atk:4670, def:2060, skill:"Berserk Mode L3" },
    { name:"อัศวินหวาดผวา", hp:11846, atk:3159, def:1185, skill:"Double Strike L3" },
    { name:"ศาสดาแห่งรัตติกาล", hp:9477, atk:2211, def:948, skill:"Cleanse L3" }
  ],
  221: [ // เขาวงกตคริสตัล
    { name:"โกเลมคริสตัล", class:"Tank", hp:14003, atk:1540, def:1400, skill:"Defense Buff L2" },
    { name:"อัศวินแก้วเจียระไน", class:"Warrior", hp:10502, atk:2801, def:1050, skill:"Double Strike L2" },
    { name:"นักเวทคริสตัลเรืองแสง", class:"Mage", hp:7702, atk:4201, def:700, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งแสง", class:"Healer", hp:8402, atk:1960, def:840, skill:"Heal L2" }
  ],
  222: [ // เขาวงกตคริสตัล
    { name:"ยักษ์หินอัญมณี", class:"Tank", hp:14276, atk:1570, def:1428, skill:"Defense Buff L2" },
    { name:"อัศวินปริซึม", class:"Berserk", hp:11421, atk:3141, def:999, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาคริสตัล", class:"Rogue", hp:8280, atk:4568, def:714, skill:"Piercing Shot L2" },
    { name:"นักพรตอัญมณี", class:"Healer", hp:8566, atk:1999, def:857, skill:"AOE Heal L2" }
  ],
  223: [ // เขาวงกตคริสตัล
    { name:"การ์เดี้ยนคริสตัลยักษ์", class:"Tank", hp:14554, atk:1601, def:1455, skill:"Defense Buff L2" },
    { name:"อัศวินสายฟ้าคริสตัล", class:"Warrior", hp:10916, atk:2911, def:1092, skill:"Power Strike L2" },
    { name:"จอมเวทมนตร์สะกดแสง", class:"CC", hp:8005, atk:3493, def:873, skill:"AOE Stun L2" },
    { name:"นักบวชแสงบริสุทธิ์", class:"Healer", hp:8733, atk:2038, def:873, skill:"Cleanse L2" }
  ],
  224: [ // เขาวงกตคริสตัล
    { name:"ไททันคริสตัลศักดิ์สิทธิ์", class:"Tank", hp:14838, atk:1632, def:1484, skill:"Defense Buff L2" },
    { name:"ดราก้อนคริสตัลจิ๋ว", class:"Berserk", hp:11871, atk:3264, def:1039, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงตัดเพชร", class:"Rogue", hp:8606, atk:4748, def:742, skill:"Bomb L2" },
    { name:"เทพธิดาคริสตัล", class:"Healer", hp:8903, atk:2077, def:890, skill:"Heal L2" }
  ],
  225: [ // เขาวงกตคริสตัล
    { name:"จ้าวเขาวงกตคริสตัล", hp:28743, atk:5143, def:2269, skill:"AOE Attack L3" },
    { name:"อัศวินปริซึมมรณะ", hp:13048, atk:3480, def:1305, skill:"Double Strike L3" },
    { name:"นักบวชแสงนิรันดร์", hp:10439, atk:2436, def:1044, skill:"Cleanse L3" }
  ],
  226: [ // ทะเลทรายวิญญาณ
    { name:"มัมมี่พิทักษ์สุสาน", class:"Tank", hp:15423, atk:1696, def:1542, skill:"AOE Defense Buff L2" },
    { name:"นักรบทรายศักดิ์สิทธิ์", class:"Warrior", hp:11567, atk:3085, def:1157, skill:"Double Strike L2" },
    { name:"จอมเวทวิญญาณทราย", class:"Mage", hp:8482, atk:4627, def:771, skill:"Burn L2" },
    { name:"นักบวชแห่งซากศพ", class:"Healer", hp:9254, atk:2159, def:925, skill:"Heal L2" }
  ],
  227: [ // ทะเลทรายวิญญาณ
    { name:"สฟิงซ์พิทักษ์", class:"Tank", hp:15723, atk:1730, def:1572, skill:"AOE Defense Buff L2" },
    { name:"แมงป่องยักษ์เพลิง", class:"Berserk", hp:12579, atk:3459, def:1101, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาทะเลทราย", class:"Rogue", hp:9120, atk:5031, def:786, skill:"Piercing Shot L2" },
    { name:"หมอผีทรายศักดิ์สิทธิ์", class:"Healer", hp:9434, atk:2201, def:943, skill:"AOE Heal L2" }
  ],
  228: [ // ทะเลทรายวิญญาณ
    { name:"อสูรทรายกลืนกิน", class:"Tank", hp:16030, atk:1763, def:1603, skill:"AOE Defense Buff L2" },
    { name:"นักรบผีดิบทะเลทราย", class:"Warrior", hp:12022, atk:3206, def:1202, skill:"Power Strike L2" },
    { name:"จอมเวทมนตร์สะกดทราย", class:"CC", hp:8816, atk:3847, def:962, skill:"Stun L2" },
    { name:"นักบวชโอเอซิส", class:"Healer", hp:9618, atk:2244, def:962, skill:"Cleanse L2" }
  ],
  229: [ // ทะเลทรายวิญญาณ
    { name:"โกเลมทรายเพลิง", class:"Tank", hp:16342, atk:1798, def:1634, skill:"AOE Defense Buff L2" },
    { name:"อัศวินหุ่นทรายศักดิ์สิทธิ์", class:"Berserk", hp:13074, atk:3595, def:1144, skill:"Berserk Mode L2" },
    { name:"นักธนูพายุทราย", class:"Rogue", hp:9479, atk:5230, def:817, skill:"Bomb L2" },
    { name:"เทพีแห่งโอเอซิส", class:"Healer", hp:9805, atk:2288, def:981, skill:"Heal L2" }
  ],
  230: [ // ทะเลทรายวิญญาณ
    { name:"ฟาโรห์ผู้คืนชีพ", hp:31656, atk:5665, def:2499, skill:"Berserk Mode L3" },
    { name:"องครักษ์มัมมี่นิรันดร์", hp:14370, atk:3832, def:1438, skill:"Double Strike L3" },
    { name:"นักบวชแห่งสุสานทอง", hp:11497, atk:2683, def:1150, skill:"Cleanse L3" }
  ],
  231: [ // หนองบึงพิษ
    { name:"ยักษ์หนองบึง", class:"Tank", hp:16986, atk:1868, def:1699, skill:"Defense Buff L2" },
    { name:"กบยักษ์พิษ", class:"Warrior", hp:12740, atk:3397, def:1274, skill:"Double Strike L2" },
    { name:"แม่มดหนองน้ำ", class:"Mage", hp:9342, atk:5096, def:849, skill:"AOE Attack L2" },
    { name:"หมอยาสมุนไพรพิษ", class:"Healer", hp:10192, atk:2378, def:1019, skill:"Heal L2" }
  ],
  232: [ // หนองบึงพิษ
    { name:"เต่ายักษ์เกราะพิษ", class:"Tank", hp:17317, atk:1905, def:1732, skill:"Defense Buff L2" },
    { name:"จระเข้เพชฌฆาต", class:"Berserk", hp:13854, atk:3810, def:1212, skill:"Berserk Mode L2" },
    { name:"งูเห่ายักษ์แว่นทอง", class:"Rogue", hp:10044, atk:5542, def:866, skill:"Piercing Shot L2" },
    { name:"นักบวชบึงมืด", class:"Healer", hp:10390, atk:2424, def:1039, skill:"AOE Heal L2" }
  ],
  233: [ // หนองบึงพิษ
    { name:"ฮิปโปยักษ์พิษบึง", class:"Tank", hp:17655, atk:1942, def:1765, skill:"Defense Buff L2" },
    { name:"นาคาพิษหนองน้ำ", class:"Warrior", hp:13241, atk:3531, def:1324, skill:"Power Strike L2" },
    { name:"แม่มดสะกดวิญญาณ", class:"CC", hp:9710, atk:4237, def:1059, skill:"AOE Silence L2" },
    { name:"นักพรตดอกบัวพิษ", class:"Healer", hp:10593, atk:2472, def:1059, skill:"Cleanse L2" }
  ],
  234: [ // หนองบึงพิษ
    { name:"ไฮดร้าพิษน้อย", class:"Tank", hp:17999, atk:1980, def:1800, skill:"Defense Buff L2" },
    { name:"อสูรบึงเน่าเปื่อย", class:"Berserk", hp:14399, atk:3960, def:1260, skill:"Berserk Mode L2" },
    { name:"นักฆ่าพรางตัวในหมอกพิษ", class:"Rogue", hp:10440, atk:5760, def:900, skill:"Bomb L2" },
    { name:"เทพีแห่งหนองน้ำ", class:"Healer", hp:10800, atk:2520, def:1080, skill:"Heal L2" }
  ],
  235: [ // หนองบึงพิษ
    { name:"เจ้าแห่งหนองบึงมรณะ", hp:34865, atk:6239, def:2753, skill:"AOE Attack L3" },
    { name:"ไฮดร้าพิษสามหัว", hp:15827, atk:4221, def:1582, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งบึงดำ", hp:12661, atk:2954, def:1266, skill:"Cleanse L3" }
  ],
  236: [ // ภูเขาไฟอสูร
    { name:"ยักษ์หินลาวา", class:"Tank", hp:18708, atk:2058, def:1871, skill:"AOE Defense Buff L2" },
    { name:"อสูรเพลิงกรงเล็บ", class:"Warrior", hp:14031, atk:3742, def:1403, skill:"Double Strike L2" },
    { name:"จอมเวทเปลวไฟ", class:"Mage", hp:10289, atk:5612, def:935, skill:"Burn L2" },
    { name:"นักบวชแห่งเถ้าถ่าน", class:"Healer", hp:11225, atk:2619, def:1122, skill:"Heal L2" }
  ],
  237: [ // ภูเขาไฟอสูร
    { name:"ซาลาแมนเดอร์ยักษ์", class:"Tank", hp:19073, atk:2098, def:1907, skill:"AOE Defense Buff L2" },
    { name:"มารเพลิงบ้าคลั่ง", class:"Berserk", hp:15258, atk:4196, def:1335, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาลาวา", class:"Rogue", hp:11062, atk:6103, def:954, skill:"Piercing Shot L2" },
    { name:"หมอผีแห่งภูเขาไฟ", class:"Healer", hp:11444, atk:2670, def:1144, skill:"AOE Heal L2" }
  ],
  238: [ // ภูเขาไฟอสูร
    { name:"โกเลมลาวาไหลนอง", class:"Tank", hp:19445, atk:2139, def:1944, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะเพลิง", class:"Warrior", hp:14584, atk:3889, def:1458, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดไฟ", class:"CC", hp:10695, atk:4667, def:1167, skill:"Silence L2" },
    { name:"เทพีแห่งเถ้าธุลี", class:"Healer", hp:11667, atk:2722, def:1167, skill:"Cleanse L2" }
  ],
  239: [ // ภูเขาไฟอสูร
    { name:"ฟีนิกซ์ดำผู้ล่มสลาย", class:"Tank", hp:19824, atk:2181, def:1982, skill:"AOE Defense Buff L2" },
    { name:"ดราก้อนเพลิงน้อย", class:"Berserk", hp:15859, atk:4361, def:1388, skill:"Berserk Mode L2" },
    { name:"นักธนูอัคคี", class:"Rogue", hp:11498, atk:6344, def:991, skill:"Bomb L2" },
    { name:"นักบวชศักดิ์สิทธิ์แห่งไฟ", class:"Healer", hp:11894, atk:2775, def:1189, skill:"Heal L2" }
  ],
  240: [ // ภูเขาไฟอสูร
    { name:"เจ้าภูเขาไฟปีศาจ", hp:38401, atk:6872, def:3032, skill:"Berserk Mode L3" },
    { name:"ซาลาแมนเดอร์ราชันเพลิง", hp:17432, atk:4648, def:1743, skill:"Double Strike L3" },
    { name:"นักบวชแห่งลาวาศักดิ์สิทธิ์", hp:13945, atk:3253, def:1395, skill:"Cleanse L3" }
  ],
  241: [ // ธารน้ำแข็งนิรันดร์
    { name:"โยติสหิมะ", class:"Tank", hp:20605, atk:2267, def:2060, skill:"Defense Buff L2" },
    { name:"หมาป่าน้ำแข็ง", class:"Warrior", hp:15453, atk:4121, def:1545, skill:"Double Strike L2" },
    { name:"แม่มดน้ำแข็ง", class:"Mage", hp:11333, atk:6181, def:1030, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งหิมะ", class:"Healer", hp:12363, atk:2885, def:1236, skill:"Heal L2" }
  ],
  242: [ // ธารน้ำแข็งนิรันดร์
    { name:"ยักษ์น้ำแข็งพิทักษ์", class:"Tank", hp:21006, atk:2311, def:2101, skill:"Defense Buff L2" },
    { name:"หมีขาวเพชฌฆาต", class:"Berserk", hp:16805, atk:4621, def:1470, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาหิมะ", class:"Rogue", hp:12184, atk:6722, def:1050, skill:"Piercing Shot L2" },
    { name:"หมอผีธารน้ำแข็ง", class:"Healer", hp:12604, atk:2941, def:1260, skill:"AOE Heal L2" }
  ],
  243: [ // ธารน้ำแข็งนิรันดร์
    { name:"โกเลมน้ำแข็งยักษ์", class:"Tank", hp:21416, atk:2356, def:2142, skill:"Defense Buff L2" },
    { name:"อัศวินเกราะน้ำแข็ง", class:"Warrior", hp:16062, atk:4283, def:1606, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดหนาว", class:"CC", hp:11779, atk:5140, def:1285, skill:"Charm L2" },
    { name:"เทพีแห่งลมหนาว", class:"Healer", hp:12850, atk:2998, def:1285, skill:"Cleanse L2" }
  ],
  244: [ // ธารน้ำแข็งนิรันดร์
    { name:"มังกรน้ำแข็งน้อย", class:"Tank", hp:21834, atk:2402, def:2183, skill:"Defense Buff L2" },
    { name:"ยักษ์หิมะจอมพลัง", class:"Berserk", hp:17467, atk:4803, def:1528, skill:"Berserk Mode L2" },
    { name:"นักธนูพายุหิมะ", class:"Rogue", hp:12664, atk:6987, def:1092, skill:"Bomb L2" },
    { name:"นักบวชแห่งขั้วโลก", class:"Healer", hp:13100, atk:3057, def:1310, skill:"Heal L2" }
  ],
  245: [ // ธารน้ำแข็งนิรันดร์
    { name:"ราชินีน้ำแข็งนิรันดร์", hp:42292, atk:7568, def:3339, skill:"AOE Attack L3" },
    { name:"โยติสหิมะจอมพิโรธ", hp:19199, atk:5120, def:1919, skill:"Double Strike L3" },
    { name:"นักบวชแห่งความหนาวเหน็บ", hp:15359, atk:3583, def:1536, skill:"Cleanse L3" }
  ],
  246: [ // นครใต้พิภพ
    { name:"อสูรถ้ำลึก", class:"Tank", hp:22693, atk:2496, def:2269, skill:"AOE Defense Buff L2" },
    { name:"นักรบเงาใต้ดิน", class:"Warrior", hp:17020, atk:4539, def:1702, skill:"Double Strike L2" },
    { name:"จอมเวทมืดใต้พิภพ", class:"Mage", hp:12481, atk:6808, def:1135, skill:"Burn L2" },
    { name:"นักบวชแห่งความมืด", class:"Healer", hp:13616, atk:3177, def:1362, skill:"Heal L2" }
  ],
  247: [ // นครใต้พิภพ
    { name:"ดาร์กเอลฟ์พิทักษ์", class:"Tank", hp:23136, atk:2545, def:2314, skill:"AOE Defense Buff L2" },
    { name:"ดาร์กเอลฟ์นักฆ่า", class:"Berserk", hp:18509, atk:5090, def:1620, skill:"Berserk Mode L2" },
    { name:"ดาร์กเอลฟ์นักธนู", class:"Rogue", hp:13419, atk:7404, def:1157, skill:"Piercing Shot L2" },
    { name:"ดาร์กเอลฟ์นักบวช", class:"Healer", hp:13882, atk:3239, def:1388, skill:"AOE Heal L2" }
  ],
  248: [ // นครใต้พิภพ
    { name:"แมงมุมยักษ์ราชินี", class:"Tank", hp:23587, atk:2595, def:2359, skill:"AOE Defense Buff L2" },
    { name:"อัศวินใยดำ", class:"Warrior", hp:17690, atk:4717, def:1769, skill:"Power Strike L2" },
    { name:"แม่มดใยพิษสะกด", class:"CC", hp:12973, atk:5661, def:1415, skill:"AOE Stun L2" },
    { name:"นักพรตใต้พิภพ", class:"Healer", hp:14152, atk:3302, def:1415, skill:"Cleanse L2" }
  ],
  249: [ // นครใต้พิภพ
    { name:"บีฮีมอธถ้ำลึก", class:"Tank", hp:24047, atk:2645, def:2405, skill:"AOE Defense Buff L2" },
    { name:"โกเลมหินใต้พิภพ", class:"Berserk", hp:19238, atk:5290, def:1683, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาไร้แสง", class:"Rogue", hp:13947, atk:7695, def:1202, skill:"Bomb L2" },
    { name:"เทพีแห่งนครมืด", class:"Healer", hp:14428, atk:3367, def:1443, skill:"Heal L2" }
  ],
  250: [ // นครใต้พิภพ
    { name:"จักรพรรดินครใต้พิภพ", hp:46580, atk:8335, def:3677, skill:"Berserk Mode L3" },
    { name:"แมงมุมราชินีมฤตยู", hp:21145, atk:5638, def:2115, skill:"Double Strike L3" },
    { name:"นักบวชแห่งรัตติกาลนิรันดร์", hp:16917, atk:3947, def:1692, skill:"Cleanse L3" }
  ],
  251: [ // สวนสวรรค์ร้าง
    { name:"ผู้พิทักษ์สวนศักดิ์สิทธิ์", class:"Tank", hp:24994, atk:2749, def:2499, skill:"Defense Buff L2" },
    { name:"อัศวินปีกขาวเสื่อมสลาย", class:"Warrior", hp:18746, atk:4999, def:1875, skill:"Double Strike L2" },
    { name:"นางฟ้าจอมเวทเศร้าหมอง", class:"Mage", hp:13747, atk:7498, def:1250, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งสวรรค์ร้าง", class:"Healer", hp:14996, atk:3499, def:1500, skill:"Heal L2" }
  ],
  252: [ // สวนสวรรค์ร้าง
    { name:"ต้นไม้ยักษ์วิญญาณ", class:"Tank", hp:25481, atk:2803, def:2548, skill:"Defense Buff L2" },
    { name:"กริฟฟินคลั่ง", class:"Berserk", hp:20385, atk:5606, def:1784, skill:"Berserk Mode L2" },
    { name:"นักฆ่าปีกเงา", class:"Rogue", hp:14779, atk:8154, def:1274, skill:"Piercing Shot L2" },
    { name:"เทพธิดาน้ำตา", class:"Healer", hp:15289, atk:3567, def:1529, skill:"AOE Heal L2" }
  ],
  253: [ // สวนสวรรค์ร้าง
    { name:"โกเลมไม้ศักดิ์สิทธิ์", class:"Tank", hp:25978, atk:2858, def:2598, skill:"Defense Buff L2" },
    { name:"อัศวินแสงเสื่อมทราม", class:"Warrior", hp:19484, atk:5196, def:1948, skill:"Power Strike L2" },
    { name:"นางฟ้าสะกดวิญญาณ", class:"CC", hp:14288, atk:6235, def:1559, skill:"Stun L2" },
    { name:"มหาปุโรหิตแห่งเอเดน", class:"Healer", hp:15587, atk:3637, def:1559, skill:"Cleanse L2" }
  ],
  254: [ // สวนสวรรค์ร้าง
    { name:"ยูนิคอร์นดำผู้แปดเปื้อน", class:"Tank", hp:26485, atk:2913, def:2648, skill:"Defense Buff L2" },
    { name:"เพกาซัสเพลิงพิโรธ", class:"Berserk", hp:21188, atk:5827, def:1854, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงจันทร์", class:"Rogue", hp:15361, atk:8475, def:1324, skill:"Bomb L2" },
    { name:"อาร์คแองเจิลผู้เศร้าโศก", class:"Healer", hp:15891, atk:3708, def:1589, skill:"Heal L2" }
  ],
  255: [ // สวนสวรรค์ร้าง
    { name:"เทพผู้ล่มสลายแห่งเอเดน", hp:51302, atk:9180, def:4050, skill:"AOE Attack L3" },
    { name:"อัศวินปีกดำไร้ศรัทธา", hp:23289, atk:6210, def:2329, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตผู้ถูกสาป", hp:18631, atk:4347, def:1863, skill:"Cleanse L3" }
  ],
  256: [ // หุบผาสายฟ้า
    { name:"นกอินทรีสายฟ้า", class:"Tank", hp:27528, atk:3028, def:2753, skill:"AOE Defense Buff L2" },
    { name:"นักรบเมฆพายุ", class:"Warrior", hp:20646, atk:5506, def:2065, skill:"Double Strike L2" },
    { name:"จอมเวทสายฟ้า", class:"Mage", hp:15140, atk:8258, def:1376, skill:"Burn L2" },
    { name:"นักบวชแห่งเมฆา", class:"Healer", hp:16517, atk:3854, def:1652, skill:"Heal L2" }
  ],
  257: [ // หุบผาสายฟ้า
    { name:"ยักษ์ฟ้าคะนอง", class:"Tank", hp:28065, atk:3087, def:2806, skill:"AOE Defense Buff L2" },
    { name:"ไซคลอปส์สายฟ้า", class:"Berserk", hp:22452, atk:6174, def:1965, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาพายุ", class:"Rogue", hp:16278, atk:8981, def:1403, skill:"Piercing Shot L2" },
    { name:"หมอผีแห่งลมกรด", class:"Healer", hp:16839, atk:3929, def:1684, skill:"AOE Heal L2" }
  ],
  258: [ // หุบผาสายฟ้า
    { name:"โกเลมหินสายฟ้า", class:"Tank", hp:28612, atk:3147, def:2861, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะทองแดง", class:"Warrior", hp:21459, atk:5722, def:2146, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดฟ้าร้อง", class:"CC", hp:15737, atk:6867, def:1717, skill:"AOE Silence L2" },
    { name:"เทพีแห่งสายลม", class:"Healer", hp:17167, atk:4006, def:1717, skill:"Cleanse L2" }
  ],
  259: [ // หุบผาสายฟ้า
    { name:"ไทฟูนอสูรจอมพิโรธ", class:"Tank", hp:29170, atk:3209, def:2917, skill:"AOE Defense Buff L2" },
    { name:"การ์กอยล์สายฟ้า", class:"Berserk", hp:23336, atk:6417, def:2042, skill:"Berserk Mode L2" },
    { name:"นักธนูจอมพายุ", class:"Rogue", hp:16919, atk:9334, def:1458, skill:"Bomb L2" },
    { name:"นักบวชแห่งเมฆพิโรธ", class:"Healer", hp:17502, atk:4084, def:1750, skill:"Heal L2" }
  ],
  260: [ // หุบผาสายฟ้า
    { name:"จ้าวหุบผาสายฟ้า", hp:56504, atk:10111, def:4461, skill:"Berserk Mode L3" },
    { name:"ไซคลอปส์อสุนีบาต", hp:25650, atk:6840, def:2565, skill:"Double Strike L3" },
    { name:"นักบวชแห่งพายุนิรันดร์", hp:20519, atk:4787, def:2052, skill:"Cleanse L3" }
  ],
  261: [ // ป่าต้องคำสาป
    { name:"หมีเงาต้องสาป", class:"Tank", hp:30319, atk:3335, def:3032, skill:"Defense Buff L2" },
    { name:"หมาป่าวิญญาณ", class:"Warrior", hp:22739, atk:6064, def:2274, skill:"Double Strike L2" },
    { name:"แม่มดป่าต้องสาป", class:"Mage", hp:16675, atk:9096, def:1516, skill:"AOE Attack L2" },
    { name:"นักพรตต้นไม้ผุ", class:"Healer", hp:18191, atk:4245, def:1819, skill:"Heal L2" }
  ],
  262: [ // ป่าต้องคำสาป
    { name:"เอนท์ดำผู้เสื่อมทราม", class:"Tank", hp:30910, atk:3400, def:3091, skill:"Defense Buff L2" },
    { name:"หมาป่าเลือดสาป", class:"Berserk", hp:24728, atk:6800, def:2164, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาในป่าลึก", class:"Rogue", hp:17928, atk:9891, def:1545, skill:"Piercing Shot L2" },
    { name:"หมอผีรากไม้ดำ", class:"Healer", hp:18546, atk:4327, def:1855, skill:"AOE Heal L2" }
  ],
  263: [ // ป่าต้องคำสาป
    { name:"โกเลมไม้ผุพัง", class:"Tank", hp:31513, atk:3466, def:3151, skill:"Defense Buff L2" },
    { name:"อัศวินไม้เลื้อยรัดกาย", class:"Warrior", hp:23634, atk:6303, def:2363, skill:"Power Strike L2" },
    { name:"แม่มดสะกดวิญญาณป่า", class:"CC", hp:17332, atk:7563, def:1891, skill:"Silence L2" },
    { name:"นักบวชป่าศักดิ์สิทธิ์เสื่อมสลาย", class:"Healer", hp:18908, atk:4412, def:1891, skill:"Cleanse L2" }
  ],
  264: [ // ป่าต้องคำสาป
    { name:"ทรีเอนท์เก่าแก่ผู้พิโรธ", class:"Tank", hp:32127, atk:3534, def:3213, skill:"Defense Buff L2" },
    { name:"หมีเงายักษ์", class:"Berserk", hp:25702, atk:7068, def:2249, skill:"Berserk Mode L2" },
    { name:"นักธนูใบไม้พิษ", class:"Rogue", hp:18634, atk:10281, def:1606, skill:"Bomb L2" },
    { name:"เทพีแห่งป่าร้าง", class:"Healer", hp:19276, atk:4498, def:1928, skill:"Heal L2" }
  ],
  265: [ // ป่าต้องคำสาป
    { name:"เจ้าป่าต้องคำสาป", hp:62233, atk:11136, def:4913, skill:"AOE Attack L3" },
    { name:"หมาป่าเงาจอมพิโรธ", hp:28250, atk:7534, def:2826, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งรากดำ", hp:22600, atk:5274, def:2260, skill:"Cleanse L3" }
  ],
  266: [ // วิหารจันทร์เสี้ยว
    { name:"องครักษ์วิหารจันทร์", class:"Tank", hp:33392, atk:3673, def:3339, skill:"AOE Defense Buff L2" },
    { name:"นักรบแสงจันทร์", class:"Warrior", hp:25044, atk:6678, def:2504, skill:"Double Strike L2" },
    { name:"จอมเวทราตรี", class:"Mage", hp:18366, atk:10018, def:1670, skill:"Burn L2" },
    { name:"นักบวชแห่งจันทร์เสี้ยว", class:"Healer", hp:20035, atk:4675, def:2004, skill:"Heal L2" }
  ],
  267: [ // วิหารจันทร์เสี้ยว
    { name:"รูปปั้นหินเฝ้าวิหาร", class:"Tank", hp:34043, atk:3745, def:3404, skill:"AOE Defense Buff L2" },
    { name:"นักฆ่าเงาจันทรา", class:"Berserk", hp:27235, atk:7490, def:2383, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงเงิน", class:"Rogue", hp:19745, atk:10894, def:1702, skill:"Piercing Shot L2" },
    { name:"หมอผีแห่งราตรีกาล", class:"Healer", hp:20426, atk:4766, def:2043, skill:"AOE Heal L2" }
  ],
  268: [ // วิหารจันทร์เสี้ยว
    { name:"โกเลมหินวิหารโบราณ", class:"Tank", hp:34707, atk:3818, def:3471, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะเงิน", class:"Warrior", hp:26030, atk:6941, def:2603, skill:"Power Strike L2" },
    { name:"แม่มดจันทร์สะกดจิต", class:"CC", hp:19089, atk:8330, def:2082, skill:"Charm L2" },
    { name:"มหาปุโรหิตแห่งจันทรา", class:"Healer", hp:20824, atk:4859, def:2082, skill:"Cleanse L2" }
  ],
  269: [ // วิหารจันทร์เสี้ยว
    { name:"หมาป่าจันทร์เพ็ญ", class:"Tank", hp:35384, atk:3892, def:3538, skill:"AOE Defense Buff L2" },
    { name:"อัศวินดำแห่งราตรีกาล", class:"Berserk", hp:28307, atk:7784, def:2477, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาไร้เสียง", class:"Rogue", hp:20523, atk:11323, def:1769, skill:"Bomb L2" },
    { name:"เทพีแห่งแสงจันทร์", class:"Healer", hp:21230, atk:4954, def:2123, skill:"Heal L2" }
  ],
  270: [ // วิหารจันทร์เสี้ยว
    { name:"มหาปุโรหิตแห่งจันทร์เสี้ยว", hp:68541, atk:12265, def:5411, skill:"Berserk Mode L3" },
    { name:"องครักษ์เงาจันทรา", hp:31114, atk:8297, def:3112, skill:"Double Strike L3" },
    { name:"นักฆ่าเงาราชินีราตรี", hp:24891, atk:5808, def:2489, skill:"Cleanse L3" }
  ],
  271: [ // เกาะร้างกลางทะเลเลือด
    { name:"โจรสลัดผีดิบ", class:"Tank", hp:36777, atk:4046, def:3678, skill:"Defense Buff L2" },
    { name:"นักรบทะเลเลือด", class:"Warrior", hp:27583, atk:7355, def:2758, skill:"Double Strike L2" },
    { name:"จอมเวทคลื่นเลือด", class:"Mage", hp:20228, atk:11033, def:1839, skill:"AOE Attack L2" },
    { name:"หมอเรือผีสิง", class:"Healer", hp:22066, atk:5149, def:2207, skill:"Heal L2" }
  ],
  272: [ // เกาะร้างกลางทะเลเลือด
    { name:"ครีเจอร์ทะเลลึกยักษ์", class:"Tank", hp:37495, atk:4124, def:3749, skill:"Defense Buff L2" },
    { name:"ฉลามปีศาจ", class:"Berserk", hp:29996, atk:8249, def:2625, skill:"Berserk Mode L2" },
    { name:"นักฆ่าใต้คลื่นเลือด", class:"Rogue", hp:21747, atk:11998, def:1875, skill:"Piercing Shot L2" },
    { name:"นักบวชเรืออับปาง", class:"Healer", hp:22497, atk:5249, def:2250, skill:"AOE Heal L2" }
  ],
  273: [ // เกาะร้างกลางทะเลเลือด
    { name:"โกเลมปะการังดำ", class:"Tank", hp:38226, atk:4205, def:3823, skill:"Defense Buff L2" },
    { name:"อัศวินเรือผี", class:"Warrior", hp:28669, atk:7645, def:2867, skill:"Power Strike L2" },
    { name:"เงือกสะกดจิตมรณะ", class:"CC", hp:21024, atk:9174, def:2294, skill:"AOE Stun L2" },
    { name:"เทพีแห่งเกาะร้าง", class:"Healer", hp:22935, atk:5352, def:2294, skill:"Cleanse L2" }
  ],
  274: [ // เกาะร้างกลางทะเลเลือด
    { name:"คราเคนน้อยแห่งทะเลเลือด", class:"Tank", hp:38971, atk:4287, def:3897, skill:"Defense Buff L2" },
    { name:"กัปตันผีดิบไร้หัว", class:"Berserk", hp:31177, atk:8574, def:2728, skill:"Berserk Mode L2" },
    { name:"นักฆ่าใต้เงาคลื่น", class:"Rogue", hp:22603, atk:12471, def:1949, skill:"Bomb L2" },
    { name:"นักบวชแห่งวิญญาณเรืออับปาง", class:"Healer", hp:23383, atk:5456, def:2338, skill:"Heal L2" }
  ],
  275: [ // เกาะร้างกลางทะเลเลือด
    { name:"กัปตันผีแห่งทะเลเลือด", hp:75489, atk:13509, def:5960, skill:"AOE Attack L3" },
    { name:"คราเคนพิฆาต", hp:34268, atk:9138, def:3427, skill:"Double Strike L3" },
    { name:"เงือกราชินีมรณะ", hp:27415, atk:6396, def:2742, skill:"Cleanse L3" }
  ],
  276: [ // ดงเห็ดพิษ
    { name:"ก้อนเห็ดยักษ์พิษ", class:"Tank", hp:40506, atk:4456, def:4051, skill:"AOE Defense Buff L2" },
    { name:"สปอร์แมงป่องพิษ", class:"Warrior", hp:30379, atk:8101, def:3038, skill:"Double Strike L2" },
    { name:"แม่มดเชื้อรา", class:"Mage", hp:22278, atk:12152, def:2025, skill:"Burn L2" },
    { name:"หมอยาเชื้อราศักดิ์สิทธิ์", class:"Healer", hp:24304, atk:5671, def:2430, skill:"Heal L2" }
  ],
  277: [ // ดงเห็ดพิษ
    { name:"ยักษ์เห็ดเรืองแสง", class:"Tank", hp:41296, atk:4543, def:4130, skill:"AOE Defense Buff L2" },
    { name:"แมลงยักษ์พิษร้าย", class:"Berserk", hp:33037, atk:9085, def:2891, skill:"Berserk Mode L2" },
    { name:"นักฆ่าในหมอกสปอร์", class:"Rogue", hp:23952, atk:13215, def:2065, skill:"Piercing Shot L2" },
    { name:"นักพรตดอกเห็ดบุญ", class:"Healer", hp:24777, atk:5781, def:2478, skill:"AOE Heal L2" }
  ],
  278: [ // ดงเห็ดพิษ
    { name:"โกเลมเชื้อราดำ", class:"Tank", hp:42101, atk:4631, def:4210, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะเห็ดพิษ", class:"Warrior", hp:31576, atk:8420, def:3158, skill:"Power Strike L2" },
    { name:"แม่มดสะกดสปอร์มึนเมา", class:"CC", hp:23156, atk:10104, def:2526, skill:"Stun L2" },
    { name:"เทพีแห่งเห็ดวิเศษ", class:"Healer", hp:25261, atk:5894, def:2526, skill:"Cleanse L2" }
  ],
  279: [ // ดงเห็ดพิษ
    { name:"ไฮดร้าเชื้อราพิษ", class:"Tank", hp:42922, atk:4721, def:4292, skill:"AOE Defense Buff L2" },
    { name:"อสูรสปอร์ระเบิด", class:"Berserk", hp:34338, atk:9443, def:3005, skill:"Berserk Mode L2" },
    { name:"นักธนูลูกดอกพิษ", class:"Rogue", hp:24895, atk:13735, def:2146, skill:"Bomb L2" },
    { name:"นักบวชแห่งป่าเห็ดต้องห้าม", class:"Healer", hp:25753, atk:6009, def:2575, skill:"Heal L2" }
  ],
  280: [ // ดงเห็ดพิษ
    { name:"เจ้าป่าเห็ดพิษมรณะ", hp:83142, atk:14878, def:6564, skill:"Berserk Mode L3" },
    { name:"ไฮดร้าสปอร์พิฆาต", hp:37742, atk:10065, def:3774, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งเชื้อราดำ", hp:30193, atk:7045, def:3020, skill:"Cleanse L3" }
  ],
  281: [ // ป้อมปราการเหล็กกล้า
    { name:"ทหารเหล็กยาม", class:"Tank", hp:44612, atk:4907, def:4461, skill:"Defense Buff L2" },
    { name:"นักรบเกราะเหล็ก", class:"Warrior", hp:33459, atk:8922, def:3346, skill:"Double Strike L2" },
    { name:"วิศวกรเวทมนตร์", class:"Mage", hp:24537, atk:13384, def:2231, skill:"AOE Attack L2" },
    { name:"นักบวชสนามรบ", class:"Healer", hp:26767, atk:6246, def:2677, skill:"Heal L2" }
  ],
  282: [ // ป้อมปราการเหล็กกล้า
    { name:"โกเลมเหล็กกล้า", class:"Tank", hp:45482, atk:5003, def:4548, skill:"Defense Buff L2" },
    { name:"อัศวินเครื่องจักรบ้าคลั่ง", class:"Berserk", hp:36386, atk:10006, def:3184, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาป้อมปราการ", class:"Rogue", hp:26380, atk:14554, def:2274, skill:"Piercing Shot L2" },
    { name:"หมอสนามเหล็กกล้า", class:"Healer", hp:27289, atk:6368, def:2729, skill:"AOE Heal L2" }
  ],
  283: [ // ป้อมปราการเหล็กกล้า
    { name:"ไททันเหล็กยักษ์", class:"Tank", hp:46369, atk:5101, def:4637, skill:"Defense Buff L2" },
    { name:"อัศวินเกราะเพชร", class:"Warrior", hp:34777, atk:9274, def:3478, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดโลหะ", class:"CC", hp:25503, atk:11129, def:2782, skill:"AOE Silence L2" },
    { name:"เทพีแห่งป้อมปราการ", class:"Healer", hp:27821, atk:6492, def:2782, skill:"Cleanse L2" }
  ],
  284: [ // ป้อมปราการเหล็กกล้า
    { name:"เมคาดราก้อนต้นแบบ", class:"Tank", hp:47273, atk:5200, def:4727, skill:"Defense Buff L2" },
    { name:"นายพลเหล็กกล้าไร้ปราณี", class:"Berserk", hp:37819, atk:10400, def:3309, skill:"Berserk Mode L2" },
    { name:"นักธนูกระสุนเหล็ก", class:"Rogue", hp:27419, atk:15127, def:2364, skill:"Bomb L2" },
    { name:"นักบวชผู้พิทักษ์ป้อม", class:"Healer", hp:28364, atk:6618, def:2836, skill:"Heal L2" }
  ],
  285: [ // ป้อมปราการเหล็กกล้า
    { name:"จอมทัพเหล็กกล้าไร้ปราณี", hp:91571, atk:16386, def:7229, skill:"AOE Attack L3" },
    { name:"เมคาดราก้อนพิฆาต", hp:41568, atk:11085, def:4157, skill:"Double Strike L3" },
    { name:"นักบวชแห่งป้อมปราการนิรันดร์", hp:33255, atk:7759, def:3326, skill:"Cleanse L3" }
  ],
  286: [ // ทุ่งดอกไม้ผีสิง
    { name:"ต้นไม้ผีสิงพิทักษ์ทุ่ง", class:"Tank", hp:49135, atk:5405, def:4913, skill:"AOE Defense Buff L2" },
    { name:"วิญญาณดอกไม้พิโรธ", class:"Warrior", hp:36851, atk:9827, def:3685, skill:"Double Strike L2" },
    { name:"แม่มดดอกไม้ราตรี", class:"Mage", hp:27024, atk:14740, def:2457, skill:"Burn L2" },
    { name:"นักบวชแห่งกลีบดอกโรยรา", class:"Healer", hp:29481, atk:6879, def:2948, skill:"Heal L2" }
  ],
  287: [ // ทุ่งดอกไม้ผีสิง
    { name:"หุ่นฟางผีสิง", class:"Tank", hp:50093, atk:5510, def:5009, skill:"AOE Defense Buff L2" },
    { name:"ผีเสื้อยักษ์พิษ", class:"Berserk", hp:40074, atk:11020, def:3507, skill:"Berserk Mode L2" },
    { name:"นักฆ่าในทุ่งหมอก", class:"Rogue", hp:29054, atk:16030, def:2505, skill:"Piercing Shot L2" },
    { name:"นางไม้แห่งดอกไม้ร่วง", class:"Healer", hp:30056, atk:7013, def:3006, skill:"AOE Heal L2" }
  ],
  288: [ // ทุ่งดอกไม้ผีสิง
    { name:"โกเลมดอกไม้ต้องสาป", class:"Tank", hp:51070, atk:5618, def:5107, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะกลีบกุหลาบดำ", class:"Warrior", hp:38302, atk:10214, def:3830, skill:"Power Strike L2" },
    { name:"แม่มดสะกดกลิ่นหอมมรณะ", class:"CC", hp:28088, atk:12257, def:3064, skill:"Silence L2" },
    { name:"เทพีแห่งทุ่งดอกไม้ร้าง", class:"Healer", hp:30642, atk:7150, def:3064, skill:"Cleanse L2" }
  ],
  289: [ // ทุ่งดอกไม้ผีสิง
    { name:"ไฮดร้าเถาวัลย์ผีสิง", class:"Tank", hp:52066, atk:5727, def:5207, skill:"AOE Defense Buff L2" },
    { name:"อสูรดอกไม้เลือด", class:"Berserk", hp:41653, atk:11454, def:3645, skill:"Berserk Mode L2" },
    { name:"นักธนูหนามพิษ", class:"Rogue", hp:30198, atk:16661, def:2603, skill:"Bomb L2" },
    { name:"นักบวชแห่งฤดูใบไม้ร่วง", class:"Healer", hp:31239, atk:7289, def:3124, skill:"Heal L2" }
  ],
  290: [ // ทุ่งดอกไม้ผีสิง
    { name:"เจ้าแห่งทุ่งดอกไม้ผีสิง", hp:100854, atk:18048, def:7962, skill:"Berserk Mode L3" },
    { name:"วิญญาณกุหลาบดำมรณะ", hp:45783, atk:12208, def:4578, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งกลิ่นหอมมรณะ", hp:36626, atk:8546, def:3663, skill:"Cleanse L3" }
  ],
  291: [ // หุบเขาสุริยะ
    { name:"องครักษ์สุริยะ", class:"Tank", hp:54116, atk:5953, def:5412, skill:"Defense Buff L2" },
    { name:"นักรบเปลวสุริยัน", class:"Warrior", hp:40587, atk:10823, def:4059, skill:"Double Strike L2" },
    { name:"จอมเวทแสงอาทิตย์", class:"Mage", hp:29764, atk:16235, def:2706, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งรุ่งอรุณ", class:"Healer", hp:32470, atk:7576, def:3247, skill:"Heal L2" }
  ],
  292: [ // หุบเขาสุริยะ
    { name:"ฟีนิกซ์ทองคำน้อย", class:"Tank", hp:55171, atk:6069, def:5517, skill:"Defense Buff L2" },
    { name:"สิงโตเพลิงสุริยะ", class:"Berserk", hp:44137, atk:12138, def:3862, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาแดด", class:"Rogue", hp:31999, atk:17655, def:2759, skill:"Piercing Shot L2" },
    { name:"มหาปุโรหิตแห่งสุริยะ", class:"Healer", hp:33103, atk:7724, def:3310, skill:"AOE Heal L2" }
  ],
  293: [ // หุบเขาสุริยะ
    { name:"โกเลมทองคำศักดิ์สิทธิ์", class:"Tank", hp:56247, atk:6187, def:5625, skill:"Defense Buff L2" },
    { name:"อัศวินเกราะสุริยะ", class:"Warrior", hp:42185, atk:11249, def:4219, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดแสงจ้า", class:"CC", hp:30936, atk:13499, def:3375, skill:"Charm L2" },
    { name:"เทพีแห่งอรุณรุ่ง", class:"Healer", hp:33748, atk:7875, def:3375, skill:"Cleanse L2" }
  ],
  294: [ // หุบเขาสุริยะ
    { name:"ไทแทนสุริยะยักษ์", class:"Tank", hp:57344, atk:6308, def:5734, skill:"Defense Buff L2" },
    { name:"ดราก้อนทองคำผู้พิทักษ์", class:"Berserk", hp:45875, atk:12616, def:4014, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงทอง", class:"Rogue", hp:33260, atk:18350, def:2867, skill:"Bomb L2" },
    { name:"นักบวชสูงสุดแห่งสุริยัน", class:"Healer", hp:34406, atk:8028, def:3441, skill:"Heal L2" }
  ],
  295: [ // หุบเขาสุริยะ
    { name:"ราชันสุริยะทองคำ", hp:111078, atk:19877, def:8769, skill:"AOE Attack L3" },
    { name:"ฟีนิกซ์เพลิงสุริยัน", hp:50424, atk:13446, def:5043, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตแห่งดวงอาทิตย์", hp:40339, atk:9413, def:4034, skill:"Cleanse L3" }
  ],
  296: [ // บัลลังก์เทพจุติ
    { name:"องครักษ์เทพจุติ", class:"Tank", hp:59602, atk:6556, def:5960, skill:"AOE Defense Buff L2" },
    { name:"นักรบเทพผู้ล่มสลาย", class:"Warrior", hp:44702, atk:11920, def:4470, skill:"Double Strike L2" },
    { name:"จอมเวทแห่งบัลลังก์", class:"Mage", hp:32781, atk:17881, def:2980, skill:"Burn L2" },
    { name:"นักบวชสูงสุดแห่งเทวสถาน", class:"Healer", hp:35761, atk:8344, def:3576, skill:"Heal L2" }
  ],
  297: [ // บัลลังก์เทพจุติ
    { name:"ไททันจุติพิทักษ์บัลลังก์", class:"Tank", hp:60765, atk:6684, def:6076, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเทพผู้พิโรธ", class:"Berserk", hp:48612, atk:13368, def:4254, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาแห่งเทวสถาน", class:"Rogue", hp:35243, atk:19445, def:3038, skill:"Piercing Shot L2" },
    { name:"เทพีผู้เฝ้าบัลลังก์", class:"Healer", hp:36459, atk:8507, def:3646, skill:"AOE Heal L2" }
  ],
  298: [ // บัลลังก์เทพจุติ
    { name:"โกเลมเทพศักดิ์สิทธิ์", class:"Tank", hp:61949, atk:6814, def:6195, skill:"AOE Defense Buff L2" },
    { name:"อาร์คแองเจิลผู้ตกสวรรค์", class:"Warrior", hp:46462, atk:12390, def:4646, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดมิติ", class:"CC", hp:34072, atk:14868, def:3717, skill:"AOE Stun L2" },
    { name:"มหาปุโรหิตสูงสุดแห่งจุติ", class:"Healer", hp:37170, atk:8673, def:3717, skill:"Cleanse L2" }
  ],
  299: [ // บัลลังก์เทพจุติ
    { name:"ไทแทนจุติจอมพลัง", class:"Tank", hp:63157, atk:6947, def:6316, skill:"AOE Defense Buff L2" },
    { name:"ดราก้อนเทพเจ้าจอมพิโรธ", class:"Berserk", hp:50526, atk:13895, def:4421, skill:"Berserk Mode L2" },
    { name:"นักธนูแห่งวันสิ้นโลก", class:"Rogue", hp:36631, atk:20210, def:3158, skill:"Bomb L2" },
    { name:"เทพธิดาผู้เฝ้าประตูมิติ", class:"Healer", hp:37894, atk:8842, def:3789, skill:"Heal L2" }
  ],
  300: [ // บัลลังก์เทพจุติ
    { name:"เทพจุติผู้ล่มสลาย", hp:122339, atk:21892, def:9658, skill:"Berserk Mode L3" },
    { name:"อัครเทวดาผู้ทรยศ", hp:55536, atk:14810, def:5553, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตแห่งวาระสุดท้าย", hp:44428, atk:10366, def:4442, skill:"Cleanse L3" }
  ],
  // ============ บิ๊กสเตจ 4 — นรก (ด่าน 301-400) ============
  301: [ // ทุ่งสไลม์นิรันดร์
    { name:"สไลม์หินยักษ์", class:"Tank", hp:65645, atk:7221, def:6564, skill:"Defense Buff L2" },
    { name:"สไลม์เพลิงกริช", class:"Warrior", hp:49233, atk:13129, def:4923, skill:"Double Strike L2" },
    { name:"สไลม์พิษเขี้ยว", class:"Mage", hp:36105, atk:19693, def:3282, skill:"AOE Attack L2" },
    { name:"สไลม์น้ำอมฤต", class:"Healer", hp:39387, atk:9190, def:3939, skill:"Heal L2" }
  ],
  302: [ // ทุ่งสไลม์นิรันดร์
    { name:"อสูรเมือกดำ", class:"Tank", hp:66925, atk:7362, def:6692, skill:"Defense Buff L2" },
    { name:"อสูรเมือกกรด", class:"Berserk", hp:53540, atk:14723, def:4685, skill:"Berserk Mode L2" },
    { name:"อสูรเมือกพิษร้าย", class:"Rogue", hp:38816, atk:21416, def:3346, skill:"Piercing Shot L2" },
    { name:"อสูรเมือกชโลมยา", class:"Healer", hp:40155, atk:9369, def:4015, skill:"AOE Heal L2" }
  ],
  303: [ // ทุ่งสไลม์นิรันดร์
    { name:"วุ้นราชายักษ์", class:"Tank", hp:68230, atk:7505, def:6823, skill:"Defense Buff L2" },
    { name:"วุ้นเดือดพลุ่ง", class:"Warrior", hp:51172, atk:13646, def:5117, skill:"Power Strike L2" },
    { name:"วุ้นจอมพิษ", class:"CC", hp:37526, atk:16375, def:4094, skill:"Stun L2" },
    { name:"วุ้นชโลมบุญ", class:"Healer", hp:40938, atk:9552, def:4094, skill:"Cleanse L2" }
  ],
  304: [ // ทุ่งสไลม์นิรันดร์
    { name:"ปีศาจเมือกอสูร", class:"Tank", hp:69560, atk:7652, def:6956, skill:"Defense Buff L2" },
    { name:"ปีศาจเมือกเหล็ก", class:"Berserk", hp:55648, atk:15303, def:4869, skill:"Berserk Mode L2" },
    { name:"ปีศาจเมือกสะกด", class:"Rogue", hp:40345, atk:22259, def:3478, skill:"Bomb L2" },
    { name:"ปีศาจเมือกฟื้นคืน", class:"Healer", hp:41736, atk:9738, def:4174, skill:"Heal L2" }
  ],
  305: [ // ทุ่งสไลม์นิรันดร์
    { name:"ราชันสไลม์มหึมา", hp:134742, atk:24112, def:10637, skill:"AOE Attack L3" },
    { name:"อัศวินสไลม์ผลึก", hp:61165, atk:16310, def:6117, skill:"Double Strike L3" },
    { name:"นักบวชสไลม์เมือก", hp:48932, atk:11417, def:4893, skill:"Cleanse L3" }
  ],
  306: [ // ป่าก็อบลิน
    { name:"ก็อบลินโล่หนาม", class:"Tank", hp:72299, atk:7953, def:7230, skill:"AOE Defense Buff L2" },
    { name:"ก็อบลินคลั่งเลือด", class:"Warrior", hp:54225, atk:14460, def:5422, skill:"Double Strike L2" },
    { name:"ก็อบลินธนูพิษ", class:"Mage", hp:39765, atk:21690, def:3615, skill:"Burn L2" },
    { name:"หมอผีก็อบลิน", class:"Healer", hp:43380, atk:10122, def:4338, skill:"Heal L2" }
  ],
  307: [ // ป่าก็อบลิน
    { name:"ก็อบลินขี่หมาป่า", class:"Tank", hp:73709, atk:8108, def:7371, skill:"AOE Defense Buff L2" },
    { name:"ก็อบลินขวานคู่", class:"Berserk", hp:58967, atk:16216, def:5160, skill:"Berserk Mode L2" },
    { name:"ก็อบลินจอมเวทดำ", class:"Rogue", hp:42751, atk:23587, def:3685, skill:"Piercing Shot L2" },
    { name:"ก็อบลินหมองู", class:"Healer", hp:44226, atk:10319, def:4423, skill:"AOE Heal L2" }
  ],
  308: [ // ป่าก็อบลิน
    { name:"โทรลป่าพิทักษ์", class:"Tank", hp:75147, atk:8266, def:7515, skill:"AOE Defense Buff L2" },
    { name:"โทรลป่าคลั่ง", class:"Warrior", hp:56360, atk:15029, def:5636, skill:"Power Strike L2" },
    { name:"โทรลนักล่าเงา", class:"CC", hp:41331, atk:18035, def:4509, skill:"AOE Silence L2" },
    { name:"โทรลหมอผีราก", class:"Healer", hp:45088, atk:10521, def:4509, skill:"Cleanse L2" }
  ],
  309: [ // ป่าก็อบลิน
    { name:"ยักษ์ป่าพิทักษ์", class:"Tank", hp:76612, atk:8427, def:7661, skill:"AOE Defense Buff L2" },
    { name:"ยักษ์ป่ากระบองเหล็ก", class:"Berserk", hp:61290, atk:16855, def:5363, skill:"Berserk Mode L2" },
    { name:"ยักษ์ป่าจอมมนตร์", class:"Rogue", hp:44435, atk:24516, def:3831, skill:"Bomb L2" },
    { name:"ยักษ์ป่านักบวชไม้", class:"Healer", hp:45967, atk:10726, def:4597, skill:"Heal L2" }
  ],
  310: [ // ป่าก็อบลิน
    { name:"จอมทัพก็อบลินเขี้ยวเหล็ก", hp:148401, atk:26556, def:11716, skill:"Berserk Mode L3" },
    { name:"แม่ทัพก็อบลินขวานคู่", hp:67366, atk:17964, def:6737, skill:"Double Strike L3" },
    { name:"หมองูก็อบลินมนตร์ดำ", hp:53894, atk:12575, def:5389, skill:"Cleanse L3" }
  ],
  311: [ // ที่ราบออร์ค
    { name:"ออร์คผู้พิทักษ์", class:"Tank", hp:79629, atk:8759, def:7963, skill:"Defense Buff L2" },
    { name:"ออร์คนักรบเถื่อน", class:"Warrior", hp:59722, atk:15926, def:5972, skill:"Double Strike L2" },
    { name:"ออร์คนักธนูเขี้ยวแหลม", class:"Mage", hp:43796, atk:23889, def:3981, skill:"AOE Attack L2" },
    { name:"หมอผีออร์คกระดูก", class:"Healer", hp:47777, atk:11148, def:4778, skill:"Heal L2" }
  ],
  312: [ // ที่ราบออร์ค
    { name:"ออร์คขี่หมูป่า", class:"Tank", hp:81182, atk:8930, def:8118, skill:"Defense Buff L2" },
    { name:"ออร์คเพชฌฆาต", class:"Berserk", hp:64945, atk:17860, def:5683, skill:"Berserk Mode L2" },
    { name:"ออร์คจอมเวทเลือด", class:"Rogue", hp:47085, atk:25978, def:4059, skill:"Piercing Shot L2" },
    { name:"ออร์คนักบวชกระดูก", class:"Healer", hp:48709, atk:11365, def:4871, skill:"AOE Heal L2" }
  ],
  313: [ // ที่ราบออร์ค
    { name:"ยักษ์ใหญ่หัวหน้าเผ่า", class:"Tank", hp:82765, atk:9104, def:8276, skill:"Defense Buff L2" },
    { name:"ยักษ์ใหญ่ขวานคู่", class:"Warrior", hp:62074, atk:16553, def:6207, skill:"Power Strike L2" },
    { name:"ยักษ์ใหญ่นักซุ่ม", class:"CC", hp:45521, atk:19864, def:4966, skill:"Silence L2" },
    { name:"ยักษ์ใหญ่หมอผี", class:"Healer", hp:49659, atk:11587, def:4966, skill:"Cleanse L2" }
  ],
  314: [ // ที่ราบออร์ค
    { name:"ไซคลอปส์พิทักษ์ทุ่ง", class:"Tank", hp:84379, atk:9282, def:8438, skill:"Defense Buff L2" },
    { name:"ไซคลอปส์กระทืบดิน", class:"Berserk", hp:67503, atk:18563, def:5907, skill:"Berserk Mode L2" },
    { name:"ไซคลอปส์สะกดจิต", class:"Rogue", hp:48940, atk:27001, def:4219, skill:"Bomb L2" },
    { name:"ไซคลอปส์นักบวชหิน", class:"Healer", hp:50627, atk:11813, def:5063, skill:"Heal L2" }
  ],
  315: [ // ที่ราบออร์ค
    { name:"หัวหน้าเผ่าออร์คทมิฬ", hp:163446, atk:29248, def:12904, skill:"AOE Attack L3" },
    { name:"ยอดนักรบออร์คสายเลือด", hp:74196, atk:19786, def:7420, skill:"Double Strike L3" },
    { name:"จอมเวทออร์คหินภูเขาไฟ", hp:59356, atk:13849, def:5935, skill:"Cleanse L3" }
  ],
  316: [ // ปราสาทเงามืด
    { name:"อัศวินเงามืด", class:"Tank", hp:87702, atk:9647, def:8770, skill:"AOE Defense Buff L2" },
    { name:"ไวเวิร์นทมิฬ", class:"Warrior", hp:65776, atk:17540, def:6578, skill:"Double Strike L2" },
    { name:"เนโครแมนเซอร์วิญญาณเก่า", class:"Mage", hp:48236, atk:26310, def:4385, skill:"Burn L2" },
    { name:"นักธนูรัตติกาล", class:"Healer", hp:52621, atk:12278, def:5262, skill:"Heal L2" }
  ],
  317: [ // ปราสาทเงามืด
    { name:"อัศวินกระดูกผุ", class:"Tank", hp:89412, atk:9835, def:8941, skill:"AOE Defense Buff L2" },
    { name:"การ์กอยล์หินดำ", class:"Berserk", hp:71529, atk:19671, def:6259, skill:"Berserk Mode L2" },
    { name:"จอมเวทเงามืด", class:"Rogue", hp:51859, atk:28612, def:4471, skill:"Piercing Shot L2" },
    { name:"นักบวชเงามืด", class:"Healer", hp:53647, atk:12518, def:5365, skill:"AOE Heal L2" }
  ],
  318: [ // ปราสาทเงามืด
    { name:"อัศวินวิญญาณพิทักษ์", class:"Tank", hp:91155, atk:10027, def:9116, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเลือดสาป", class:"Warrior", hp:68366, atk:18231, def:6837, skill:"Power Strike L2" },
    { name:"นักฆ่าเงาราตรี", class:"CC", hp:50135, atk:21877, def:5469, skill:"Charm L2" },
    { name:"นักบวชคำสาป", class:"Healer", hp:54693, atk:12762, def:5469, skill:"Cleanse L2" }
  ],
  319: [ // ปราสาทเงามืด
    { name:"โกเลมกระดูกยักษ์", class:"Tank", hp:92933, atk:10223, def:9293, skill:"AOE Defense Buff L2" },
    { name:"อัศวินดำผู้ทรยศ", class:"Berserk", hp:74346, atk:20445, def:6505, skill:"Berserk Mode L2" },
    { name:"จอมเวทมนตร์มืด", class:"Rogue", hp:53901, atk:29739, def:4647, skill:"Bomb L2" },
    { name:"ปีศาจนักบวชดำ", class:"Healer", hp:55760, atk:13011, def:5576, skill:"Heal L2" }
  ],
  320: [ // ปราสาทเงามืด
    { name:"ราชันมังกรแดง", hp:180016, atk:32213, def:14212, skill:"Berserk Mode L3" },
    { name:"อัศวินหวาดผวา", hp:81718, atk:21791, def:8172, skill:"Double Strike L3" },
    { name:"ศาสดาแห่งรัตติกาล", hp:65374, atk:15254, def:6538, skill:"Cleanse L3" }
  ],
  321: [ // เขาวงกตคริสตัล
    { name:"โกเลมคริสตัล", class:"Tank", hp:96593, atk:10625, def:9659, skill:"Defense Buff L2" },
    { name:"อัศวินแก้วเจียระไน", class:"Warrior", hp:72444, atk:19319, def:7244, skill:"Double Strike L2" },
    { name:"นักเวทคริสตัลเรืองแสง", class:"Mage", hp:53126, atk:28978, def:4830, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งแสง", class:"Healer", hp:57956, atk:13523, def:5796, skill:"Heal L2" }
  ],
  322: [ // เขาวงกตคริสตัล
    { name:"ยักษ์หินอัญมณี", class:"Tank", hp:98476, atk:10832, def:9848, skill:"Defense Buff L2" },
    { name:"อัศวินปริซึม", class:"Berserk", hp:78781, atk:21665, def:6893, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาคริสตัล", class:"Rogue", hp:57116, atk:31512, def:4924, skill:"Piercing Shot L2" },
    { name:"นักพรตอัญมณี", class:"Healer", hp:59086, atk:13787, def:5909, skill:"AOE Heal L2" }
  ],
  323: [ // เขาวงกตคริสตัล
    { name:"การ์เดี้ยนคริสตัลยักษ์", class:"Tank", hp:100396, atk:11044, def:10040, skill:"Defense Buff L2" },
    { name:"อัศวินสายฟ้าคริสตัล", class:"Warrior", hp:75297, atk:20079, def:7530, skill:"Power Strike L2" },
    { name:"จอมเวทมนตร์สะกดแสง", class:"CC", hp:55218, atk:24095, def:6024, skill:"AOE Stun L2" },
    { name:"นักบวชแสงบริสุทธิ์", class:"Healer", hp:60238, atk:14055, def:6024, skill:"Cleanse L2" }
  ],
  324: [ // เขาวงกตคริสตัล
    { name:"ไททันคริสตัลศักดิ์สิทธิ์", class:"Tank", hp:102354, atk:11259, def:10235, skill:"Defense Buff L2" },
    { name:"ดราก้อนคริสตัลจิ๋ว", class:"Berserk", hp:81883, atk:22518, def:7165, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงตัดเพชร", class:"Rogue", hp:59365, atk:32753, def:5118, skill:"Bomb L2" },
    { name:"เทพธิดาคริสตัล", class:"Healer", hp:61412, atk:14330, def:6141, skill:"Heal L2" }
  ],
  325: [ // เขาวงกตคริสตัล
    { name:"จ้าวเขาวงกตคริสตัล", hp:198265, atk:35479, def:15653, skill:"AOE Attack L3" },
    { name:"อัศวินปริซึมมรณะ", hp:90002, atk:24000, def:9000, skill:"Double Strike L3" },
    { name:"นักบวชแสงนิรันดร์", hp:72002, atk:16800, def:7200, skill:"Cleanse L3" }
  ],
  326: [ // ทะเลทรายวิญญาณ
    { name:"มัมมี่พิทักษ์สุสาน", class:"Tank", hp:106385, atk:11702, def:10638, skill:"AOE Defense Buff L2" },
    { name:"นักรบทรายศักดิ์สิทธิ์", class:"Warrior", hp:79789, atk:21277, def:7979, skill:"Double Strike L2" },
    { name:"จอมเวทวิญญาณทราย", class:"Mage", hp:58512, atk:31915, def:5319, skill:"Burn L2" },
    { name:"นักบวชแห่งซากศพ", class:"Healer", hp:63831, atk:14894, def:6383, skill:"Heal L2" }
  ],
  327: [ // ทะเลทรายวิญญาณ
    { name:"สฟิงซ์พิทักษ์", class:"Tank", hp:108459, atk:11931, def:10846, skill:"AOE Defense Buff L2" },
    { name:"แมงป่องยักษ์เพลิง", class:"Berserk", hp:86767, atk:23861, def:7592, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาทะเลทราย", class:"Rogue", hp:62906, atk:34707, def:5423, skill:"Piercing Shot L2" },
    { name:"หมอผีทรายศักดิ์สิทธิ์", class:"Healer", hp:65076, atk:15184, def:6508, skill:"AOE Heal L2" }
  ],
  328: [ // ทะเลทรายวิญญาณ
    { name:"อสูรทรายกลืนกิน", class:"Tank", hp:110574, atk:12163, def:11057, skill:"AOE Defense Buff L2" },
    { name:"นักรบผีดิบทะเลทราย", class:"Warrior", hp:82931, atk:22115, def:8293, skill:"Power Strike L2" },
    { name:"จอมเวทมนตร์สะกดทราย", class:"CC", hp:60816, atk:26538, def:6634, skill:"Stun L2" },
    { name:"นักบวชโอเอซิส", class:"Healer", hp:66345, atk:15480, def:6634, skill:"Cleanse L2" }
  ],
  329: [ // ทะเลทรายวิญญาณ
    { name:"โกเลมทรายเพลิง", class:"Tank", hp:112731, atk:12400, def:11273, skill:"AOE Defense Buff L2" },
    { name:"อัศวินหุ่นทรายศักดิ์สิทธิ์", class:"Berserk", hp:90184, atk:24801, def:7891, skill:"Berserk Mode L2" },
    { name:"นักธนูพายุทราย", class:"Rogue", hp:65384, atk:36074, def:5637, skill:"Bomb L2" },
    { name:"เทพีแห่งโอเอซิส", class:"Healer", hp:67638, atk:15782, def:6764, skill:"Heal L2" }
  ],
  330: [ // ทะเลทรายวิญญาณ
    { name:"ฟาโรห์ผู้คืนชีพ", hp:218365, atk:39076, def:17239, skill:"Berserk Mode L3" },
    { name:"องครักษ์มัมมี่นิรันดร์", hp:99127, atk:26434, def:9913, skill:"Double Strike L3" },
    { name:"นักบวชแห่งสุสานทอง", hp:79301, atk:18504, def:7930, skill:"Cleanse L3" }
  ],
  331: [ // หนองบึงพิษ
    { name:"ยักษ์หนองบึง", class:"Tank", hp:117170, atk:12889, def:11717, skill:"Defense Buff L2" },
    { name:"กบยักษ์พิษ", class:"Warrior", hp:87877, atk:23434, def:8788, skill:"Double Strike L2" },
    { name:"แม่มดหนองน้ำ", class:"Mage", hp:64443, atk:35151, def:5858, skill:"AOE Attack L2" },
    { name:"หมอยาสมุนไพรพิษ", class:"Healer", hp:70302, atk:16404, def:7030, skill:"Heal L2" }
  ],
  332: [ // หนองบึงพิษ
    { name:"เต่ายักษ์เกราะพิษ", class:"Tank", hp:119455, atk:13140, def:11945, skill:"Defense Buff L2" },
    { name:"จระเข้เพชฌฆาต", class:"Berserk", hp:95564, atk:26280, def:8362, skill:"Berserk Mode L2" },
    { name:"งูเห่ายักษ์แว่นทอง", class:"Rogue", hp:69284, atk:38225, def:5973, skill:"Piercing Shot L2" },
    { name:"นักบวชบึงมืด", class:"Healer", hp:71673, atk:16724, def:7167, skill:"AOE Heal L2" }
  ],
  333: [ // หนองบึงพิษ
    { name:"ฮิปโปยักษ์พิษบึง", class:"Tank", hp:121784, atk:13396, def:12178, skill:"Defense Buff L2" },
    { name:"นาคาพิษหนองน้ำ", class:"Warrior", hp:91338, atk:24357, def:9134, skill:"Power Strike L2" },
    { name:"แม่มดสะกดวิญญาณ", class:"CC", hp:66981, atk:29228, def:7307, skill:"AOE Silence L2" },
    { name:"นักพรตดอกบัวพิษ", class:"Healer", hp:73070, atk:17050, def:7307, skill:"Cleanse L2" }
  ],
  334: [ // หนองบึงพิษ
    { name:"ไฮดร้าพิษน้อย", class:"Tank", hp:124159, atk:13657, def:12416, skill:"Defense Buff L2" },
    { name:"อสูรบึงเน่าเปื่อย", class:"Berserk", hp:99327, atk:27315, def:8691, skill:"Berserk Mode L2" },
    { name:"นักฆ่าพรางตัวในหมอกพิษ", class:"Rogue", hp:72012, atk:39731, def:6208, skill:"Bomb L2" },
    { name:"เทพีแห่งหนองน้ำ", class:"Healer", hp:74495, atk:17382, def:7450, skill:"Heal L2" }
  ],
  335: [ // หนองบึงพิษ
    { name:"เจ้าแห่งหนองบึงมรณะ", hp:240502, atk:43037, def:18987, skill:"AOE Attack L3" },
    { name:"ไฮดร้าพิษสามหัว", hp:109175, atk:29113, def:10917, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งบึงดำ", hp:87340, atk:20379, def:8734, skill:"Cleanse L3" }
  ],
  336: [ // ภูเขาไฟอสูร
    { name:"ยักษ์หินลาวา", class:"Tank", hp:129048, atk:14195, def:12905, skill:"AOE Defense Buff L2" },
    { name:"อสูรเพลิงกรงเล็บ", class:"Warrior", hp:96786, atk:25810, def:9679, skill:"Double Strike L2" },
    { name:"จอมเวทเปลวไฟ", class:"Mage", hp:70977, atk:38714, def:6452, skill:"Burn L2" },
    { name:"นักบวชแห่งเถ้าถ่าน", class:"Healer", hp:77429, atk:18067, def:7743, skill:"Heal L2" }
  ],
  337: [ // ภูเขาไฟอสูร
    { name:"ซาลาแมนเดอร์ยักษ์", class:"Tank", hp:131565, atk:14472, def:13156, skill:"AOE Defense Buff L2" },
    { name:"มารเพลิงบ้าคลั่ง", class:"Berserk", hp:105252, atk:28944, def:9210, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาลาวา", class:"Rogue", hp:76308, atk:42101, def:6578, skill:"Piercing Shot L2" },
    { name:"หมอผีแห่งภูเขาไฟ", class:"Healer", hp:78939, atk:18419, def:7894, skill:"AOE Heal L2" }
  ],
  338: [ // ภูเขาไฟอสูร
    { name:"โกเลมลาวาไหลนอง", class:"Tank", hp:134130, atk:14754, def:13413, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะเพลิง", class:"Warrior", hp:100598, atk:26826, def:10060, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดไฟ", class:"CC", hp:73772, atk:32191, def:8048, skill:"Silence L2" },
    { name:"เทพีแห่งเถ้าธุลี", class:"Healer", hp:80478, atk:18778, def:8048, skill:"Cleanse L2" }
  ],
  339: [ // ภูเขาไฟอสูร
    { name:"ฟีนิกซ์ดำผู้ล่มสลาย", class:"Tank", hp:136746, atk:15042, def:13675, skill:"AOE Defense Buff L2" },
    { name:"ดราก้อนเพลิงน้อย", class:"Berserk", hp:109397, atk:30084, def:9572, skill:"Berserk Mode L2" },
    { name:"นักธนูอัคคี", class:"Rogue", hp:79313, atk:43759, def:6837, skill:"Bomb L2" },
    { name:"นักบวชศักดิ์สิทธิ์แห่งไฟ", class:"Healer", hp:82047, atk:19144, def:8205, skill:"Heal L2" }
  ],
  340: [ // ภูเขาไฟอสูร
    { name:"เจ้าภูเขาไฟปีศาจ", hp:264883, atk:47400, def:20912, skill:"Berserk Mode L3" },
    { name:"ซาลาแมนเดอร์ราชันเพลิง", hp:120243, atk:32064, def:12024, skill:"Double Strike L3" },
    { name:"นักบวชแห่งลาวาศักดิ์สิทธิ์", hp:96194, atk:22446, def:9620, skill:"Cleanse L3" }
  ],
  341: [ // ธารน้ำแข็งนิรันดร์
    { name:"โยติสหิมะ", class:"Tank", hp:142131, atk:15634, def:14213, skill:"Defense Buff L2" },
    { name:"หมาป่าน้ำแข็ง", class:"Warrior", hp:106598, atk:28426, def:10660, skill:"Double Strike L2" },
    { name:"แม่มดน้ำแข็ง", class:"Mage", hp:78172, atk:42639, def:7107, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งหิมะ", class:"Healer", hp:85278, atk:19898, def:8528, skill:"Heal L2" }
  ],
  342: [ // ธารน้ำแข็งนิรันดร์
    { name:"ยักษ์น้ำแข็งพิทักษ์", class:"Tank", hp:144902, atk:15939, def:14490, skill:"Defense Buff L2" },
    { name:"หมีขาวเพชฌฆาต", class:"Berserk", hp:115922, atk:31879, def:10143, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาหิมะ", class:"Rogue", hp:84043, atk:46369, def:7245, skill:"Piercing Shot L2" },
    { name:"หมอผีธารน้ำแข็ง", class:"Healer", hp:86941, atk:20286, def:8694, skill:"AOE Heal L2" }
  ],
  343: [ // ธารน้ำแข็งนิรันดร์
    { name:"โกเลมน้ำแข็งยักษ์", class:"Tank", hp:147728, atk:16250, def:14773, skill:"Defense Buff L2" },
    { name:"อัศวินเกราะน้ำแข็ง", class:"Warrior", hp:110796, atk:29546, def:11080, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดหนาว", class:"CC", hp:81250, atk:35455, def:8864, skill:"Charm L2" },
    { name:"เทพีแห่งลมหนาว", class:"Healer", hp:88637, atk:20682, def:8864, skill:"Cleanse L2" }
  ],
  344: [ // ธารน้ำแข็งนิรันดร์
    { name:"มังกรน้ำแข็งน้อย", class:"Tank", hp:150609, atk:16567, def:15061, skill:"Defense Buff L2" },
    { name:"ยักษ์หิมะจอมพลัง", class:"Berserk", hp:120487, atk:33134, def:10543, skill:"Berserk Mode L2" },
    { name:"นักธนูพายุหิมะ", class:"Rogue", hp:87353, atk:48195, def:7530, skill:"Bomb L2" },
    { name:"นักบวชแห่งขั้วโลก", class:"Healer", hp:90365, atk:21085, def:9037, skill:"Heal L2" }
  ],
  345: [ // ธารน้ำแข็งนิรันดร์
    { name:"ราชินีน้ำแข็งนิรันดร์", hp:291737, atk:52205, def:23032, skill:"AOE Attack L3" },
    { name:"โยติสหิมะจอมพิโรธ", hp:132433, atk:35315, def:13243, skill:"Double Strike L3" },
    { name:"นักบวชแห่งความหนาวเหน็บ", hp:105946, atk:24720, def:10595, skill:"Cleanse L3" }
  ],
  346: [ // นครใต้พิภพ
    { name:"อสูรถ้ำลึก", class:"Tank", hp:156540, atk:17219, def:15654, skill:"AOE Defense Buff L2" },
    { name:"นักรบเงาใต้ดิน", class:"Warrior", hp:117405, atk:31308, def:11740, skill:"Double Strike L2" },
    { name:"จอมเวทมืดใต้พิภพ", class:"Mage", hp:86097, atk:46962, def:7827, skill:"Burn L2" },
    { name:"นักบวชแห่งความมืด", class:"Healer", hp:93924, atk:21916, def:9392, skill:"Heal L2" }
  ],
  347: [ // นครใต้พิภพ
    { name:"ดาร์กเอลฟ์พิทักษ์", class:"Tank", hp:159592, atk:17555, def:15959, skill:"AOE Defense Buff L2" },
    { name:"ดาร์กเอลฟ์นักฆ่า", class:"Berserk", hp:127674, atk:35110, def:11171, skill:"Berserk Mode L2" },
    { name:"ดาร์กเอลฟ์นักธนู", class:"Rogue", hp:92563, atk:51069, def:7980, skill:"Piercing Shot L2" },
    { name:"ดาร์กเอลฟ์นักบวช", class:"Healer", hp:95755, atk:22343, def:9576, skill:"AOE Heal L2" }
  ],
  348: [ // นครใต้พิภพ
    { name:"แมงมุมยักษ์ราชินี", class:"Tank", hp:162704, atk:17897, def:16270, skill:"AOE Defense Buff L2" },
    { name:"อัศวินใยดำ", class:"Warrior", hp:122028, atk:32541, def:12203, skill:"Power Strike L2" },
    { name:"แม่มดใยพิษสะกด", class:"CC", hp:89487, atk:39049, def:9762, skill:"AOE Stun L2" },
    { name:"นักพรตใต้พิภพ", class:"Healer", hp:97623, atk:22779, def:9762, skill:"Cleanse L2" }
  ],
  349: [ // นครใต้พิภพ
    { name:"บีฮีมอธถ้ำลึก", class:"Tank", hp:165877, atk:18246, def:16588, skill:"AOE Defense Buff L2" },
    { name:"โกเลมหินใต้พิภพ", class:"Berserk", hp:132702, atk:36493, def:11611, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาไร้แสง", class:"Rogue", hp:96209, atk:53081, def:8294, skill:"Bomb L2" },
    { name:"เทพีแห่งนครมืด", class:"Healer", hp:99526, atk:23223, def:9953, skill:"Heal L2" }
  ],
  350: [ // นครใต้พิภพ
    { name:"จักรพรรดินครใต้พิภพ", hp:321313, atk:57498, def:25367, skill:"Berserk Mode L3" },
    { name:"แมงมุมราชินีมฤตยู", hp:145859, atk:38895, def:14585, skill:"Double Strike L3" },
    { name:"นักบวชแห่งรัตติกาลนิรันดร์", hp:116687, atk:27227, def:11669, skill:"Cleanse L3" }
  ],
  351: [ // สวนสวรรค์ร้าง
    { name:"ผู้พิทักษ์สวนศักดิ์สิทธิ์", class:"Tank", hp:172409, atk:18965, def:17241, skill:"Defense Buff L2" },
    { name:"อัศวินปีกขาวเสื่อมสลาย", class:"Warrior", hp:129307, atk:34482, def:12931, skill:"Double Strike L2" },
    { name:"นางฟ้าจอมเวทเศร้าหมอง", class:"Mage", hp:94825, atk:51723, def:8620, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งสวรรค์ร้าง", class:"Healer", hp:103446, atk:24137, def:10345, skill:"Heal L2" }
  ],
  352: [ // สวนสวรรค์ร้าง
    { name:"ต้นไม้ยักษ์วิญญาณ", class:"Tank", hp:175771, atk:19335, def:17577, skill:"Defense Buff L2" },
    { name:"กริฟฟินคลั่ง", class:"Berserk", hp:140617, atk:38670, def:12304, skill:"Berserk Mode L2" },
    { name:"นักฆ่าปีกเงา", class:"Rogue", hp:101947, atk:56247, def:8789, skill:"Piercing Shot L2" },
    { name:"เทพธิดาน้ำตา", class:"Healer", hp:105463, atk:24608, def:10546, skill:"AOE Heal L2" }
  ],
  353: [ // สวนสวรรค์ร้าง
    { name:"โกเลมไม้ศักดิ์สิทธิ์", class:"Tank", hp:179199, atk:19712, def:17920, skill:"Defense Buff L2" },
    { name:"อัศวินแสงเสื่อมทราม", class:"Warrior", hp:134399, atk:35840, def:13440, skill:"Power Strike L2" },
    { name:"นางฟ้าสะกดวิญญาณ", class:"CC", hp:98559, atk:43008, def:10752, skill:"Stun L2" },
    { name:"มหาปุโรหิตแห่งเอเดน", class:"Healer", hp:107519, atk:25088, def:10752, skill:"Cleanse L2" }
  ],
  354: [ // สวนสวรรค์ร้าง
    { name:"ยูนิคอร์นดำผู้แปดเปื้อน", class:"Tank", hp:182693, atk:20096, def:18269, skill:"Defense Buff L2" },
    { name:"เพกาซัสเพลิงพิโรธ", class:"Berserk", hp:146155, atk:40192, def:12789, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงจันทร์", class:"Rogue", hp:105962, atk:58462, def:9135, skill:"Bomb L2" },
    { name:"อาร์คแองเจิลผู้เศร้าโศก", class:"Healer", hp:109616, atk:25577, def:10962, skill:"Heal L2" }
  ],
  355: [ // สวนสวรรค์ร้าง
    { name:"เทพผู้ล่มสลายแห่งเอเดน", hp:353886, atk:63327, def:27938, skill:"AOE Attack L3" },
    { name:"อัศวินปีกดำไร้ศรัทธา", hp:160646, atk:42839, def:16064, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตผู้ถูกสาป", hp:128516, atk:29987, def:12851, skill:"Cleanse L3" }
  ],
  356: [ // หุบผาสายฟ้า
    { name:"นกอินทรีสายฟ้า", class:"Tank", hp:189888, atk:20888, def:18989, skill:"AOE Defense Buff L2" },
    { name:"นักรบเมฆพายุ", class:"Warrior", hp:142416, atk:37978, def:14242, skill:"Double Strike L2" },
    { name:"จอมเวทสายฟ้า", class:"Mage", hp:104438, atk:56966, def:9494, skill:"Burn L2" },
    { name:"นักบวชแห่งเมฆา", class:"Healer", hp:113933, atk:26584, def:11393, skill:"Heal L2" }
  ],
  357: [ // หุบผาสายฟ้า
    { name:"ยักษ์ฟ้าคะนอง", class:"Tank", hp:193590, atk:21295, def:19359, skill:"AOE Defense Buff L2" },
    { name:"ไซคลอปส์สายฟ้า", class:"Berserk", hp:154872, atk:42590, def:13551, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาพายุ", class:"Rogue", hp:112282, atk:61949, def:9680, skill:"Piercing Shot L2" },
    { name:"หมอผีแห่งลมกรด", class:"Healer", hp:116154, atk:27103, def:11615, skill:"AOE Heal L2" }
  ],
  358: [ // หุบผาสายฟ้า
    { name:"โกเลมหินสายฟ้า", class:"Tank", hp:197365, atk:21710, def:19737, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะทองแดง", class:"Warrior", hp:148024, atk:39473, def:14802, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดฟ้าร้อง", class:"CC", hp:108551, atk:47368, def:11842, skill:"AOE Silence L2" },
    { name:"เทพีแห่งสายลม", class:"Healer", hp:118419, atk:27631, def:11842, skill:"Cleanse L2" }
  ],
  359: [ // หุบผาสายฟ้า
    { name:"ไทฟูนอสูรจอมพิโรธ", class:"Tank", hp:201214, atk:22134, def:20121, skill:"AOE Defense Buff L2" },
    { name:"การ์กอยล์สายฟ้า", class:"Berserk", hp:160971, atk:44267, def:14085, skill:"Berserk Mode L2" },
    { name:"นักธนูจอมพายุ", class:"Rogue", hp:116704, atk:64389, def:10061, skill:"Bomb L2" },
    { name:"นักบวชแห่งเมฆพิโรธ", class:"Healer", hp:120728, atk:28170, def:12073, skill:"Heal L2" }
  ],
  360: [ // หุบผาสายฟ้า
    { name:"จ้าวหุบผาสายฟ้า", hp:389762, atk:69747, def:30771, skill:"Berserk Mode L3" },
    { name:"ไซคลอปส์อสุนีบาต", hp:176931, atk:47182, def:17693, skill:"Double Strike L3" },
    { name:"นักบวชแห่งพายุนิรันดร์", hp:141545, atk:33027, def:14154, skill:"Cleanse L3" }
  ],
  361: [ // ป่าต้องคำสาป
    { name:"หมีเงาต้องสาป", class:"Tank", hp:209138, atk:23005, def:20914, skill:"Defense Buff L2" },
    { name:"หมาป่าวิญญาณ", class:"Warrior", hp:156853, atk:41828, def:15685, skill:"Double Strike L2" },
    { name:"แม่มดป่าต้องสาป", class:"Mage", hp:115026, atk:62741, def:10457, skill:"AOE Attack L2" },
    { name:"นักพรตต้นไม้ผุ", class:"Healer", hp:125483, atk:29279, def:12548, skill:"Heal L2" }
  ],
  362: [ // ป่าต้องคำสาป
    { name:"เอนท์ดำผู้เสื่อมทราม", class:"Tank", hp:213216, atk:23454, def:21322, skill:"Defense Buff L2" },
    { name:"หมาป่าเลือดสาป", class:"Berserk", hp:170573, atk:46908, def:14925, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาในป่าลึก", class:"Rogue", hp:123665, atk:68229, def:10661, skill:"Piercing Shot L2" },
    { name:"หมอผีรากไม้ดำ", class:"Healer", hp:127930, atk:29850, def:12793, skill:"AOE Heal L2" }
  ],
  363: [ // ป่าต้องคำสาป
    { name:"โกเลมไม้ผุพัง", class:"Tank", hp:217374, atk:23911, def:21737, skill:"Defense Buff L2" },
    { name:"อัศวินไม้เลื้อยรัดกาย", class:"Warrior", hp:163030, atk:43475, def:16303, skill:"Power Strike L2" },
    { name:"แม่มดสะกดวิญญาณป่า", class:"CC", hp:119556, atk:52170, def:13042, skill:"Silence L2" },
    { name:"นักบวชป่าศักดิ์สิทธิ์เสื่อมสลาย", class:"Healer", hp:130424, atk:30432, def:13042, skill:"Cleanse L2" }
  ],
  364: [ // ป่าต้องคำสาป
    { name:"ทรีเอนท์เก่าแก่ผู้พิโรธ", class:"Tank", hp:221613, atk:24377, def:22161, skill:"Defense Buff L2" },
    { name:"หมีเงายักษ์", class:"Berserk", hp:177290, atk:48755, def:15513, skill:"Berserk Mode L2" },
    { name:"นักธนูใบไม้พิษ", class:"Rogue", hp:128535, atk:70916, def:11081, skill:"Bomb L2" },
    { name:"เทพีแห่งป่าร้าง", class:"Healer", hp:132968, atk:31026, def:13297, skill:"Heal L2" }
  ],
  365: [ // ป่าต้องคำสาป
    { name:"เจ้าป่าต้องคำสาป", hp:429275, atk:76818, def:33890, skill:"AOE Attack L3" },
    { name:"หมาป่าเงาจอมพิโรธ", hp:194869, atk:51965, def:19487, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งรากดำ", hp:155894, atk:36376, def:15589, skill:"Cleanse L3" }
  ],
  366: [ // วิหารจันทร์เสี้ยว
    { name:"องครักษ์วิหารจันทร์", class:"Tank", hp:230340, atk:25337, def:23034, skill:"AOE Defense Buff L2" },
    { name:"นักรบแสงจันทร์", class:"Warrior", hp:172755, atk:46068, def:17275, skill:"Double Strike L2" },
    { name:"จอมเวทราตรี", class:"Mage", hp:126687, atk:69102, def:11517, skill:"Burn L2" },
    { name:"นักบวชแห่งจันทร์เสี้ยว", class:"Healer", hp:138204, atk:32248, def:13820, skill:"Heal L2" }
  ],
  367: [ // วิหารจันทร์เสี้ยว
    { name:"รูปปั้นหินเฝ้าวิหาร", class:"Tank", hp:234831, atk:25831, def:23483, skill:"AOE Defense Buff L2" },
    { name:"นักฆ่าเงาจันทรา", class:"Berserk", hp:187865, atk:51663, def:16438, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงเงิน", class:"Rogue", hp:136202, atk:75146, def:11742, skill:"Piercing Shot L2" },
    { name:"หมอผีแห่งราตรีกาล", class:"Healer", hp:140899, atk:32876, def:14090, skill:"AOE Heal L2" }
  ],
  368: [ // วิหารจันทร์เสี้ยว
    { name:"โกเลมหินวิหารโบราณ", class:"Tank", hp:239411, atk:26335, def:23941, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะเงิน", class:"Warrior", hp:179558, atk:47882, def:17956, skill:"Power Strike L2" },
    { name:"แม่มดจันทร์สะกดจิต", class:"CC", hp:131676, atk:57459, def:14365, skill:"Charm L2" },
    { name:"มหาปุโรหิตแห่งจันทรา", class:"Healer", hp:143646, atk:33517, def:14365, skill:"Cleanse L2" }
  ],
  369: [ // วิหารจันทร์เสี้ยว
    { name:"หมาป่าจันทร์เพ็ญ", class:"Tank", hp:244079, atk:26849, def:24408, skill:"AOE Defense Buff L2" },
    { name:"อัศวินดำแห่งราตรีกาล", class:"Berserk", hp:195263, atk:53697, def:17086, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาไร้เสียง", class:"Rogue", hp:141566, atk:78105, def:12204, skill:"Bomb L2" },
    { name:"เทพีแห่งแสงจันทร์", class:"Healer", hp:146447, atk:34171, def:14645, skill:"Heal L2" }
  ],
  370: [ // วิหารจันทร์เสี้ยว
    { name:"มหาปุโรหิตแห่งจันทร์เสี้ยว", hp:472794, atk:84605, def:37326, skill:"Berserk Mode L3" },
    { name:"องครักษ์เงาจันทรา", hp:214623, atk:57233, def:21462, skill:"Double Strike L3" },
    { name:"นักฆ่าเงาราชินีราตรี", hp:171698, atk:40063, def:17170, skill:"Cleanse L3" }
  ],
  371: [ // เกาะร้างกลางทะเลเลือด
    { name:"โจรสลัดผีดิบ", class:"Tank", hp:253691, atk:27906, def:25369, skill:"Defense Buff L2" },
    { name:"นักรบทะเลเลือด", class:"Warrior", hp:190268, atk:50738, def:19027, skill:"Double Strike L2" },
    { name:"จอมเวทคลื่นเลือด", class:"Mage", hp:139530, atk:76107, def:12685, skill:"AOE Attack L2" },
    { name:"หมอเรือผีสิง", class:"Healer", hp:152215, atk:35517, def:15221, skill:"Heal L2" }
  ],
  372: [ // เกาะร้างกลางทะเลเลือด
    { name:"ครีเจอร์ทะเลลึกยักษ์", class:"Tank", hp:258638, atk:28450, def:25864, skill:"Defense Buff L2" },
    { name:"ฉลามปีศาจ", class:"Berserk", hp:206910, atk:56900, def:18105, skill:"Berserk Mode L2" },
    { name:"นักฆ่าใต้คลื่นเลือด", class:"Rogue", hp:150010, atk:82764, def:12932, skill:"Piercing Shot L2" },
    { name:"นักบวชเรืออับปาง", class:"Healer", hp:155183, atk:36209, def:15518, skill:"AOE Heal L2" }
  ],
  373: [ // เกาะร้างกลางทะเลเลือด
    { name:"โกเลมปะการังดำ", class:"Tank", hp:263681, atk:29005, def:26368, skill:"Defense Buff L2" },
    { name:"อัศวินเรือผี", class:"Warrior", hp:197761, atk:52736, def:19776, skill:"Power Strike L2" },
    { name:"เงือกสะกดจิตมรณะ", class:"CC", hp:145025, atk:63284, def:15821, skill:"AOE Stun L2" },
    { name:"เทพีแห่งเกาะร้าง", class:"Healer", hp:158209, atk:36915, def:15821, skill:"Cleanse L2" }
  ],
  374: [ // เกาะร้างกลางทะเลเลือด
    { name:"คราเคนน้อยแห่งทะเลเลือด", class:"Tank", hp:268823, atk:29571, def:26882, skill:"Defense Buff L2" },
    { name:"กัปตันผีดิบไร้หัว", class:"Berserk", hp:215059, atk:59141, def:18818, skill:"Berserk Mode L2" },
    { name:"นักฆ่าใต้เงาคลื่น", class:"Rogue", hp:155917, atk:86023, def:13441, skill:"Bomb L2" },
    { name:"นักบวชแห่งวิญญาณเรืออับปาง", class:"Healer", hp:161294, atk:37635, def:16129, skill:"Heal L2" }
  ],
  375: [ // เกาะร้างกลางทะเลเลือด
    { name:"กัปตันผีแห่งทะเลเลือด", hp:520724, atk:93182, def:41110, skill:"AOE Attack L3" },
    { name:"คราเคนพิฆาต", hp:236381, atk:63035, def:23638, skill:"Double Strike L3" },
    { name:"เงือกราชินีมรณะ", hp:189105, atk:44124, def:18911, skill:"Cleanse L3" }
  ],
  376: [ // ดงเห็ดพิษ
    { name:"ก้อนเห็ดยักษ์พิษ", class:"Tank", hp:279410, atk:30735, def:27941, skill:"AOE Defense Buff L2" },
    { name:"สปอร์แมงป่องพิษ", class:"Warrior", hp:209557, atk:55882, def:20956, skill:"Double Strike L2" },
    { name:"แม่มดเชื้อรา", class:"Mage", hp:153675, atk:83823, def:13970, skill:"Burn L2" },
    { name:"หมอยาเชื้อราศักดิ์สิทธิ์", class:"Healer", hp:167646, atk:39117, def:16765, skill:"Heal L2" }
  ],
  377: [ // ดงเห็ดพิษ
    { name:"ยักษ์เห็ดเรืองแสง", class:"Tank", hp:284858, atk:31334, def:28486, skill:"AOE Defense Buff L2" },
    { name:"แมลงยักษ์พิษร้าย", class:"Berserk", hp:227886, atk:62669, def:19940, skill:"Berserk Mode L2" },
    { name:"นักฆ่าในหมอกสปอร์", class:"Rogue", hp:165218, atk:91155, def:14243, skill:"Piercing Shot L2" },
    { name:"นักพรตดอกเห็ดบุญ", class:"Healer", hp:170915, atk:39880, def:17091, skill:"AOE Heal L2" }
  ],
  378: [ // ดงเห็ดพิษ
    { name:"โกเลมเชื้อราดำ", class:"Tank", hp:290413, atk:31945, def:29041, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะเห็ดพิษ", class:"Warrior", hp:217810, atk:58083, def:21781, skill:"Power Strike L2" },
    { name:"แม่มดสะกดสปอร์มึนเมา", class:"CC", hp:159727, atk:69699, def:17425, skill:"Stun L2" },
    { name:"เทพีแห่งเห็ดวิเศษ", class:"Healer", hp:174248, atk:40658, def:17425, skill:"Cleanse L2" }
  ],
  379: [ // ดงเห็ดพิษ
    { name:"ไฮดร้าเชื้อราพิษ", class:"Tank", hp:296076, atk:32568, def:29608, skill:"AOE Defense Buff L2" },
    { name:"อสูรสปอร์ระเบิด", class:"Berserk", hp:236861, atk:65137, def:20725, skill:"Berserk Mode L2" },
    { name:"นักธนูลูกดอกพิษ", class:"Rogue", hp:171724, atk:94744, def:14804, skill:"Bomb L2" },
    { name:"นักบวชแห่งป่าเห็ดต้องห้าม", class:"Healer", hp:177646, atk:41451, def:17765, skill:"Heal L2" }
  ],
  380: [ // ดงเห็ดพิษ
    { name:"เจ้าป่าเห็ดพิษมรณะ", hp:573513, atk:102629, def:45277, skill:"Berserk Mode L3" },
    { name:"ไฮดร้าสปอร์พิฆาต", hp:260345, atk:69426, def:26035, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งเชื้อราดำ", hp:208276, atk:48598, def:20828, skill:"Cleanse L3" }
  ],
  381: [ // ป้อมปราการเหล็กกล้า
    { name:"ทหารเหล็กยาม", class:"Tank", hp:307735, atk:33851, def:30774, skill:"Defense Buff L2" },
    { name:"นักรบเกราะเหล็ก", class:"Warrior", hp:230802, atk:61547, def:23080, skill:"Double Strike L2" },
    { name:"วิศวกรเวทมนตร์", class:"Mage", hp:169254, atk:92321, def:15387, skill:"AOE Attack L2" },
    { name:"นักบวชสนามรบ", class:"Healer", hp:184641, atk:43083, def:18464, skill:"Heal L2" }
  ],
  382: [ // ป้อมปราการเหล็กกล้า
    { name:"โกเลมเหล็กกล้า", class:"Tank", hp:313736, atk:34511, def:31374, skill:"Defense Buff L2" },
    { name:"อัศวินเครื่องจักรบ้าคลั่ง", class:"Berserk", hp:250989, atk:69022, def:21962, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาป้อมปราการ", class:"Rogue", hp:181967, atk:100396, def:15687, skill:"Piercing Shot L2" },
    { name:"หมอสนามเหล็กกล้า", class:"Healer", hp:188242, atk:43923, def:18824, skill:"AOE Heal L2" }
  ],
  383: [ // ป้อมปราการเหล็กกล้า
    { name:"ไททันเหล็กยักษ์", class:"Tank", hp:319854, atk:35184, def:31985, skill:"Defense Buff L2" },
    { name:"อัศวินเกราะเพชร", class:"Warrior", hp:239891, atk:63971, def:23989, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดโลหะ", class:"CC", hp:175920, atk:76765, def:19191, skill:"AOE Silence L2" },
    { name:"เทพีแห่งป้อมปราการ", class:"Healer", hp:191912, atk:44780, def:19191, skill:"Cleanse L2" }
  ],
  384: [ // ป้อมปราการเหล็กกล้า
    { name:"เมคาดราก้อนต้นแบบ", class:"Tank", hp:326091, atk:35870, def:32609, skill:"Defense Buff L2" },
    { name:"นายพลเหล็กกล้าไร้ปราณี", class:"Berserk", hp:260873, atk:71740, def:22826, skill:"Berserk Mode L2" },
    { name:"นักธนูกระสุนเหล็ก", class:"Rogue", hp:189133, atk:104349, def:16305, skill:"Bomb L2" },
    { name:"นักบวชผู้พิทักษ์ป้อม", class:"Healer", hp:195655, atk:45653, def:19565, skill:"Heal L2" }
  ],
  385: [ // ป้อมปราการเหล็กกล้า
    { name:"จอมทัพเหล็กกล้าไร้ปราณี", hp:631655, atk:113033, def:49868, skill:"AOE Attack L3" },
    { name:"เมคาดราก้อนพิฆาต", hp:286739, atk:76464, def:28674, skill:"Double Strike L3" },
    { name:"นักบวชแห่งป้อมปราการนิรันดร์", hp:229390, atk:53524, def:22939, skill:"Cleanse L3" }
  ],
  386: [ // ทุ่งดอกไม้ผีสิง
    { name:"ต้นไม้ผีสิงพิทักษ์ทุ่ง", class:"Tank", hp:338933, atk:37283, def:33893, skill:"AOE Defense Buff L2" },
    { name:"วิญญาณดอกไม้พิโรธ", class:"Warrior", hp:254200, atk:67787, def:25420, skill:"Double Strike L2" },
    { name:"แม่มดดอกไม้ราตรี", class:"Mage", hp:186413, atk:101680, def:16947, skill:"Burn L2" },
    { name:"นักบวชแห่งกลีบดอกโรยรา", class:"Healer", hp:203360, atk:47451, def:20336, skill:"Heal L2" }
  ],
  387: [ // ทุ่งดอกไม้ผีสิง
    { name:"หุ่นฟางผีสิง", class:"Tank", hp:345542, atk:38010, def:34554, skill:"AOE Defense Buff L2" },
    { name:"ผีเสื้อยักษ์พิษ", class:"Berserk", hp:276434, atk:76019, def:24188, skill:"Berserk Mode L2" },
    { name:"นักฆ่าในทุ่งหมอก", class:"Rogue", hp:200414, atk:110573, def:17277, skill:"Piercing Shot L2" },
    { name:"นางไม้แห่งดอกไม้ร่วง", class:"Healer", hp:207325, atk:48376, def:20733, skill:"AOE Heal L2" }
  ],
  388: [ // ทุ่งดอกไม้ผีสิง
    { name:"โกเลมดอกไม้ต้องสาป", class:"Tank", hp:352280, atk:38751, def:35228, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเกราะกลีบกุหลาบดำ", class:"Warrior", hp:264210, atk:70456, def:26421, skill:"Power Strike L2" },
    { name:"แม่มดสะกดกลิ่นหอมมรณะ", class:"CC", hp:193754, atk:84547, def:21137, skill:"Silence L2" },
    { name:"เทพีแห่งทุ่งดอกไม้ร้าง", class:"Healer", hp:211368, atk:49319, def:21137, skill:"Cleanse L2" }
  ],
  389: [ // ทุ่งดอกไม้ผีสิง
    { name:"ไฮดร้าเถาวัลย์ผีสิง", class:"Tank", hp:359150, atk:39506, def:35915, skill:"AOE Defense Buff L2" },
    { name:"อสูรดอกไม้เลือด", class:"Berserk", hp:287320, atk:79013, def:25140, skill:"Berserk Mode L2" },
    { name:"นักธนูหนามพิษ", class:"Rogue", hp:208307, atk:114928, def:17957, skill:"Bomb L2" },
    { name:"นักบวชแห่งฤดูใบไม้ร่วง", class:"Healer", hp:215490, atk:50281, def:21549, skill:"Heal L2" }
  ],
  390: [ // ทุ่งดอกไม้ผีสิง
    { name:"เจ้าแห่งทุ่งดอกไม้ผีสิง", hp:695691, atk:124492, def:54923, skill:"Berserk Mode L3" },
    { name:"วิญญาณกุหลาบดำมรณะ", hp:315807, atk:84216, def:31580, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งกลิ่นหอมมรณะ", hp:252646, atk:58950, def:25264, skill:"Cleanse L3" }
  ],
  391: [ // หุบเขาสุริยะ
    { name:"องครักษ์สุริยะ", class:"Tank", hp:373293, atk:41062, def:37329, skill:"Defense Buff L2" },
    { name:"นักรบเปลวสุริยัน", class:"Warrior", hp:279970, atk:74659, def:27997, skill:"Double Strike L2" },
    { name:"จอมเวทแสงอาทิตย์", class:"Mage", hp:205311, atk:111988, def:18665, skill:"AOE Attack L2" },
    { name:"นักบวชแห่งรุ่งอรุณ", class:"Healer", hp:223976, atk:52261, def:22398, skill:"Heal L2" }
  ],
  392: [ // หุบเขาสุริยะ
    { name:"ฟีนิกซ์ทองคำน้อย", class:"Tank", hp:380572, atk:41863, def:38057, skill:"Defense Buff L2" },
    { name:"สิงโตเพลิงสุริยะ", class:"Berserk", hp:304458, atk:83726, def:26640, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาแดด", class:"Rogue", hp:220732, atk:121783, def:19029, skill:"Piercing Shot L2" },
    { name:"มหาปุโรหิตแห่งสุริยะ", class:"Healer", hp:228343, atk:53280, def:22834, skill:"AOE Heal L2" }
  ],
  393: [ // หุบเขาสุริยะ
    { name:"โกเลมทองคำศักดิ์สิทธิ์", class:"Tank", hp:387993, atk:42679, def:38799, skill:"Defense Buff L2" },
    { name:"อัศวินเกราะสุริยะ", class:"Warrior", hp:290995, atk:77599, def:29099, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดแสงจ้า", class:"CC", hp:213396, atk:93118, def:23280, skill:"Charm L2" },
    { name:"เทพีแห่งอรุณรุ่ง", class:"Healer", hp:232796, atk:54319, def:23280, skill:"Cleanse L2" }
  ],
  394: [ // หุบเขาสุริยะ
    { name:"ไทแทนสุริยะยักษ์", class:"Tank", hp:395559, atk:43512, def:39556, skill:"Defense Buff L2" },
    { name:"ดราก้อนทองคำผู้พิทักษ์", class:"Berserk", hp:316447, atk:87023, def:27689, skill:"Berserk Mode L2" },
    { name:"นักธนูแสงทอง", class:"Rogue", hp:229424, atk:126579, def:19778, skill:"Bomb L2" },
    { name:"นักบวชสูงสุดแห่งสุริยัน", class:"Healer", hp:237335, atk:55378, def:23734, skill:"Heal L2" }
  ],
  395: [ // หุบเขาสุริยะ
    { name:"ราชันสุริยะทองคำ", hp:766219, atk:137113, def:60491, skill:"AOE Attack L3" },
    { name:"ฟีนิกซ์เพลิงสุริยัน", hp:347822, atk:92753, def:34782, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตแห่งดวงอาทิตย์", hp:278259, atk:64927, def:27825, skill:"Cleanse L3" }
  ],
  396: [ // บัลลังก์เทพจุติ
    { name:"องครักษ์เทพจุติ", class:"Tank", hp:411136, atk:45225, def:41114, skill:"AOE Defense Buff L2" },
    { name:"นักรบเทพผู้ล่มสลาย", class:"Warrior", hp:308352, atk:82227, def:30835, skill:"Double Strike L2" },
    { name:"จอมเวทแห่งบัลลังก์", class:"Mage", hp:226125, atk:123341, def:20557, skill:"Burn L2" },
    { name:"นักบวชสูงสุดแห่งเทวสถาน", class:"Healer", hp:246682, atk:57559, def:24668, skill:"Heal L2" }
  ],
  397: [ // บัลลังก์เทพจุติ
    { name:"ไททันจุติพิทักษ์บัลลังก์", class:"Tank", hp:419154, atk:46107, def:41915, skill:"AOE Defense Buff L2" },
    { name:"อัศวินเทพผู้พิโรธ", class:"Berserk", hp:335323, atk:92214, def:29341, skill:"Berserk Mode L2" },
    { name:"นักฆ่าเงาแห่งเทวสถาน", class:"Rogue", hp:243109, atk:134129, def:20958, skill:"Piercing Shot L2" },
    { name:"เทพีผู้เฝ้าบัลลังก์", class:"Healer", hp:251492, atk:58681, def:25149, skill:"AOE Heal L2" }
  ],
  398: [ // บัลลังก์เทพจุติ
    { name:"โกเลมเทพศักดิ์สิทธิ์", class:"Tank", hp:427327, atk:47006, def:42733, skill:"AOE Defense Buff L2" },
    { name:"อาร์คแองเจิลผู้ตกสวรรค์", class:"Warrior", hp:320495, atk:85465, def:32050, skill:"Power Strike L2" },
    { name:"จอมเวทสะกดมิติ", class:"CC", hp:235030, atk:102558, def:25640, skill:"AOE Stun L2" },
    { name:"มหาปุโรหิตสูงสุดแห่งจุติ", class:"Healer", hp:256396, atk:59826, def:25640, skill:"Cleanse L2" }
  ],
  399: [ // บัลลังก์เทพจุติ
    { name:"ไทแทนจุติจอมพลัง", class:"Tank", hp:435660, atk:47923, def:43566, skill:"AOE Defense Buff L2" },
    { name:"ดราก้อนเทพเจ้าจอมพิโรธ", class:"Berserk", hp:348528, atk:95845, def:30496, skill:"Berserk Mode L2" },
    { name:"นักธนูแห่งวันสิ้นโลก", class:"Rogue", hp:252683, atk:139411, def:21783, skill:"Bomb L2" },
    { name:"เทพธิดาผู้เฝ้าประตูมิติ", class:"Healer", hp:261396, atk:60992, def:26140, skill:"Heal L2" }
  ],
  400: [ // บัลลังก์เทพจุติ
    { name:"เทพจุติผู้ล่มสลาย", hp:843895, atk:151013, def:66623, skill:"Berserk Mode L3" },
    { name:"อัครเทวดาผู้ทรยศ", hp:383083, atk:102156, def:38309, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตแห่งวาระสุดท้าย", hp:306467, atk:71509, def:30646, skill:"Cleanse L3" }
  ],
  // ============ บิ๊กสเตจ 5 — ตำนาน (ด่าน 401-500) ============
  401: [ // ทุ่งสไลม์นิรันดร์
    { name:"สไลม์หินยักษ์", class:"Tank", hp:452816, atk:49810, def:45282, skill:"Defense Buff L3" },
    { name:"สไลม์เพลิงกริช", class:"Warrior", hp:339612, atk:90563, def:33961, skill:"Double Strike L3" },
    { name:"สไลม์พิษเขี้ยว", class:"Mage", hp:249049, atk:135845, def:22641, skill:"AOE Attack L3" },
    { name:"สไลม์น้ำอมฤต", class:"Healer", hp:271690, atk:63394, def:27169, skill:"Heal L3" }
  ],
  402: [ // ทุ่งสไลม์นิรันดร์
    { name:"อสูรเมือกดำ", class:"Tank", hp:461646, atk:50781, def:46165, skill:"Defense Buff L3" },
    { name:"อสูรเมือกกรด", class:"Berserk", hp:369317, atk:101562, def:32315, skill:"Berserk Mode L3" },
    { name:"อสูรเมือกพิษร้าย", class:"Rogue", hp:267755, atk:147727, def:23082, skill:"Piercing Shot L3" },
    { name:"อสูรเมือกชโลมยา", class:"Healer", hp:276988, atk:64630, def:27699, skill:"AOE Heal L3" }
  ],
  403: [ // ทุ่งสไลม์นิรันดร์
    { name:"วุ้นราชายักษ์", class:"Tank", hp:470648, atk:51771, def:47065, skill:"Defense Buff L3" },
    { name:"วุ้นเดือดพลุ่ง", class:"Warrior", hp:352986, atk:94130, def:35299, skill:"Power Strike L3" },
    { name:"วุ้นจอมพิษ", class:"CC", hp:258857, atk:112956, def:28239, skill:"Stun L3" },
    { name:"วุ้นชโลมบุญ", class:"Healer", hp:282389, atk:65891, def:28239, skill:"Cleanse L3" }
  ],
  404: [ // ทุ่งสไลม์นิรันดร์
    { name:"ปีศาจเมือกอสูร", class:"Tank", hp:479826, atk:52781, def:47983, skill:"Defense Buff L3" },
    { name:"ปีศาจเมือกเหล็ก", class:"Berserk", hp:383861, atk:105562, def:33588, skill:"Berserk Mode L3" },
    { name:"ปีศาจเมือกสะกด", class:"Rogue", hp:278299, atk:153544, def:23991, skill:"Bomb L3" },
    { name:"ปีศาจเมือกฟื้นคืน", class:"Healer", hp:287896, atk:67176, def:28790, skill:"Heal L3" }
  ],
  405: [ // ทุ่งสไลม์นิรันดร์
    { name:"ราชันสไลม์มหึมา", hp:929448, atk:166322, def:73377, skill:"AOE Attack L3" },
    { name:"อัศวินสไลม์ผลึก", hp:421920, atk:112513, def:42192, skill:"Double Strike L3" },
    { name:"นักบวชสไลม์เมือก", hp:337537, atk:78759, def:33754, skill:"Cleanse L3" }
  ],
  406: [ // ป่าก็อบลิน
    { name:"ก็อบลินโล่หนาม", class:"Tank", hp:498722, atk:54859, def:49872, skill:"AOE Defense Buff L3" },
    { name:"ก็อบลินคลั่งเลือด", class:"Warrior", hp:374041, atk:99744, def:37404, skill:"Double Strike L3" },
    { name:"ก็อบลินธนูพิษ", class:"Mage", hp:274297, atk:149616, def:24936, skill:"Burn L3" },
    { name:"หมอผีก็อบลิน", class:"Healer", hp:299233, atk:69821, def:29923, skill:"Heal L3" }
  ],
  407: [ // ป่าก็อบลิน
    { name:"ก็อบลินขี่หมาป่า", class:"Tank", hp:508447, atk:55929, def:50845, skill:"AOE Defense Buff L3" },
    { name:"ก็อบลินขวานคู่", class:"Berserk", hp:406757, atk:111858, def:35591, skill:"Berserk Mode L3" },
    { name:"ก็อบลินจอมเวทดำ", class:"Rogue", hp:294899, atk:162703, def:25422, skill:"Piercing Shot L3" },
    { name:"ก็อบลินหมองู", class:"Healer", hp:305068, atk:71183, def:30507, skill:"AOE Heal L3" }
  ],
  408: [ // ป่าก็อบลิน
    { name:"โทรลป่าพิทักษ์", class:"Tank", hp:518361, atk:57020, def:51836, skill:"AOE Defense Buff L3" },
    { name:"โทรลป่าคลั่ง", class:"Warrior", hp:388771, atk:103672, def:38877, skill:"Power Strike L3" },
    { name:"โทรลนักล่าเงา", class:"CC", hp:285099, atk:124407, def:31102, skill:"AOE Silence L3" },
    { name:"โทรลหมอผีราก", class:"Healer", hp:311017, atk:72571, def:31102, skill:"Cleanse L3" }
  ],
  409: [ // ป่าก็อบลิน
    { name:"ยักษ์ป่าพิทักษ์", class:"Tank", hp:528469, atk:58132, def:52847, skill:"AOE Defense Buff L3" },
    { name:"ยักษ์ป่ากระบองเหล็ก", class:"Berserk", hp:422776, atk:116263, def:36993, skill:"Berserk Mode L3" },
    { name:"ยักษ์ป่าจอมมนตร์", class:"Rogue", hp:306512, atk:169110, def:26423, skill:"Bomb L3" },
    { name:"ยักษ์ป่านักบวชไม้", class:"Healer", hp:317082, atk:73986, def:31708, skill:"Heal L3" }
  ],
  410: [ // ป่าก็อบลิน
    { name:"จอมทัพก็อบลินเขี้ยวเหล็ก", hp:1023673, atk:183183, def:80816, skill:"Berserk Mode L3" },
    { name:"แม่ทัพก็อบลินขวานคู่", hp:464693, atk:123918, def:46469, skill:"Double Strike L3" },
    { name:"หมองูก็อบลินมนตร์ดำ", hp:371755, atk:86742, def:37175, skill:"Cleanse L3" }
  ],
  411: [ // ที่ราบออร์ค
    { name:"ออร์คผู้พิทักษ์", class:"Tank", hp:549281, atk:60421, def:54928, skill:"Defense Buff L3" },
    { name:"ออร์คนักรบเถื่อน", class:"Warrior", hp:411961, atk:109856, def:41196, skill:"Double Strike L3" },
    { name:"ออร์คนักธนูเขี้ยวแหลม", class:"Mage", hp:302104, atk:164784, def:27464, skill:"AOE Attack L3" },
    { name:"หมอผีออร์คกระดูก", class:"Healer", hp:329568, atk:76899, def:32957, skill:"Heal L3" }
  ],
  412: [ // ที่ราบออร์ค
    { name:"ออร์คขี่หมูป่า", class:"Tank", hp:559992, atk:61599, def:55999, skill:"Defense Buff L3" },
    { name:"ออร์คเพชฌฆาต", class:"Berserk", hp:447993, atk:123198, def:39199, skill:"Berserk Mode L3" },
    { name:"ออร์คจอมเวทเลือด", class:"Rogue", hp:324795, atk:179197, def:28000, skill:"Piercing Shot L3" },
    { name:"ออร์คนักบวชกระดูก", class:"Healer", hp:335995, atk:78399, def:33600, skill:"AOE Heal L3" }
  ],
  413: [ // ที่ราบออร์ค
    { name:"ยักษ์ใหญ่หัวหน้าเผ่า", class:"Tank", hp:570912, atk:62800, def:57091, skill:"Defense Buff L3" },
    { name:"ยักษ์ใหญ่ขวานคู่", class:"Warrior", hp:428184, atk:114182, def:42818, skill:"Power Strike L3" },
    { name:"ยักษ์ใหญ่นักซุ่ม", class:"CC", hp:314001, atk:137019, def:34255, skill:"Silence L3" },
    { name:"ยักษ์ใหญ่หมอผี", class:"Healer", hp:342547, atk:79928, def:34255, skill:"Cleanse L3" }
  ],
  414: [ // ที่ราบออร์ค
    { name:"ไซคลอปส์พิทักษ์ทุ่ง", class:"Tank", hp:582044, atk:64025, def:58204, skill:"Defense Buff L3" },
    { name:"ไซคลอปส์กระทืบดิน", class:"Berserk", hp:465635, atk:128050, def:40743, skill:"Berserk Mode L3" },
    { name:"ไซคลอปส์สะกดจิต", class:"Rogue", hp:337586, atk:186254, def:29102, skill:"Bomb L3" },
    { name:"ไซคลอปส์นักบวชหิน", class:"Healer", hp:349227, atk:81486, def:34923, skill:"Heal L3" }
  ],
  415: [ // ที่ราบออร์ค
    { name:"หัวหน้าเผ่าออร์คทมิฬ", hp:1127449, atk:201754, def:89009, skill:"AOE Attack L3" },
    { name:"ยอดนักรบออร์คสายเลือด", hp:511803, atk:136481, def:51181, skill:"Double Strike L3" },
    { name:"จอมเวทออร์คหินภูเขาไฟ", hp:409441, atk:95536, def:40945, skill:"Cleanse L3" }
  ],
  416: [ // ปราสาทเงามืด
    { name:"อัศวินเงามืด", class:"Tank", hp:604965, atk:66546, def:60497, skill:"AOE Defense Buff L3" },
    { name:"ไวเวิร์นทมิฬ", class:"Warrior", hp:453724, atk:120993, def:45372, skill:"Double Strike L3" },
    { name:"เนโครแมนเซอร์วิญญาณเก่า", class:"Mage", hp:332731, atk:181490, def:30248, skill:"Burn L3" },
    { name:"นักธนูรัตติกาล", class:"Healer", hp:362979, atk:84695, def:36298, skill:"Heal L3" }
  ],
  417: [ // ปราสาทเงามืด
    { name:"อัศวินกระดูกผุ", class:"Tank", hp:616762, atk:67844, def:61676, skill:"AOE Defense Buff L3" },
    { name:"การ์กอยล์หินดำ", class:"Berserk", hp:493410, atk:135688, def:43173, skill:"Berserk Mode L3" },
    { name:"จอมเวทเงามืด", class:"Rogue", hp:357722, atk:197364, def:30838, skill:"Piercing Shot L3" },
    { name:"นักบวชเงามืด", class:"Healer", hp:370057, atk:86347, def:37006, skill:"AOE Heal L3" }
  ],
  418: [ // ปราสาทเงามืด
    { name:"อัศวินวิญญาณพิทักษ์", class:"Tank", hp:628789, atk:69167, def:62879, skill:"AOE Defense Buff L3" },
    { name:"อัศวินเลือดสาป", class:"Warrior", hp:471592, atk:125758, def:47159, skill:"Power Strike L3" },
    { name:"นักฆ่าเงาราตรี", class:"CC", hp:345834, atk:150909, def:37727, skill:"Charm L3" },
    { name:"นักบวชคำสาป", class:"Healer", hp:377273, atk:88030, def:37727, skill:"Cleanse L3" }
  ],
  419: [ // ปราสาทเงามืด
    { name:"โกเลมกระดูกยักษ์", class:"Tank", hp:641050, atk:70516, def:64105, skill:"AOE Defense Buff L3" },
    { name:"อัศวินดำผู้ทรยศ", class:"Berserk", hp:512840, atk:141031, def:44874, skill:"Berserk Mode L3" },
    { name:"จอมเวทมนตร์มืด", class:"Rogue", hp:371809, atk:205136, def:32053, skill:"Bomb L3" },
    { name:"ปีศาจนักบวชดำ", class:"Healer", hp:384630, atk:89747, def:38463, skill:"Heal L3" }
  ],
  420: [ // ปราสาทเงามืด
    { name:"ราชันมังกรแดง", hp:1241747, atk:222207, def:98033, skill:"Berserk Mode L3" },
    { name:"อัศวินหวาดผวา", hp:563687, atk:150317, def:56368, skill:"Double Strike L3" },
    { name:"ศาสดาแห่งรัตติกาล", hp:450951, atk:105222, def:45095, skill:"Cleanse L3" }
  ],
  421: [ // เขาวงกตคริสตัล
    { name:"โกเลมคริสตัล", class:"Tank", hp:666295, atk:73292, def:66630, skill:"Defense Buff L3" },
    { name:"อัศวินแก้วเจียระไน", class:"Warrior", hp:499721, atk:133259, def:49972, skill:"Double Strike L3" },
    { name:"นักเวทคริสตัลเรืองแสง", class:"Mage", hp:366462, atk:199889, def:33315, skill:"AOE Attack L3" },
    { name:"นักบวชแห่งแสง", class:"Healer", hp:399777, atk:93281, def:39978, skill:"Heal L3" }
  ],
  422: [ // เขาวงกตคริสตัล
    { name:"ยักษ์หินอัญมณี", class:"Tank", hp:679288, atk:74722, def:67929, skill:"Defense Buff L3" },
    { name:"อัศวินปริซึม", class:"Berserk", hp:543430, atk:149443, def:47550, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาคริสตัล", class:"Rogue", hp:393987, atk:217372, def:33964, skill:"Piercing Shot L3" },
    { name:"นักพรตอัญมณี", class:"Healer", hp:407573, atk:95100, def:40757, skill:"AOE Heal L3" }
  ],
  423: [ // เขาวงกตคริสตัล
    { name:"การ์เดี้ยนคริสตัลยักษ์", class:"Tank", hp:692534, atk:76179, def:69253, skill:"Defense Buff L3" },
    { name:"อัศวินสายฟ้าคริสตัล", class:"Warrior", hp:519401, atk:138507, def:51940, skill:"Power Strike L3" },
    { name:"จอมเวทมนตร์สะกดแสง", class:"CC", hp:380894, atk:166208, def:41552, skill:"AOE Stun L3" },
    { name:"นักบวชแสงบริสุทธิ์", class:"Healer", hp:415520, atk:96955, def:41552, skill:"Cleanse L3" }
  ],
  424: [ // เขาวงกตคริสตัล
    { name:"ไททันคริสตัลศักดิ์สิทธิ์", class:"Tank", hp:706038, atk:77664, def:70604, skill:"Defense Buff L3" },
    { name:"ดราก้อนคริสตัลจิ๋ว", class:"Berserk", hp:564831, atk:155328, def:49423, skill:"Berserk Mode L3" },
    { name:"นักธนูแสงตัดเพชร", class:"Rogue", hp:409502, atk:225932, def:35302, skill:"Bomb L3" },
    { name:"เทพธิดาคริสตัล", class:"Healer", hp:423623, atk:98845, def:42362, skill:"Heal L3" }
  ],
  425: [ // เขาวงกตคริสตัล
    { name:"จ้าวเขาวงกตคริสตัล", hp:1367631, atk:244734, def:107971, skill:"AOE Attack L3" },
    { name:"อัศวินปริซึมมรณะ", hp:620833, atk:165555, def:62083, skill:"Double Strike L3" },
    { name:"นักบวชแสงนิรันดร์", hp:496667, atk:115889, def:49666, skill:"Cleanse L3" }
  ],
  426: [ // ทะเลทรายวิญญาณ
    { name:"มัมมี่พิทักษ์สุสาน", class:"Tank", hp:733842, atk:80723, def:73384, skill:"AOE Defense Buff L3" },
    { name:"นักรบทรายศักดิ์สิทธิ์", class:"Warrior", hp:550382, atk:146768, def:55038, skill:"Double Strike L3" },
    { name:"จอมเวทวิญญาณทราย", class:"Mage", hp:403613, atk:220153, def:36692, skill:"Burn L3" },
    { name:"นักบวชแห่งซากศพ", class:"Healer", hp:440305, atk:102738, def:44031, skill:"Heal L3" }
  ],
  427: [ // ทะเลทรายวิญญาณ
    { name:"สฟิงซ์พิทักษ์", class:"Tank", hp:748152, atk:82297, def:74815, skill:"AOE Defense Buff L3" },
    { name:"แมงป่องยักษ์เพลิง", class:"Berserk", hp:598522, atk:164594, def:52371, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาทะเลทราย", class:"Rogue", hp:433928, atk:239409, def:37408, skill:"Piercing Shot L3" },
    { name:"หมอผีทรายศักดิ์สิทธิ์", class:"Healer", hp:448891, atk:104741, def:44889, skill:"AOE Heal L3" }
  ],
  428: [ // ทะเลทรายวิญญาณ
    { name:"อสูรทรายกลืนกิน", class:"Tank", hp:762741, atk:83902, def:76274, skill:"AOE Defense Buff L3" },
    { name:"นักรบผีดิบทะเลทราย", class:"Warrior", hp:572056, atk:152548, def:57206, skill:"Power Strike L3" },
    { name:"จอมเวทมนตร์สะกดทราย", class:"CC", hp:419508, atk:183058, def:45764, skill:"Stun L3" },
    { name:"นักบวชโอเอซิส", class:"Healer", hp:457645, atk:106784, def:45764, skill:"Cleanse L3" }
  ],
  429: [ // ทะเลทรายวิญญาณ
    { name:"โกเลมทรายเพลิง", class:"Tank", hp:777615, atk:85538, def:77761, skill:"AOE Defense Buff L3" },
    { name:"อัศวินหุ่นทรายศักดิ์สิทธิ์", class:"Berserk", hp:622092, atk:171075, def:54433, skill:"Berserk Mode L3" },
    { name:"นักธนูพายุทราย", class:"Rogue", hp:451017, atk:248837, def:38881, skill:"Bomb L3" },
    { name:"เทพีแห่งโอเอซิส", class:"Healer", hp:466569, atk:108866, def:46657, skill:"Heal L3" }
  ],
  430: [ // ทะเลทรายวิญญาณ
    { name:"ฟาโรห์ผู้คืนชีพ", hp:1506278, atk:269545, def:118917, skill:"Berserk Mode L3" },
    { name:"องครักษ์มัมมี่นิรันดร์", hp:683772, atk:182339, def:68377, skill:"Double Strike L3" },
    { name:"นักบวชแห่งสุสานทอง", hp:547017, atk:127637, def:54702, skill:"Cleanse L3" }
  ],
  431: [ // หนองบึงพิษ
    { name:"ยักษ์หนองบึง", class:"Tank", hp:808237, atk:88906, def:80824, skill:"Defense Buff L3" },
    { name:"กบยักษ์พิษ", class:"Warrior", hp:606178, atk:161647, def:60618, skill:"Double Strike L3" },
    { name:"แม่มดหนองน้ำ", class:"Mage", hp:444531, atk:242471, def:40412, skill:"AOE Attack L3" },
    { name:"หมอยาสมุนไพรพิษ", class:"Healer", hp:484942, atk:113153, def:48494, skill:"Heal L3" }
  ],
  432: [ // หนองบึงพิษ
    { name:"เต่ายักษ์เกราะพิษ", class:"Tank", hp:823998, atk:90640, def:82400, skill:"Defense Buff L3" },
    { name:"จระเข้เพชฌฆาต", class:"Berserk", hp:659198, atk:181280, def:57680, skill:"Berserk Mode L3" },
    { name:"งูเห่ายักษ์แว่นทอง", class:"Rogue", hp:477919, atk:263679, def:41200, skill:"Piercing Shot L3" },
    { name:"นักบวชบึงมืด", class:"Healer", hp:494399, atk:115360, def:49440, skill:"AOE Heal L3" }
  ],
  433: [ // หนองบึงพิษ
    { name:"ฮิปโปยักษ์พิษบึง", class:"Tank", hp:840066, atk:92407, def:84007, skill:"Defense Buff L3" },
    { name:"นาคาพิษหนองน้ำ", class:"Warrior", hp:630049, atk:168013, def:63005, skill:"Power Strike L3" },
    { name:"แม่มดสะกดวิญญาณ", class:"CC", hp:462036, atk:201616, def:50404, skill:"AOE Silence L3" },
    { name:"นักพรตดอกบัวพิษ", class:"Healer", hp:504040, atk:117609, def:50404, skill:"Cleanse L3" }
  ],
  434: [ // หนองบึงพิษ
    { name:"ไฮดร้าพิษน้อย", class:"Tank", hp:856447, atk:94209, def:85645, skill:"Defense Buff L3" },
    { name:"อสูรบึงเน่าเปื่อย", class:"Berserk", hp:685158, atk:188418, def:59951, skill:"Berserk Mode L3" },
    { name:"นักฆ่าพรางตัวในหมอกพิษ", class:"Rogue", hp:496739, atk:274063, def:42822, skill:"Bomb L3" },
    { name:"เทพีแห่งหนองน้ำ", class:"Healer", hp:513868, atk:119903, def:51387, skill:"Heal L3" }
  ],
  435: [ // หนองบึงพิษ
    { name:"เจ้าแห่งหนองบึงมรณะ", hp:1658981, atk:296870, def:130972, skill:"AOE Attack L3" },
    { name:"ไฮดร้าพิษสามหัว", hp:753090, atk:200824, def:75309, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งบึงดำ", hp:602472, atk:140577, def:60247, skill:"Cleanse L3" }
  ],
  436: [ // ภูเขาไฟอสูร
    { name:"ยักษ์หินลาวา", class:"Tank", hp:890174, atk:97919, def:89017, skill:"AOE Defense Buff L3" },
    { name:"อสูรเพลิงกรงเล็บ", class:"Warrior", hp:667631, atk:178035, def:66763, skill:"Double Strike L3" },
    { name:"จอมเวทเปลวไฟ", class:"Mage", hp:489596, atk:267052, def:44509, skill:"Burn L3" },
    { name:"นักบวชแห่งเถ้าถ่าน", class:"Healer", hp:534105, atk:124624, def:53410, skill:"Heal L3" }
  ],
  437: [ // ภูเขาไฟอสูร
    { name:"ซาลาแมนเดอร์ยักษ์", class:"Tank", hp:907533, atk:99829, def:90753, skill:"AOE Defense Buff L3" },
    { name:"มารเพลิงบ้าคลั่ง", class:"Berserk", hp:726026, atk:199657, def:63527, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาลาวา", class:"Rogue", hp:526369, atk:290410, def:45377, skill:"Piercing Shot L3" },
    { name:"หมอผีแห่งภูเขาไฟ", class:"Healer", hp:544520, atk:127055, def:54452, skill:"AOE Heal L3" }
  ],
  438: [ // ภูเขาไฟอสูร
    { name:"โกเลมลาวาไหลนอง", class:"Tank", hp:925230, atk:101775, def:92523, skill:"AOE Defense Buff L3" },
    { name:"อัศวินเกราะเพลิง", class:"Warrior", hp:693922, atk:185046, def:69392, skill:"Power Strike L3" },
    { name:"จอมเวทสะกดไฟ", class:"CC", hp:508876, atk:222055, def:55514, skill:"Silence L3" },
    { name:"เทพีแห่งเถ้าธุลี", class:"Healer", hp:555138, atk:129532, def:55514, skill:"Cleanse L3" }
  ],
  439: [ // ภูเขาไฟอสูร
    { name:"ฟีนิกซ์ดำผู้ล่มสลาย", class:"Tank", hp:943272, atk:103760, def:94327, skill:"AOE Defense Buff L3" },
    { name:"ดราก้อนเพลิงน้อย", class:"Berserk", hp:754617, atk:207520, def:66029, skill:"Berserk Mode L3" },
    { name:"นักธนูอัคคี", class:"Rogue", hp:547098, atk:301847, def:47164, skill:"Bomb L3" },
    { name:"นักบวชศักดิ์สิทธิ์แห่งไฟ", class:"Healer", hp:565963, atk:132058, def:56596, skill:"Heal L3" }
  ],
  440: [ // ภูเขาไฟอสูร
    { name:"เจ้าภูเขาไฟปีศาจ", hp:1827164, atk:326966, def:144250, skill:"Berserk Mode L3" },
    { name:"ซาลาแมนเดอร์ราชันเพลิง", hp:829436, atk:221183, def:82944, skill:"Double Strike L3" },
    { name:"นักบวชแห่งลาวาศักดิ์สิทธิ์", hp:663549, atk:154828, def:66355, skill:"Cleanse L3" }
  ],
  441: [ // ธารน้ำแข็งนิรันดร์
    { name:"โยติสหิมะ", class:"Tank", hp:980418, atk:107846, def:98042, skill:"Defense Buff L3" },
    { name:"หมาป่าน้ำแข็ง", class:"Warrior", hp:735313, atk:196084, def:73531, skill:"Double Strike L3" },
    { name:"แม่มดน้ำแข็ง", class:"Mage", hp:539230, atk:294125, def:49021, skill:"AOE Attack L3" },
    { name:"นักบวชแห่งหิมะ", class:"Healer", hp:588251, atk:137259, def:58825, skill:"Heal L3" }
  ],
  442: [ // ธารน้ำแข็งนิรันดร์
    { name:"ยักษ์น้ำแข็งพิทักษ์", class:"Tank", hp:999536, atk:109949, def:99954, skill:"Defense Buff L3" },
    { name:"หมีขาวเพชฌฆาต", class:"Berserk", hp:799629, atk:219898, def:69968, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาหิมะ", class:"Rogue", hp:579731, atk:319852, def:49977, skill:"Piercing Shot L3" },
    { name:"หมอผีธารน้ำแข็ง", class:"Healer", hp:599722, atk:139935, def:59972, skill:"AOE Heal L3" }
  ],
  443: [ // ธารน้ำแข็งนิรันดร์
    { name:"โกเลมน้ำแข็งยักษ์", class:"Tank", hp:1019027, atk:112093, def:101903, skill:"Defense Buff L3" },
    { name:"อัศวินเกราะน้ำแข็ง", class:"Warrior", hp:764270, atk:203805, def:76427, skill:"Power Strike L3" },
    { name:"จอมเวทสะกดหนาว", class:"CC", hp:560465, atk:244566, def:61142, skill:"Charm L3" },
    { name:"เทพีแห่งลมหนาว", class:"Healer", hp:611416, atk:142664, def:61142, skill:"Cleanse L3" }
  ],
  444: [ // ธารน้ำแข็งนิรันดร์
    { name:"มังกรน้ำแข็งน้อย", class:"Tank", hp:1038898, atk:114279, def:103890, skill:"Defense Buff L3" },
    { name:"ยักษ์หิมะจอมพลัง", class:"Berserk", hp:831118, atk:228558, def:72723, skill:"Berserk Mode L3" },
    { name:"นักธนูพายุหิมะ", class:"Rogue", hp:602561, atk:332447, def:51945, skill:"Bomb L3" },
    { name:"นักบวชแห่งขั้วโลก", class:"Healer", hp:623339, atk:145446, def:62334, skill:"Heal L3" }
  ],
  445: [ // ธารน้ำแข็งนิรันดร์
    { name:"ราชินีน้ำแข็งนิรันดร์", hp:2012398, atk:360113, def:158873, skill:"AOE Attack L3" },
    { name:"โยติสหิมะจอมพิโรธ", hp:913522, atk:243606, def:91353, skill:"Double Strike L3" },
    { name:"นักบวชแห่งความหนาวเหน็บ", hp:730818, atk:170524, def:73081, skill:"Cleanse L3" }
  ],
  446: [ // นครใต้พิภพ
    { name:"อสูรถ้ำลึก", class:"Tank", hp:1079810, atk:118779, def:107981, skill:"AOE Defense Buff L3" },
    { name:"นักรบเงาใต้ดิน", class:"Warrior", hp:809858, atk:215962, def:80986, skill:"Double Strike L3" },
    { name:"จอมเวทมืดใต้พิภพ", class:"Mage", hp:593896, atk:323943, def:53991, skill:"Burn L3" },
    { name:"นักบวชแห่งความมืด", class:"Healer", hp:647886, atk:151173, def:64789, skill:"Heal L3" }
  ],
  447: [ // นครใต้พิภพ
    { name:"ดาร์กเอลฟ์พิทักษ์", class:"Tank", hp:1100866, atk:121095, def:110087, skill:"AOE Defense Buff L3" },
    { name:"ดาร์กเอลฟ์นักฆ่า", class:"Berserk", hp:880693, atk:242191, def:77061, skill:"Berserk Mode L3" },
    { name:"ดาร์กเอลฟ์นักธนู", class:"Rogue", hp:638503, atk:352277, def:55043, skill:"Piercing Shot L3" },
    { name:"ดาร์กเอลฟ์นักบวช", class:"Healer", hp:660520, atk:154121, def:66052, skill:"AOE Heal L3" }
  ],
  448: [ // นครใต้พิภพ
    { name:"แมงมุมยักษ์ราชินี", class:"Tank", hp:1122333, atk:123457, def:112233, skill:"AOE Defense Buff L3" },
    { name:"อัศวินใยดำ", class:"Warrior", hp:841750, atk:224467, def:84175, skill:"Power Strike L3" },
    { name:"แม่มดใยพิษสะกด", class:"CC", hp:617283, atk:269360, def:67340, skill:"AOE Stun L3" },
    { name:"นักพรตใต้พิภพ", class:"Healer", hp:673400, atk:157127, def:67340, skill:"Cleanse L3" }
  ],
  449: [ // นครใต้พิภพ
    { name:"บีฮีมอธถ้ำลึก", class:"Tank", hp:1144219, atk:125864, def:114422, skill:"AOE Defense Buff L3" },
    { name:"โกเลมหินใต้พิภพ", class:"Berserk", hp:915375, atk:251728, def:80095, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาไร้แสง", class:"Rogue", hp:663647, atk:366150, def:57211, skill:"Bomb L3" },
    { name:"เทพีแห่งนครมืด", class:"Healer", hp:686531, atk:160191, def:68653, skill:"Heal L3" }
  ],
  450: [ // นครใต้พิภพ
    { name:"จักรพรรดินครใต้พิภพ", hp:2216409, atk:396621, def:174980, skill:"Berserk Mode L3" },
    { name:"แมงมุมราชินีมฤตยู", hp:1006133, atk:268302, def:100613, skill:"Double Strike L3" },
    { name:"นักบวชแห่งรัตติกาลนิรันดร์", hp:804907, atk:187811, def:80491, skill:"Cleanse L3" }
  ],
  451: [ // สวนสวรรค์ร้าง
    { name:"ผู้พิทักษ์สวนศักดิ์สิทธิ์", class:"Tank", hp:1189278, atk:130821, def:118928, skill:"Defense Buff L3" },
    { name:"อัศวินปีกขาวเสื่อมสลาย", class:"Warrior", hp:891959, atk:237856, def:89196, skill:"Double Strike L3" },
    { name:"นางฟ้าจอมเวทเศร้าหมอง", class:"Mage", hp:654103, atk:356784, def:59464, skill:"AOE Attack L3" },
    { name:"นักบวชแห่งสวรรค์ร้าง", class:"Healer", hp:713567, atk:166499, def:71357, skill:"Heal L3" }
  ],
  452: [ // สวนสวรรค์ร้าง
    { name:"ต้นไม้ยักษ์วิญญาณ", class:"Tank", hp:1212469, atk:133372, def:121247, skill:"Defense Buff L3" },
    { name:"กริฟฟินคลั่ง", class:"Berserk", hp:969975, atk:266743, def:84873, skill:"Berserk Mode L3" },
    { name:"นักฆ่าปีกเงา", class:"Rogue", hp:703232, atk:387990, def:60623, skill:"Piercing Shot L3" },
    { name:"เทพธิดาน้ำตา", class:"Healer", hp:727482, atk:169746, def:72748, skill:"AOE Heal L3" }
  ],
  453: [ // สวนสวรรค์ร้าง
    { name:"โกเลมไม้ศักดิ์สิทธิ์", class:"Tank", hp:1236113, atk:135972, def:123611, skill:"Defense Buff L3" },
    { name:"อัศวินแสงเสื่อมทราม", class:"Warrior", hp:927084, atk:247223, def:92708, skill:"Power Strike L3" },
    { name:"นางฟ้าสะกดวิญญาณ", class:"CC", hp:679862, atk:296667, def:74167, skill:"Stun L3" },
    { name:"มหาปุโรหิตแห่งเอเดน", class:"Healer", hp:741668, atk:173056, def:74167, skill:"Cleanse L3" }
  ],
  454: [ // สวนสวรรค์ร้าง
    { name:"ยูนิคอร์นดำผู้แปดเปื้อน", class:"Tank", hp:1260217, atk:138624, def:126022, skill:"Defense Buff L3" },
    { name:"เพกาซัสเพลิงพิโรธ", class:"Berserk", hp:1008173, atk:277248, def:88215, skill:"Berserk Mode L3" },
    { name:"นักธนูแสงจันทร์", class:"Rogue", hp:730926, atk:403269, def:63011, skill:"Bomb L3" },
    { name:"อาร์คแองเจิลผู้เศร้าโศก", class:"Healer", hp:756130, atk:176430, def:75613, skill:"Heal L3" }
  ],
  455: [ // สวนสวรรค์ร้าง
    { name:"เทพผู้ล่มสลายแห่งเอเดน", hp:2441103, atk:436829, def:192719, skill:"AOE Attack L3" },
    { name:"อัศวินปีกดำไร้ศรัทธา", hp:1108132, atk:295502, def:110813, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตผู้ถูกสาป", hp:886506, atk:206852, def:88650, skill:"Cleanse L3" }
  ],
  456: [ // หุบผาสายฟ้า
    { name:"นกอินทรีสายฟ้า", class:"Tank", hp:1309844, atk:144083, def:130984, skill:"AOE Defense Buff L3" },
    { name:"นักรบเมฆพายุ", class:"Warrior", hp:982383, atk:261969, def:98238, skill:"Double Strike L3" },
    { name:"จอมเวทสายฟ้า", class:"Mage", hp:720414, atk:392953, def:65492, skill:"Burn L3" },
    { name:"นักบวชแห่งเมฆา", class:"Healer", hp:785907, atk:183378, def:78591, skill:"Heal L3" }
  ],
  457: [ // หุบผาสายฟ้า
    { name:"ยักษ์ฟ้าคะนอง", class:"Tank", hp:1335386, atk:146892, def:133539, skill:"AOE Defense Buff L3" },
    { name:"ไซคลอปส์สายฟ้า", class:"Berserk", hp:1068309, atk:293785, def:93477, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาพายุ", class:"Rogue", hp:774524, atk:427324, def:66769, skill:"Piercing Shot L3" },
    { name:"หมอผีแห่งลมกรด", class:"Healer", hp:801232, atk:186954, def:80123, skill:"AOE Heal L3" }
  ],
  458: [ // หุบผาสายฟ้า
    { name:"โกเลมหินสายฟ้า", class:"Tank", hp:1361426, atk:149757, def:136143, skill:"AOE Defense Buff L3" },
    { name:"อัศวินเกราะทองแดง", class:"Warrior", hp:1021070, atk:272285, def:102107, skill:"Power Strike L3" },
    { name:"จอมเวทสะกดฟ้าร้อง", class:"CC", hp:748785, atk:326742, def:81686, skill:"AOE Silence L3" },
    { name:"เทพีแห่งสายลม", class:"Healer", hp:816856, atk:190600, def:81686, skill:"Cleanse L3" }
  ],
  459: [ // หุบผาสายฟ้า
    { name:"ไทฟูนอสูรจอมพิโรธ", class:"Tank", hp:1387974, atk:152677, def:138797, skill:"AOE Defense Buff L3" },
    { name:"การ์กอยล์สายฟ้า", class:"Berserk", hp:1110379, atk:305354, def:97158, skill:"Berserk Mode L3" },
    { name:"นักธนูจอมพายุ", class:"Rogue", hp:805025, atk:444152, def:69399, skill:"Bomb L3" },
    { name:"นักบวชแห่งเมฆพิโรธ", class:"Healer", hp:832785, atk:194316, def:83278, skill:"Heal L3" }
  ],
  460: [ // หุบผาสายฟ้า
    { name:"จ้าวหุบผาสายฟ้า", hp:2688576, atk:481113, def:212256, skill:"Berserk Mode L3" },
    { name:"ไซคลอปส์อสุนีบาต", hp:1220472, atk:325459, def:122047, skill:"Double Strike L3" },
    { name:"นักบวชแห่งพายุนิรันดร์", hp:976378, atk:227822, def:97637, skill:"Cleanse L3" }
  ],
  461: [ // ป่าต้องคำสาป
    { name:"หมีเงาต้องสาป", class:"Tank", hp:1442633, atk:158690, def:144263, skill:"Defense Buff L3" },
    { name:"หมาป่าวิญญาณ", class:"Warrior", hp:1081975, atk:288527, def:108197, skill:"Double Strike L3" },
    { name:"แม่มดป่าต้องสาป", class:"Mage", hp:793448, atk:432790, def:72132, skill:"AOE Attack L3" },
    { name:"นักพรตต้นไม้ผุ", class:"Healer", hp:865580, atk:201969, def:86558, skill:"Heal L3" }
  ],
  462: [ // ป่าต้องคำสาป
    { name:"เอนท์ดำผู้เสื่อมทราม", class:"Tank", hp:1470764, atk:161784, def:147076, skill:"Defense Buff L3" },
    { name:"หมาป่าเลือดสาป", class:"Berserk", hp:1176611, atk:323568, def:102954, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาในป่าลึก", class:"Rogue", hp:853043, atk:470645, def:73538, skill:"Piercing Shot L3" },
    { name:"หมอผีรากไม้ดำ", class:"Healer", hp:882459, atk:205907, def:88246, skill:"AOE Heal L3" }
  ],
  463: [ // ป่าต้องคำสาป
    { name:"โกเลมไม้ผุพัง", class:"Tank", hp:1499444, atk:164939, def:149944, skill:"Defense Buff L3" },
    { name:"อัศวินไม้เลื้อยรัดกาย", class:"Warrior", hp:1124583, atk:299889, def:112458, skill:"Power Strike L3" },
    { name:"แม่มดสะกดวิญญาณป่า", class:"CC", hp:824694, atk:359867, def:89967, skill:"Silence L3" },
    { name:"นักบวชป่าศักดิ์สิทธิ์เสื่อมสลาย", class:"Healer", hp:899667, atk:209922, def:89967, skill:"Cleanse L3" }
  ],
  464: [ // ป่าต้องคำสาป
    { name:"ทรีเอนท์เก่าแก่ผู้พิโรธ", class:"Tank", hp:1528683, atk:168155, def:152868, skill:"Defense Buff L3" },
    { name:"หมีเงายักษ์", class:"Berserk", hp:1222947, atk:336310, def:107008, skill:"Berserk Mode L3" },
    { name:"นักธนูใบไม้พิษ", class:"Rogue", hp:886636, atk:489179, def:76434, skill:"Bomb L3" },
    { name:"เทพีแห่งป่าร้าง", class:"Healer", hp:917210, atk:214016, def:91721, skill:"Heal L3" }
  ],
  465: [ // ป่าต้องคำสาป
    { name:"เจ้าป่าต้องคำสาป", hp:2961137, atk:529888, def:233774, skill:"AOE Attack L3" },
    { name:"หมาป่าเงาจอมพิโรธ", hp:1344201, atk:358454, def:134420, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งรากดำ", hp:1075360, atk:250917, def:107536, skill:"Cleanse L3" }
  ],
  466: [ // วิหารจันทร์เสี้ยว
    { name:"องครักษ์วิหารจันทร์", class:"Tank", hp:1588883, atk:174777, def:158888, skill:"AOE Defense Buff L3" },
    { name:"นักรบแสงจันทร์", class:"Warrior", hp:1191662, atk:317777, def:119166, skill:"Double Strike L3" },
    { name:"จอมเวทราตรี", class:"Mage", hp:873886, atk:476665, def:79444, skill:"Burn L3" },
    { name:"นักบวชแห่งจันทร์เสี้ยว", class:"Healer", hp:953330, atk:222444, def:95333, skill:"Heal L3" }
  ],
  467: [ // วิหารจันทร์เสี้ยว
    { name:"รูปปั้นหินเฝ้าวิหาร", class:"Tank", hp:1619867, atk:178185, def:161987, skill:"AOE Defense Buff L3" },
    { name:"นักฆ่าเงาจันทรา", class:"Berserk", hp:1295893, atk:356371, def:113391, skill:"Berserk Mode L3" },
    { name:"นักธนูแสงเงิน", class:"Rogue", hp:939523, atk:518357, def:80993, skill:"Piercing Shot L3" },
    { name:"หมอผีแห่งราตรีกาล", class:"Healer", hp:971920, atk:226781, def:97192, skill:"AOE Heal L3" }
  ],
  468: [ // วิหารจันทร์เสี้ยว
    { name:"โกเลมหินวิหารโบราณ", class:"Tank", hp:1651454, atk:181660, def:165145, skill:"AOE Defense Buff L3" },
    { name:"อัศวินเกราะเงิน", class:"Warrior", hp:1238590, atk:330291, def:123859, skill:"Power Strike L3" },
    { name:"แม่มดจันทร์สะกดจิต", class:"CC", hp:908300, atk:396349, def:99087, skill:"Charm L3" },
    { name:"มหาปุโรหิตแห่งจันทรา", class:"Healer", hp:990872, atk:231204, def:99087, skill:"Cleanse L3" }
  ],
  469: [ // วิหารจันทร์เสี้ยว
    { name:"หมาป่าจันทร์เพ็ญ", class:"Tank", hp:1683657, atk:185202, def:168366, skill:"AOE Defense Buff L3" },
    { name:"อัศวินดำแห่งราตรีกาล", class:"Berserk", hp:1346926, atk:370405, def:117856, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาไร้เสียง", class:"Rogue", hp:976521, atk:538770, def:84183, skill:"Bomb L3" },
    { name:"เทพีแห่งแสงจันทร์", class:"Healer", hp:1010194, atk:235712, def:101019, skill:"Heal L3" }
  ],
  470: [ // วิหารจันทร์เสี้ยว
    { name:"มหาปุโรหิตแห่งจันทร์เสี้ยว", hp:3261329, atk:583606, def:257473, skill:"Berserk Mode L3" },
    { name:"องครักษ์เงาจันทรา", hp:1480471, atk:394793, def:148048, skill:"Double Strike L3" },
    { name:"นักฆ่าเงาราชินีราตรี", hp:1184377, atk:276354, def:118437, skill:"Cleanse L3" }
  ],
  471: [ // เกาะร้างกลางทะเลเลือด
    { name:"โจรสลัดผีดิบ", class:"Tank", hp:1749960, atk:192496, def:174996, skill:"Defense Buff L3" },
    { name:"นักรบทะเลเลือด", class:"Warrior", hp:1312470, atk:349992, def:131247, skill:"Double Strike L3" },
    { name:"จอมเวทคลื่นเลือด", class:"Mage", hp:962478, atk:524988, def:87498, skill:"AOE Attack L3" },
    { name:"หมอเรือผีสิง", class:"Healer", hp:1049976, atk:244994, def:104998, skill:"Heal L3" }
  ],
  472: [ // เกาะร้างกลางทะเลเลือด
    { name:"ครีเจอร์ทะเลลึกยักษ์", class:"Tank", hp:1784084, atk:196249, def:178408, skill:"Defense Buff L3" },
    { name:"ฉลามปีศาจ", class:"Berserk", hp:1427267, atk:392499, def:124886, skill:"Berserk Mode L3" },
    { name:"นักฆ่าใต้คลื่นเลือด", class:"Rogue", hp:1034769, atk:570907, def:89204, skill:"Piercing Shot L3" },
    { name:"นักบวชเรืออับปาง", class:"Healer", hp:1070451, atk:249772, def:107045, skill:"AOE Heal L3" }
  ],
  473: [ // เกาะร้างกลางทะเลเลือด
    { name:"โกเลมปะการังดำ", class:"Tank", hp:1818874, atk:200076, def:181887, skill:"Defense Buff L3" },
    { name:"อัศวินเรือผี", class:"Warrior", hp:1364155, atk:363775, def:136416, skill:"Power Strike L3" },
    { name:"เงือกสะกดจิตมรณะ", class:"CC", hp:1000381, atk:436530, def:109132, skill:"AOE Stun L3" },
    { name:"เทพีแห่งเกาะร้าง", class:"Healer", hp:1091324, atk:254642, def:109132, skill:"Cleanse L3" }
  ],
  474: [ // เกาะร้างกลางทะเลเลือด
    { name:"คราเคนน้อยแห่งทะเลเลือด", class:"Tank", hp:1854342, atk:203978, def:185434, skill:"Defense Buff L3" },
    { name:"กัปตันผีดิบไร้หัว", class:"Berserk", hp:1483474, atk:407955, def:129804, skill:"Berserk Mode L3" },
    { name:"นักฆ่าใต้เงาคลื่น", class:"Rogue", hp:1075518, atk:593389, def:92717, skill:"Bomb L3" },
    { name:"นักบวชแห่งวิญญาณเรืออับปาง", class:"Healer", hp:1112605, atk:259608, def:111261, skill:"Heal L3" }
  ],
  475: [ // เกาะร้างกลางทะเลเลือด
    { name:"กัปตันผีแห่งทะเลเลือด", hp:3591954, atk:642771, def:283575, skill:"AOE Attack L3" },
    { name:"คราเคนพิฆาต", hp:1630557, atk:434815, def:163056, skill:"Double Strike L3" },
    { name:"เงือกราชินีมรณะ", hp:1304446, atk:304371, def:130444, skill:"Cleanse L3" }
  ],
  476: [ // ดงเห็ดพิษ
    { name:"ก้อนเห็ดยักษ์พิษ", class:"Tank", hp:1927366, atk:212010, def:192737, skill:"AOE Defense Buff L3" },
    { name:"สปอร์แมงป่องพิษ", class:"Warrior", hp:1445525, atk:385473, def:144552, skill:"Double Strike L3" },
    { name:"แม่มดเชื้อรา", class:"Mage", hp:1060052, atk:578210, def:96368, skill:"Burn L3" },
    { name:"หมอยาเชื้อราศักดิ์สิทธิ์", class:"Healer", hp:1156420, atk:269831, def:115642, skill:"Heal L3" }
  ],
  477: [ // ดงเห็ดพิษ
    { name:"ยักษ์เห็ดเรืองแสง", class:"Tank", hp:1964950, atk:216145, def:196495, skill:"AOE Defense Buff L3" },
    { name:"แมลงยักษ์พิษร้าย", class:"Berserk", hp:1571960, atk:432289, def:137547, skill:"Berserk Mode L3" },
    { name:"นักฆ่าในหมอกสปอร์", class:"Rogue", hp:1139671, atk:628784, def:98248, skill:"Piercing Shot L3" },
    { name:"นักพรตดอกเห็ดบุญ", class:"Healer", hp:1178970, atk:275093, def:117897, skill:"AOE Heal L3" }
  ],
  478: [ // ดงเห็ดพิษ
    { name:"โกเลมเชื้อราดำ", class:"Tank", hp:2003267, atk:220359, def:200327, skill:"AOE Defense Buff L3" },
    { name:"อัศวินเกราะเห็ดพิษ", class:"Warrior", hp:1502450, atk:400653, def:150245, skill:"Power Strike L3" },
    { name:"แม่มดสะกดสปอร์มึนเมา", class:"CC", hp:1101797, atk:480784, def:120196, skill:"Stun L3" },
    { name:"เทพีแห่งเห็ดวิเศษ", class:"Healer", hp:1201960, atk:280457, def:120196, skill:"Cleanse L3" }
  ],
  479: [ // ดงเห็ดพิษ
    { name:"ไฮดร้าเชื้อราพิษ", class:"Tank", hp:2042330, atk:224656, def:204233, skill:"AOE Defense Buff L3" },
    { name:"อสูรสปอร์ระเบิด", class:"Berserk", hp:1633864, atk:449313, def:142963, skill:"Berserk Mode L3" },
    { name:"นักธนูลูกดอกพิษ", class:"Rogue", hp:1184552, atk:653546, def:102117, skill:"Bomb L3" },
    { name:"นักบวชแห่งป่าเห็ดต้องห้าม", class:"Healer", hp:1225398, atk:285926, def:122540, skill:"Heal L3" }
  ],
  480: [ // ดงเห็ดพิษ
    { name:"เจ้าป่าเห็ดพิษมรณะ", hp:3956096, atk:707933, def:312323, skill:"Berserk Mode L3" },
    { name:"ไฮดร้าสปอร์พิฆาต", hp:1795860, atk:478896, def:179586, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งเชื้อราดำ", hp:1436687, atk:335227, def:143668, skill:"Cleanse L3" }
  ],
  481: [ // ป้อมปราการเหล็กกล้า
    { name:"ทหารเหล็กยาม", class:"Tank", hp:2122758, atk:233503, def:212276, skill:"Defense Buff L3" },
    { name:"นักรบเกราะเหล็ก", class:"Warrior", hp:1592068, atk:424552, def:159207, skill:"Double Strike L3" },
    { name:"วิศวกรเวทมนตร์", class:"Mage", hp:1167517, atk:636827, def:106138, skill:"AOE Attack L3" },
    { name:"นักบวชสนามรบ", class:"Healer", hp:1273655, atk:297186, def:127365, skill:"Heal L3" }
  ],
  482: [ // ป้อมปราการเหล็กกล้า
    { name:"โกเลมเหล็กกล้า", class:"Tank", hp:2164152, atk:238057, def:216415, skill:"Defense Buff L3" },
    { name:"อัศวินเครื่องจักรบ้าคลั่ง", class:"Berserk", hp:1731321, atk:476113, def:151491, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาป้อมปราการ", class:"Rogue", hp:1255208, atk:692529, def:108208, skill:"Piercing Shot L3" },
    { name:"หมอสนามเหล็กกล้า", class:"Healer", hp:1298491, atk:302981, def:129849, skill:"AOE Heal L3" }
  ],
  483: [ // ป้อมปราการเหล็กกล้า
    { name:"ไททันเหล็กยักษ์", class:"Tank", hp:2206353, atk:242699, def:220635, skill:"Defense Buff L3" },
    { name:"อัศวินเกราะเพชร", class:"Warrior", hp:1654764, atk:441271, def:165476, skill:"Power Strike L3" },
    { name:"จอมเวทสะกดโลหะ", class:"CC", hp:1213494, atk:529525, def:132381, skill:"AOE Silence L3" },
    { name:"เทพีแห่งป้อมปราการ", class:"Healer", hp:1323812, atk:308889, def:132381, skill:"Cleanse L3" }
  ],
  484: [ // ป้อมปราการเหล็กกล้า
    { name:"เมคาดราก้อนต้นแบบ", class:"Tank", hp:2249376, atk:247431, def:224938, skill:"Defense Buff L3" },
    { name:"นายพลเหล็กกล้าไร้ปราณี", class:"Berserk", hp:1799501, atk:494863, def:157456, skill:"Berserk Mode L3" },
    { name:"นักธนูกระสุนเหล็ก", class:"Rogue", hp:1304638, atk:719800, def:112469, skill:"Bomb L3" },
    { name:"นักบวชผู้พิทักษ์ป้อม", class:"Healer", hp:1349626, atk:314913, def:134963, skill:"Heal L3" }
  ],
  485: [ // ป้อมปราการเหล็กกล้า
    { name:"จอมทัพเหล็กกล้าไร้ปราณี", hp:4357154, atk:779701, def:343986, skill:"AOE Attack L3" },
    { name:"เมคาดราก้อนพิฆาต", hp:1977918, atk:527445, def:197792, skill:"Double Strike L3" },
    { name:"นักบวชแห่งป้อมปราการนิรันดร์", hp:1582336, atk:369211, def:158233, skill:"Cleanse L3" }
  ],
  486: [ // ทุ่งดอกไม้ผีสิง
    { name:"ต้นไม้ผีสิงพิทักษ์ทุ่ง", class:"Tank", hp:2337957, atk:257175, def:233796, skill:"AOE Defense Buff L3" },
    { name:"วิญญาณดอกไม้พิโรธ", class:"Warrior", hp:1753468, atk:467591, def:175347, skill:"Double Strike L3" },
    { name:"แม่มดดอกไม้ราตรี", class:"Mage", hp:1285877, atk:701387, def:116898, skill:"Burn L3" },
    { name:"นักบวชแห่งกลีบดอกโรยรา", class:"Healer", hp:1402774, atk:327314, def:140277, skill:"Heal L3" }
  ],
  487: [ // ทุ่งดอกไม้ผีสิง
    { name:"หุ่นฟางผีสิง", class:"Tank", hp:2383548, atk:262190, def:238355, skill:"AOE Defense Buff L3" },
    { name:"ผีเสื้อยักษ์พิษ", class:"Berserk", hp:1906838, atk:524380, def:166848, skill:"Berserk Mode L3" },
    { name:"นักฆ่าในทุ่งหมอก", class:"Rogue", hp:1382458, atk:762735, def:119177, skill:"Piercing Shot L3" },
    { name:"นางไม้แห่งดอกไม้ร่วง", class:"Healer", hp:1430129, atk:333697, def:143013, skill:"AOE Heal L3" }
  ],
  488: [ // ทุ่งดอกไม้ผีสิง
    { name:"โกเลมดอกไม้ต้องสาป", class:"Tank", hp:2430027, atk:267303, def:243003, skill:"AOE Defense Buff L3" },
    { name:"อัศวินเกราะกลีบกุหลาบดำ", class:"Warrior", hp:1822520, atk:486005, def:182252, skill:"Power Strike L3" },
    { name:"แม่มดสะกดกลิ่นหอมมรณะ", class:"CC", hp:1336515, atk:583206, def:145802, skill:"Silence L3" },
    { name:"เทพีแห่งทุ่งดอกไม้ร้าง", class:"Healer", hp:1458016, atk:340204, def:145802, skill:"Cleanse L3" }
  ],
  489: [ // ทุ่งดอกไม้ผีสิง
    { name:"ไฮดร้าเถาวัลย์ผีสิง", class:"Tank", hp:2477412, atk:272515, def:247741, skill:"AOE Defense Buff L3" },
    { name:"อสูรดอกไม้เลือด", class:"Berserk", hp:1981930, atk:545031, def:173419, skill:"Berserk Mode L3" },
    { name:"นักธนูหนามพิษ", class:"Rogue", hp:1436899, atk:792772, def:123871, skill:"Bomb L3" },
    { name:"นักบวชแห่งฤดูใบไม้ร่วง", class:"Healer", hp:1486447, atk:346838, def:148645, skill:"Heal L3" }
  ],
  490: [ // ทุ่งดอกไม้ผีสิง
    { name:"เจ้าแห่งทุ่งดอกไม้ผีสิง", hp:4798872, atk:858745, def:378858, skill:"Berserk Mode L3" },
    { name:"วิญญาณกุหลาบดำมรณะ", hp:2178435, atk:580916, def:217843, skill:"Double Strike L3" },
    { name:"แม่มดใหญ่แห่งกลิ่นหอมมรณะ", hp:1742748, atk:406641, def:174274, skill:"Cleanse L3" }
  ],
  491: [ // หุบเขาสุริยะ
    { name:"องครักษ์สุริยะ", class:"Tank", hp:2574973, atk:283247, def:257497, skill:"Defense Buff L3" },
    { name:"นักรบเปลวสุริยัน", class:"Warrior", hp:1931230, atk:514995, def:193123, skill:"Double Strike L3" },
    { name:"จอมเวทแสงอาทิตย์", class:"Mage", hp:1416235, atk:772492, def:128749, skill:"AOE Attack L3" },
    { name:"นักบวชแห่งรุ่งอรุณ", class:"Healer", hp:1544984, atk:360496, def:154498, skill:"Heal L3" }
  ],
  492: [ // หุบเขาสุริยะ
    { name:"ฟีนิกซ์ทองคำน้อย", class:"Tank", hp:2625185, atk:288770, def:262519, skill:"Defense Buff L3" },
    { name:"สิงโตเพลิงสุริยะ", class:"Berserk", hp:2100148, atk:577541, def:183763, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาแดด", class:"Rogue", hp:1522608, atk:840059, def:131259, skill:"Piercing Shot L3" },
    { name:"มหาปุโรหิตแห่งสุริยะ", class:"Healer", hp:1575111, atk:367526, def:157511, skill:"AOE Heal L3" }
  ],
  493: [ // หุบเขาสุริยะ
    { name:"โกเลมทองคำศักดิ์สิทธิ์", class:"Tank", hp:2676377, atk:294401, def:267638, skill:"Defense Buff L3" },
    { name:"อัศวินเกราะสุริยะ", class:"Warrior", hp:2007282, atk:535275, def:200728, skill:"Power Strike L3" },
    { name:"จอมเวทสะกดแสงจ้า", class:"CC", hp:1472007, atk:642330, def:160583, skill:"Charm L3" },
    { name:"เทพีแห่งอรุณรุ่ง", class:"Healer", hp:1605826, atk:374693, def:160583, skill:"Cleanse L3" }
  ],
  494: [ // หุบเขาสุริยะ
    { name:"ไทแทนสุริยะยักษ์", class:"Tank", hp:2728566, atk:300142, def:272857, skill:"Defense Buff L3" },
    { name:"ดราก้อนทองคำผู้พิทักษ์", class:"Berserk", hp:2182853, atk:600284, def:191000, skill:"Berserk Mode L3" },
    { name:"นักธนูแสงทอง", class:"Rogue", hp:1582568, atk:873141, def:136428, skill:"Bomb L3" },
    { name:"นักบวชสูงสุดแห่งสุริยัน", class:"Healer", hp:1637140, atk:381999, def:163714, skill:"Heal L3" }
  ],
  495: [ // หุบเขาสุริยะ
    { name:"ราชันสุริยะทองคำ", hp:5285369, atk:945803, def:417266, skill:"AOE Attack L3" },
    { name:"ฟีนิกซ์เพลิงสุริยัน", hp:2399280, atk:639808, def:239928, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตแห่งดวงอาทิตย์", hp:1919424, atk:447865, def:191942, skill:"Cleanse L3" }
  ],
  496: [ // บัลลังก์เทพจุติ
    { name:"องครักษ์เทพจุติ", class:"Tank", hp:2836017, atk:311962, def:283602, skill:"AOE Defense Buff L3" },
    { name:"นักรบเทพผู้ล่มสลาย", class:"Warrior", hp:2127013, atk:567203, def:212701, skill:"Double Strike L3" },
    { name:"จอมเวทแห่งบัลลังก์", class:"Mage", hp:1559810, atk:850805, def:141801, skill:"Burn L3" },
    { name:"นักบวชสูงสุดแห่งเทวสถาน", class:"Healer", hp:1701610, atk:397042, def:170161, skill:"Heal L3" }
  ],
  497: [ // บัลลังก์เทพจุติ
    { name:"ไททันจุติพิทักษ์บัลลังก์", class:"Tank", hp:2891320, atk:318045, def:289132, skill:"AOE Defense Buff L3" },
    { name:"อัศวินเทพผู้พิโรธ", class:"Berserk", hp:2313056, atk:636090, def:202392, skill:"Berserk Mode L3" },
    { name:"นักฆ่าเงาแห่งเทวสถาน", class:"Rogue", hp:1676965, atk:925222, def:144566, skill:"Piercing Shot L3" },
    { name:"เทพีผู้เฝ้าบัลลังก์", class:"Healer", hp:1734792, atk:404785, def:173479, skill:"AOE Heal L3" }
  ],
  498: [ // บัลลังก์เทพจุติ
    { name:"โกเลมเทพศักดิ์สิทธิ์", class:"Tank", hp:2947701, atk:324247, def:294770, skill:"AOE Defense Buff L3" },
    { name:"อาร์คแองเจิลผู้ตกสวรรค์", class:"Warrior", hp:2210775, atk:589540, def:221078, skill:"Power Strike L3" },
    { name:"จอมเวทสะกดมิติ", class:"CC", hp:1621235, atk:707448, def:176862, skill:"AOE Stun L3" },
    { name:"มหาปุโรหิตสูงสุดแห่งจุติ", class:"Healer", hp:1768620, atk:412678, def:176862, skill:"Cleanse L3" }
  ],
  499: [ // บัลลังก์เทพจุติ
    { name:"ไทแทนจุติจอมพลัง", class:"Tank", hp:3005181, atk:330570, def:300518, skill:"AOE Defense Buff L3" },
    { name:"ดราก้อนเทพเจ้าจอมพิโรธ", class:"Berserk", hp:2404145, atk:661140, def:210363, skill:"Berserk Mode L3" },
    { name:"นักธนูแห่งวันสิ้นโลก", class:"Rogue", hp:1743005, atk:961658, def:150259, skill:"Bomb L3" },
    { name:"เทพธิดาผู้เฝ้าประตูมิติ", class:"Healer", hp:1803108, atk:420725, def:180311, skill:"Heal L3" }
  ],
  500: [ // บัลลังก์เทพจุติ
    { name:"เทพจุติผู้ล่มสลาย", hp:5821186, atk:1041686, def:459567, skill:"Berserk Mode L3" },
    { name:"อัครเทวดาผู้ทรยศ", hp:2642511, atk:704669, def:264252, skill:"Double Strike L3" },
    { name:"มหาปุโรหิตแห่งวาระสุดท้าย", hp:2114009, atk:493268, def:211401, skill:"Cleanse L3" }
  ],
};

// ============================================================
// โหลดได้ทั้ง client (<script>, กลายเป็น global ตามเดิม) และ server
// (require('.../public/stages/n-stages')) — ใช้ STAGE ชุดเดียวกับที่ client แสดงผล
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STAGES };
}
