function goBack(){
  if (document.referrer) {
    window.location.href = document.referrer;
  } else {
    window.location.href = "e.html";
  }
}
const EQUIP_LIST = [
  // Weapons - Flat
  { name: "Bronze Sword", type: "Weapon", stat: "atk", base: 20, mode: "flat", rate: 0.20 },
  { name: "Iron Sword", type: "Weapon", stat: "atk", base: 50, mode: "flat", rate: 0.15 },
  { name: "Steel Sword", type: "Weapon", stat: "atk", base: 80, mode: "flat", rate: 0.12 },
  { name: "Flaming Dagger", type: "Weapon", stat: "atk", base: 120, mode: "flat", rate: 0.10 },
  { name: "Shadow Katana", type: "Weapon", stat: "atk", base: 150, mode: "flat", rate: 0.08 },
  { name: "Titan Axe", type: "Weapon", stat: "atk", base: 200, mode: "flat", rate: 0.06 },
  { name: "Obsidian Blade", type: "Weapon", stat: "atk", base: 250, mode: "flat", rate: 0.05 },
  { name: "Dragon Slayer", type: "Weapon", stat: "atk", base: 300, mode: "flat", rate: 0.04 },
  { name: "Celestial Sword", type: "Weapon", stat: "atk", base: 350, mode: "flat", rate: 0.03 },
  { name: "Apocalypse Axe", type: "Weapon", stat: "atk", base: 400, mode: "flat", rate: 0.02 },
  
  // Weapons - Percent
  { name: "Mystic Blade", type: "Weapon", stat: "atk", base: 5, mode: "percent", rate: 0.08 },
  { name: "Thunder Axe", type: "Weapon", stat: "atk", base: 5, mode: "percent", rate: 0.08 },
  { name: "Crystal Staff", type: "Weapon", stat: "atk", base: 6, mode: "percent", rate: 0.07 },
  { name: "Dragon Fang", type: "Weapon", stat: "atk", base: 7, mode: "percent", rate: 0.06 },
  { name: "Phoenix Blade", type: "Weapon", stat: "atk", base: 8, mode: "percent", rate: 0.05 },
  { name: "Oblivion Sword", type: "Weapon", stat: "atk", base: 9, mode: "percent", rate: 0.04 },
  { name: "Eternal Dagger", type: "Weapon", stat: "atk", base: 10, mode: "percent", rate: 0.03 },
  { name: "Shadow Fang", type: "Weapon", stat: "atk", base: 11, mode: "percent", rate: 0.025 },
  { name: "Void Edge", type: "Weapon", stat: "atk", base: 12, mode: "percent", rate: 0.02 },
  { name: "Celestial Katana", type: "Weapon", stat: "atk", base: 13, mode: "percent", rate: 0.018 },
  { name: "Abyssal Scythe", type: "Weapon", stat: "atk", base: 14, mode: "percent", rate: 0.016 },
  { name: "Starlight Spear", type: "Weapon", stat: "atk", base: 15, mode: "percent", rate: 0.014 },
  { name: "Doombringer", type: "Weapon", stat: "atk", base: 16, mode: "percent", rate: 0.012 },
  { name: "Heavenbreaker", type: "Weapon", stat: "atk", base: 17, mode: "percent", rate: 0.01 },
  { name: "Eclipse Saber", type: "Weapon", stat: "atk", base: 18, mode: "percent", rate: 0.008 },
  { name: "Infinity Edge", type: "Weapon", stat: "atk", base: 19, mode: "percent", rate: 0.005 },
  
  // Armors - Flat
  { name: "Wooden Shield", type: "Armor", stat: "def", base: 20, mode: "flat", rate: 0.20 },
  { name: "Iron Shield", type: "Armor", stat: "def", base: 50, mode: "flat", rate: 0.15 },
  { name: "Steel Armor", type: "Armor", stat: "def", base: 80, mode: "flat", rate: 0.12 },
  { name: "Dragon Armor", type: "Armor", stat: "def", base: 120, mode: "flat", rate: 0.10 },
  { name: "Titan Plate", type: "Armor", stat: "def", base: 150, mode: "flat", rate: 0.08 },
  { name: "Obsidian Mail", type: "Armor", stat: "def", base: 200, mode: "flat", rate: 0.06 },
  { name: "Celestial Plate", type: "Armor", stat: "def", base: 250, mode: "flat", rate: 0.05 },
  { name: "Aegis Shield", type: "Armor", stat: "def", base: 300, mode: "flat", rate: 0.04 },
  { name: "Divine Armor", type: "Armor", stat: "def", base: 350, mode: "flat", rate: 0.03 },
  { name: "Apocalypse Plate", type: "Armor", stat: "def", base: 400, mode: "flat", rate: 0.02 },
  
  // Armors - Percent
  { name: "Guardian Shield", type: "Armor", stat: "def", base: 5, mode: "percent", rate: 0.08 },
  { name: "Mystic Robe", type: "Armor", stat: "def", base: 6, mode: "percent", rate: 0.07 },
  { name: "Dragon Mail", type: "Armor", stat: "def", base: 7, mode: "percent", rate: 0.06 },
  { name: "Obsidian Plate", type: "Armor", stat: "def", base: 8, mode: "percent", rate: 0.05 },
  { name: "Celestial Armor", type: "Armor", stat: "def", base: 9, mode: "percent", rate: 0.04 },
  { name: "Titan Shield", type: "Armor", stat: "def", base: 10, mode: "percent", rate: 0.03 },
  { name: "Divine Robe", type: "Armor", stat: "def", base: 11, mode: "percent", rate: 0.025 },
  { name: "Phoenix Guard", type: "Armor", stat: "def", base: 12, mode: "percent", rate: 0.02 },
  { name: "Eternal Armor", type: "Armor", stat: "def", base: 13, mode: "percent", rate: 0.018 },
  { name: "Void Plate", type: "Armor", stat: "def", base: 14, mode: "percent", rate: 0.016 },
  { name: "Aegis of Twilight", type: "Armor", stat: "def", base: 15, mode: "percent", rate: 0.014 },
  { name: "Starlight Ward", type: "Armor", stat: "def", base: 16, mode: "percent", rate: 0.012 },
  { name: "Dreadnought Armor", type: "Armor", stat: "def", base: 17, mode: "percent", rate: 0.01 },
  { name: "Heaven’s Bulwark", type: "Armor", stat: "def", base: 18, mode: "percent", rate: 0.008 },
  { name: "Infinity Aegis", type: "Armor", stat: "def", base: 19, mode: "percent", rate: 0.005 },
  
  // Accessories - Flat
  { name: "Silver Ring", type: "Accessory", stat: "hp", base: 20, mode: "flat", rate: 0.20 },
  { name: "Ruby Necklace", type: "Accessory", stat: "hp", base: 50, mode: "flat", rate: 0.15 },
  { name: "Emerald Bracelet", type: "Accessory", stat: "hp", base: 80, mode: "flat", rate: 0.12 },
  { name: "Sapphire Ring", type: "Accessory", stat: "hp", base: 120, mode: "flat", rate: 0.10 },
  { name: "Golden Amulet", type: "Accessory", stat: "hp", base: 150, mode: "flat", rate: 0.08 },
  { name: "Diamond Bracelet", type: "Accessory", stat: "hp", base: 200, mode: "flat", rate: 0.06 },
  { name: "Titan Ring", type: "Accessory", stat: "hp", base: 250, mode: "flat", rate: 0.05 },
  { name: "Celestial Necklace", type: "Accessory", stat: "hp", base: 300, mode: "flat", rate: 0.04 },
  { name: "Apocalypse Ring", type: "Accessory", stat: "hp", base: 350, mode: "flat", rate: 0.03 },
  { name: "Divine Amulet", type: "Accessory", stat: "hp", base: 400, mode: "flat", rate: 0.02 },
  
  // Accessories - Percent
  { name: "Amethyst Pendant", type: "Accessory", stat: "hp", base: 5, mode: "percent", rate: 0.08 },
  { name: "Topaz Ring", type: "Accessory", stat: "hp", base: 6, mode: "percent", rate: 0.07 },
  { name: "Celestial Necklace", type: "Accessory", stat: "hp", base: 7, mode: "percent", rate: 0.06 },
  { name: "Dragon Heart Amulet", type: "Accessory", stat: "hp", base: 8, mode: "percent", rate: 0.05 },
  { name: "Phoenix Ring", type: "Accessory", stat: "hp", base: 9, mode: "percent", rate: 0.04 },
  { name: "Titan Pendant", type: "Accessory", stat: "hp", base: 10, mode: "percent", rate: 0.03 },
  { name: "Oblivion Ring", type: "Accessory", stat: "hp", base: 11, mode: "percent", rate: 0.025 },
  { name: "Eternal Pendant", type: "Accessory", stat: "hp", base: 12, mode: "percent", rate: 0.02 },
  { name: "Shadow Ring", type: "Accessory", stat: "hp", base: 13, mode: "percent", rate: 0.018 },
  { name: "Divine Pendant", type: "Accessory", stat: "hp", base: 14, mode: "percent", rate: 0.016 },
  { name: "Starlight Charm", type: "Accessory", stat: "hp", base: 15, mode: "percent", rate: 0.014 },
  { name: "Abyssal Talisman", type: "Accessory", stat: "hp", base: 16, mode: "percent", rate: 0.012 },
  { name: "Twilight Band", type: "Accessory", stat: "hp", base: 17, mode: "percent", rate: 0.01 },
  { name: "Heavenly Locket", type: "Accessory", stat: "hp", base: 18, mode: "percent", rate: 0.008 },
  { name: "Infinity Relic", type: "Accessory", stat: "hp", base: 19, mode: "percent", rate: 0.005 },
];

const RARITIES = [
  { name: "Common", rate: 0.65, mult: 1 },
  { name: "Rare", rate: 0.25, mult: 1.2},
  { name: "Epic", rate: 0.09, mult: 1.5 },
  { name: "Legendary", rate: 0.01, mult: 1.8 },
];

function customRound(num) {
  return (num % 1) >= 0.5 ? Math.ceil(num) : Math.floor(num);
}

function pickEquipByRate(list) {
  let roll = Math.random();
  for (let eq of list) {
    roll -= eq.rate;
    if (roll < 0) return eq;
  }
  return list[0]; // fallback กันพลาด
}

function gachaEquipPull(count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    // 1) สุ่ม rarity ก่อน
    let roll = Math.random();
    let rarity = RARITIES.find(r => (roll -= r.rate) < 0);
    if (!rarity) rarity = RARITIES[0];

    // 2) สุ่มอุปกรณ์ด้วย rate ของมันเอง
    const template = pickEquipByRate(EQUIP_LIST);

    // 3) ประกอบไอเท็ม
    const item = {
      id: "equip-" + Date.now() + "-" + Math.random(),
      name: template.name,
      type: template.type,
      stat: template.stat,
      rarity: rarity.name,
      bonus: customRound(template.base * rarity.mult),
      mode: template.mode || "flat",
    };

    results.push(item);
  }

  // เก็บเข้ากระเป๋า
  let bag = getEquipBag();
  bag.push(...results);
  saveEquipBag(bag);

  showEquipResults(results);
}

function showEquipResults(results) {
  const overlay = document.getElementById("equipOverlay");
  overlay.innerHTML = "";
  overlay.style.display = "flex";

  results.forEach(eq => {
    const el = document.createElement("div");
    el.className = `gacha-fly-card rarity-${eq.rarity}`;
    const bonusTxt = eq.mode === "percent"
  ? `+${eq.bonus}% ${eq.stat.toUpperCase()}`
  : `+${eq.bonus} ${eq.stat.toUpperCase()}`;

el.innerHTML = `
  <div>${eq.rarity} ${eq.name}</div>
  <div>${bonusTxt}</div>
`;
    overlay.appendChild(el);
  });

  setTimeout(() => overlay.style.display = "none", 3000);
}