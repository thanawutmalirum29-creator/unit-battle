function getRenderStats(card) {
  const baseHp  = card.baseHp ?? card.hp ?? 0;
  const baseAtk = card.baseAtk ?? card.atk ?? 0;
  const baseDef = card.baseDef ?? card.def ?? 0;

  let hp = baseHp;
  let atk = baseAtk;
  let def = baseDef;

  let hpPct = 0, atkPct = 0, defPct = 0;

  (card.equips || []).forEach(eq => {
    const mode = eq.mode || "flat";
    if (mode === "percent") {
      if (eq.stat === "hp")  hpPct  += eq.bonus;
      if (eq.stat === "atk") atkPct += eq.bonus;
      if (eq.stat === "def") defPct += eq.bonus;
    } else {
      if (eq.stat === "hp")  hp  += eq.bonus;
      if (eq.stat === "atk") atk += eq.bonus;
      if (eq.stat === "def") def += eq.bonus;
    }
  });

  hp  = Math.floor(hp  * (1 + hpPct  / 100));
  atk = Math.floor(atk * (1 + atkPct / 100));
  def = Math.floor(def * (1 + defPct / 100));

  return { hp, atk, def };
}
function renderStageButtons() {
  const stageList = document.getElementById("stageList");
  if (!stageList) return; // 🟢 ถ้าไม่มี element ก็ไม่ต้องทำอะไร
  stageList.innerHTML = "";
  const totalStages = Object.keys(STAGES).length; // สมมติ STAGES เก็บด่านทั้งหมด
  const maxToShow = 8;

  // คำนวณช่วงด่านที่จะแสดง
  let start = Math.max(1, unlockedStage - maxToShow + 1);
  let end = Math.min(unlockedStage, totalStages);

  for (let n = start; n <= end; n++) {
    const btn = document.createElement("button");
    btn.textContent = "Stage " + n;
    btn.id = "btn-stage-" + n;
    btn.className = "stage-btn" + (n % 5 === 0 ? " milestone" : "") + (n === currentStage ? " stage-selected" : "");
    btn.onclick = () => setStage(n);
    btn.disabled = n > unlockedStage;

    stageList.appendChild(btn);
  }

  // เลื่อนแถบเลือกสเตจไปโชว์ "ด่านล่าสุดที่ไปถึง" เสมอ (ปุ่มขวาสุดของช่วงที่แสดง)
  // ไม่งั้นตอนโหลดหน้าใหม่ .stage-list (overflow-x:auto) จะเริ่มที่ scrollLeft=0
  // คือด่านแรกสุดของช่วง ต้องเลื่อนเองไปหาด่านล่าสุด
  const lastBtn = document.getElementById("btn-stage-" + end);
  if (lastBtn) lastBtn.scrollIntoView({ behavior: "auto", inline: "end", block: "nearest" });
}

function deepClone(obj) { 
  return JSON.parse(JSON.stringify(obj)); 
}

function getStarsDisplay(stars, isMaxed) {
  let out = (stars <= 5) ? "⭐".repeat(stars) : "🌟".repeat(stars - 5);
  return isMaxed ? `<span class="glow-stars">${out}</span>` : out;
}

// หมายเหตุ: renderDeck()/sellCard()/sellAllUnlocked()/clearSelection() (แผงจัดเด็ค
// แบบเต็ม สำหรับเลือกทีม+ขายการ์ด) ย้ายไปอยู่ที่ js/core/deck-manage.js แล้ว เพราะ
// UI จัดเด็คถูกย้ายไปอยู่หน้า "จัดเด็ค" (pages/deck.html) หน้าเดียว ไม่ซ้ำอยู่ทุกหน้า
// ต่อสู้เหมือนเดิม — ไฟล์นี้ (render.js) เหลือไว้แค่ helper ที่หน้าต่อสู้ยังต้องใช้จริง
// (getRenderStats/deepClone/getStarsDisplay/renderStageButtons/playAnim/findFirstAlive)

// ทำให้การ์ดเล่น animation
function playAnim(cardEl, type) {
  if (!cardEl) return;
  cardEl.classList.add(type);
  setTimeout(() => cardEl.classList.remove(type), 300); // reset class
}

function findFirstAlive(list){
  return list.find(x => x.hp > 0);
}