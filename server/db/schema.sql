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
