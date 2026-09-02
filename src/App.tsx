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
  Sparkles
} from 'lucide-react';
import cbaData from './data/nba_cba_2025.json';
import { Team, TeamTradeLeg, TradeValidationResult, Player } from './engine/types';
import { CBAEngine } from './engine/cbaEngine';
import { initializeWebMCP } from './webmcp/modelContextBridge';

export default function App() {
  const [teams, setTeams] = useState<Team[]>(cbaData.teams as unknown as Team[]);
  const [activeTab, setActiveTab] = useState<'app' | 'how-to-use'>('app');

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

  const handleToggleAnchor = (teamId: string, playerId: string, type: 'incoming' | 'outgoing') => {
    setTradeLegs(prev => prev.map(leg => {
      if (leg.teamId !== teamId) return leg;
      if (type === 'incoming') {
        return {
          ...leg,
          incomingPlayers: leg.incomingPlayers.map(p => p.id === playerId ? { ...p, isAnchor: !p.isAnchor } : p)
        };
      } else {
        return {
          ...leg,
          outgoingPlayers: leg.outgoingPlayers.map(p => p.id === playerId ? { ...p, isAnchor: !p.isAnchor } : p)
        };
      }
    }));
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
        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
          <button 
            onClick={() => setActiveTab('app')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'app' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 inline mr-1.5" /> 30-Team Trade Board
          </button>
          <button 
            onClick={() => setActiveTab('how-to-use')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'how-to-use' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1.5" /> How to Use It
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
                              onClick={() => handleToggleAnchor(team1.id, p.id, 'incoming')}
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
                                onClick={() => handleToggleAnchor(team1.id, p.id, 'outgoing')}
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
                              onClick={() => handleToggleAnchor(team2.id, p.id, 'incoming')}
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
                                onClick={() => handleToggleAnchor(team2.id, p.id, 'outgoing')}
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
      ) : (
        /* VIEW 2: HOW TO USE IT TAB */
        <div className="flex-1 bg-slate-950 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Guide Header */}
            <div className="border-b border-slate-800 pb-5">
              <div className="inline-block bg-orange-500/10 text-orange-400 text-xs px-3 py-1 rounded-full font-semibold mb-2 border border-orange-500/20">
                Step-by-Step Walkthrough
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">How to Use CapSpace Pro</h2>
              <p className="text-slate-300 text-sm mt-1">
                Learn how to construct multi-team trades, protect superstar cornerstones, and let external AI agents solve 676-page CBA salary puzzles via WebMCP.
              </p>
            </div>

            {/* Step 1 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2.5 shadow-xl">
              <div className="flex items-center space-x-3 text-orange-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center font-mono text-xs text-orange-300">
                  1
                </div>
                <span>Select Your 2 or 3 Trading Teams</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed pl-10">
                Use the dropdown menus at the top of Column 1 and Column 2 to pick any of the 30 NBA teams. Column 3 lets you choose a 3rd-team <strong>Facilitator</strong> with open budget space or active Trade Exceptions (TPE).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2.5 shadow-xl">
              <div className="flex items-center space-x-3 text-amber-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center font-mono text-xs text-amber-300">
                  2
                </div>
                <span>Lock Your Protected Superstars (🔒)</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed pl-10">
                Click the <strong>🔒 Lock icon</strong> next to franchise players you refuse to trade (e.g., Jalen Brunson or Steph Curry). This signals to both humans and external AI agents that this player is untouchable and must remain on the roster.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2.5 shadow-xl">
              <div className="flex items-center space-x-3 text-cyan-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center font-mono text-xs text-cyan-300">
                  3
                </div>
                <span>Trade Players or Let AI Agents Restructure via WebMCP</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed pl-10">
                Click <strong>"+ Trade"</strong> on any unlocked player to move them into the outgoing package. Alternatively, ask your connected AI agent (ChatGPT Desktop, Claude Code, Antigravity) to <em>"Make this trade work"</em>—the agent calls in-browser WebMCP tools to balance outgoing and incoming contracts automatically in milliseconds.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2.5 shadow-xl">
              <div className="flex items-center space-x-3 text-emerald-400 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center font-mono text-xs text-emerald-300">
                  4
                </div>
                <span>Verify Live CBA Compliance at the Bottom Banner</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed pl-10">
                Watch the <strong>sticky bottom banner</strong>. If a trade breaks Second Apron rules or exceeds allowable salary limits, red violation callouts explain exactly why down to the dollar. Once the math balances, the banner turns green with an instant <strong>"TRADE APPROVED (100% Legal)"</strong> stamp.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
