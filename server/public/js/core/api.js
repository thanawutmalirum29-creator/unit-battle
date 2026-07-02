// js/core/api.js — talks to the UnitBattle server (anti-cheat run tracking)
// Include this script BEFORE N-Mode.js / inf-mode.js in any page that reports progress.

const GameAPI = (() => {
  const BASE = ""; // same-origin: server serves the game itself on Railway

  let playerId = localStorage.getItem("playerId") || null;
  let authToken = localStorage.getItem("authToken") || null;
  let infRunId = null;
  let infRunToken = null;
  let bossRunId = null;
  let bossRunToken = null;

  async function post(path, body, auth) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (auth && authToken) headers["Authorization"] = "Bearer " + authToken;
      const res = await fetch(BASE + path, {
        method: "POST",
        headers,
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn("[GameAPI] request failed:", path, res.status, data?.error);
        return { error: data?.error || `http ${res.status}`, status: res.status };
      }
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error (offline / server down):", err);
      return { error: "network" };
    }
  }

  async function get(path, auth) {
    try {
      const headers = {};
      if (auth && authToken) headers["Authorization"] = "Bearer " + authToken;
      const res = await fetch(BASE + path, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return null;
    }
  }

  // ---- Auth: username + PIN. Money/bag/deck require this; the old identify() flow
  // (no password) is still used for leaderboard-only display names. ----
  function isLoggedIn() { return !!(playerId && authToken); }

  async function register(username, pin) {
    const data = await post("/api/auth/register", { username, pin });
    if (data?.token) {
      playerId = data.playerId; authToken = data.token;
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("username", data.username);
      if (data.publicId) localStorage.setItem("publicId", data.publicId);
    }
    return data;
  }

  async function login(username, pin) {
    const data = await post("/api/auth/login", { username, pin });
    if (data?.token) {
      playerId = data.playerId; authToken = data.token;
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("username", data.username);
      if (data.publicId) localStorage.setItem("publicId", data.publicId);
    }
    return data;
  }

  // Google Sign-In: `credential` is the ID token JWT handed back by Google
  // Identity Services client-side. Server verifies it and either logs the
  // returning player in or creates a new one with a random username.
  async function loginWithGoogle(credential) {
    const data = await post("/api/auth/google", { credential });
    if (data?.token) {
      playerId = data.playerId; authToken = data.token;
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("username", data.username);
      if (data.publicId) localStorage.setItem("publicId", data.publicId);
    }
    return data;
  }

  async function getAuthConfig() {
    return get("/api/auth/config", false);
  }

  async function updateUsername(newUsername) {
    if (!isLoggedIn()) return { error: "not logged in" };
    const headers = { "Content-Type": "application/json", Authorization: "Bearer " + authToken };
    try {
      const res = await fetch(BASE + "/api/auth/username", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ username: newUsername }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      localStorage.setItem("username", data.username);
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return { error: "network" };
    }
  }

  function getUsername() { return localStorage.getItem("username") || null; }
  function getPublicId() { return localStorage.getItem("publicId") || null; }

  // Refreshes username/publicId/status from the server (self-heals publicId for
  // accounts created before the admin-console patch). Call on account.html load.
  async function refreshMe() {
    if (!isLoggedIn()) return null;
    const data = await get("/api/auth/me", true);
    if (data?.publicId) localStorage.setItem("publicId", data.publicId);
    if (data?.username) localStorage.setItem("username", data.username);
    return data;
  }

  function logout() {
    playerId = null; authToken = null;
    localStorage.removeItem("playerId");
    localStorage.removeItem("authToken");
    localStorage.removeItem("publicId");
  }

  // ---- Mailbox ----
  async function fetchMailbox() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/mailbox", true);
    return Array.isArray(data) ? data : [];
  }

  async function fetchMailDetail(mailId) {
    if (!isLoggedIn()) return null;
    return get(`/api/mailbox/${mailId}`, true);
  }

  async function claimMail(mailId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/mailbox/${mailId}/claim`, {}, true);
  }

  // ---- Economy: server is the source of truth for money/bag/deck. ----
  async function fetchEconomyState() {
    if (!isLoggedIn()) return null;
    return get("/api/economy/state", true);
  }

  async function claimNormalReward(stage) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/claim/normal", { stage }, true);
  }

  async function claimInfReward(runId, stage) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/claim/inf", { runId, stage }, true);
  }

  async function bossRunStart(bossId) {
    if (!isLoggedIn()) return null;
    const data = await post("/api/economy/boss/start", { bossId }, true);
    if (data?.runId) { bossRunId = data.runId; bossRunToken = data.token; }
    return data;
  }

  async function bossClaimTier(tierIndex, damageDone) {
    if (!bossRunId) return { error: "no active boss run" };
    return post("/api/economy/boss/claim-tier", { runId: bossRunId, token: bossRunToken, tierIndex, damageDone }, true);
  }

  async function bossRunFinish() {
    if (!bossRunId) return null;
    const result = await post("/api/economy/boss/finish", { runId: bossRunId, token: bossRunToken }, true);
    bossRunId = null; bossRunToken = null;
    return result;
  }

  async function shopGetCurrent() {
    return get("/api/economy/shop/current", false);
  }

  // Per-player purchased slots + rarity locks for the current cycle (requires login).
  async function shopMyStatus() {
    if (!isLoggedIn()) return null;
    return get("/api/economy/shop/my-status", true);
  }

  async function shopBuy(slotIndex) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/shop/buy", { slotIndex }, true);
  }

  // Buy a shop card with memory fragments instead of money (fixed cost, one
  // fragment type per rarity — see SHOP_MEMORY_KEY_BY_RARITY on the server).
  async function shopBuyWithShard(slotIndex) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/shop/buy-with-shard", { slotIndex }, true);
  }

  // Card SKILL upgrade (bumps "Name LN" in card.skill) — separate from the card
  // LEVEL upgrades below. Shards are spent whether or not the roll succeeds;
  // check the returned `success` flag.
  async function skillUpgrade(cardId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/skills/upgrade", { cardId }, true);
  }

  async function gachaRoll(poolId, times) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/gacha/roll", { poolId, times }, true);
  }

  async function upgradeGuaranteed(cardId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/upgrade/guaranteed", { cardId }, true);
  }

  async function upgradePaid(cardId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/upgrade/paid", { cardId }, true);
  }

  async function upgradeDuplicate(cardId, duplicateCardIds) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/upgrade/duplicate", { cardId, duplicateCardIds }, true);
  }

  async function sellCard(cardId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/sell", { cardId }, true);
  }

  async function sellAllCards(cardIds) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/sell-all", { cardIds }, true);
  }

  // ---- Equipment: gacha roll + equip/unequip/delete are all server-authoritative now. ----
  async function equipGachaRoll(poolId, times, blacklist) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/equip-gacha/roll", { poolId, times, blacklist }, true);
  }

  async function equipItemOnCard(cardId, equipId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/equip/equip", { cardId, equipId }, true);
  }

  async function unequipItemFromCard(cardId, equipId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/equip/unequip", { cardId, equipId }, true);
  }

  async function deleteEquip(equipId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/equip/delete", { equipId }, true);
  }

  async function deleteEquipByRarityServer(rarity) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/equip/delete-by-rarity", { rarity }, true);
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

  function getInfRunId() { return infRunId; }
return {
    ensurePlayer, reportNormalClear, infRunStart, infStageClear, infRunFinish, getInfRunId,
    isLoggedIn, register, login, loginWithGoogle, logout, getAuthConfig, updateUsername, getUsername,
    getPublicId, refreshMe, fetchMailbox, fetchMailDetail, claimMail,
    fetchEconomyState, claimNormalReward, claimInfReward,
    bossRunStart, bossClaimTier, bossRunFinish,
    shopGetCurrent, shopMyStatus, shopBuy, shopBuyWithShard, skillUpgrade, gachaRoll, upgradeGuaranteed,
    upgradePaid, upgradeDuplicate, sellCard, sellAllCards,
    equipGachaRoll, equipItemOnCard, unequipItemFromCard, deleteEquip, deleteEquipByRarityServer,
  };
})();

window.GameAPI = GameAPI;