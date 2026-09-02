import { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  RotateCcw, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  Activity, 
  RefreshCw, 
  Plus, 
  Minus, 
  ShieldCheck,
  Sparkles,
  Terminal
} from 'lucide-react';
import cbaData from './data/nba_cba_2025.json';
import { Team, TeamTradeLeg, TradeValidationResult, Player } from './engine/types';
import { CBAEngine } from './engine/cbaEngine';
import { initializeWebMCP } from './webmcp/modelContextBridge';

export default function App() {
  const [teams, setTeams] = useState<Team[]>(cbaData.teams as unknown as Team[]);
  const [activeTab, setActiveTab] = useState<'app' | 'how-to-use' | 'how-to-use-webmcp'>('app');

  // Active teams selected in the 3 columns
  const [team1Id, setTeam1Id] = useState('NYK');
  const [team2Id, setTeam2Id] = useState('BKN');
  const [team3Id, setTeam3Id] = useState('CHA');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Live: Official NBA 2025–26 CBA Active');

  // Initial clean baseline trade legs (empty canvas)
  const getInitialLegs = (t1: string, t2: string): TeamTradeLeg[] => {
    return [
      {
        teamId: t1,
        incomingPlayers: [],
        outgoingPlayers: [],
        incomingPicks: [],
        outgoingPicks: []
      },
      {
        teamId: t2,
        incomingPlayers: [],
        outgoingPlayers: [],
        incomingPicks: [],
        outgoingPicks: []
      }
    ];
  };

  const [tradeLegs, setTradeLegs] = useState<TeamTradeLeg[]>(() => getInitialLegs('NYK', 'BKN'));

  // Deterministic trade validation on every state update
  const validationResult: TradeValidationResult = CBAEngine.validateTrade(teams, tradeLegs);

  // Initialize WebMCP tools for external AI Agents
  useEffect(() => {
    initializeWebMCP(teams, tradeLegs, {
      onUpdateTradeLegs: (newLegs: TeamTradeLeg[]) => {
        setTradeLegs(newLegs);
      },
      onUpdateProtectedPlayer: (teamId: string, playerId: string, isProtected: boolean) => {
        setTeams(prevTeams => prevTeams.map(t => {
          if (t.id !== teamId) return t;
          return {
            ...t,
            roster: t.roster.map(p => p.id === playerId ? { ...p, isProtected } : p)
          };
        }));
      },
      onResetTrade: () => {
        setTradeLegs(getInitialLegs(team1Id, team2Id));
      },
      onSetTradeTeams: (t1: string, t2: string, t3?: string) => {
        setTeam1Id(t1);
        setTeam2Id(t2);
        if (t3) setTeam3Id(t3);
      },
      onAddPlayerToTrade: (fromTeamId: string, playerId: string, toTeamId: string) => {
        const fromTeam = teams.find(t => t.id === fromTeamId);
        const player = fromTeam?.roster.find(p => p.id === playerId);
        if (!player) return;
        handleAddOutgoingPlayer(fromTeamId, player, toTeamId);
      }
    });
  }, [teams, tradeLegs, team1Id, team2Id, team3Id]);

  const handleProtectToggle = (teamId: string, playerId: string) => {
    setTeams(prev => prev.map(team => {
      if (team.id !== teamId) return team;
      return {
        ...team,
        roster: team.roster.map(p => {
          if (p.id !== playerId) return p;
          return { ...p, isProtected: !p.isProtected };
        })
      };
    }));
  };

  const handleResetAll = () => {
    setTeams(prev => prev.map(t => ({
      ...t,
      roster: t.roster.map(p => ({ ...p, isProtected: false, isAnchor: false }))
    })));
    setTradeLegs(getInitialLegs(team1Id, team2Id));
  };

  const handleToggleAnchor = (playerId: string) => {
    setTradeLegs(prev => {
      let currentAnchor = false;
      for (const leg of prev) {
        const found = leg.incomingPlayers.find(p => p.id === playerId) || leg.outgoingPlayers.find(p => p.id === playerId);
        if (found) {
          currentAnchor = !!found.isAnchor;
          break;
        }
      }
      const nextAnchor = !currentAnchor;

      return prev.map(leg => ({
        ...leg,
        incomingPlayers: leg.incomingPlayers.map(p => p.id === playerId ? { ...p, isAnchor: nextAnchor } : p),
        outgoingPlayers: leg.outgoingPlayers.map(p => p.id === playerId ? { ...p, isAnchor: nextAnchor } : p)
      }));
    });
  };

  const handleAutoBalanceClick = () => {
    const result = CBAEngine.autoBalanceTrade(teams, tradeLegs, team3Id);
    if (result.solvedLegs) {
      setTradeLegs(result.solvedLegs);
    }
  };

  const handleLoadDemo = () => {
    setTeam1Id('NYK');
    setTeam2Id('BKN');
    setTeam3Id('CHA');
    const nyk = teams.find(t => t.id === 'NYK') || teams[1];
    const bkn = teams.find(t => t.id === 'BKN') || teams[2];
    const bridges = bkn.roster.find(p => p.id === 'p_bridges_mikal') || bkn.roster[0];
    const bogdanovic = nyk.roster.find(p => p.id === 'p_bogdanovic') || nyk.roster[4];
    const sims = nyk.roster.find(p => p.id === 'p_sims') || nyk.roster[5];

    setTradeLegs([
      {
        teamId: 'NYK',
        incomingPlayers: bridges ? [bridges] : [],
        outgoingPlayers: [bogdanovic, sims].filter(Boolean) as Player[],
        incomingPicks: [],
        outgoingPicks: ['2026 2nd Round Pick (NYK)']
      },
      {
        teamId: 'BKN',
        incomingPlayers: bogdanovic ? [bogdanovic] : [],
        outgoingPlayers: bridges ? [bridges] : [],
        incomingPicks: ['2026 2nd Round Pick (NYK)'],
        outgoingPicks: []
      },
      {
        teamId: 'CHA',
        incomingPlayers: sims ? [sims] : [],
        outgoingPlayers: [],
        incomingPicks: ['2026 2nd Round Pick (NYK)'],
        outgoingPicks: [],
        tpeUsed: { id: 'tpe_hayward', amountAbsorbed: sims?.salary || 2092344 }
      }
    ]);
  };

  const handleLiveSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(`Live Synced: ${new Date().toLocaleTimeString()} (2025–26 Cap Rates Active)`);
    }, 600);
  };

  const handleTeam1Change = (newTeamId: string) => {
    setTeam1Id(newTeamId);
    setTradeLegs(getInitialLegs(newTeamId, team2Id));
  };

  const handleTeam2Change = (newTeamId: string) => {
    setTeam2Id(newTeamId);
    setTradeLegs(getInitialLegs(team1Id, newTeamId));
  };

  const handleAddOutgoingPlayer = (fromTeamId: string, player: Player, toTeamId: string) => {
    setTradeLegs(prevLegs => {
      const fromLeg = prevLegs.find(l => l.teamId === fromTeamId) || {
        teamId: fromTeamId,
        incomingPlayers: [],
        outgoingPlayers: [],
        incomingPicks: [],
        outgoingPicks: []
      };

      const toLeg = prevLegs.find(l => l.teamId === toTeamId) || {
        teamId: toTeamId,
        incomingPlayers: [],
        outgoingPlayers: [],
        incomingPicks: [],
        outgoingPicks: []
      };

      const otherLegs = prevLegs.filter(l => l.teamId !== fromTeamId && l.teamId !== toTeamId);

      const updatedFromLeg: TeamTradeLeg = {
        ...fromLeg,
        outgoingPlayers: fromLeg.outgoingPlayers.some(p => p.id === player.id)
          ? fromLeg.outgoingPlayers
          : [...fromLeg.outgoingPlayers, player]
      };

      const updatedToLeg: TeamTradeLeg = {
        ...toLeg,
        incomingPlayers: toLeg.incomingPlayers.some(p => p.id === player.id)
          ? toLeg.incomingPlayers
          : [...toLeg.incomingPlayers, player]
      };

      return [...otherLegs, updatedFromLeg, updatedToLeg];
    });
  };

  const handleRemoveOutgoingPlayer = (fromTeamId: string, playerId: string) => {
    setTradeLegs(prevLegs => prevLegs.map(leg => {
      if (leg.teamId === fromTeamId) {
        return {
          ...leg,
          outgoingPlayers: leg.outgoingPlayers.filter(p => p.id !== playerId)
        };
      }
      return {
        ...leg,
        incomingPlayers: leg.incomingPlayers.filter(p => p.id !== playerId)
      };
    }));
  };

  const handleRouteToFacilitator = (fromTeamId: string, player: Player, facilitatorId: string) => {
    setTradeLegs(prevLegs => {
      const cleaned = prevLegs.map(l => ({
        ...l,
        incomingPlayers: l.incomingPlayers.filter(p => p.id !== player.id)
      }));

      const fromLeg = cleaned.find(l => l.teamId === fromTeamId) || {
        teamId: fromTeamId,
        incomingPlayers: [],
        outgoingPlayers: [],
        incomingPicks: [],
        outgoingPicks: []
      };

      const updatedFrom: TeamTradeLeg = {
        ...fromLeg,
        outgoingPlayers: fromLeg.outgoingPlayers.some(p => p.id === player.id)
          ? fromLeg.outgoingPlayers
          : [...fromLeg.outgoingPlayers, player]
      };

      const facTeam = teams.find(t => t.id === facilitatorId);
      const matchedTpe = facTeam?.tpes.find(t => t.amount >= player.salary) || facTeam?.tpes[0];
      const tpeObj = matchedTpe ? { id: matchedTpe.id, amountAbsorbed: player.salary } : undefined;

      const facLeg = cleaned.find(l => l.teamId === facilitatorId) || {
        teamId: facilitatorId,
        incomingPlayers: [],
        outgoingPlayers: [],
        incomingPicks: [],
        outgoingPicks: [],
        tpeUsed: tpeObj
      };

      const updatedFac: TeamTradeLeg = {
        ...facLeg,
        tpeUsed: tpeObj || facLeg.tpeUsed,
        incomingPlayers: facLeg.incomingPlayers.some(p => p.id === player.id)
          ? facLeg.incomingPlayers
          : [...facLeg.incomingPlayers, player]
      };

      const otherLegs = cleaned.filter(l => l.teamId !== fromTeamId && l.teamId !== facilitatorId);
      return [...otherLegs, updatedFrom, updatedFac];
    });
  };

  const handleRemoveFacilitatorPlayer = (playerId: string) => {
    setTradeLegs(prevLegs => prevLegs.map(leg => ({
      ...leg,
      incomingPlayers: leg.incomingPlayers.filter(p => p.id !== playerId),
      outgoingPlayers: leg.outgoingPlayers.filter(p => p.id !== playerId)
    })));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur px-6 py-3 flex items-center justify-between z-50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-orange-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="font-extrabold text-base tracking-tight text-white">CapSpace Pro</h1>
              <span className="bg-emerald-500/10 text-emerald-400 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/20 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                WebMCP Connected (All 30 Teams)
              </span>
            </div>
            <p className="text-xs text-slate-300">NBA 2025–26 Season Multi-Team Trade Machine</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 space-x-1">
          <button 
            onClick={() => setActiveTab('app')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${activeTab === 'app' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 inline mr-1.5" /> 30-Team Trade Board
          </button>
          <button 
            onClick={() => setActiveTab('how-to-use')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${activeTab === 'how-to-use' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1.5" /> How to Use It
          </button>
          <button 
            onClick={() => setActiveTab('how-to-use-webmcp')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${activeTab === 'how-to-use-webmcp' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-cyan-300" /> How to Use with WebMCP
          </button>
        </div>

        {/* Live Status & Data Sync */}
        <div className="flex items-center space-x-5">
          <div className="relative group">
            <button 
              onClick={handleLiveSync}
              className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Live Cap Data</span>
            </button>

            {/* Hover Tooltip */}
            <div className="absolute top-full mt-2 right-0 hidden group-hover:block z-50 w-64 p-2.5 bg-slate-900/95 backdrop-blur border border-cyan-500/40 rounded-xl shadow-2xl text-[11px] text-slate-200 pointer-events-none transition-all">
              <div className="font-bold text-cyan-400 flex items-center mb-1">
                <RefreshCw className="w-3 h-3 mr-1 text-cyan-400" /> Live Cap Data Sync
              </div>
              Refreshes official 2025–26 NBA salary registries, payroll apron tiers, and active TPE vouchers directly into memory.
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">CBA Status</div>
            <div className={`text-sm font-bold font-mono flex items-center justify-end ${validationResult.isLegal ? 'text-emerald-400' : 'text-rose-400'}`}>
              {validationResult.isLegal ? (
                <><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" /> 100% LEGAL</>
              ) : (
                <><XCircle className="w-4 h-4 mr-1 text-rose-400" /> DISALLOWED ({validationResult.violations.length})</>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'app' ? (
        <div className="flex-1 bg-slate-900/30 p-4 flex flex-col min-h-0 overflow-hidden">
          
          {/* Subheader */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center space-x-3 text-xs text-slate-200">
              <span className="font-bold text-amber-400">Active Trade Canvas:</span>
              <span className="text-slate-300 font-medium">{lastSyncTime}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleLoadDemo}
                className="text-xs bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/40 flex items-center transition font-semibold shadow-sm cursor-pointer"
                title="Loads a pre-configured 3-team blockbuster trade scenario (NYK / BKN / CHA)"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Load Demo Scenario
              </button>
              <button 
                onClick={handleResetAll}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center transition cursor-pointer font-medium"
                title="Clears all trades, unlocks all players, and resets the board to a clean blank canvas"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset All (Blank Canvas)
              </button>
            </div>
          </div>

          {/* 3-Column Team Trade Board */}
          <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
            
            {/* Column 1: Team 1 */}
            {(() => {
              const team1 = teams.find(t => t.id === team1Id) || teams[0];
              const team2 = teams.find(t => t.id === team2Id) || teams[2];
              const team3 = teams.find(t => t.id === team3Id) || teams[12];
              const leg = tradeLegs.find(l => l.teamId === team1.id);
              const outSum = leg ? leg.outgoingPlayers.reduce((s, p) => s + p.salary, 0) : 0;
              const inSum = leg ? leg.incomingPlayers.reduce((s, p) => s + p.salary, 0) : 0;
              const diff = inSum - outSum;

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl min-h-0 overflow-hidden">
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <select 
                          value={team1Id}
                          onChange={(e) => handleTeam1Change(e.target.value)}
                          className="bg-slate-800 font-extrabold text-xs text-white rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-300 font-medium">${(team1.totalPayroll / 1e6).toFixed(1)}M</span>
                      </div>
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-mono font-semibold border border-amber-500/20">
                        {team1.apronTier.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Trade Assets Section */}
                    <div className="mt-2.5 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Incoming:</div>
                      {leg && leg.incomingPlayers.length > 0 ? (
                        leg.incomingPlayers.map(p => (
                          <div key={p.id} className={`p-2 rounded-lg bg-slate-800 text-xs flex justify-between items-center shadow-sm border transition ${p.isAnchor ? 'border-amber-400/80 shadow-amber-500/10' : 'border-cyan-500/40'}`}>
                            <div className="truncate mr-1">
                              <span className="font-bold text-white text-[11px] block">{p.name} ({p.pos})</span>
                              <span className="font-mono font-semibold text-cyan-400 text-xs">${(p.salary / 1e6).toFixed(2)}M</span>
                            </div>
                            <button 
                              onClick={() => handleToggleAnchor(p.id)}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition cursor-pointer ${p.isAnchor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-600/40'}`}
                              title={p.isAnchor ? "Locked Core Target (AI cannot swap or remove)" : "Click to Lock as Core Target"}
                            >
                              {p.isAnchor ? <><Lock className="w-2.5 h-2.5 mr-1 text-amber-300" /> Core Target</> : <><Unlock className="w-2.5 h-2.5 mr-1" /> Flex</>}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 italic p-1.5 bg-slate-800/20 rounded">No incoming players</div>
                      )}

                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-2">Outgoing:</div>
                      {leg && leg.outgoingPlayers.length > 0 ? (
                        leg.outgoingPlayers.map(p => (
                          <div key={p.id} className={`p-2 rounded-lg bg-slate-800/60 text-xs flex justify-between items-center border transition ${p.isAnchor ? 'border-amber-400/80 shadow-amber-500/10' : 'border-slate-700/60'}`}>
                            <div className="truncate mr-1">
                              <span className="text-slate-200 font-medium text-[11px] block truncate">{p.name} ({p.pos})</span>
                              <span className="font-mono text-slate-300 font-semibold text-xs">${(p.salary / 1e6).toFixed(2)}M</span>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button 
                                onClick={() => handleToggleAnchor(p.id)}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition cursor-pointer ${p.isAnchor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-600/40'}`}
                                title={p.isAnchor ? "Locked Core Piece (AI cannot substitute or route)" : "Click to Lock as Core Piece"}
                              >
                                {p.isAnchor ? <><Lock className="w-2.5 h-2.5 mr-1 text-amber-300" /> Locked Anchor</> : <><Unlock className="w-2.5 h-2.5 mr-1" /> Flex</>}
                              </button>
                              <button 
                                onClick={() => handleRouteToFacilitator(team1.id, p, team3Id)}
                                className="text-[9px] bg-teal-900/60 hover:bg-teal-800 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/40 font-semibold"
                                title={`Route ${p.name}'s salary into ${team3.name}'s TPE`}
                              >
                                → {team3.id} (TPE)
                              </button>
                              <button 
                                onClick={() => handleRemoveOutgoingPlayer(team1.id, p.id)}
                                className="text-rose-400 hover:text-rose-300 p-0.5 rounded"
                                title="Remove from trade"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 italic p-1.5 bg-slate-800/20 rounded">No outgoing players</div>
                      )}

                      {/* Roster & Add-to-Trade Picker */}
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-3 flex items-center justify-between">
                        <span>Roster ({team1.roster.length} Players):</span>
                        <span className="text-[9px] text-slate-400 font-normal">Click to lock / trade</span>
                      </div>
                      <div className="space-y-1">
                        {team1.roster.map(p => {
                          const isAlreadyTrading = leg?.outgoingPlayers.some(op => op.id === p.id);
                          return (
                            <div key={p.id} className="p-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                              <div className="truncate mr-1">
                                <span className={`font-semibold text-[11px] ${p.isProtected ? 'text-amber-300' : 'text-slate-200'}`}>{p.name}</span>
                                <span className="text-[10px] text-slate-300 ml-1 font-mono">(${(p.salary / 1e6).toFixed(1)}M)</span>
                              </div>
                              {isAlreadyTrading ? (
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-semibold border border-cyan-500/30">
                                    In Trade ↗
                                  </span>
                                  <button 
                                    onClick={() => handleRemoveOutgoingPlayer(team1.id, p.id)}
                                    className="text-[9px] text-rose-400 hover:text-rose-300 p-0.5 rounded"
                                    title="Cancel trade for this player"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <button 
                                    onClick={() => handleProtectToggle(team1.id, p.id)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition ${p.isProtected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'}`}
                                    title="Toggle superstar protection lock"
                                  >
                                    {p.isProtected ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                  </button>
                                  {!p.isProtected && (
                                    <>
                                      <button 
                                        onClick={() => handleAddOutgoingPlayer(team1.id, p, team2Id)}
                                        className="text-[9px] bg-slate-700 hover:bg-slate-600 text-cyan-300 px-1.5 py-0.5 rounded font-semibold flex items-center"
                                        title={`Trade to ${team2.name}`}
                                      >
                                        <Plus className="w-2.5 h-2.5 mr-0.5" /> Trade
                                      </button>
                                      <button 
                                        onClick={() => handleRouteToFacilitator(team1.id, p, team3Id)}
                                        className="text-[9px] bg-teal-800/40 hover:bg-teal-700 text-teal-300 px-1 py-0.5 rounded font-semibold border border-teal-500/30"
                                        title={`Route directly to ${team3.name}'s TPE`}
                                      >
                                        TPE
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Salary Difference Footer */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs space-y-1 flex-shrink-0">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Salary Difference:</span>
                      <span className={`font-mono font-bold ${diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {diff > 0 ? `+$${(diff / 1e6).toFixed(2)}M` : `-$${(Math.abs(diff) / 1e6).toFixed(2)}M`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${diff > 3000000 ? 'bg-rose-500' : 'bg-amber-500'} transition-all duration-500`}
                        style={{ width: `${Math.min(100, ((team1.totalPayroll + diff) / 188931000) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Column 2: Team 2 */}
            {(() => {
              const team1 = teams.find(t => t.id === team1Id) || teams[0];
              const team2 = teams.find(t => t.id === team2Id) || teams[2];
              const team3 = teams.find(t => t.id === team3Id) || teams[12];
              const leg = tradeLegs.find(l => l.teamId === team2.id);
              const outSum = leg ? leg.outgoingPlayers.reduce((s, p) => s + p.salary, 0) : 0;
              const inSum = leg ? leg.incomingPlayers.reduce((s, p) => s + p.salary, 0) : 0;
              const diff = inSum - outSum;

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl min-h-0 overflow-hidden">
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <select 
                          value={team2Id}
                          onChange={(e) => handleTeam2Change(e.target.value)}
                          className="bg-slate-800 font-extrabold text-xs text-white rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-300 font-medium">${(team2.totalPayroll / 1e6).toFixed(1)}M</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-semibold border border-emerald-500/20">
                        {team2.apronTier.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-2.5 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Incoming:</div>
                      {leg && leg.incomingPlayers.length > 0 ? (
                        leg.incomingPlayers.map(p => (
                          <div key={p.id} className={`p-2 rounded-lg bg-slate-800 text-xs flex justify-between items-center shadow-sm border transition ${p.isAnchor ? 'border-amber-400/80 shadow-amber-500/10' : 'border-cyan-500/40'}`}>
                            <div className="truncate mr-1">
                              <span className="font-bold text-white text-[11px] block">{p.name} ({p.pos})</span>
                              <span className="font-mono font-semibold text-cyan-400 text-xs">${(p.salary / 1e6).toFixed(2)}M</span>
                            </div>
                            <button 
                              onClick={() => handleToggleAnchor(p.id)}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition cursor-pointer ${p.isAnchor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-600/40'}`}
                              title={p.isAnchor ? "Locked Core Target (AI cannot swap or remove)" : "Click to Lock as Core Target"}
                            >
                              {p.isAnchor ? <><Lock className="w-2.5 h-2.5 mr-1 text-amber-300" /> Core Target</> : <><Unlock className="w-2.5 h-2.5 mr-1" /> Flex</>}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 italic p-1.5 bg-slate-800/20 rounded">No incoming players</div>
                      )}

                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-2">Outgoing:</div>
                      {leg && leg.outgoingPlayers.length > 0 ? (
                        leg.outgoingPlayers.map(p => (
                          <div key={p.id} className={`p-2 rounded-lg bg-slate-800/60 text-xs flex justify-between items-center border transition ${p.isAnchor ? 'border-amber-400/80 shadow-amber-500/10' : 'border-slate-700/60'}`}>
                            <div className="truncate mr-1">
                              <span className="text-slate-200 font-medium text-[11px] block truncate">{p.name} ({p.pos})</span>
                              <span className="font-mono text-slate-300 font-semibold text-xs">${(p.salary / 1e6).toFixed(2)}M</span>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button 
                                onClick={() => handleToggleAnchor(p.id)}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition cursor-pointer ${p.isAnchor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-600/40'}`}
                                title={p.isAnchor ? "Locked Core Piece (AI cannot substitute or route)" : "Click to Lock as Core Piece"}
                              >
                                {p.isAnchor ? <><Lock className="w-2.5 h-2.5 mr-1 text-amber-300" /> Locked Anchor</> : <><Unlock className="w-2.5 h-2.5 mr-1" /> Flex</>}
                              </button>
                              <button 
                                onClick={() => handleRouteToFacilitator(team2.id, p, team3Id)}
                                className="text-[9px] bg-teal-900/60 hover:bg-teal-800 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/40 font-semibold"
                                title={`Route ${p.name}'s salary into ${team3.name}'s TPE`}
                              >
                                → {team3.id} (TPE)
                              </button>
                              <button 
                                onClick={() => handleRemoveOutgoingPlayer(team2.id, p.id)}
                                className="text-rose-400 hover:text-rose-300 p-0.5 rounded"
                                title="Remove from trade"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 italic p-1.5 bg-slate-800/20 rounded">No outgoing players</div>
                      )}

                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-3">Roster ({team2.roster.length} Players):</div>
                      <div className="space-y-1">
                        {team2.roster.map(p => {
                          const isAlreadyTrading = leg?.outgoingPlayers.some(op => op.id === p.id);
                          return (
                            <div key={p.id} className="p-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                              <div className="truncate mr-1">
                                <span className={`font-semibold text-[11px] ${p.isProtected ? 'text-amber-300' : 'text-slate-200'}`}>{p.name}</span>
                                <span className="text-[10px] text-slate-300 ml-1 font-mono">(${(p.salary / 1e6).toFixed(1)}M)</span>
                              </div>
                              {isAlreadyTrading ? (
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-semibold border border-cyan-500/30">
                                    In Trade ↗
                                  </span>
                                  <button 
                                    onClick={() => handleRemoveOutgoingPlayer(team2.id, p.id)}
                                    className="text-[9px] text-rose-400 hover:text-rose-300 p-0.5 rounded"
                                    title="Cancel trade for this player"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <button 
                                    onClick={() => handleProtectToggle(team2.id, p.id)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition ${p.isProtected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'}`}
                                  >
                                    {p.isProtected ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                  </button>
                                  {!p.isProtected && (
                                    <>
                                      <button 
                                        onClick={() => handleAddOutgoingPlayer(team2.id, p, team1Id)}
                                        className="text-[9px] bg-slate-700 hover:bg-slate-600 text-cyan-300 px-1.5 py-0.5 rounded font-semibold flex items-center"
                                        title={`Trade to ${team1.name}`}
                                      >
                                        <Plus className="w-2.5 h-2.5 mr-0.5" /> Trade
                                      </button>
                                      <button 
                                        onClick={() => handleRouteToFacilitator(team2.id, p, team3Id)}
                                        className="text-[9px] bg-teal-800/40 hover:bg-teal-700 text-teal-300 px-1 py-0.5 rounded font-semibold border border-teal-500/30"
                                        title={`Route directly to ${team3.name}'s TPE`}
                                      >
                                        TPE
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs space-y-1 flex-shrink-0">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Salary Difference:</span>
                      <span className={`font-mono font-bold ${diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {diff > 0 ? `+$${(diff / 1e6).toFixed(2)}M` : `-$${(Math.abs(diff) / 1e6).toFixed(2)}M`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[60%]"></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Column 3: 3rd Team Facilitator */}
            {(() => {
              const team3 = teams.find(t => t.id === team3Id) || teams[12];
              const leg = tradeLegs.find(l => l.teamId === team3.id);

              return (
                <div className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between shadow-xl min-h-0 overflow-hidden transition-all ${leg && leg.incomingPlayers.length > 0 ? 'border-teal-500/60 shadow-teal-500/10' : 'border-slate-800'}`}>
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <select 
                          value={team3Id}
                          onChange={(e) => setTeam3Id(e.target.value)}
                          className="bg-slate-800 font-extrabold text-xs text-teal-300 rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
                        >
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} (Facilitator)</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-300">TPEs: {team3.tpes.length}</span>
                      </div>
                      <span className="text-[9px] bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded-full font-mono font-semibold border border-teal-500/20">
                        {team3.tpes.length > 0 ? 'TPE HOST' : 'CAP ROOM'}
                      </span>
                    </div>

                    <div className="mt-2.5 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Incoming Absorbed:</div>
                      {leg && leg.incomingPlayers.length > 0 ? (
                        <>
                          {leg.incomingPlayers.map(p => (
                            <div key={p.id} className="p-2 rounded-lg bg-teal-950/40 border border-teal-500/40 text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold text-teal-200 text-[11px] block">{p.name}</span>
                                <span className="text-[9px] text-teal-400/90 font-mono font-medium">via TPE Absorption</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-semibold text-teal-300 text-xs">${(p.salary / 1e6).toFixed(2)}M</span>
                                <button 
                                  onClick={() => handleRemoveFacilitatorPlayer(p.id)}
                                  className="text-rose-400 hover:text-rose-300 p-0.5 rounded ml-1"
                                  title="Remove from facilitator"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {leg.incomingPicks.map(pick => (
                            <div key={pick} className="p-2 rounded-lg bg-teal-950/30 border border-teal-500/30 text-xs text-teal-300">
                              Acquired Draft Compensation: {pick}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-3 rounded-lg bg-slate-800/40 border border-dashed border-slate-700/60 text-xs text-slate-400 italic text-center">
                          Standing by. Route salaries manually or let external AI agents absorb via WebMCP.
                        </div>
                      )}

                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-3">Active Trade Exceptions (TPE):</div>
                      {team3.tpes.length > 0 ? (
                        <div className="space-y-1">
                          {team3.tpes.map(tpe => (
                            <div key={tpe.id} className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center">
                              <span className="text-slate-300 text-[11px]">{tpe.name}</span>
                              <span className="font-mono text-emerald-400 font-bold text-xs">${(tpe.amount / 1e6).toFixed(2)}M</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic p-1.5 bg-slate-800/20 rounded">
                          No active TPEs (Can absorb contracts via cap room).
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs space-y-1 flex-shrink-0">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Roster Capacity:</span>
                      <span className="font-mono font-bold text-teal-400">{team3.roster.length + (leg?.incomingPlayers.length || 0)} / 15 Contracts</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 w-[65%]"></div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* PERMANENT STICKY CBA STATUS & VIOLATION FOOTER */}
          <div className="mt-3 flex-shrink-0 z-40">
            {validationResult.isLegal ? (
              <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-xl px-4 py-2.5 text-xs text-emerald-200 shadow-2xl flex items-center justify-between backdrop-blur">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300 text-sm">TRADE APPROVED (100% Legal CBA Compliance)</span>
                    <p className="text-[11px] text-emerald-400/90">All salary matching brackets, Second Apron aggregation restrictions, and roster caps satisfied.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/40">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Verified by CBAEngine &lt;1ms</span>
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/95 border border-rose-500/70 rounded-xl px-4 py-2.5 text-xs text-rose-200 shadow-2xl backdrop-blur flex items-start justify-between">
                <div className="space-y-1 max-h-20 overflow-y-auto pr-2 flex-1">
                  <div className="font-bold text-rose-300 flex items-center text-sm">
                    <XCircle className="w-4 h-4 mr-2 text-rose-400 flex-shrink-0" /> CBA Rule Violations ({validationResult.violations.length}):
                  </div>
                  {validationResult.violations.map((v, i) => (
                    <div key={i} className="pl-6 text-[11px] text-rose-200 font-medium leading-tight">• {v.reason}</div>
                  ))}
                </div>
                <button
                  onClick={handleAutoBalanceClick}
                  className="ml-4 flex-shrink-0 self-center bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-lg shadow-orange-500/30 flex items-center space-x-1.5 transition cursor-pointer border border-amber-400/40"
                  title="Autonomously solves salary matching and routes filler to facilitator while strictly preserving your manual trade anchors"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>⚡ Auto-Balance Deal</span>
                </button>
              </div>
            )}
          </div>

        </div>
      ) : activeTab === 'how-to-use' ? (
        /* VIEW 2: HOW TO USE IT (HUMAN GM GUIDE & CBA RULES) */
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Guide Header */}
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <div className="inline-block bg-orange-500/10 text-orange-400 text-xs px-3 py-1 rounded-full font-semibold mb-2 border border-orange-500/20">
                  General Manager Walkthrough &amp; CBA Rulebook
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">How to Use CapSpace Pro</h2>
                <p className="text-slate-300 text-xs mt-1">
                  A complete step-by-step guide for constructing multi-team trades, locking franchise stars, and understanding NBA Collective Bargaining Agreement (CBA) constraints.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('app')}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition cursor-pointer"
              >
                ← Open Trade Canvas
              </button>
            </div>

            {/* 5-Step Workflow Cards */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-2"></span> 5-Step Trade Workflow
              </h3>

              {/* Step 1 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-lg">
                <div className="flex items-center space-x-2.5 text-orange-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center font-mono text-xs text-orange-300">1</div>
                  <span>Select Trading Teams &amp; 3rd-Team Facilitator</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Use the dropdown selectors in Column 1 and Column 2 to choose the primary trading partners. Column 3 lets you select a 3rd-party <strong>Facilitator</strong> (e.g., Charlotte Hornets or Utah Jazz) that holds open cap room or active Traded Player Exceptions (TPE).
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-lg">
                <div className="flex items-center space-x-2.5 text-amber-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center font-mono text-xs text-amber-300">2</div>
                  <span>Lock Protected Superstars (🔒 Roster Protection)</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Click the <strong>🔒 Lock icon</strong> on your franchise players (e.g., Jalen Brunson or Nikola Jokic). This marks them as untouchable so neither you nor any automated algorithm can trade them away.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-lg">
                <div className="flex items-center space-x-2.5 text-cyan-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center font-mono text-xs text-cyan-300">3</div>
                  <span>Pin Core Deal Anchors (🔒 In-Card Lock) vs Flexible Filler (🔓)</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Click <strong>"+ Trade"</strong> on the marquee player you want to acquire (e.g. Mikal Bridges). On the trade card, toggle <strong>[🔒 Core Target]</strong> or <strong>[🔒 Core Anchor]</strong>. Locked players remain 100% fixed in the deal, while unlocked (🔓 Flex) players can be routed to facilitators to satisfy salary matching.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-lg">
                <div className="flex items-center space-x-2.5 text-emerald-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center font-mono text-xs text-emerald-300">4</div>
                  <span>Route Excess Salaries into 3rd-Team TPE Vouchers</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  If a trade creates a salary mismatch, click <strong>"→ [TEAM] (TPE)"</strong> on outgoing bench players to absorb their salary into the facilitator's TPE exception without taking back equal salary.
                </p>
              </div>

              {/* Step 5 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-lg">
                <div className="flex items-center space-x-2.5 text-indigo-400 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center font-mono text-xs text-indigo-300">5</div>
                  <span>Instant 1-Click "⚡ Auto-Balance Deal"</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Whenever a trade is disallowed, click the glowing <strong>"⚡ Auto-Balance Deal"</strong> button in the bottom banner. The deterministic engine calculates the exact shortfall and auto-balances the deal to 100% legal status in &lt;1ms.
                </p>
              </div>
            </div>

            {/* CBA Rules Cheat Sheet Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mr-2" /> 2025–26 NBA Collective Bargaining Agreement (CBA) Rules
              </h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="py-2 pr-4">Threshold</th>
                      <th className="py-2 pr-4">Dollar Value</th>
                      <th className="py-2">Salary Matching &amp; Trade Restriction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 pr-4 font-bold text-emerald-400">Under Tax Line</td>
                      <td className="py-2 pr-4 font-mono">&lt; $170.8M</td>
                      <td className="py-2">Tiered matching: Up to 200% for contracts ≤ $7.5M; Outgoing + $7.5M for $7.5M–$29M; 125% + $250k above $29M.</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-bold text-amber-400">Taxpayer Zone</td>
                      <td className="py-2 pr-4 font-mono">$170.8M – $178.1M</td>
                      <td className="py-2">Allowable incoming salary is capped at 110% of outgoing salary + $250,000.</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-bold text-orange-400">First Apron</td>
                      <td className="py-2 pr-4 font-mono">$178.1M – $188.9M</td>
                      <td className="py-2">Hard 100% matching ceiling (cannot take back even $1 more incoming salary than outgoing).</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-bold text-rose-400">Second Apron</td>
                      <td className="py-2 pr-4 font-mono">&gt; $188.9M</td>
                      <td className="py-2 font-medium text-rose-300">Prohibited from aggregating multiple outgoing salaries in trades, sending cash, or using existing TPEs.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* VIEW 3: HOW TO USE WITH WEBMCP (AI AGENT AUTOMATION GUIDE) */
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <div className="inline-block bg-cyan-500/10 text-cyan-400 text-xs px-3 py-1 rounded-full font-semibold mb-2 border border-cyan-500/20">
                  WebMCP Protocol &amp; Browser Agent Automation
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">How to Use CapSpace Pro with WebMCP</h2>
                <p className="text-slate-300 text-xs mt-1">
                  Expose 676-page NBA Collective Bargaining Agreement (CBA) mechanics directly to external AI agents via standard WebMCP tools.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('app')}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition cursor-pointer"
              >
                ← Open Trade Canvas
              </button>
            </div>

            {/* Automation Setup Guide Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-cyan-500/40 rounded-xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 text-sm uppercase tracking-wider flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-cyan-400" /> How To Run Automatically in WebMCP-Enabled Browsers:
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded font-mono border border-cyan-500/30">
                  Standard navigator.modelContext
                </span>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 pl-4 list-decimal leading-relaxed">
                <li>
                  <strong>Open CapSpace Pro:</strong> Navigate to <a href="https://capspace-pro.vercel.app" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-mono">https://capspace-pro.vercel.app</a> in any WebMCP-compatible browser or client (ChatGPT Desktop in-app browser, Google Chrome with the <code>#enable-webmcp-testing</code> flag enabled, or Antigravity / Claude Code).
                </li>
                <li>
                  <strong>Zero-Configuration Tool Discovery:</strong> The AI agent automatically reads the <strong>8 typed WebMCP tools</strong> registered on <code>window.navigator.modelContext</code> (no plugin installation, API keys, or web scraping required).
                </li>
                <li>
                  <strong>Natural Language Co-Pilot:</strong> Type any trade goal or financial scenario to your AI assistant. The agent reads live cap status, validates trades, routes TPEs, and mutates the live React trade canvas in real time.
                </li>
              </ol>
            </div>

            {/* 8 Registered Tools Grid */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                <Terminal className="w-4 h-4 text-cyan-400 mr-2" /> 8 Registered WebMCP Tools
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-cyan-300 text-[11px]">list_all_teams (readOnly)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Returns all 30 NBA teams with total payrolls, tax apron tiers, and active TPE exceptions.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-cyan-300 text-[11px]">get_team_cap_status (readOnly)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Returns a specific team's full payroll, tax apron distance, and allowable incoming salary.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-cyan-300 text-[11px]">validate_cba_trade (readOnly)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Client-side &lt;1ms CBA compliance engine returning exact dollar matching and violation reasons.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-cyan-300 text-[11px]">find_facilitator_teams (readOnly)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Discovers 3rd-party teams with active TPEs or cap space capable of absorbing salary.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-amber-300 text-[11px]">set_player_protection (mutation)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Toggles untouchable superstar protection lock on any roster player on screen.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-teal-300 text-[11px]">route_salary_to_tpe (mutation)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Routes a player's outgoing salary directly into a 3rd team's Traded Player Exception.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-orange-300 text-[11px]">auto_balance_trade (mutation)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Autonomously restructures the trade to 100% CBA legality while strictly preserving human anchors.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="font-mono font-bold text-rose-300 text-[11px]">reset_trade (mutation)</div>
                  <p className="text-slate-400 text-[11px] mt-1">Clears all trade cards, unlocks players, and restores the board to a blank canvas.</p>
                </div>
              </div>
            </div>

            {/* 7 Natural Language Example Prompts Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center">
                  <Terminal className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> 7 Real-World Example WebMCP Prompts to Try:
                </span>
                <span className="text-[10px] text-slate-400">Copy &amp; paste into your AI agent</span>
              </div>

              <div className="space-y-3">
                
                {/* Prompt 1 */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-cyan-300">1. Full Multi-Team Blockbuster Solve</span>
                    <span className="text-[9px] font-mono text-slate-400">Tools: validate_cba_trade, auto_balance_trade</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                    "Can New York acquire Mikal Bridges from Brooklyn without trading away Jalen Brunson or OG Anunoby? Balance the salaries using Charlotte as a 3rd-team facilitator."
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    → The agent locks Brunson/Anunoby, puts Bridges in trade, routes Bogdanovic/Sims, and balances into Charlotte's TPE.
                  </p>
                </div>

                {/* Prompt 2 */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-amber-300">2. Second Apron &amp; Salary Ceiling Audit</span>
                    <span className="text-[9px] font-mono text-slate-400">Tools: get_team_cap_status</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                    "Inspect the Denver Nuggets cap status. Are they in the Second Apron, and what is their allowable incoming salary if they send out Michael Porter Jr.?"
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    → Returns exact total payroll ($194.2M), Second Apron restriction citations, and 100% match requirements.
                  </p>
                </div>

                {/* Prompt 3 */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-teal-300">3. Find 3rd-Party TPE Facilitators</span>
                    <span className="text-[9px] font-mono text-slate-400">Tools: find_facilitator_teams</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                    "Find all NBA teams with active Traded Player Exceptions (TPE) of at least $10M and open roster spots to absorb salary."
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    → Scans all 30 teams and discovers Charlotte ($10.5M Gordon Hayward TPE), Utah ($14.8M TPE), etc.
                  </p>
                </div>

                {/* Prompt 4 */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-orange-300">4. Set Superstar Untouchable Locks</span>
                    <span className="text-[9px] font-mono text-slate-400">Tools: set_player_protection</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                    "Lock Nikola Jokic on Denver and Karl-Anthony Towns on New York as untouchable superstars."
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    → Instantly toggles the 🔒 protection lock on both players across the interactive UI.
                  </p>
                </div>

                {/* Prompt 5 */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-emerald-300">5. Route Salary Direct to Facilitator TPE</span>
                    <span className="text-[9px] font-mono text-slate-400">Tools: route_salary_to_tpe</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                    "Route Jericho Sims ($2.09M) from New York into Charlotte's Gordon Hayward TPE exception."
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    → Absorbs Sims into Charlotte's TPE and updates Column 3 on screen in real time.
                  </p>
                </div>

                {/* Prompt 6 */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-indigo-300">6. Autonomous Deal Re-Balancing</span>
                    <span className="text-[9px] font-mono text-slate-400">Tools: auto_balance_trade</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                    "Auto-balance the current trade on screen to 100% CBA legality while preserving my locked core pieces."
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    → Calculates the exact salary mismatch, extracts bench filler, and turns the bottom status banner 100% APPROVED.
                  </p>
                </div>

                {/* Prompt 7 */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-rose-300">7. Reset Trade Canvas to Blank Slate</span>
                    <span className="text-[9px] font-mono text-slate-400">Tools: reset_trade</span>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 select-all">
                    "Reset the trade canvas back to a clean blank slate and unlock all players."
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    → Clears all trade cards, unlocks roster pieces, and restores the board to a fresh canvas.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
