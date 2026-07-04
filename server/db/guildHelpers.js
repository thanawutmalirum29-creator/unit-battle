// db/guildHelpers.js — shared helpers for routes/guilds.js.
//
// Mirrors the lazy-rollover pattern already used elsewhere in this codebase
// (see routes/economy.js currentShopCycle / generateShopDeck): there's no
// cron job, so "did the week roll over?" is checked and settled the moment
// any request touches the guild boss, inside a single locked transaction.
const {
  currentGuildCycle, GUILD_BOSS_MAX_HP, rewardForBossDamage, GUILD_BOSS_DEFEAT_BONUS,
  levelForExp, computeMaxMembers,
} = require('../game-data/guild-data');

// Looks up the calling player's guild membership row (if any), joined with
// the guild itself. Returns null if the player isn't in a guild.
async function getMembership(db, playerId) {
  const { rows } = await db.query(
    `SELECT gm.*, g.name, g.tag, g.description, g.emblem, g.leader_id, g.join_mode,
            g.max_members, g.treasury_money, g.total_contribution, g.created_at AS guild_created_at,
            g.exp, g.level, g.extra_capacity_purchased
     FROM guild_members gm
     JOIN guilds g ON g.id = gm.guild_id
     WHERE gm.player_id = $1`,
    [playerId]
  );
  return rows[0] || null;
}

function isLeaderOrOfficer(role) {
  return role === 'leader' || role === 'officer';
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

module.exports = { getMembership, isLeaderOrOfficer, ensureGuildBossStateTx, grantGuildExpTx };
