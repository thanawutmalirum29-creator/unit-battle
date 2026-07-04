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
        // 🔐 keepalive: ถ้าผู้เล่นชนะด่านแล้วรีบกดเปลี่ยนหน้า (เช่นไปหน้าบัญชี) ทันที
        // เบราว์เซอร์จะยกเลิก fetch ที่ยังค้างอยู่โดยปริยายตอนออกจากหน้า ทำให้คำขอ
        // เคลมเงิน/ไอเทม (เช่น claim/normal, claim/inf, boss/claim-tier) ไปไม่ถึงเซิฟ
        // และผู้เล่นไม่ได้เงินทั้งที่ชนะแล้ว — keepalive บอกเบราว์เซอร์ให้ส่งคำขอ
        // นี้ต่อให้จบแม้หน้าเว็บถูกออกไปแล้ว (มีข้อจำกัดขนาด body ~64KB ซึ่ง payload
        // ของเราเล็กกว่านั้นมาก จึงไม่มีผลกระทบ)
        keepalive: true,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn("[GameAPI] request failed:", path, res.status, data?.error);
        return { ...(data || {}), error: data?.error || `http ${res.status}`, status: res.status };
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

  // Like get(), but returns the parsed error body (with `status` attached)
  // instead of collapsing every non-2xx response to null — needed so callers
  // can read structured fields like `accountStatus`/`reason` off a 403. Only
  // used where that detail actually matters (account-status check below);
  // every other GET keeps using the plain get() above unchanged.
  async function getRaw(path, auth) {
    try {
      const headers = {};
      if (auth && authToken) headers["Authorization"] = "Bearer " + authToken;
      const res = await fetch(BASE + path, { headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ...(data || {}), status: res.status };
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return { error: "network" };
    }
  }

  // Checks whether the current session's account is suspended/banned — used
  // on page load (see auth-ui.js) to catch a status change that happened
  // *after* the token was already stored, since isLoggedIn() only checks
  // that a token exists, not that the account is still active.
  async function checkAccountStatus() {
    if (!isLoggedIn()) return null;
    return getRaw("/api/auth/me", true);
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
    if (isLoggedIn()) post("/api/auth/logout", {}, true); // fire-and-forget: invalidate server-side session
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

  async function deleteMail(mailId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + `/api/mailbox/${mailId}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return { error: "network" };
    }
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

  // Call once per battle round a borrowed helper card actually fought in
  // (any mode except INF, where borrowed cards can't be selected at all —
  // see inf-mode.js). Counts cumulatively across every stage; server removes
  // the card once its round budget hits zero. See routes/helpers.js.
  async function consumeHelperRound(cardId, rounds) {
    if (!isLoggedIn()) return null;
    return post("/api/helpers/consume-round", { cardId, rounds: rounds || 1 }, true);
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

  async function gachaRoll(poolId, times, blacklist) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/gacha/roll", { poolId, times, blacklist }, true);
  }

  // Persists the character-gacha "auto-discard" blacklist server-side — see
  // saveEquipBlacklist above for the same pattern.
  async function saveGachaBlacklist(blacklist) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/gacha/blacklist", { blacklist }, true);
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

  // Persists the equip-gacha "auto-discard" blacklist server-side (see
  // equip_blacklist column) so it's the same across every device/browser instead
  // of only whichever one had it in localStorage.
  async function saveEquipBlacklist(blacklist) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/equip-gacha/blacklist", { blacklist }, true);
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

  // ---- Friends: search by public ID / username, send/accept/reject requests, list/remove. ----
  async function searchPlayers(q) {
    if (!isLoggedIn()) return [];
    const data = await get(`/api/players/search?q=${encodeURIComponent(q)}`, true);
    return Array.isArray(data) ? data : [];
  }

  async function fetchFriends() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/players/friends", true);
    return Array.isArray(data) ? data : [];
  }

  async function removeFriend(friendPlayerId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + `/api/players/friends/${friendPlayerId}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return { error: "network" };
    }
  }

  async function sendFriendRequest(publicId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/players/friends/request", { publicId }, true);
  }

  async function fetchIncomingFriendRequests() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/players/friends/requests", true);
    return Array.isArray(data) ? data : [];
  }

  async function fetchSentFriendRequests() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/players/friends/requests/sent", true);
    return Array.isArray(data) ? data : [];
  }

  async function acceptFriendRequest(requestId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/players/friends/requests/${requestId}/accept`, {}, true);
  }

  async function rejectFriendRequest(requestId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/players/friends/requests/${requestId}/reject`, {}, true);
  }

  async function cancelFriendRequest(requestId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + `/api/players/friends/requests/${requestId}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return { error: "network" };
    }
  }

  // ---- Helper / assist character system: set your own lendable helper, browse
  // friends' helpers, and borrow one into your own deck for 12h. ----
  async function fetchMyHelper() {
    if (!isLoggedIn()) return { cardId: null, card: null };
    const data = await get("/api/helpers/mine", true);
    return data || { cardId: null, card: null };
  }

  async function setMyHelper(cardId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/helpers/set", { cardId }, true);
  }

  async function clearMyHelper() {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + "/api/helpers/mine", { method: "DELETE", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return { error: "network" };
    }
  }

  async function fetchFriendsHelpers() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/helpers/friends", true);
    return Array.isArray(data) ? data : [];
  }

  async function fetchGuildmatesHelpers() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/helpers/guildmates", true);
    return Array.isArray(data) ? data : [];
  }

  async function borrowHelper(lenderId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/helpers/borrow", { lenderId }, true);
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

  // Best-ever validated NORMAL stage for this player, used to restore unlocked stages
  // on load instead of trusting localStorage alone (mirrors fetchInfProgress below).
  // Returns { maxStage, ok }. ok=false means offline / no player yet.
  async function fetchNormalProgress() {
    await ensurePlayer();
    if (!playerId) return { maxStage: 0, ok: false };
    const data = await get(`/api/progress/normal/${playerId}`, false);
    if (!data) return { maxStage: 0, ok: false };
    return { maxStage: data.maxStage ?? 0, ok: true };
  }

  // ---- INF mode: one continuous run from stage 1 (or a cleared checkpoint) until loss/full-clear ----
  // teamCardIds: current selectedIndexes, so the server can reject a team
  // that contains a borrowed helper card (see routes/runs.js) — borrowed
  // cards can't be used in INF (see inf-mode.js for the client-side block).
  async function infRunStart(startStage, teamCardIds) {
    await ensurePlayer();
    if (!playerId) return null;
    const data = await post("/api/runs/start", { playerId, mode: "inf", startStage: startStage || 1, teamCardIds: teamCardIds || [] });
    if (data?.runId) {
      infRunId = data.runId;
      infRunToken = data.token;
    }
    return data;
  }

  // Best-ever validated INF stage for this player, used to unlock checkpoint buttons.
  // Returns { maxStage, ok }. ok=false means we couldn't reach the server / no player yet
  // (offline or not logged in) — the caller should tell the user that, instead of silently
  // showing "0 progress" which looks identical to "you just haven't cleared stage 25 yet".
  async function fetchInfProgress() {
    await ensurePlayer();
    if (!playerId) return { maxStage: 0, ok: false };
    const data = await get(`/api/progress/inf/${playerId}`, false);
    if (!data) return { maxStage: 0, ok: false };
    return { maxStage: data.maxStage ?? 0, ok: true };
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

  // ---- Guilds ----
  async function guildMine() {
    if (!isLoggedIn()) return null;
    return get("/api/guilds/mine", true);
  }
  async function guildList(q) {
    if (!isLoggedIn()) return [];
    const data = await get(`/api/guilds/list${q ? "?q=" + encodeURIComponent(q) : ""}`, true);
    return Array.isArray(data) ? data : [];
  }
  async function guildRanking() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/guilds/ranking", true);
    return Array.isArray(data) ? data : [];
  }
  async function guildCreate(payload) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/create", payload, true);
  }
  async function guildUpdateSettings(payload) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { "Content-Type": "application/json", Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + "/api/guilds/settings", { method: "PATCH", headers, body: JSON.stringify(payload || {}) });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error:", err);
      return { error: "network" };
    }
  }
  async function guildJoin(guildId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/guilds/${guildId}/join`, {}, true);
  }
  async function guildApply(guildId, message) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/guilds/${guildId}/apply`, { message }, true);
  }
  async function guildMyRequests() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/guilds/requests/mine", true);
    return Array.isArray(data) ? data : [];
  }
  async function guildCancelMyRequest(requestId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + `/api/guilds/requests/mine/${requestId}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      return { error: "network" };
    }
  }
  async function guildIncomingRequests() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/guilds/requests", true);
    return Array.isArray(data) ? data : [];
  }
  async function guildAcceptRequest(requestId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/guilds/requests/${requestId}/accept`, {}, true);
  }
  async function guildRejectRequest(requestId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/guilds/requests/${requestId}/reject`, {}, true);
  }
  async function guildInvite(publicId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/invite", { publicId }, true);
  }
  async function guildMyInvites() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/guilds/invites/mine", true);
    return Array.isArray(data) ? data : [];
  }
  async function guildAcceptInvite(inviteId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/guilds/invites/${inviteId}/accept`, {}, true);
  }
  async function guildRejectInvite(inviteId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/guilds/invites/${inviteId}/reject`, {}, true);
  }
  async function guildCancelInvite(inviteId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + `/api/guilds/invites/${inviteId}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      return { error: "network" };
    }
  }
  async function guildMembers() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/guilds/members", true);
    return Array.isArray(data) ? data : [];
  }
  async function guildLeave() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/leave", {}, true);
  }
  async function guildDisband() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/disband", {}, true);
  }
  async function guildKick(playerId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/kick", { playerId }, true);
  }
  async function guildPromote(playerId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/promote", { playerId }, true);
  }
  async function guildDemote(playerId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/demote", { playerId }, true);
  }
  async function guildTransferLeadership(playerId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/transfer-leadership", { playerId }, true);
  }
  async function guildChatFetch(afterId) {
    if (!isLoggedIn()) return [];
    const data = await get(`/api/guilds/chat${afterId ? "?afterId=" + afterId : ""}`, true);
    return Array.isArray(data) ? data : [];
  }
  async function guildChatSend(message) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/chat", { message }, true);
  }
  async function guildDonate(amount) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/donate", { amount }, true);
  }
  async function guildShopStatus() {
    if (!isLoggedIn()) return null;
    return get("/api/guilds/shop", true);
  }
  async function guildShopBuy(itemKey) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/shop/buy", { itemKey }, true);
  }
  async function guildBossStatus() {
    if (!isLoggedIn()) return null;
    return get("/api/guilds/boss", true);
  }
  async function guildBossAttack() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/boss/attack", {}, true);
  }
  async function guildExpandCapacity() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/expand-capacity", {}, true);
  }

return {
    ensurePlayer, reportNormalClear, fetchNormalProgress, infRunStart, infStageClear, infRunFinish, getInfRunId, fetchInfProgress,
    isLoggedIn, register, login, loginWithGoogle, logout, getAuthConfig, updateUsername, getUsername,
    getPublicId, refreshMe, fetchMailbox, fetchMailDetail, claimMail, deleteMail,
    fetchEconomyState, claimNormalReward, claimInfReward, consumeHelperRound, checkAccountStatus,
    bossRunStart, bossClaimTier, bossRunFinish,
    shopGetCurrent, shopMyStatus, shopBuy, shopBuyWithShard, skillUpgrade, gachaRoll, saveGachaBlacklist, upgradeGuaranteed,
    upgradePaid, upgradeDuplicate, sellCard, sellAllCards,
    equipGachaRoll, equipItemOnCard, unequipItemFromCard, deleteEquip, deleteEquipByRarityServer, saveEquipBlacklist,
    searchPlayers, fetchFriends, removeFriend,
    sendFriendRequest, fetchIncomingFriendRequests, fetchSentFriendRequests,
    acceptFriendRequest, rejectFriendRequest, cancelFriendRequest,
    fetchMyHelper, setMyHelper, clearMyHelper, fetchFriendsHelpers, fetchGuildmatesHelpers, borrowHelper,
    guildMine, guildList, guildRanking, guildCreate, guildUpdateSettings, guildJoin, guildApply,
    guildMyRequests, guildCancelMyRequest, guildIncomingRequests, guildAcceptRequest, guildRejectRequest,
    guildInvite, guildMyInvites, guildAcceptInvite, guildRejectInvite, guildCancelInvite,
    guildMembers, guildLeave, guildDisband, guildKick, guildPromote, guildDemote, guildTransferLeadership,
    guildChatFetch, guildChatSend, guildDonate, guildShopStatus, guildShopBuy, guildBossStatus, guildBossAttack, guildExpandCapacity,
  };
})();

window.GameAPI = GameAPI;