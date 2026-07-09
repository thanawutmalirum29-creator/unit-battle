// server/public/js/shared/battle-math.js
//
//  รวมศูนย์: สูตรคำนวณสถานะตัวละคร/เลือกเป้าหมาย/เช็คตัวรักษา ที่แต่ก่อนถูก
// copy-paste แยกไว้ 2 จุด (ฝั่ง client: public/js/skills/Intermediaryfunction.js,
// skills/useSkill.js, skills/attack.js, core/battle.js, core/render.js
// VS ฝั่ง server (ตัวรัน battle จริง): server/battle/engine.js) ทำให้เวลาจะแก้สูตร
// ต้องแก้พร้อมกันหลายไฟล์ ถ้าลืมแก้จุดใดจุดหนึ่ง client กับ server จะคำนวณค่าไม่ตรงกัน
//
// ไฟล์นี้เขียนแบบ UMD เล็กๆ เพื่อให้ใช้ได้ทั้ง 2 ฝั่งจากซอร์สเดียวกันจริงๆ:
//   - ฝั่ง client: โหลดผ่าน <script src="/js/shared/battle-math.js"></script>
//     (ก่อนไฟล์ที่ใช้ฟังก์ชันพวกนี้) แล้วเรียกใช้เป็น global function ได้ตรงๆ
//     เหมือนเดิม (window.getFinalAtk(...) หรือ getFinalAtk(...) เฉยๆ)
//   - ฝั่ง server: require('../public/js/shared/battle-math.js') แล้ว destructure
//     ฟังก์ชันที่ต้องใช้ออกมา
//
// แก้สูตรตรงนี้ที่เดียว ทั้ง client และ server ใช้ผลลัพธ์เดียวกันเสมอ

(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    // Node / server (CommonJS)
    module.exports = mod;
  }
  if (root) {
    // Browser: ยังคง attach เป็น global function ตรงๆ เหมือนโค้ดเดิม
    // เพื่อไม่ต้องแก้จุดเรียกใช้ทั้งหมดในไฟล์อื่น
    Object.assign(root, mod);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function getFinalHp(actor) {
    const base = actor.baseHp ?? actor.hp ?? 0;

    const flatBuff = (actor.statusEffects || [])
      .filter(e => e.type === 'HpBuffFlat')
      .reduce((sum, e) => sum + e.value, 0);

    const percentBuff = (actor.statusEffects || [])
      .filter(e => e.type === 'HpBuffPercent')
      .reduce((sum, e) => sum + e.value, 0);

    return Math.floor((base + flatBuff) * (1 + percentBuff));
  }

  function getFinalAtk(actor) {
    const base = actor.baseAtk ?? actor.atk ?? 0;

    const flatBuff = (actor.statusEffects || [])
      .filter(e => e.type === 'AttackBuffFlat')
      .reduce((sum, e) => sum + e.value, 0);

    const percentBuff = (actor.statusEffects || [])
      .filter(e => e.type === 'AttackBuffPercent')
      .reduce((sum, e) => sum + e.value, 0);

    return Math.floor((base + flatBuff) * (1 + percentBuff));
  }

  function getFinalDef(actor) {
    const base = actor.baseDef ?? actor.defBase ?? actor.def ?? 0;

    const defBuffs = (actor.statusEffects || [])
      .filter(e => e.type === 'DefenseBuff')
      .map(e => e.value);
    const bestBuff = defBuffs.length > 0 ? Math.max(...defBuffs) : 0;

    const defDebuffs = (actor.statusEffects || [])
      .filter(e => e.type === 'DefenseDown')
      .map(e => e.value);
    const worstDebuff = defDebuffs.length > 0 ? Math.max(...defDebuffs) : 0;

    const finalDef = base + bestBuff + (actor.tempDef || 0) - worstDebuff;
    return Math.max(0, finalDef);
  }

  function getFinalSkillBoost(actor) {
    const boosts = (actor.statusEffects || [])
      .filter(e => e.type === 'SkillBoost')
      .map(e => e.value);

    return boosts.length > 0 ? Math.max(...boosts) : 0;
  }

  function getFinalSpeed(actor) {
    let base = actor.spd || 0;

    const speedBuffs = (actor.statusEffects || [])
      .filter(e => e.type === 'SpeedBuff')
      .map(e => e.value);

    const bestBuff = speedBuffs.length > 0 ? Math.max(...speedBuffs) : 0;

    return base + bestBuff;
  }

  function findFirstAlive(list) {
    return list.find(u => u.hp > 0) || null;
  }

  function isHealer(user) {
    const healerSkills = [
      'Heal L1', 'Heal L2', 'Heal L3',
      'AOE Heal L1', 'AOE Heal L2', 'AOE Heal L3', 'Bomb L1', 'Bomb L2', 'Bomb L3',
    ];
    return healerSkills.includes(user.baseSkill || user.skill);
  }

  function chooseTarget(user, enemies) {
    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length === 0) return null;
    switch (user.class) {
      case 'Assassin':
        return alive.reduce((low, e) => (e.maxHp < low.maxHp ? e : low));
      case 'Mage':
        return alive.reduce((high, e) => (e.def < high.def ? e : high));
      default:
        return alive[0];
    }
  }

  // คำนวณ hp/atk/def จริงของการ์ด (base + อุปกรณ์ที่ใส่ ทั้งแบบ flat และ % )
  // ใช้ทั้งฝั่ง client (โชว์สเตตัสในหน้าเด็ค/หน้าอุปกรณ์) และฝั่ง server (สร้างทีมจริง
  // ก่อนรันการต่อสู้ใน server/battle/team-builder.js) — ต้องได้ค่าตรงกันเป๊ะเสมอ
  // ไม่งั้นตัวเลขที่โชว์ในหน้าเด็คจะไม่ตรงกับสเตตัสจริงที่ใช้สู้
  function getRenderStats(card) {
    const baseHp = card.baseHp ?? card.hp ?? 0;
    const baseAtk = card.baseAtk ?? card.atk ?? 0;
    const baseDef = card.baseDef ?? card.def ?? 0;

    let hp = baseHp, atk = baseAtk, def = baseDef;
    let hpPct = 0, atkPct = 0, defPct = 0;

    (card.equips || []).forEach(eq => {
      const mode = eq.mode || 'flat'; // fallback ถ้า item เก่าไม่มี mode
      if (mode === 'percent') {
        if (eq.stat === 'hp') hpPct += eq.bonus;
        if (eq.stat === 'atk') atkPct += eq.bonus;
        if (eq.stat === 'def') defPct += eq.bonus;
      } else {
        if (eq.stat === 'hp') hp += eq.bonus;
        if (eq.stat === 'atk') atk += eq.bonus;
        if (eq.stat === 'def') def += eq.bonus;
      }
    });

    hp = Math.floor(hp * (1 + hpPct / 100));
    atk = Math.floor(atk * (1 + atkPct / 100));
    def = Math.floor(def * (1 + defPct / 100));
    return { hp, atk, def };
  }

  return {
    getFinalHp,
    getFinalAtk,
    getFinalDef,
    getFinalSkillBoost,
    getFinalSpeed,
    findFirstAlive,
    isHealer,
    chooseTarget,
    getRenderStats,
  };
});
