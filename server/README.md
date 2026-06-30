# UnitBattle — Server (anti-cheat leaderboard)

## แนวคิด
ไม่ใช่เกม real-time PvP แต่เป็นการแข่งกัน "ผลลัพธ์" — ด่านสูงสุดที่ผ่าน (โหมดทั่วไป/INF), เวลาที่ใช้, คะแนนทีม
ดังนั้น server ไม่ต้องรัน battle simulation เอง แค่เป็น **ผู้บันทึก/ตัดสินผล** แทน client เพื่อกันโกง

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
