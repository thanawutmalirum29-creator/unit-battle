// js/core/team-select-ui.js — แผงเล็ก ๆ ให้เลือก "เด็คที่จะใช้" ในหน้าต่อสู้
// (Normal/Inf/Boss) แต่ละหน้าจะจำไว้เองว่าเลือกเด็คไหนล่าสุด (ดู team-store.js)
//
// วางไว้ใน <div id="teamSelectorMount" data-page-key="normal"></div> แล้วไฟล์นี้
// จะ mount dropdown ให้เอง ไม่ต้องเรียกฟังก์ชันเพิ่มจากหน้าไหนอีก

function renderTeamSelectorUI(mount, pageKey) {
  if (!mount) return;

  const teamDecks = loadTeamDecks();
  const activeSlot = getActiveDeckSlot(pageKey);

  if (!document.getElementById("teamSelectorStyles")) {
    const style = document.createElement("style");
    style.id = "teamSelectorStyles";
    style.textContent = `
.team-selector{
  display:flex; align-items:center; gap:10px; margin:0 0 12px; flex-wrap:wrap;
  background:var(--panel-soft,rgba(255,255,255,.04));
  border:1px solid var(--border,rgba(255,255,255,.08));
  border-radius:var(--radius-sm,9px);
  padding:9px 12px;
}
.team-selector-label{
  color:var(--muted); font-size:13px; font-weight:600;
  display:flex; align-items:center; gap:6px; white-space:nowrap;
}
.team-selector select{
  flex:1 1 auto; font-size:13.5px; font-weight:600; padding:8px 10px; border-radius:var(--radius-sm);
  background:var(--panel,#141d2b); color:var(--text,#e8edf5); border:1px solid var(--border,rgba(255,255,255,.14));
  cursor:pointer; transition:.15s;
}
.team-selector select:hover, .team-selector select:focus{ border-color:var(--accent,#5c8bff); outline:none; }

.team-preview{
  /*  เดิมใช้ auto-fit+1fr พอเด็คมีการ์ดใบเดียว (เช่น 1/4) การ์ดจะยืดเต็มความกว้าง
     กลายเป็นแถบยาวแบนๆ ไม่เหมือนการ์ด — เปลี่ยนเป็น auto-fill + เพดานความกว้างคงที่
     แทน ให้การ์ดกว้างพอดีเสมอไม่ว่าจะมีกี่ใบ
     <span class=gicon-dot-green></span> อิง --card-w จาก theme.css (ตัวแปรกลางเดียวกับการ์ดทุกที่ในเกม) แทนเลข px
     คงที่แยกไว้เอง — แก้ขนาดการ์ดที่ theme.css ที่เดียว ที่นี่ตามอัตโนมัติ */
  display:grid; grid-template-columns:repeat(auto-fill,minmax(var(--card-w),var(--card-w))); gap:8px; margin:0 0 14px;
}
.team-preview-card{
  position:relative; overflow:hidden;
  width:var(--card-w); height:var(--card-h);
  padding:10px 10px 9px; border-radius:var(--radius-sm,9px);
  border:1px solid var(--border,rgba(255,255,255,.12));
  background:linear-gradient(160deg, rgba(255,255,255,.05), var(--panel,#141d2b) 65%);
  box-shadow:0 3px 10px rgba(0,0,0,.25);
  transition:transform .15s ease, box-shadow .15s ease;
  display:flex; flex-direction:column; justify-content:center; gap:4px;
}
.team-preview-card::before{
  content:""; position:absolute; top:0; left:0; right:0; height:3px;
  background:var(--c-common,#9aa5b1); opacity:.9;
}
.team-preview-card.rarity-Common::before{ background:var(--c-common,#9aa5b1); }
.team-preview-card.rarity-Rare::before{ background:var(--c-rare,#2f8bff); }
.team-preview-card.rarity-Epic::before{ background:var(--c-epic,#a855f7); }
.team-preview-card.rarity-Legendary::before{ background:var(--c-legend,#ffb300); }
.team-preview-card.rarity-Mythical::before{ background:var(--c-mythical,#ff3da6); }
.team-preview-card.rarity-Cosmic::before{ background:linear-gradient(90deg,var(--c-cosmic,#7f00ff),#00d2ff); }
.team-preview-card:hover{ transform:translateY(-2px); box-shadow:0 8px 18px rgba(0,0,0,.35); }
.team-preview-name{
  font-weight:800; font-size:11px; line-height:1.25;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  margin:3px 0 4px;
}
.team-preview-stars{ font-size:10px; letter-spacing:.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.team-preview-lv{
  display:inline-block; margin-left:4px; padding:0 5px; border-radius:999px;
  background:rgba(255,255,255,.08); color:var(--muted,#93a1b5);
  font-size:9px; font-weight:700; vertical-align:1px;
}
.team-preview-stats{
  display:flex; flex-wrap:wrap; gap:3px 8px;
  font-size:9.5px; color:var(--muted); margin-top:6px;
  padding-top:6px; border-top:1px dashed var(--border,rgba(255,255,255,.1));
}
.team-preview-stats b{ color:var(--text,#e8edf5); font-weight:700; }
.team-preview-card.team-preview-missing{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  color:var(--muted); font-size:11px; text-align:center; opacity:.7;
  border-style:dashed;
}
.team-preview-empty{
  color:var(--muted); font-size:13px; margin:0 0 14px; text-align:center;
  padding:14px; border:1px dashed var(--border,rgba(255,255,255,.14)); border-radius:var(--radius-sm,9px);
}
`;
    document.head.appendChild(style);
  }

  mount.innerHTML = `
    <div class="team-selector">
      <span class="team-selector-label"><span class=gicon-users></span> เด็คที่ใช้</span>
      <select id="teamSelectorPick">
        ${teamDecks.map((d, i) => `<option value="${i}"${i === activeSlot ? " selected" : ""}>${escapeTeamName(d.name)} (${d.indexes.length}/4)</option>`).join("")}
      </select>
    </div>
    <div id="teamPreviewBox"></div>
  `;

  renderTeamPreview(mount, teamDecks, activeSlot);

  document.getElementById("teamSelectorPick").addEventListener("change", (e) => {
    const slot = parseInt(e.target.value, 10);
    setActiveDeckSlot(pageKey, slot);
    // หน้าโหมด Normal/Inf เก็บทีมปัจจุบันไว้ในตัวแปร global `selectedIndexes` —
    // อัปเดตให้ตรงกับเด็คที่เพิ่งเลือกทันที (หน้า Boss อ่านสดจาก loadSelectedTeam()
    // ทุกครั้งที่เริ่มสู้อยู่แล้ว ไม่ต้องมีตัวแปรนี้ก็ได้ เช็คแบบ guard ไว้กันพัง)
    if (typeof selectedIndexes !== "undefined") {
      selectedIndexes = loadSelectedTeam(pageKey);
    }
    // อัปเดตพรีวิวเด็คให้ตรงกับเด็คที่เพิ่งเลือกทันที
    renderTeamPreview(mount, loadTeamDecks(), slot);
  });
}

// พรีวิวเด็คที่กำลังใช้อยู่ — โผล่ใต้ dropdown เลือกเด็คทันที ให้เห็นว่าเด็คนี้
// มีการ์ดตัวไหนบ้างโดยไม่ต้องกดเข้าไปหน้า "จัดเด็ค" ก่อน
function renderTeamPreview(mount, teamDecks, activeSlot) {
  const previewBox = mount.querySelector("#teamPreviewBox");
  if (!previewBox) return;

  const deck = JSON.parse(localStorage.getItem("deck") || "[]");
  const deckById = new Map(deck.map((c) => [c.id, c]));
  const indexes = (teamDecks[activeSlot] && teamDecks[activeSlot].indexes) || [];

  if (indexes.length === 0) {
    previewBox.innerHTML = `<div class="team-preview-empty">เด็คนี้ยังไม่มีการ์ด — ไปจัดเด็คได้ที่หน้า "จัดเด็ค"</div>`;
    return;
  }

  previewBox.innerHTML = `
    <div class="team-preview">
      ${indexes.map((id) => {
        const card = deckById.get(id);
        if (!card) return `<div class="team-preview-card team-preview-missing"><span class=gicon-x></span><br>การ์ดถูกขายไปแล้ว</div>`;
        const stats = (typeof getRenderStats === "function") ? getRenderStats(card) : { hp: card.hp, atk: card.atk, def: card.def };
        const stars = (typeof getStarsDisplay === "function") ? getStarsDisplay(card.stars, card.maxed) : "<span class=gicon-star></span>".repeat(card.stars || 1);
        return `
          <div class="team-preview-card rarity-${card.rarity}">
            <div class="team-preview-name">${escapeTeamName(card.name)}<span class="team-preview-lv">Lv.${card.level || 1}</span></div>
            <div class="team-preview-stars">${stars}</div>
            <div class="team-preview-stats">
              <span>HP <b>${stats.hp}</b></span>
              <span>ATK <b>${stats.atk}</b></span>
              <span>DEF <b>${stats.def}</b></span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function escapeTeamName(name) {
  const div = document.createElement("div");
  div.textContent = name;
  return div.innerHTML;
}

(function initTeamSelectorUI() {
  const mount = document.getElementById("teamSelectorMount");
  if (!mount) return;
  const pageKey = mount.dataset.pageKey || "normal";
  renderTeamSelectorUI(mount, pageKey);
})();
