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
.team-selector{ display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; }
.team-selector-label{ color:var(--muted); font-size:14px; }
.team-selector select{ font-size:14px; padding:6px 8px; border-radius:var(--radius-sm); background:var(--panel,#141d2b); color:var(--text,#e8edf5); border:1px solid var(--border,rgba(255,255,255,.12)); }

.team-preview{ display:flex; gap:8px; flex-wrap:wrap; margin:0 0 10px; }
.team-preview-card{
  flex:1 1 110px; max-width:140px; min-width:90px; padding:8px 10px; border-radius:var(--radius-sm,9px);
  border:1.5px solid var(--border,rgba(255,255,255,.12)); background:var(--panel,#141d2b);
}
.team-preview-name{ font-weight:700; font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.team-preview-stars{ font-size:11px; margin-top:2px; }
.team-preview-stats{ font-size:10.5px; color:var(--muted); margin-top:3px; }
.team-preview-card.team-preview-missing{ color:var(--muted); font-size:12px; text-align:center; }
.team-preview-empty{ color:var(--muted); font-size:13px; margin:0 0 10px; }
`;
    document.head.appendChild(style);
  }

  mount.innerHTML = `
    <div class="team-selector">
      <span class="team-selector-label"><span class=gicon-card></span> เด็คที่ใช้:</span>
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
        if (!card) return `<div class="team-preview-card team-preview-missing">❌<br>การ์ดถูกขายไปแล้ว</div>`;
        const stats = (typeof getRenderStats === "function") ? getRenderStats(card) : { hp: card.hp, atk: card.atk, def: card.def };
        const stars = (typeof getStarsDisplay === "function") ? getStarsDisplay(card.stars, card.maxed) : "⭐".repeat(card.stars || 1);
        return `
          <div class="team-preview-card rarity-${card.rarity}">
            <div class="team-preview-name">${escapeTeamName(card.name)}</div>
            <div class="team-preview-stars">${stars} Lv.${card.level || 1}</div>
            <div class="team-preview-stats">HP ${stats.hp} • ATK ${stats.atk} • DEF ${stats.def}</div>
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
