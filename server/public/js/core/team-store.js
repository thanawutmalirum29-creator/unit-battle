// js/core/team-store.js — ระบบ "เด็ค" หลายชุด (ค่าเริ่มต้น 5 เด็ค: เด็ค1-เด็ค5)
//
// ผู้เล่นจัดเด็คแต่ละชุดไว้ที่หน้า "จัดเด็ค" (pages/deck.html) ส่วนหน้าต่อสู้แต่ละหน้า
// (Normal/Inf/Boss) แค่ "เลือกใช้" เด็คไหนก็ได้จาก 5 ชุดนี้ และจำไว้แยกกันเป็นรายหน้า
// ว่าหน้านั้นเลือกเด็คไหนล่าสุด (คนละหน้าใช้เด็คไม่เหมือนกันได้พร้อมกัน)

const TEAM_DECK_COUNT = 5;
const TEAM_DECKS_KEY = "teamDecks";

function defaultDeckName(i) {
  return `เด็ค${i + 1}`;
}

// โหลดเด็คทั้งหมด (คืนค่าเสมอ TEAM_DECK_COUNT ชุด) — ถ้ายังไม่เคยมีข้อมูลเด็คหลายชุด
// จะ migrate จากระบบเก่า (selectedIndexes เดี่ยว) มาเป็นเด็ค 1 ให้อัตโนมัติ
function loadTeamDecks() {
  let teamDecks;
  try { teamDecks = JSON.parse(localStorage.getItem(TEAM_DECKS_KEY)); }
  catch (e) { teamDecks = null; }

  if (!Array.isArray(teamDecks)) {
    const deck = JSON.parse(localStorage.getItem("deck") || "[]");
    let legacy = [];
    try { legacy = JSON.parse(localStorage.getItem("selectedIndexes") || "[]"); }
    catch (e) { legacy = []; }
    //  ข้อมูลเก่ามาก ๆ อาจเก็บเป็น index (number) แทน id — แปลงให้เป็น id เหมือนเดิม
    if (legacy.length > 0 && typeof legacy[0] === "number") {
      legacy = legacy.map(i => deck[i]?.id).filter(Boolean);
    }
    teamDecks = [{ name: defaultDeckName(0), indexes: legacy }];
  }

  // เติมให้ครบ TEAM_DECK_COUNT ชุดเสมอ + กันข้อมูลเพี้ยน (ไม่ใช่ array/ไม่มีชื่อ)
  const normalized = [];
  for (let i = 0; i < TEAM_DECK_COUNT; i++) {
    const d = teamDecks[i];
    normalized.push({
      name: (d && typeof d.name === "string" && d.name.trim()) ? d.name.trim().slice(0, 12) : defaultDeckName(i),
      indexes: Array.isArray(d?.indexes) ? d.indexes : []
    });
  }

  saveTeamDecks(normalized);
  return normalized;
}

function saveTeamDecks(teamDecks) {
  localStorage.setItem(TEAM_DECKS_KEY, JSON.stringify(teamDecks));
}

// แต่ละหน้าต่อสู้จำไว้เองว่าเลือกใช้เด็คไหนล่าสุด (pageKey เช่น "normal"/"inf"/"boss")
function getActiveDeckSlot(pageKey) {
  const raw = localStorage.getItem("activeDeckSlot:" + pageKey);
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n >= 0 && n < TEAM_DECK_COUNT ? n : 0;
}

function setActiveDeckSlot(pageKey, slot) {
  localStorage.setItem("activeDeckSlot:" + pageKey, String(slot));
}

// โหลด "ทีมที่เลือกไว้" ของเด็คที่หน้านี้ (pageKey) กำลังใช้งานอยู่ — ใช้ตอนเริ่ม
// ต่อสู้ แทนที่การวาดแผงจัดเด็คเองแบบเดิม (ย้ายไปหน้า "จัดเด็ค" หน้าเดียวแล้ว)
function loadSelectedTeam(pageKey) {
  const teamDecks = loadTeamDecks();
  const slot = getActiveDeckSlot(pageKey);
  return teamDecks[slot] ? teamDecks[slot].indexes.slice() : [];
}
