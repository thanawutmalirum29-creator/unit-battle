const engine = require('./engine');

function unit(o) {
  return { hp: o.hp, maxHp: o.hp, baseAtk: o.atk, baseDef: o.def, atk: o.atk, def: o.def,
    defBase: o.def, tempDef: 0, cooldown: 0, skill: o.skill || 'None', class: o.class || null,
    isEnemy: !!o.isEnemy, statusEffects: [], instanceId: o.id, name: o.name };
}

async function main() {
  const playerTeam = [
    unit({ id: 'p1', name: 'Hero1', hp: 500, atk: 60, def: 20, skill: 'Power Strike L3' }),
    unit({ id: 'p2', name: 'Hero2', hp: 400, atk: 50, def: 15, skill: 'Heal L2' }),
    unit({ id: 'p3', name: 'Hero3', hp: 350, atk: 70, def: 10, skill: 'Time Stop L2' }),
    unit({ id: 'p4', name: 'Hero4', hp: 300, atk: 40, def: 25, skill: 'Mirror L2' }),
  ];
  const enemyTeam = [
    unit({ id: 'e1', name: 'Slime', hp: 400, atk: 45, def: 10, skill: 'AOE Attack Boss', isEnemy: true, class: 'BigBoss' }),
    unit({ id: 'e2', name: 'Golem', hp: 350, atk: 35, def: 20, skill: 'Stun L2', isEnemy: true }),
  ];

  const state = { playerTeam, enemyTeam, mode: 'normal' };
  const fullLog = [];
  const ctx = {
    log: (msg, side) => fullLog.push(`[${side}] ${msg}`),
    trackDamage: () => {},
  };

  let round = 1;
  let result = { finished: false };
  while (!result.finished && round < 100) {
    fullLog.push(`--- เทิร์น ${round} ---`);
    result = await engine.runRound(state, ctx);
    round++;
  }

  console.log(fullLog.join('\n'));
  console.log('\n=== RESULT ===', result, 'rounds:', round - 1);
  console.log('player hp:', playerTeam.map(p => p.hp));
  console.log('enemy hp:', enemyTeam.map(e => e.hp));
}

main().catch(err => {
  console.error('ENGINE SMOKE TEST FAILED:', err);
  process.exit(1);
});
