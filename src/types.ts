/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Position = 'Goleiro' | 'Zagueiro' | 'Meia defensivo' | 'Meia ofensivo' | 'Atacante';

export interface Player {
  id: string;
  name: string;
  position: Position;
  secondaryPosition?: Position;
  skill: number; // 1 to 10
  speed?: number; // 1 to 10
  instagram?: string;
  isFavorite?: boolean;
  isTemporary?: boolean;
}

export interface Team {
  players: Player[];
  totalSkill: number;
  totalSpeed: number;
  positionCounts: Record<Position, number>;
}

export interface DrawResult {
  teamA: Team;
  teamB: Team;
  skillDiff: number;
  score: number;
}

export interface GameHistory {
  id: string;
  date: string;
  teamA: Team;
  teamB: Team;
  scoreA?: number;
  scoreB?: number;
  skillDiff: number;
}
