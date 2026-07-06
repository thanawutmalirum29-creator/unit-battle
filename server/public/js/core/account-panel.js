// js/core/account-panel.js — แถบโปรไฟล์กลาง (โผล่ทุกหน้า) + ป๊อปอัปหน้าบัญชี
// ------------------------------------------------------------------------------
// เดิม "บัญชีของฉัน" เป็นหน้าแยก (pages/account.html) ต้องกดเปลี่ยนหน้าไปดู
// ตอนนี้ย้าย รูปโปรไฟล์ (พร้อมกรอบ) + ชื่อ + เงิน มาโชว์เป็นแถบเดียวด้านบนสุด
// ของทุกหน้าแทน (เหมือนเกมมือถือทั่วไป) แล้วกดที่แถบนี้ (รูป→ชื่อ) เพื่อเปิด
// หน้าบัญชีแบบป๊อปอัปแทนการเปลี่ยนหน้าจริง — หน้าบัญชีแบบเต็มหน้าเดิมเลิกใช้แล้ว
//
// สคริปต์นี้พึ่งพา (ต้องโหลดก่อนหน้านี้ในหน้า HTML): api.js, auth-ui.js, ui-popup.js
// ส่วน bag.js เป็น optional (มีก็ใช้ ไม่มีก็ข้ามแถวกระเป๋าไปเฉยๆ)

(function () {
  "use strict";

  if (document.getElementById("globalProfileBar")) return; // กันฝังซ้ำ

  const BADGE_CATEGORY_LABELS = {
    stage: "<span class=gicon-battle></span> ด่านเนื้อเรื่อง", inf: "<span class=gicon-infinity></span> โหมดไม่สิ้นสุด", guild: "<span class=gicon-castle></span> กิลด์",
    boss: "<span class=gicon-dragon></span> บอสกิลด์", donate: "<span class=gicon-coin></span> การบริจาคกิลด์", rank: "<span class=gicon-trophy></span> ลีดเดอร์บอร์ด",
  };
  const BADGE_CATEGORY_ORDER = ["stage", "inf", "guild", "boss", "donate", "rank"];
  const FRAME_CATEGORY_LABELS = { ...BADGE_CATEGORY_LABELS, guild_shop: "<span class=gicon-cart></span> ร้านค้ากิลด์" };
  const FRAME_CATEGORY_ORDER = [...BADGE_CATEGORY_ORDER, "guild_shop"];

  function tierRarityClass(tier) {
    return tier >= 4 ? "rarity-Mythical" : tier === 3 ? "rarity-Legendary" : tier === 2 ? "rarity-Epic" : "rarity-Rare";
  }

  // ---------------------------------------------------------------- STYLES
  function injectStyles() {
    if (document.getElementById("accountPanelStyles")) return;
    const style = document.createElement("style");
    style.id = "accountPanelStyles";
    style.textContent = `
/* ---- แถบโปรไฟล์กลาง (บนสุดทุกหน้า) ---- */
#globalProfileBar{
  display:flex; align-items:center; gap:10px;
  background:linear-gradient(180deg,rgba(20,29,43,.95),rgba(15,21,31,.95));
  border:1px solid var(--border); border-radius:var(--radius);
  padding:8px 10px; margin:0 0 12px; box-shadow:var(--shadow);
}
#gpbIdentity{
  display:flex; align-items:center; gap:9px; min-width:0;
  background:none; border:none; padding:0; margin:0; cursor:pointer; text-align:left;
  color:var(--text); font-family:inherit;
}
#gpbIdentity:active{ opacity:.8; }
#gpbAvatarRing{
  flex:0 0 auto; width:38px; height:38px; border-radius:50%;
  display:flex; align-items:center; justify-content:center; font-size:18px;
  background:radial-gradient(circle at 35% 30%, #1c2740, #0b1120);
  border:2px solid var(--accent); box-shadow:0 0 12px rgba(92,139,255,.4);
}
#gpbAvatarRing.rarity-Rare{ border-color:var(--c-rare); box-shadow:0 0 14px rgba(47,139,255,.55); }
#gpbAvatarRing.rarity-Epic{ border-color:var(--c-epic); box-shadow:0 0 14px rgba(168,85,247,.55); }
#gpbAvatarRing.rarity-Legendary{ border-color:var(--c-legend); box-shadow:0 0 16px rgba(255,179,0,.6); }
#gpbAvatarRing.rarity-Mythical{ border-color:var(--c-mythical); box-shadow:0 0 16px rgba(255,61,166,.6); }
.gpb-namewrap{ display:flex; flex-direction:column; min-width:0; }
#gpbUsername{ font-weight:800; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:34vw; }
#gpbStatusText{ font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:34vw; }
.gpb-spacer{ flex:1 1 auto; }
#gpbMoneySlot{ flex:0 0 auto; }
#gpbMoneySlot #moneyWindow{ margin:0; }

/* ---- ป๊อปอัปหน้าบัญชี (แผ่นเลื่อนขึ้นจากล่าง) ---- */
.acctp-overlay{
  position:fixed; inset:0; z-index:9500; display:flex; align-items:flex-end; justify-content:center;
  background:rgba(3,6,12,.72); padding:0 0 max(56px, env(safe-area-inset-bottom)); opacity:0; pointer-events:none; transition:opacity .15s ease;
  box-sizing:border-box;
}
.acctp-overlay.open{ opacity:1; pointer-events:auto; }
.acctp-sheet{
  width:100%; max-width:480px; max-height:80vh;
  background:var(--panel-bg,#0e1526); border:1px solid var(--border);
  border-radius:18px 18px 0 0; padding:0 0 22px; box-shadow:0 -8px 40px rgba(0,0,0,.6);
  display:flex; flex-direction:column; transform:translateY(12px); transition:transform .18s ease;
}
.acctp-overlay.open .acctp-sheet{ transform:translateY(0); }
.acctp-handle{ width:36px; height:4px; border-radius:2px; background:var(--border); margin:10px auto 0; flex-shrink:0; }
.acctp-header{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 16px 0; flex-shrink:0; }
.acctp-header h3{ margin:0; font-size:16px; display:flex; align-items:center; gap:6px; }
.acctp-header-actions{ display:flex; align-items:center; gap:8px; }
.acctp-icon-btn{
  width:30px; height:30px; padding:0; border-radius:50%; font-size:14px;
  background:rgba(255,255,255,.05); border:1px solid var(--border); color:var(--text);
  display:flex; align-items:center; justify-content:center; cursor:pointer;
}
.acctp-icon-btn:hover{ background:rgba(255,255,255,.1); }
.acctp-body{ flex:1 1 auto; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:12px 16px 0; }

/* ---- (นำสไตล์เดิมจากหน้าบัญชีเต็มหน้ามาปรับใช้ในป๊อปอัป) ---- */
#acctProfileCard{ display:flex; gap:14px; align-items:center; padding:4px 2px 16px; }
#acctAvatarRing{
  flex:0 0 auto; width:64px; height:64px; border-radius:50%; cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:30px;
  background:radial-gradient(circle at 35% 30%, #1c2740, #0b1120);
  border:2px solid var(--accent); box-shadow:0 0 18px rgba(92,139,255,.4);
  transition:border-color .3s ease, box-shadow .3s ease;
}
#acctAvatarRing:hover{ opacity:.85; }
#acctProfileMain{ flex:1 1 auto; min-width:0; }
#acctUsernameRow{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
#acctUsername{ font-size:19px; font-weight:800; }
#acctRenameBtn{ padding:3px 9px; font-size:12px; }
#acctStatusPill{
  display:inline-flex; align-items:center; gap:5px; margin-top:5px;
  font-size:12px; font-weight:700; padding:3px 10px; border-radius:999px;
  background:rgba(16,185,129,.14); border:1px solid rgba(16,185,129,.4); color:#6ee7b7;
}
#acctStatusPill.status-warn{ background:rgba(255,213,79,.14); border-color:rgba(255,213,79,.4); color:var(--gold); }
#acctStatusPill.status-bad{ background:rgba(239,68,68,.14); border-color:rgba(239,68,68,.4); color:#ffb3b3; }
#acctStatusPill .dot{ width:6px; height:6px; border-radius:50%; background:currentColor; }
#acctPublicIdWrap{ margin-top:6px; font-size:12px; color:var(--muted); }
#acctPublicId{ font-family:monospace; letter-spacing:.5px; cursor:pointer; color:var(--text); border-bottom:1px dashed var(--muted); }
#acctPublicId:hover{ color:var(--accent); }
#acctCopiedHint{ font-size:12px; color:var(--good); margin-left:6px; opacity:0; transition:opacity .2s ease; }
#acctCopiedHint.show{ opacity:1; }
#acctEquippedBadges{ cursor:pointer; display:flex; gap:6px; margin-top:9px; flex-wrap:wrap; }
.acct-badge-tag{
  display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700;
  border-radius:999px; padding:4px 11px 4px 7px; border:1px solid var(--border);
  background:rgba(255,255,255,.05);
}
#acctNoBadgesHint{ display:none !important; }
.acct-badge-slot{
  display:inline-flex; align-items:center; justify-content:center;
  min-width:72px; height:26px; border-radius:999px;
  border:1px dashed var(--border); background:rgba(255,255,255,.03);
  font-size:12px; color:var(--muted); gap:4px; padding:0 10px;
}
.acct-badge-slot.filled{ border-style:solid; border-color:var(--border); background:rgba(255,255,255,.05); color:var(--text); font-weight:700; }
.acct-badge-slot.rarity-Rare{ border-color:var(--c-rare); box-shadow:0 0 8px rgba(47,139,255,.25); }
.acct-badge-slot.rarity-Epic{ border-color:var(--c-epic); box-shadow:0 0 8px rgba(168,85,247,.25); }
.acct-badge-slot.rarity-Legendary{ border-color:var(--c-legend); box-shadow:0 0 8px rgba(255,179,0,.3); }
.acct-badge-slot.rarity-Mythical{ border-color:var(--c-mythical); box-shadow:0 0 8px rgba(255,61,166,.3); }
#acctLoggedOutMsg{ color:var(--muted); font-size:14px; }
.acct-actions{ display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
#acctLogoutBtn{ background:linear-gradient(135deg,#7a1c1c,#4d0f0f); border:1px solid rgba(239,68,68,.4); color:#ffd5d5; }
#acctLogoutBtn:hover{ background:linear-gradient(135deg,#9c2424,#601313); }
#acctMailboxHint{ color:var(--muted); font-size:12.5px; margin-top:10px; }
.acctp-section{ margin-top:18px; }
.acctp-section h4{ margin:0 0 6px; font-size:13px; color:var(--accent-2); text-transform:uppercase; letter-spacing:.4px; }
.acct-row{ display:flex; justify-content:space-between; align-items:center; padding:9px 4px; border-bottom:1px solid var(--border); font-size:14px; }
.acct-row:last-child{ border-bottom:none; }
.acct-row .label{ color:var(--muted); display:inline-flex; align-items:center; gap:6px; }
.acct-row .value{ font-weight:700; }
#acctTeamRow{ margin-top:8px; }
#acctTeamEmptyHint{ font-size:12.5px; color:var(--muted); }
.acct-team-deck{ margin-bottom:14px; }
.acct-team-deck:last-child{ margin-bottom:0; }
.acct-team-deck-name{ font-size:12.5px; font-weight:800; color:var(--accent-2); margin-bottom:6px; }
.acct-team-deck-empty{ font-size:12px; color:var(--muted); margin:0; }
.acct-team-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(90px,1fr)); gap:8px; }
.acct-team-chip{ position:relative; border-radius:var(--radius-sm); padding:8px 6px; text-align:center; border:1.5px solid var(--border); background:rgba(255,255,255,.04); }
.acct-team-chip .name{ font-weight:700; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.acct-team-chip .stars{ font-size:11px; margin-top:2px; }
.acct-team-chip .order{ position:absolute; top:3px; left:5px; font-size:10px; font-weight:800; color:var(--accent-2); }
#acctBadgeHint{ font-size:12.5px; color:var(--muted); margin:2px 0 16px; }
.acct-badge-category{ margin-bottom:18px; }
.acct-badge-category:last-child{ margin-bottom:0; }
.acct-badge-category-label{ font-size:12px; font-weight:800; letter-spacing:.4px; color:var(--accent-2); text-transform:uppercase; margin-bottom:8px; opacity:.85; }
.acct-badge-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }
.acct-badge-card{ position:relative; border-radius:var(--radius-sm); padding:10px; cursor:pointer; user-select:none; text-align:center; border:1px solid var(--border); background:rgba(255,255,255,.03); transition:transform .15s ease, box-shadow .15s ease; }
.acct-badge-card:hover{ transform:translateY(-2px); }
.acct-badge-card .icon{ font-size:24px; line-height:1; }
.acct-badge-card .name{ font-weight:700; font-size:12.5px; margin-top:5px; }
.acct-badge-card .desc{ font-size:10.5px; color:var(--muted); margin-top:3px; line-height:1.35; }
.acct-badge-card .equipped-check{ position:absolute; top:6px; right:6px; width:16px; height:16px; border-radius:50%; background:var(--good); color:#04150f; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.acct-badge-card.locked{ opacity:.4; filter:grayscale(.6); cursor:not-allowed; }
.acct-badge-card.locked:hover{ transform:none; }
.acct-badge-card.rarity-Rare{ border-color:var(--c-rare); background:radial-gradient(circle at top left,#0b1f3d,#07132a,#02060f); }
.acct-badge-card.rarity-Epic{ border-color:var(--c-epic); background:radial-gradient(circle at top left,#1a0b2e,#10061b,#050009); }
.acct-badge-card.rarity-Legendary{ border-color:var(--c-legend); background:radial-gradient(circle at top left,#3a2800,#2b1f00,#120a00); }
.acct-badge-card.rarity-Mythical{ border-color:var(--c-mythical); background:radial-gradient(circle at top left,#330018,#1a0010,#000); }
.acct-badge-card.rarity-Rare.equipped{ box-shadow:0 0 16px rgba(47,139,255,.55); }
.acct-badge-card.rarity-Epic.equipped{ box-shadow:0 0 16px rgba(168,85,247,.55); }
.acct-badge-card.rarity-Legendary.equipped{ box-shadow:0 0 18px rgba(255,179,0,.55); }
.acct-badge-card.rarity-Mythical.equipped{ box-shadow:0 0 18px rgba(255,61,166,.55); }
#acctAvatarGrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(56px,1fr)); gap:8px; margin-top:4px; }
.acct-avatar-option{ display:flex; align-items:center; justify-content:center; font-size:24px; aspect-ratio:1; border-radius:50%; cursor:pointer; user-select:none; border:2px solid var(--border); background:rgba(255,255,255,.03); transition:transform .15s ease, border-color .15s ease; }
.acct-avatar-option:hover{ transform:translateY(-2px); }
.acct-avatar-option.selected{ border-color:var(--accent); box-shadow:0 0 14px rgba(92,139,255,.5); }
#acctFrameHint{ font-size:12.5px; color:var(--muted); margin:14px 0 10px; }
.acct-frame-card.locked{ opacity:.4; filter:grayscale(.6); cursor:not-allowed; }
.acct-frame-card.locked:hover{ transform:none; }
.acct-frame-card .source-tag{ font-size:9.5px; color:var(--muted); margin-top:2px; }
.acct-settings-row{ margin-top:16px; }
.acct-settings-row label{ display:block; font-size:13px; color:var(--muted); margin-bottom:8px; }
.acct-settings-scale-control{ display:flex; align-items:center; gap:10px; }
.acct-settings-scale-control button{ width:32px; height:32px; padding:0; font-size:16px; font-weight:800; border-radius:8px; flex:0 0 auto; }
.acct-settings-scale-control input[type="range"]{ flex:1 1 auto; accent-color:var(--accent); }
.acct-settings-scale-value{ text-align:center; margin-top:6px; font-weight:800; font-size:14px; color:var(--accent-2); }
.acct-settings-hint{ font-size:11.5px; color:var(--muted); margin:12px 0 0; line-height:1.4; }
.acct-settings-reset{ width:100%; margin-top:14px; background:rgba(255,255,255,.05); border:1px solid var(--border); font-size:13px; }
.acctp-overlay .acctp-tabs{ display:flex; margin:10px 0 0; border-radius:8px; overflow:hidden; border:1px solid var(--border); flex-shrink:0; }
.acctp-tab{ flex:1; padding:8px 0; font-size:13px; font-weight:700; text-align:center; background:transparent; border:none; color:var(--muted); cursor:pointer; transition:background .15s, color .15s; }
.acctp-tab.active{ background:var(--accent); color:#fff; }
`;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------- DOM: แถบโปรไฟล์กลาง
  function buildProfileBar() {
    const bar = document.createElement("div");
    bar.id = "globalProfileBar";
    bar.innerHTML = `
      <button type="button" id="gpbIdentity" aria-label="เปิดหน้าบัญชี">
        <span id="gpbAvatarRing"><span class=gicon-shield></span></span>
        <span class="gpb-namewrap">
          <span id="gpbUsername">ผู้เล่น</span>
          <span id="gpbStatusText">-</span>
        </span>
      </button>
      <div class="gpb-spacer"></div>
      <div id="gpbMoneySlot"></div>
    `;
    document.body.insertBefore(bar, document.body.firstChild);

    // ย้าย #moneyWindow ตัวจริงของหน้านั้นๆ มาไว้ในแถบกลาง แทนที่จะซ้ำซ้อนสองที่
    const existingMoney = document.getElementById("moneyWindow");
    if (existingMoney) {
      document.getElementById("gpbMoneySlot").appendChild(existingMoney);
    }

    document.getElementById("gpbIdentity").addEventListener("click", openAccountPopup);
  }

  // ---------------------------------------------------------------- DOM: ป๊อปอัปหน้าบัญชี
  function buildAccountPopup() {
    const overlay = document.createElement("div");
    overlay.id = "acctpOverlay";
    overlay.className = "acctp-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="acctp-sheet">
        <div class="acctp-handle"></div>
        <div class="acctp-header">
          <h3><span class=gicon-user></span> บัญชีของฉัน</h3>
          <div class="acctp-header-actions">
            <button class="acctp-icon-btn" id="acctSettingsBtn" title="ตั้งค่า"><span class=gicon-gear></span></button>
            <button class="acctp-icon-btn" id="acctpCloseBtn" title="ปิด"><span class=gicon-close></span></button>
          </div>
        </div>
        <div class="acctp-body">
          <div id="acctProfileCard">
            <div id="acctAvatarRing"><span class=gicon-shield></span></div>
            <div id="acctProfileMain">
              <div id="acctUsernameRow">
                <span id="acctUsername">-</span>
                <button id="acctRenameBtn" style="display:none!important"></button>
              </div>
              <span id="acctStatusPill"><span class="dot"></span><span id="acctStatusText2">-</span></span>
              <div id="acctPublicIdWrap" style="display:none">
                ID: <span id="acctPublicId" title="แตะเพื่อคัดลอก">-</span><span id="acctCopiedHint">คัดลอกแล้ว <span class=gicon-check></span></span>
              </div>
              <div id="acctEquippedBadges"></div>
              <span id="acctNoBadgesHint" style="display:none"></span>
            </div>
          </div>

          <p id="acctLoggedOutMsg" style="display:none">ยังไม่ได้เข้าสู่ระบบ — กรอกชื่อผู้เล่นและ PIN ในกล่องที่เด้งขึ้นมาเพื่อดูข้อมูลบัญชีของคุณ</p>
          <div class="acct-actions">
            <button id="acctLoginBtn" style="display:none">เข้าสู่ระบบ / สมัคร</button>
            <button id="acctLogoutBtn" style="display:none">ออกจากระบบ</button>
            <button id="acctSwitchBtn" style="display:none">สลับบัญชี</button>
          </div>
          <p id="acctMailboxHint" style="display:none"><span class=gicon-mailbox></span> เปิดกล่องจดหมายได้จากลูกบอลลอยมุมขวาล่าง ใช้ได้จากทุกหน้า</p>

          <div class="acctp-section" id="acctEconomyPanel" style="display:none">
            <h4><span class=gicon-chart-up></span> ทรัพยากรของฉัน</h4>
            <div class="acct-row"><span class="label"><span class=gicon-coin></span> เงิน</span><span class="value" id="acctMoney">0</span></div>
            <div class="acct-row"><span class="label"><span class=gicon-card></span> การ์ดในเด็ค</span><span class="value" id="acctDeckCount">0</span></div>
            <div class="acct-row"><span class="label"><span class=gicon-shield></span> อุปกรณ์ในกระเป๋า</span><span class="value" id="acctEquipCount">0</span></div>
            <div id="acctBag"></div>
          </div>

          <div class="acctp-section" id="acctTeamPanel" style="display:none">
            <h4><span class=gicon-card></span> ทีมที่จัดไว้</h4>
            <div id="acctTeamRow">
              <p id="acctTeamEmptyHint" style="display:none">ยังไม่ได้จัดทีม — ไปที่หน้า "จัดเด็ค" เพื่อเลือกการ์ดเข้าทีม</p>
              <div id="acctTeamGrid" class="acct-team-grid"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // ══ POPUP ย่อย: เลือกปก + กรอบ ══
    const cosOverlay = document.createElement("div");
    cosOverlay.id = "acctCosmeticsOverlay";
    cosOverlay.className = "acctp-overlay";
    cosOverlay.setAttribute("role", "dialog");
    cosOverlay.setAttribute("aria-modal", "true");
    cosOverlay.innerHTML = `
      <div class="acctp-sheet">
        <div class="acctp-handle"></div>
        <div class="acctp-header">
          <h3><span class=gicon-frame></span> ปกและกรอบปก</h3>
          <button class="acctp-icon-btn" id="acctCosmeticsCloseBtn"><span class=gicon-close></span></button>
        </div>
        <div class="acctp-tabs" style="margin:10px 16px 0">
          <button class="acctp-tab active" id="acctTabAvatar">🎨 เลือกปก</button>
          <button class="acctp-tab" id="acctTabFrame">🖼️ กรอบปก (<span id="acctFrameEquippedName">ไม่มี</span>)</button>
        </div>
        <div class="acctp-body">
          <div id="acctCosTabAvatar">
            <div id="acctAvatarGrid"></div>
          </div>
          <div id="acctCosTabFrame" style="display:none">
            <p id="acctFrameHint">กรอบปกต้องปลดล็อกจากความสำเร็จในเกม หรือซื้อได้ในร้านค้ากิลด์</p>
            <div class="acct-badge-grid" id="acctFrameGrid"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(cosOverlay);

    // ══ POPUP ย่อย: เหรียญความสำเร็จ ══
    const badgeOverlay = document.createElement("div");
    badgeOverlay.id = "acctBadgeOverlay";
    badgeOverlay.className = "acctp-overlay";
    badgeOverlay.setAttribute("role", "dialog");
    badgeOverlay.setAttribute("aria-modal", "true");
    badgeOverlay.innerHTML = `
      <div class="acctp-sheet">
        <div class="acctp-handle"></div>
        <div class="acctp-header">
          <h3><span class=gicon-medal></span> เหรียญความสำเร็จ</h3>
          <button class="acctp-icon-btn" id="acctBadgeCloseBtn"><span class=gicon-close></span></button>
        </div>
        <div class="acctp-body">
          <p id="acctBadgeHint">แตะเพื่อติด/ถอดเหรียญที่ปลดล็อกแล้ว — เลือกโชว์ได้สูงสุด <span id="acctBadgeMax">3</span> เหรียญ (<span id="acctBadgeCount">0</span>/<span id="acctBadgeMax2">3</span>)</p>
          <div id="acctBadgeCategories"></div>
        </div>
      </div>
    `;
    document.body.appendChild(badgeOverlay);

    // ══ POPUP ย่อย: ตั้งค่า (ขนาด UI) ══
    const settingsOverlay = document.createElement("div");
    settingsOverlay.id = "acctSettingsOverlay";
    settingsOverlay.className = "acctp-overlay";
    settingsOverlay.setAttribute("role", "dialog");
    settingsOverlay.setAttribute("aria-modal", "true");
    settingsOverlay.innerHTML = `
      <div class="acctp-sheet">
        <div class="acctp-handle"></div>
        <div class="acctp-header">
          <h3><span class=gicon-gear></span> ตั้งค่า</h3>
          <button class="acctp-icon-btn" id="acctSettingsCloseBtn"><span class=gicon-close></span></button>
        </div>
        <div class="acctp-body">
          <div class="acct-settings-row">
            <label for="acctUiScaleRange">ขนาด UI ทั้งเกม (ฟอนต์ กริด ปุ่ม ฯลฯ)</label>
            <div class="acct-settings-scale-control">
              <button id="acctUiScaleDownBtn" type="button">−</button>
              <input type="range" id="acctUiScaleRange" min="0.7" max="1.3" step="0.05" value="1" />
              <button id="acctUiScaleUpBtn" type="button">+</button>
            </div>
            <div class="acct-settings-scale-value"><span id="acctUiScaleValue">100%</span></div>
          </div>
          <p class="acct-settings-hint">ปรับแล้วมีผลทันทีทุกหน้าในเกม — ตั้งไว้ที่เครื่อง/เบราว์เซอร์นี้เท่านั้น ไม่เกี่ยวกับข้อมูลบัญชี</p>
          <button id="acctUiScaleResetBtn" class="acct-settings-reset" type="button">รีเซ็ตเป็นค่าเริ่มต้น (100%)</button>
        </div>
      </div>
    `;
    document.body.appendChild(settingsOverlay);
  }

  // ---------------------------------------------------------------- helpers เปิด/ปิดป๊อปอัป
  function openOverlay(el) { el.classList.add("open"); }
  function closeOverlay(el) { el.classList.remove("open"); }

  function openAccountPopup() {
    openOverlay(document.getElementById("acctpOverlay"));
    renderAccountPage();
  }
  function closeAccountPopup() { closeOverlay(document.getElementById("acctpOverlay")); }

  function openCosmeticsPopup() {
    if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) return;
    openOverlay(document.getElementById("acctCosmeticsOverlay"));
    switchCosTab("avatar");
    if (!_cosmeticsState) loadAndRenderCosmetics();
  }
  function closeCosmeticsPopup() { closeOverlay(document.getElementById("acctCosmeticsOverlay")); }
  function switchCosTab(tab) {
    document.getElementById("acctCosTabAvatar").style.display = tab === "avatar" ? "" : "none";
    document.getElementById("acctCosTabFrame").style.display = tab === "frame" ? "" : "none";
    document.getElementById("acctTabAvatar").classList.toggle("active", tab === "avatar");
    document.getElementById("acctTabFrame").classList.toggle("active", tab === "frame");
  }

  function openBadgePopup() {
    if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) return;
    openOverlay(document.getElementById("acctBadgeOverlay"));
    if (!_badgeState) loadAndRenderBadges();
  }
  function closeBadgePopup() { closeOverlay(document.getElementById("acctBadgeOverlay")); }

  // ---------------------------------------------------------------- ค่า state
  let _badgeState = null;
  let _cosmeticsState = null;

  function setStatusPill(text, tone) {
    const pill = document.getElementById("acctStatusPill");
    pill.classList.remove("status-warn", "status-bad");
    if (tone) pill.classList.add(tone);
    document.getElementById("acctStatusText2").innerHTML = text;
  }

  function renderAcctBagRows() {
    const mount = document.getElementById("acctBag");
    if (!mount || typeof BAG_DISPLAY_ITEMS === "undefined") return;
    mount.innerHTML = BAG_DISPLAY_ITEMS.map((item) => {
      const acctId = "acct" + item.id.charAt(0).toUpperCase() + item.id.slice(1);
      const icon = typeof itemIconHTML === "function" ? itemIconHTML(item.id) : "";
      return `<div class="acct-row"><span class="label">${icon}${item.label}</span><span class="value" id="${acctId}">0</span></div>`;
    }).join("");
  }

  // แสดง "เด็คที่จัดไว้" ทั้ง 5 ชุด (ชื่อที่ตั้งเอง + การ์ดในเด็คนั้น) — อ่านจาก
  // localStorage "teamDecks" ตรง ๆ (ไม่พึ่ง team-store.js เพราะบางหน้าที่เปิดป๊อปอัป
  // แอคเคาท์ไม่ได้โหลดไฟล์นั้น) ใช้ deckList (จาก server state ที่ fetch มาแล้ว)
  // มาจับคู่หาชื่อ/ดาวของแต่ละการ์ดในแต่ละเด็ค
  function renderAcctTeam(deckList) {
    const panel = document.getElementById("acctTeamPanel");
    const grid = document.getElementById("acctTeamGrid");
    const emptyHint = document.getElementById("acctTeamEmptyHint");
    if (!panel || !grid || !emptyHint) return;
    panel.style.display = "block";

    let teamDecks = [];
    try { teamDecks = JSON.parse(localStorage.getItem("teamDecks") || "[]"); }
    catch (e) { teamDecks = []; }

    // ข้อมูลเก่าก่อนมีระบบหลายเด็ค (ยังไม่เคยเปิดหน้า "จัดเด็ค" หลังอัปเดต) — เผื่อไว้
    if (!Array.isArray(teamDecks) || teamDecks.length === 0) {
      let legacy = [];
      try { legacy = JSON.parse(localStorage.getItem("selectedIndexes") || "[]"); }
      catch (e) { legacy = []; }
      teamDecks = legacy.length > 0 ? [{ name: "เด็ค1", indexes: legacy }] : [];
    }

    const deck = Array.isArray(deckList) ? deckList : [];
    const hasAnyCard = teamDecks.some((d) => Array.isArray(d.indexes) && d.indexes.length > 0);

    if (!hasAnyCard) {
      grid.innerHTML = "";
      emptyHint.style.display = "block";
      return;
    }
    emptyHint.style.display = "none";

    grid.innerHTML = teamDecks.map((d) => {
      const cards = (Array.isArray(d.indexes) ? d.indexes : [])
        .map((id) => deck.find((c) => c && c.id === id))
        .filter(Boolean);

      const cardsHTML = cards.length > 0
        ? cards.map((card, i) => {
            const stars = typeof getStarsDisplay === "function" ? getStarsDisplay(card.stars || 1, card.maxed) : "⭐".repeat(card.stars || 1);
            return `<div class="acct-team-chip rarity-${card.rarity || "Common"}">
              <span class="order">${i + 1}</span>
              <div class="name">${card.name || "-"}</div>
              <div class="stars">${stars}</div>
            </div>`;
          }).join("")
        : `<p class="acct-team-deck-empty">ยังไม่มีการ์ดในเด็คนี้</p>`;

      return `<div class="acct-team-deck">
        <div class="acct-team-deck-name">${(d.name || "เด็ค").replace(/</g, "&lt;")}</div>
        <div class="acct-team-grid">${cardsHTML}</div>
      </div>`;
    }).join("");
  }

  // ---------------------------------------------------------------- แถบกลาง (ชื่อ/รูป/สถานะ)
  function renderGlobalBar(loggedIn, username, statusHtml, avatarHtml, frameClass) {
    document.getElementById("gpbUsername").textContent = loggedIn ? username : "ผู้เล่น";
    document.getElementById("gpbStatusText").innerHTML = loggedIn ? statusHtml : "ยังไม่ได้เข้าสู่ระบบ";
    const ring = document.getElementById("gpbAvatarRing");
    ring.innerHTML = avatarHtml || "<span class=gicon-shield></span>";
    ring.classList.remove("rarity-Rare", "rarity-Epic", "rarity-Legendary", "rarity-Mythical");
    if (frameClass) ring.classList.add(frameClass);
  }

  async function renderAccountPage() {
    const loggedIn = window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn();
    document.getElementById("acctLoginBtn").style.display = loggedIn ? "none" : "inline-block";
    document.getElementById("acctLogoutBtn").style.display = loggedIn ? "inline-block" : "none";
    document.getElementById("acctSwitchBtn").style.display = loggedIn ? "inline-block" : "none";
    document.getElementById("acctRenameBtn").style.display = loggedIn ? "inline-block" : "none";
    document.getElementById("acctLoggedOutMsg").style.display = loggedIn ? "none" : "block";
    document.getElementById("acctEconomyPanel").style.display = loggedIn ? "block" : "none";
    document.getElementById("acctTeamPanel").style.display = loggedIn ? "block" : "none";
    document.getElementById("acctMailboxHint").style.display = loggedIn ? "block" : "none";
    document.getElementById("acctPublicIdWrap").style.display = loggedIn ? "block" : "none";

    if (!loggedIn) {
      document.getElementById("acctUsername").textContent = "-";
      setStatusPill("ยังไม่ได้เข้าสู่ระบบ");
      document.getElementById("acctEquippedBadges").innerHTML = "";
      document.getElementById("acctNoBadgesHint").style.display = "none";
      const ring = document.getElementById("acctAvatarRing");
      ring.innerHTML = "<span class=gicon-shield></span>";
      ring.classList.remove("rarity-Rare", "rarity-Epic", "rarity-Legendary", "rarity-Mythical");
      _cosmeticsState = null;
      renderGlobalBar(false);
      return;
    }

    const username = localStorage.getItem("username") || "-";
    document.getElementById("acctUsername").textContent = username;
    setStatusPill("เข้าสู่ระบบแล้ว <span class=gicon-check-circle></span>");

    const me = await GameAPI.refreshMe();
    document.getElementById("acctPublicId").textContent = me?.publicId || localStorage.getItem("publicId") || "-";
    let statusHtml = "เข้าสู่ระบบแล้ว <span class=gicon-check-circle></span>";
    if (me?.status && me.status !== "active") {
      const bad = me.status === "suspended";
      statusHtml = bad ? "<span class=gicon-warning></span> บัญชีถูกระงับการใช้งาน" : "<span class=gicon-block></span> บัญชีถูกแบน";
      setStatusPill(statusHtml, bad ? "status-warn" : "status-bad");
    }
    renderGlobalBar(true, username, statusHtml);

    const state = await GameAPI.fetchEconomyState();
    if (!state) {
      setStatusPill("โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า", "status-warn");
      return;
    }

    const money = typeof state.money === "number" ? state.money : 0;
    document.getElementById("acctMoney").textContent = money;
    document.getElementById("acctDeckCount").textContent = Array.isArray(state.deck) ? state.deck.length : 0;
    const acctEquipCountEl = document.getElementById("acctEquipCount");
    if (acctEquipCountEl) acctEquipCountEl.textContent = Array.isArray(state.equip_bag) ? state.equip_bag.length : 0;

    const bag = state.bag || {};
    const bagFields = {
      acctMemoryRare: "memoryRare", acctMemoryEpic: "memoryEpic",
      acctMemoryLegendary: "memoryLegendary", acctMemoryMythical: "memoryMythical",
      acctMemoryCosmic: "memoryCosmic", acctShardGray: "shardGray",
      acctShardBlue: "shardBlue", acctShardPurple: "shardPurple",
      acctShardGold: "shardGold", acctShardRed: "shardRed", acctShardSky: "shardSky",
    };
    renderAcctBagRows();
    for (const [elId, key] of Object.entries(bagFields)) {
      const el = document.getElementById(elId);
      if (el) el.textContent = bag[key] || 0;
    }

    renderAcctTeam(state.deck);

    loadAndRenderBadges();
    loadAndRenderCosmetics();
  }

  async function loadAndRenderBadges() {
    const data = await GameAPI.fetchBadges();
    if (!data || !Array.isArray(data.badges)) return;
    _badgeState = data;
    renderEquippedBadgeTags();
    renderBadgeCategories();
  }

  function renderEquippedBadgeTags() {
    const mount = document.getElementById("acctEquippedBadges");
    if (!_badgeState) return;
    const max = _badgeState.maxEquipped || 3;
    const equippedBadges = _badgeState.equipped
      .map((key) => _badgeState.badges.find((b) => b.key === key))
      .filter(Boolean);
    const slots = Array.from({ length: max }, (_, i) => {
      const b = equippedBadges[i];
      if (b) return `<span class="acct-badge-slot filled ${tierRarityClass(b.tier)}" title="${b.desc}">${b.icon} ${b.name}</span>`;
      return `<span class="acct-badge-slot"></span>`;
    });
    mount.innerHTML = slots.join("");
  }

  function renderBadgeCategories() {
    const mount = document.getElementById("acctBadgeCategories");
    if (!_badgeState) return;
    const max = _badgeState.maxEquipped || 3;
    document.getElementById("acctBadgeMax").textContent = max;
    document.getElementById("acctBadgeMax2").textContent = max;
    document.getElementById("acctBadgeCount").textContent = _badgeState.equipped.length;

    mount.innerHTML = BADGE_CATEGORY_ORDER.map((cat) => {
      const badgesInCat = _badgeState.badges.filter((b) => b.category === cat).sort((a, b) => a.tier - b.tier);
      if (badgesInCat.length === 0) return "";
      const cards = badgesInCat.map((b) => {
        const isEquipped = _badgeState.equipped.includes(b.key);
        const cls = ["acct-badge-card", tierRarityClass(b.tier), b.unlocked ? "" : "locked", isEquipped ? "equipped" : ""].filter(Boolean).join(" ");
        return `<div class="${cls}" data-key="${b.key}">
          ${isEquipped ? '<div class="equipped-check"><span class=gicon-check></span></div>' : ""}
          <div class="icon">${b.unlocked ? b.icon : "<span class=gicon-lock></span>"}</div>
          <div class="name">${b.name}</div>
          <div class="desc">${b.desc}</div>
        </div>`;
      }).join("");
      return `<div class="acct-badge-category">
        <div class="acct-badge-category-label">${BADGE_CATEGORY_LABELS[cat] || cat}</div>
        <div class="acct-badge-grid">${cards}</div>
      </div>`;
    }).join("");

    mount.querySelectorAll(".acct-badge-card").forEach((card) => {
      card.addEventListener("click", () => toggleBadge(card.dataset.key));
    });
  }

  async function toggleBadge(key) {
    if (!_badgeState) return;
    const badge = _badgeState.badges.find((b) => b.key === key);
    if (!badge || !badge.unlocked) return;

    const already = _badgeState.equipped.includes(key);
    let next;
    if (already) {
      next = _badgeState.equipped.filter((k) => k !== key);
    } else {
      if (_badgeState.equipped.length >= (_badgeState.maxEquipped || 3)) {
        alert(`โชว์ได้สูงสุด ${_badgeState.maxEquipped || 3} เหรียญ — ถอดอันอื่นก่อนนะ`);
        return;
      }
      next = [..._badgeState.equipped, key];
    }

    const result = await GameAPI.setEquippedBadges(next);
    if (result?.error) { alert(result.error); return; }
    _badgeState.equipped = result.equipped;
    renderEquippedBadgeTags();
    renderBadgeCategories();
  }

  async function loadAndRenderCosmetics() {
    const data = await GameAPI.fetchCosmetics();
    if (!data) return;
    _cosmeticsState = data;
    applyAvatarRing();
    renderAvatarGrid();
    renderFrameGrid();
  }

  function applyAvatarRing() {
    if (!_cosmeticsState) return;
    const ring = document.getElementById("acctAvatarRing");
    const avatar = _cosmeticsState.avatar.catalog.find((a) => a.key === _cosmeticsState.avatar.current);
    const avatarHtml = avatar ? avatar.icon : "<span class=gicon-shield></span>";
    ring.innerHTML = avatarHtml;

    ring.classList.remove("rarity-Rare", "rarity-Epic", "rarity-Legendary", "rarity-Mythical");
    const equippedKey = _cosmeticsState.frames.equipped;
    const frame = equippedKey ? _cosmeticsState.frames.catalog.find((f) => f.key === equippedKey) : null;
    const frameClass = frame ? tierRarityClass(frame.tier) : null;
    if (frameClass) ring.classList.add(frameClass);
    document.getElementById("acctFrameEquippedName").textContent = frame ? frame.name : "ไม่มี";

    // ให้แถบกลางด้านบนใช้ปกและกรอบเดียวกันเป๊ะๆ
    const gpbRing = document.getElementById("gpbAvatarRing");
    gpbRing.innerHTML = avatarHtml;
    gpbRing.classList.remove("rarity-Rare", "rarity-Epic", "rarity-Legendary", "rarity-Mythical");
    if (frameClass) gpbRing.classList.add(frameClass);
  }

  function renderAvatarGrid() {
    const mount = document.getElementById("acctAvatarGrid");
    if (!_cosmeticsState) return;
    mount.innerHTML = _cosmeticsState.avatar.catalog.map((a) => {
      const selected = a.key === _cosmeticsState.avatar.current;
      return `<div class="acct-avatar-option${selected ? " selected" : ""}" data-key="${a.key}" title="${a.name}">${a.icon}</div>`;
    }).join("");
    mount.querySelectorAll(".acct-avatar-option").forEach((el) => {
      el.addEventListener("click", () => toggleAvatar(el.dataset.key));
    });
  }

  async function toggleAvatar(key) {
    if (!_cosmeticsState || key === _cosmeticsState.avatar.current) return;
    const result = await GameAPI.setAvatar(key);
    if (result?.error) { alert(result.error); return; }
    _cosmeticsState.avatar.current = key;
    applyAvatarRing();
    renderAvatarGrid();
  }

  function renderFrameGrid() {
    const mount = document.getElementById("acctFrameGrid");
    if (!_cosmeticsState) return;
    const cards = FRAME_CATEGORY_ORDER.flatMap((cat) => {
      const framesInCat = _cosmeticsState.frames.catalog.filter((f) => f.category === cat);
      return framesInCat.map((f) => ({ ...f, categoryLabel: FRAME_CATEGORY_LABELS[cat] || cat }));
    });

    mount.innerHTML = cards.map((f) => {
      const isEquipped = _cosmeticsState.frames.equipped === f.key;
      const cls = ["acct-badge-card", "acct-frame-card", tierRarityClass(f.tier), f.unlocked ? "" : "locked", isEquipped ? "equipped" : ""].filter(Boolean).join(" ");
      return `<div class="${cls}" data-key="${f.key}">
        ${isEquipped ? '<div class="equipped-check"><span class=gicon-check></span></div>' : ""}
        <div class="icon"><span class=gicon-frame></span></div>
        <div class="name">${f.name}</div>
        <div class="desc">${f.unlocked ? f.desc : (f.source === "guild_shop" ? "ซื้อได้ที่ร้านค้ากิลด์" : f.desc)}</div>
        <div class="source-tag">${f.categoryLabel}</div>
      </div>`;
    }).join("");

    mount.querySelectorAll(".acct-frame-card").forEach((card) => {
      card.addEventListener("click", () => toggleFrame(card.dataset.key));
    });
  }

  async function toggleFrame(key) {
    if (!_cosmeticsState) return;
    const frame = _cosmeticsState.frames.catalog.find((f) => f.key === key);
    if (!frame || !frame.unlocked) return;

    const already = _cosmeticsState.frames.equipped === key;
    const next = already ? null : key;
    const result = await GameAPI.setEquippedFrame(next);
    if (result?.error) { alert(result.error); return; }
    _cosmeticsState.frames.equipped = result.equipped;
    applyAvatarRing();
    renderFrameGrid();
  }

  // ---------------------------------------------------------------- ตั้งค่า (ขนาด UI)
  function syncUiScaleControls() {
    const scale = window.UIScale ? UIScale.get() : 1;
    document.getElementById("acctUiScaleRange").value = scale;
    document.getElementById("acctUiScaleValue").textContent = Math.round(scale * 100) + "%";
  }
  function applyUiScale(newScale) {
    if (!window.UIScale) return;
    const clamped = UIScale.set(newScale);
    syncUiScaleControls();
    return clamped;
  }

  // ---------------------------------------------------------------- ผูกอีเวนต์ทั้งหมด
  function wireEvents() {
    document.getElementById("acctpCloseBtn").addEventListener("click", closeAccountPopup);
    document.getElementById("acctpOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeAccountPopup();
    });

    document.getElementById("acctSettingsBtn").addEventListener("click", () => {
      syncUiScaleControls();
      openOverlay(document.getElementById("acctSettingsOverlay"));
    });
    document.getElementById("acctSettingsCloseBtn").addEventListener("click", () => {
      closeOverlay(document.getElementById("acctSettingsOverlay"));
    });
    document.getElementById("acctSettingsOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeOverlay(e.currentTarget);
    });
    document.getElementById("acctUiScaleRange").addEventListener("input", (e) => {
      applyUiScale(parseFloat(e.target.value));
    });
    document.getElementById("acctUiScaleDownBtn").addEventListener("click", () => {
      if (!window.UIScale) return;
      applyUiScale(UIScale.get() - UIScale.STEP);
    });
    document.getElementById("acctUiScaleUpBtn").addEventListener("click", () => {
      if (!window.UIScale) return;
      applyUiScale(UIScale.get() + UIScale.STEP);
    });
    document.getElementById("acctUiScaleResetBtn").addEventListener("click", () => {
      if (!window.UIScale) return;
      UIScale.reset();
      syncUiScaleControls();
    });

    document.getElementById("acctPublicId").addEventListener("click", async () => {
      const id = document.getElementById("acctPublicId").textContent.trim();
      if (!id || id === "-") return;
      try {
        await navigator.clipboard.writeText(id);
      } catch (err) {
        await uiPrompt("คัดลอก ID นี้ (Ctrl+C แล้วปิด):", id);
        return;
      }
      const hint = document.getElementById("acctCopiedHint");
      hint.classList.add("show");
      clearTimeout(hint._t);
      hint._t = setTimeout(() => hint.classList.remove("show"), 1500);
    });

    document.getElementById("acctLoginBtn").addEventListener("click", () => {
      if (window.AuthUI) AuthUI.showModal();
    });

    document.getElementById("acctLogoutBtn").addEventListener("click", async () => {
      if (!(await uiConfirm("ออกจากระบบ?"))) return;
      GameAPI.logout();
      location.reload();
    });

    document.getElementById("acctSwitchBtn").addEventListener("click", async () => {
      if (!(await uiConfirm("สลับไปบัญชีอื่น? (จะออกจากระบบบัญชีปัจจุบันก่อน)"))) return;
      GameAPI.logout();
      location.reload();
    });

    document.getElementById("acctRenameBtn").addEventListener("click", async () => {
      const current = localStorage.getItem("username") || "";
      const next = await uiPrompt("ตั้งชื่อผู้เล่นใหม่ (2-32 ตัวอักษร):", current);
      if (next === null) return;
      const trimmed = next.trim();
      if (trimmed.length < 2 || trimmed.length > 32) { alert("ชื่อต้องยาว 2-32 ตัวอักษร"); return; }
      if (trimmed === current) return;

      const result = await GameAPI.updateUsername(trimmed);
      if (result?.username) {
        document.getElementById("acctUsername").textContent = result.username;
        document.getElementById("gpbUsername").textContent = result.username;
        alert("เปลี่ยนชื่อสำเร็จ!");
      } else {
        alert(result?.error === "username already taken" ? "ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่น" : (result?.error || "เปลี่ยนชื่อไม่สำเร็จ ลองใหม่อีกครั้ง"));
      }
    });

    document.getElementById("acctAvatarRing").addEventListener("click", openCosmeticsPopup);
    document.getElementById("acctCosmeticsCloseBtn").addEventListener("click", closeCosmeticsPopup);
    document.getElementById("acctCosmeticsOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeCosmeticsPopup();
    });
    document.getElementById("acctTabAvatar").addEventListener("click", () => switchCosTab("avatar"));
    document.getElementById("acctTabFrame").addEventListener("click", () => switchCosTab("frame"));

    document.getElementById("acctEquippedBadges").addEventListener("click", openBadgePopup);
    document.getElementById("acctNoBadgesHint").addEventListener("click", openBadgePopup);
    document.getElementById("acctBadgeCloseBtn").addEventListener("click", closeBadgePopup);
    document.getElementById("acctBadgeOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeBadgePopup();
    });
  }

  // ---------------------------------------------------------------- init
  function init() {
    injectStyles();
    buildProfileBar();
    buildAccountPopup();
    wireEvents();
    // เติมชื่อ/รูปเบื้องต้นจาก localStorage ทันที (ก่อนรอ fetch จากเซิร์ฟเวอร์)
    const loggedIn = window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn();
    renderGlobalBar(loggedIn, localStorage.getItem("username") || "-", "");
    renderAccountPage();
  }

  // เผื่อกรณี auth-ui.js เด้ง modal login ตอน DOMContentLoaded พอดี — รันหลังจากนั้นเล็กน้อยก็พอ
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // เปิดให้หน้าอื่น (เช่น ปุ่มเมนู ☰ ของ nav-fab.js) เรียกเปิดป๊อปอัปนี้ได้โดยตรง
  window.AccountPanel = { open: openAccountPopup, close: closeAccountPopup };
})();
