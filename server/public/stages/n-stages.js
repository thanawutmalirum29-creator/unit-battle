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

  // -------- ต่อจากนี้ 46–145 (ส่วนขยายใหม่ x100 ด่าน) --------
  46: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord I", hp:31350, atk:1044, def:314, skill:"AOE Attack L1" },
    { name:"Shadowborn Slayer I", hp:10440, atk:543, def:178, skill:"Double Strike L1" },
    { name:"Shadowborn Oracle I", hp:7840, atk:459, def:152, skill:"Heal L1" }
  ],
  47: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord II", hp:32730, atk:1090, def:327, skill:"Berserk Mode L1" },
    { name:"Shadowborn Slayer II", hp:10900, atk:567, def:185, skill:"Bomb L1" },
    { name:"Shadowborn Oracle II", hp:8180, atk:480, def:158, skill:"Defense Buff L1" }
  ],
  48: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord III", hp:34130, atk:1137, def:341, skill:"Power Strike L1" },
    { name:"Shadowborn Slayer III", hp:11370, atk:591, def:193, skill:"Critical L1" },
    { name:"Shadowborn Oracle III", hp:8530, atk:500, def:165, skill:"AOE Defense Buff L1" }
  ],
  49: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord IV", hp:35570, atk:1184, def:356, skill:"AOE Attack L1" },
    { name:"Shadowborn Slayer IV", hp:11840, atk:616, def:202, skill:"Piercing Shot L1" },
    { name:"Shadowborn Oracle IV", hp:8890, atk:521, def:172, skill:"Cleanse L1" }
  ],
  50: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord V", hp:37040, atk:1233, def:370, skill:"Berserk Mode L1" },
    { name:"Shadowborn Slayer V", hp:12330, atk:641, def:210, skill:"Double Strike L1" },
    { name:"Shadowborn Oracle V", hp:9260, atk:543, def:179, skill:"AOE Heal L1" }
  ],
  51: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord VI", hp:38530, atk:1283, def:385, skill:"Power Strike L1" },
    { name:"Shadowborn Slayer VI", hp:12830, atk:667, def:218, skill:"Bomb L1" },
    { name:"Shadowborn Oracle VI", hp:9630, atk:565, def:186, skill:"Heal L1" }
  ],
  52: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord VII", hp:40060, atk:1334, def:401, skill:"AOE Attack L1" },
    { name:"Shadowborn Slayer VII", hp:13340, atk:694, def:227, skill:"Critical L1" },
    { name:"Shadowborn Oracle VII", hp:10020, atk:587, def:194, skill:"Defense Buff L1" }
  ],
  53: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord VIII", hp:41620, atk:1386, def:416, skill:"Berserk Mode L1" },
    { name:"Shadowborn Slayer VIII", hp:13860, atk:721, def:236, skill:"Piercing Shot L1" },
    { name:"Shadowborn Oracle VIII", hp:10400, atk:610, def:201, skill:"AOE Defense Buff L1" }
  ],
  54: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord IX", hp:43200, atk:1439, def:432, skill:"Power Strike L1" },
    { name:"Shadowborn Slayer IX", hp:14390, atk:748, def:245, skill:"Double Strike L1" },
    { name:"Shadowborn Oracle IX", hp:10800, atk:633, def:209, skill:"Cleanse L1" }
  ],
  55: [ // ดินแดนเงาคืนชีพ
    { name:"Shadowborn Warlord X", hp:44820, atk:1493, def:448, skill:"AOE Attack L1" },
    { name:"Shadowborn Slayer X", hp:14930, atk:776, def:254, skill:"Bomb L1" },
    { name:"Shadowborn Oracle X", hp:11200, atk:657, def:216, skill:"AOE Stun L1" }
  ],
  56: [ // เหวลึกอสูร
    { name:"Abyssal Reaper I", hp:46460, atk:1547, def:465, skill:"Berserk Mode L1" },
    { name:"Abyssal Stalker I", hp:15470, atk:804, def:264, skill:"Critical L1" },
    { name:"Abyssal Acolyte I", hp:11620, atk:681, def:225, skill:"Heal L1" }
  ],
  57: [ // เหวลึกอสูร
    { name:"Abyssal Reaper II", hp:48130, atk:1603, def:481, skill:"Power Strike L1" },
    { name:"Abyssal Stalker II", hp:16030, atk:834, def:273, skill:"Piercing Shot L1" },
    { name:"Abyssal Acolyte II", hp:12030, atk:705, def:232, skill:"Defense Buff L1" }
  ],
  58: [ // เหวลึกอสูร
    { name:"Abyssal Reaper III", hp:49840, atk:1660, def:498, skill:"AOE Attack L1" },
    { name:"Abyssal Stalker III", hp:16600, atk:863, def:282, skill:"Double Strike L1" },
    { name:"Abyssal Acolyte III", hp:12460, atk:730, def:241, skill:"AOE Defense Buff L1" }
  ],
  59: [ // เหวลึกอสูร
    { name:"Abyssal Reaper IV", hp:51570, atk:1717, def:516, skill:"Berserk Mode L1" },
    { name:"Abyssal Stalker IV", hp:17170, atk:893, def:293, skill:"Bomb L1" },
    { name:"Abyssal Acolyte IV", hp:12890, atk:755, def:249, skill:"Cleanse L1" }
  ],
  60: [ // เหวลึกอสูร
    { name:"Abyssal Reaper V", hp:53330, atk:1776, def:533, skill:"Power Strike L1" },
    { name:"Abyssal Stalker V", hp:17760, atk:924, def:302, skill:"Critical L1" },
    { name:"Abyssal Acolyte V", hp:13330, atk:781, def:257, skill:"AOE Heal L1" }
  ],
  61: [ // เหวลึกอสูร
    { name:"Abyssal Reaper VI", hp:55130, atk:1836, def:551, skill:"AOE Attack L1" },
    { name:"Abyssal Stalker VI", hp:18360, atk:955, def:312, skill:"Piercing Shot L1" },
    { name:"Abyssal Acolyte VI", hp:13780, atk:808, def:266, skill:"Heal L1" }
  ],
  62: [ // เหวลึกอสูร
    { name:"Abyssal Reaper VII", hp:56950, atk:1896, def:570, skill:"Berserk Mode L1" },
    { name:"Abyssal Stalker VII", hp:18960, atk:986, def:323, skill:"Double Strike L1" },
    { name:"Abyssal Acolyte VII", hp:14240, atk:834, def:275, skill:"Defense Buff L1" }
  ],
  63: [ // เหวลึกอสูร
    { name:"Abyssal Reaper VIII", hp:58800, atk:1958, def:588, skill:"Power Strike L1" },
    { name:"Abyssal Stalker VIII", hp:19580, atk:1018, def:333, skill:"Bomb L1" },
    { name:"Abyssal Acolyte VIII", hp:14700, atk:862, def:284, skill:"AOE Defense Buff L1" }
  ],
  64: [ // เหวลึกอสูร
    { name:"Abyssal Reaper IX", hp:60680, atk:2021, def:607, skill:"AOE Attack L1" },
    { name:"Abyssal Stalker IX", hp:20210, atk:1051, def:344, skill:"Critical L1" },
    { name:"Abyssal Acolyte IX", hp:15170, atk:889, def:293, skill:"Cleanse L1" }
  ],
  65: [ // เหวลึกอสูร
    { name:"Abyssal Reaper X", hp:62590, atk:2084, def:626, skill:"Berserk Mode L1" },
    { name:"Abyssal Stalker X", hp:20840, atk:1084, def:355, skill:"Piercing Shot L1" },
    { name:"Abyssal Acolyte X", hp:15650, atk:917, def:302, skill:"AOE Silence L1" }
  ],
  66: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel I", hp:64530, atk:2149, def:645, skill:"Power Strike L1" },
    { name:"Stormpeak Marauder I", hp:21490, atk:1117, def:366, skill:"Double Strike L1" },
    { name:"Stormpeak Priest I", hp:16130, atk:946, def:312, skill:"Heal L1" }
  ],
  67: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel II", hp:66500, atk:2214, def:665, skill:"AOE Attack L1" },
    { name:"Stormpeak Marauder II", hp:22140, atk:1151, def:377, skill:"Bomb L1" },
    { name:"Stormpeak Priest II", hp:16620, atk:974, def:321, skill:"Defense Buff L1" }
  ],
  68: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel III", hp:68500, atk:2281, def:685, skill:"Berserk Mode L1" },
    { name:"Stormpeak Marauder III", hp:22810, atk:1186, def:388, skill:"Critical L1" },
    { name:"Stormpeak Priest III", hp:17120, atk:1004, def:331, skill:"AOE Defense Buff L1" }
  ],
  69: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel IV", hp:70530, atk:2349, def:705, skill:"Power Strike L1" },
    { name:"Stormpeak Marauder IV", hp:23490, atk:1221, def:400, skill:"Piercing Shot L1" },
    { name:"Stormpeak Priest IV", hp:17630, atk:1034, def:341, skill:"Cleanse L1" }
  ],
  70: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel V", hp:72590, atk:2417, def:726, skill:"AOE Attack L1" },
    { name:"Stormpeak Marauder V", hp:24170, atk:1257, def:412, skill:"Double Strike L1" },
    { name:"Stormpeak Priest V", hp:18150, atk:1063, def:351, skill:"AOE Heal L1" }
  ],
  71: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel VI", hp:74680, atk:2487, def:747, skill:"Berserk Mode L1" },
    { name:"Stormpeak Marauder VI", hp:24870, atk:1293, def:424, skill:"Bomb L1" },
    { name:"Stormpeak Priest VI", hp:18670, atk:1094, def:361, skill:"Heal L1" }
  ],
  72: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel VII", hp:76800, atk:2557, def:768, skill:"Power Strike L1" },
    { name:"Stormpeak Marauder VII", hp:25570, atk:1330, def:435, skill:"Critical L1" },
    { name:"Stormpeak Priest VII", hp:19200, atk:1125, def:371, skill:"Defense Buff L1" }
  ],
  73: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel VIII", hp:78950, atk:2629, def:790, skill:"AOE Attack L1" },
    { name:"Stormpeak Marauder VIII", hp:26290, atk:1367, def:448, skill:"Piercing Shot L1" },
    { name:"Stormpeak Priest VIII", hp:19740, atk:1157, def:382, skill:"AOE Defense Buff L1" }
  ],
  74: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel IX", hp:81130, atk:2702, def:811, skill:"Berserk Mode L1" },
    { name:"Stormpeak Marauder IX", hp:27020, atk:1405, def:460, skill:"Double Strike L1" },
    { name:"Stormpeak Priest IX", hp:20280, atk:1189, def:392, skill:"Cleanse L1" }
  ],
  75: [ // หุบเขาฟ้าร้อง
    { name:"Stormpeak Sentinel X", hp:83330, atk:2775, def:833, skill:"Power Strike L1" },
    { name:"Stormpeak Marauder X", hp:27750, atk:1443, def:472, skill:"Bomb L1" },
    { name:"Stormpeak Priest X", hp:20830, atk:1221, def:402, skill:"Stun L1" }
  ],
  76: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer I", hp:85570, atk:2849, def:856, skill:"AOE Attack L1" },
    { name:"Cursedwood Ravager I", hp:28490, atk:1481, def:485, skill:"Critical L1" },
    { name:"Cursedwood Sage I", hp:21390, atk:1254, def:413, skill:"Heal L1" }
  ],
  77: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer II", hp:87840, atk:2925, def:878, skill:"Berserk Mode L1" },
    { name:"Cursedwood Ravager II", hp:29250, atk:1521, def:498, skill:"Piercing Shot L1" },
    { name:"Cursedwood Sage II", hp:21960, atk:1287, def:424, skill:"Defense Buff L1" }
  ],
  78: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer III", hp:90130, atk:3001, def:901, skill:"Power Strike L1" },
    { name:"Cursedwood Ravager III", hp:30010, atk:1561, def:511, skill:"Double Strike L1" },
    { name:"Cursedwood Sage III", hp:22530, atk:1320, def:435, skill:"AOE Defense Buff L1" }
  ],
  79: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer IV", hp:92460, atk:3079, def:925, skill:"AOE Attack L2" },
    { name:"Cursedwood Ravager IV", hp:30790, atk:1601, def:524, skill:"Bomb L2" },
    { name:"Cursedwood Sage IV", hp:23120, atk:1355, def:447, skill:"Cleanse L2" }
  ],
  80: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer V", hp:94820, atk:3158, def:948, skill:"Berserk Mode L2" },
    { name:"Cursedwood Ravager V", hp:31580, atk:1642, def:538, skill:"Critical L2" },
    { name:"Cursedwood Sage V", hp:23700, atk:1390, def:458, skill:"AOE Heal L2" }
  ],
  81: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer VI", hp:97200, atk:3237, def:972, skill:"Power Strike L2" },
    { name:"Cursedwood Ravager VI", hp:32370, atk:1683, def:551, skill:"Piercing Shot L2" },
    { name:"Cursedwood Sage VI", hp:24300, atk:1424, def:469, skill:"Heal L2" }
  ],
  82: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer VII", hp:99620, atk:3317, def:996, skill:"AOE Attack L2" },
    { name:"Cursedwood Ravager VII", hp:33170, atk:1725, def:565, skill:"Double Strike L2" },
    { name:"Cursedwood Sage VII", hp:24900, atk:1459, def:481, skill:"Defense Buff L2" }
  ],
  83: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer VIII", hp:102060, atk:3399, def:1021, skill:"Berserk Mode L2" },
    { name:"Cursedwood Ravager VIII", hp:33990, atk:1767, def:579, skill:"Bomb L2" },
    { name:"Cursedwood Sage VIII", hp:25520, atk:1496, def:493, skill:"AOE Defense Buff L2" }
  ],
  84: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer IX", hp:104530, atk:3481, def:1045, skill:"Power Strike L2" },
    { name:"Cursedwood Ravager IX", hp:34810, atk:1810, def:593, skill:"Critical L2" },
    { name:"Cursedwood Sage IX", hp:26130, atk:1532, def:505, skill:"Cleanse L2" }
  ],
  85: [ // ป่าต้องสาป
    { name:"Cursedwood Devourer X", hp:107040, atk:3564, def:1070, skill:"AOE Attack L2" },
    { name:"Cursedwood Ravager X", hp:35640, atk:1853, def:607, skill:"Piercing Shot L2" },
    { name:"Cursedwood Sage X", hp:26760, atk:1568, def:517, skill:"Silence L2" }
  ],
  86: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant I", hp:109570, atk:3649, def:1096, skill:"Berserk Mode L2" },
    { name:"Emberwaste Hunter I", hp:36490, atk:1897, def:621, skill:"Double Strike L2" },
    { name:"Emberwaste Mystic I", hp:27390, atk:1606, def:529, skill:"Heal L2" }
  ],
  87: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant II", hp:112130, atk:3734, def:1121, skill:"Power Strike L2" },
    { name:"Emberwaste Hunter II", hp:37340, atk:1942, def:636, skill:"Bomb L2" },
    { name:"Emberwaste Mystic II", hp:28030, atk:1643, def:541, skill:"Defense Buff L2" }
  ],
  88: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant III", hp:114730, atk:3821, def:1147, skill:"AOE Attack L2" },
    { name:"Emberwaste Hunter III", hp:38210, atk:1987, def:650, skill:"Critical L2" },
    { name:"Emberwaste Mystic III", hp:28680, atk:1681, def:554, skill:"AOE Defense Buff L2" }
  ],
  89: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant IV", hp:117350, atk:3908, def:1174, skill:"Berserk Mode L2" },
    { name:"Emberwaste Hunter IV", hp:39080, atk:2032, def:666, skill:"Piercing Shot L2" },
    { name:"Emberwaste Mystic IV", hp:29340, atk:1720, def:567, skill:"Cleanse L2" }
  ],
  90: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant V", hp:120000, atk:3996, def:1200, skill:"Power Strike L2" },
    { name:"Emberwaste Hunter V", hp:39960, atk:2078, def:680, skill:"Double Strike L2" },
    { name:"Emberwaste Mystic V", hp:30000, atk:1758, def:580, skill:"AOE Heal L2" }
  ],
  91: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant VI", hp:122680, atk:4085, def:1227, skill:"AOE Attack L2" },
    { name:"Emberwaste Hunter VI", hp:40850, atk:2124, def:696, skill:"Bomb L2" },
    { name:"Emberwaste Mystic VI", hp:30670, atk:1797, def:593, skill:"Heal L2" }
  ],
  92: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant VII", hp:125390, atk:4175, def:1254, skill:"Berserk Mode L2" },
    { name:"Emberwaste Hunter VII", hp:41750, atk:2171, def:711, skill:"Critical L2" },
    { name:"Emberwaste Mystic VII", hp:31350, atk:1837, def:606, skill:"Defense Buff L2" }
  ],
  93: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant VIII", hp:128130, atk:4267, def:1281, skill:"Power Strike L2" },
    { name:"Emberwaste Hunter VIII", hp:42670, atk:2219, def:726, skill:"Piercing Shot L2" },
    { name:"Emberwaste Mystic VIII", hp:32030, atk:1877, def:619, skill:"AOE Defense Buff L2" }
  ],
  94: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant IX", hp:130910, atk:4359, def:1309, skill:"AOE Attack L2" },
    { name:"Emberwaste Hunter IX", hp:43590, atk:2267, def:742, skill:"Double Strike L2" },
    { name:"Emberwaste Mystic IX", hp:32730, atk:1918, def:632, skill:"Cleanse L2" }
  ],
  95: [ // ทะเลทรายเพลิง
    { name:"Emberwaste Tyrant X", hp:133710, atk:4453, def:1337, skill:"Berserk Mode L2" },
    { name:"Emberwaste Hunter X", hp:44530, atk:2316, def:758, skill:"Bomb L2" },
    { name:"Emberwaste Mystic X", hp:33430, atk:1959, def:646, skill:"Time Stop L2" }
  ],
  96: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger I", hp:136540, atk:4547, def:1365, skill:"Power Strike L2" },
    { name:"Hollowshrine Blade I", hp:45470, atk:2364, def:774, skill:"Critical L2" },
    { name:"Hollowshrine Cleric I", hp:34140, atk:2001, def:659, skill:"Heal L2" }
  ],
  97: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger II", hp:139390, atk:4642, def:1394, skill:"AOE Attack L2" },
    { name:"Hollowshrine Blade II", hp:46420, atk:2414, def:790, skill:"Piercing Shot L2" },
    { name:"Hollowshrine Cleric II", hp:34850, atk:2042, def:673, skill:"Defense Buff L2" }
  ],
  98: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger III", hp:142280, atk:4738, def:1423, skill:"Berserk Mode L2" },
    { name:"Hollowshrine Blade III", hp:47380, atk:2464, def:807, skill:"Double Strike L2" },
    { name:"Hollowshrine Cleric III", hp:35570, atk:2085, def:687, skill:"AOE Defense Buff L2" }
  ],
  99: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger IV", hp:145200, atk:4835, def:1452, skill:"Power Strike L2" },
    { name:"Hollowshrine Blade IV", hp:48350, atk:2514, def:823, skill:"Bomb L2" },
    { name:"Hollowshrine Cleric IV", hp:36300, atk:2127, def:701, skill:"Cleanse L2" }
  ],
  100: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger V", hp:148150, atk:4933, def:1482, skill:"AOE Attack L2" },
    { name:"Hollowshrine Blade V", hp:49330, atk:2565, def:840, skill:"Critical L2" },
    { name:"Hollowshrine Cleric V", hp:37040, atk:2171, def:716, skill:"AOE Heal L2" }
  ],
  101: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger VI", hp:151130, atk:5033, def:1511, skill:"Berserk Mode L2" },
    { name:"Hollowshrine Blade VI", hp:50330, atk:2617, def:857, skill:"Piercing Shot L2" },
    { name:"Hollowshrine Cleric VI", hp:37780, atk:2215, def:730, skill:"Heal L2" }
  ],
  102: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger VII", hp:154140, atk:5133, def:1541, skill:"Power Strike L2" },
    { name:"Hollowshrine Blade VII", hp:51330, atk:2669, def:874, skill:"Double Strike L2" },
    { name:"Hollowshrine Cleric VII", hp:38540, atk:2259, def:744, skill:"Defense Buff L2" }
  ],
  103: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger VIII", hp:157170, atk:5234, def:1572, skill:"AOE Attack L2" },
    { name:"Hollowshrine Blade VIII", hp:52340, atk:2722, def:891, skill:"Bomb L2" },
    { name:"Hollowshrine Cleric VIII", hp:39290, atk:2303, def:759, skill:"AOE Defense Buff L2" }
  ],
  104: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger IX", hp:160240, atk:5336, def:1602, skill:"Berserk Mode L2" },
    { name:"Hollowshrine Blade IX", hp:53360, atk:2775, def:908, skill:"Critical L2" },
    { name:"Hollowshrine Cleric IX", hp:40060, atk:2348, def:774, skill:"Cleanse L2" }
  ],
  105: [ // วิหารร้าง
    { name:"Hollowshrine Harbinger X", hp:163340, atk:5439, def:1633, skill:"Power Strike L2" },
    { name:"Hollowshrine Blade X", hp:54390, atk:2828, def:926, skill:"Piercing Shot L2" },
    { name:"Hollowshrine Cleric X", hp:40840, atk:2393, def:789, skill:"AOE Stun L2" }
  ],
  106: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden I", hp:166460, atk:5543, def:1665, skill:"AOE Attack L2" },
    { name:"Frostvein Striker I", hp:55430, atk:2882, def:944, skill:"Double Strike L2" },
    { name:"Frostvein Shaman I", hp:41620, atk:2439, def:804, skill:"Heal L2" }
  ],
  107: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden II", hp:169620, atk:5648, def:1696, skill:"Berserk Mode L2" },
    { name:"Frostvein Striker II", hp:56480, atk:2937, def:962, skill:"Bomb L2" },
    { name:"Frostvein Shaman II", hp:42400, atk:2485, def:819, skill:"Defense Buff L2" }
  ],
  108: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden III", hp:172800, atk:5754, def:1728, skill:"Power Strike L2" },
    { name:"Frostvein Striker III", hp:57540, atk:2992, def:980, skill:"Critical L2" },
    { name:"Frostvein Shaman III", hp:43200, atk:2532, def:835, skill:"AOE Defense Buff L2" }
  ],
  109: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden IV", hp:176020, atk:5861, def:1760, skill:"AOE Attack L2" },
    { name:"Frostvein Striker IV", hp:58610, atk:3048, def:998, skill:"Piercing Shot L2" },
    { name:"Frostvein Shaman IV", hp:44000, atk:2579, def:850, skill:"Cleanse L2" }
  ],
  110: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden V", hp:179260, atk:5969, def:1793, skill:"Berserk Mode L2" },
    { name:"Frostvein Striker V", hp:59690, atk:3104, def:1017, skill:"Double Strike L2" },
    { name:"Frostvein Shaman V", hp:44820, atk:2626, def:866, skill:"AOE Heal L2" }
  ],
  111: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden VI", hp:182540, atk:6079, def:1825, skill:"Power Strike L2" },
    { name:"Frostvein Striker VI", hp:60790, atk:3161, def:1035, skill:"Bomb L2" },
    { name:"Frostvein Shaman VI", hp:45640, atk:2675, def:881, skill:"Heal L2" }
  ],
  112: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden VII", hp:185840, atk:6188, def:1858, skill:"AOE Attack L3" },
    { name:"Frostvein Striker VII", hp:61880, atk:3218, def:1053, skill:"Critical L3" },
    { name:"Frostvein Shaman VII", hp:46460, atk:2723, def:897, skill:"Defense Buff L3" }
  ],
  113: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden VIII", hp:189170, atk:6299, def:1892, skill:"Berserk Mode L3" },
    { name:"Frostvein Striker VIII", hp:62990, atk:3275, def:1073, skill:"Piercing Shot L3" },
    { name:"Frostvein Shaman VIII", hp:47290, atk:2772, def:914, skill:"AOE Defense Buff L3" }
  ],
  114: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden IX", hp:192540, atk:6412, def:1925, skill:"Power Strike L3" },
    { name:"Frostvein Striker IX", hp:64120, atk:3334, def:1091, skill:"Double Strike L3" },
    { name:"Frostvein Shaman IX", hp:48140, atk:2821, def:930, skill:"Cleanse L3" }
  ],
  115: [ // ธารน้ำแข็งนิรันดร์
    { name:"Frostvein Warden X", hp:195930, atk:6524, def:1959, skill:"AOE Attack L3" },
    { name:"Frostvein Striker X", hp:65240, atk:3392, def:1111, skill:"Bomb L3" },
    { name:"Frostvein Shaman X", hp:48980, atk:2871, def:946, skill:"AOE Silence L3" }
  ],
  116: [ // นครใต้สมุทร
    { name:"Tidefall Colossus I", hp:199350, atk:6638, def:1994, skill:"Berserk Mode L3" },
    { name:"Tidefall Assassin I", hp:66380, atk:3452, def:1131, skill:"Critical L3" },
    { name:"Tidefall Prophet I", hp:49840, atk:2921, def:963, skill:"Heal L3" }
  ],
  117: [ // นครใต้สมุทร
    { name:"Tidefall Colossus II", hp:202800, atk:6753, def:2028, skill:"Power Strike L3" },
    { name:"Tidefall Assassin II", hp:67530, atk:3512, def:1150, skill:"Piercing Shot L3" },
    { name:"Tidefall Prophet II", hp:50700, atk:2971, def:980, skill:"Defense Buff L3" }
  ],
  118: [ // นครใต้สมุทร
    { name:"Tidefall Colossus III", hp:206280, atk:6869, def:2063, skill:"AOE Attack L3" },
    { name:"Tidefall Assassin III", hp:68690, atk:3572, def:1170, skill:"Double Strike L3" },
    { name:"Tidefall Prophet III", hp:51570, atk:3022, def:996, skill:"AOE Defense Buff L3" }
  ],
  119: [ // นครใต้สมุทร
    { name:"Tidefall Colossus IV", hp:209800, atk:6986, def:2098, skill:"Berserk Mode L3" },
    { name:"Tidefall Assassin IV", hp:69860, atk:3633, def:1190, skill:"Bomb L3" },
    { name:"Tidefall Prophet IV", hp:52450, atk:3074, def:1013, skill:"Cleanse L3" }
  ],
  120: [ // นครใต้สมุทร
    { name:"Tidefall Colossus V", hp:213340, atk:7104, def:2133, skill:"Power Strike L3" },
    { name:"Tidefall Assassin V", hp:71040, atk:3694, def:1209, skill:"Critical L3" },
    { name:"Tidefall Prophet V", hp:53340, atk:3126, def:1030, skill:"AOE Heal L3" }
  ],
  121: [ // นครใต้สมุทร
    { name:"Tidefall Colossus VI", hp:216910, atk:7223, def:2169, skill:"AOE Attack L3" },
    { name:"Tidefall Assassin VI", hp:72230, atk:3756, def:1230, skill:"Piercing Shot L3" },
    { name:"Tidefall Prophet VI", hp:54230, atk:3178, def:1048, skill:"Heal L3" }
  ],
  122: [ // นครใต้สมุทร
    { name:"Tidefall Colossus VII", hp:220510, atk:7343, def:2205, skill:"Berserk Mode L3" },
    { name:"Tidefall Assassin VII", hp:73430, atk:3818, def:1250, skill:"Double Strike L3" },
    { name:"Tidefall Prophet VII", hp:55130, atk:3231, def:1065, skill:"Defense Buff L3" }
  ],
  123: [ // นครใต้สมุทร
    { name:"Tidefall Colossus VIII", hp:224140, atk:7464, def:2241, skill:"Power Strike L3" },
    { name:"Tidefall Assassin VIII", hp:74640, atk:3881, def:1271, skill:"Bomb L3" },
    { name:"Tidefall Prophet VIII", hp:56040, atk:3284, def:1082, skill:"AOE Defense Buff L3" }
  ],
  124: [ // นครใต้สมุทร
    { name:"Tidefall Colossus IX", hp:227800, atk:7586, def:2278, skill:"AOE Attack L3" },
    { name:"Tidefall Assassin IX", hp:75860, atk:3945, def:1292, skill:"Critical L3" },
    { name:"Tidefall Prophet IX", hp:56950, atk:3338, def:1100, skill:"Cleanse L3" }
  ],
  125: [ // นครใต้สมุทร
    { name:"Tidefall Colossus X", hp:231480, atk:7708, def:2315, skill:"Berserk Mode L3" },
    { name:"Tidefall Assassin X", hp:77080, atk:4008, def:1313, skill:"Piercing Shot L3" },
    { name:"Tidefall Prophet X", hp:57870, atk:3392, def:1118, skill:"Stun L3" }
  ],
  126: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot I", hp:235200, atk:7832, def:2352, skill:"Power Strike L3" },
    { name:"Riftmaze Raider I", hp:78320, atk:4073, def:1334, skill:"Double Strike L3" },
    { name:"Riftmaze Seer I", hp:58800, atk:3446, def:1136, skill:"Heal L3" }
  ],
  127: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot II", hp:238950, atk:7957, def:2390, skill:"AOE Attack L3" },
    { name:"Riftmaze Raider II", hp:79570, atk:4138, def:1355, skill:"Bomb L3" },
    { name:"Riftmaze Seer II", hp:59740, atk:3501, def:1154, skill:"Defense Buff L3" }
  ],
  128: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot III", hp:242730, atk:8083, def:2427, skill:"Berserk Mode L3" },
    { name:"Riftmaze Raider III", hp:80830, atk:4203, def:1376, skill:"Critical L3" },
    { name:"Riftmaze Seer III", hp:60680, atk:3557, def:1172, skill:"AOE Defense Buff L3" }
  ],
  129: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot IV", hp:246540, atk:8210, def:2465, skill:"Power Strike L3" },
    { name:"Riftmaze Raider IV", hp:82100, atk:4269, def:1398, skill:"Piercing Shot L3" },
    { name:"Riftmaze Seer IV", hp:61640, atk:3612, def:1191, skill:"Cleanse L3" }
  ],
  130: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot V", hp:250370, atk:8337, def:2504, skill:"AOE Attack L3" },
    { name:"Riftmaze Raider V", hp:83370, atk:4335, def:1420, skill:"Double Strike L3" },
    { name:"Riftmaze Seer V", hp:62590, atk:3668, def:1209, skill:"AOE Heal L3" }
  ],
  131: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot VI", hp:254240, atk:8466, def:2542, skill:"Berserk Mode L3" },
    { name:"Riftmaze Raider VI", hp:84660, atk:4402, def:1441, skill:"Bomb L3" },
    { name:"Riftmaze Seer VI", hp:63560, atk:3725, def:1228, skill:"Heal L3" }
  ],
  132: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot VII", hp:258140, atk:8596, def:2581, skill:"Power Strike L3" },
    { name:"Riftmaze Raider VII", hp:85960, atk:4470, def:1463, skill:"Critical L3" },
    { name:"Riftmaze Seer VII", hp:64540, atk:3782, def:1247, skill:"Defense Buff L3" }
  ],
  133: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot VIII", hp:262060, atk:8727, def:2621, skill:"AOE Attack L3" },
    { name:"Riftmaze Raider VIII", hp:87270, atk:4538, def:1486, skill:"Piercing Shot L3" },
    { name:"Riftmaze Seer VIII", hp:65520, atk:3840, def:1266, skill:"AOE Defense Buff L3" }
  ],
  134: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot IX", hp:266020, atk:8858, def:2660, skill:"Berserk Mode L3" },
    { name:"Riftmaze Raider IX", hp:88580, atk:4606, def:1508, skill:"Double Strike L3" },
    { name:"Riftmaze Seer IX", hp:66500, atk:3898, def:1285, skill:"Cleanse L3" }
  ],
  135: [ // เขาวงกตมิติ
    { name:"Riftmaze Despot X", hp:270000, atk:8991, def:2700, skill:"Power Strike L3" },
    { name:"Riftmaze Raider X", hp:89910, atk:4675, def:1531, skill:"Bomb L3" },
    { name:"Riftmaze Seer X", hp:67500, atk:3956, def:1304, skill:"Silence L3" }
  ],
  136: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord I", hp:274020, atk:9125, def:2740, skill:"AOE Attack L3" },
    { name:"Astralthrone Berserker I", hp:91250, atk:4745, def:1554, skill:"Critical L3" },
    { name:"Astralthrone Warlock I", hp:68500, atk:4015, def:1323, skill:"Heal L3" }
  ],
  137: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord II", hp:278060, atk:9259, def:2781, skill:"Berserk Mode L3" },
    { name:"Astralthrone Berserker II", hp:92590, atk:4815, def:1577, skill:"Piercing Shot L3" },
    { name:"Astralthrone Warlock II", hp:69520, atk:4074, def:1343, skill:"Defense Buff L3" }
  ],
  138: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord III", hp:282140, atk:9395, def:2821, skill:"Power Strike L3" },
    { name:"Astralthrone Berserker III", hp:93950, atk:4885, def:1600, skill:"Double Strike L3" },
    { name:"Astralthrone Warlock III", hp:70540, atk:4134, def:1363, skill:"AOE Defense Buff L3" }
  ],
  139: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord IV", hp:286240, atk:9532, def:2862, skill:"AOE Attack L3" },
    { name:"Astralthrone Berserker IV", hp:95320, atk:4957, def:1623, skill:"Bomb L3" },
    { name:"Astralthrone Warlock IV", hp:71560, atk:4194, def:1382, skill:"Cleanse L3" }
  ],
  140: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord V", hp:290370, atk:9669, def:2904, skill:"Berserk Mode L3" },
    { name:"Astralthrone Berserker V", hp:96690, atk:5028, def:1647, skill:"Critical L3" },
    { name:"Astralthrone Warlock V", hp:72590, atk:4254, def:1403, skill:"AOE Heal L3" }
  ],
  141: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord VI", hp:294540, atk:9808, def:2945, skill:"Power Strike L3" },
    { name:"Astralthrone Berserker VI", hp:98080, atk:5100, def:1670, skill:"Piercing Shot L3" },
    { name:"Astralthrone Warlock VI", hp:73640, atk:4316, def:1422, skill:"Heal L3" }
  ],
  142: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord VII", hp:298730, atk:9948, def:2987, skill:"AOE Attack L3" },
    { name:"Astralthrone Berserker VII", hp:99480, atk:5173, def:1694, skill:"Double Strike L3" },
    { name:"Astralthrone Warlock VII", hp:74680, atk:4377, def:1443, skill:"Defense Buff L3" }
  ],
  143: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord VIII", hp:302950, atk:10088, def:3030, skill:"Berserk Mode L3" },
    { name:"Astralthrone Berserker VIII", hp:100880, atk:5246, def:1718, skill:"Bomb L3" },
    { name:"Astralthrone Warlock VIII", hp:75740, atk:4439, def:1463, skill:"AOE Defense Buff L3" }
  ],
  144: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord IX", hp:307200, atk:10230, def:3072, skill:"Power Strike L3" },
    { name:"Astralthrone Berserker IX", hp:102300, atk:5320, def:1742, skill:"Critical L3" },
    { name:"Astralthrone Warlock IX", hp:76800, atk:4501, def:1484, skill:"Cleanse L3" }
  ],
  145: [ // บัลลังก์จักรวาล
    { name:"Astralthrone Overlord X", hp:311490, atk:10373, def:3115, skill:"AOE Attack L3" },
    { name:"Astralthrone Berserker X", hp:103730, atk:5394, def:1766, skill:"Piercing Shot L3" },
    { name:"Astralthrone Warlock X", hp:77870, atk:4564, def:1505, skill:"Time Stop L3" }
  ],
};
// ============================================================
// โหลดได้ทั้ง client (<script>, กลายเป็น global ตามเดิม) และ server
// (require('.../public/stages/n-stages')) — เพิ่มตอนย้าย battle resolution
// ไปรันที่เซิฟ (server/battle/*) จะได้ใช้ STAGE ชุดเดียวกับที่ client แสดงผล
// ไม่ต้องคัดลอกข้อมูล 145 ด่านไปไว้อีกที่ (เสี่ยงข้อมูลสองชุดไม่ตรงกัน)
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STAGES };
}
