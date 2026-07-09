// getRenderStats ย้ายไปรวมไว้จุดเดียวที่ js/shared/battle-math.js แล้ว (ดูหมายเหตุ
// ใน js/data/equip.js) เรียก getRenderStats(...) ตรงนี้ได้เหมือนเดิม
function renderStageButtons() {
  const stageList = document.getElementById("stageList");
  if (!stageList) return; // <span class=gicon-dot-green></span> ถ้าไม่มี element ก็ไม่ต้องทำอะไร
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
  let out = (stars <= 5) ? "<span class=gicon-star></span>".repeat(stars) : "<span class=gicon-star></span>".repeat(stars - 5);
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

// findFirstAlive ย้ายไปรวมไว้จุดเดียวที่ js/shared/battle-math.js แล้ว (ดูหมายเหตุ
// ใน core/battle.js) เรียก findFirstAlive(...) ตรงนี้ได้เหมือนเดิม