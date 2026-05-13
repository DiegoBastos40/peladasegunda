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
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Position, DrawResult, GameHistory, Team } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { balanceTeams } from './utils/balanceAlgorithm';
import { cn } from './lib/utils';

type Tab = 'players' | 'match' | 'history';

const POSITIONS: Position[] = ['Goleiro', 'Zagueiro', 'Meia defensivo', 'Meia ofensivo', 'Atacante'];

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

const SoccerJersey = ({ color, label }: { color: string, label: string }) => (
  <motion.div 
    initial={{ scale: 0.5, rotate: -10 }}
    animate={{ scale: 1, rotate: 0 }}
    className="relative w-10 h-10 flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
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
        x="50" y="68" 
        fontSize="24" 
        fontWeight="900" 
        fill="white" 
        textAnchor="middle" 
        className="font-black italic"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))' }}
      >
        {label}
      </text>
    </svg>
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
    <div className="game-card p-4 border-white/5 bg-black/40">
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
                   <span className={cn("text-xs font-black", statsA.defense > statsB.defense ? "text-primary-emerald" : "text-white/40")}>{statsA.defense}</span>
                   <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden flex">
                      <div className="h-full bg-primary-emerald" style={{ width: `${(statsA.defense / (statsA.defense + statsB.defense || 1)) * 100}%` }} />
                      <div className="h-full bg-blue-500" style={{ width: `${(statsB.defense / (statsA.defense + statsB.defense || 1)) * 100}%` }} />
                   </div>
                   <span className={cn("text-xs font-black", statsB.defense > statsA.defense ? "text-blue-500" : "text-white/40")}>{statsB.defense}</span>
                </div>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-slate-muted uppercase mb-1">ATAQUE</span>
                <div className="flex items-center gap-2">
                   <span className={cn("text-xs font-black", statsA.attack > statsB.attack ? "text-primary-emerald" : "text-white/40")}>{statsA.attack}</span>
                   <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden flex">
                      <div className="h-full bg-primary-emerald" style={{ width: `${(statsA.attack / (statsA.attack + statsB.attack || 1)) * 100}%` }} />
                      <div className="h-full bg-blue-500" style={{ width: `${(statsB.attack / (statsA.attack + statsB.attack || 1)) * 100}%` }} />
                   </div>
                   <span className={cn("text-xs font-black", statsB.attack > statsA.attack ? "text-blue-500" : "text-white/40")}>{statsB.attack}</span>
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

  const [isAuthenticated, setIsAuthenticated] = useLocalStorage<boolean>('pb-auth', false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('match');
  const [players, setPlayers] = useLocalStorage<Player[]>('pb-players', []);
  const [history, setHistory] = useLocalStorage<GameHistory[]>('pb-history', []);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tempPlayersRegistry, setTempPlayersRegistry] = useState<Player[]>([]);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const allAvailablePlayers = useMemo(() => [...players, ...tempPlayersRegistry], [players, tempPlayersRegistry]);

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

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (isEditing) {
      const updatedData = { ...formData, instagram: formData.instagram.replace('@', '') };
      
      // Update permanent players if it's a permanent player ID
      setPlayers(prev => prev.map(p => p.id === isEditing ? { ...p, ...updatedData } : p));
      
      // Update temporary players if it's a temporary ID
      setTempPlayersRegistry(prev => prev.map(p => p.id === isEditing ? { ...p, ...updatedData } : p));
      
      setIsEditing(null);
      setShowAddForm(false);
    } else {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        ...formData,
        instagram: formData.instagram.replace('@', '')
      };
      setPlayers(prev => [...prev, newPlayer]);
      setShowAddForm(false);
    }
    setFormData({ name: '', position: 'Meia ofensivo', skill: 5, speed: 5, instagram: '', isFavorite: false });
  };

  const removePlayer = (id: string) => {
    if (confirm('Deseja realmente apagar este atleta?')) {
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

  const [drawViewMode, setDrawViewMode] = useState<'field' | 'list'>('field');

  const getPositionOnField = (index: number, total: number, team?: 'A' | 'B', player?: Player) => {
    if (total === 0) return { top: '50%', left: '50%' };
    
    // Selection mode (Before balance) - Professional Aligned Grid
    if (!team) {
      const cols = 4; // Shift to 4 columns for selection to distinguish from match 2-column feel
      const r = Math.floor(index / cols);
      const c = index % cols;
      const rows = Math.ceil(total / cols);
      
      const vPadding = 20; // More centered vertical
      const hPadding = 15;
      
      const top = `${vPadding + (r * (60 / Math.max(1, rows - 1 || 1)))}%`;
      const left = `${hPadding + (c * (70 / (cols - 1 || 1)))}%`;
      return { top, left };
    }

    // Team result mode (After balance) - Strictly Separated Halves
    const isTeamA = team === 'A';
    
    // Default fallback positions
    let vPos = isTeamA ? 15 : 85;
    let hPos = 50;

    if (player && drawResult) {
      const teamPlayers = isTeamA ? drawResult.teamA.players : drawResult.teamB.players;
      const playersInSamePos = teamPlayers.filter(p => p.position === player.position);
      const posIdx = playersInSamePos.findIndex(p => p.id === player.id);
      const posTotal = playersInSamePos.length;

      // Strict Tactical Formation - 8 Stripes (4 per half)
      // Pattern: Goal -> Dark (0-12.5) -> Light (12.5-25) -> Dark (25-37.5) -> Light (37.5-50)
      
      const vGoal = isTeamA ? 2 : 98;
      const vDef = isTeamA ? 8 : 92;      // Inside dark stripe 1 (0-12.5)
      const vMidDef = isTeamA ? 20 : 80;   // Inside light stripe 2 (12.5-25)
      const vMidOff = isTeamA ? 32 : 68;   // Inside dark stripe 3 (25-37.5)
      const vAtk = isTeamA ? 44 : 56;      // Inside light stripe 4 (37.5-50)

      switch(player.position) {
        case 'Goleiro': 
          vPos = vGoal; 
          hPos = 50; 
          break;
        case 'Zagueiro': 
          vPos = vDef; 
          hPos = posTotal === 1 ? 50 : 
                 posTotal === 2 ? (28 + (posIdx * 44)) :
                 posTotal === 3 ? (22 + (posIdx * 28)) :
                 (18 + (posIdx * (64 / (posTotal - 1))));
          break;
        case 'Meia defensivo':
          vPos = vMidDef;
          hPos = posTotal === 1 ? 50 : 
                 posTotal === 2 ? (25 + (posIdx * 50)) :
                 posTotal === 3 ? (20 + (posIdx * 30)) :
                 (15 + (posIdx * (70 / (posTotal - 1))));
          break;
        case 'Meia ofensivo': 
          vPos = vMidOff; 
          hPos = posTotal === 1 ? 50 : 
                 posTotal === 2 ? (25 + (posIdx * 50)) :
                 posTotal === 3 ? (20 + (posIdx * 30)) :
                 (15 + (posIdx * (70 / (posTotal - 1))));
          break;
        case 'Atacante': 
          vPos = vAtk; 
          hPos = posTotal === 1 ? 50 :
                 posTotal === 2 ? (32 + (posIdx * 36)) :
                 (28 + (posIdx * (44 / (posTotal - 1))));
          break;
      }
    }

    return { top: `${vPos}%`, left: `${hPos}%` };
  };

  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');

  const saveToHistory = () => {
    if (!drawResult) return;
    const newGame: GameHistory = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      teamA: drawResult.teamA,
      teamB: drawResult.teamB,
      skillDiff: drawResult.skillDiff,
      scoreA: undefined,
      scoreB: undefined
    };
    setHistory(prev => [newGame, ...prev]);
    setDrawResult(null);
    setSelectedIds([]);
    setTempPlayersRegistry([]);
    setScoreA('');
    setScoreB('');
    setActiveTab('history');
  };

  const updateGameScore = (id: string) => {
    const sA = parseInt(editScoreA);
    const sB = parseInt(editScoreB);
    if (isNaN(sA) || isNaN(sB)) return;

    setHistory(prev => prev.map(game => 
      game.id === id ? { ...game, scoreA: sA, scoreB: sB } : game
    ));
    setEditingHistoryId(null);
    setEditScoreA('');
    setEditScoreB('');
  };

  const removeGame = (id: string) => {
    if (confirm('Deseja realmente apagar este registro do histórico?')) {
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'marcelomachado90@gmail.com' && loginPass === '123456') {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  if (!isAuthenticated) {
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
            <h1 className="text-4xl font-black italic tracking-tighter text-white">SQUAD PRO</h1>
            <p className="text-slate-muted font-bold text-sm uppercase tracking-widest">Acesso Restrito</p>
          </div>

          <div className="game-card p-6 space-y-6 border-primary-emerald/20 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-muted uppercase pl-1">Utilizador</label>
                <input 
                  type="email"
                  className="w-full bg-black/40 border border-slate-border rounded-xl px-4 py-4 text-sm focus:border-primary-emerald outline-none text-white transition-all"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setLoginError(false); }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-muted uppercase pl-1">Senha</label>
                <input 
                  type="password"
                  className="w-full bg-black/40 border border-slate-border rounded-xl px-4 py-4 text-sm focus:border-primary-emerald outline-none text-white transition-all"
                  placeholder="••••••"
                  value={loginPass}
                  onChange={e => { setLoginPass(e.target.value); setLoginError(false); }}
                />
              </div>
              
              {loginError && (
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-red-400 text-[10px] font-black text-center uppercase tracking-widest"
                >
                  Credenciais Inválidas
                </motion.p>
              )}

              <button type="submit" className="ios-btn-primary h-14 mt-4 text-sm">
                ENTRAR NO SISTEMA
              </button>
            </form>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Versão 2.4.0 • Pro Edition</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-bg overflow-hidden safe-p-top">
      {/* Header Area */}
      <header className="px-6 py-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
           <Trophy className="text-primary-emerald" size={24} />
           <h1 className="font-black text-xl tracking-tighter italic text-white">SQUAD PRO</h1>
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
          <div className="w-10 h-10 rounded-xl bg-slate-panel flex items-center justify-center border border-slate-border group relative">
            <ShieldCheck size={18} className="text-primary-emerald" />
            <div className="absolute top-full right-0 mt-2 p-3 bg-slate-panel border border-slate-border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
               <div className="text-[10px] font-black text-slate-muted uppercase mb-2">Usuário</div>
               <div className="text-xs font-bold text-slate-text truncate mb-3">{loginEmail}</div>
               <button 
                onClick={() => setIsAuthenticated(false)}
                className="w-full py-2 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1.5"
               >
                 <LogOut size={12} /> Sair
               </button>
            </div>
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
              className="h-full flex flex-col p-4 space-y-4 overflow-y-auto pb-32"
            >
              {!drawResult ? (
                <>
                  <div className="flex flex-col gap-4 mb-4">
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
                                : "text-slate-muted hover:text-white"
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
                                : "text-slate-muted hover:text-white"
                            )}
                          >
                            <LayoutList size={14} />
                            <span>LISTA ({selectedIds.length})</span>
                          </button>
                       </div>
                    </div>
                  </div>

                  {drawViewMode === 'field' ? (
                    <div className="flex flex-col items-center">
                      <div className="soccer-field relative w-full aspect-[4/6] max-w-[340px] mx-auto shrink-0 shadow-2xl overflow-hidden select-none">
                        <div className="field-goal-top" />
                        <div className="field-penalty-area-top" />
                        <div className="field-center-line" />
                        <div className="field-center-circle" />
                        <div className="field-penalty-area-bottom" />
                        <div className="field-goal-bottom" />
                        
                        <div className="absolute inset-0 isolate pointer-events-none">
                          <AnimatePresence>
                            {allAvailablePlayers.filter(p => selectedIds.includes(p.id)).map((p, idx, arr) => {
                              const pos = getPositionOnField(idx, arr.length);
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
                                    label={p.name.split(' ').map(n => n[0]).filter((_, i) => i < 2).join('').toUpperCase()}
                                  />
                                  <div className="mt-1 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-lg border border-white/10 max-w-[80px]">
                                     <span className="text-[9px] font-black text-white uppercase truncate block w-full text-center leading-none">
                                       {p.name.split(' ')[0]}
                                     </span>
                                  </div>
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
                          className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-end p-4 z-40"
                        >
                          <motion.div 
                             initial={{ y: 100 }}
                             animate={{ y: 0 }}
                             exit={{ y: 100 }}
                             className="w-full bg-slate-panel/95 backdrop-blur-md border border-slate-border rounded-2xl p-5 shadow-2xl"
                          >
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black text-white italic">IMPORTAR LISTA</h3>
                                <button onClick={() => setShowImport(false)} className="text-slate-muted"><X size={18} /></button>
                             </div>
                             <textarea
                                className="w-full h-32 bg-black/40 border border-slate-border rounded-xl p-3 text-[10px] font-mono outline-none mb-3 text-white placeholder:text-white/20"
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 p-8 text-center">
                        <Target size={48} strokeWidth={1} className="mb-4 opacity-50" />
                        <p className="text-sm font-black italic tracking-widest uppercase">Escale seu time para o sorteio</p>
                      </div>
                    )}
                    </div>
                  </div>
                ) : (
                  <div className="game-card p-4 shrink-0">
                       <div className="text-[10px] font-black text-slate-muted uppercase tracking-widest mb-4 flex justify-between">
                          <span>SELECIONADOS</span>
                          <span className="text-primary-emerald italic">{selectedIds.length} ATLETAS</span>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
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
                                       <span className="text-[7px] font-bold text-white/40 uppercase">T:{p.skill} • V:{p.speed || 5}</span>
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
                              onClick={() => { setIsEditing(null); setShowAddForm(false); setFormData({ name: '', position: 'Meio-campo', skill: 5, speed: 5, instagram: '', isFavorite: false }); }}
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
                                className="w-full bg-black/40 border border-slate-border rounded-xl px-4 py-3.5 text-sm focus:border-primary-emerald outline-none text-white transition-all"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="text"
                                placeholder="Instagram (Ex: @atleta)"
                                className="w-full bg-black/40 border border-slate-border rounded-xl px-4 py-3.5 text-sm focus:border-primary-emerald outline-none text-white transition-all"
                                value={formData.instagram}
                                onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2">
                               <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Posição</label>
                               <select
                                 className="w-full bg-black/40 border border-slate-border rounded-xl px-2 py-3 text-sm outline-none appearance-none text-white font-bold"
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
                                   <div className="text-[7px] font-bold text-white/40 leading-none">T: {p.skill} • V: {p.speed || 5}</div>
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

                  <div className="fixed bottom-24 left-4 right-4 z-30">
                    <button
                      disabled={selectedIds.length < 2}
                      onClick={handleDraw}
                      className="ios-btn-primary h-16 text-lg shadow-2xl backdrop-blur-md bg-primary-emerald/90"
                    >
                      <RefreshCcw size={20} className={cn(selectedIds.length < 2 && "opacity-20", "animate-spin-slow")} />
                      {selectedIds.length < 2 ? "SELECIONE +2" : "SORTEAR TIMES"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6 pb-44">
                  <div className="flex items-center justify-between px-1">
                     <button onClick={() => setDrawResult(null)} className="h-10 w-10 flex items-center justify-center bg-slate-panel border border-slate-border rounded-xl text-slate-muted">
                        <X size={18} />
                     </button>
                     
                     <div className="flex bg-slate-panel/80 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
                        <button 
                          onClick={() => setDrawViewMode('field')}
                          className={cn(
                            "px-6 py-2.5 rounded-xl text-[11px] font-black tracking-widest transition-all uppercase flex items-center gap-2", 
                            drawViewMode === 'field' 
                              ? "bg-primary-emerald text-white shadow-lg shadow-primary-emerald/30 scale-105" 
                              : "text-slate-muted hover:text-white"
                          )}
                        >
                          <Target size={16} className={drawViewMode === 'field' ? "animate-pulse" : ""} />
                          <span>CAMPO</span>
                        </button>
                        <button 
                          onClick={() => setDrawViewMode('list')}
                          className={cn(
                            "px-6 py-2.5 rounded-xl text-[11px] font-black tracking-widest transition-all uppercase flex items-center gap-2", 
                            drawViewMode === 'list' 
                              ? "bg-primary-emerald text-white shadow-lg shadow-primary-emerald/30 scale-105" 
                              : "text-slate-muted hover:text-white"
                          )}
                        >
                          <LayoutList size={16} />
                          <span>LISTA</span>
                        </button>
                     </div>

                     <button 
                        onClick={handleDraw} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-panel border border-slate-border rounded-xl text-primary-emerald font-black text-[10px] active:scale-95 transition-all"
                     >
                        <RefreshCcw size={14} /> RE-SORTEAR
                     </button>
                  </div>

                  <TeamBalanceDashboard result={drawResult} />

                  {drawViewMode === 'field' ? (
                    <div className="flex flex-col items-center py-4 w-full">
                      <div className="soccer-field relative w-full aspect-[4/6] max-w-[350px] mx-auto shrink-0 shadow-2xl border-white/20 select-none overflow-hidden">
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
                                  label={p.name.split(' ').map(n => n[0]).filter((_, i) => i < 2).join('').toUpperCase()}
                                />
                                <div className="mt-1.5 flex flex-col items-center pointer-events-none">
                                  <div className="bg-black border-2 border-white/30 px-2 py-1 rounded shadow-2xl max-w-[85px]">
                                     <span className="text-[10px] font-black text-white uppercase truncate block w-full text-center leading-none tracking-tight">
                                       {p.name.split(' ')[0]}
                                     </span>
                                  </div>
                                </div>
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
                                  label={p.name.split(' ').map(n => n[0]).filter((_, i) => i < 2).join('').toUpperCase()}
                                />
                                <div className="mt-1.5 flex flex-col items-center pointer-events-none">
                                  <div className="bg-black border-2 border-white/30 px-2 py-1 rounded shadow-2xl max-w-[85px]">
                                     <span className="text-[10px] font-black text-white uppercase truncate block w-full text-center leading-none tracking-tight">
                                       {p.name.split(' ')[0]}
                                     </span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Comparison Header */}
                      <div className="grid grid-cols-2 gap-2 pb-4">
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
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <div className={cn("text-[9px] font-black truncate uppercase leading-none mb-0.5", t.color)}>{p.name.split(' ')[0]}</div>
                                         <div className="text-[6px] font-bold text-white/40 truncate uppercase">{p.position}</div>
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

                  <div className="fixed bottom-24 left-4 right-4 z-40 space-y-3">
                     <div className="game-card p-2 border-primary-emerald/30 shadow-2xl">
                        <button onClick={saveToHistory} className="w-full bg-primary-emerald text-white py-4 flex items-center justify-center gap-3 rounded-xl shadow-xl shadow-primary-emerald/20 active:scale-95 transition-all font-black italic text-lg tracking-widest">
                           JOGAR <Trophy size={20} />
                        </button>
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
              className="h-full p-4 overflow-y-auto pb-32"
            >
              <div className="flex justify-between items-end mb-6 px-1">
                <h2 className="text-2xl font-black italic tracking-tighter text-primary-emerald">BASE DE DADOS</h2>
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
                        onClick={() => { setIsEditing(null); setShowAddForm(false); setFormData({ name: '', position: 'Meio-campo', skill: 5, speed: 5, instagram: '', isFavorite: false }); }}
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
                            className="w-full bg-black/40 border border-slate-border rounded-xl px-4 py-3.5 text-sm focus:border-primary-emerald outline-none text-white transition-all"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Instagram (Ex: @atleta)"
                            className="w-full bg-black/40 border border-slate-border rounded-xl px-4 py-3.5 text-sm focus:border-primary-emerald outline-none text-white transition-all"
                            value={formData.instagram}
                            onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-black text-slate-muted uppercase mb-1 block">Posição</label>
                          <select
                            className="w-full bg-black/40 border border-slate-border rounded-xl px-2 py-3 text-sm outline-none appearance-none text-white font-bold"
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
              className="h-full p-4 overflow-y-auto pb-32"
            >
              <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black italic tracking-tighter text-primary-emerald uppercase leading-none">Histórico</h2>
                  <div className="text-[8px] font-black text-slate-muted italic uppercase tracking-widest mt-1">{history.length} PARTIDAS REGISTRADAS</div>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={() => {
                      if(confirm('Deseja apagar TODO o histórico de partidas? Esta ação não pode ser desfeita.')) {
                        setHistory([]);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase border border-red-500/20 active:scale-95 transition-all"
                  >
                    <Trash2 size={12} /> LIMPAR TUDO
                  </button>
                )}
              </div>

              <div className="space-y-6">
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
                          <div key={game.id} className="game-card border-l-4 border-l-amber-500 bg-amber-500/5 relative overflow-hidden">
                             <div className="p-5">
                               <div className="flex justify-between items-start mb-4">
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
                                 <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                       <input 
                                          type="number"
                                          className="w-full bg-black/40 border border-slate-border rounded-xl px-3 py-4 text-center text-xl font-black text-primary-emerald outline-none"
                                          placeholder="TM A"
                                          value={editScoreA}
                                          onChange={e => setEditScoreA(e.target.value)}
                                       />
                                       <div className="text-white opacity-20 font-black">X</div>
                                       <input 
                                          type="number"
                                          className="w-full bg-black/40 border border-slate-border rounded-xl px-3 py-4 text-center text-xl font-black text-blue-500 outline-none"
                                          placeholder="TM B"
                                          value={editScoreB}
                                          onChange={e => setEditScoreB(e.target.value)}
                                       />
                                    </div>
                                    <div className="flex gap-2">
                                       <button onClick={() => updateGameScore(game.id)} className="flex-1 ios-btn-primary h-12 text-xs">FINALIZAR JOGO</button>
                                       <button onClick={() => setEditingHistoryId(null)} className="px-4 bg-white/5 border border-white/10 rounded-xl text-slate-muted text-[10px] font-black uppercase">Sair</button>
                                    </div>
                                 </div>
                               ) : (
                                 <div 
                                   onClick={() => setExpandedHistoryId(expandedHistoryId === game.id ? null : game.id)}
                                   className="cursor-pointer"
                                 >
                                   <div className="flex items-center justify-between">
                                      <div className="text-center flex-1">
                                         <div className="text-[9px] font-bold text-slate-muted mb-1 uppercase">Time Verde</div>
                                         <div className="text-2xl font-black text-white/10 italic">?</div>
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingHistoryId(game.id);
                                          setEditScoreA('');
                                          setEditScoreB('');
                                        }}
                                        className="px-6 py-3 bg-amber-500 text-black rounded-xl font-black text-[10px] uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                      >
                                        DEFINIR PLACAR
                                      </button>
                                      <div className="text-center flex-1">
                                         <div className="text-[9px] font-bold text-slate-muted mb-1 uppercase">Time Azul</div>
                                         <div className="text-2xl font-black text-white/10 italic">?</div>
                                      </div>
                                   </div>
                                   <div className="mt-4 flex justify-center">
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
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <div className="text-[8px] font-black text-primary-emerald uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Verde ({game.teamA.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {game.teamA.players.map(p => (
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-white/60">
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
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-white/60">
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

                    {history.some(g => g.scoreA !== undefined) && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black text-slate-muted uppercase tracking-widest px-1">Encerradas</div>
                        {history.filter(g => g.scoreA !== undefined).map(game => (
                            <div key={game.id} className="game-card border-l-4 border-l-primary-emerald relative overflow-hidden group">
                               <div className="p-5">
                                 <div className="flex justify-between items-start mb-4">
                                    <div className="text-[9px] font-black text-slate-muted italic uppercase tracking-widest">
                                       <span>{game.date}</span>
                                       <span className="text-primary-emerald bg-primary-emerald/10 px-2 py-0.5 rounded ml-2 italic">Δ {game.skillDiff}</span>
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
                                   <div className="space-y-4">
                                      <div className="flex items-center gap-3">
                                         <input 
                                            type="number"
                                            className="w-full bg-black/40 border border-slate-border rounded-xl px-3 py-4 text-center text-xl font-black text-primary-emerald outline-none"
                                            placeholder="TM A"
                                            value={editScoreA}
                                            onChange={e => setEditScoreA(e.target.value)}
                                         />
                                         <div className="text-white opacity-20 font-black">X</div>
                                         <input 
                                            type="number"
                                            className="w-full bg-black/40 border border-slate-border rounded-xl px-3 py-4 text-center text-xl font-black text-blue-500 outline-none"
                                            placeholder="TM B"
                                            value={editScoreB}
                                            onChange={e => setEditScoreB(e.target.value)}
                                         />
                                      </div>
                                      <div className="flex gap-2">
                                         <button onClick={() => updateGameScore(game.id)} className="flex-1 ios-btn-primary h-12 text-xs">ATUALIZAR</button>
                                         <button onClick={() => setEditingHistoryId(null)} className="px-4 bg-white/5 border border-white/10 rounded-xl text-slate-muted text-[10px] font-black uppercase">Sair</button>
                                      </div>
                                   </div>
                                 ) : (
                                    <div 
                                      onClick={() => setExpandedHistoryId(expandedHistoryId === game.id ? null : game.id)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between px-2">
                                         <div className="text-center flex-1">
                                            <div className="text-[9px] font-bold text-slate-muted mb-1 truncate uppercase">Time Verde</div>
                                            <div className="text-3xl font-black text-primary-emerald italic leading-none">
                                              {game.scoreA}
                                            </div>
                                         </div>
                                         <div className="flex flex-col items-center px-4">
                                            <div className="text-xl font-black text-slate-border italic opacity-20 mb-2">X</div>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingHistoryId(game.id);
                                                setEditScoreA(String(game.scoreA));
                                                setEditScoreB(String(game.scoreB));
                                              }}
                                              className="p-2 bg-white/5 text-slate-muted hover:text-primary-emerald rounded-lg"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                         </div>
                                         <div className="text-center flex-1">
                                            <div className="text-[9px] font-bold text-slate-muted mb-1 truncate uppercase">Time Azul</div>
                                            <div className="text-3xl font-black text-blue-500 italic leading-none">
                                              {game.scoreB}
                                            </div>
                                         </div>
                                      </div>
                                      <div className="mt-4 flex justify-center">
                                         <span className="text-[8px] font-bold text-white/10 uppercase tracking-[0.2em] group-hover:text-primary-emerald/30 transition-colors">Clique para ver os times</span>
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
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                       <div className="space-y-2">
                                          <div className="text-[8px] font-black text-primary-emerald uppercase tracking-widest flex items-center gap-1">
                                            <Shield size={8} /> Time Verde ({game.teamA.players.length})
                                          </div>
                                          <div className="space-y-1">
                                            {game.teamA.players.map(p => (
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-white/60">
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
                                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-white/60">
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
                    </>
                  )}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </main>

      {/* Navigation Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-panel/90 backdrop-blur-2xl border-t border-slate-border px-8 pt-3 pb-8 flex justify-between items-center z-50 safe-mb-bottom">
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
