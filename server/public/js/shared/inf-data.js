// server/public/js/shared/inf-data.js
//
//  รวมศูนย์: ข้อมูล/สูตรของโหมด INF (สเตตัสฐาน, สกิลฐาน, สุ่มเวอร์ชันสกิล L1-L3,
// สุ่มด่าน, สุ่มดรอปชาร์ด) ที่แต่ก่อนถูก copy-paste แยกไว้ 2 จุด:
//   - ฝั่ง client: public/js/modes/INF/inf-mode.js (มี DOM code ปนอยู่)
//   - ฝั่ง server: server/battle/inf-data.js (ก็อปเฉพาะส่วน logic ล้วนๆ มาแยก
//     เพราะรันบน Node ไม่ได้ถ้ามี DOM ปน — คอมเมนต์เดิมในไฟล์นั้นบอกตรงๆ ว่า
//     "ถ้าจะปรับสมดุล/สเกลของ INF ต้องแก้ทั้ง 2 ที่")
// จุดนี้แหละที่ทำให้ 2 ไฟล์ "หลุดไม่ตรงกัน" ไปแล้วจริงๆ ระหว่างพอร์ต: ฝั่ง client
// STAGE1_BASE_SKILLS.Trickster มีลูกน้ำเกิน (`["Poison", "Silence", , "Charm", ...]`)
// ทำให้มีสมาชิก undefined แฝงอยู่ในอาเรย์ ส่วนฝั่ง server ไม่มีบั๊กนี้ — คนละผลลัพธ์
// จากสูตรที่ควรจะ "เหมือนกัน" ไฟล์นี้ใช้เวอร์ชันที่ถูกต้อง (ไม่มีลูกน้ำเกิน) เป็นต้นฉบับเดียว
//
// ใช้แบบเดียวกับ shared/battle-math.js: โหลดผ่าน <script> ได้ฝั่ง client,
// require() ได้ฝั่ง server จากไฟล์เดียวกันจริงๆ

(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    Object.assign(root, mod);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const STAGE1_FIXED_STATS = {
    Tank: { hp: 160, atk: 18, def: 16 },
    Warrior: { hp: 120, atk: 24, def: 12 },
    Healer: { hp: 96, atk: 16, def: 10 },
    Rogue: { hp: 92, atk: 44, def: 6 },
    Summoner: { hp: 104, atk: 8, def: 6 },
    Trickster: { hp: 96, atk: 16, def: 9 },
    Assassin: { hp: 99, atk: 19, def: 5 },
    CC: { hp: 100, atk: 16, def: 9 },
    Bomb: { hp: 84, atk: 40, def: 4 },
    Mage: { hp: 88, atk: 16, def: 6 },
    Helper: { hp: 96, atk: 16, def: 9 },
  };

  // สกิลฐาน ไม่รวม L1-L3
  const STAGE1_BASE_SKILLS = {
    Tank: ['Defense Buff', 'AOE Defense Buff'],
    Warrior: ['Power Strike', 'AOE Attack', 'Mirror', 'Double Strike'],
    Healer: ['Heal', 'AOE Heal', 'Revive', 'Revive'],
    Rogue: ['Critical', 'Piercing Shot', '3 hit target'],
    Summoner: ['Summon'],
    Trickster: ['Poison', 'Silence', 'Charm', 'Blood Tribute', 'AOE Silence'],
    Assassin: ['Critical', 'Power Strike', 'Double Strike', 'Lifesteal'],
    CC: ['Stun', 'Time Stop', 'AOE Stun', 'AOE Time Stop'],
    Bomb: ['Bomb'],
    Mage: ['Burn'],
    Helper: ['Cleanse', 'Skill Boost', 'Energy Boost'],
  };

  // สุ่มเวอร์ชัน L1-L3 ตามเปอร์เซ็นต์ด่าน
  function getSkillVersion(baseSkill, percent) {
    const rand = Math.random() * 100;
    let level = 'L1';
    if (percent <= 20) {
      if (rand <= 80) level = 'L1'; else if (rand <= 95) level = 'L2'; else level = 'L3';
    } else if (percent <= 40) {
      if (rand <= 60) level = 'L1'; else if (rand <= 90) level = 'L2'; else level = 'L3';
    } else if (percent <= 60) {
      if (rand <= 40) level = 'L1'; else if (rand <= 90) level = 'L2'; else level = 'L3';
    } else if (percent <= 80) {
      if (rand <= 20) level = 'L1'; else if (rand <= 85) level = 'L2'; else level = 'L3';
    } else {
      if (rand <= 0) level = 'L1'; else if (rand <= 49) level = 'L2'; else level = 'L3';
    }
    return `${baseSkill} ${level}`;
  }

  function generateInfStage(stageNumber, teamSize = 4) {
    const enemies = [];
    const POSITION_POOLS = [
      ['Tank', 'Warrior'],
      ['Warrior', 'Assassin', 'Trickster', 'Helper', 'CC'],
      ['Rogue', 'Trickster', 'Helper', 'Bomb', 'Healer', 'Mage', 'CC'],
      ['Rogue', 'Trickster', 'Helper', 'Bomb', 'Healer', 'Mage', 'Summoner', 'CC'],
    ];
    const usedClasses = new Set();

    for (let i = 0; i < teamSize; i++) {
      const pool = POSITION_POOLS[i] || Object.keys(STAGE1_FIXED_STATS);
      const available = pool.filter(cls => !usedClasses.has(cls));
      if (available.length === 0) available.push(...pool);

      const cls = available[Math.floor(Math.random() * available.length)];
      usedClasses.add(cls);

      const base = STAGE1_FIXED_STATS[cls];
      const scale = 1 + (stageNumber - 1) * 0.05;
      const hp = Math.floor(base.hp * scale);
      const atk = Math.floor(base.atk * scale);
      const def = Math.floor(base.def * scale);

      const stagePercent = (stageNumber / 50) * 100; // ใช้สำหรับสกิล L1-L3
      const baseSkills = STAGE1_BASE_SKILLS[cls];
      const skill = getSkillVersion(baseSkills[Math.floor(Math.random() * baseSkills.length)], stagePercent);

      enemies.push({
        name: `${cls} Lv${stageNumber}`,
        class: cls,
        hp,
        atk,
        def,
        skill,
        reward: Math.floor(stageNumber * 10 + Math.random() * 10),
      });
    }
    return enemies;
  }

  const MAX_INF_STAGE = 1000;
  const INF_SHARD_TYPES = ['shardGray', 'shardBlue', 'shardPurple', 'shardGold', 'shardRed', 'shardSky'];
  const INF_SHARD_PIECE_RANGES = [
    { min: 1, max: 99, pieces: [1, 3] },
    { min: 100, max: 222, pieces: [2, 4] },
    { min: 223, max: 500, pieces: [3, 5] },
    { min: 501, max: Infinity, pieces: [4, 5] },
  ];

  function getInfShardPieceRange(stage) {
    for (const r of INF_SHARD_PIECE_RANGES) {
      if (stage >= r.min && stage <= r.max) return r.pieces;
    }
    return INF_SHARD_PIECE_RANGES[INF_SHARD_PIECE_RANGES.length - 1].pieces;
  }

  function randomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // สุ่มดรอปชาร์ดสำหรับด่าน INF หนึ่งด่าน
  function generateInfShardDrop(stage) {
    if (stage === MAX_INF_STAGE) {
      const finalDrop = {};
      INF_SHARD_TYPES.forEach(type => { finalDrop[type] = 1; });
      return finalDrop;
    }
    const [minPieces, maxPieces] = getInfShardPieceRange(stage);
    const totalPieces = randomIntInclusive(minPieces, maxPieces);
    const drop = {};
    for (let i = 0; i < totalPieces; i++) {
      const type = INF_SHARD_TYPES[Math.floor(Math.random() * INF_SHARD_TYPES.length)];
      drop[type] = (drop[type] || 0) + 1;
    }
    return drop;
  }

  return {
    STAGE1_FIXED_STATS,
    STAGE1_BASE_SKILLS,
    getSkillVersion,
    generateInfStage,
    MAX_INF_STAGE,
    INF_SHARD_TYPES,
    INF_SHARD_PIECE_RANGES,
    getInfShardPieceRange,
    randomIntInclusive,
    generateInfShardDrop,
  };
});
