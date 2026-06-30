window.skillHandlers_partSummon = {
  
  "SummonMinions": async (user, allies, enemies) => {
    if (user.hasSummoned) {
      log(`⚠️ ${user.name} ใช้ Summon ได้ครั้งเดียวต่อเกม`, "enemy");
      return normalAttack(user, enemies);
    }

    // ซัมมอนลูกน้อง 2 ตัว
    const summons = [
      { name:"ลูกน้อง 1", hp:120, maxHp:120, atk:25, defBase:10, tempDef:0,
        get def(){ return this.defBase + this.tempDef; }, isEnemy:true,
        instanceId: "SUM-"+Date.now()+"-1", skill:"None", cooldown:0, statusEffects:[], isSummon:true },
      { name:"ลูกน้อง 2", hp:120, maxHp:120, atk:25, defBase:10, tempDef:0,
        get def(){ return this.defBase + this.tempDef; }, isEnemy:true,
        instanceId: "SUM-"+Date.now()+"-2", skill:"None", cooldown:0, statusEffects:[], isSummon:true }
    ];

    // แทรกไว้ข้างหน้า user
    const idx = allies.indexOf(user);
    allies.splice(idx, 0, ...summons);

    user.hasSummoned = true;
    log(`🧟 ${user.name} ซัมมอนลูกน้อง 2 ตัวออกมา!`, "enemy");

    renderBattlefield();
    updateAllHpBars();
    setPostSkillCooldown(user, 8);
  }
,
  "Summon L1": async (user, allies, enemies) => {
    const team = user.isEnemy ? enemyTeam : playerTeam;

    // ล้าง Golem ที่ตายออก
    for (let i = team.length - 1; i >= 0; i--) {
      if (team[i].name === "Summoned Golem" && team[i].hp <= 0) {
        team.splice(i, 1);
      }
    }

    // กันซ้ำ
    const existingGolem = team.find(m => m.name === "Summoned Golem" && m.hp > 0);
    if (existingGolem) {
      log(`❌ ${user.name} มี Golem อยู่แล้ว ซัมมอนไม่ได้`, user.isEnemy ? "enemy" : "player");
      return false;
    }

    // สร้างตัวใหม่
    const summon = {
      name: "Summoned Golem",
      hp: Math.floor(user.hp * 1.01),
      maxHp: Math.floor(user.hp * 1.01),
      atk: Math.floor(user.hp * 0.08),
      def: Math.floor(user.hp * 0.05),
      defBase: Math.floor(user.hp * 0.05),
      tempDef: 0,
      cooldown: 0,
      skill: "None",
      isEnemy: user.isEnemy,
      statusEffects: [],
      instanceId: "SUMMON-" + Date.now()
    };

    const index = team.indexOf(user);
    if (index >= 0) {
      team.splice(index, 0, summon);
    } else {
      team.push(summon);
    }

    log(`🪨 ${user.name} อัญเชิญ Golem มาช่วย`, user.isEnemy ? "enemy" : "player");

    renderBattlefield();

    setTimeout(() => {
      const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
      const summonEl = document.querySelector(`[data-id="${summon.instanceId}"]`);
      playSummonEffect(casterEl, summonEl);
    }, 50);

    user.cooldown = 6;
    return true;
  },

  "Summon L2": async (user, allies, enemies) => {
    const team = user.isEnemy ? enemyTeam : playerTeam;

    for (let i = team.length - 1; i >= 0; i--) {
      if (team[i].name === "Summoned Golem" && team[i].hp <= 0) {
        team.splice(i, 1);
      }
    }

    const existingGolem = team.find(m => m.name === "Summoned Golem" && m.hp > 0);
    if (existingGolem) {
      log(`❌ ${user.name} มี Golem อยู่แล้ว ซัมมอนไม่ได้`, user.isEnemy ? "enemy" : "player");
      return false;
    }

    const summon = {
      name: "Summoned Golem",
      hp: Math.floor(user.hp * 1.01),
      maxHp: Math.floor(user.hp * 1.01),
      atk: Math.floor(user.hp * 0.0),
      def: Math.floor(user.hp * 0.05),
      defBase: Math.floor(user.hp * 0.05),
      tempDef: 0,
      cooldown: 0,
      skill: "None",
      isEnemy: user.isEnemy,
      statusEffects: [],
      instanceId: "SUMMON-" + Date.now()
    };

    const index = team.indexOf(user);
    if (index >= 0) {
      team.splice(index, 0, summon);
    } else {
      team.push(summon);
    }

    log(`🪨 ${user.name} อัญเชิญ Golem มาช่วย`, user.isEnemy ? "enemy" : "player");

    const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
    if (casterEl) {
      casterEl.classList.add("summon");
      setTimeout(() => casterEl.classList.remove("summon"), 1200);
    }

    renderBattlefield();

    setTimeout(() => {
      const newGolemEl = document.querySelector(`[data-id="${summon.instanceId}"]`);
      if (newGolemEl) {
        newGolemEl.classList.add("summoned");
        setTimeout(() => newGolemEl.classList.remove("summoned"), 1200);
      }
    }, 100);

    user.cooldown = 6;
    return true;
  },

  "Summon L3": async (user, allies, enemies) => {
    const team = user.isEnemy ? enemyTeam : playerTeam;

    for (let i = team.length - 1; i >= 0; i--) {
      if (team[i].name === "Summoned Golem" && team[i].hp <= 0) {
        team.splice(i, 1);
      }
    }

    const existingGolem = team.find(m => m.name === "Summoned Golem" && m.hp > 0);
    if (existingGolem) {
      log(`❌ ${user.name} มี Golem อยู่แล้ว ซัมมอนไม่ได้`, user.isEnemy ? "enemy" : "player");
      return false;
    }

    const summon = {
      name: "Summoned Golem",
      hp: Math.floor(user.hp * 1.02),
      maxHp: Math.floor(user.hp * 1.012),
      atk: Math.floor(user.hp * 0.09),
      def: Math.floor(user.hp * 0.055),
      defBase: Math.floor(user.hp * 0.055),
      tempDef: 0,
      cooldown: 0,
      skill: "None",
      isEnemy: user.isEnemy,
      statusEffects: [],
      instanceId: "SUMMON-" + Date.now()
    };

    const index = team.indexOf(user);
    if (index >= 0) {
      team.splice(index, 0, summon);
    } else {
      team.push(summon);
    }

    log(`🪨 ${user.name} อัญเชิญ Golem มาช่วย`, user.isEnemy ? "enemy" : "player");

    const casterEl = document.querySelector(`[data-id="${user.instanceId}"]`);
    if (casterEl) {
      casterEl.classList.add("summon");
      setTimeout(() => casterEl.classList.remove("summon"), 1200);
    }

    renderBattlefield();

    setTimeout(() => {
      const newGolemEl = document.querySelector(`[data-id="${summon.instanceId}"]`);
      if (newGolemEl) {
        newGolemEl.classList.add("summoned");
        setTimeout(() => newGolemEl.classList.remove("summoned"), 1200);
      }
    }, 100);

    user.cooldown = 6;
    return true;
  }
};