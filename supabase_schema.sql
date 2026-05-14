-- Run this entire script in the Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

-- ============================================================
-- PLAYERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('Goleiro', 'Zagueiro', 'Meia defensivo', 'Meia ofensivo', 'Atacante')),
  secondary_position TEXT CHECK (secondary_position IN ('Goleiro', 'Zagueiro', 'Meia defensivo', 'Meia ofensivo', 'Atacante')),
  skill INTEGER NOT NULL CHECK (skill >= 1 AND skill <= 10),
  speed INTEGER CHECK (speed >= 1 AND speed <= 10),
  instagram TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own players"
  ON players
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- GAME HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  team_a JSONB NOT NULL,
  team_b JSONB NOT NULL,
  score_a INTEGER,
  score_b INTEGER,
  skill_diff NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own games"
  ON game_history
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
