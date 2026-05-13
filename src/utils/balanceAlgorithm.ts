/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, DrawResult, Team, Position } from '../types';

const POSITIONS: Position[] = ['Goleiro', 'Zagueiro', 'Meia defensivo', 'Meia ofensivo', 'Atacante'];

function calculateTeamStats(players: Player[]): Team {
  const totalSkill = players.reduce((sum, p) => sum + p.skill, 0);
  const totalSpeed = players.reduce((sum, p) => sum + (p.speed || 5), 0);
  const positionCounts: Record<Position, number> = {
    Goleiro: 0,
    Zagueiro: 0,
    'Meia defensivo': 0,
    'Meia ofensivo': 0,
    Atacante: 0,
  };

  players.forEach((p) => {
    positionCounts[p.position]++;
  });

  return { players, totalSkill, totalSpeed, positionCounts };
}

function calculateDrawScore(teamA: Team, teamB: Team, topPlayers: Set<string>): number {
  // 1. Skill Difference (Extremely important)
  const skillDiff = Math.abs(teamA.totalSkill - teamB.totalSkill);
  
  // 2. Goalkeeper Equality penalty
  let goaliePenalty = 0;
  const aG = teamA.positionCounts['Goleiro'] || 0;
  const bG = teamB.positionCounts['Goleiro'] || 0;
  const totalGoalies = aG + bG;
  
  if (totalGoalies % 2 === 0) {
    // If even goalies, they must be split equally
    if (aG !== bG) goaliePenalty = 1000;
  } else {
    // If odd goalies, difference must be exactly 1
    if (Math.abs(aG - bG) !== 1) goaliePenalty = 1000;
  }

  // 3. Top players balance (Star players distribution)
  let topPlayerPenalty = 0;
  let aTop = 0;
  let bTop = 0;
  teamA.players.forEach(p => { if(topPlayers.has(p.id)) aTop++; });
  teamB.players.forEach(p => { if(topPlayers.has(p.id)) bTop++; });
  if (Math.abs(aTop - bTop) > 1) {
    topPlayerPenalty = 500;
  }

  // 4. Position Mismatch penalty
  let positionPenalty = 0;
  POSITIONS.forEach(pos => {
    if (pos === 'Goleiro') return; 
    const diff = Math.abs((teamA.positionCounts[pos] || 0) - (teamB.positionCounts[pos] || 0));
    if (diff > 1) {
      positionPenalty += diff * 20; 
    }
  });

  return (skillDiff * 50) + goaliePenalty + topPlayerPenalty + positionPenalty;
}

export function balanceTeams(players: Player[], iterations: number = 2000): DrawResult {
  let bestResult: DrawResult | null = null;
  
  // Identify top players (top 30% by skill)
  const sortedBySkill = [...players].sort((a, b) => b.skill - a.skill);
  const topCount = Math.max(2, Math.floor(players.length * 0.3));
  const topPlayers = new Set(sortedBySkill.slice(0, topCount).map(p => p.id));

  const shuffledPlayers = [...players];

  for (let i = 0; i < iterations; i++) {
    // Randomly shuffle (Fisher-Yates)
    for (let j = shuffledPlayers.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffledPlayers[j], shuffledPlayers[k]] = [shuffledPlayers[k], shuffledPlayers[j]];
    }

    // Split in two
    const mid = Math.ceil(shuffledPlayers.length / 2);
    const splitA = shuffledPlayers.slice(0, mid);
    const splitB = shuffledPlayers.slice(mid);

    const teamA = calculateTeamStats(splitA);
    const teamB = calculateTeamStats(splitB);

    const score = calculateDrawScore(teamA, teamB, topPlayers);
    const skillDiff = Math.abs(teamA.totalSkill - teamB.totalSkill);

    if (!bestResult || score < bestResult.score) {
      bestResult = { teamA, teamB, skillDiff, score };
    }

    // If we find an exceptionally good match, we can stop early
    if (score < 5) break; 
  }

  return bestResult!;
}
