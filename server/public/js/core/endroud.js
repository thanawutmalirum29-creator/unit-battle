function endRoundAll() {
  roundCount++;

  [...playerTeam, ...enemyTeam].forEach(actor => {
    if (!actor) return;

    // ลด cooldown
    if (actor.cooldown > 0) actor.cooldown--;

    // ลด buff/debuff
    if (actor.statusEffects) {
      let expired = [];
      actor.statusEffects.forEach(eff => {
        eff.turns--;
        if (eff.turns <= 0) {
          expired.push(eff.type);
        }
      });

      // เก็บเฉพาะที่ยังเหลือ
      actor.statusEffects = actor.statusEffects.filter(eff => eff.turns > 0);

      // 🔔 log ตอนหมด
      expired.forEach(type => {
        switch(type){
          case "DefenseBuff":
            log(`🛡️ Buff โล่หมดเวลาแล้ว`, "system");
            break;
          case "Berserk":
            log(`💢 Buff Berserk หมดเวลาแล้ว`, "system");
            break;
          case "SkillBoost":
            log(`✨ Buff Skill Boost หมดเวลาแล้ว`, "system");
            break;
          case "Poison":
            log(`☠️ Debuff Poison หมดเวลาแล้ว`, "system");
            break;
          case "Burn":
            log(`🔥 Debuff Burn หมดเวลาแล้ว`, "system");
            break;
          case "Silence":
            log(`🔇 Debuff Silence หมดเวลาแล้ว`, "system");
            break;
          case "TimeStop":
            log(`⏳ Debuff Time Stop หมดเวลาแล้ว`, "system");
            break;
        }
      });
    }
  });
}