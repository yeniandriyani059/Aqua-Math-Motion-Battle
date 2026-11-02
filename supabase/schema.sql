-- =============================================================================
-- AQUA MATH BATTLE — SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Tabel Utama: public.aqua_battle_matches
-- =============================================================================

-- 1. Tabel hasil pertandingan sesuai struktur public.aqua_battle_matches
CREATE TABLE IF NOT EXISTS public.aqua_battle_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_code TEXT NOT NULL,
  session_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  game_mode TEXT NOT NULL CHECK (game_mode IN ('touch', 'motion')),
  game_level INTEGER NOT NULL DEFAULT 1 CHECK (game_level IN (1, 2, 3)),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  blue_score INTEGER NOT NULL DEFAULT 0 CHECK (blue_score >= 0),
  yellow_score INTEGER NOT NULL DEFAULT 0 CHECK (yellow_score >= 0),
  blue_correct INTEGER NOT NULL DEFAULT 0 CHECK (blue_correct >= 0),
  blue_wrong INTEGER NOT NULL DEFAULT 0 CHECK (blue_wrong >= 0),
  yellow_correct INTEGER NOT NULL DEFAULT 0 CHECK (yellow_correct >= 0),
  yellow_wrong INTEGER NOT NULL DEFAULT 0 CHECK (yellow_wrong >= 0),
  winner TEXT NOT NULL CHECK (winner IN ('blue', 'yellow', 'draw')),
  match_status TEXT NOT NULL CHECK (match_status IN ('in_progress', 'completed', 'finished_early')),
  match_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.aqua_battle_matches ENABLE ROW LEVEL SECURITY;

-- 3. Policy SELECT: Izinkan pembacaan riwayat pertandingan oleh role anon & authenticated
DROP POLICY IF EXISTS "Allow anon read aqua_battle_matches" ON public.aqua_battle_matches;
CREATE POLICY "Allow anon read aqua_battle_matches"
  ON public.aqua_battle_matches
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Policy INSERT: Izinkan penyimpanan hasil pertandingan baru oleh role anon & authenticated
DROP POLICY IF EXISTS "Allow anon insert aqua_battle_matches" ON public.aqua_battle_matches;
CREATE POLICY "Allow anon insert aqua_battle_matches"
  ON public.aqua_battle_matches
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(match_code) >= 4
    AND blue_score >= 0
    AND yellow_score >= 0
  );

-- 5. Policy UPDATE: Izinkan sinkronisasi ulang (upsert) oleh role anon & authenticated
DROP POLICY IF EXISTS "Allow anon update aqua_battle_matches" ON public.aqua_battle_matches;
CREATE POLICY "Allow anon update aqua_battle_matches"
  ON public.aqua_battle_matches
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    char_length(match_code) >= 4
    AND blue_score >= 0
    AND yellow_score >= 0
  );
