// js/core/presence.js — shared "online / offline for X / banned / suspended"
// status pill used on the friends list, helper lists, and guild members list.
//
// "Online" is a cheap proxy, not a real presence system: middleware/auth.js
// bumps players.last_seen_at on authenticated requests (throttled to once
// per 30s), and we just check whether that happened recently.
(function () {
  const ONLINE_WINDOW_MS = 3 * 60 * 1000; // seen within the last 3 minutes = online

  // Minutes tick 1→59 one at a time, then hours tick 1 at a time, then days
  // tick 1 at a time up to 999, after which it just shows "999+ วัน".
  function fmtOfflineDuration(lastSeenAt) {
    if (!lastSeenAt) return null;
    const ms = Date.now() - new Date(lastSeenAt).getTime();
    if (ms <= 0) return "ไม่ถึง 1 นาที";
    const totalMin = Math.floor(ms / 60000);
    if (totalMin < 1) return "ไม่ถึง 1 นาที";
    if (totalMin < 60) return `${totalMin} นาที`;
    const totalHours = Math.floor(totalMin / 60);
    if (totalHours < 24) return `${totalHours} ชม.`;
    const totalDays = Math.floor(totalHours / 24);
    if (totalDays > 999) return "999+ วัน";
    return `${totalDays} วัน`;
  }

  function fmtDateTime(iso) {
    try {
      return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return String(iso);
    }
  }

  // entry needs: accountStatus ('active'|'suspended'|'banned'), suspendedUntil, lastSeenAt
  function presenceHtml(entry) {
    const status = entry.accountStatus || "active";
    if (status === "banned") {
      return `<span class="presence-pill presence-banned">🚫 โดนแบน</span>`;
    }
    if (status === "suspended") {
      const until = entry.suspendedUntil ? ` (ถึง ${fmtDateTime(entry.suspendedUntil)})` : "";
      return `<span class="presence-pill presence-suspended">⛔ โดนระงับ${until}</span>`;
    }
    const lastSeen = entry.lastSeenAt ? new Date(entry.lastSeenAt).getTime() : 0;
    if (lastSeen && Date.now() - lastSeen <= ONLINE_WINDOW_MS) {
      return `<span class="presence-pill presence-online">🟢 ออนไลน์</span>`;
    }
    const dur = entry.lastSeenAt ? fmtOfflineDuration(entry.lastSeenAt) : null;
    return `<span class="presence-pill presence-offline">⚪ ออฟไลน์${dur ? " " + dur : ""}</span>`;
  }

  // Renders a <span> mount carrying the raw data as attributes so a timer
  // can recompute the text later without needing to refetch from the server.
  function presenceMountHtml(entry) {
    const status = escapeAttr(entry.accountStatus || "active");
    const suspendedUntil = escapeAttr(entry.suspendedUntil || "");
    const lastSeenAt = escapeAttr(entry.lastSeenAt || "");
    return `<span class="presence-mount" data-account-status="${status}" data-suspended-until="${suspendedUntil}" data-last-seen="${lastSeenAt}">${presenceHtml(entry)}</span>`;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  // Call this once on an interval (e.g. every 30s) to keep every presence
  // pill on the page up to date without re-rendering the whole list.
  function refreshMounts(root) {
    (root || document).querySelectorAll(".presence-mount").forEach((el) => {
      const entry = {
        accountStatus: el.dataset.accountStatus,
        suspendedUntil: el.dataset.suspendedUntil || null,
        lastSeenAt: el.dataset.lastSeen || null,
      };
      el.innerHTML = presenceHtml(entry);
    });
  }

  window.Presence = { presenceHtml, presenceMountHtml, refreshMounts, fmtOfflineDuration };
})();
