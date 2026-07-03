# UnitBattle — Server (anti-cheat leaderboard)

## แนวคิด
อนาคตจะเป็นเกม real-time PvP ทำให้ต้องระบบป้องกันแน่นในทุกจุดเพื่อไม่ให้ผู้เล่นได้ประโยชน์จากช่องโหว่

## Run lifecycle (server-authoritative)
1. `POST /api/runs/start` — client เริ่มเล่น → server บันทึกเวลาเริ่มเอง คืน `runId` + `token`
2. `POST /api/runs/:runId/stage-clear` — ทุกครั้งที่ผ่านด่าน client ยิงมาบอก → server เช็คว่า
   - ด่านต้องเรียงลำดับ (กันการข้ามด่าน/ปลอมด่านสูงๆ)
   - เวลาที่ผ่านมาต้อง ≥ เวลาขั้นต่ำที่เป็นไปได้จริงของเกม (กันสคริปต์ auto-win เร็วเกินจริง)
   - ถ้าผิดปกติ → run ถูก flag ทันที ไม่นับผล
3. `POST /api/runs/:runId/finish` — server คำนวณคะแนน/เวลาสุดท้ายจากข้อมูลที่ server เก็บเองทั้งหมด **ไม่ใช้ตัวเลขจาก client**

## สิ่งที่ต้องปรับให้ตรงเกมจริง
- `middleware/anticheat.js` → `MIN_MS_PER_STAGE` ต้องปรับตามเวลาผ่านด่านที่เร็วที่สุดที่เป็นไปได้จริงในเกม (เทียบจาก physics constants ที่มีอยู่แล้ว เช่น JUMP1, gravity)
- สูตรคะแนนใน `routes/runs.js` (`finish`) เป็นตัวอย่างเบื้องต้น ปรับสูตรจริงตามที่ต้องการ
- เกมฝั่ง client (ใน `public/`) ต้องเพิ่มโค้ดเรียก 3 endpoint นี้ตอนเริ่มเกม/ผ่านด่าน/จบเกม — ยังไม่ได้แก้ไฟล์เกมให้ เพราะต้องดู `battle.js`/`endroud.js` ก่อนว่าจุดไหนคือ "ผ่านด่าน"/"จบเกม"

## Deploy บน Railway
1. Push โปรเจกต์ทั้งหมด (`public/` + `server/`) ขึ้น GitHub
2. สร้าง Railway project ใหม่ → Add Service จาก repo, ตั้ง root directory เป็น `server/`
3. Add Railway Postgres plugin → จะได้ `DATABASE_URL` auto-inject เป็น env var
4. รัน migration ครั้งแรก: `railway run npm run migrate`
5. Deploy — Railway จะรัน `npm start` ตาม `railway.json`

## Security patch (ล่าสุด): ปิดช่องโหว่เศรษฐกิจที่เหลือฝั่ง client
รอบนี้ย้ายจุดที่ยังคำนวณเงิน/ไอเทม/สเตตัสฝั่ง client ล้วนๆ ไปเซิฟจนครบ ยกเว้นข้อที่ระบุว่า "ยังไม่ทำ" ด้านล่าง:
- **เงินระหว่างต่อสู้ (battle.js)** — เดิม `addMoney(reward)` ถูกเรียกตรงทุกครั้งที่ฆ่ามอนสเตอร์ เป็น global function เรียกจาก
  devtools console ได้เลย ตอนนี้เหลือแค่ log preview เงินจริงมาจาก `claim/normal`/`claim/inf` ที่เซิฟคำนวณเท่านั้น
- **เด็คไม่ sync กับเซิฟ** — เดิม `localStorage["deck"]` เป็นก้อนแยกจาก `player_economy.deck` บนเซิฟ ไม่เคย sync กลับ
  (ต่างจาก money/bag ที่มี `syncMoneyFromServer`/`syncBagFromServer` อยู่แล้ว) ผู้เล่นแก้ localStorage ใส่การ์ดปลอมได้
  ตอนนี้มี `js/core/deck.js` (`syncDeckFromServer`/`applyServerDeck`) ทำหน้าที่เดียวกัน และทุก endpoint ที่แก้ deck
  จะคืน deck ก้อนล่าสุดกลับมาเขียนทับ local เสมอ
- **ขายการ์ด** — เดิมมีตารางราคาขายอยู่ 2 ที่ (render.js กับ GACHA.html) ไม่ตรงกัน และคำนวณ/เพิ่มเงินฝั่ง client ล้วน
  ตอนนี้มี `POST /api/economy/sell` และ `/sell-all` เซิฟเช็คว่าการ์ดมีจริงในเด็คก่อนจ่ายเงินตามราคาเดียว (`SELL_PRICE_BY_RARITY`
  ใน `game-data/economy-data.js`)
- **อัปเกรดการ์ดแบบเสียเงิน+สุ่มสำเร็จ** — เดิมทั้ง cost, success rate, การสุ่ม, การบวกสเตตัส (`applyLevelGrowth`) อยู่ฝั่ง
  client ทั้งหมด (`upgrade.js`) ตอนนี้ port ไปเซิฟครบใน `POST /api/economy/upgrade/paid` (level ปกติ) และ
  `POST /api/economy/upgrade/duplicate` (ขึ้นดาวด้วยการ์ดซ้ำที่ Lv.10 ดาว 5–7 — เซิฟนับ/ตรวจการ์ดซ้ำเอง ไม่เชื่อจำนวนจาก client)
- **อัปเกรดการันตีด้วยชาร์ด** — endpoint `/api/economy/upgrade/guaranteed` มีอยู่แล้วแต่ client ไม่เคยเรียก (ยังคำนวณเอง
  ในเครื่อง) ตอนนี้ต่อสายแล้ว และแก้ endpoint ให้บวกสเตตัส (`applyLevelGrowth`) และจัดการ star-up/max ให้ตรงกับ
  `guaranteeUpgrade()` เดิม (ก่อนหน้านี้ endpoint แค่ `level + 1` เฉยๆ ไม่บวกสเตตัสเลย)

### แก้ล่าสุด (รอบนี้): ระบบอุปกรณ์ทั้งกาชาและสวมใส่ ย้ายไปเซิฟครบแล้ว
ทั้งสองข้อด้านล่างเคยเป็น client-only 100% (โกงได้จาก devtools console ตรงๆ) ตอนนี้ตามแพทเทิร์นเดียวกับ
`deck`/`bag`: เซิฟเก็บ column ใหม่ `player_economy.equip_bag` (JSONB array) และเป็นคนตัดสินทุกอย่างที่มีผลต่อ
เงิน/ไอเทม/สเตตัส — client แค่ยิง endpoint แล้วเขียนทับ local ด้วยสิ่งที่เซิฟตอบกลับมาเท่านั้น (เหมือน deck.js เดิม):

- **ระบบกาชาอุปกรณ์ (`js/data/equip-gacha.js`)** — เดิมสุ่มไอเทม คิดราคา หักเงิน แล้ว push เข้า
  `localStorage["equipBag"]` เองทั้งหมดในเครื่อง (เรียก `gachaEquipPull()` จาก console ได้ของฟรีไม่จำกัด)
  ตอนนี้ `EQUIP_GACHA_POOLS` + `rollEquipGachaOnce()` + `equipGachaCost()` ย้ายไป `game-data/economy-data.js`
  แล้ว และมี `POST /api/economy/equip-gacha/roll` เป็นคนหักเงิน/สุ่ม/เติม `equip_bag` เอง (พูลฝั่ง client ที่เหลือ
  ใช้แสดงผล banner/อัตราดรอปเท่านั้น ไม่มีผลต่อของจริง)
- **ระบบสวม/ถอด/ลบอุปกรณ์ (`js/data/equip.js`)** — เดิมอ่าน/เขียนทั้ง `deck` และ `equipBag` จาก localStorage
  ตรงๆ ทุกฟังก์ชัน (equip/unequip/delete) แก้ localStorage เองแล้วจบ ไม่มีเซิฟเช็คว่าไอเทมมีจริงหรือการ์ดมีจริง
  ตอนนี้มี `POST /api/economy/equip/equip`, `/equip/unequip`, `/equip/delete`, `/equip/delete-by-rarity`
  — ทุกตัวเซิฟเช็คว่าไอเทม/การ์ดมีอยู่จริงใน `player_economy` ของผู้เล่นคนนั้นก่อนย้ายข้อมูล (bonus/type ของ
  อุปกรณ์อ่านจากที่เซิฟเก็บเองเสมอ ไม่เชื่อค่าที่ client ส่งมา) มี `js/core/equipbag.js` (ตามแพทเทิร์น
  `core/deck.js`) คอย sync `equip_bag` จากเซิฟหลัง login และหลังทุก action
- ต้อง `npm run migrate` อีกรอบหลัง pull โค้ดนี้ เพราะมี `ALTER TABLE player_economy ADD COLUMN equip_bag`
  ใหม่ใน `schema.sql`
- หน้า `equip.html` และ `GACHAE.html` เพิ่ม script `core/api.js`, `core/auth-ui.js`, `core/deck.js`,
  `core/equipbag.js` เข้าไปแล้ว (ก่อนหน้านี้สองหน้านี้ไม่ได้โหลดสคริปต์ล็อกอิน/sync เลย)

## แก้บั๊ก: ชิ้นส่วนความทรงจำ/ชาร์ดที่ใช้ไปแล้ว "คืน" กลับมา (ใหม่)

**อาการ:** ซื้อการ์ดในร้านด้วยชิ้นส่วนความทรงจำ หรืออัปสกิลด้วยชาร์ด แล้วพอโหลดหน้าใหม่ ของที่เสียไปกลับมาเหมือนเดิม
(บางทีของทั้งกระเป๋าหายไปด้วย)

**สาเหตุ:** `shop.html` (ปุ่ม "ใช้ 50 ชิ้นส่วน") กับ `upgradeSkills.js` (อัปสกิลด้วยชาร์ด) เป็นโค้ดเก่าที่เขียน/อ่าน
กระเป๋าใน `localStorage` แบบดิบ ไม่ผ่าน `saveBag()`/`loadBag()` (ที่เข้ารหัส+เช็ค hash) และไม่เคยแจ้งเซิร์ฟเวอร์เลย
ว่ามีการใช้ของไป — พอหน้าโหลดใหม่ `bag.js`/`deck.js` จะ sync ค่าจากเซิร์ฟเวอร์ (source of truth) ทับกลับไปเป็นค่า
เดิมก่อนใช้ของ นอกจากนี้ `shop.html` เองก็มี `refreshShopByDeck()`/`buyItem()` เวอร์ชันเก่าที่ยังสุ่มร้านค้า+หักเงิน
ฝั่ง client ล้วนๆ ซ้อนทับเวอร์ชันที่ถูกต้องอยู่ใน `shop-data.js` ด้วย (มี `setInterval` เรียกทุก 5 วิเป็นตัวการหลักที่
ทำให้ร้านค้าสุ่มใหม่เรื่อยๆ)

**การแก้ไข:** ย้ายทั้งสองระบบไปเป็น server-authoritative แบบเดียวกับเงิน/การ์ด/กาชา:
- `routes/economy.js`: เพิ่ม `POST /shop/buy-with-shard` (แลกการ์ดด้วยชิ้นส่วน, fixed cost 50), `GET /shop/my-status`
  (ล็อครายแรร์ต่อ cycle ต่อผู้เล่น ใช้แทน `shop_locked` เดิม), `POST /skills/upgrade` (อัปสกิลด้วยชาร์ด — เซิฟเป็นคน
  คิดต้นทุน/สุ่มผล/หักของ), และเพิ่ม rarity-lock ให้ `/shop/buy` (เงิน) ด้วยเพราะเดิมไม่เคยเช็ค
- `shop.html`: ลบโค้ด client-only ทั้งหมด เปลี่ยนไปเรียก `GameAPI.shopBuy()` / `shopBuyWithShard()` ผ่าน `shop-data.js`
  ที่มีอยู่แล้ว (ของเดิมถูกเขียนไว้ถูกต้องแล้วแต่ไม่เคยถูกเรียกใช้จริง เพราะ `shop.html` มีฟังก์ชันชื่อซ้ำทับอยู่)
- `upgradeSkills.js` + `upgradeskills.html`: เพิ่ม `api.js`/`deck.js`/`auth-ui.js`, เปลี่ยนไปเรียก
  `GameAPI.skillUpgrade(cardId)` แล้ว sync deck/bag กลับจากเซิฟเวอร์เหมือนหน้าอื่นๆ

**Migration:** คอลัมน์ใหม่ใน `shop_purchases` (`paid_with`, `shard_key`, `shard_qty`) มากับ `schema.sql` ตามปกติ
รัน `npm run migrate` อีกครั้งหลังอัปเดตโค้ด

## Admin console + mailbox (ใหม่)

**เข้าใช้งาน:** `/admin-251029` (หรือ `/pages/admin-251029.html`) — ไม่มีลิงก์จากเมนูเกม เข้าได้เฉพาะทาง URL
ตรงนี้เท่านั้น และหน้าเองก็ยังกันด้วยรหัสผ่านอีกชั้น (ตั้งค่าได้ผ่าน env var `ADMIN_CODE`, ค่าเริ่มต้น `251029`)
ดู `.env.example` — **ควรเปลี่ยนรหัสก่อน deploy จริง** เพราะรหัส 6 หลักตัวเลขล้วนแม้จะมี rate limit
(`routes/admin.js`, 10 ครั้ง/15 นาทีต่อ IP) แต่ก็ยังไม่แข็งแรงเท่ารหัสที่ยาวกว่านี้

**สิ่งที่ทำได้ในคอนโซล:** ค้นหา/ดูรายชื่อบัญชี, แก้ชื่อ, เปลี่ยนสถานะ (ปกติ/ระงับ/แบน — บัญชีที่ไม่ active
จะ login ไม่ได้ ดู `middleware/auth.js`), ลบบัญชี (cascade ลบทุกอย่างที่อ้างอิงถึง player นั้น), ส่งเมล
แนบเงิน/ไอเทม (currency ในกระเป๋า) เข้าบัญชีผู้เล่นได้โดยตรง

**ฝั่งผู้เล่น:** ทุกบัญชีมี `public_id` (15 หลัก ตัวอักษร+ตัวเลข, ตัดตัวที่สับสนอย่าง 0/O, 1/I/l ออก) แสดงในหน้า
`account.html` — เป็นคนละค่ากับ UUID ภายใน (`players.id`) ที่ระบบ anti-cheat ใช้อยู่เดิม ไม่กระทบของเดิม
ปุ่ม "กล่องจดหมาย" ในหน้าบัญชีกดแล้วเด้งเป็นป๊อปอัป มีเลขแจ้งเตือนที่ยังไม่อ่าน กดรับของแล้วเงิน/ไอเทมจะเข้า
`player_economy` ทันทีแบบเดียวกับระบบรางวัลอื่นๆ ในเกม (ผ่าน transaction ป้องกันการกดรับซ้ำ)

**Migration:** เพิ่มคอลัมน์/ตารางใหม่ผ่าน `schema.sql` ตามปกติ (`npm run migrate`) — เป็น `IF NOT EXISTS` ทั้งหมด
รันซ้ำได้ปลอดภัย ถ้ามีผู้เล่นอยู่ก่อนแพตช์นี้ ให้รัน `node db/backfill-public-id.js` เพิ่มอีกครั้งเพื่อเติม
`public_id` ให้บัญชีเก่า (บัญชีใหม่/บัญชีที่ login หลังแพตช์นี้จะได้ค่าอัตโนมัติอยู่แล้ว)

**ไฟล์ที่เกี่ยวข้อง:** `routes/admin.js`, `routes/mailbox.js`, `utils/publicId.js`, `db/backfill-public-id.js`,
`public/pages/admin-251029.html`, ส่วนที่แก้ใน `public/pages/account.html` และ `public/js/core/api.js`

## ต่อยอดอนาคต: โหมด Battle Real-time
ระบบปัจจุบันคุยกันผ่าน HTTP REST (เหมาะกับโหมดที่ผลลัพธ์ส่งทีหลังได้ เช่น NORMAL/INF)
แต่โหมด real-time PvP ต้องใช้ **WebSocket (Socket.IO)** แทน เพราะต้องซิงค์สถานะสองฝั่งแบบสด ๆ
แนวทางตอนจะทำจริง:
- เพิ่ม `socket.io` เข้า `server.js`, แยก namespace/room ต่อแมตช์ (เหมือนแพทเทิร์นที่เคยใช้ในเกม Mafia/Werewolf — ใช้ token + grace period กัน disconnect หลุด)
- **server ต้องเป็นคนรันผล battle เอง** ไม่ใช่แค่ relay action ระหว่าง client (ต่างจาก NORMAL/INF ที่ client คำนวณเองได้เพราะแข่งกับ AI) เพราะ PvP ถ้าฝั่งใดฝั่งหนึ่งคำนวณดาเมจเอง อีกฝั่งโกงง่ายมาก
- ตาราง `runs` ใน schema นี้รองรับ `mode = 'realtime'` ไว้แล้วล่วงหน้า แต่ logic การ matchmaking/battle resolution ยังไม่ได้สร้าง — ทำเป็น phase แยกตอนเริ่มออกแบบโหมดนี้จริงจัง

## Local dev
```
cd server
cp .env.example .env   # ใส่ DATABASE_URL ของ Postgres ที่มี (เช่น local หรือ Railway)
npm install
npm run migrate
npm start
```
