window.skillHandlers_partEF1 = {
 

  "Berserk Mode L1": async (user, allies, enemies) => {
    activateBerserk(user, 1.25);
    return normalAttack(user, enemies);
  },

  "Berserk Mode L2": async (user, allies, enemies) => {
    activateBerserk(user, 1.5);
    return normalAttack(user, enemies);
  },

  "Berserk Mode L3": async (user, allies, enemies) => {
    activateBerserk(user, 1.75);
    return normalAttack(user, enemies);
  },

  "Berserk Guardian": async (user, allies, enemies) => {
    activateBerserk(user, 2.2);
    return normalAttack(user, enemies);
  },

"Burn L1": (user, allies, enemies) => doDebuff(user, allies, enemies, { type: "Burn", multiplier: 0.5, turns: 3, level: 1 }),
"Burn L2": (user, allies, enemies) => doDebuff(user, allies, enemies, { type: "Burn", multiplier: 0.8, turns: 3, level: 2 }),
"Burn L3": (user, allies, enemies) => doDebuff(user, allies, enemies, { type: "Burn", multiplier: 1.0, turns: 3, level: 3 }),

"Poison L1": (user, allies, enemies) => doDebuff(user, allies, enemies, { type: "Poison", multiplier: 0.8, turns: 3, level: 1 }),
"Poison L2": (user, allies, enemies) => doDebuff(user, allies, enemies, { type: "Poison", multiplier: 1.0, turns: 3, level: 2 }),
"Poison L3": (user, allies, enemies) => doDebuff(user, allies, enemies, { type: "Poison", multiplier: 1.3, turns: 3, level: 3 }),
  
"Defense Buff L1": (user, allies, enemies) => doDefenseBuff(user, allies, { divisor: 5, level: 1 }),
"Defense Buff L2": (user, allies, enemies) => doDefenseBuff(user, allies, { divisor: 4, level: 2 }),
"Defense Buff L3": (user, allies, enemies) => doDefenseBuff(user, allies, { divisor: 3, level: 3 }),

"AOE Defense Buff L1": (user, allies, enemies) => doDefenseBuff(user, allies, { divisor: 6, aoe: true, level: 1 }),
"AOE Defense Buff L2": (user, allies, enemies) => doDefenseBuff(user, allies, { divisor: 5, aoe: true, level: 2 }),
"AOE Defense Buff L3": (user, allies, enemies) => doDefenseBuff(user, allies, { divisor: 4, aoe: true, level: 3 }),

"Energy Boost L1": (user, allies, enemies) => 
  doEnergyBoost(user, allies, {
    reduce: 1,
    healRatio: 0,
    logText: "(Energy Boost L1) → ลดคูลดาวน์สกิลของทีมลง 1 เทิร์น",
    selfCd: 4
  }),

"Energy Boost L2": (user, allies, enemies) => 
  doEnergyBoost(user, allies, {
    reduce: 1,
    healRatio: 0.3,
    logText: "(Energy Boost L2) → ลดคูลดาวน์ทีมลง 1 เทิร์น และฟื้นเล็กน้อย",
    selfCd: 3
  }),

"Energy Boost L3": (user, allies, enemies) => 
  doEnergyBoost(user, allies, {
    reduce: 2,
    healRatio: 0,
    logText: "(Energy Boost L3) → ลดคูลดาวน์สกิลของทีมลง 2 เทิร์น!",
    selfCd: 5
  }),
  
  "Silence L1": (user, allies, enemies) => 
  doSilence(user, [enemies.find(e => e.hp > 0)].filter(Boolean), {
    chance: 0.3,
    logText: "ทำให้เป้าหมายมีโอกาสล้มเหลวในการใช้สกิล 30% (2 เทิร์น)"
  }),

"Silence L2": (user, allies, enemies) => 
  doSilence(user, [enemies.find(e => e.hp > 0)].filter(Boolean), {
    chance: 0.4,
    logText: "ทำให้เป้าหมายมีโอกาสล้มเหลวในการใช้สกิล 40% (2 เทิร์น)"
  }),

"Silence L3": (user, allies, enemies) => 
  doSilence(user, [enemies.find(e => e.hp > 0)].filter(Boolean), {
    chance: 0.5,
    logText: "ทำให้เป้าหมายมีโอกาสล้มเหลวในการใช้สกิล 50% (2 เทิร์น)"
  }),

"AOE Silence L1": (user, allies, enemies) => 
  doSilence(user, enemies, {
    chance: 0.2,
    logText: "กดดันทั้งทีมศัตรู ลดโอกาสใช้สกิล 20% (2 เทิร์น)"
  }),

"AOE Silence L2": (user, allies, enemies) => 
  doSilence(user, enemies, {
    chance: 0.3,
    logText: "กดดันทั้งทีมศัตรู ลดโอกาสใช้สกิล 30% (2 เทิร์น)"
  }),

"AOE Silence L3": (user, allies, enemies) => 
  doSilence(user, enemies, {
    chance: 0.4,
    logText: "กดดันทั้งทีมศัตรู ลดโอกาสใช้สกิล 40% (2 เทิร์น)"
  }),
  
  "Skill Boost L1": (user, allies, enemies) => 
  doSkillBoost(user, allies, {
    value: 0.3,
    logText: "ได้รับบัพ Skill Boost (+30% อัตราใช้สกิล 3 เทิร์น)"
  }),

"Skill Boost L2": (user, allies, enemies) => 
  doSkillBoost(user, allies, {
    value: 0.4,
    logText: "ได้รับบัพ Skill Boost (+40% อัตราใช้สกิล 3 เทิร์น)"
  }),

"Skill Boost L3": (user, allies, enemies) => 
  doSkillBoost(user, allies, {
    value: 0.5,
    logText: "ได้รับบัพ Skill Boost (+50% อัตราใช้สกิล 3 เทิร์น)"
  }),
  
  "Cleanse L1": (user, allies, enemies) =>
doCleanse(user, allies, {
    logText: "(Cleanse L1) → ล้างดีบัฟทั้งหมดออกจากทีม",
    selfCd: 5
  }),
  
  "Cleanse L2": (user, allies, enemies) =>
  doCleanse(user, allies, {
    healRatio: 0.3,
    logText: "(Cleanse L2) → ล้างดีบัฟ + ฟื้นเล็กน้อย",
    selfCd: 4
  }),
  
  "Cleanse L3": (user, allies, enemies) =>
  doCleanse(user, allies, {
    healRatio: 0.6,
    resistTurns: 1,
    logText: "(Cleanse L3) → ล้างดีบัฟ + ฟื้นมากขึ้น + กันดีบัฟ 1 เทิร์น",
    selfCd: 3
  }),
  
  "Time Stop L1": (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  return doTimeStop(user, target ? [target] : [], {
    turns: 1,
    logText: "(Time Stop L1) → หยุดเวลา 1 เทิร์น",
    cd: 5
  });
},

"Time Stop L2": (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  return doTimeStop(user, target ? [target] : [], {
    turns: 1,
    logText: "(Time Stop L2) → หยุดเวลา 1 เทิร์น",
    cd: 4
  });
},

"Time Stop L3": (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  return doTimeStop(user, target ? [target] : [], {
    turns: 1,
    logText: "(Time Stop L3) → หยุดเวลา 1 เทิร์น",
    cd: 3
  });
},

"AOE Time Stop L1": (user, allies, enemies) => 
  doTimeStop(user, enemies.filter(e => e.hp > 0), {
    turns: 1,
    logText: "(AOE Time Stop L1) → ศัตรูทุกตัวหยุดเวลา 1 เทิร์น",
    cd: 7
  }),

"AOE Time Stop L2": (user, allies, enemies) => 
  doTimeStop(user, enemies.filter(e => e.hp > 0), {
    turns: 1,
    logText: "(AOE Time Stop L2) → ศัตรูทุกตัวหยุดเวลา 1 เทิร์น",
    cd: 6
  }),

"AOE Time Stop L3": (user, allies, enemies) => 
  doTimeStop(user, enemies.filter(e => e.hp > 0), {
    turns: 1,
    logText: "(AOE Time Stop L3) → ศัตรูทุกตัวหยุดเวลา 1 เทิร์น",
    cd: 5
  }),
  
    "Mirror L1": async (user, allies, enemies) => {
    addStatusEffect(user, { type: "Mirror", turns: 2, power: 0.8 }); // 80% ATK

    log(
      `🪞 ${user.name} เปิด Mirror (สวนกลับ 80% ATK ครั้งต่อไป)`,
      user.isEnemy ? "enemy" : "player"
    );

    const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
    if (userEl) {
      userEl.classList.add("mirror-on");
      setTimeout(() => userEl.classList.remove("mirror-on"), 1000);
    }

    user.cooldown = 4;
    return true;
  },

  "Mirror L2": async (user, allies, enemies) => {
    addStatusEffect(user, { type: "Mirror", turns: 1, power: 1.0 }); // 100% ATK

    log(
      `🪞 ${user.name} เปิด Mirror (สวนกลับ 100% ATK ครั้งต่อไป)`,
      user.isEnemy ? "enemy" : "player"
    );

    const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
    if (userEl) {
      userEl.classList.add("mirror-on");
      setTimeout(() => userEl.classList.remove("mirror-on"), 1000);
    }

    user.cooldown = 4;
    return true;
  },

  "Mirror L3": async (user, allies, enemies) => {
    addStatusEffect(user, { type: "Mirror", turns: 1, power: 1.2 }); // 120% ATK

    log(
      `🪞 ${user.name} เปิด Mirror (สวนกลับ 120% ATK ครั้งต่อไป)`,
      user.isEnemy ? "enemy" : "player"
    );

    const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
    if (userEl) {
      userEl.classList.add("mirror-on");
      setTimeout(() => userEl.classList.remove("mirror-on"), 1000);
    }

    user.cooldown = 4;
    return true;
  },

"Stun L1": (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  return doStun(user, target ? [target] : [], {
    turns: 1,
    dmgMultiplier: 1.3,
    logText: "(Stun L1)",
    cd: 5
  });
},

"Stun L2": (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  return doStun(user, target ? [target] : [], {
    turns: 1,
    dmgMultiplier: 1.1,
    logText: "(Stun L2)",
    cd: 5
  });
},

"Stun L3": (user, allies, enemies) => {
  const target = findFirstAlive(enemies);
  return doStun(user, target ? [target] : [], {
    turns: 1,
    dmgMultiplier: 0.9, // = dmg เพิ่มขึ้น
    logText: "(Stun L3)",
    cd: 5
  });
},

"AOE Stun L1": (user, allies, enemies) => 
  doStun(user, enemies.filter(e => e.hp > 0), {
    turns: 1,
    dmgMultiplier: 1.6,
    logText: "(AOE Stun L1)",
    cd: 6
  }),

"AOE Stun L2": (user, allies, enemies) => 
  doStun(user, enemies.filter(e => e.hp > 0), {
    turns: 1,
    dmgMultiplier: 1.4,
    logText: "(AOE Stun L2)",
    cd: 6
  }),

"AOE Stun L3": (user, allies, enemies) => 
  doStun(user, enemies.filter(e => e.hp > 0), {
    turns: 1,
    dmgMultiplier: 1.2,
    logText: "(AOE Stun L3)",
    cd: 6
  }),
};