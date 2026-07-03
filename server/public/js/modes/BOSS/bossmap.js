const BOSSES = {
  slime: {
    name: "Slime King",
    hp:200000,
    atk: 85,
    def: 40,
    class: "BigBoss",
    skill: "AOE Attack Boss",   // ✅ บอสสกิลพิษ
    stages: [
      { dmg: 300,  reward: { money:[50,100],  items:{ shardGray:[1,2] } } },
      { dmg: 1000,  reward: { money:[100,200], items:{ shardGray:[1,2] } } },
      { dmg: 3000, reward: { money:[200,400], items:{ shardGray:[1,2] } } },
      { dmg: 5000, reward: { money:[400,800], items:{ shardGray:[1,2] } } },
      { dmg: 10000, reward: { money:[800,1200], items:{ shardGray:[2,4] } } },
      { dmg: 13000, reward: { money:[1200,1500], items:{ shardGray:[2,4] } } },
      { dmg: 15000, reward: { money:[1500,1800], items:{ shardGray:[1,4],shardBlue:[1,1] } } },
       { dmg: 20000, reward: { money:[1800,2200], items:{ shardGray:[1,4],shardBlue:[1,1] } } },
       { dmg: 24000, reward: { money:[2200,2400], items:{ shardGray:[1,4],shardBlue:[1,2] } } },
       { dmg: 39000, reward: { money:[2400,2800], items:{ shardGray:[1,4],shardBlue:[1,3] } } },
       { dmg: 44000, reward: { money:[2800,3200], items:{ shardGray:[1,4],shardBlue:[1,4] } } },
       { dmg: 49000, reward: { money:[3200,3800], items:{ shardGray:[1,4],shardBlue:[1,5] } } },
       { dmg: 55555, reward: { money:[3800,4200], items:{ shardGray:[1,4],shardBlue:[2,3] } } },
       { dmg: 60000, reward: { money:[4200,4500], items:{ shardGray:[1,4],shardBlue:[2,4] } } },
       { dmg: 70000, reward: { money:[3800,4200], items:{ shardGray:[1,4],shardBlue:[2,4] ,shardPurple:[1,1]} } },
       { dmg: 80000, reward: { money:[3800,4200], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,2]} } },
       { dmg: 90000, reward: { money:[4200,4800], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,3]} } },
       { dmg: 100000, reward: { money:[4800,5200], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,3]} } },
       { dmg: 120000, reward: { money:[5200,5800], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[2,4]} } },
       { dmg: 130000, reward: { money:[3800,4200], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,4]
       ,shardGold:[1,1]} } },
       { dmg: 140000, reward: { money:[4200,4800], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,4]
       ,shardGold:[1,2]} } },
       { dmg: 150000, reward: { money:[4800,6000], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,4]
       ,shardGold:[1,3]} } },
       { dmg: 160000, reward: { money:[6000,8000], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,4]
       ,shardGold:[1,4]} } },
       { dmg: 170000, reward: { money:[8000,10000], items:{ shardGray:[1,4],shardBlue:[1,4] ,shardPurple:[1,4]
       ,shardGold:[2,4]} } },
       { dmg: 200000, reward: { money:[10000,20000], items:{ shardGray:[1,5],shardBlue:[1,5] ,shardPurple:[1,5]
       ,shardGold:[1,5]} } },
       
       
    ]
  },
  dragon: {
    name: "Dragon",
    hp:500000,
    atk: 110,
    def: 50,
    skill: "เพลิงมังกร",
    stages: [
      { dmg: 1000,  reward: { money:[300,500],  items:{ shardBlue:[1,2] } } },
      { dmg: 1500, reward: { money:[500,1000], items:{ shardBlue:[1,3],  } } },
     { dmg: 4000, reward: { money:[1000,1800], items:{ shardBlue:[1,4],  } } },
     { dmg: 8000, reward: { money:[1800,3000], items:{ shardBlue:[2,4],  } } },
     { dmg: 13000, reward: { money:[3000,5000], items:{ shardBlue:[1,4],shardPurple:[1,2],  } } },
     { dmg: 18000, reward: { money:[5000,10000], items:{ shardBlue:[1,4],shardPurple:[1,3],  } } },
     { dmg: 23000, reward: { money:[10000,15000], items:{ shardBlue:[1,4],shardPurple:[1,3],  } } },
     { dmg: 30000, reward: { money:[15000,23000], items:{ shardBlue:[1,4],shardPurple:[1,4],  } } },
     { dmg: 35000, reward: { money:[23000,30000], items:{ shardBlue:[1,4],shardPurple:[2,4],  } } },
     { dmg: 40000, reward: { money:[30000,40000], items:{ shardBlue:[1,4],shardPurple:[1,4],shardGold:[1,2],  } } },
     { dmg: 55555, reward: { money:[40000,50000], items:{ shardBlue:[1,4],shardPurple:[1,4],shardGold:[1,3],  } } },
     { dmg: 70000, reward: { money:[50000,80000], items:{ shardBlue:[1,4],shardPurple:[1,4],shardGold:[1,4],  } } },
     { dmg: 100000, reward: { money:[80000,110000], items:{ shardBlue:[1,4],shardPurple:[1,4],shardGold:[2,4],  } } },
      { dmg: 140000, reward: { money:[110000,150000], items:{ shardBlue:[2,5],shardPurple:[2,5],shardGold:[2,5],  } } },
      { dmg: 180000, reward: { money:[150000,200000], items:{ shardBlue:[2,6],shardPurple:[2,6],shardGold:[2,6],  } } },
      { dmg: 220000, reward: { money:[200000,500000], items:{ shardBlue:[3,6],shardPurple:[3,6],shardGold:[3,6],  } } },
      { dmg: 250000, reward: { money:[500000,1000000], items:{ shardBlue:[3,6],shardPurple:[3,6],shardGold:[3,6], shardRed:[1,2] } } },
       { dmg: 300000, reward: { money:[1000000,1400000], items:{ shardBlue:[3,6],shardPurple:[3,6],shardGold:[3,6], shardRed:[1,3] } } },
       { dmg: 350000, reward: { money:[1400000,1800000], items:{ shardBlue:[3,6],shardPurple:[3,6],shardGold:[3,6], shardRed:[1,4] } } },
       { dmg: 400000, reward: { money:[1800000,2200000], items:{ shardBlue:[3,6],shardPurple:[3,6],shardGold:[3,6], shardRed:[2,4] } } },
       { dmg: 450000, reward: { money:[2200000,2500000], items:{ shardBlue:[3,6],shardPurple:[3,6],shardGold:[3,6], shardRed:[2,5] } } },
       { dmg: 500000, reward: { money:[2500000,3000000], items:{ shardBlue:[3,6],shardPurple:[3,6],shardGold:[3,6], shardRed:[2,6] } } },
     
    ]
  },
  golem: {
    name: "Ancient Golem",
    atk: 60,
    def: 50,
    skill: "Stun L2",   // ✅ บอสสกิลสตัน
    stages: [
      { dmg: 8000,  reward: { money:[500,800],  items:{ shardGray:[3,5] } } },
      { dmg: 20000, reward: { money:[1200,1800], items:{ shardGold:[1,2] } } },
      { dmg: 40000, reward: { money:[2500,4000], items:{ shardGold:[2,3], shardRed:[1,2] } } },
    ]
  },
    เทพเจ้า: {
    name: "เทพเจ้า",
    atk: 60,
    def: 50,
    skill: "Stun L2",   // ✅ บอสสกิลสตัน
    stages: [
      { dmg: 8000,  reward: { money:[500,800],  items:{ shardGray:[3,5] } } },
      { dmg: 20000, reward: { money:[1200,1800], items:{ shardGold:[1,2] } } },
      { dmg: 40000, reward: { money:[2500,4000], items:{ shardGold:[2,3], shardRed:[1,2] } } },
    ]
  }
};

// ============================================================
// โหลดได้ทั้ง client (<script>, กลายเป็น global ตามเดิม) และ server
// (require('.../public/js/modes/BOSS/bossmap')) — server ต้องการแค่
// dmg/reward ต่อบอส (ไม่สนใจ hp/atk/def/skill ที่ใช้แสดงผลอย่างเดียว)
// จึงดึงเฉพาะ .stages ออกมาเป็น BOSS_REWARD_TIERS ให้ตรงรูปแบบเดิม
// ที่ game-data/economy-data.js เคยประกาศเองแบบก็อปมา
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  const BOSS_REWARD_TIERS = {};
  for (const key of Object.keys(BOSSES)) {
    // client shape is { dmg, reward: { money, items } } — flatten to
    // { dmg, money, items } to match what routes/economy.js expects
    // (tier.money / tier.items directly, no nested .reward).
    BOSS_REWARD_TIERS[key] = BOSSES[key].stages.map(s => ({
      dmg: s.dmg, money: s.reward.money, items: s.reward.items,
    }));
  }
  module.exports = { BOSSES, BOSS_REWARD_TIERS };
}