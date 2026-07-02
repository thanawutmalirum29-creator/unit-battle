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
