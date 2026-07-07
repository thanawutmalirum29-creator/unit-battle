// js/core/deck.js — server is the source of truth for the deck (player_economy.deck).
//
// Previously the deck lived ONLY in localStorage["deck"] and every mutation (sell,
// upgrade, star-up) was computed and applied by the client with zero server
// involvement — a player could edit localStorage directly to add fake cards, or
// call the mutation functions from devtools at any time. Every mutating action now
// goes through a server endpoint (see api.js: sellCard, sellAllCards, upgradePaid,
// upgradeDuplicate, upgradeGuaranteed — plus the existing shopBuy/gachaRoll) and the
// server's response is what gets written back to localStorage — never a client guess.

function loadDeck() {
  try {
    return JSON.parse(localStorage.getItem("deck") || "[]");
  } catch (e) {
    console.warn("Deck corrupted! Reset to default.");
    return [];
  }
}

// Overwrite the local deck with the server's copy. Called after login and after
// every server call that returns an updated `deck` field.
function applyServerDeck(serverDeck) {
  if (!Array.isArray(serverDeck)) return;
  localStorage.setItem("deck", JSON.stringify(serverDeck));
  if (typeof renderDeck === "function") renderDeck();
  if (typeof renderDeckList === "function") renderDeckList(); // equip.html's card grid uses this name instead
  if (typeof updateBagUI === "function") updateBagUI();

  // หน้าต่อสู้ (game.html) มีพรีวิวเด็คใต้ dropdown เลือกเด็ค — ถ้ามี mount อยู่
  // ให้วาดใหม่ด้วย เผื่อรายการการ์ดเปลี่ยนไปหลัง sync (กันโชว์การ์ดที่ขายไปแล้วค้าง)
  const teamSelectorMount = document.getElementById("teamSelectorMount");
  if (teamSelectorMount && typeof renderTeamSelectorUI === "function") {
    renderTeamSelectorUI(teamSelectorMount, teamSelectorMount.dataset.pageKey || "normal");
  }
}

async function syncDeckFromServer() {
  if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) return;
  const state = await GameAPI.fetchEconomyState();
  if (state && Array.isArray(state.deck)) applyServerDeck(state.deck);
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn()) {
    syncDeckFromServer();
  }
});
