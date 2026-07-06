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
  `;

  document.getElementById("teamSelectorPick").addEventListener("change", (e) => {
    const slot = parseInt(e.target.value, 10);
    setActiveDeckSlot(pageKey, slot);
    // หน้าโหมด Normal/Inf เก็บทีมปัจจุบันไว้ในตัวแปร global `selectedIndexes` —
    // อัปเดตให้ตรงกับเด็คที่เพิ่งเลือกทันที (หน้า Boss อ่านสดจาก loadSelectedTeam()
    // ทุกครั้งที่เริ่มสู้อยู่แล้ว ไม่ต้องมีตัวแปรนี้ก็ได้ เช็คแบบ guard ไว้กันพัง)
    if (typeof selectedIndexes !== "undefined") {
      selectedIndexes = loadSelectedTeam(pageKey);
    }
  });
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
