function updateHpBar(unit) {
  const el = document.querySelector(`[data-id="${unit.instanceId}"]`);
  if (!el) return;

  const hpPercent = unit.maxHp ? Math.max(0, (unit.hp / unit.maxHp) * 100) : 0;
  const green = el.querySelector(".hp-fill.green");
  const red   = el.querySelector(".hp-fill.red");

  if (green) green.style.width = `${hpPercent}%`;
  if (red) setTimeout(() => { red.style.width = `${hpPercent}%`; }, 200);

  // อัปเดตข้อความ HP (meta)
  const metas = el.querySelectorAll(".meta");
  metas.forEach(m => {
    if (m.textContent.startsWith("HP:")) {
      m.textContent = `HP: ${Math.max(0, unit.hp)} / ${unit.maxHp ?? "?"}`;
    }
  });

  unit.lastHpPercent = hpPercent;
}