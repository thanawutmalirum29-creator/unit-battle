const STAGES = {
  1: [
   { name:"สไลม์ยักษ์",class:"Tank" ,hp:200, atk:22, def:20, skill:"Defense Buff L1", reward:5000000000 },
    { name:"สไลม์แดง",class:"Warrior" , hp:150, atk:30, def:15, skill:"Power Strike L1", reward:6 },
    { name:"สไลม์ไฟ",class:"Mage" , hp:110, atk:20, def:8, skill:"Burn L1", reward:7 },
    { name:"สไลม์เขียว",class:"Healer" , hp:120, atk:20, def:12, skill:"Heal L1", reward:8 }
  ],
  2: [
    { name:"Goblin",class:"Tank" , hp:225, atk:25, def:22, skill:"Defense Buff L1", reward:6 },
    { name:"Goblin Berserk ",class:"Berserk" , hp:169, atk:28, def:12, skill:"Berserk Mode L1", reward:7 },
    { name:"Goblin Archer",class:"Rogue" , hp:129, atk:62, def:9, skill:"Critical L1", reward:8 },
    { name:"Goblin Shaman ",class:"Healer" , hp:132, atk:22, def:13, skill:"Heal L1", reward:9 }
  ],
  3: [
    { name:"Orc Defender", class:"Tank", hp:260, atk:29, def:26, skill:"Defense Buff L1" },
  { name:"Orc Warrior", class:"Warrior", hp:195, atk:39, def:19, skill:"Power Strike L1" },
  { name:"Orc Archer", class:"Rogue", hp:149, atk:71, def:10, skill:"Piercing Shot L1" },
  { name:"Orc Shaman", class:"Healer", hp:156, atk:26, def:16, skill:"Heal L1" },
  
],
  4: [
    { name:"Dark Knight", class:"Tank", hp:292, atk:33, def:29, skill:"AOE Defense Buff L1" },
  { name:"Wyvern", class:"Warrior", hp:219, atk:44, def:21, skill:"AOE Attack L1" },

  { name:"Necromancer", class:"CC", hp:182, atk:29, def:16, skill:"Stun L1" },
  { name:"Dark Archer", class:"Rogue", hp:219, atk:80, def:11, skill:"Piercing Shot L1" }
],
  5: [
    { name:"Dragon Boss", hp:350, atk:90, def:25, skill:"AOE Attack L1" },
    { name:"Dread Knight", hp:600, atk:30, def:20, skill:"Berserk Mode L1" },
    { name:"Dark Prophet", hp:200, atk:40, def:15, skill:"AOE Heal L1" }
  ],
  6: [
    { name:"Lich King", hp:500, atk:70, def:30, skill:"AOE Attack L2" },
    { name:"Death Knight", hp:400, atk:50, def:25, skill:"Defense Buff L2" },
    { name:"Shadow Priest", hp:300, atk:40, def:20, skill:"AOE Heal L2" }
  ],
  7: [
    { name:"Hydra", hp:700, atk:85, def:35, skill:"Multi Attack L2" },
    { name:"Serpent Guard", hp:450, atk:55, def:28, skill:"Piercing Shot L2" },
    { name:"Sea Witch", hp:350, atk:45, def:22, skill:"Heal L2" }
  ],
  8: [
    { name:"Infernal Titan", hp:900, atk:100, def:40, skill:"AOE Attack L3" },
    { name:"Flame Knight", hp:500, atk:70, def:30, skill:"Power Strike L2" },
    { name:"Lava Shaman", hp:400, atk:50, def:25, skill:"AOE Heal L2" }
  ],
  9: [
    { name:"Frost Dragon", hp:1200, atk:110, def:45, skill:"Freeze L1" },
    { name:"Ice Golem", hp:600, atk:65, def:35, skill:"Defense Buff L2" },
    { name:"Frost Mage", hp:500, atk:60, def:25, skill:"AOE Heal L2" }
  ],
  10: [
    { name:"Demon Overlord", hp:2000, atk:150, def:60, skill:"AOE Attack L3" },
    { name:"Hell Knight", hp:800, atk:90, def:40, skill:"Berserk Mode L2" },
    { name:"Dark High Priest", hp:600, atk:70, def:35, skill:"AOE Heal L3" }
  ],

  // -------- ต่อจากนี้ 11–45 --------
  11: [
    { name:"Samurai Spirit", hp:1500, atk:130, def:55, skill:"Critical L2" },
    { name:"Oni Warrior", hp:1000, atk:95, def:45, skill:"Power Strike L2" },
    { name:"Shaman of the East", hp:800, atk:80, def:40, skill:"Heal L2" }
  ],
  12: [
    { name:"Minotaur", hp:1700, atk:140, def:60, skill:"Charge L1" },
    { name:"Labyrinth Guard", hp:1100, atk:100, def:50, skill:"Defense Buff L2" },
    { name:"Dark Seer", hp:900, atk:85, def:42, skill:"AOE Heal L2" }
  ],
  13: [
    { name:"Kraken", hp:2000, atk:150, def:65, skill:"Multi Attack L3" },
    { name:"Sea Serpent", hp:1300, atk:110, def:52, skill:"Piercing Shot L2" },
    { name:"Merfolk Oracle", hp:1000, atk:90, def:45, skill:"Heal L2" }
  ],
  14: [
    { name:"Phoenix", hp:2300, atk:170, def:70, skill:"Rebirth L1" },
    { name:"Fire Sentinel", hp:1500, atk:120, def:55, skill:"Power Strike L3" },
    { name:"Sun Priest", hp:1200, atk:95, def:48, skill:"AOE Heal L3" }
  ],
  15: [
    { name:"Titan King", hp:3000, atk:200, def:80, skill:"AOE Attack L4" },
    { name:"Stone Colossus", hp:1800, atk:130, def:60, skill:"Defense Buff L3" },
    { name:"Oracle of Earth", hp:1400, atk:100, def:50, skill:"AOE Heal L3" }
  ],
  16: [
    { name:"Ghost Samurai", hp:3200, atk:210, def:85, skill:"Critical L3" },
    { name:"Undead Ronin", hp:2000, atk:150, def:65, skill:"Power Strike L3" },
    { name:"Dark Monk", hp:1500, atk:120, def:55, skill:"Heal L3" }
  ],
  17: [
    { name:"Cyclops", hp:3500, atk:230, def:90, skill:"Stomp L1" },
    { name:"Rock Guard", hp:2200, atk:160, def:70, skill:"Defense Buff L3" },
    { name:"Seer of Stone", hp:1700, atk:130, def:58, skill:"AOE Heal L3" }
  ],
  18: [
    { name:"Leviathan", hp:4000, atk:250, def:95, skill:"Multi Attack L4" },
    { name:"Abyss Guardian", hp:2500, atk:180, def:75, skill:"Piercing Shot L3" },
    { name:"Abyss Oracle", hp:2000, atk:140, def:60, skill:"Heal L3" }
  ],
  19: [
    { name:"ราชสีห์เพลิง", hp:4200, atk:260, def:100, skill:"Roar L1" },
    { name:"นักรบแห่งเปลว", hp:2600, atk:190, def:78, skill:"Power Strike L3" },
    { name:"นักบวชแสง", hp:2100, atk:150, def:65, skill:"AOE Heal L3" }
  ],
  20: [
    { name:"Celestial Dragon", hp:5000, atk:300, def:110, skill:"AOE Attack L5" },
    { name:"Star Knight", hp:3000, atk:200, def:85, skill:"Defense Buff L4" },
    { name:"Lunar Priestess", hp:2400, atk:160, def:70, skill:"AOE Heal L4" }
  ],

21: [
    { name:"Valkyrie", hp:5200, atk:320, def:115, skill:"Critical L3" },
    { name:"Heaven Guard", hp:3200, atk:210, def:90, skill:"Defense Buff L4" },
    { name:"Priest of Dawn", hp:2600, atk:170, def:75, skill:"AOE Heal L4" }
  ],
  22: [
    { name:"Basilisk", hp:5500, atk:340, def:120, skill:"Petrify L1" },
    { name:"Snake Warrior", hp:3400, atk:220, def:92, skill:"Piercing Shot L3" },
    { name:"Snake Shaman", hp:2700, atk:180, def:78, skill:"Heal L3" }
  ],
  23: [
    { name:"Ifrit", hp:6000, atk:360, def:125, skill:"Flame Burst L1" },
    { name:"Fire Djinn", hp:3600, atk:230, def:95, skill:"Power Strike L4" },
    { name:"Desert Oracle", hp:2800, atk:190, def:80, skill:"AOE Heal L4" }
  ],
  24: [
    { name:"Bahamut", hp:6500, atk:380, def:130, skill:"AOE Attack L5" },
    { name:"Dragon Knight", hp:3800, atk:240, def:98, skill:"Berserk Mode L3" },
    { name:"Draconic Sage", hp:3000, atk:200, def:82, skill:"AOE Heal L4" }
  ],
  25: [
    { name:"เทพอสูรแห่งความมืด", hp:8000, atk:420, def:140, skill:"Dark Nova L1" },
    { name:"Nightmare Guard", hp:4200, atk:260, def:100, skill:"Defense Buff L4" },
    { name:"Eclipse Priest", hp:3200, atk:210, def:85, skill:"AOE Heal L4" }
  ],
  26: [
    { name:"Celestial Guardian", hp:8500, atk:440, def:145, skill:"Critical L4" },
    { name:"Light Sentinel", hp:4400, atk:270, def:102, skill:"Defense Buff L4" },
    { name:"Priest of Radiance", hp:3400, atk:220, def:88, skill:"Heal L4" }
  ],
  27: [
    { name:"Behemoth", hp:9000, atk:460, def:150, skill:"Stomp L2" },
    { name:"Stone Crusher", hp:4600, atk:280, def:105, skill:"Power Strike L4" },
    { name:"Oracle of Mountains", hp:3600, atk:230, def:90, skill:"AOE Heal L4" }
  ],
  28: [
    { name:"Leviathan Prime", hp:9500, atk:480, def:155, skill:"Tsunami L1" },
    { name:"Abyss Warrior", hp:4800, atk:290, def:108, skill:"Piercing Shot L4" },
    { name:"Sea Prophet", hp:3800, atk:240, def:92, skill:"AOE Heal L4" }
  ],
  29: [
    { name:"ราชันย์สุริยัน", hp:10000, atk:500, def:160, skill:"Solar Flare L1" },
    { name:"Sun Guard", hp:5000, atk:300, def:110, skill:"Defense Buff L4" },
    { name:"Solar Monk", hp:4000, atk:250, def:95, skill:"AOE Heal L5" }
  ],
  30: [
    { name:"Archdemon", hp:12000, atk:550, def:170, skill:"AOE Attack L6" },
    { name:"Hellfire Knight", hp:5500, atk:320, def:115, skill:"Berserk Mode L4" },
    { name:"Dark Cardinal", hp:4200, atk:260, def:100, skill:"AOE Heal L5" }
  ],
  31: [
    { name:"Titan Guardian", hp:12500, atk:570, def:175, skill:"Power Strike L5" },
    { name:"Colossus", hp:5800, atk:330, def:118, skill:"Defense Buff L5" },
    { name:"Earth Sage", hp:4400, atk:270, def:102, skill:"Heal L5" }
  ],
  32: [
    { name:"Dragon Emperor", hp:13000, atk:590, def:180, skill:"Dragon Breath L1" },
    { name:"Draconic Guard", hp:6000, atk:340, def:120, skill:"Piercing Shot L5" },
    { name:"Dragon Oracle", hp:4600, atk:280, def:105, skill:"AOE Heal L5" }
  ],
  33: [
    { name:"Seraphim", hp:13500, atk:610, def:185, skill:"Holy Strike L1" },
    { name:"Angel Knight", hp:6200, atk:350, def:122, skill:"Critical L5" },
    { name:"Cleric of Light", hp:4800, atk:290, def:108, skill:"Heal L5" }
  ],
  34: [
    { name:"World Serpent", hp:14000, atk:630, def:190, skill:"Venom Nova L1" },
    { name:"Serpent Champion", hp:6400, atk:360, def:125, skill:"Piercing Shot L5" },
    { name:"Serpent Priest", hp:5000, atk:300, def:110, skill:"AOE Heal L5" }
  ],
  35: [
    { name:"จักรพรรดิมาร", hp:16000, atk:700, def:200, skill:"Doom Nova L1" },
    { name:"Infernal Guard", hp:7000, atk:380, def:130, skill:"Berserk Mode L5" },
    { name:"Cult High Priest", hp:5200, atk:320, def:115, skill:"AOE Heal L5" }
  ],
  36: [
    { name:"Celestial Titan", hp:17000, atk:720, def:210, skill:"AOE Attack L6" },
    { name:"Star Paladin", hp:7200, atk:390, def:135, skill:"Defense Buff L5" },
    { name:"Priest of Cosmos", hp:5400, atk:330, def:118, skill:"AOE Heal L5" }
  ],
  37: [
    { name:"Chimera King", hp:18000, atk:740, def:215, skill:"Multi Attack L5" },
    { name:"Beast Guard", hp:7400, atk:400, def:138, skill:"Power Strike L5" },
    { name:"Shaman of Beasts", hp:5600, atk:340, def:120, skill:"Heal L5" }
  ],
  38: [
    { name:"Oblivion Dragon", hp:19000, atk:760, def:220, skill:"Dark Flame L1" },
    { name:"Void Knight", hp:7600, atk:410, def:140, skill:"Critical L5" },
    { name:"Oracle of Void", hp:5800, atk:350, def:122, skill:"AOE Heal L5" }
  ],
  39: [
    { name:"ราชันย์สายฟ้า", hp:20000, atk:780, def:225, skill:"Thunderstorm L1" },
    { name:"Storm Guard", hp:7800, atk:420, def:142, skill:"Piercing Shot L5" },
    { name:"Lightning Sage", hp:6000, atk:360, def:125, skill:"Heal L5" }
  ],
  40: [
    { name:"Primordial Demon", hp:22000, atk:850, def:240, skill:"AOE Attack L7" },
    { name:"Abyssal Knight", hp:8500, atk:450, def:150, skill:"Berserk Mode L6" },
    { name:"Dark Oracle", hp:6400, atk:380, def:130, skill:"AOE Heal L6" }
  ],
  41: [
    { name:"Guardian of Light", hp:23000, atk:880, def:250, skill:"Holy Nova L1" },
    { name:"Light Paladin", hp:8800, atk:460, def:155, skill:"Critical L6" },
    { name:"Cleric Supreme", hp:6600, atk:390, def:132, skill:"Heal L6" }
  ],
  42: [
    { name:"Leviathan Eternal", hp:24000, atk:900, def:260, skill:"Tidal Wave L1" },
    { name:"Ocean Guard", hp:9000, atk:470, def:158, skill:"Defense Buff L6" },
    { name:"Sea Oracle", hp:6800, atk:400, def:135, skill:"AOE Heal L6" }
  ],
  43: [
    { name:"Cosmic Serpent", hp:25000, atk:920, def:270, skill:"Starlight Venom L1" },
    { name:"Galaxy Warrior", hp:9200, atk:480, def:160, skill:"Piercing Shot L6" },
    { name:"Astro Priest", hp:7000, atk:410, def:138, skill:"AOE Heal L6" }
  ],
  44: [
    { name:"Immortal Phoenix", hp:26000, atk:940, def:280, skill:"Rebirth L2" },
    { name:"Sunfire Knight", hp:9400, atk:490, def:162, skill:"Power Strike L6" },
    { name:"Solar Priestess", hp:7200, atk:420, def:140, skill:"AOE Heal L6" }
  ],
  45: [
    { name:"จักรพรรดิแห่งจักรวาล", hp:30000, atk:1000, def:300, skill:"Cosmic Nova L1" },
    { name:"Void Titan", hp:10000, atk:520, def:170, skill:"Berserk Mode L6" },
    { name:"Celestial High Oracle", hp:7500, atk:440, def:145, skill:"AOE Heal L6" }
  ],
};