-- =============================================================================
-- Soresore — Supabase bootstrap (schema + RLS + Realtime)
-- =============================================================================
-- Run in a NEW project's SQL Editor to recreate the backend from scratch.
-- Dashboard steps (Auth, Google OAuth, env vars): docs/supabase-dashboard.md
--
-- Idempotent where possible (IF NOT EXISTS / DROP IF EXISTS on policies).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  x double precision NOT NULL DEFAULT 0,
  y double precision NOT NULL DEFAULT 1.5,
  z double precision NOT NULL DEFAULT 16,
  ry double precision NOT NULL DEFAULT 0,
  last_seen timestamptz NOT NULL DEFAULT now(),
  display_name text,
  appearance jsonb
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 140),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Indexes & constraints (players.display_name — D1)
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS players_display_name_lower_unique
  ON public.players (lower(trim(display_name)))
  WHERE display_name IS NOT NULL;

ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_display_name_length;

ALTER TABLE public.players
  ADD CONSTRAINT players_display_name_length
  CHECK (display_name IS NULL OR char_length(trim(display_name)) BETWEEN 2 AND 24);

CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Players — drop legacy policy names if re-running on an existing project
DROP POLICY IF EXISTS "Enable delete for all users" ON public.players;
DROP POLICY IF EXISTS "Enable insert for all" ON public.players;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.players;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.players;
DROP POLICY IF EXISTS "players_insert_authenticated" ON public.players;
DROP POLICY IF EXISTS "players_select_authenticated" ON public.players;
DROP POLICY IF EXISTS "players_update_authenticated" ON public.players;
DROP POLICY IF EXISTS "players_update_own_position" ON public.players;
DROP POLICY IF EXISTS "players_select_all" ON public.players;
DROP POLICY IF EXISTS "players_insert_own" ON public.players;
DROP POLICY IF EXISTS "players_update_own" ON public.players;

-- Guest (anonymous sign-in) + Google users both use JWT role `authenticated`.
-- SELECT must allow all rows — multiplayer + Realtime postgres_changes.
CREATE POLICY "players_select_all"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "players_insert_own"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "players_update_own"
  ON public.players FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Messages
DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;

CREATE POLICY "messages_select_authenticated"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- -----------------------------------------------------------------------------
-- 4. Realtime (postgres_changes)
-- -----------------------------------------------------------------------------
-- In Dashboard: Database → Publications → supabase_realtime → add `players`, `messages`
-- Or run (if publication exists):
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- -----------------------------------------------------------------------------
-- 5. Migration helpers (for existing projects)
-- -----------------------------------------------------------------------------

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS appearance jsonb;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ry double precision NOT NULL DEFAULT 0;
