/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, DrawResult, Team, Position } from '../types';

const POSITIONS: Position[] = ['Goleiro', 'Zagueiro', 'Meia defensivo', 'Meia ofensivo', 'Atacante'];

const POSITION_WEIGHTS: Record<Position, number> = {
  Goleiro: 320,
  Zagueiro: 135,
  'Meia defensivo': 105,
  'Meia ofensivo': 95,
  Atacante: 120,
};

function createEmptyPositionCounts(): Record<Position, number> {
  return {
    Goleiro: 0,
    Zagueiro: 0,
    'Meia defensivo': 0,
    'Meia ofensivo': 0,
    Atacante: 0,
  };
}

function calculateTeamStats(players: Player[]): Team {
  const totalSkill = players.reduce((sum, player) => sum + player.skill, 0);
  const totalSpeed = players.reduce((sum, player) => sum + (player.speed || 5), 0);
  const positionCounts = players.reduce((counts, player) => {
    counts[player.position] += 1;
    return counts;
  }, createEmptyPositionCounts());

  return { players, totalSkill, totalSpeed, positionCounts };
}

function getAverageSpeed(team: Team) {
  return team.totalSpeed / Math.max(team.players.length, 1);
}

function getLineCounts(team: Team) {
  return {
    defense: team.positionCounts.Goleiro + team.positionCounts.Zagueiro,
    midfield: team.positionCounts['Meia defensivo'] + team.positionCounts['Meia ofensivo'],
    attack: team.positionCounts.Atacante,
  };
}

function evaluateTeams(teamAPlayers: Player[], teamBPlayers: Player[], topPlayers: Set<string>): DrawResult {
  const teamA = calculateTeamStats(teamAPlayers);
  const teamB = calculateTeamStats(teamBPlayers);
  const score = calculateDrawScore(teamA, teamB, topPlayers);

  return {
    teamA,
    teamB,
    skillDiff: Math.abs(teamA.totalSkill - teamB.totalSkill),
    score,
  };
}

function calculateDrawScore(teamA: Team, teamB: Team, topPlayers: Set<string>): number {
  const skillDiff = Math.abs(teamA.totalSkill - teamB.totalSkill);
  const speedDiff = Math.abs(getAverageSpeed(teamA) - getAverageSpeed(teamB));
  const playerCountDiff = Math.abs(teamA.players.length - teamB.players.length);

  let goaliePenalty = 0;
  const goaliesA = teamA.positionCounts.Goleiro;
  const goaliesB = teamB.positionCounts.Goleiro;
  const totalGoalies = goaliesA + goaliesB;

  if (totalGoalies % 2 === 0) {
    goaliePenalty = goaliesA === goaliesB ? 0 : 1400;
  } else {
    goaliePenalty = Math.abs(goaliesA - goaliesB) === 1 ? 0 : 1400;
  }

  let topPlayersA = 0;
  let topPlayersB = 0;
  teamA.players.forEach((player) => {
    if (topPlayers.has(player.id)) topPlayersA += 1;
  });
  teamB.players.forEach((player) => {
    if (topPlayers.has(player.id)) topPlayersB += 1;
  });
  const topPlayerPenalty = Math.max(0, Math.abs(topPlayersA - topPlayersB) - 1) * 260;

  let positionPenalty = 0;
  POSITIONS.forEach((position) => {
    const diff = Math.abs(teamA.positionCounts[position] - teamB.positionCounts[position]);
    positionPenalty += diff * POSITION_WEIGHTS[position];
    if (diff > 1) {
      positionPenalty += (diff - 1) * POSITION_WEIGHTS[position];
    }
  });

  const linesA = getLineCounts(teamA);
  const linesB = getLineCounts(teamB);
  const linePenalty =
    Math.abs(linesA.defense - linesB.defense) * 120 +
    Math.abs(linesA.midfield - linesB.midfield) * 110 +
    Math.abs(linesA.attack - linesB.attack) * 140;

  return (
    skillDiff * 48 +
    speedDiff * 28 +
    playerCountDiff * 400 +
    goaliePenalty +
    topPlayerPenalty +
    positionPenalty +
    linePenalty
  );
}

function buildSeedTeams(players: Player[], topPlayers: Set<string>) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.skill !== a.skill) return b.skill - a.skill;
    return (b.speed || 5) - (a.speed || 5);
  });

  const targetSizeA = Math.ceil(players.length / 2);
  const targetSizeB = players.length - targetSizeA;
  const teamA: Player[] = [];
  const teamB: Player[] = [];

  sortedPlayers.forEach((player) => {
    const canGoToA = teamA.length < targetSizeA;
    const canGoToB = teamB.length < targetSizeB;

    if (!canGoToB) {
      teamA.push(player);
      return;
    }

    if (!canGoToA) {
      teamB.push(player);
      return;
    }

    const scoreIfA = evaluateTeams([...teamA, player], teamB, topPlayers).score;
    const scoreIfB = evaluateTeams(teamA, [...teamB, player], topPlayers).score;

    if (scoreIfA < scoreIfB) {
      teamA.push(player);
      return;
    }

    if (scoreIfB < scoreIfA) {
      teamB.push(player);
      return;
    }

    const skillA = teamA.reduce((sum, current) => sum + current.skill, 0);
    const skillB = teamB.reduce((sum, current) => sum + current.skill, 0);
    if (skillA <= skillB) {
      teamA.push(player);
    } else {
      teamB.push(player);
    }
  });

  return { teamA, teamB };
}

function shufflePlayers(players: Player[]) {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function optimizeTeams(
  initialTeamA: Player[],
  initialTeamB: Player[],
  topPlayers: Set<string>,
  iterations: number
) {
  let currentTeamA = [...initialTeamA];
  let currentTeamB = [...initialTeamB];
  let currentResult = evaluateTeams(currentTeamA, currentTeamB, topPlayers);
  let bestResult = currentResult;

  for (let attempt = 0; attempt < iterations; attempt += 1) {
    const nextTeamA = [...currentTeamA];
    const nextTeamB = [...currentTeamB];
    const indexA = Math.floor(Math.random() * nextTeamA.length);
    const indexB = Math.floor(Math.random() * nextTeamB.length);

    [nextTeamA[indexA], nextTeamB[indexB]] = [nextTeamB[indexB], nextTeamA[indexA]];

    const nextResult = evaluateTeams(nextTeamA, nextTeamB, topPlayers);
    const shouldAccept =
      nextResult.score <= currentResult.score || Math.random() < Math.max(0.02, 0.14 - attempt / (iterations * 8));

    if (shouldAccept) {
      currentTeamA = nextTeamA;
      currentTeamB = nextTeamB;
      currentResult = nextResult;
    }

    if (nextResult.score < bestResult.score) {
      bestResult = nextResult;
    }
  }

  return bestResult;
}

export function balanceTeams(players: Player[], iterations: number = 3200): DrawResult {
  const sortedBySkill = [...players].sort((a, b) => b.skill - a.skill);
  const topCount = Math.max(2, Math.floor(players.length * 0.3));
  const topPlayers = new Set(sortedBySkill.slice(0, topCount).map((player) => player.id));

  const seededTeams = buildSeedTeams(players, topPlayers);
  let bestResult = optimizeTeams(seededTeams.teamA, seededTeams.teamB, topPlayers, iterations);

  const restartCount = Math.max(3, Math.min(7, Math.floor(players.length / 2)));
  const iterationsPerRestart = Math.max(400, Math.floor(iterations / restartCount));

  for (let restart = 0; restart < restartCount; restart += 1) {
    const shuffledPlayers = shufflePlayers(players);
    const midpoint = Math.ceil(shuffledPlayers.length / 2);
    const candidate = optimizeTeams(
      shuffledPlayers.slice(0, midpoint),
      shuffledPlayers.slice(midpoint),
      topPlayers,
      iterationsPerRestart
    );

    if (candidate.score < bestResult.score) {
      bestResult = candidate;
    }
  }

  return bestResult;
}
