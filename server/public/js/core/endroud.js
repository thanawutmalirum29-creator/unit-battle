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
        //  FIX v2 (ยืนยันด้วย smoke-test.js ฝั่ง server): แค่เคลียร์ justApplied อย่างเดียว
        // (ที่แก้ไว้รอบก่อน) ยังไม่พอ — TimeStop มากับ turns:1 ซึ่งโดนลดเหลือ 0 แล้วลบทิ้งทันที
        // ที่ endRoundAll ของ "รอบเดียวกับที่ร่าย" ก่อนจะถึงรอบถัดไปที่มันควรจะบล็อกจริงๆ ต้องเลื่อน
        // การนับ turns ออกไปอีก 1 รอบเฉพาะ TimeStop (ไม่แตะสถานะอื่นเพื่อไม่ให้ระยะเวลาบัพ/ดีบัฟ
        // ตัวอื่นในเกมเปลี่ยนไปจากเดิม)
        if (eff.type === "TimeStop" && eff.justApplied) {
          eff.justApplied = false;
        } else {
          eff.justApplied = false;
          eff.turns--;
        }
        if (eff.turns <= 0) {
          expired.push(eff.type);
        }
      });

      // เก็บเฉพาะที่ยังเหลือ
      actor.statusEffects = actor.statusEffects.filter(eff => eff.turns > 0);

      //  log ตอนหมด
      expired.forEach(type => {
        switch(type){
          case "DefenseBuff":
            log(`<span class=gicon-shield></span> Buff โล่หมดเวลาแล้ว`, "system");
            break;
          case "Berserk":
            log(`<span class=gicon-anger></span> Buff Berserk หมดเวลาแล้ว`, "system");
            break;
          case "SkillBoost":
            log(`<span class=gicon-sparkle></span> Buff Skill Boost หมดเวลาแล้ว`, "system");
            break;
          case "Poison":
            log(`<span class=gicon-skull></span> Debuff Poison หมดเวลาแล้ว`, "system");
            break;
          case "Burn":
            log(`<span class=gicon-fire></span> Debuff Burn หมดเวลาแล้ว`, "system");
            break;
          case "Silence":
            log(`<span class=gicon-mute></span> Debuff Silence หมดเวลาแล้ว`, "system");
            break;
          case "TimeStop":
            log(`⏳ Debuff Time Stop หมดเวลาแล้ว`, "system");
            break;
        }
      });
    }
  });

  // ⏳ ตัวยืมจากเพื่อน (ระบบขอความช่วยเหลือ) — ใช้ได้สะสมสูงสุด 20 รอบ นับรวม
  // ทุกด่าน/ทุกโหมด (ไม่รีเซ็ตเมื่อขึ้นด่านใหม่) ไม่ผูกกับเวลา 12 ชม. ที่มีอยู่แล้ว
  // — ไม่ทำในโหมด INF เพราะห้ามใช้ตัวยืมตั้งแต่ตอนเลือกทีมอยู่แล้ว (ดู inf-mode.js)
  consumeBorrowedHelperRounds();
}

function consumeBorrowedHelperRounds() {
  if (!window.GameAPI || !GameAPI.isLoggedIn || !GameAPI.isLoggedIn()) return;

  const borrowedAlive = (playerTeam || []).filter(p => p && p.hp > 0 && p.borrowed);
  borrowedAlive.forEach(p => {
    const prevLeft = Number.isFinite(p.roundsLeft) ? p.roundsLeft : 20;
    p.roundsLeft = prevLeft - 1; // optimistic local update, server has the real count

    GameAPI.consumeHelperRound(p.id, 1).then(result => {
      if (!result || result.error) return;

      if (Number.isFinite(result.roundsLeft)) p.roundsLeft = result.roundsLeft;

      if (result.removed) {
        // ครบโควตา 20 รอบแล้ว — ดึงตัวยืมออกจากสนามรบทันที (เหมือนถูกน็อค)
        p.hp = 0;
        log(`⌛ ${p.name} (ตัวยืมจาก ${p.lenderName || "เพื่อน"}) ใช้ครบ 20 รอบแล้ว ถูกดึงออกจากทีม`, "system");
        if (typeof renderBattlefield === "function") renderBattlefield();

        // เช็คเงื่อนไขแพ้ทันที เผื่อตัวที่ถูกดึงออกเป็นตัวรอดตัวสุดท้าย
        if (typeof playerTeam !== "undefined" && !playerTeam.some(x => x && x.hp > 0)) {
          if (typeof battleRunning !== "undefined") battleRunning = false;
        }

        // ซิงค์เด็คที่เหลือกลับเข้า localStorage แม้หน้านี้จะไม่ได้โหลด deck.js
        if (Array.isArray(result.deck)) {
          if (typeof applyServerDeck === "function") {
            applyServerDeck(result.deck);
          } else {
            localStorage.setItem("deck", JSON.stringify(result.deck));
            if (typeof renderDeck === "function") renderDeck();
          }
        }
      }
    });
  });
}