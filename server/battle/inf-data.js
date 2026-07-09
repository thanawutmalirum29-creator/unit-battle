'use strict';

// ✅ เดิมไฟล์นี้ก็อป logic ล้วนๆ มาจาก public/js/modes/INF/inf-mode.js อีกชุด (มีคอมเมนต์
// เดิมบอกตรงๆ ว่า "ถ้าจะปรับสมดุล/สเกลของ INF ต้องแก้ทั้ง 2 ที่") ระหว่างพอร์ตทั้งสองไฟล์
// หลุดไม่ตรงกันไปแล้วจริงๆ (ฝั่ง client มีลูกน้ำเกินใน STAGE1_BASE_SKILLS.Trickster ทำให้มี
// สมาชิก undefined แฝงอยู่ ฝั่งนี้ไม่มีบั๊กนั้น) รวมมาไว้จุดเดียวที่
// server/public/js/shared/inf-data.js แล้ว (ใช้ได้ทั้ง <script> ฝั่ง client และ require()
// ฝั่งนี้จากซอร์สเดียวกันจริงๆ) แก้สมดุล/สูตรที่นั่นที่เดียว ทั้ง client และ server ได้ค่าตรงกันเสมอ
const {
  MAX_INF_STAGE,
  generateInfStage,
  generateInfShardDrop,
} = require('../public/js/shared/inf-data.js');

module.exports = { MAX_INF_STAGE, generateInfStage, generateInfShardDrop };
