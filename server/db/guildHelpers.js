// db/guildHelpers.js — shared helpers for routes/guilds.js.
//
// Mirrors the lazy-rollover pattern already used elsewhere in this codebase
// (see routes/economy.js currentShopCycle / generateShopDeck): there's no
// cron job, so "did the week roll over?" is checked and settled the moment
// any request touches the guild boss, inside a single locked transaction.
const {
  currentGuildCycle, GUILD_BOSS_MAX_HP, rewardForBossDamage, GUILD_BOSS_DEFEAT_BONUS,
  levelForExp, computeMaxMembers, GUILD_LEADER_RANK_POINTS, GUILD_OFFICER_RANK_POINTS,
  GUILD_BOSS_ATTACKS_PER_DAY, GUILD_EXP_PER_BOSS_DAMAGE,
} = require('../game-data/guild-data');

// Looks up the calling player's guild membership row (if any), joined with
// the guild itself AND their custom rank (if assigned) — rank_permissions
// comes back as a plain object (jsonb) or null when no rank is assigned.
// Returns null if the player isn't in a guild.
async function getMembership(db, playerId) {
  const { rows } = await db.query(
    `SELECT gm.*, g.name, g.tag, g.description, g.emblem, g.leader_id, g.join_mode,
            g.max_members, g.treasury_money, g.total_contribution, g.created_at AS guild_created_at,
            g.exp, g.level, g.extra_capacity_purchased,
            gr.name AS rank_name, gr.permissions AS rank_permissions, gr.rank_points AS rank_points
     FROM guild_members gm
     JOIN guilds g ON g.id = gm.guild_id
     LEFT JOIN guild_ranks gr ON gr.id = gm.rank_id
     WHERE gm.player_id = $1`,
    [playerId]
  );
  return rows[0] || null;
}

function isLeaderOrOfficer(role) {
  return role === 'leader' || role === 'officer';
}

// A member's own "rank points" ("แต้มยศ") for hierarchy comparisons — the
// leader and built-in officer role get fixed benchmarks (see game-data), a
// member with no custom rank has 0, and a member with a custom rank uses
// that rank's own points. Used exclusively to gate who can assign/unassign
// which ranks (see the guard below) — NOT a permission check by itself.
function rankPointsOf(membership) {
  if (!membership) return -1;
  if (membership.role === 'leader') return GUILD_LEADER_RANK_POINTS;
  if (membership.role === 'officer') return GUILD_OFFICER_RANK_POINTS;
  return membership.rank_points != null ? Number(membership.rank_points) : 0;
}

// Central permission check combining the base leader/officer/member
// hierarchy with any custom rank the member holds (see GUILD_RANK_PERMISSIONS
// in game-data/guild-data.js). The leader can always do everything. Officers
// keep exactly the powers they always had (invite, manage applications, kick
// plain members) regardless of any rank — a custom rank is how the leader
// extends those same abilities to a 'member' without a full promotion, and
// can also grant the two officer-exclusive-until-now abilities (editSettings,
// manageRanks) to anyone the leader trusts with them.
function hasGuildPermission(membership, permKey) {
  if (!membership) return false;
  if (membership.role === 'leader') return true;
  if (membership.role === 'officer' && ['invite', 'manageApplications', 'kickMembers'].includes(permKey)) {
    return true;
  }
  return !!(membership.rank_permissions && membership.rank_permissions[permKey]);
}

// Shared by routes/guilds.js (POST /disband, sole-leader /leave) and
// routes/admin.js (force-close from the console, and deleting a sole-member
// leader's account) — wipes a guild and everything that references it. Must
// be called with `client` inside an already-open transaction.
async function disbandGuildTx(client, guildId) {
  await client.query(`DELETE FROM guild_chat_messages WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_donations WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_shop_purchases WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_boss_attacks WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_boss_state WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_join_requests WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_invites WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_ranks WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guild_members WHERE guild_id = $1`, [guildId]);
  await client.query(`DELETE FROM guilds WHERE id = $1`, [guildId]);
}

// Ensures a guild_boss_state row exists for this guild and is current for
// this week's cycle. If a previous cycle is found still sitting there
// un-rewarded, distributes tier + defeat-bonus rewards via mailbox to every
// member who dealt damage that cycle, then resets for the new week.
// Must be called with `client` inside an already-open transaction, and the
// row is locked FOR UPDATE so two concurrent requests can't double-mail.
async function ensureGuildBossStateTx(client, guildId) {
  const cycle = currentGuildCycle();

  let { rows } = await client.query(
    `SELECT * FROM guild_boss_state WHERE guild_id = $1 FOR UPDATE`,
    [guildId]
  );

  if (rows.length === 0) {
    const inserted = await client.query(
      `INSERT INTO guild_boss_state (guild_id, cycle, max_hp, current_hp)
       VALUES ($1, $2, $3, $3) RETURNING *`,
      [guildId, cycle, GUILD_BOSS_MAX_HP]
    );
    return inserted.rows[0];
  }

  let state = rows[0];
  if (Number(state.cycle) < cycle) {
    await distributeBossRewardsTx(client, guildId, state);

    const updated = await client.query(
      `UPDATE guild_boss_state
       SET cycle = $2, max_hp = $3, current_hp = $3, defeated_at = NULL, rewards_sent = false, updated_at = now()
       WHERE guild_id = $1 RETURNING *`,
      [guildId, cycle, GUILD_BOSS_MAX_HP]
    );
    await client.query(
      `UPDATE guild_members SET boss_damage_cycle = 0 WHERE guild_id = $1`,
      [guildId]
    );
    state = updated.rows[0];
  }

  return state;
}

// Mails tier rewards (and the guild-wide defeat bonus, if earned) for the
// cycle that's ending, to everyone who dealt damage that cycle. Only ever
// called from inside ensureGuildBossStateTx right before the cycle resets,
// so `guild_members.boss_damage_cycle` still holds the OLD cycle's numbers.
async function distributeBossRewardsTx(client, guildId, oldState) {
  if (oldState.rewards_sent) return; // safety net against double-mailing

  const { rows: members } = await client.query(
    `SELECT player_id, boss_damage_cycle FROM guild_members WHERE guild_id = $1 AND boss_damage_cycle > 0`,
    [guildId]
  );
  const defeated = !!oldState.defeated_at;

  for (const m of members) {
    const damage = Number(m.boss_damage_cycle);
    const tier = rewardForBossDamage(damage);
    let money = tier?.money || 0;
    let bagKey = tier?.bagKey || null;
    let bagQty = tier?.bagQty || 0;

    let subject = `⚔️ ผลตอบแทนบอสกิลด์ (ดาเมจสะสม ${damage.toLocaleString()})`;
    let body = tier
      ? `คุณทำดาเมจสะสม ${damage.toLocaleString()} ให้กับบอสกิลด์ในสัปดาห์ที่ผ่านมา นี่คือของรางวัลของคุณ`
      : `ขอบคุณที่ร่วมต่อสู้กับบอสกิลด์ในสัปดาห์ที่ผ่านมา`;

    if (defeated) {
      money += GUILD_BOSS_DEFEAT_BONUS.money;
      body += `\n\n🎉 กิลด์ของคุณปราบบอสได้สำเร็จ! ได้รับโบนัสพิเศษเพิ่มเติม`;
      // If both the tier and the defeat bonus grant the same bag currency,
      // combine into a single reward_bag_qty rather than losing one of them
      // (mailbox schema only carries one bag reward per mail).
      if (bagKey && bagKey === GUILD_BOSS_DEFEAT_BONUS.bagKey) {
        bagQty += GUILD_BOSS_DEFEAT_BONUS.bagQty;
      } else if (!bagKey) {
        bagKey = GUILD_BOSS_DEFEAT_BONUS.bagKey;
        bagQty = GUILD_BOSS_DEFEAT_BONUS.bagQty;
      }
    }

    await client.query(
      `INSERT INTO mailbox (player_id, subject, body, reward_money, reward_bag_key, reward_bag_qty, sent_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'guild-boss')`,
      [m.player_id, subject, body, money, bagKey, bagQty]
    );
  }

  await client.query(`UPDATE guild_boss_state SET rewards_sent = true WHERE guild_id = $1`, [guildId]);
}

// Adds `expDelta` guild EXP (from a donation or a guild-boss hit — see
// routes/guilds.js) and keeps the denormalized `level`/`max_members` columns
// in sync in the same statement. exp itself is NEVER capped or reset, even
// past GUILD_MAX_LEVEL (see game-data/guild-data.js for why) — only the
// cached level/capacity stop climbing once the level cap is hit.
// Must be called with `client` inside an already-open transaction.
async function grantGuildExpTx(client, guildId, expDelta) {
  if (!Number.isFinite(expDelta) || expDelta <= 0) return null;

  const { rows } = await client.query(
    `UPDATE guilds SET exp = exp + $2 WHERE id = $1 RETURNING exp, level, extra_capacity_purchased`,
    [guildId, Math.round(expDelta)]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  const newExp = Number(row.exp);
  const newLevel = levelForExp(newExp);
  const leveledUp = newLevel !== row.level;

  if (leveledUp) {
    const newMaxMembers = computeMaxMembers(newLevel, row.extra_capacity_purchased);
    await client.query(
      `UPDATE guilds SET level = $2, max_members = $3 WHERE id = $1`,
      [guildId, newLevel, newMaxMembers]
    );
  }

  return { exp: newExp, level: newLevel, leveledUp, previousLevel: row.level };
}

// ---------------------------------------------------------------------------
// Guild boss — real battle flow (routes/battle.js mode==='guildboss')
//
// Replaces the old "click attack, get an instant flat-formula damage number"
// UX with an actual server-run turn-based fight against the guild's shared
// HP pool (same engine as solo Boss mode). Two calls:
//   reserveGuildBossAttackTx     — at battle start: checks eligibility (in a
//                                   guild, boss alive, under the daily cap)
//                                   and reserves one of today's attempts.
//   applyGuildBossDamageDeltaTx  — called once per turn with just THIS turn's
//                                   new damage, so the shared HP pool (and
//                                   every other guild member watching it)
//                                   updates live as the fight plays out, and
//                                   forfeiting/losing connection mid-fight
//                                   never loses damage already dealt.
// ---------------------------------------------------------------------------

async function reserveGuildBossAttackTx(client, guildId, playerId) {
  const state = await ensureGuildBossStateTx(client, guildId);
  if (Number(state.current_hp) <= 0) {
    return { error: 'บอสกิลด์ถูกปราบไปแล้วในสัปดาห์นี้ รอสัปดาห์หน้า' };
  }

  const attacksToday = await client.query(
    `SELECT COUNT(*)::int AS n FROM guild_boss_attacks WHERE player_id = $1 AND attacked_at > now() - interval '24 hours'`,
    [playerId]
  );
  if (attacksToday.rows[0].n >= GUILD_BOSS_ATTACKS_PER_DAY) {
    return { error: `โจมตีได้สูงสุด ${GUILD_BOSS_ATTACKS_PER_DAY} ครั้งต่อวัน` };
  }

  const ins = await client.query(
    `INSERT INTO guild_boss_attacks (guild_id, player_id, cycle, damage) VALUES ($1, $2, $3, 0) RETURNING id`,
    [guildId, playerId, Number(state.cycle)]
  );

  return { attackRowId: ins.rows[0].id, currentHp: Number(state.current_hp), maxHp: Number(state.max_hp) };
}

async function applyGuildBossDamageDeltaTx(client, guildId, playerId, attackRowId, delta) {
  delta = Math.max(0, Math.floor(Number(delta) || 0));
  const state = await ensureGuildBossStateTx(client, guildId); // fresh + row-locked read
  const applied = Math.min(delta, Number(state.current_hp));
  const newHp = Number(state.current_hp) - applied;

  if (applied > 0) {
    await client.query(
      `UPDATE guild_boss_state SET current_hp = $2, defeated_at = CASE WHEN $2::bigint <= 0 THEN now() ELSE defeated_at END, updated_at = now() WHERE guild_id = $1`,
      [guildId, newHp]
    );
    await client.query(
      `UPDATE guild_members SET boss_damage_cycle = boss_damage_cycle + $2, boss_damage_lifetime = boss_damage_lifetime + $2 WHERE player_id = $1`,
      [playerId, applied]
    );
    if (attackRowId) {
      await client.query(`UPDATE guild_boss_attacks SET damage = damage + $2 WHERE id = $1`, [attackRowId, applied]);
    }
  }

  const levelResult = applied > 0 ? await grantGuildExpTx(client, guildId, applied * GUILD_EXP_PER_BOSS_DAMAGE) : null;

  return {
    damageApplied: applied,
    currentHp: newHp,
    maxHp: Number(state.max_hp),
    defeated: newHp <= 0,
    guildLevel: levelResult?.level,
    leveledUp: !!levelResult?.leveledUp,
  };
}

module.exports = {
  getMembership, isLeaderOrOfficer, hasGuildPermission, rankPointsOf, disbandGuildTx, ensureGuildBossStateTx, grantGuildExpTx,
  reserveGuildBossAttackTx, applyGuildBossDamageDeltaTx,
};
