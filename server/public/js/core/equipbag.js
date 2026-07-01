// js/core/equipbag.js — server is the source of truth for the equipment bag
// (player_economy.equip_bag), same pattern as core/deck.js.
//
// Previously localStorage["equipBag"] was written directly by equip-gacha.js
// (after rolling AND paying for itself entirely client-side) and by equip.js
// (equip/unequip/delete). None of that touched a server. Now every mutating
// action goes through a server endpoint (see api.js: equipGachaRoll,
// equipItemOnCard, unequipItemFromCard, deleteEquip, deleteEquipByRarityServer)
// and the server's response is what gets written back to localStorage.

function loadEquipBag() {
  try {
    return JSON.parse(localStorage.getItem("equipBag") || "[]");
  } catch (e) {
    console.warn("Equip bag corrupted! Reset to default.");
    return [];
  }
}

// Overwrite the local equip bag with the server's copy. Called after login and
// after every server call that returns an updated `equipBag` field.
function applyServerEquipBag(serverEquipBag) {
  if (!Array.isArray(serverEquipBag)) return;
  localStorage.setItem("equipBag", JSON.stringify(serverEquipBag));
  if (typeof renderEquipBag === "function") renderEquipBag();
}

async function syncEquipBagFromServer() {
  if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) return;
  const state = await GameAPI.fetchEconomyState();
  if (state && Array.isArray(state.equip_bag)) applyServerEquipBag(state.equip_bag);
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.GameAPI && GameAPI.isLoggedIn && GameAPI.isLoggedIn()) {
    syncEquipBagFromServer();
  }
});
