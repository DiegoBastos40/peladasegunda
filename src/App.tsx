import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Trophy,
  History,
  Trash2,
  Edit2,
  CheckCircle2,
  RefreshCcw,
  Shield,
  Sword,
  ShieldCheck,
  Target,
  LayoutList,
  Plus,
  X,
  FileDown,
  Share2,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { Player, Position, DrawResult, GameHistory, Team } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { balanceTeams } from './utils/balanceAlgorithm';
import { cn } from './lib/utils';
import { supabase, dbPlayerToPlayer, dbGameToHistory } from './lib/supabase';

type Tab = 'players' | 'match' | 'history';

type PlayerWinStats = {
  id: string;
  name: string;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  winRate: number;
};

type ShareableMatch = {
  teamA: Team;
  teamB: Team;
  skillDiff: number;
  scoreA?: number;
  scoreB?: number;
  date?: string;
  heading: string;
  subheading: string;
};

const POSITIONS: Position[] = ['Goleiro', 'Zagueiro', 'Meia defensivo', 'Meia ofensivo', 'Atacante'];
const POSITION_SHORT: Record<Position, string> = {
  Goleiro: 'GOL',
  Zagueiro: 'ZAG',
  'Meia defensivo': 'VOL',
  'Meia ofensivo': 'MEI',
  Atacante: 'ATA',
};
const CENTER_STAGE_CLASS = "mx-auto w-full max-w-[340px] sm:max-w-[460px] xl:max-w-[560px]";

const FIELD_LINE_TOPS: Record<'selection' | 'A' | 'B', Record<Position, number>> = {
  selection: {
    Goleiro: 86,
    Zagueiro: 70,
    'Meia defensivo': 54,
    'Meia ofensivo': 38,
    Atacante: 22,
  },
  A: {
    Goleiro: 8,
    Zagueiro: 19,
    'Meia defensivo': 30,
    'Meia ofensivo': 40,
    Atacante: 46,
  },
  B: {
    Goleiro: 92,
    Zagueiro: 81,
    'Meia defensivo': 70,
    'Meia ofensivo': 60,
    Atacante: 54,
  },
};

const FIELD_LINE_TOPS_MOBILE: Record<'selection' | 'A' | 'B', Record<Position, number>> = {
  selection: {
    Goleiro: 84,
    Zagueiro: 68,
    'Meia defensivo': 52,
    'Meia ofensivo': 36,
    Atacante: 20,
  },
  A: {
    Goleiro: 8,
    Zagueiro: 19,
    'Meia defensivo': 30,
    'Meia ofensivo': 41,
    Atacante: 55,
  },
  B: {
    Goleiro: 92,
    Zagueiro: 81,
    'Meia defensivo': 70,
    'Meia ofensivo': 59,
    Atacante: 45,
  },
};

const getPlayerInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const getJerseyPlayerName = (name: string) => name.trim();

const escapeSvgText = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const sortPlayersByPosition = (players: Player[]) =>
  [...players].sort((left, right) => {
    const positionDiff = POSITIONS.indexOf(left.position) - POSITIONS.indexOf(right.position);
    if (positionDiff !== 0) return positionDiff;
    return left.name.localeCompare(right.name, 'pt-BR');
  });

const createShareCardSvg = (match: ShareableMatch) => {
  const width = 1200;
  const height = 1500;
  const teamAPlayers = sortPlayersByPosition(match.teamA.players);
  const teamBPlayers = sortPlayersByPosition(match.teamB.players);
  const rowHeight = 92;

  const renderTeamColumn = (
    title: string,
    accent: string,
    surface: string,
    x: number,
    players: Player[]
  ) => {
    const rows = players
      .map((player, index) => {
        const y = 272 + index * rowHeight;
        const safeName = escapeSvgText(player.name);
        const safePosition = escapeSvgText(POSITION_SHORT[player.position]);

        return `
          <g transform="translate(${x}, ${y})">
            <rect x="0" y="0" width="480" height="72" rx="24" fill="${surface}" stroke="rgba(255,255,255,0.08)" />
            <rect x="22" y="18" width="78" height="36" rx="18" fill="${accent}" opacity="0.18" />
            <text x="61" y="42" text-anchor="middle" fill="${accent}" font-size="22" font-weight="900" font-family="Inter, Arial, sans-serif">${safePosition}</text>
            <text x="126" y="34" fill="#F8FAFC" font-size="28" font-weight="800" font-family="Inter, Arial, sans-serif">${safeName}</text>
            <text x="126" y="58" fill="#94A3B8" font-size="18" font-weight="700" font-family="Inter, Arial, sans-serif">#${index + 1}</text>
          </g>
        `;
      })
      .join('');

    return `
      <g>
        <rect x="${x}" y="150" width="480" height="${Math.max(420, 170 + players.length * rowHeight)}" rx="36" fill="rgba(15,23,42,0.78)" stroke="rgba(255,255,255,0.12)" />
        <text x="${x + 240}" y="222" text-anchor="middle" fill="${accent}" font-size="36" font-weight="900" font-family="Inter, Arial, sans-serif">${escapeSvgText(title)}</text>
        ${rows}
      </g>
    `;
  };

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#14532D" />
          <stop offset="50%" stop-color="#166534" />
          <stop offset="100%" stop-color="#0F3D1E" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <rect x="34" y="34" width="${width - 68}" height="${height - 68}" rx="42" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />
      <text x="${width / 2}" y="92" text-anchor="middle" fill="#F8FAFC" font-size="54" font-weight="900" font-family="Inter, Arial, sans-serif">${escapeSvgText(match.heading)}</text>
      <text x="${width / 2}" y="134" text-anchor="middle" fill="#BFDBFE" font-size="24" font-weight="700" font-family="Inter, Arial, sans-serif">${escapeSvgText(match.subheading)}</text>
      ${renderTeamColumn('Time Verde', '#10B981', 'rgba(2,44,34,0.72)', 80, teamAPlayers)}
      ${renderTeamColumn('Time Azul', '#60A5FA', 'rgba(15,23,42,0.76)', 640, teamBPlayers)}
      <rect x="80" y="1260" width="1040" height="156" rx="32" fill="rgba(15,23,42,0.78)" stroke="rgba(255,255,255,0.10)" />
      ${match.scoreA !== undefined && match.scoreB !== undefined
        ? `<text x="${width / 2}" y="1346" text-anchor="middle" fill="#F8FAFC" font-size="42" font-weight="900" font-family="Inter, Arial, sans-serif">${match.scoreA} X ${match.scoreB}</text>`
        : `<text x="${width / 2}" y="1346" text-anchor="middle" fill="#94A3B8" font-size="22" font-weight="700" font-family="Inter, Arial, sans-serif">Gerado no Pelada Balanceada</text>`}
      ${match.date ? `<text x="${width / 2}" y="1392" text-anchor="middle" fill="#94A3B8" font-size="20" font-weight="700" font-family="Inter, Arial, sans-serif">${escapeSvgText(match.date)}</text>` : ''}
    </svg>
  `;
};

const createRankingShareCardSvg = (ranking: PlayerWinStats[], date: string) => {
  const width = 1200;
  const rowHeight = 80;
  const headerH = 220;
  const colHeaderH = 60;
  const footerH = 80;
  const height = headerH + colHeaderH + ranking.length * rowHeight + footerH + 40;

  const cols = [
    { label: '#',     x: 60,   w: 60,  align: 'middle' },
    { label: 'NOME',  x: 150,  w: 400, align: 'start'  },
    { label: 'J',     x: 590,  w: 80,  align: 'middle' },
    { label: 'V',     x: 680,  w: 80,  align: 'middle' },
    { label: 'E',     x: 760,  w: 80,  align: 'middle' },
    { label: 'D',     x: 840,  w: 80,  align: 'middle' },
    { label: 'GF',    x: 920,  w: 80,  align: 'middle' },
    { label: 'GC',    x: 1000, w: 80,  align: 'middle' },
    { label: 'APROV', x: 1100, w: 90,  align: 'middle' },
  ];

  const headerRow = cols.map(c =>
    `<text x="${c.align === 'middle' ? c.x + c.w / 2 : c.x}" y="${headerH + 38}" text-anchor="${c.align}" fill="#64748B" font-size="20" font-weight="900" font-family="Inter, Arial, sans-serif" letter-spacing="1">${c.label}</text>`
  ).join('');

  const rows = ranking.map((p, i) => {
    const y = headerH + colHeaderH + i * rowHeight;
    const isTop3 = i < 3;
    const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.0)';
    const posColor = i === 0 ? '#F59E0B' : i === 1 ? '#CBD5E1' : i === 2 ? '#F97316' : '#64748B';
    const nameColor = isTop3 ? '#F8FAFC' : '#CBD5E1';

    const cells = [
      { x: cols[0].x + cols[0].w / 2, val: String(i + 1),       anchor: 'middle', fill: posColor,    size: 26, weight: 900 },
      { x: cols[1].x,                  val: p.name.length > 18 ? p.name.substring(0, 17) + '…' : p.name, anchor: 'start', fill: nameColor, size: 26, weight: 800 },
      { x: cols[2].x + cols[2].w / 2, val: String(p.played),    anchor: 'middle', fill: '#94A3B8',   size: 24, weight: 700 },
      { x: cols[3].x + cols[3].w / 2, val: String(p.wins),      anchor: 'middle', fill: '#10B981',   size: 24, weight: 800 },
      { x: cols[4].x + cols[4].w / 2, val: String(p.draws),     anchor: 'middle', fill: '#94A3B8',   size: 24, weight: 700 },
      { x: cols[5].x + cols[5].w / 2, val: String(p.losses),    anchor: 'middle', fill: '#F87171',   size: 24, weight: 700 },
      { x: cols[6].x + cols[6].w / 2, val: String(p.goalsFor),  anchor: 'middle', fill: '#60A5FA',   size: 24, weight: 700 },
      { x: cols[7].x + cols[7].w / 2, val: String(p.goalsAgainst), anchor: 'middle', fill: '#94A3B8', size: 24, weight: 700 },
      { x: cols[8].x + cols[8].w / 2, val: `${p.winRate}%`,     anchor: 'middle', fill: p.winRate >= 60 ? '#10B981' : p.winRate >= 40 ? '#F59E0B' : '#F87171', size: 24, weight: 900 },
    ];

    return `
      <rect x="40" y="${y}" width="${width - 80}" height="${rowHeight}" rx="0" fill="${rowBg}" />
      ${isTop3 ? `<rect x="40" y="${y}" width="4" height="${rowHeight}" fill="${posColor}" />` : ''}
      ${cells.map(c => `<text x="${c.x}" y="${y + rowHeight / 2 + 9}" text-anchor="${c.anchor}" fill="${c.fill}" font-size="${c.size}" font-weight="${c.weight}" font-family="Inter, Arial, sans-serif">${escapeSvgText(c.val)}</text>`).join('')}
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#14532D" />
          <stop offset="60%" stop-color="#0F172A" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <text x="${width / 2}" y="90" text-anchor="middle" fill="#F8FAFC" font-size="52" font-weight="900" font-family="Inter, Arial, sans-serif">RANKING</text>
      <text x="${width / 2}" y="140" text-anchor="middle" fill="#10B981" font-size="30" font-weight="700" font-family="Inter, Arial, sans-serif">PELADA BALANCEADA</text>
      <text x="${width / 2}" y="185" text-anchor="middle" fill="#64748B" font-size="22" font-weight="600" font-family="Inter, Arial, sans-serif">${escapeSvgText(date)} • Pontos Corridos</text>
      <line x1="40" y1="${headerH + colHeaderH}" x2="${width - 40}" y2="${headerH + colHeaderH}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      ${headerRow}
      ${rows}
      <line x1="40" y1="${height - footerH}" x2="${width - 40}" y2="${height - footerH}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      <text x="${width / 2}" y="${height - footerH + 46}" text-anchor="middle" fill="#334155" font-size="20" font-weight="700" font-family="Inter, Arial, sans-serif">Pelada Balanceada • Pontos corridos (V=3pts E=1pt D=0pts)</text>
    </svg>
  `;
};

type WidgetData = { label: string; names: string[]; value: number; suffix: string; accent: string };

const createWidgetsShareCardSvg = (widgets: WidgetData[], date: string) => {
  const width = 1200;
  const cols = 2;
  const cardW = 520;
  const cardH = 200;
  const gapX = 80;
  const gapY = 40;
  const rows = Math.ceil(widgets.length / cols);
  const headerH = 200;
  const footerH = 80;
  const height = headerH + rows * cardH + (rows - 1) * gapY + 60 + footerH;

  const cards = widgets.map((w, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 80 + col * (cardW + gapX);
    const y = headerH + row * (cardH + gapY);

    const nameLines = w.names.slice(0, 3).map((name, ni) =>
      `<text x="${x + 32}" y="${y + 88 + ni * 38}" fill="#F8FAFC" font-size="${w.names.length > 1 ? 26 : 32}" font-weight="900" font-family="Inter, Arial, sans-serif">${escapeSvgText(name.length > 20 ? name.substring(0, 19) + '…' : name)}</text>`
    ).join('');

    const extraCount = w.names.length > 3 ? w.names.length - 3 : 0;

    return `
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="28" fill="rgba(15,23,42,0.72)" stroke="${w.accent}" stroke-width="1.5" stroke-opacity="0.4" />
      <text x="${x + 32}" y="${y + 44}" fill="${w.accent}" font-size="20" font-weight="900" font-family="Inter, Arial, sans-serif" letter-spacing="2">${escapeSvgText(w.label.toUpperCase())}</text>
      ${nameLines}
      ${extraCount > 0 ? `<text x="${x + 32}" y="${y + 88 + 3 * 38}" fill="#64748B" font-size="22" font-weight="700" font-family="Inter, Arial, sans-serif">+${extraCount} empatados</text>` : ''}
      <text x="${x + cardW - 32}" y="${y + cardH - 28}" text-anchor="end" fill="${w.accent}" font-size="26" font-weight="900" font-family="Inter, Arial, sans-serif" opacity="0.7">${w.value} ${escapeSvgText(w.suffix)}</text>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#14532D" />
          <stop offset="60%" stop-color="#0F172A" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <text x="${width / 2}" y="86" text-anchor="middle" fill="#F8FAFC" font-size="52" font-weight="900" font-family="Inter, Arial, sans-serif">DESTAQUES</text>
      <text x="${width / 2}" y="136" text-anchor="middle" fill="#10B981" font-size="30" font-weight="700" font-family="Inter, Arial, sans-serif">PELADA BALANCEADA</text>
      <text x="${width / 2}" y="178" text-anchor="middle" fill="#64748B" font-size="22" font-weight="600" font-family="Inter, Arial, sans-serif">${escapeSvgText(date)}</text>
      ${cards}
      <text x="${width / 2}" y="${height - 24}" text-anchor="middle" fill="#1E293B" font-size="20" font-weight="700" font-family="Inter, Arial, sans-serif">Pelada Balanceada</text>
    </svg>
  `;
};

const distributeLineSlots = (count: number, min: number, max: number) => {
  if (count <= 1) return [50];
  return Array.from({ length: count }, (_, idx) => min + ((max - min) * idx) / (count - 1));
};

const getLineConfig = (position: Position, count: number, isMobileViewport = false) => {
  const slotLimit = position === 'Goleiro' ? 1 : 4;
  const padding = isMobileViewport
    ? position === 'Atacante'
      ? 10
      : position === 'Zagueiro'
        ? 14
        : 10
    : position === 'Atacante'
      ? 14
      : position === 'Zagueiro'
        ? 18
        : 14;
  const totalRows = Math.ceil(count / slotLimit);

  return { slotLimit, padding, totalRows };
};

const PositionBadge = ({ position, isSecondary = false }: { position: Position, isSecondary?: boolean }) => {
  const badgeClass = {
    'Goleiro': 'badge-gk',
    'Zagueiro': 'badge-def',
    'Meia defensivo': 'badge-lat',
    'Meia ofensivo': 'badge-mid',
    'Atacante': 'badge-att'
  }[position];
  
  return (
    <span className={cn("badge", badgeClass, isSecondary && "opacity-60 scale-90")}>
      {position.substring(0, 3)}
      {isSecondary && "*"}
    </span>
  );
};

const PlayerAvatar = ({ instagram, name, size = "md" }: { instagram?: string, name: string, size?: "sm" | "md" | "lg" }) => {
  const avatarUrl = instagram 
    ? `https://unavatar.io/instagram/${instagram.replace('@', '')}` 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff&bold=true`;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  }[size];

  return (
    <div className={cn("rounded-lg overflow-hidden border-2 border-slate-border bg-slate-panel shrink-0", sizeClasses)}>
        <img 
          src={avatarUrl} 
          alt={name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff&bold=true`;
          }}
        />
    </div>
  );
};

const SoccerJersey = ({ color, label, playerName }: { color: string, label: string, playerName: string }) => (
  <motion.div 
    initial={{ scale: 0.5, rotate: -10 }}
    animate={{ scale: 1, rotate: 0 }}
    className="relative flex h-[54px] w-[78px] items-center justify-center sm:h-[84px] sm:w-[128px]"
  >
    <svg viewBox="0 0 100 100" className="h-8 w-8 drop-shadow-xl overflow-visible sm:h-14 sm:w-14">
      <defs>
        <linearGradient id="jerseyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.8 }} />
        </linearGradient>
      </defs>
      {/* Back Plate / Shadow Effect */}
      <path 
        d="M20,20 L80,20 L88,45 L72,52 L72,95 L28,95 L28,52 L12,45 Z" 
        fill="black" 
        fillOpacity="0.3"
        transform="translate(2, 2)"
      />
      {/* Jersey Body */}
      <path 
        d="M20,20 L80,20 L88,45 L72,52 L72,95 L28,95 L28,52 L12,45 Z" 
        fill="url(#jerseyGradient)"
        stroke="white" 
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Details/Trim */}
      <path d="M40,20 Q50,30 60,20" fill="none" stroke="white" strokeWidth="2.5" />
      <path d="M28,95 L72,95" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" />
      
      {/* Label (Initials) */}
      <text 
        x="50" y="56" 
        fontSize="18" 
        fontWeight="900" 
        fill="white" 
        textAnchor="middle" 
        className="font-black italic"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))' }}
      >
        {label}
      </text>
    </svg>
    <div className="pointer-events-none absolute left-1/2 top-[54%] w-[72px] -translate-x-1/2 rounded-md border border-white/10 bg-black/82 px-1 py-0.5 shadow-2xl backdrop-blur-sm sm:w-[116px] sm:px-2 sm:py-1.5">
      <span className="block break-words text-center text-[7px] font-black leading-[1.05] text-white sm:text-[10px]">
        {playerName}
      </span>
    </div>
  </motion.div>
);

const StatBar = ({ label, valA, valB, max }: { label: string, valA: number, valB: number, max: number }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[8px] font-black tracking-tighter">
       <span className="text-primary-emerald">{valA}</span>
       <span className="text-slate-muted uppercase">{label}</span>
       <span className="text-blue-500">{valB}</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex relative">
       <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 z-10" />
       <div className="h-full bg-primary-emerald transition-all duration-500" style={{ width: `${(valA / (valA + valB || 1)) * 100}%` }} />
       <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(valB / (valA + valB || 1)) * 100}%` }} />
    </div>
  </div>
);

const TeamBalanceDashboard = ({ result }: { result: DrawResult }) => {
  const statsA = {
    power: result.teamA.totalSkill,
    velocity: (result.teamA.totalSpeed / (result.teamA.players.length || 1)).toFixed(1),
    defense: (result.teamA.positionCounts['Zagueiro'] || 0) + (result.teamA.positionCounts['Goleiro'] || 0) + (result.teamA.positionCounts['Meia defensivo'] || 0),
    attack: (result.teamA.positionCounts['Meia ofensivo'] || 0) + (result.teamA.positionCounts['Atacante'] || 0)
  };
  
  const statsB = {
    power: result.teamB.totalSkill,
    velocity: (result.teamB.totalSpeed / (result.teamB.players.length || 1)).toFixed(1),
    defense: (result.teamB.positionCounts['Zagueiro'] || 0) + (result.teamB.positionCounts['Goleiro'] || 0) + (result.teamB.positionCounts['Meia defensivo'] || 0),
    attack: (result.teamB.positionCounts['Meia ofensivo'] || 0) + (result.teamB.positionCounts['Atacante'] || 0)
  };

  return (
    <div className="game-card border-slate-border bg-slate-panel/90 p-4">
       <div className="text-[10px] font-black text-slate-muted uppercase tracking-widest mb-4 flex items-center gap-2">
         <ShieldCheck size={14} className="text-primary-emerald" /> 
         INDICADOR DE EQUILÍBRIO
       </div>
       
       <div className="space-y-4">
          <StatBar label="PODER TÉCNICO" valA={statsA.power} valB={statsB.power} max={100} />
          <StatBar label="VELOCIDADE MÉDIA" valA={parseFloat(statsA.velocity)} valB={parseFloat(statsB.velocity)} max={10} />
          
          <div className="grid grid-cols-2 gap-4 pt-2">
             <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-slate-muted uppercase mb-1">DEFESA</span>
                <div className="flex items-center gap-2">
                   <span className={cn("text-xs font-black", statsA.defense > statsB.defense ? "text-primary-emerald" : "text-slate-muted")}>{statsA.defense}</span>
                   <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden flex">
                      <div className="h-full bg-primary-emerald" style={{ width: `${(statsA.defense / (statsA.defense + statsB.defense || 1)) * 100}%` }} />
                      <div className="h-full bg-blue-500" style={{ width: `${(statsB.defense / (statsA.defense + statsB.defense || 1)) * 100}%` }} />
                   </div>
                   <span className={cn("text-xs font-black", statsB.defense > statsA.defense ? "text-blue-500" : "text-slate-muted")}>{statsB.defense}</span>
                </div>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-slate-muted uppercase mb-1">ATAQUE</span>
                <div className="flex items-center gap-2">
                   <span className={cn("text-xs font-black", statsA.attack > statsB.attack ? "text-primary-emerald" : "text-slate-muted")}>{statsA.attack}</span>
                   <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden flex">
                      <div className="h-full bg-primary-emerald" style={{ width: `${(statsA.attack / (statsA.attack + statsB.attack || 1)) * 100}%` }} />
                      <div className="h-full bg-blue-500" style={{ width: `${(statsB.attack / (statsA.attack + statsB.attack || 1)) * 100}%` }} />
                   </div>
                   <span className={cn("text-xs font-black", statsB.attack > statsA.attack ? "text-blue-500" : "text-slate-muted")}>{statsB.attack}</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default function App() {
  const [isDark, setIsDark] = useLocalStorage<boolean>('pb-theme', true);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [loginErrorMsg, setLoginErrorMsg] = useState('Credenciais Inválidas');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('match');
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<GameHistory[]>([]);

  // Supabase auth listener
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch players and history when user signs in
  React.useEffect(() => {
    if (!session) {
      setPlayers([]);
      setHistory([]);
      return;
    }

    const fetchData = async () => {
      const [playersRes, historyRes] = await Promise.all([
        supabase.from('players').select('*').order('created_at', { ascending: true }),
        supabase.from('game_history').select('*').order('created_at', { ascending: false }),
      ]);

      if (playersRes.data) setPlayers(playersRes.data.map(dbPlayerToPlayer));
      if (historyRes.data) setHistory(historyRes.data.map(dbGameToHistory));
    };

    fetchData();
  }, [session]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tempPlayersRegistry, setTempPlayersRegistry] = useState<Player[]>([]);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const allAvailablePlayers = useMemo(() => [...players, ...tempPlayersRegistry], [players, tempPlayersRegistry]);

  const playerWinRanking = useMemo<PlayerWinStats[]>(() => {
    const statsMap = new Map<string, Omit<PlayerWinStats, 'winRate' | 'points' | 'goalDiff'>>();

    const ensurePlayerStats = (player: Player) => {
      if (!statsMap.has(player.id)) {
        statsMap.set(player.id, {
          id: player.id,
          name: player.name,
          wins: 0,
          draws: 0,
          losses: 0,
          played: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        });
      }

      const playerStats = statsMap.get(player.id)!;
      if (player.name.length > playerStats.name.length) {
        playerStats.name = player.name;
      }

      return playerStats;
    };

    history.forEach((game) => {
      if (game.scoreA === undefined || game.scoreB === undefined) return;

      game.teamA.players.forEach((player) => {
        const stats = ensurePlayerStats(player);
        stats.played += 1;
        stats.goalsFor += game.scoreA!;
        stats.goalsAgainst += game.scoreB!;

        if (game.scoreA! > game.scoreB!) stats.wins += 1;
        else if (game.scoreA === game.scoreB) stats.draws += 1;
        else stats.losses += 1;
      });

      game.teamB.players.forEach((player) => {
        const stats = ensurePlayerStats(player);
        stats.played += 1;
        stats.goalsFor += game.scoreB!;
        stats.goalsAgainst += game.scoreA!;

        if (game.scoreB! > game.scoreA!) stats.wins += 1;
        else if (game.scoreA === game.scoreB) stats.draws += 1;
        else stats.losses += 1;
      });
    });

    return [...statsMap.values()]
      .map((stats) => ({
        ...stats,
        points: stats.wins * 3 + stats.draws,
        goalDiff: stats.goalsFor - stats.goalsAgainst,
        winRate: stats.played > 0 ? Math.round(((stats.wins * 3 + stats.draws) / (stats.played * 3)) * 100) : 0,
      }))
      .sort((left, right) => {
        if (right.points !== left.points) return right.points - left.points;
        if (right.goalDiff !== left.goalDiff) return right.goalDiff - left.goalDiff;
        if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
        if (right.wins !== left.wins) return right.wins - left.wins;
        return left.name.localeCompare(right.name, 'pt-BR');
      });
  }, [history]);

  const playerStatsById = useMemo(
    () => new Map(playerWinRanking.map((player) => [player.id, player])),
    [playerWinRanking]
  );

  const completedHistory = useMemo(
    () => history.filter((game) => game.scoreA !== undefined && game.scoreB !== undefined),
    [history]
  );

  const latestCompletedGame = completedHistory[0];
  const archivedCompletedGames = completedHistory.slice(1);

  // Form State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    position: Position;
    secondaryPosition?: Position;
    skill: number;
    speed: number;
    instagram: string;
    isFavorite: boolean;
  }>({
    name: '',
    position: 'Meia ofensivo',
    secondaryPosition: undefined,
    skill: 5,
    speed: 5,
    instagram: '',
    isFavorite: false
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const formRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!shareFeedback) return;
    const timeoutId = window.setTimeout(() => setShareFeedback(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [shareFeedback]);

  React.useEffect(() => {
    const updateViewportMode = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);

    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  React.useEffect(() => {
    if (!showUserMenu) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!userMenuRef.current) return;
      if (userMenuRef.current.contains(event.target as Node)) return;
      setShowUserMenu(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showUserMenu]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !session) return;

    if (isEditing) {
      const updatedData = { ...formData, instagram: formData.instagram.replace('@', '') };
      const isPermPlayer = players.some(p => p.id === isEditing);

      if (isPermPlayer) {
        await supabase.from('players').update({
          name: updatedData.name,
          position: updatedData.position,
          secondary_position: updatedData.secondaryPosition ?? null,
          skill: updatedData.skill,
          speed: updatedData.speed ?? null,
          instagram: updatedData.instagram,
          is_favorite: updatedData.isFavorite,
        }).eq('id', isEditing);
      }

      setPlayers(prev => prev.map(p => p.id === isEditing ? { ...p, ...updatedData } : p));
      setTempPlayersRegistry(prev => prev.map(p => p.id === isEditing ? { ...p, ...updatedData } : p));

      setIsEditing(null);
      setShowAddForm(false);
    } else {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        ...formData,
        instagram: formData.instagram.replace('@', '')
      };

      await supabase.from('players').insert({
        id: newPlayer.id,
        user_id: session.user.id,
        name: newPlayer.name,
        position: newPlayer.position,
        secondary_position: newPlayer.secondaryPosition ?? null,
        skill: newPlayer.skill,
        speed: newPlayer.speed ?? null,
        instagram: newPlayer.instagram,
        is_favorite: newPlayer.isFavorite ?? false,
      });

      setPlayers(prev => [...prev, newPlayer]);
      setShowAddForm(false);
    }
    setFormData({ name: '', position: 'Meia ofensivo', skill: 5, speed: 5, instagram: '', isFavorite: false });
  };

  const removePlayer = async (id: string) => {
    if (confirm('Deseja realmente apagar este atleta?')) {
      const isPermPlayer = players.some(p => p.id === id);
      if (isPermPlayer) {
        await supabase.from('players').delete().eq('id', id);
      }
      setPlayers(prev => prev.filter(p => p.id !== id));
      setTempPlayersRegistry(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => prev.filter(pId => pId !== id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n');
    const names = lines.map(line => {
      const match = line.match(/^\d+\s*[-.]\s*(.+)/);
      return match ? match[1].trim() : line.trim();
    }).filter(n => n.length > 0 && isNaN(Number(n)));

    const newTempPlayers: Player[] = [];
    const newSelectedIds: string[] = [];

    names.forEach(name => {
      const existing = players.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        newSelectedIds.push(existing.id);
      } else {
        const tempId = `temp-${crypto.randomUUID()}`;
        newTempPlayers.push({ id: tempId, name: name, position: 'Meia ofensivo', skill: 5, speed: 5, isTemporary: true });
        newSelectedIds.push(tempId);
      }
    });

    setTempPlayersRegistry(prev => [...prev, ...newTempPlayers]);
    setSelectedIds(prev => Array.from(new Set([...prev, ...newSelectedIds])));
    setImportText('');
    setShowImport(false);
  };

  const handleDraw = () => {
    const activePlayers = allAvailablePlayers.filter(p => selectedIds.includes(p.id));
    if (activePlayers.length < 2) return;
    setDrawResult(balanceTeams(activePlayers));
  };

  const createShareableMatch = (match: DrawResult | GameHistory): ShareableMatch => {
    const hasScore = 'scoreA' in match;

    return {
      teamA: match.teamA,
      teamB: match.teamB,
      skillDiff: match.skillDiff,
      scoreA: hasScore ? match.scoreA : undefined,
      scoreB: hasScore ? match.scoreB : undefined,
      date: hasScore ? match.date : undefined,
      heading: hasScore ? 'Último resultado' : 'Pelada Balanceada',
      subheading: hasScore ? 'Partida finalizada e pronta para partilha' : 'Times sorteados prontos para o jogo',
    };
  };

  const createShareImageBlob = async (match: DrawResult | GameHistory) => {
    const svgMarkup = createShareCardSvg(createShareableMatch(match));
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Falha ao montar a imagem do time.'));
        img.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1500;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Não foi possível preparar o canvas da partilha.');
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Não foi possível gerar o PNG do time.'));
            return;
          }
          resolve(blob);
        }, 'image/png');
      });

      return pngBlob;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const downloadBlobFile = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  const shareBlobFile = async (blob: Blob, filename: string, shareTitle: string, shareText: string) => {
    const shareFile = new File([blob], filename, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        files: [shareFile],
      });
      return true;
    }

    downloadBlobFile(blob, filename);
    return false;
  };

  const handleDownloadTeamsImage = async () => {
    if (!drawResult) return;

    try {
      setIsExportingImage(true);
      const blob = await createShareImageBlob(drawResult);
      downloadBlobFile(blob, 'times-pelada-balanceada.png');
      setShareFeedback('Imagem dos times guardada com sucesso.');
    } catch (error) {
      console.error(error);
      setShareFeedback('Não consegui guardar a imagem agora.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleShareTeamsImage = async () => {
    if (!drawResult) return;

    try {
      setIsExportingImage(true);
      const blob = await createShareImageBlob(drawResult);
      const shared = await shareBlobFile(
        blob,
        'times-pelada-balanceada.png',
        'Times da pelada',
        'Segue a imagem dos times sorteados.'
      );

      if (shared) {
        setShareFeedback('Imagem pronta para partilha.');
        return;
      }

      setShareFeedback('Partilha direta não disponível aqui. A imagem foi guardada para enviares no WhatsApp.');
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setShareFeedback('Partilha cancelada.');
      } else {
        console.error(error);
        setShareFeedback('Não consegui preparar a partilha agora.');
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleShareFinishedGame = async (game: GameHistory) => {
    try {
      setIsExportingImage(true);
      const blob = await createShareImageBlob(game);
      const shared = await shareBlobFile(
        blob,
        `resultado-${game.id}.png`,
        'Último resultado da pelada',
        `Resultado final: ${game.scoreA} X ${game.scoreB}`
      );

      setShareFeedback(
        shared
          ? 'Último resultado pronto para partilha.'
          : 'Partilha direta não disponível aqui. A imagem do último resultado foi guardada.'
      );
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setShareFeedback('Partilha cancelada.');
      } else {
        console.error(error);
        setShareFeedback('Não consegui preparar a imagem do último resultado.');
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleShareRanking = async () => {
    if (playerWinRanking.length === 0) return;
    try {
      setIsExportingImage(true);
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const svgMarkup = createRankingShareCardSvg(playerWinRanking, today);
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Falha ao montar imagem do ranking.'));
          img.src = svgUrl;
        });

        const canvas = document.createElement('canvas');
        const svgHeight = 220 + 60 + playerWinRanking.length * 80 + 80 + 40;
        canvas.width = 1200;
        canvas.height = svgHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas não disponível.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Falha ao gerar PNG.')); return; }
            resolve(blob);
          }, 'image/png');
        });

        const shared = await shareBlobFile(pngBlob, 'ranking-pelada.png', 'Ranking da Pelada', 'Confere o ranking completo!');
        setShareFeedback(shared ? 'Ranking pronto para partilha.' : 'Partilha direta não disponível. Imagem do ranking guardada.');
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setShareFeedback('Partilha cancelada.');
      } else {
        console.error(error);
        setShareFeedback('Não consegui preparar a imagem do ranking.');
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleShareWidgets = async (widgets: WidgetData[]) => {
    if (widgets.length === 0) return;
    try {
      setIsExportingImage(true);
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const svgMarkup = createWidgetsShareCardSvg(widgets, today);
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Falha ao montar imagem dos destaques.'));
          img.src = svgUrl;
        });

        const rows = Math.ceil(widgets.length / 2);
        const svgHeight = 200 + rows * 200 + (rows - 1) * 40 + 60 + 80;
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = svgHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas não disponível.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Falha ao gerar PNG.')); return; }
            resolve(blob);
          }, 'image/png');
        });

        const shared = await shareBlobFile(pngBlob, 'destaques-pelada.png', 'Destaques da Pelada', 'Confere os destaques!');
        setShareFeedback(shared ? 'Destaques prontos para partilha.' : 'Partilha direta não disponível. Imagem dos destaques guardada.');
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setShareFeedback('Partilha cancelada.');
      } else {
        console.error(error);
        setShareFeedback('Não consegui preparar a imagem dos destaques.');
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  const [drawViewMode, setDrawViewMode] = useState<'field' | 'list'>('field');

  const getPositionOnField = (index: number, total: number, team?: 'A' | 'B', player?: Player) => {
    if (total === 0) return { top: '50%', left: '50%' };

    if (!player) {
      const fallbackLeft = distributeLineSlots(total, 18, 82)[index] ?? 50;
      return { top: '50%', left: `${fallbackLeft}%` };
    }

    const playerPool = team
      ? team === 'A'
        ? drawResult?.teamA.players ?? []
        : drawResult?.teamB.players ?? []
      : allAvailablePlayers.filter((candidate) => selectedIds.includes(candidate.id));

    const playersInSameLine = playerPool.filter((candidate) => candidate.position === player.position);
    const playerIndexInLine = Math.max(
      playersInSameLine.findIndex((candidate) => candidate.id === player.id),
      0
    );
    const { slotLimit, padding, totalRows } = getLineConfig(player.position, playersInSameLine.length, isMobileViewport);
    const rowIndex = Math.floor(playerIndexInLine / slotLimit);
    const colIndex = playerIndexInLine % slotLimit;
    const itemsBeforeRow = rowIndex * slotLimit;
    const itemsInRow = Math.min(slotLimit, playersInSameLine.length - itemsBeforeRow);
    const leftSlots = distributeLineSlots(itemsInRow, padding, 100 - padding);
    const fieldLineTops = isMobileViewport ? FIELD_LINE_TOPS_MOBILE : FIELD_LINE_TOPS;
    const baseTop = fieldLineTops[team ?? 'selection'][player.position];
    const verticalOffset = totalRows > 1 ? (rowIndex - (totalRows - 1) / 2) * (isMobileViewport ? 10 : 6) : 0;

    return {
      top: `${baseTop + verticalOffset}%`,
      left: `${leftSlots[colIndex] ?? 50}%`,
    };
  };

  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');
  const [editDate, setEditDate] = useState('');

  const saveToHistory = async () => {
    if (!drawResult || !session) return;
    const newGame: GameHistory = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      teamA: drawResult.teamA,
      teamB: drawResult.teamB,
      skillDiff: drawResult.skillDiff,
      scoreA: undefined,
      scoreB: undefined
    };

    await supabase.from('game_history').insert({
      id: newGame.id,
      user_id: session.user.id,
      date: newGame.date,
      team_a: newGame.teamA,
      team_b: newGame.teamB,
      score_a: null,
      score_b: null,
      skill_diff: newGame.skillDiff,
    });

    setHistory(prev => [newGame, ...prev]);
    setDrawResult(null);
    setSelectedIds([]);
    setTempPlayersRegistry([]);
    setScoreA('');
    setScoreB('');
    setActiveTab('history');
  };

  const updateGameScore = async (id: string) => {
    const sA = parseInt(editScoreA);
    const sB = parseInt(editScoreB);
    if (isNaN(sA) || isNaN(sB)) return;

    const updates: Record<string, unknown> = { score_a: sA, score_b: sB };
    let formattedDate: string | undefined;
    if (editDate) {
      const [y, m, d] = editDate.split('-');
      formattedDate = `${d}/${m}/${y}`;
      updates.date = formattedDate;
    }

    await supabase.from('game_history').update(updates).eq('id', id);

    setHistory(prev => prev.map(game =>
      game.id === id ? { ...game, scoreA: sA, scoreB: sB, ...(formattedDate ? { date: formattedDate } : {}) } : game
    ));
    setEditingHistoryId(null);
    setEditScoreA('');
    setEditScoreB('');
    setEditDate('');
  };

  const removeGame = async (id: string) => {
    if (confirm('Deseja realmente apagar este registro do histórico?')) {
      await supabase.from('game_history').delete().eq('id', id);
      setHistory(prev => prev.filter(g => g.id !== id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setTempPlayersRegistry([]);
    setDrawResult(null);
  };

  const movePlayer = (playerId: string, from: 'teamA' | 'teamB') => {
    if (!drawResult) return;
    
    const sourceTeamKey = from;
    const targetTeamKey = from === 'teamA' ? 'teamB' : 'teamA';
    
    const player = drawResult[sourceTeamKey].players.find(p => p.id === playerId);
    if (!player) return;

    const newSourcePlayers = drawResult[sourceTeamKey].players.filter(p => p.id !== playerId);
    const newTargetPlayers = [...drawResult[targetTeamKey].players, player];

    const getTeamStats = (players: Player[]) => {
      const totalSkill = players.reduce((sum, p) => sum + p.skill, 0);
      const totalSpeed = players.reduce((sum, p) => sum + (p.speed || 5), 0);
      const positionCounts = players.reduce((acc, p) => {
        acc[p.position] = (acc[p.position] || 0) + 1;
        return acc;
      }, {} as Record<Position, number>);

      return { players, totalSkill, totalSpeed, positionCounts };
    };

    const teamAStats = from === 'teamA' ? getTeamStats(newSourcePlayers) : getTeamStats(newTargetPlayers);
    const teamBStats = from === 'teamB' ? getTeamStats(newSourcePlayers) : getTeamStats(newTargetPlayers);

    setDrawResult({
      teamA: teamAStats as Team,
      teamB: teamBStats as Team,
      skillDiff: Math.abs(teamAStats.totalSkill - teamBStats.totalSkill),
      score: -1 // Mark as manually adjusted
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) {
      setLoginError(true);
      setLoginErrorMsg('Credenciais Inválidas');
    } else {
      setLoginError(false);
      setLoginPass('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email: loginEmail, password: loginPass });
    if (error) {
      setLoginError(true);
      setLoginErrorMsg(error.message);
    } else {
      setLoginError(false);
      setLoginPass('');
      setIsSignUpMode(false);
      setLoginErrorMsg('Verifique seu e-mail para confirmar a conta.');
      setLoginError(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
    setLoginPass('');
  };

  if (authLoading) {
    return (
      <div className="flex h-[100dvh] bg-slate-bg items-center justify-center">
        <div className="text-primary-emerald animate-pulse">
          <Trophy size={48} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-bg items-center justify-center p-6 safe-p-top">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-3xl bg-primary-emerald/10 text-primary-emerald mb-4 border border-primary-emerald/20">
              <Trophy size={48} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-slate-text">SQUAD PRO</h1>
            <p className="text-slate-muted font-bold text-sm uppercase tracking-widest">
              {isSignUpMode ? 'Criar Conta' : 'Acesso Restrito'}
            </p>
          </div>

          <div className="game-card p-6 space-y-6 border-primary-emerald/20 shadow-2xl">
            <form onSubmit={isSignUpMode ? handleSignUp : handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-muted uppercase pl-1">E-mail</label>
                <input
                  type="email"
                  className="app-input py-4"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setLoginError(false); }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-muted uppercase pl-1">Senha</label>
                <input
                  type="password"
                  className="app-input py-4"
                  placeholder="••••••"
                  value={loginPass}
                  onChange={e => { setLoginPass(e.target.value); setLoginError(false); }}
                />
              </div>

              {loginError && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={cn(
                    "text-[10px] font-black text-center uppercase tracking-widest",
                    loginErrorMsg.startsWith('Verifique') ? 'text-primary-emerald' : 'text-red-400'
                  )}
                >
                  {loginErrorMsg}
                </motion.p>
              )}

              <button type="submit" className="ios-btn-primary h-14 mt-4 text-sm">
                {isSignUpMode ? 'CRIAR CONTA' : 'ENTRAR NO SISTEMA'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setIsSignUpMode(v => !v); setLoginError(false); }}
              className="w-full text-center text-[10px] font-black text-slate-muted uppercase tracking-widest"
            >
              {isSignUpMode ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-muted opacity-70">Versão 2.4.0 • Pro Edition</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-bg overflow-hidden safe-p-top">
      {/* Header Area */}
      <header className="flex items-center justify-between px-4 py-3 z-20 shrink-0 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
           <Trophy className="text-primary-emerald" size={24} />
           <h1 className="font-black text-xl tracking-tighter italic text-slate-text">SQUAD PRO</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'match' && selectedIds.length > 0 && (
            <motion.div 
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-primary-emerald/10 text-primary-emerald px-3 py-1 rounded-full text-[10px] font-black"
            >
              {selectedIds.length} ATLETAS
            </motion.div>
          )}
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-10 h-10 rounded-xl bg-slate-panel flex items-center justify-center border border-slate-border text-slate-text active:scale-95 transition-all"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-border bg-slate-panel text-slate-text active:scale-95 transition-all"
              aria-label="Abrir menu do utilizador"
              aria-expanded={showUserMenu}
            >
              <ShieldCheck size={18} className="text-primary-emerald" />
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  className="absolute right-0 top-full z-50 mt-2 min-w-[148px] rounded-xl border border-slate-border bg-slate-panel p-3 shadow-2xl"
                >
                  <div className="mb-2 text-[10px] font-black uppercase text-slate-muted">Utilizador</div>
                  <div className="mb-3 break-all text-xs font-bold text-slate-text">{session?.user?.email}</div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500/10 py-2 text-[10px] font-black uppercase text-red-500"
                  >
                    <LogOut size={12} /> Sair
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'match' && (
            <motion.div 
              key="match"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="h-full flex flex-col space-y-4 overflow-y-auto px-3 py-3 pb-28 sm:p-4 sm:pb-32"
            >
              {!drawResult ? (
                <>
                  <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:gap-4">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-[10px] font-black text-slate-muted uppercase tracking-widest flex items-center gap-2">
                         CONVOCAÇÃO DE CRAQUES
                      </h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowImport(!showImport)}
                          className="w-10 h-10 rounded-xl bg-slate-panel flex items-center justify-center border border-slate-border text-slate-muted active:scale-95 transition-all"
                        >
                           <FileDown size={18} />
                        </button>
                        <button 
                          onClick={() => setShowAddForm(!showAddForm)}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90",
                            showAddForm ? "bg-red-500 text-white rotate-45" : "bg-primary-emerald text-white"
                          )}
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-center">
                       <div className="flex bg-slate-panel/80 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
                          <button 
                            onClick={() => setDrawViewMode('field')}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase flex items-center gap-2", 
                              drawViewMode === 'field' 
                                ? "bg-primary-emerald text-white shadow-lg shadow-primary-emerald/30 scale-105" 
                                : "text-slate-muted hover:text-slate-text"
                            )}
                          >
                            <Target size={14} />
                            <span>CAMPO</span>
                          </button>
                          <button 
                            onClick={() => setDrawViewMode('list')}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase flex items-center gap-2", 
                              drawViewMode === 'list' 
                                ? "bg-primary-emerald text-white shadow-lg shadow-primary-emerald/30 scale-105" 
                                : "text-slate-muted hover:text-slate-text"
                            )}
                          >
                            <LayoutList size={14} />
                            <span>LISTA ({selectedIds.length})</span>
                          </button>
                       </div>
                    </div>
                  </div>

                  {drawViewMode === 'field' ? (
                    <div className={cn("flex flex-col items-center", CENTER_STAGE_CLASS)}>
                      <div className="soccer-field relative w-full aspect-[4/6] shrink-0 shadow-2xl overflow-hidden select-none">
                        <div className="field-goal-top" />
                        <div className="field-penalty-area-top" />
                        <div className="field-center-line" />
                        <div className="field-center-circle" />
                        <div className="field-penalty-area-bottom" />
                        <div className="field-goal-bottom" />
                        
                        <div className="absolute inset-0 isolate pointer-events-none">
                          <AnimatePresence>
                            {allAvailablePlayers.filter(p => selectedIds.includes(p.id)).map((p, idx, arr) => {
                              const pos = getPositionOnField(idx, arr.length, undefined, p);
                              return (
                                <motion.div 
                                  key={p.id}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1, top: pos.top, left: pos.left }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 pointer-events-auto"
                                >
                                  <SoccerJersey 
                                    color="#475569" 
                                    label={getPlayerInitials(p.name)}
                                    playerName={getJerseyPlayerName(p.name)}
                                  />
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                    {/* Import Overlay */}
                    <AnimatePresence>
                      {showImport && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[3px]"
                          onClick={() => setShowImport(false)}
                        >
                          <motion.div 
                             initial={{ y: 24, opacity: 0, scale: 0.98 }}
                             animate={{ y: 0, opacity: 1, scale: 1 }}
                             exit={{ y: 24, opacity: 0, scale: 0.98 }}
                             className="w-full max-w-[340px] rounded-2xl border border-slate-border bg-slate-panel/95 p-4 shadow-2xl backdrop-blur-md sm:max-w-[380px] sm:p-5"
                             onClick={(e) => e.stopPropagation()}
                          >
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black italic text-slate-text">IMPORTAR LISTA</h3>
                                <button onClick={() => setShowImport(false)} className="text-slate-muted"><X size={18} /></button>
                             </div>
                             <textarea
                                className="app-textarea mb-3 h-28 sm:h-32"
                                placeholder={"1 - João\n2 - Pedro..."}
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                             />
                             <button onClick={handleImport} className="ios-btn-primary h-12 text-xs">PROCESSAR NOMES</button>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {selectedIds.length === 0 && !showImport && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white/75">
                        <Target size={48} strokeWidth={1} className="mb-4 opacity-50" />
                        <p className="text-sm font-black italic tracking-widest uppercase">Escale seu time para o sorteio</p>
                      </div>
                    )}
                    </div>
                  </div>
                ) : (
                  <div className={cn("game-card p-4 shrink-0", CENTER_STAGE_CLASS)}>
                       <div className="text-[10px] font-black text-slate-muted uppercase tracking-widest mb-4 flex justify-between">
                          <span>SELECIONADOS</span>
                          <span className="text-primary-emerald italic">{selectedIds.length} ATLETAS</span>
                       </div>
                       <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar sm:grid-cols-2">
                          {allAvailablePlayers.filter(p => selectedIds.includes(p.id)).length === 0 ? (
                            <div className="col-span-1 md:col-span-2 py-20 text-center opacity-20">
                               <Users size={32} className="mx-auto mb-2" />
                               <p className="text-[8px] font-bold">NENHUM ATLETA SELECIONADO</p>
                            </div>
                          ) : (
                            allAvailablePlayers.filter(p => selectedIds.includes(p.id)).map(p => (
                              <div key={p.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                                 <PlayerAvatar instagram={p.instagram} name={p.name} size="sm" />
                                 <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-bold truncate text-primary-emerald uppercase leading-none mb-1">{p.name}</div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                       <PositionBadge position={p.position} isSecondary />
                                       <span className="text-[7px] font-bold uppercase text-slate-muted">T:{p.skill} • V:{p.speed || 5}</span>
                                    </div>
                                 </div>
                                 <div className="flex gap-1">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(p.id);
                                        setFormData({
                                          name: p.name,
                                          position: p.position,
                                          secondaryPosition: p.secondaryPosition,
                                          skill: p.skill,
                                          speed: p.speed || 5,
                                          instagram: p.instagram || '',
                                          isFavorite: !!p.isFavorite
                                        });
                                        // Scroll to form
                                        setTimeout(() => {
                                          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 100);
                                      }} 
                                      className="text-slate-muted p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => toggleSelection(p.id)} className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"><X size={14} /></button>
                                  </div>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {(showAddForm || isEditing) && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        className="game-card p-5 shrink-0 overflow-hidden"
                      >
                        <div ref={formRef} className="flex items-center justify-between mb-4">
                          <h2 className="text-sm font-black text-slate-muted uppercase tracking-widest flex items-center gap-2">
                            {isEditing ? <Edit2 size={16} /> : <UserPlus size={16} />} 
                            {isEditing ? 'EDITAR ATLETA' : 'REGISTRAR CRAQUE'}
                          </h2>
                          {(isEditing || showAddForm) && (
                            <button 
                              onClick={() => { setIsEditing(null); setShowAddForm(false); setFormData({ name: '', position: 'Meia ofensivo', skill: 5, speed: 5, instagram: '', isFavorite: false }); }}
                              className="text-[10px] text-red-400 font-black"
                            >
                              CANCELAR
                            </button>
                          )}
                        </div>
                        <form onSubmit={handleAddPlayer} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <input
                                type="text"
                                placeholder="Nome do Jogador"
                                className="app-input"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="text"
                                placeholder="Instagram (Ex: @atleta)"
                                className="app-input"
                                value={formData.instagram}
                                onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                               <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Posição</label>
                               <select
                                 className="app-select"
                                 value={formData.position}
                                 onChange={e => setFormData({ ...formData, position: e.target.value as Position })}
                               >
                                 {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                               </select>
                            </div>
                            <div className="col-span-1">
                              <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Técnica ({formData.skill})</label>
                              <input
                                type="range" min="1" max="10"
                                className="w-full accent-primary-emerald mt-3"
                                value={formData.skill}
                                onChange={e => setFormData({ ...formData, skill: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Velocidade ({formData.speed})</label>
                              <input
                                type="range" min="1" max="10"
                                className="w-full accent-blue-500 mt-3"
                                value={formData.speed}
                                onChange={e => setFormData({ ...formData, speed: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                          <button type="submit" className="ios-btn-primary">
                            {isEditing ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR INSCRIÇÃO'}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 gap-2 shrink-0">
                    <button onClick={clearSelection} className="ios-btn-secondary py-3 text-[10px] text-red-400 border-red-500/20 bg-red-500/5">
                      <Trash2 size={12} /> LIMPAR CONVOCAÇÃO
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-muted uppercase tracking-widest px-1">ATLETAS DISPONÍVEIS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {allAvailablePlayers.map(p => {
                        const isSelected = selectedIds.includes(p.id);
                        return (
                          <div 
                            key={p.id}
                            onClick={() => toggleSelection(p.id)}
                            className={cn(
                              "game-card p-2 flex items-center gap-3 transition-all relative active:scale-[0.99] group",
                              isSelected ? "border-primary-emerald bg-primary-emerald/10" : "opacity-60 border-white/5"
                            )}
                          >
                             <PlayerAvatar instagram={p.instagram} name={p.name} size="sm" />
                             <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black truncate tracking-tight text-primary-emerald uppercase leading-none mb-0.5">{p.name}</div>
                                <div className="flex gap-1.5 items-center">
                                   <PositionBadge position={p.position} />
                                   <div className="text-[7px] font-bold leading-none text-slate-muted">T: {p.skill} • V: {p.speed || 5}</div>
                                   {p.isTemporary && <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter bg-amber-500/10 px-1 rounded">V</span>}
                                </div>
                             </div>
                             <div className="flex flex-col gap-1 mr-1">
                               <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(p.id);
                                    setFormData({
                                      name: p.name,
                                      position: p.position,
                                      secondaryPosition: p.secondaryPosition,
                                      skill: p.skill,
                                      speed: p.speed || 5,
                                      instagram: p.instagram || '',
                                      isFavorite: !!p.isFavorite
                                    });
                                    // Scroll to form
                                    setTimeout(() => {
                                      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                  }} 
                                  className="p-1.5 bg-white/5 rounded-md text-slate-muted hover:text-primary-emerald active:scale-90 transition-all"
                               >
                                  <Edit2 size={10} />
                               </button>
                               <div className={cn(
                                 "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                 isSelected ? "bg-primary-emerald border-primary-emerald text-white" : "border-slate-border text-transparent"
                               )}>
                                  <CheckCircle2 size={12} />
                               </div>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="fixed bottom-20 left-3 right-3 z-30 sm:bottom-24 sm:left-4 sm:right-4">
                    <div className={CENTER_STAGE_CLASS}>
                      <button
                        disabled={selectedIds.length < 2}
                        onClick={handleDraw}
                        className="ios-btn-primary h-12 bg-primary-emerald/90 text-sm shadow-2xl backdrop-blur-md sm:h-14 sm:text-base"
                      >
                        <RefreshCcw size={20} className={cn(selectedIds.length < 2 && "opacity-20", "animate-spin-slow")} />
                        {selectedIds.length < 2 ? "SELECIONE +2" : "SORTEAR TIMES"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-5 pb-40 sm:space-y-6 sm:pb-44">
                  <div className="flex items-center justify-between px-1">
                     <button onClick={() => setDrawResult(null)} className="h-10 w-10 flex items-center justify-center bg-slate-panel border border-slate-border rounded-xl text-slate-muted">
                        <X size={18} />
                     </button>
                     
                     <div className="flex bg-slate-panel/80 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
                        <button 
                          onClick={() => setDrawViewMode('field')}
                          className={cn(
                            "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all sm:gap-2 sm:px-6 sm:py-2.5 sm:text-[11px]", 
                            drawViewMode === 'field' 
                              ? "bg-primary-emerald text-white shadow-lg shadow-primary-emerald/30 scale-105" 
                              : "text-slate-muted hover:text-slate-text"
                          )}
                        >
                          <Target size={16} className={drawViewMode === 'field' ? "animate-pulse" : ""} />
                          <span>CAMPO</span>
                        </button>
                        <button 
                          onClick={() => setDrawViewMode('list')}
                          className={cn(
                            "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all sm:gap-2 sm:px-6 sm:py-2.5 sm:text-[11px]", 
                            drawViewMode === 'list' 
                              ? "bg-primary-emerald text-white shadow-lg shadow-primary-emerald/30 scale-105" 
                              : "text-slate-muted hover:text-slate-text"
                          )}
                        >
                          <LayoutList size={16} />
                          <span>LISTA</span>
                        </button>
                     </div>

                     <button 
                        onClick={handleDraw} 
                        className="flex items-center gap-1.5 rounded-xl border border-slate-border bg-slate-panel px-3 py-2 text-[9px] font-black text-primary-emerald transition-all active:scale-95 sm:gap-2 sm:px-4 sm:text-[10px]"
                     >
                        <RefreshCcw size={14} /> RE-SORTEAR
                     </button>
                  </div>

                  <TeamBalanceDashboard result={drawResult} />

                  {drawViewMode === 'field' ? (
                    <div className={cn("flex flex-col items-center py-4", CENTER_STAGE_CLASS)}>
                      <div className="soccer-field relative w-full aspect-[4/6] shrink-0 shadow-2xl border-white/20 select-none overflow-hidden">
                        {/* Field Markings */}
                        <div className="field-goal-top" />
                        <div className="field-penalty-area-top" />
                        <div className="field-center-line" />
                        <div className="field-center-circle" />
                        <div className="field-penalty-area-bottom" />
                        <div className="field-goal-bottom" />
                        
                        {/* Players Container with local stacking context */}
                        <div className="absolute inset-0 isolate pointer-events-none">
                          {/* Team A (Top) */}
                          {drawResult.teamA.players.map((p, idx) => {
                            const pos = getPositionOnField(idx, drawResult.teamA.players.length, 'A', p);
                            const yVal = parseFloat(pos.top);
                            const zIndex = 10 + Math.floor(yVal / 5);
                            
                            return (
                              <motion.div 
                                key={p.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1, top: pos.top, left: pos.left }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group pointer-events-auto"
                                style={{ zIndex }}
                                onClick={() => movePlayer(p.id, 'teamA')}
                              >
                                <SoccerJersey 
                                  color={p.position === 'Goleiro' ? "#f59e0b" : "#10b981"} 
                                  label={getPlayerInitials(p.name)}
                                  playerName={getJerseyPlayerName(p.name)}
                                />
                              </motion.div>
                            );
                          })}

                          {/* Team B (Bottom) */}
                          {drawResult.teamB.players.map((p, idx) => {
                            const pos = getPositionOnField(idx, drawResult.teamB.players.length, 'B', p);
                            const yVal = parseFloat(pos.top);
                            const zIndex = 10 + Math.floor(yVal / 5);

                            return (
                              <motion.div 
                                key={p.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1, top: pos.top, left: pos.left }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group pointer-events-auto"
                                style={{ zIndex }}
                                onClick={() => movePlayer(p.id, 'teamB')}
                              >
                                 <SoccerJersey 
                                  color={p.position === 'Goleiro' ? "#f59e0b" : "#2563eb"} 
                                  label={getPlayerInitials(p.name)}
                                  playerName={getJerseyPlayerName(p.name)}
                                />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={cn("space-y-4", CENTER_STAGE_CLASS)}>
                      {/* Comparison Header */}
                      <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 sm:gap-2">
                        {[
                          { team: drawResult.teamA, color: 'text-primary-emerald', border: 'border-primary-emerald', bg: 'bg-primary-emerald/10', title: 'TIME VERDE', jersey: '#10b981' },
                          { team: drawResult.teamB, color: 'text-blue-500', border: 'border-blue-500', bg: 'bg-blue-500/10', title: 'TIME AZUL', jersey: '#2563eb' }
                        ].map((t, idx) => (
                          <div key={idx} className={cn("game-card border-t-4 flex flex-col h-full", t.border)}>
                             <div className={cn("p-2 border-b border-white/5 flex flex-col items-center gap-1 shrink-0", t.bg)}>
                                <span className={cn("font-black italic text-[11px] tracking-widest leading-none", t.color)}>{t.title}</span>
                                <div className="flex gap-1">
                                  {t.team.players.filter(p => p.position === 'Goleiro').map(p => (
                                    <div key={p.id} className="px-1.5 py-0.5 rounded-sm bg-orange-500 text-white text-[7px] font-black leading-none uppercase">Goleiro</div>
                                  ))}
                                </div>
                             </div>
                             <div className="p-1.5 space-y-1.5 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                                {t.team.players.map((p, pIdx) => (
                                   <div key={p.id} className="flex items-center gap-1.5 p-1 bg-white/5 rounded border border-white/5 relative group min-h-[44px]">
                                      <span className="text-[7px] font-black text-slate-muted italic w-2 text-center shrink-0">{pIdx + 1}</span>
                                      <div className="shrink-0">
                                        <SoccerJersey 
                                          color={p.position === 'Goleiro' ? "#f59e0b" : t.jersey} 
                                          label={p.name.split(' ').map(n => n[0]).filter((_, i) => i < 2).join('').toUpperCase()}
                                          playerName={getJerseyPlayerName(p.name)}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <div className={cn("text-[9px] font-black truncate uppercase leading-none mb-0.5", t.color)}>{p.name.split(' ')[0]}</div>
                                         <div className="text-[6px] font-bold uppercase text-slate-muted truncate">{p.position}</div>
                                      </div>
                                      <button 
                                        onClick={() => movePlayer(p.id, idx === 0 ? 'teamA' : 'teamB')}
                                        className="opacity-0 group-hover:opacity-100 absolute right-0.5 top-0.5 w-5 h-5 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-10"
                                      >
                                        <RefreshCcw size={8} />
                                      </button>
                                   </div>
                                ))}
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="fixed bottom-20 left-3 right-3 z-40 sm:bottom-24 sm:left-4 sm:right-4">
                    <div className={cn("space-y-3", CENTER_STAGE_CLASS)}>
                     <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <button
                          onClick={handleDownloadTeamsImage}
                          disabled={isExportingImage}
                          className="ios-btn-secondary py-3 text-[11px] font-black uppercase tracking-wide sm:py-3.5 sm:text-xs"
                        >
                          <FileDown size={16} />
                          {isExportingImage ? 'A gerar...' : 'Guardar imagem'}
                        </button>
                        <button
                          onClick={handleShareTeamsImage}
                          disabled={isExportingImage}
                          className="ios-btn-secondary py-3 text-[11px] font-black uppercase tracking-wide sm:py-3.5 sm:text-xs"
                        >
                          <Share2 size={16} />
                          {isExportingImage ? 'A gerar...' : 'Partilhar'}
                        </button>
                     </div>
                     {shareFeedback && (
                       <div className="rounded-2xl border border-slate-border bg-slate-panel/94 px-4 py-3 text-center text-[11px] font-bold text-slate-text shadow-xl">
                         {shareFeedback}
                       </div>
                     )}
                     <div className="game-card p-2 border-primary-emerald/30 shadow-2xl">
                        <button onClick={saveToHistory} className="w-full bg-primary-emerald text-white py-3.5 flex items-center justify-center gap-3 rounded-xl shadow-xl shadow-primary-emerald/20 active:scale-95 transition-all text-base font-black italic tracking-[0.2em] sm:py-4 sm:text-lg sm:tracking-widest">
                           JOGAR <Trophy size={20} />
                        </button>
                     </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'players' && (
            <motion.div 
              key="players"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto px-3 py-3 pb-28 sm:p-4 sm:pb-32"
            >
              <div className="flex justify-between items-end mb-6 px-1">
                <h2 className="text-xl font-black italic tracking-tighter text-primary-emerald sm:text-2xl">BASE DE DADOS</h2>
                <div className="flex items-end gap-4">
                  <div className="text-xs font-bold text-primary-emerald italic">{players.length} ATLETAS</div>
                  <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90",
                      showAddForm ? "bg-red-500 text-white rotate-45" : "bg-primary-emerald text-white"
                    )}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {(showAddForm || isEditing) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    className="game-card p-5 shrink-0 overflow-hidden"
                  >
                    <div ref={formRef} className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-black text-slate-muted uppercase tracking-widest flex items-center gap-2">
                        {isEditing ? <Edit2 size={16} /> : <UserPlus size={16} />} 
                        {isEditing ? 'EDITAR ATLETA' : 'REGISTRAR CRAQUE'}
                      </h2>
                      <button 
                        onClick={() => { setIsEditing(null); setShowAddForm(false); setFormData({ name: '', position: 'Meia ofensivo', skill: 5, speed: 5, instagram: '', isFavorite: false }); }}
                        className="text-[10px] text-red-400 font-black"
                      >
                        CANCELAR
                      </button>
                    </div>
                    <form onSubmit={handleAddPlayer} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Nome do Jogador"
                            className="app-input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Instagram (Ex: @atleta)"
                            className="app-input"
                            value={formData.instagram}
                            onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Posição</label>
                          <select
                            className="app-select"
                            value={formData.position}
                            onChange={e => setFormData({ ...formData, position: e.target.value as Position })}
                          >
                            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="col-span-1">
                          <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Técnica ({formData.skill})</label>
                          <input
                            type="range" min="1" max="10"
                            className="w-full accent-primary-emerald mt-3"
                            value={formData.skill}
                            onChange={e => setFormData({ ...formData, skill: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Velocidade ({formData.speed})</label>
                          <input
                            type="range" min="1" max="10"
                            className="w-full accent-blue-500 mt-3"
                            value={formData.speed}
                            onChange={e => setFormData({ ...formData, speed: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      <button type="submit" className="ios-btn-primary">
                        {isEditing ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR INSCRIÇÃO'}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                {players.length === 0 ? (
                  <div className="py-20 text-center opacity-20 bg-slate-panel rounded-3xl border border-slate-border">
                    <Users size={64} className="mx-auto mb-4" />
                    <p className="font-bold">Nenhum jogador cadastrado</p>
                  </div>
                ) : (
                  players.map(p => (
                    <div key={p.id} className="game-card p-5 flex items-center gap-5 group active:bg-white/5 transition-all border-l-4 border-l-transparent hover:border-l-primary-emerald">
                       <PlayerAvatar instagram={p.instagram} name={p.name} size="md" />
                       <div className="flex-1 min-w-0">
                          <div className="font-black text-lg tracking-tight text-primary-emerald uppercase leading-tight mb-1">{p.name}</div>
                          <div className="flex flex-wrap items-center gap-2">
                             <PositionBadge position={p.position} />
                             <div className="flex gap-1.5">
                                <div className="attribute-pill px-2.5 py-1 text-[10px] bg-primary-emerald/10 text-primary-emerald">T: {p.skill}</div>
                                <div className="attribute-pill px-2.5 py-1 text-[10px] bg-blue-500/10 text-blue-400">V: {p.speed || 5}</div>
                             </div>
                             {playerStatsById.get(p.id) && (
                               <div className="attribute-pill px-2.5 py-1 text-[10px] bg-amber-500/10 text-amber-500">
                                 W: {playerStatsById.get(p.id)?.wins}
                               </div>
                             )}
                             {p.instagram && <div className="text-[10px] text-zinc-500 font-bold tracking-tight">@{p.instagram}</div>}
                          </div>
                       </div>
                       <div className="flex flex-col gap-2">
                          <button onClick={() => { 
                               // Scroll to form
                               setIsEditing(p.id); 
                               setFormData({
                                 name: p.name,
                                 position: p.position,
                                 secondaryPosition: p.secondaryPosition,
                                 skill: p.skill,
                                 speed: p.speed || 5,
                                 instagram: p.instagram || '',
                                 isFavorite: !!p.isFavorite
                               }); 
                               // Scroll to form
                               setTimeout(() => {
                                 formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                               }, 100);
                             }} className="p-2 bg-white/5 rounded-lg text-slate-muted active:text-primary-emerald"><Edit2 size={14} /></button>
                          <button onClick={() => removePlayer(p.id)} className="p-2 bg-red-500/10 rounded-lg text-red-400 active:bg-red-500/20"><Trash2 size={14} /></button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="h-full overflow-y-auto px-3 py-3 pb-28 sm:p-4 sm:pb-32"
            >
              <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black italic tracking-tighter text-primary-emerald uppercase leading-none">Histórico</h2>
                  <div className="text-[8px] font-black text-slate-muted italic uppercase tracking-widest mt-1">{history.length} PARTIDAS REGISTRADAS</div>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={async () => {
                      if(confirm('Deseja apagar TODO o histórico de partidas? Esta ação não pode ser desfeita.')) {
                        await supabase.from('game_history').delete().not('id', 'is', null);
                        setHistory([]);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase border border-red-500/20 active:scale-95 transition-all"
                  >
                    <Trash2 size={12} /> LIMPAR TUDO
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {history.length === 0 ? (
                   <div className="py-20 text-center opacity-20 bg-slate-panel rounded-3xl border border-slate-border">
                      <History size={64} className="mx-auto mb-4" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">Sem registros de jogos</p>
                   </div>
                ) : (
                  <>
                    {history.some(g => g.scoreA === undefined) && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black text-primary-emerald uppercase tracking-widest px-1">Partidas em Aberto</div>
                        {history.filter(g => g.scoreA === undefined).map(game => (
                          <div key={game.id} className="game-card relative overflow-hidden border-l-4 border-l-amber-500 bg-amber-500/5">
                             <div className="p-4">
                               <div className="mb-3 flex items-start justify-between">
                                  <div className="text-[9px] font-black text-slate-muted italic uppercase tracking-widest">
                                     <span>{game.date}</span>
                                     <span className="text-amber-500 ml-2">PENDENTE</span>
                                  </div>
                                  <button 
                                     onClick={(e) => { e.stopPropagation(); removeGame(game.id); }}
                                     className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all border border-red-500/10"
                                     title="Excluir partida"
                                  >
                                     <Trash2 size={14} />
                                  </button>
                               </div>
                               
                               {editingHistoryId === game.id ? (
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                       <input
                                          type="number"
                                         className="app-input-compact text-primary-emerald"
                                          placeholder="TM A"
                                          value={editScoreA}
                                          onChange={e => setEditScoreA(e.target.value)}
                                       />
                                       <div className="text-white opacity-20 font-black">X</div>
                                       <input
                                          type="number"
                                          className="app-input-compact text-blue-500"
                                          placeholder="TM B"
                                          value={editScoreB}
                                          onChange={e => setEditScoreB(e.target.value)}
                                       />
                                    </div>
                                    <input
                                      type="date"
                                      className="app-input-compact w-full text-slate-text"
                                      value={editDate}
                                      onChange={e => setEditDate(e.target.value)}
                                      title="Data da partida (opcional)"
                                    />
                                    <div className="flex gap-2">
                                       <button onClick={() => updateGameScore(game.id)} className="flex-1 ios-btn-primary h-10 text-[10px]">FINALIZAR</button>
                                       <button onClick={() => { setEditingHistoryId(null); setEditDate(''); }} className="px-4 bg-white/5 border border-white/10 rounded-xl text-slate-muted text-[10px] font-black uppercase">Sair</button>
                                    </div>
                                 </div>
                               ) : (
                                 <div 
                                   onClick={() => setExpandedHistoryId(expandedHistoryId === game.id ? null : game.id)}
                                   className="cursor-pointer"
                                 >
                                   <div className="flex items-center justify-between gap-3">
                                      <div className="text-center flex-1">
                                         <div className="text-[9px] font-bold text-slate-muted mb-1 uppercase">Time Verde</div>
                                         <div className="text-xl font-black italic text-white/10">?</div>
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingHistoryId(game.id);
                                          setEditScoreA('');
                                          setEditScoreB('');
                                        }}
                                        className="rounded-xl bg-amber-500 px-4 py-2.5 text-[9px] font-black uppercase text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                                      >
                                        DEFINIR PLACAR
                                      </button>
                                      <div className="text-center flex-1">
                                         <div className="text-[9px] font-bold text-slate-muted mb-1 uppercase">Time Azul</div>
                                         <div className="text-xl font-black italic text-white/10">?</div>
                                      </div>
                                   </div>
                                   <div className="mt-3 flex justify-center">
                                      <span className="text-[8px] font-bold text-amber-500/40 uppercase tracking-[0.2em] animate-pulse">Clique para ver os times</span>
                                   </div>
                                 </div>
                               )}
                             </div>

                             <AnimatePresence>
                                {expandedHistoryId === game.id && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-white/5 bg-black/20"
                                  >
                                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                                       <div className="space-y-2">
                                          <div className="text-[8px] font-black text-primary-emerald uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Verde ({game.teamA.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {game.teamA.players.map(p => (
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-slate-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary-emerald" />
                                                <span className="truncate">{p.name}</span>
                                              </div>
                                            ))}
                                          </div>
                                       </div>
                                       <div className="space-y-2">
                                          <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Azul ({game.teamB.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {game.teamB.players.map(p => (
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-slate-muted">
                                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                <span className="truncate">{p.name}</span>
                                              </div>
                                            ))}
                                          </div>
                                       </div>
                                    </div>
                                  </motion.div>
                                )}
                             </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}

                    {completedHistory.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black text-slate-muted uppercase tracking-widest px-1">Encerradas</div>
                        {latestCompletedGame && (
                          <div className="game-card relative overflow-hidden border-l-4 border-l-primary-emerald group">
                               <div className="p-4">
                                 <div className="mb-3 flex items-start justify-between">
                                    <div className="text-[9px] font-black text-slate-muted italic uppercase tracking-widest">
                                       <span>{latestCompletedGame.date}</span>
                                       <span className="text-primary-emerald bg-primary-emerald/10 px-2 py-0.5 rounded ml-2 italic">Δ {latestCompletedGame.skillDiff}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleShareFinishedGame(latestCompletedGame);
                                        }}
                                        disabled={isExportingImage}
                                        className="rounded-lg bg-white/5 p-1.5 text-slate-muted hover:text-primary-emerald"
                                        title="Partilhar último resultado"
                                      >
                                        <Share2 size={12} />
                                      </button>
                                      <button 
                                         onClick={(e) => { e.stopPropagation(); removeGame(latestCompletedGame.id); }}
                                         className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all border border-red-500/10"
                                         title="Excluir partida"
                                      >
                                         <Trash2 size={14} />
                                      </button>
                                    </div>
                                 </div>
                                 
                                 {editingHistoryId === latestCompletedGame.id ? (
                                   <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                         <input
                                            type="number"
                                            className="app-input-compact text-primary-emerald"
                                            placeholder="TM A"
                                            value={editScoreA}
                                            onChange={e => setEditScoreA(e.target.value)}
                                         />
                                         <div className="text-white opacity-20 font-black">X</div>
                                         <input
                                            type="number"
                                            className="app-input-compact text-blue-500"
                                            placeholder="TM B"
                                            value={editScoreB}
                                            onChange={e => setEditScoreB(e.target.value)}
                                         />
                                      </div>
                                      <input
                                        type="date"
                                        className="app-input-compact w-full text-slate-text"
                                        value={editDate}
                                        onChange={e => setEditDate(e.target.value)}
                                        title="Data da partida (opcional)"
                                      />
                                      <div className="flex gap-2">
                                         <button onClick={() => updateGameScore(latestCompletedGame.id)} className="flex-1 ios-btn-primary h-10 text-[10px]">ATUALIZAR</button>
                                         <button onClick={() => { setEditingHistoryId(null); setEditDate(''); }} className="px-4 bg-white/5 border border-white/10 rounded-xl text-slate-muted text-[10px] font-black uppercase">Sair</button>
                                      </div>
                                   </div>
                                 ) : (
                                    <div 
                                      onClick={() => setExpandedHistoryId(expandedHistoryId === latestCompletedGame.id ? null : latestCompletedGame.id)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between gap-2 px-1">
                                         <div className="text-center flex-1">
                                            <div className="text-[9px] font-bold text-slate-muted mb-1 truncate uppercase">Time Verde</div>
                                            <div className="text-2xl font-black italic leading-none text-primary-emerald">
                                              {latestCompletedGame.scoreA}
                                            </div>
                                         </div>
                                         <div className="flex flex-col items-center px-2">
                                            <div className="mb-1 text-lg font-black italic text-slate-border opacity-20">X</div>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingHistoryId(latestCompletedGame.id);
                                                setEditScoreA(String(latestCompletedGame.scoreA));
                                                setEditScoreB(String(latestCompletedGame.scoreB));
                                              }}
                                              className="rounded-lg bg-white/5 p-1.5 text-slate-muted hover:text-primary-emerald"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                         </div>
                                         <div className="text-center flex-1">
                                            <div className="text-[9px] font-bold text-slate-muted mb-1 truncate uppercase">Time Azul</div>
                                            <div className="text-2xl font-black italic leading-none text-blue-500">
                                              {latestCompletedGame.scoreB}
                                            </div>
                                         </div>
                                      </div>
                                      <div className="mt-3 flex justify-center">
                                         <span className="text-[8px] font-bold text-white/10 uppercase tracking-[0.2em] group-hover:text-primary-emerald/30 transition-colors">Clique para ver os times</span>
                                      </div>
                                    </div>
                                 )}
                               </div>

                               <AnimatePresence>
                                {expandedHistoryId === latestCompletedGame.id && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-white/5 bg-black/20"
                                  >
                                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                                       <div className="space-y-2">
                                          <div className="text-[8px] font-black text-primary-emerald uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Verde ({latestCompletedGame.teamA.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {latestCompletedGame.teamA.players.map(p => (
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-slate-muted">
                                                <div className="w-1 h-1 rounded-full bg-primary-emerald" />
                                                <span className="truncate">{p.name}</span>
                                              </div>
                                            ))}
                                          </div>
                                       </div>
                                       <div className="space-y-2">
                                          <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Azul ({latestCompletedGame.teamB.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {latestCompletedGame.teamB.players.map(p => (
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-slate-muted">
                                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                <span className="truncate">{p.name}</span>
                                              </div>
                                            ))}
                                          </div>
                                       </div>
                                    </div>
                                 </motion.div>
                                )}
                             </AnimatePresence>
                          </div>
                        )}

                        {archivedCompletedGames.length > 0 && (
                          <>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-muted px-1">Resultados antigos</div>
                            <div className="flex flex-wrap gap-2">
                              {archivedCompletedGames.map((game) => (
                                <button
                                  key={game.id}
                                  onClick={() => setExpandedHistoryId(expandedHistoryId === game.id ? null : game.id)}
                                  className={cn(
                                    "h-[58px] w-[92px] rounded-xl border border-slate-border bg-slate-panel/70 px-2 py-1.5 text-left transition-all",
                                    expandedHistoryId === game.id ? "border-primary-emerald bg-primary-emerald/8 shadow-lg shadow-primary-emerald/10" : "hover:border-primary-emerald/40"
                                  )}
                                >
                                  <div className="flex h-full flex-col justify-between">
                                    <div className="truncate text-[7px] font-black uppercase tracking-wide text-slate-muted">{game.date}</div>
                                    <div className="text-center">
                                      <div className="text-base font-black italic leading-none text-slate-text">{game.scoreA}<span className="px-1 text-slate-border/70">x</span>{game.scoreB}</div>
                                      <div className="mt-0.5 text-[7px] font-bold uppercase tracking-wide text-slate-muted">Δ {game.skillDiff}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>

                            {archivedCompletedGames.find((game) => game.id === expandedHistoryId) && (
                              <div className="game-card overflow-hidden border border-slate-border">
                                {(() => {
                                  const selectedGame = archivedCompletedGames.find((game) => game.id === expandedHistoryId)!;
                                  const isEditingThis = editingHistoryId === selectedGame.id;

                                  return (
                                    <>
                                      <div className="flex items-center justify-between border-b border-white/5 bg-black/10 p-3">
                                        <div>
                                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-muted">{selectedGame.date}</div>
                                          <div className="mt-1 text-xs font-black text-slate-text">{selectedGame.scoreA} X {selectedGame.scoreB}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleShareFinishedGame(selectedGame)}
                                            disabled={isExportingImage}
                                            className="rounded-lg bg-white/5 p-1.5 text-slate-muted hover:text-primary-emerald"
                                          >
                                            <Share2 size={12} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingHistoryId(isEditingThis ? null : selectedGame.id);
                                              setEditScoreA(String(selectedGame.scoreA ?? ''));
                                              setEditScoreB(String(selectedGame.scoreB ?? ''));
                                              setEditDate('');
                                            }}
                                            className={cn("rounded-lg p-1.5 transition-colors", isEditingThis ? "bg-primary-emerald/20 text-primary-emerald" : "bg-white/5 text-slate-muted hover:text-primary-emerald")}
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                          <button
                                            onClick={() => removeGame(selectedGame.id)}
                                            className="rounded-lg bg-red-500/10 p-1.5 text-red-500 hover:bg-red-500/20"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>

                                      {isEditingThis && (
                                        <div className="space-y-3 border-b border-white/5 p-3">
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              className="app-input-compact text-primary-emerald"
                                              placeholder="TM A"
                                              value={editScoreA}
                                              onChange={e => setEditScoreA(e.target.value)}
                                            />
                                            <div className="text-white opacity-20 font-black">X</div>
                                            <input
                                              type="number"
                                              className="app-input-compact text-blue-500"
                                              placeholder="TM B"
                                              value={editScoreB}
                                              onChange={e => setEditScoreB(e.target.value)}
                                            />
                                          </div>
                                          <input
                                            type="date"
                                            className="app-input-compact w-full text-slate-text"
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                            title="Data da partida (opcional)"
                                          />
                                          <div className="flex gap-2">
                                            <button onClick={() => updateGameScore(selectedGame.id)} className="flex-1 ios-btn-primary h-10 text-[10px]">SALVAR</button>
                                            <button onClick={() => { setEditingHistoryId(null); setEditDate(''); }} className="px-4 bg-white/5 border border-white/10 rounded-xl text-slate-muted text-[10px] font-black uppercase">Sair</button>
                                          </div>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                          <div className="text-[8px] font-black text-primary-emerald uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Verde ({selectedGame.teamA.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {selectedGame.teamA.players.map((player) => (
                                              <div key={player.id} className="flex items-center gap-2 text-[10px] text-slate-muted">
                                                <div className="h-1 w-1 rounded-full bg-primary-emerald" />
                                                <span className="truncate">{player.name}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Azul ({selectedGame.teamB.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {selectedGame.teamB.players.map((player) => (
                                              <div key={player.id} className="flex items-center gap-2 text-[10px] text-slate-muted">
                                                <div className="h-1 w-1 rounded-full bg-blue-500" />
                                                <span className="truncate">{player.name}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {playerWinRanking.length > 0 && completedHistory.length > 0 && (() => {
                      const tiedTop = <T extends PlayerWinStats>(list: T[], val: (p: T) => number) => {
                        if (!list.length) return { names: [] as string[], value: 0 };
                        const best = val(list[0]);
                        return { names: list.filter(p => val(p) === best).map(p => p.name), value: best };
                      };

                      const byPlayedDesc = [...playerWinRanking].sort((a, b) => b.played - a.played);
                      const byWinsDesc   = [...playerWinRanking].sort((a, b) => b.wins - a.wins);
                      const byGFDesc     = [...playerWinRanking].sort((a, b) => b.goalsFor - a.goalsFor);
                      const byGFAsc      = [...playerWinRanking].filter(p => p.played > 0).sort((a, b) => a.goalsFor - b.goalsFor);
                      const byLossDesc   = [...playerWinRanking].sort((a, b) => b.losses - a.losses);
                      const byPlayedAsc  = [...playerWinRanking].filter(p => p.played > 5).sort((a, b) => a.played - b.played);

                      const mostPlayed  = tiedTop(byPlayedDesc, p => p.played);
                      const mostWins    = tiedTop(byWinsDesc,   p => p.wins);
                      const mostGoals   = tiedTop(byGFDesc,     p => p.goalsFor);
                      const leastGoals  = tiedTop(byGFAsc,      p => p.goalsFor);
                      const mostLosses  = tiedTop(byLossDesc,   p => p.losses);
                      const leastPlayed = tiedTop(byPlayedAsc,  p => p.played);

                      return (
                        <>
                          {/* Tabela de pontos corridos */}
                          <div className="game-card border-primary-emerald/20 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-white/5 p-4">
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary-emerald">Ranking • Pontos Corridos</div>
                                <div className="mt-0.5 text-[8px] font-black uppercase tracking-widest text-slate-muted">V=3pts • E=1pt • D=0pts</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleShareRanking}
                                  disabled={isExportingImage}
                                  className="rounded-lg bg-white/5 p-1.5 text-slate-muted hover:text-primary-emerald transition-colors"
                                  title="Partilhar ranking"
                                >
                                  <Share2 size={14} />
                                </button>
                                <Trophy size={16} className="text-primary-emerald" />
                              </div>
                            </div>

                            {/* Cabeçalho da tabela */}
                            <div className="grid border-b border-white/5 bg-black/20 px-2 py-1.5" style={{ gridTemplateColumns: '28px 1fr 28px 28px 28px 28px 28px 28px 36px' }}>
                              {['#','NOME','J','V','E','D','GF','GC','APR%'].map((h, i) => (
                                <div key={h} className={cn("text-[8px] font-black uppercase tracking-wider text-slate-muted", i === 1 ? 'text-left pl-1' : 'text-center')}>
                                  {h}
                                </div>
                              ))}
                            </div>

                            {/* Linhas dos jogadores */}
                            <div className="divide-y divide-white/[0.04]">
                              {playerWinRanking.map((player, index) => (
                                <div
                                  key={player.id}
                                  className={cn(
                                    "grid items-center px-2 py-2.5",
                                    index === 0 ? "bg-amber-500/5 border-l-2 border-l-amber-500" :
                                    index === 1 ? "bg-slate-300/[0.03] border-l-2 border-l-slate-400" :
                                    index === 2 ? "bg-orange-500/5 border-l-2 border-l-orange-500" : ""
                                  )}
                                  style={{ gridTemplateColumns: '28px 1fr 28px 28px 28px 28px 28px 28px 36px' }}
                                >
                                  <div className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-black",
                                    index === 0 ? "bg-amber-500/20 text-amber-400" :
                                    index === 1 ? "bg-slate-300/10 text-slate-300" :
                                    index === 2 ? "bg-orange-500/20 text-orange-400" : "text-slate-muted"
                                  )}>
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 pl-1">
                                    <div className="truncate text-[11px] font-black text-slate-text">{player.name}</div>
                                  </div>
                                  <div className="text-center text-[10px] font-bold text-slate-muted">{player.played}</div>
                                  <div className="text-center text-[10px] font-black text-primary-emerald">{player.wins}</div>
                                  <div className="text-center text-[10px] font-bold text-slate-muted">{player.draws}</div>
                                  <div className="text-center text-[10px] font-bold text-red-400">{player.losses}</div>
                                  <div className="text-center text-[10px] font-bold text-blue-400">{player.goalsFor}</div>
                                  <div className="text-center text-[10px] font-bold text-slate-muted">{player.goalsAgainst}</div>
                                  <div className={cn(
                                    "text-center text-[10px] font-black",
                                    player.winRate >= 60 ? "text-primary-emerald" : player.winRate >= 40 ? "text-amber-400" : "text-red-400"
                                  )}>
                                    {player.winRate}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Widgets de destaque */}
                          {(() => {
                            const widgetDefs = [
                              { icon: <LayoutList size={14} />, label: 'Mais jogos',      stat: mostPlayed,  suffix: 'jogos',       color: 'text-blue-400',        border: 'border-blue-500/20',        accent: '#60A5FA' },
                              { icon: <Trophy size={14} />,     label: 'Mais vitórias',   stat: mostWins,    suffix: 'vitórias',    color: 'text-amber-400',       border: 'border-amber-500/20',       accent: '#F59E0B' },
                              { icon: <Sword size={14} />,      label: 'Time com + gols', stat: mostGoals,   suffix: 'gols feitos', color: 'text-primary-emerald', border: 'border-primary-emerald/20', accent: '#10B981' },
                              { icon: <Shield size={14} />,     label: 'Time com - gols', stat: leastGoals,  suffix: 'gols feitos', color: 'text-slate-400',       border: 'border-slate-500/20',       accent: '#94A3B8' },
                              { icon: <Target size={14} />,     label: 'Mais derrotas',   stat: mostLosses,  suffix: 'derrotas',    color: 'text-red-400',         border: 'border-red-500/20',         accent: '#F87171' },
                              { icon: <Users size={14} />,      label: 'Menos jogos (+5)',stat: leastPlayed, suffix: 'jogos',       color: 'text-purple-400',      border: 'border-purple-500/20',      accent: '#C084FC' },
                            ].filter(w => w.stat.names.length > 0);

                            const shareableWidgets: WidgetData[] = widgetDefs.map(w => ({
                              label: w.label,
                              names: w.stat.names,
                              value: w.stat.value,
                              suffix: w.suffix,
                              accent: w.accent,
                            }));

                            return (
                              <div className="game-card border-slate-border/30 overflow-hidden">
                                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-text">Destaques</div>
                                  <button
                                    onClick={() => handleShareWidgets(shareableWidgets)}
                                    disabled={isExportingImage}
                                    className="rounded-lg bg-white/5 p-1.5 text-slate-muted hover:text-primary-emerald transition-colors"
                                    title="Partilhar destaques"
                                  >
                                    <Share2 size={14} />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 p-3">
                                  {widgetDefs.map((w, i) => (
                                    <div key={i} className={cn("rounded-2xl border bg-slate-panel/60 p-3 flex flex-col gap-1.5", w.border)}>
                                      <div className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest leading-tight", w.color)}>
                                        {w.icon}<span>{w.label}</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        {w.stat.names.map((name, ni) => (
                                          <div key={ni} className="truncate text-[11px] font-black text-slate-text">{name}</div>
                                        ))}
                                      </div>
                                      <div className="text-[9px] font-bold text-slate-muted">{w.stat.value} {w.suffix}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
              </motion.div>
            )}
        </AnimatePresence>
      </main>

      {/* Navigation Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-slate-border bg-slate-panel/90 px-4 pt-2.5 pb-5 backdrop-blur-2xl safe-mb-bottom sm:px-8 sm:pt-3 sm:pb-8">
        <TabButton 
          active={activeTab === 'match'} 
          onClick={() => { setActiveTab('match'); setDrawResult(null); }}
          icon={<RefreshCcw size={22} />}
          label="Sorteio"
        />
        <TabButton 
          active={activeTab === 'players'} 
          onClick={() => setActiveTab('players')}
          icon={<Users size={22} />}
          label="Elenco"
        />
        <TabButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<History size={22} />}
          label="Histórico"
        />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn("tab-nav-button relative h-12 w-16", active ? "active" : "text-slate-muted opacity-50")}
    >
      <div className="icon-container relative z-10 transition-transform active:scale-90">
        {icon}
      </div>
      <span className="text-[8px] font-black tracking-widest mt-1 uppercase relative z-10 leading-none">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute inset-0 bg-primary-emerald/10 rounded-2xl -z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </button>
  );
}
