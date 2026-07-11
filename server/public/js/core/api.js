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

  // ---- ตรวจจับ "เซสชันถูกยกเลิก" (ล็อกอินเครื่อง/เบราว์เซอร์อื่นทับ) ----
  // ผู้เล่นมี session_token แค่ค่าเดียวต่อบัญชี — พอมีการล็อกอินที่ไหนก็ตาม เซิร์ฟเวอร์
  // จะออก token ใหม่ทับของเดิมทันที (ดู routes/auth.js) เครื่องเก่าเลยพก token ที่ใช้
  // ไม่ได้แล้วโดยอัตโนมัติ — ทุกคำขอที่แนบ token (auth=true) แล้วโดน 401 กลับมาทั้งที่
  // เรา "มี" token อยู่ (ไม่ใช่กรณีไม่ได้ล็อกอิน) แปลว่าโดนเซสชันอื่นเบียดออกไปแล้ว
  let sessionKickedTriggered = false;
  let sessionKickedHandler = null;

  // ---- กันข้อมูล "ข้ามบัญชี" ค้างอยู่ในเครื่อง (บั๊ก: ล็อกอินบัญชีเก่าด่าน 30 ->
  // หลุด/ออกจากระบบ -> สมัคร/ล็อกอินบัญชีใหม่บนเครื่องเดิม -> ยังเห็นด่านที่ปลดล็อค
  // ของบัญชีเก่าค้างอยู่ (แต่เล่นจริงไม่ได้เพราะเซิร์ฟเวอร์รู้ว่าเป็นบัญชีใหม่) แถม
  // เด็คที่เคยเลือกไว้ (teamDecks/selectedIndexes) ก็ยังชี้ไปที่การ์ด id ของบัญชีเก่าที่
  // ไม่มีอยู่ในเด็คใหม่แล้ว ทำให้เลือกทีมต่อสู้ไม่ได้เลยแม้แต่ด่านเก่าๆ)
  //
  // ต้นเหตุ: ค่าพวกนี้เก็บใน localStorage แบบ "คีย์เดียวใช้ร่วมกันทุกบัญชีบนเครื่องนี้"
  // ไม่ได้ผูกกับ playerId เลย ตอนออกจากระบบ/ล็อกอินใหม่ก่อนหน้านี้เคลียร์แค่
  // playerId/authToken/publicId/isGuest (ตัว auth เอง) แต่ไม่เคยเคลียร์ cache
  // ฝั่งเกมพวกนี้ — เรียกฟังก์ชันนี้ทุกครั้งที่ auth สำเร็จ (login/register/guest/
  // google) และตอน logout/โดนเบียดเซสชัน เพื่อบังคับให้หน้าที่โหลดใหม่ (reload
  // อยู่แล้วทุกครั้ง) ไปดึงค่าจริงจากเซิร์ฟเวอร์ล้วนๆ แทนที่จะเจอ cache ของบัญชีก่อนหน้า
  function clearLocalGameCache() {
    const exactKeys = [
      "deck", "bag", "bag_hash", "deckgame_money", "equipBag",
      "unlockedStage", "selectedIndexes", "teamDecks", "gacha_blacklist",
    ];
    exactKeys.forEach((k) => localStorage.removeItem(k));
    // "activeDeckSlot:<page>" คีย์มีท้ายชื่อไม่ตายตัว (แล้วแต่หน้า) ต้องไล่หาเอง
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("activeDeckSlot:")) localStorage.removeItem(key);
    }
  }

  // เรียกโดย auth-ui.js เพื่อผูก UI (โชว์ป๊อปอัป + เด้งออก) เข้ากับจุดตรวจจับนี้
  function setSessionKickedHandler(fn) { sessionKickedHandler = fn; }

  function handleUnauthorizedResponse(sentAuth, status) {
    if (!sentAuth || status !== 401) return;
    if (sessionKickedTriggered) return;
    if (!isLoggedIn()) return; // ยังไม่เคยล็อกอินอยู่แล้ว ไม่ใช่การถูกเบียด
    sessionKickedTriggered = true;
    playerId = null; authToken = null;
    localStorage.removeItem("playerId");
    localStorage.removeItem("authToken");
    localStorage.removeItem("publicId");
    localStorage.removeItem("isGuest");
    clearLocalGameCache();
    if (typeof sessionKickedHandler === "function") sessionKickedHandler();
  }

  async function post(path, body, auth) {
    const sentAuth = !!(auth && authToken);
    try {
      const headers = { "Content-Type": "application/json" };
      if (sentAuth) headers["Authorization"] = "Bearer " + authToken;
      const res = await fetch(BASE + path, {
        method: "POST",
        headers,
        body: JSON.stringify(body || {}),
        //  keepalive: ถ้าผู้เล่นชนะด่านแล้วรีบกดเปลี่ยนหน้า (เช่นไปหน้าบัญชี) ทันที
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
        handleUnauthorizedResponse(sentAuth, res.status);
        return { ...(data || {}), error: data?.error || `http ${res.status}`, status: res.status };
      }
      return data;
    } catch (err) {
      console.warn("[GameAPI] network error (offline / server down):", err);
      return { error: "network" };
    }
  }

  async function get(path, auth) {
    const sentAuth = !!(auth && authToken);
    try {
      const headers = {};
      if (sentAuth) headers["Authorization"] = "Bearer " + authToken;
      const res = await fetch(BASE + path, { headers });
      if (!res.ok) {
        handleUnauthorizedResponse(sentAuth, res.status);
        return null;
      }
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
    const sentAuth = !!(auth && authToken);
    try {
      const headers = {};
      if (sentAuth) headers["Authorization"] = "Bearer " + authToken;
      const res = await fetch(BASE + path, { headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        handleUnauthorizedResponse(sentAuth, res.status);
        return { ...(data || {}), status: res.status };
      }
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
      clearLocalGameCache();
      playerId = data.playerId; authToken = data.token;
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("username", data.username);
      localStorage.removeItem("isGuest");
      if (data.publicId) localStorage.setItem("publicId", data.publicId);
    }
    return data;
  }

  async function login(username, pin) {
    const data = await post("/api/auth/login", { username, pin });
    if (data?.token) {
      clearLocalGameCache();
      playerId = data.playerId; authToken = data.token;
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("username", data.username);
      localStorage.removeItem("isGuest");
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
      clearLocalGameCache();
      playerId = data.playerId; authToken = data.token;
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("username", data.username);
      localStorage.removeItem("isGuest");
      if (data.publicId) localStorage.setItem("publicId", data.publicId);
    }
    return data;
  }

  async function loginAsGuest() {
    const data = await post("/api/auth/guest", {});
    if (data?.token) {
      clearLocalGameCache();
      playerId = data.playerId; authToken = data.token;
      localStorage.setItem("playerId", playerId);
      localStorage.setItem("authToken", authToken);
      localStorage.setItem("username", data.username);
      localStorage.setItem("isGuest", "1");
      if (data.publicId) localStorage.setItem("publicId", data.publicId);
    }
    return data;
  }

  function isGuest() { return localStorage.getItem("isGuest") === "1"; }

  // แปลงบัญชีชั่วคราวปัจจุบันเป็นบัญชีถาวร (ตั้งชื่อ+PIN) — เก็บเงิน/เด็ค/ความคืบหน้าเดิมไว้ทั้งหมด
  async function upgradeGuestAccount(username, pin) {
    if (!isLoggedIn()) return { error: "not logged in" };
    const data = await post("/api/auth/upgrade", { username, pin }, true);
    if (data && !data.error) {
      localStorage.setItem("username", data.username);
      localStorage.removeItem("isGuest");
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
      if (!res.ok) {
        handleUnauthorizedResponse(true, res.status);
        return { error: data?.error || `http ${res.status}` };
      }
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
    if (typeof data?.isGuest === "boolean") {
      if (data.isGuest) localStorage.setItem("isGuest", "1");
      else localStorage.removeItem("isGuest");
    }
    return data;
  }

  function logout() {
    if (isLoggedIn()) post("/api/auth/logout", {}, true); // fire-and-forget: invalidate server-side session
    playerId = null; authToken = null;
    localStorage.removeItem("playerId");
    localStorage.removeItem("authToken");
    localStorage.removeItem("publicId");
    localStorage.removeItem("isGuest");
    clearLocalGameCache();
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

  // ---- Server-authoritative battle (see routes/battle.js, server/battle/engine.js) ----
  // เซิฟเป็นคนรันผลการต่อสู้จริงเอง ทีละเทิร์น แทนที่ client — ใช้ได้ทั้ง 3 โหมด
  async function battleStart(mode, cardIds, extra) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/battle/start", { mode, cardIds, ...(extra || {}) }, true);
  }
  async function battleTurn(battleId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/battle/${battleId}/turn`, {}, true);
  }
  async function battleForfeit(battleId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/battle/${battleId}/forfeit`, {}, true);
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

  // บันทึกสถานะ "ล็อคกันขาย" ของการ์ดไว้ที่เซิฟเวอร์ (กันหายตอนล็อกอินใหม่/สลับเครื่อง —
  // เดิมค่านี้อยู่แค่ localStorage เลยหายทุกครั้งที่ sync เด็คจากเซิฟใหม่)
  async function setCardLock(cardId, locked) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/economy/card-lock", { cardId, locked }, true);
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

  //  FIX: บั๊ก "1 เครื่อง กลายเป็น 2 บัญชี (จริง 1 + ขยะ 1)"
  //
  // เดิมฟังก์ชันนี้ถ้ายังไม่มี playerId จะสุ่มชื่อ "guest-xxxxxx" เอาเอง แล้วยิง
  // POST /api/players/identify สร้างแถวใหม่ในตาราง players ทันที — โดยไม่รอให้ผู้เล่น
  // ได้เลือกก่อนเลยว่าจะสมัครบัญชีจริง หรือกด "เล่นแบบไม่ล็อกอิน (ชั่วคราว)" ผ่าน modal
  // ของ auth-ui.js ปัญหาคือ ensurePlayer() ถูกเรียกจาก fetchNormalProgress()/
  // fetchInfProgress() ที่รันทันทีตอนเข้าเกมครั้งแรก (ก่อนผู้เล่นกดปุ่มไหนใน modal เลือก
  // บัญชีด้วยซ้ำ) พอมันสร้างบัญชีสุ่มนี้ไปก่อนแล้ว ผู้เล่นค่อยกด "สมัคร" (บัญชีจริง) ทีหลัง
  // ระบบ auth (/api/auth/register, routes/auth.js) จะสร้างแถวใหม่อีกแถวหนึ่งในตาราง
  // players เดียวกัน (คนละ endpoint คนละ username กับที่ ensurePlayer() สร้างไปก่อนหน้า)
  // ผลคือทุกเครื่องที่เข้าเกมจะได้ 2 บัญชีเสมอ: บัญชีจริง 1 + บัญชีขยะชื่อสุ่ม
  // "guest-xxxxxx" อีก 1 ที่ไม่มีใครใช้ แต่ไปกินโควตาบัญชีที่แอดมินให้มาแบบเสียเปล่า
  //
  // แก้โดยไม่สุ่มสร้างบัญชีเองอีกต่อไป ให้รอผ่านการล็อกอินจริงจาก auth-ui.js ก่อนเท่านั้น
  // (login/register/guest/google ทุกทางจะ set playerId ให้เองอยู่แล้วเมื่อสำเร็จ — บรรทัด
  // "if (playerId) return playerId" ด้านบนจะ return ค่าจริงทันทีหลัง reload) ถ้ายังไม่
  // ล็อกอิน ให้ถือว่า "ยังไม่มี player" ไปก่อน (เหมือนออฟไลน์) — ผู้เรียกทุกจุด
  // (reportNormalClear/fetchNormalProgress/infRunStart/fetchInfProgress) รองรับ
  // !playerId อยู่แล้ว (return ค่าออฟไลน์แบบปลอดภัย ไม่บล็อกการเล่น รอ sync ทีหลังตอน
  // ล็อกอินจริงแล้ว reload หน้า)
  async function ensurePlayer() {
    if (playerId) return playerId;
    if (!authToken) return null; // ยังไม่ได้เลือก/ยืนยันบัญชีผ่าน modal ของ auth-ui.js เลย
    return null;
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
    const data = await get(`/api/progress/normal/${playerId}`, true);
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
    const data = await get(`/api/progress/inf/${playerId}`, true);
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
  // ---- Custom guild ranks ("ยศ") ----
  async function guildRanks() {
    if (!isLoggedIn()) return { ranks: [], permissionCatalog: [] };
    return get("/api/guilds/ranks", true);
  }
  async function guildCreateRank(payload) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/ranks", payload, true);
  }
  async function guildUpdateRank(rankId, payload) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { "Content-Type": "application/json", Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + `/api/guilds/ranks/${rankId}`, { method: "PATCH", headers, body: JSON.stringify(payload || {}) });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      return { error: "network" };
    }
  }
  async function guildDeleteRank(rankId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    try {
      const headers = { Authorization: "Bearer " + authToken };
      const res = await fetch(BASE + `/api/guilds/ranks/${rankId}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { error: data?.error || `http ${res.status}` };
      return data;
    } catch (err) {
      return { error: "network" };
    }
  }
  async function guildAssignRank(rankId, playerId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post(`/api/guilds/ranks/${rankId}/assign`, { playerId }, true);
  }
  async function guildUnassignRank(playerId) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/guilds/ranks/unassign", { playerId }, true);
  }

  // ---- PvP Ranked Arena ("สมรภูมิจัดอันดับ") — see routes/pvp.js ----
  async function pvpStatus() {
    if (!isLoggedIn()) return null;
    return get("/api/pvp/status", true);
  }
  async function pvpGetDefense() {
    if (!isLoggedIn()) return { cardIds: [] };
    return get("/api/pvp/defense", true);
  }
  async function pvpSetDefense(cardIds) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/pvp/defense", { cardIds }, true);
  }
  async function pvpOpponents() {
    if (!isLoggedIn()) return { seasonActive: false, opponents: [] };
    return get("/api/pvp/opponents", true);
  }
  async function pvpAttack(opponentId, cardIds) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/pvp/attack", { opponentId, cardIds }, true);
  }
  async function pvpLeaderboard(limit) {
    if (!isLoggedIn()) return { seasonActive: false, entries: [] };
    return get(`/api/pvp/leaderboard${limit ? "?limit=" + limit : ""}`, true);
  }
  async function pvpHistory() {
    if (!isLoggedIn()) return [];
    const data = await get("/api/pvp/history", true);
    return Array.isArray(data) ? data : [];
  }
  async function pvpBattleDetail(battleId) {
    if (!isLoggedIn()) return null;
    return get(`/api/pvp/history/${battleId}`, true);
  }
  async function pvpSeasonSummary() {
    if (!isLoggedIn()) return { hasSummary: false };
    return get("/api/pvp/season-summary", true);
  }
  async function pvpAckSeasonSummary() {
    if (!isLoggedIn()) return { ok: false };
    return post("/api/pvp/season-summary/ack", {}, true);
  }

  // ---- Daily login streak + daily missions (see routes/daily.js) ----
  async function dailyStatus() {
    if (!isLoggedIn()) return null;
    return get("/api/daily/status", true);
  }
  async function dailyClaimLogin() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/daily/login/claim", {}, true);
  }
  async function dailyClaimMission(key) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/daily/missions/claim", { key }, true);
  }
  async function dailyClaimBonus() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/daily/missions/claim-bonus", {}, true);
  }

  // ---- Weekly + monthly quest boards (same shape as daily missions above,
  // see routes/daily.js /weekly/* and /monthly/*) ----
  async function weeklyStatus() {
    if (!isLoggedIn()) return null;
    return get("/api/daily/weekly/status", true);
  }
  async function weeklyClaimMission(key) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/daily/weekly/missions/claim", { key }, true);
  }
  async function weeklyClaimBonus() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/daily/weekly/missions/claim-bonus", {}, true);
  }
  async function monthlyStatus() {
    if (!isLoggedIn()) return null;
    return get("/api/daily/monthly/status", true);
  }
  async function monthlyClaimMission(key) {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/daily/monthly/missions/claim", { key }, true);
  }
  async function monthlyClaimBonus() {
    if (!isLoggedIn()) return { error: "not logged in" };
    return post("/api/daily/monthly/missions/claim-bonus", {}, true);
  }

  // ---- Achievement badges (account page) ----
  async function fetchBadges() {
    if (!isLoggedIn()) return null;
    return get("/api/players/badges", true);
  }
  async function setEquippedBadges(badgeKeys) {
    if (!isLoggedIn()) return { error: "not logged in" };
    const res = await fetch(BASE + "/api/players/badges/equipped", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + authToken },
      body: JSON.stringify({ badges: badgeKeys }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ...(data || {}), error: data?.error || `http ${res.status}` };
    return data;
  }

  // ---- Profile cosmetics: avatar ("ปก") + frame ("กรอบปก") (account page) ----
  async function fetchCosmetics() {
    if (!isLoggedIn()) return null;
    return get("/api/players/cosmetics", true);
  }
  async function setAvatar(avatarKey) {
    if (!isLoggedIn()) return { error: "not logged in" };
    const res = await fetch(BASE + "/api/players/avatar", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + authToken },
      body: JSON.stringify({ avatar: avatarKey }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ...(data || {}), error: data?.error || `http ${res.status}` };
    return data;
  }
  async function setEquippedFrame(frameKey) {
    if (!isLoggedIn()) return { error: "not logged in" };
    const res = await fetch(BASE + "/api/players/frame", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + authToken },
      body: JSON.stringify({ frame: frameKey }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ...(data || {}), error: data?.error || `http ${res.status}` };
    return data;
  }

  // ---- Heartbeat: real accumulated online time for the premium "playtime"
  // frames/badges (see routes/players.js POST /heartbeat + GET /playtime).
  // Called from the periodic interval at the bottom of this file, only while
  // the tab/app is actually visible — see that interval for the gating.
  // Server computes the credited duration itself from its own stored
  // last-heartbeat timestamp, so calling this more/less often than expected
  // can't earn extra credit either way. ----
  async function heartbeat() {
    if (!isLoggedIn()) return null;
    return post("/api/players/heartbeat", {}, true);
  }
  async function fetchPlaytime() {
    if (!isLoggedIn()) return null;
    return get("/api/players/playtime", true);
  }

return {
    ensurePlayer, reportNormalClear, fetchNormalProgress, infRunStart, infStageClear, infRunFinish, getInfRunId, fetchInfProgress,
    isLoggedIn, register, login, loginWithGoogle, logout, getAuthConfig, updateUsername, getUsername,
    loginAsGuest, isGuest, upgradeGuestAccount,
    getPublicId, refreshMe, fetchMailbox, fetchMailDetail, claimMail, deleteMail,
    fetchEconomyState, claimNormalReward, claimInfReward, consumeHelperRound, checkAccountStatus,
    battleStart, battleTurn, battleForfeit,
    bossRunStart, bossClaimTier, bossRunFinish,
    shopGetCurrent, shopMyStatus, shopBuy, shopBuyWithShard, skillUpgrade, gachaRoll, saveGachaBlacklist, upgradeGuaranteed,
    upgradePaid, upgradeDuplicate, sellCard, sellAllCards, setCardLock,
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
    guildRanks, guildCreateRank, guildUpdateRank, guildDeleteRank, guildAssignRank, guildUnassignRank,
    pvpStatus, pvpGetDefense, pvpSetDefense, pvpOpponents, pvpAttack, pvpLeaderboard, pvpHistory, pvpBattleDetail,
    pvpSeasonSummary, pvpAckSeasonSummary,
    fetchBadges, setEquippedBadges,
    fetchCosmetics, setAvatar, setEquippedFrame,
    heartbeat, fetchPlaytime,
    dailyStatus, dailyClaimLogin, dailyClaimMission, dailyClaimBonus,
    weeklyStatus, weeklyClaimMission, weeklyClaimBonus,
    monthlyStatus, monthlyClaimMission, monthlyClaimBonus,
    setSessionKickedHandler,
  };
})();

// ตรวจสถานะเซสชันเป็นระยะ (ทุก 20 วิ) แม้ระหว่างนั้นผู้เล่นจะไม่ได้กดอะไรที่ยิง API
// เลยก็ตาม (เช่น อ่านหน้ากิลด์เฉยๆ) — ให้รู้ตัวว่าโดนล็อกอินเครื่องอื่นเบียดออกโดยไว
// (ไม่ต้องรอให้บังเอิญกดอะไรสักอย่างก่อนถึงจะเจอ 401)
//
// heartbeat() piggybacks on the same 20s tick (matches server-side
// HEARTBEAT_INTERVAL_SECONDS in game-data/playtime-data.js) but only fires
// while the tab/app is actually visible — a backgrounded tab shouldn't rack
// up "online time" toward the premium playtime frames/badges. The server
// still independently caps how much any single call can credit, this check
// just avoids sending pointless heartbeats while hidden.
setInterval(() => {
  if (window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn()) {
    if (GameAPI.checkAccountStatus) GameAPI.checkAccountStatus();
    if (GameAPI.heartbeat && (typeof document === "undefined" || document.visibilityState === "visible")) {
      GameAPI.heartbeat();
    }
  }
}, 20000);

window.GameAPI = GameAPI;