// js/core/hub-ui.js — ตัวควบคุมหน้ารวมโหมดต่อสู้ (Normal / Boss / Infinity)
//
// หน้าที่:
//  1) สลับโหมด (ปุ่ม 3 ปุ่มด้านบน) — โชว์พื้นที่ "เลือกด่าน/บอส/checkpoint" ของโหมดนั้น
//     ส่วนสคริปต์ของแต่ละโหมด (N-Mode.js / boss.js / inf-mode.js) จะโหลดแบบ lazy
//     ครั้งแรกที่กดแท็บนั้นเท่านั้น (กันปัญหาตัวแปร global ชนกันถ้าโหลดพร้อมกันหมด)
//  2) ซ่อนพื้นที่ต่อสู้ (battlefield + log) จนกว่าจะกด "เริ่มเกม" — หน้าสุดท้ายหลังเริ่ม
//     จะมีแค่พื้นที่ต่อสู้ล้วนๆ ตามที่ต้องการ
//  3) เก็บสถิติดาเมจ "ทำ/รับ" ต่อหน่วยระหว่างการต่อสู้ (ผูกกับ applyDamage ใน attack.js)
//  4) หลังจบการต่อสู้ โชว์หน้าสรุปผล: แพ้/ชนะ, รางวัลที่ได้, ตารางดาเมจทีมเรา/ศัตรู
//     กด "ดำเนินการต่อ" แล้วกลับไปหน้าเลือกโหมด
window.HubUI = (function () {
  "use strict";

  const MODE_SCRIPTS = {
    normal: "../js/modes/NORMAL/N-Mode.js",
    boss: "../js/modes/BOSS/boss.js",
    inf: "../js/modes/INF/inf-mode.js",
  };
  const MODE_LABELS = {
    normal: "🎴 Normal Mode",
    boss: "👹 Boss Mode",
    inf: "🌀 Infinite Mode",
  };

  let currentMode = "normal";
  const loadedScripts = {};

  let damageStats = {};   // instanceId -> {name, isEnemy, dealt, taken}
  let rewardTotals = { money: 0, drops: {} };

  /* ============================
     Damage / Reward tracking
     ============================ */
  function ensureEntry(unit) {
    if (!unit || !unit.instanceId) return null;
    if (!damageStats[unit.instanceId]) {
      damageStats[unit.instanceId] = {
        name: unit.name || "?",
        isEnemy: !!unit.isEnemy,
        dealt: 0,
        taken: 0,
      };
    }
    // ชื่อ/ฝั่งอาจยังไม่ถูกตั้งตอน entry ถูกสร้างจากอีกฝั่ง (เช่นโดนตีก่อนได้ตี) — อัปเดตให้ตรงเสมอ
    damageStats[unit.instanceId].name = unit.name || damageStats[unit.instanceId].name;
    damageStats[unit.instanceId].isEnemy = !!unit.isEnemy;
    return damageStats[unit.instanceId];
  }

  function trackDamage(attacker, target, dmg) {
    if (!Number.isFinite(dmg) || dmg <= 0) return;
    const a = ensureEntry(attacker);
    const t = ensureEntry(target);
    if (a) a.dealt += dmg;
    if (t) t.taken += dmg;
  }

  function resetDamageStats() {
    damageStats = {};
  }

  function resetRewards() {
    rewardTotals = { money: 0, drops: {} };
  }

  function addReward(money, drops) {
    rewardTotals.money += Number(money) || 0;
    for (const [key, amount] of Object.entries(drops || {})) {
      rewardTotals.drops[key] = (rewardTotals.drops[key] || 0) + (Number(amount) || 0);
    }
  }

  /* ============================
     Screen switching
     ============================ */
  function els() {
    return {
      selects: {
        normal: document.getElementById("normalSelect"),
        boss: document.getElementById("bossSelect"),
        inf: document.getElementById("infSelect"),
      },
      battleScreen: document.getElementById("battleScreen"),
      results: document.getElementById("resultsOverlay"),
      tabs: document.querySelectorAll(".mode-tab-btn"),
    };
  }

  function hideAllSelects() {
    const { selects } = els();
    Object.values(selects).forEach((el) => el && (el.style.display = "none"));
  }

  function enterBattle() {
    const { battleScreen, results } = els();
    hideAllSelects();
    if (results) results.style.display = "none";
    if (battleScreen) battleScreen.style.display = "";
  }

  function exitToSelect() {
    const { battleScreen, results, selects } = els();
    if (battleScreen) battleScreen.style.display = "none";
    if (results) results.style.display = "none";
    hideAllSelects();
    const target = selects[currentMode];
    if (target) target.style.display = "";
  }

  function loadModeScript(mode) {
    if (loadedScripts[mode]) return loadedScripts[mode];
    loadedScripts[mode] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = MODE_SCRIPTS[mode];
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("โหลดสคริปต์โหมด " + mode + " ไม่สำเร็จ"));
      document.body.appendChild(s);
    });
    return loadedScripts[mode];
  }

  function isBattleRunning() {
    return !!window.battleRunning;
  }

  function selectMode(mode, opts) {
    opts = opts || {};
    if (!MODE_SCRIPTS[mode]) return;
    if (isBattleRunning()) {
      if (!opts.force) alert("ไม่สามารถเปลี่ยนโหมดขณะต่อสู้อยู่ได้ — ยกเลิกการต่อสู้ก่อน");
      return;
    }

    currentMode = mode;

    const { tabs } = els();
    tabs.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    const results = document.getElementById("resultsOverlay");
    if (results) results.style.display = "none";
    const battleScreen = document.getElementById("battleScreen");
    if (battleScreen) battleScreen.style.display = "none";
    hideAllSelects();
    const { selects } = els();
    if (selects[mode]) selects[mode].style.display = "";

    // เด็คที่ใช้แสดงในหน้านี้ ผูกกับโหมดที่กำลังเลือกอยู่
    const mount = document.getElementById("teamSelectorMount");
    if (mount) {
      mount.dataset.pageKey = mode;
      if (typeof renderTeamSelectorUI === "function") {
        renderTeamSelectorUI(mount, mode);
      }
    }

    if (!opts.skipHistory) {
      const url = new URL(location.href);
      url.searchParams.set("mode", mode);
      history.replaceState(null, "", url);
    }

    loadModeScript(mode).catch((err) => {
      console.error(err);
      alert("โหลดโหมดนี้ไม่สำเร็จ ลองรีเฟรชหน้าใหม่");
    });

    // กันคลิกปุ่มเริ่มสู้ก่อนสคริปต์ของโหมดนั้นโหลดเสร็จ (ครั้งแรกที่เข้าแท็บนี้)
    const section = els().selects[mode];
    if (section && !loadedScripts[mode + "_ready"]) {
      const controls = section.querySelectorAll("button");
      controls.forEach((b) => (b.disabled = true));
      loadModeScript(mode).then(() => {
        loadedScripts[mode + "_ready"] = true;
        controls.forEach((b) => (b.disabled = false));
      });
    }
  }

  /* ============================
     Results screen
     ============================ */
  function buildRow(entry) {
    return `<tr class="${entry.isEnemy ? "row-enemy" : "row-player"}">
      <td>${entry.isEnemy ? "👾" : "🛡️"} ${entry.name}</td>
      <td>${entry.dealt.toLocaleString()}</td>
      <td>${entry.taken.toLocaleString()}</td>
    </tr>`;
  }

  function showResults(data) {
    data = data || {};
    const overlay = document.getElementById("resultsOverlay");
    if (!overlay) return;

    // เติม entry ให้ครบทุกตัวในทีม แม้ตัวที่ไม่เคยทำ/โดนดาเมจเลยก็ให้โผล่ในตาราง (0/0)
    [...(data.playerTeam || []), ...(data.enemyTeam || [])].forEach((u) => {
      if (u && u.instanceId && !damageStats[u.instanceId]) ensureEntry(u);
    });

    const rows = Object.values(damageStats)
      .sort((a, b) => (b.isEnemy === a.isEnemy ? b.dealt - a.dealt : a.isEnemy - b.isEnemy))
      .map(buildRow)
      .join("");

    const dropsList = Object.entries(rewardTotals.drops)
      .map(([k, v]) => `<li>🎁 ${v.toLocaleString()}x ${k}</li>`)
      .join("") || "<li>—</li>";

    overlay.innerHTML = `
      <div class="results-panel">
        <h2 class="${data.win ? "result-win" : "result-lose"}">${data.title || (data.win ? "🎉 คุณชนะ!" : "💀 คุณแพ้")}</h2>
        ${data.extraNote ? `<p class="results-note">${data.extraNote}</p>` : ""}
        <div class="results-rewards">
          <div><span class=gicon-coin></span> เหรียญที่ได้: <b>${rewardTotals.money.toLocaleString()}</b></div>
          <ul class="results-drops">${dropsList}</ul>
        </div>
        <table class="results-table">
          <thead><tr><th>ตัวละคร</th><th>ดาเมจที่ทำ</th><th>ดาเมจที่รับ</th></tr></thead>
          <tbody>${rows || "<tr><td colspan=3>—</td></tr>"}</tbody>
        </table>
        <button id="resultsContinueBtn" class="results-continue-btn">▶️ ดำเนินการต่อ</button>
      </div>
    `;
    overlay.style.display = "flex";

    document.getElementById("resultsContinueBtn").onclick = () => {
      resetDamageStats();
      resetRewards();
      if (typeof data.onContinue === "function") {
        data.onContinue();
      } else {
        exitToSelect();
      }
    };
  }

  /* ============================
     Init
     ============================ */
  function init() {
    const { tabs } = els();
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => selectMode(btn.dataset.mode));
    });

    const params = new URLSearchParams(location.search);
    const initialMode = MODE_SCRIPTS[params.get("mode")] ? params.get("mode") : "normal";
    selectMode(initialMode, { skipHistory: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    trackDamage,
    resetDamageStats,
    resetRewards,
    addReward,
    enterBattle,
    exitToSelect,
    showResults,
    selectMode,
    get currentMode() { return currentMode; },
    MODE_LABELS,
  };
})();
