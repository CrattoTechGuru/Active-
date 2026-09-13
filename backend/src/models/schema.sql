-- Active — core relational schema
-- Run via `npm run migrate` (requires DATABASE_URL)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  stripe_connect_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  isrc TEXT,
  asset_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'live', 'rejected', 'takedown')),
  gateway_release_id TEXT,          -- id returned by SonoSuite/FUGA once submitted
  presave_link TEXT,                -- populated once distribution completes (Option 3)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Royalty splits per track (Option 1). Percentages must sum to 100 per track —
-- enforced in splitEngine.service.ts, not just here, since partial inserts
-- happen before the final collaborator confirms their share.
CREATE TABLE IF NOT EXISTS royalty_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  collaborator_artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'disputed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, collaborator_artist_id)
);

-- Stream telemetry rollups powering the Analysis dashboard
CREATE TABLE IF NOT EXISTS stream_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  streams BIGINT NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  UNIQUE (track_id, period_date)
);

-- Payout ledger (Option 2 — One-Click Cash Out via Stripe Connect)
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracks_owner ON tracks(owner_artist_id);
CREATE INDEX IF NOT EXISTS idx_splits_track ON royalty_splits(track_id);
CREATE INDEX IF NOT EXISTS idx_stats_track_date ON stream_stats(track_id, period_date);
CREATE INDEX IF NOT EXISTS idx_payouts_artist ON payouts(artist_id);
