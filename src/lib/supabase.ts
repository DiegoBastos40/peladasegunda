import { createClient } from '@supabase/supabase-js';
import type { Player, Position, GameHistory, Team } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const dbPlayerToPlayer = (row: Record<string, unknown>): Player => ({
  id: row.id as string,
  name: row.name as string,
  position: row.position as Position,
  secondaryPosition: (row.secondary_position as Position | null) ?? undefined,
  skill: row.skill as number,
  speed: (row.speed as number | null) ?? undefined,
  instagram: (row.instagram as string | null) ?? undefined,
  isFavorite: (row.is_favorite as boolean | null) ?? false,
});

export const dbGameToHistory = (row: Record<string, unknown>): GameHistory => ({
  id: row.id as string,
  date: row.date as string,
  teamA: row.team_a as Team,
  teamB: row.team_b as Team,
  scoreA: (row.score_a as number | null) ?? undefined,
  scoreB: (row.score_b as number | null) ?? undefined,
  skillDiff: row.skill_diff as number,
});
