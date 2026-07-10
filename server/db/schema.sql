-- schema.sql — run once via `npm run migrate`

CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  team_id       UUID,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- NORMAL mode lets the player pick any unlocked stage directly (not a continuous run),
-- so we just track each player's best validated stage, like the unlockedStage in localStorage
-- but server-side and order-checked.
CREATE TABLE IF NOT EXISTS normal_progress (
  player_id     UUID PRIMARY KEY REFERENCES players(id),
  max_stage     INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- A "run" = one attempt at NORMAL or INF mode, server-tracked from start to finish
CREATE TABLE IF NOT EXISTS runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id),
  mode            TEXT NOT NULL CHECK (mode IN ('normal', 'inf', 'realtime')),
  token           UUID NOT NULL,              -- single-use auth token for this run's stage events
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  max_stage       INT NOT NULL DEFAULT 0,      -- server-tracked, NOT client-reported
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished','flagged','expired')),
  flag_reason     TEXT
);

-- One row per stage cleared, written by server when client reports a clear (and passes sanity checks)
CREATE TABLE IF NOT EXISTS run_stage_events (
  id              BIGSERIAL PRIMARY KEY,
  run_id          UUID NOT NULL REFERENCES runs(id),
  stage           INT NOT NULL,
  server_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_elapsed_ms INT,                       -- reported but only used for cross-check, never trusted alone
  UNIQUE(run_id, stage)
);

-- Final leaderboard-ready summary, one row per finished run
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID NOT NULL REFERENCES runs(id),
  player_id     UUID NOT NULL REFERENCES players(id),
  team_id       UUID,
  mode          TEXT NOT NULL,
  max_stage     INT NOT NULL,
  time_ms       INT NOT NULL,                  -- server-measured (finished_at - started_at)
  score         INT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_mode_stage ON leaderboard_entries (mode, max_stage DESC, time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_runs_player ON runs (player_id);

-- ============================================================================
-- Economy (server-authoritative money/bag/deck) + PIN auth
-- Added when moving money/rewards/drops/shop/gacha off the client.
-- ============================================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS session_token UUID;

-- Sessions previously never expired once issued (session_token had no TTL at all —
-- a leaked token stayed valid forever). Every login/register now sets this to
-- now() + 30 days; requireAuth rejects tokens past this point.
ALTER TABLE players ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

-- Google Sign-In: players who log in with Google never set a PIN (pin_hash stays NULL).
-- google_id is Google's stable "sub" claim, unique per Google account.
ALTER TABLE players ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- allow 'boss' as a run mode too (boss fights now get server-tracked like normal/inf)
ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_mode_check;
ALTER TABLE runs ADD CONSTRAINT runs_mode_check CHECK (mode IN ('normal', 'inf', 'boss', 'realtime'));
ALTER TABLE runs ADD COLUMN IF NOT EXISTS boss_id TEXT;

CREATE TABLE IF NOT EXISTS player_economy (
  player_id       UUID PRIMARY KEY REFERENCES players(id),
  money           BIGINT NOT NULL DEFAULT 400 CHECK (money >= 0),
  bag             JSONB NOT NULL DEFAULT '{}',
  deck            JSONB NOT NULL DEFAULT '[]',
  last_normal_claim_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Equipment gacha + equip status system (was 100% client-side / localStorage["equipBag"]):
-- server now owns the equipment bag the same way it owns `deck`. Items equipped onto a
-- card live inside that card's `equips` array inside `deck` (unchanged shape from before),
-- so equip/unequip only ever needs to move an item between `equip_bag` and `deck[i].equips`.
ALTER TABLE player_economy ADD COLUMN IF NOT EXISTS equip_bag JSONB NOT NULL DEFAULT '[]';

-- Equip-gacha "auto-discard" blacklist (list of item names). Used to live only in
-- localStorage["equip_gacha_blacklist"] on whichever browser/device set it, which
-- meant it silently didn't apply on a different device or after clearing site data —
-- items the player thought were blacklisted could still land in equip_bag. Now
-- server-persisted like everything else in this table.
ALTER TABLE player_economy ADD COLUMN IF NOT EXISTS equip_blacklist JSONB NOT NULL DEFAULT '[]';

-- Character-gacha "auto-discard" blacklist (list of character names). This one was
-- never actually wired up server-side at all (see routes/economy.js gacha/roll —
-- the old TODO comment there): every rolled card, blacklisted or not, was pushed
-- straight into `deck`. The client's ❌ tick was cosmetic-only and the
-- "sell blacklisted cards after reveal" code never ran because nothing ever set
-- `_blacklisted` on the results it checked. Now enforced server-side like equip_blacklist.
ALTER TABLE player_economy ADD COLUMN IF NOT EXISTS gacha_blacklist JSONB NOT NULL DEFAULT '[]';

-- One row per reward payout. Prevents an INF/boss stage from being paid out twice
-- (e.g. client retries the claim call after a slow/dropped response).
CREATE TABLE IF NOT EXISTS reward_claims (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID NOT NULL REFERENCES players(id),
  run_id        UUID REFERENCES runs(id),
  mode          TEXT NOT NULL,
  stage         INT NOT NULL,
  money_awarded BIGINT NOT NULL DEFAULT 0,
  items_awarded JSONB,
  claimed_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (run_id, stage)
);

-- One shop lineup shared by everyone for a given time window (cycle), server-generated.
CREATE TABLE IF NOT EXISTS shop_cycles (
  cycle       BIGINT PRIMARY KEY,
  cards       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_purchases (
  id              BIGSERIAL PRIMARY KEY,
  player_id       UUID NOT NULL REFERENCES players(id),
  cycle           BIGINT NOT NULL,
  slot_index      INT NOT NULL,
  price_paid      BIGINT NOT NULL,
  purchased_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (player_id, cycle, slot_index)
);

-- How the purchase was paid — 'money' (price_paid, existing behaviour) or 'shard'
-- (memory-fragment exchange, see routes/economy.js POST /shop/buy-with-shard).
-- Needed so the "one card per rarity per cycle" lock (ported from the old client's
-- shop_locked[] in localStorage) can be enforced across BOTH payment paths.
ALTER TABLE shop_purchases ADD COLUMN IF NOT EXISTS paid_with TEXT NOT NULL DEFAULT 'money';
ALTER TABLE shop_purchases DROP CONSTRAINT IF EXISTS shop_purchases_paid_with_check;
ALTER TABLE shop_purchases ADD CONSTRAINT shop_purchases_paid_with_check CHECK (paid_with IN ('money', 'shard'));
ALTER TABLE shop_purchases ADD COLUMN IF NOT EXISTS shard_key TEXT;
ALTER TABLE shop_purchases ADD COLUMN IF NOT EXISTS shard_qty BIGINT NOT NULL DEFAULT 0;

-- ============================================================================
-- Admin console: public-facing player ID, account status, mailbox
-- ============================================================================

-- Human-shareable 15-char ID (letters+digits) shown on the account page, separate
-- from the internal UUID `players.id` so nothing that already references player_id
-- has to change. Generated once at account-creation time (see routes/auth.js /
-- routes/players.js) and backfilled for existing rows by db/backfill-public-id.js.
ALTER TABLE players ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- Account status the admin console can set. 'suspended' blocks login/API access
-- (see middleware/auth.js); 'banned' is the same but intended as the permanent form.
ALTER TABLE players ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_status_check;
ALTER TABLE players ADD CONSTRAINT players_status_check CHECK (status IN ('active', 'suspended', 'banned'));

-- Detail behind a 'suspended'/'banned' status, set by the admin console (see
-- routes/admin.js PATCH /players/:id) and shown to the player on login (see
-- middleware/auth.js + routes/auth.js). A ban has no suspended_until (stays
-- in effect until an admin manually sets status back to 'active'); a timed
-- suspension is lifted automatically — no cron job — the next time the
-- account is touched (login or any authenticated call) once suspended_until
-- has passed. See db/accountStatus.js.
ALTER TABLE players ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- Achievement badges the player has chosen to display on their account page
-- (see game-data/badges-data.js). Always a JSON array of at most
-- MAX_EQUIPPED_BADGES badge keys — which badges are actually UNLOCKED is
-- never stored, only derived live from real stats (routes/players.js GET
-- /api/players/badges), so this column can only ever hold keys the player
-- legitimately earned at the time they equipped them.
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_badges JSONB NOT NULL DEFAULT '[]';

-- Profile cosmetics: "ปก" (avatar icon) + "กรอบปก" (avatar frame) shown on the
-- account page and anywhere else a player's profile is displayed.
-- (see game-data/cosmetics-data.js)
--   avatar_icon     — freely choosable, always a key from AVATAR_CATALOG.
--   equipped_frame  — at most ONE frame at a time, NULL = no frame equipped.
--                      Must be a key the player has either unlocked via
--                      achievement (derived live from stats, same pattern as
--                      badges) OR owns outright (see owned_frames below).
--   owned_frames    — frames bought with contribution points in the guild
--                      shop (game-data/guild-data.js GUILD_SHOP_CATALOG
--                      rewardFrameKey items). Unlike achievement frames these
--                      ARE stored, since owning one is a one-time purchase,
--                      not something re-derivable from current stats — a
--                      player who leaves the guild that sold it still keeps it.
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_icon TEXT NOT NULL DEFAULT 'shield';
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped_frame TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS owned_frames JSONB NOT NULL DEFAULT '[]';

-- Guest/temporary accounts: created via POST /api/auth/guest, no username/PIN chosen
-- by the player, no way to recover the account if local storage is cleared (see
-- routes/auth.js). Can't join/create guilds or add/be-added-as friends (routes/guilds.js,
-- routes/players.js) — only admins can see who's a guest (routes/admin.js).
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;

-- Admin/cheat account flag — ticked from the hidden admin console (see
-- routes/admin.js PATCH /players/:id/admin-status, and the checkbox in
-- public/pages/admin-251029.html). While true, the account is kept
-- topped-up with every admin privilege (unlimited money, unlimited bag
-- resources, every stage unlocked, one of every character already maxed,
-- one of every legendary equip item, equipping never consumes inventory)
-- on every authenticated request — see db/adminPrivileges.js. Turning it
-- back off just stops future top-ups; it does not claw anything back.
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Last time this player made an authenticated request (see middleware/auth.js).
-- Used to show an "online" / "offline for X" indicator on the friends and
-- guild-members lists — not a precise presence system, just a cheap proxy.
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- One row per mail. A mail can carry money and/or one bag currency as a reward;
-- the player claims it from the mailbox popup, which credits player_economy the
-- same server-authoritative way every other reward path does (see routes/mailbox.js).
CREATE TABLE IF NOT EXISTS mailbox (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID NOT NULL REFERENCES players(id),
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  reward_money  BIGINT NOT NULL DEFAULT 0 CHECK (reward_money >= 0),
  reward_bag_key TEXT,          -- one of the known bag currency keys, or NULL
  reward_bag_qty BIGINT NOT NULL DEFAULT 0 CHECK (reward_bag_qty >= 0),
  sent_by       TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ DEFAULT now(),
  read_at       TIMESTAMPTZ,
  claimed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mailbox_player ON mailbox (player_id, created_at DESC);

-- Character/equipment gifting from the admin console. Stores just the *template*
-- (character name from CHARACTER_DB, or the equip pool template fields) — the
-- actual deck/equip_bag entry (with its own id/level/stars) is only minted at
-- claim time in routes/mailbox.js, same pattern as every other reward path that
-- mints ids on grant rather than on admin-send.
ALTER TABLE mailbox ADD COLUMN IF NOT EXISTS reward_card JSONB;
ALTER TABLE mailbox ADD COLUMN IF NOT EXISTS reward_equip JSONB;

-- ============================================================================
-- INF checkpoint starts: pick "start at stage 25/50/..." only if that stage was
-- already cleared in some past run. Mirrors normal_progress but for INF mode.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inf_progress (
  player_id     UUID PRIMARY KEY REFERENCES players(id),
  max_stage     INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Baseline max_stage the run began at (0 for a normal from-stage-1 run, or
-- checkpoint-1 when starting mid-way). Needed so the anti-cheat "elapsed time"
-- check only counts stages actually fought in THIS run, not stages skipped by
-- starting at a checkpoint.
ALTER TABLE runs ADD COLUMN IF NOT EXISTS start_stage INT NOT NULL DEFAULT 0;

-- ============================================================================
-- Admin reclaim (claw-back) system
-- Lets the admin console pull money / a bag currency / a character / a piece of
-- equipment back off a player (e.g. undoing a cheat or a mail sent by mistake).
-- ============================================================================

-- Money used to be CHECK'd >= 0, which is right for every *player-initiated*
-- change but wrong for admin reclaims: if the admin reclaims more than the
-- player currently has (already spent it), the balance must be allowed to go
-- negative ("debt") instead of the reclaim silently doing nothing. Every
-- money-spending route in routes/economy.js already rejects a purchase once
-- `money < cost`, so a negative balance can only ever be earned back up to
-- zero — never spent further into the red. bag (JSONB) never had a matching
-- per-key CHECK, so no schema change is needed there for the same reasoning
-- to apply to shard/memory currencies.
ALTER TABLE player_economy DROP CONSTRAINT IF EXISTS player_economy_money_check;

-- ============================================================================
-- PvP Ranked Arena ("สมรภูมิจัดอันดับ"): async attack-a-snapshot-defense-team
-- ladder. No live matchmaking/sockets needed — battles reuse the same
-- turn-based server engine (battle/engine.js) as PvE, just run start-to-finish
-- in one request against the opponent's saved defense team. Seasonal (default
-- 30 days), Elo-style rating -> tier/division, end-of-season mailbox rewards.
-- See routes/pvp.js + game-data/pvp-data.js.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pvp_seasons (
  id                      BIGSERIAL PRIMARY KEY,
  season_number           INT NOT NULL UNIQUE,
  status                  TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  duration_days           INT NOT NULL DEFAULT 30,
  starts_at               TIMESTAMPTZ,
  ends_at                 TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  rewards_distributed_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- One row per player per season — rating resets each season (a fresh row is
-- created lazily the first time a player touches PvP that season; see
-- ensureRatingRow in routes/pvp.js). Lifetime-best rating lives on
-- players.pvp_best_rating_lifetime instead (see further below), since this
-- table's rows don't survive past their season.
CREATE TABLE IF NOT EXISTS pvp_ratings (
  season_id     BIGINT NOT NULL REFERENCES pvp_seasons(id),
  player_id     UUID NOT NULL REFERENCES players(id),
  rating        INT NOT NULL DEFAULT 1000,
  wins          INT NOT NULL DEFAULT 0,
  losses        INT NOT NULL DEFAULT 0,
  win_streak    INT NOT NULL DEFAULT 0,
  best_streak   INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (season_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_pvp_ratings_season_rating ON pvp_ratings (season_id, rating DESC);

-- Defense team persists across seasons (unlike rating) — references cards by
-- id in the player's own server-owned deck (player_economy.deck), same as
-- battle/team-builder.js does for PvE.
CREATE TABLE IF NOT EXISTS pvp_defense (
  player_id   UUID PRIMARY KEY REFERENCES players(id),
  card_ids    JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Daily attack-ticket usage, one row per player per calendar day (UTC —
-- CURRENT_DATE under the DB's timezone, which Railway/Postgres defaults to UTC).
CREATE TABLE IF NOT EXISTS pvp_daily (
  player_id     UUID NOT NULL REFERENCES players(id),
  day           DATE NOT NULL DEFAULT CURRENT_DATE,
  attacks_used  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, day)
);

-- One row per resolved attack — both sides' rating before/after plus the full
-- round-by-round log, so either side can look back at what happened (attacker
-- sees it as "battle history", defender sees it as "who attacked me").
CREATE TABLE IF NOT EXISTS pvp_battles (
  id                      BIGSERIAL PRIMARY KEY,
  season_id               BIGINT NOT NULL REFERENCES pvp_seasons(id),
  attacker_id             UUID NOT NULL REFERENCES players(id),
  defender_id             UUID NOT NULL REFERENCES players(id),
  win                     BOOLEAN NOT NULL,
  attacker_rating_before  INT NOT NULL,
  attacker_rating_after   INT NOT NULL,
  defender_rating_before  INT NOT NULL,
  defender_rating_after   INT NOT NULL,
  log                     JSONB NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_attacker ON pvp_battles (attacker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_defender ON pvp_battles (defender_id, created_at DESC);

-- Frozen final standing per player per season, written once when a season
-- ends (see finalizeSeason in routes/pvp.js). This — not pvp_ratings, which
-- gets reset for the next season — is the source of truth for season-end
-- mailbox rewards AND the "was ever season champion" badge check.
CREATE TABLE IF NOT EXISTS pvp_season_history (
  season_id       BIGINT NOT NULL REFERENCES pvp_seasons(id),
  player_id       UUID NOT NULL REFERENCES players(id),
  final_rank      INT NOT NULL,
  final_rating    INT NOT NULL,
  tier_key        TEXT NOT NULL,
  wins            INT NOT NULL DEFAULT 0,
  losses          INT NOT NULL DEFAULT 0,
  reward_mail_id  BIGINT REFERENCES mailbox(id) ON DELETE SET NULL,
  PRIMARY KEY (season_id, player_id)
);

-- Lifetime-best rating ever reached across all seasons — needed because
-- pvp_ratings resets every season. Feeds the PvP achievement badges
-- (game-data/badges-data.js, category 'rank').
ALTER TABLE players ADD COLUMN IF NOT EXISTS pvp_best_rating_lifetime INT NOT NULL DEFAULT 0;

-- One row per admin reclaim action — both the audit trail the console's
-- "เรียกคืน" tab reads back (so admin can see what's already been clawed back
-- from a given player) and the source mail that told the player about it.
-- ON DELETE SET NULL on mail_id: routes/admin.js DELETE /players/:id wipes a
-- player's mailbox and their admin_reclaims rows in the same transaction, and
-- either one may run first, so the FK can't require the mail to still exist.
CREATE TABLE IF NOT EXISTS admin_reclaims (
  id                  BIGSERIAL PRIMARY KEY,
  player_id           UUID NOT NULL REFERENCES players(id),
  kind                TEXT NOT NULL CHECK (kind IN ('money', 'bag', 'card', 'equip')),
  label               TEXT NOT NULL,               -- human-readable summary, e.g. "ซามูไร × 2"
  qty_requested       NUMERIC NOT NULL DEFAULT 1,   -- money/bag: amount asked for. card/equip: count asked for.
  qty_taken           NUMERIC NOT NULL DEFAULT 0,   -- card/equip only: how many instances were actually removed from inventory
  went_negative       BOOLEAN NOT NULL DEFAULT false,
  converted_to_money  BOOLEAN NOT NULL DEFAULT false, -- true if a card/equip shortfall was billed as money instead
  money_deducted      BIGINT NOT NULL DEFAULT 0,
  note                TEXT,
  mail_id             BIGINT REFERENCES mailbox(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_reclaims_player ON admin_reclaims (player_id, created_at DESC);

-- ============================================================================
-- Friends (simple, no requests/accept-flow — adding someone makes you friends
-- with each other immediately, one row per direction so "my friends" is a
-- plain lookup by player_id on either side).
-- ============================================================================

CREATE TABLE IF NOT EXISTS friendships (
  player_id     UUID NOT NULL REFERENCES players(id),
  friend_id     UUID NOT NULL REFERENCES players(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (player_id, friend_id),
  CHECK (player_id != friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_player ON friendships (player_id, created_at DESC);

-- Friend requests: sending a request no longer makes two players friends right
-- away — the receiver has to accept it first (reject just closes it out, and
-- either side can re-request later since only 'pending' rows are unique).
CREATE TABLE IF NOT EXISTS friend_requests (
  id            BIGSERIAL PRIMARY KEY,
  sender_id     UUID NOT NULL REFERENCES players(id),
  receiver_id   UUID NOT NULL REFERENCES players(id),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  CHECK (sender_id != receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests (sender_id, status);
-- Only one PENDING request per direction at a time (old accepted/rejected rows
-- don't block a fresh request — e.g. after unfriending, or after a rejection).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_friend_request ON friend_requests (sender_id, receiver_id) WHERE status = 'pending';

-- ============================================================================
-- Helper / assist character system ("ระบบขอความช่วยเหลือ").
-- Each player can designate ONE of their own deck cards as a lendable helper.
-- A friend can request it — the requester instantly gets a COPY of that card
-- pushed into their own deck for 12 hours, then it's auto-removed. Asking the
-- SAME friend again is on a 24h cooldown, counted from the moment the request
-- button was pressed (a different friend can be asked immediately).
-- ============================================================================

-- Which of the lender's own deck cards (by id, matched live against
-- player_economy.deck) is currently flagged as their helper. Looked up live
-- rather than snapshotted, so upgrades/star-ups the lender makes show up
-- immediately in what friends preview/borrow — a snapshot is only taken at
-- the moment someone actually borrows it (see helper_loans below).
CREATE TABLE IF NOT EXISTS player_helpers (
  player_id     UUID PRIMARY KEY REFERENCES players(id),
  card_id       TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- One row per borrow, past or present. borrowed_card_id is the id minted for
-- the COPY pushed into the borrower's deck (never the lender's own card id),
-- so removing it on expiry can never touch the lender's real card. Also
-- doubles as the 24h cooldown ledger for the (borrower, lender) pair.
CREATE TABLE IF NOT EXISTS helper_loans (
  id                BIGSERIAL PRIMARY KEY,
  borrower_id       UUID NOT NULL REFERENCES players(id),
  lender_id         UUID NOT NULL REFERENCES players(id),
  borrowed_card_id  TEXT NOT NULL,
  card_name         TEXT NOT NULL,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  removed_at        TIMESTAMPTZ,
  CHECK (borrower_id != lender_id)
);
CREATE INDEX IF NOT EXISTS idx_helper_loans_pair ON helper_loans (borrower_id, lender_id, granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_helper_loans_borrower_active ON helper_loans (borrower_id) WHERE removed_at IS NULL;

-- ============================================================================
-- Guilds ("กิลด์"): membership + roles, join requests/invites, guild chat,
-- donation -> contribution, a contribution-spending guild shop, and a shared
-- weekly co-op guild boss. See routes/guilds.js, db/guildHelpers.js,
-- game-data/guild-data.js.
-- ============================================================================

CREATE TABLE IF NOT EXISTS guilds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  tag                 TEXT UNIQUE NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  emblem              TEXT NOT NULL DEFAULT '🛡️',
  leader_id           UUID NOT NULL REFERENCES players(id),
  join_mode           TEXT NOT NULL DEFAULT 'apply' CHECK (join_mode IN ('open', 'apply', 'invite')),
  max_members         INT NOT NULL DEFAULT 20,
  treasury_money      BIGINT NOT NULL DEFAULT 0 CHECK (treasury_money >= 0),
  -- Lifetime sum of every donation's contribution points — never decreases,
  -- unlike a member's own contribution_balance which drains in the guild shop.
  -- This is what cross-guild ranking (GET /api/guilds/ranking) sorts by.
  total_contribution  BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guilds_ranking ON guilds (total_contribution DESC);

-- Guild leveling: exp accumulates forever (never capped, never decreases) even
-- after the guild hits the level cap, so a guild that over-farmed isn't
-- shortchanged if a future update raises GUILD_MAX_LEVEL. `level` and
-- `max_members` are a denormalized cache recomputed by grantGuildExpTx()
-- (db/guildHelpers.js) every time exp changes — read freely, never write
-- directly outside that helper (except the one-time capacity purchase).
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS exp BIGINT NOT NULL DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS extra_capacity_purchased BOOLEAN NOT NULL DEFAULT false;

-- One row per player, at most one guild each — player_id is the PK, not a
-- surrogate id, so "am I in a guild" / "which one" is always a single lookup.
CREATE TABLE IF NOT EXISTS guild_members (
  player_id             UUID PRIMARY KEY REFERENCES players(id),
  guild_id              UUID NOT NULL REFERENCES guilds(id),
  role                  TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  contribution_lifetime BIGINT NOT NULL DEFAULT 0 CHECK (contribution_lifetime >= 0),
  contribution_balance  BIGINT NOT NULL DEFAULT 0 CHECK (contribution_balance >= 0),
  boss_damage_cycle     BIGINT NOT NULL DEFAULT 0 CHECK (boss_damage_cycle >= 0),
  boss_damage_lifetime  BIGINT NOT NULL DEFAULT 0 CHECK (boss_damage_lifetime >= 0),
  joined_at             TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members (guild_id, contribution_lifetime DESC);

-- Applications for join_mode = 'apply' guilds. Leader/officer accepts or rejects.
CREATE TABLE IF NOT EXISTS guild_join_requests (
  id            BIGSERIAL PRIMARY KEY,
  guild_id      UUID NOT NULL REFERENCES guilds(id),
  player_id     UUID NOT NULL REFERENCES players(id),
  message       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  responded_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_guild_join_requests_guild ON guild_join_requests (guild_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_guild_join_request ON guild_join_requests (guild_id, player_id) WHERE status = 'pending';

-- Invites for join_mode = 'invite' guilds (leader/officer can also use this
-- as a shortcut on 'open'/'apply' guilds).
CREATE TABLE IF NOT EXISTS guild_invites (
  id            BIGSERIAL PRIMARY KEY,
  guild_id      UUID NOT NULL REFERENCES guilds(id),
  inviter_id    UUID NOT NULL REFERENCES players(id),
  invitee_id    UUID NOT NULL REFERENCES players(id),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  CHECK (inviter_id != invitee_id)
);
CREATE INDEX IF NOT EXISTS idx_guild_invites_invitee ON guild_invites (invitee_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_guild_invite ON guild_invites (guild_id, invitee_id) WHERE status = 'pending';

-- Guild chat — plain polling (no websockets in this stack). GET .../chat?afterId=
-- fetches only what's new; without it, the last 50 messages.
CREATE TABLE IF NOT EXISTS guild_chat_messages (
  id            BIGSERIAL PRIMARY KEY,
  guild_id      UUID NOT NULL REFERENCES guilds(id),
  player_id     UUID NOT NULL REFERENCES players(id),
  username      TEXT NOT NULL,   -- snapshot at send time — survives a later username change
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guild_chat_guild ON guild_chat_messages (guild_id, created_at DESC);

-- One row per donation. amount = money spent; contribution_awarded = points
-- credited (see DONATION_RATE in game-data/guild-data.js). Used to enforce
-- the rolling-24h donation count cap as well as being an audit trail.
CREATE TABLE IF NOT EXISTS guild_donations (
  id                    BIGSERIAL PRIMARY KEY,
  guild_id              UUID NOT NULL REFERENCES guilds(id),
  player_id             UUID NOT NULL REFERENCES players(id),
  amount                BIGINT NOT NULL CHECK (amount > 0),
  contribution_awarded  BIGINT NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guild_donations_player_recent ON guild_donations (player_id, created_at DESC);

-- Guild EXP actually credited for this donation (after the daily EXP cap is
-- applied) — kept separate from contribution_awarded so the daily-cap sums
-- in routes/guilds.js POST /donate stay accurate even if the
-- contribution->EXP rate ever changes. Defaults to 0 for old rows predating
-- this column, which is fine since those donations already granted their
-- EXP at the time (nothing to re-credit).
ALTER TABLE guild_donations ADD COLUMN IF NOT EXISTS guild_exp_awarded BIGINT NOT NULL DEFAULT 0;

-- One row per guild-shop redemption. `cycle` is the weekly clock from
-- currentGuildCycle() — per-item weekly purchase limits are enforced by
-- counting rows here rather than a UNIQUE constraint, since some items allow
-- more than one purchase per week.
CREATE TABLE IF NOT EXISTS guild_shop_purchases (
  id            BIGSERIAL PRIMARY KEY,
  guild_id      UUID NOT NULL REFERENCES guilds(id),
  player_id     UUID NOT NULL REFERENCES players(id),
  cycle         BIGINT NOT NULL,
  item_key      TEXT NOT NULL,
  cost          BIGINT NOT NULL,
  purchased_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guild_shop_purchases_player_cycle ON guild_shop_purchases (player_id, cycle, item_key);

-- Shared HP pool per guild, one row each, reset every week (cycle). See
-- db/guildHelpers.js ensureGuildBossStateTx for the lazy weekly rollover +
-- mailbox reward distribution (there's no cron job in this app).
CREATE TABLE IF NOT EXISTS guild_boss_state (
  guild_id      UUID PRIMARY KEY REFERENCES guilds(id),
  cycle         BIGINT NOT NULL,
  max_hp        BIGINT NOT NULL,
  current_hp    BIGINT NOT NULL,
  defeated_at   TIMESTAMPTZ,
  rewards_sent  BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- One row per attack. Damage is computed server-side from the attacker's own
-- deck (see computeBossAttackDamage in game-data/guild-data.js) — never
-- trusted from the client. attacked_at also backs the rolling-24h attempt cap.
CREATE TABLE IF NOT EXISTS guild_boss_attacks (
  id            BIGSERIAL PRIMARY KEY,
  guild_id      UUID NOT NULL REFERENCES guilds(id),
  player_id     UUID NOT NULL REFERENCES players(id),
  cycle         BIGINT NOT NULL,
  damage        BIGINT NOT NULL,
  attacked_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guild_boss_attacks_player_recent ON guild_boss_attacks (player_id, attacked_at DESC);

-- ============================================================================
-- Server-authoritative battle resolution (see server/battle/*, routes/battle.js)
-- Before this, NORMAL/BOSS/INF combat ran entirely client-side (public/js/skills/*,
-- modes/*) and the client just told the server "I won stage N" / "I dealt X damage" —
-- the server only sanity-checked timing (MIN_MS_PER_STAGE / BOSS_MAX_DPS), it never
-- actually knew whether the fight happened or who really won. One row here = one
-- in-progress or finished fight the server itself simulated, turn by turn, via
-- POST /api/battle/start then POST /api/battle/:id/turn.
-- ============================================================================
CREATE TABLE IF NOT EXISTS battle_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id),
  mode          TEXT NOT NULL CHECK (mode IN ('normal', 'boss', 'inf')),
  ref_key       TEXT NOT NULL,             -- stage number (normal/inf) or boss key (boss)
  run_id        UUID REFERENCES runs(id),  -- ties boss/inf fights into the existing runs/leaderboard tables
  round         INT NOT NULL DEFAULT 0,
  state         JSONB NOT NULL,            -- { playerTeam, enemyTeam, bossDamageDealt }
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'forfeited')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battle_sessions_player ON battle_sessions (player_id, status);

-- ============================================================================
-- Daily login streak + daily missions ("ล็อกอินรายวัน" / "ภารกิจรายวัน")
-- Both reset on the same 04:00-Thailand "game day" boundary already used by
-- the guild system (see currentGameDayStart/currentGuildCycle in
-- game-data/guild-data.js) — dayIndex here (game-data/daily-data.js
-- currentDayIndex()) is that exact same day counter, just exposed under its
-- own name in a file daily.js doesn't need to import guild-data for.
-- ============================================================================

-- One row per player. `streak` is the current consecutive-day count (resets to
-- 1 instead of continuing if a day was missed — see routes/daily.js), cycling
-- through the 7-day reward table in game-data/daily-data.js and then
-- repeating. `total_claims` never resets — lifetime login-claim counter,
-- available for a future badge the same way other lifetime stats are.
CREATE TABLE IF NOT EXISTS daily_login_state (
  player_id     UUID PRIMARY KEY REFERENCES players(id),
  streak        INT NOT NULL DEFAULT 0,
  last_claim_day INT,
  total_claims  INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- One row per (player, game day, mission). Missions are a fixed daily set
-- (game-data/daily-data.js DAILY_MISSIONS) — progress is bumped by
-- db/dailyMissions.js bumpMissionProgress() from whichever route just did the
-- matching thing (battle win, gacha roll, shop purchase, PvP attack, ...) and
-- capped server-side at each mission's target, so a claim can never be
-- double-paid past what's actually earned. mission_key '_bonus_all' is a
-- synthetic row for the "claim every mission today" bonus (see
-- routes/daily.js POST /missions/claim-bonus) — not one of DAILY_MISSIONS,
-- just reusing this table's claimed_at/UNIQUE machinery instead of a second table.
CREATE TABLE IF NOT EXISTS daily_mission_progress (
  player_id     UUID NOT NULL REFERENCES players(id),
  day_index     INT NOT NULL,
  mission_key   TEXT NOT NULL,
  progress      INT NOT NULL DEFAULT 0,
  claimed_at    TIMESTAMPTZ,
  PRIMARY KEY (player_id, day_index, mission_key)
);
CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_player_day ON daily_mission_progress (player_id, day_index);

-- One row per (player, scope, cycle, mission). Same idea as
-- daily_mission_progress above, just keyed by a longer-lived cycle instead of
-- day_index: scope 'weekly' uses game-data/guild-data.js currentGuildCycle()
-- (Sunday 04:00 Thailand), scope 'monthly' uses game-data/cycle-quest-data.js
-- currentMonthCycle() (1st-of-month 04:00 Thailand). Progress is bumped by
-- the SAME db/dailyMissions.js bumpMissionProgress() call every route
-- already makes for daily missions — see game-data/cycle-quest-data.js
-- WEEKLY_MISSIONS/MONTHLY_MISSIONS for the catalogs and
-- game-data/daily-data.js DAILY_MISSIONS for the `type`s matched against.
-- mission_key '_bonus_all' is the synthetic "claim every mission this
-- cycle" bonus row, same trick as daily_mission_progress.
CREATE TABLE IF NOT EXISTS cycle_mission_progress (
  player_id     UUID NOT NULL REFERENCES players(id),
  scope         TEXT NOT NULL CHECK (scope IN ('weekly', 'monthly')),
  cycle_index   INT NOT NULL,
  mission_key   TEXT NOT NULL,
  progress      INT NOT NULL DEFAULT 0,
  claimed_at    TIMESTAMPTZ,
  PRIMARY KEY (player_id, scope, cycle_index, mission_key)
);
CREATE INDEX IF NOT EXISTS idx_cycle_mission_progress_player_scope_cycle ON cycle_mission_progress (player_id, scope, cycle_index);

-- One row per player. Real accumulated online/foreground time, credited by
-- POST /api/players/heartbeat (routes/players.js) — see the big comment in
-- game-data/playtime-data.js for exactly how a heartbeat call is turned into
-- a number of seconds credited (server-computed elapsed-since-last-heartbeat,
-- capped, never client-supplied). Powers the premium "playtime" avatar
-- frames/badges (game-data/cosmetics-data.js / badges-data.js), which are
-- deliberately a harder-to-fake track than the simpler login-streak ones.
CREATE TABLE IF NOT EXISTS player_playtime (
  player_id            UUID PRIMARY KEY REFERENCES players(id),
  total_online_seconds BIGINT NOT NULL DEFAULT 0,
  last_heartbeat_at     TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT now()
);
