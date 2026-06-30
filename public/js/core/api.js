// js/core/api.js — talks to the UnitBattle server (anti-cheat run tracking)
// Include this script BEFORE N-Mode.js / inf-mode.js in any page that reports progress.

const GameAPI = (() => {
  const BASE = ""; // same-origin: server serves the game itself on Railway

  let playerId = localStorage.getItem("playerId") || null;
  let infRunId = null;
  let infRunToken = null;

  async function post(path, body) {
    try {
      const res = await fetch(BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      if (!res.ok) {
        console.warn("[GameAPI] request failed:", path, res.status);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn("[GameAPI] network error (offline / server down):", err);
      return null;
    }
  }

  // Call once on page load. Falls back to a local guest name if username not set yet.
  async function ensurePlayer() {
    if (playerId) return playerId;
    const username = localStorage.getItem("username") || ("guest-" + Math.random().toString(36).slice(2, 8));
    localStorage.setItem("username", username);
    const data = await post("/api/players/identify", { username });
    if (data?.id) {
      playerId = data.id;
      localStorage.setItem("playerId", playerId);
    }
    return playerId;
  }

  // ---- NORMAL mode: stages are picked individually, so we just report each clear ----
  // Server checks it against the player's previously recorded max stage (order-safe).
  async function reportNormalClear(stage) {
    await ensurePlayer();
    if (!playerId) return; // offline: skip silently, don't block gameplay
    return post("/api/progress/normal-clear", { playerId, stage });
  }

  // ---- INF mode: one continuous run from stage 1 until loss/full-clear ----
  async function infRunStart() {
    await ensurePlayer();
    if (!playerId) return;
    const data = await post("/api/runs/start", { playerId, mode: "inf" });
    if (data?.runId) {
      infRunId = data.runId;
      infRunToken = data.token;
    }
  }

  async function infStageClear(stage) {
    if (!infRunId) return; // run wasn't started (offline) — gameplay still works locally
    return post(`/api/runs/${infRunId}/stage-clear`, { token: infRunToken, stage });
  }

  async function infRunFinish() {
    if (!infRunId) return;
    const result = await post(`/api/runs/${infRunId}/finish`, { token: infRunToken });
    infRunId = null;
    infRunToken = null;
    return result;
  }

  return { ensurePlayer, reportNormalClear, infRunStart, infStageClear, infRunFinish };
})();
