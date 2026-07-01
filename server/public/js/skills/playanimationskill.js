/* ============================================================
   🏷️ FLOATING SKILL / ATTACK LABEL + DAMAGE NUMBERS
   เดิมผู้เล่นมองไม่ออกว่าใครใช้ "สกิลอะไร" หรือ "โจมตีธรรมดา" อยู่
   (มีแค่แสงกระพริบ/สั่นตามคลาส CSS ไม่มีข้อความบอกตรงๆ) และตัวเลข
   ดาเมจก็ไม่ลอยขึ้นมาให้เห็นเลย ต้องไปอ่านใน log ข้างล่างเอา
   ฟังก์ชันด้านล่างนี้เพิ่มป้ายชื่อสกิล/ประเภทการโจมตี ลอยขึ้นเหนือ
   ตัวที่ร่าย และตัวเลข -ดาเมจ/+ฮีล ลอยขึ้นเหนือเป้าหมาย
   ============================================================ */

// 🎯 เดารูปแบบ/สีของสกิลจากชื่อ เพื่อให้ป้ายสื่อความหมายได้ไวโดยไม่ต้องแก้ข้อมูลการ์ดทุกใบ
function getSkillFxMeta(skillName) {
  const n = (skillName || "").toLowerCase();
  if (n.includes("heal") || n.includes("rebirth") || n.includes("revive") || n.includes("cleanse")) {
    return { icon: "💚", cls: "fx-heal", label: skillName };
  }
  if (n.includes("burn") || n.includes("fire") || n.includes("dragon")) {
    return { icon: "🔥", cls: "fx-fire", label: skillName };
  }
  if (n.includes("freeze") || n.includes("ice")) {
    return { icon: "❄️", cls: "fx-freeze", label: skillName };
  }
  if (n.includes("poison")) {
    return { icon: "☠️", cls: "fx-poison", label: skillName };
  }
  if (n.includes("bomb") || n.includes("aoe")) {
    return { icon: "💣", cls: "fx-aoe", label: skillName };
  }
  if (n.includes("defense") || n.includes("shield") || n.includes("buff") || n.includes("energy") || n.includes("skill boost")) {
    return { icon: "🛡️", cls: "fx-buff", label: skillName };
  }
  if (n.includes("silence") || n.includes("stun") || n.includes("timestop") || n.includes("time stop") || n.includes("charm")) {
    return { icon: "🌀", cls: "fx-debuff", label: skillName };
  }
  if (n.includes("summon")) {
    return { icon: "🔮", cls: "fx-summon", label: skillName };
  }
  if (n.includes("critical") || n.includes("pierc") || n.includes("double") || n.includes("power strike") || n.includes("hit target")) {
    return { icon: "⚔️", cls: "fx-strike", label: skillName };
  }
  return { icon: "✨", cls: "fx-skill", label: skillName };
}

// 🏷️ ป้ายลอย บอกว่ากำลังใช้ "สกิลอะไร" หรือ "โจมตีธรรมดา" เหนือหัวตัวละคร
function showActionLabel(userEl, text, cls) {
  if (!userEl) return;
  const label = document.createElement("div");
  label.className = `battle-fx-label ${cls || ""}`;
  label.textContent = text;
  userEl.appendChild(label);
  setTimeout(() => label.remove(), 950);
}

function announceSkill(user, skillName) {
  const el = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (!el) return;
  const meta = getSkillFxMeta(skillName);
  showActionLabel(el, `${meta.icon} ${meta.label}`, meta.cls);
}

function announceNormalAttack(user) {
  const el = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (!el) return;
  showActionLabel(el, "⚔️ โจมตีธรรมดา", "fx-normal");
}

// 🔢 ตัวเลขดาเมจ/ฮีล ลอยขึ้นเหนือเป้าหมาย ให้เห็นชัดว่าโดนไปเท่าไหร่ ประเภทไหน
function showFloatingNumber(targetEl, amount, kind) {
  if (!targetEl || !amount) return;
  const num = document.createElement("div");
  const isHeal = kind === "heal";
  num.className = `battle-fx-number ${isHeal ? "fx-num-heal" : "fx-num-dmg"}`;
  num.textContent = (isHeal ? "+" : "-") + Math.abs(Math.round(amount));
  targetEl.appendChild(num);
  setTimeout(() => num.remove(), 850);
}

async function playAttackAnimation(attackerEl, targetEl, attacker) {
  if (!attackerEl || !targetEl) return;

  // 🟢 เช็คอาชีพ Rogue → ใช้ projectile
  if (attacker?.class === "Rogue") {
    return playRogueAttackEffect(attackerEl, targetEl);
  }

  // 🔵 อาชีพอื่น → ใช้ animation พุ่งไปโจมตี (ระยะประชิด)
  const attackerRect = attackerEl.getBoundingClientRect();
  const targetRect   = targetEl.getBoundingClientRect();

  const dx = targetRect.left - attackerRect.left;
  const dy = targetRect.top  - attackerRect.top;

  attackerEl.style.setProperty("--dx", dx + "px");
  attackerEl.style.setProperty("--dy", dy + "px");

  const base = getBattleSpeed();        // 1500, 1200, 1000, 500
  const duration = Math.max(200, base * 0.25); 

  attackerEl.style.animationDuration = duration + "ms";
  attackerEl.classList.add("attack-moving");

  await new Promise(res => {
    attackerEl.addEventListener("animationend", res, { once: true });
  });

  attackerEl.classList.remove("attack-moving");
  attackerEl.style.removeProperty("animation-duration");
  attackerEl.style.removeProperty("--dx");
  attackerEl.style.removeProperty("--dy");
}

async function playPowerStrikeEffect(attackerEl, targetEl) {
  if (!attackerEl || !targetEl) return;

  const base = getBattleSpeed();

  // ⏱ ทั้ง charge และ impact ขึ้นกับ battle speed
  const chargeDuration = Math.max(200, base * 0.3); 
  const impactDuration = Math.max(150, base * 0.2);

  // 🌀 1) ชาร์จพลัง
  attackerEl.style.animationDuration = chargeDuration + "ms";
  attackerEl.classList.add("power-charge");

  await new Promise(res => {
    attackerEl.addEventListener("animationend", res, { once: true });
  });

  attackerEl.classList.remove("power-charge");
  attackerEl.style.removeProperty("animation-duration");

  // 💥 2) Impact ที่เป้าหมาย
  targetEl.style.animationDuration = impactDuration + "ms";
  targetEl.classList.add("power-hit");

  setTimeout(() => {
    targetEl.classList.remove("power-hit");
    targetEl.style.removeProperty("animation-duration");
  }, impactDuration);
}
async function playSummonEffect(casterEl, summonEl) {
  const base = getBattleSpeed();
  const castDuration = Math.max(300, base * 0.4);
  const appearDuration = Math.max(400, base * 0.5);

  // เอฟเฟกต์ตอน Caster ร่าย
  if (casterEl) {
    casterEl.style.animationDuration = castDuration + "ms";
    casterEl.classList.add("summon");
    setTimeout(() => {
      casterEl.classList.remove("summon");
      casterEl.style.removeProperty("animation-duration");
    }, castDuration);
  }

  // เอฟเฟกต์ตอน Creature โผล่
  if (summonEl) {
    summonEl.style.animationDuration = appearDuration + "ms";
    summonEl.classList.add("summoned");
    setTimeout(() => {
      summonEl.classList.remove("summoned");
      summonEl.style.removeProperty("animation-duration");
    }, appearDuration);
  }
}
/**
 * เอฟเฟกต์ Bomb ที่เป้าหมาย
 * @param {Array} targets - รายชื่อเป้าหมาย
 * @param {string} cssClass - คลาสเอฟเฟกต์ (bomb-hit-l1, bomb-hit-l2, bomb-hit-l3)
 */
async function playBombEffect(targets, cssClass) {
  if (!targets || targets.length === 0) return;

  const base = getBattleSpeed();
  const impactDuration = Math.max(400, base * 0.4);

  targets.forEach(t => {
    const el = document.querySelector(`[data-id="${t.instanceId}"]`);
    if (el) {
      el.style.animationDuration = impactDuration + "ms";
      el.classList.add(cssClass);

      setTimeout(() => {
        el.classList.remove(cssClass);
        el.style.removeProperty("animation-duration");
      }, impactDuration);
    }
  });

  // รอให้เอฟเฟกต์จบ
  await new Promise(res => setTimeout(res, impactDuration));
}
async function applyHeal(caster, target, amount) {
  if (!target) return;
  target.hp = Math.min(target.maxHp, target.hp + amount);

  const casterEl = document.querySelector(`[data-id="${caster.instanceId}"]`);
  const targetEl = document.querySelector(`[data-id="${target.instanceId}"]`);

  const base = getBattleSpeed();
  const castDuration = Math.max(200, base * 0.2);
  const glowDuration = Math.max(250, base * 0.3);

  if (casterEl) {
    casterEl.style.animationDuration = castDuration + "ms";
    casterEl.classList.add("heal");
    setTimeout(() => {
      casterEl.classList.remove("heal");
      casterEl.style.removeProperty("animation-duration");
    }, castDuration);
  }

  if (targetEl) {
    targetEl.style.animationDuration = glowDuration + "ms";
    targetEl.classList.add("healed");
    showFloatingNumber(targetEl, amount, "heal");
    setTimeout(() => {
      targetEl.classList.remove("healed");
      targetEl.style.removeProperty("animation-duration");
    }, glowDuration);
  }

  updateHpBar(target);
}
function playRogueAttackEffect(attackerEl, targetEl) {
  if (!attackerEl || !targetEl) return;

  const container = attackerEl.offsetParent || document.body;

  // wrapper สำหรับเคลื่อนที่
  const wrapper = document.createElement("div");
  wrapper.className = "projectile-wrapper";
  wrapper.style.position = "absolute";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  container.appendChild(wrapper);

  // actual arrow
  const projectile = document.createElement("div");
  projectile.className = "rogue-projectile";
  wrapper.appendChild(projectile);

  const attackerRect = attackerEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const startX = attackerRect.left - containerRect.left + attackerRect.width / 2;
  const startY = attackerRect.top - containerRect.top + attackerRect.height / 2;
  const endX = targetRect.left - containerRect.left + targetRect.width / 2;
  const endY = targetRect.top - containerRect.top + targetRect.height / 2;

  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // ตั้งค่า wrapper ที่จุดเริ่ม
  wrapper.style.left = startX + "px";
  wrapper.style.top = startY + "px";
  wrapper.style.transform = `translate(-50%, -50%)`;

  // หมุน arrow ตามมุม
  projectile.style.transform = `rotate(${angle}deg)`;

  const base = getBattleSpeed();
  const duration = Math.max(300, base * 0.4);
  wrapper.style.transition = `transform ${duration}ms linear`;

  // animate เคลื่อน wrapper
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      wrapper.style.transform = `translate(${dx}px, ${dy}px)`; 
    });
  });

  // ✅ ใช้ transitionend → ยิงโดนแล้วค่อยใส่เอฟเฟค
  wrapper.addEventListener("transitionend", () => {
    targetEl.classList.add("rogue-hit");
    setTimeout(() => targetEl.classList.remove("rogue-hit"), 150);
    wrapper.remove();
  }, { once: true });
}

function activateBerserk(user, multiplier) {
  user.berserk = { multiplier };

  log(`💪 ${user.name} เข้าสู่ Berserk Mode! พลังโจมตี x${multiplier}`,
      user.isEnemy ? "enemy" : "player");

  // 🟢 เอฟเฟกต์บนการ์ด
  const userEl = document.querySelector(`[data-id="${user.instanceId}"]`);
  if (userEl) {
    userEl.classList.add("berserk-mode");
    setTimeout(() => userEl.classList.remove("berserk-mode"), 1000);
  }
}