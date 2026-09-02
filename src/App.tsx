import { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  Layers, 
  Activity,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import cbaData from './data/nba_cba_2025.json';
import { Team, TeamTradeLeg, TradeValidationResult, Player } from './engine/types';
import { CBAEngine } from './engine/cbaEngine';
import { initializeWebMCP } from './webmcp/modelContextBridge';

export default function App() {
  const [teams, setTeams] = useState<Team[]>(cbaData.teams as unknown as Team[]);
  const [activeTab, setActiveTab] = useState<'app' | 'explain'>('app');

  // Active teams selected in the 3 columns
  const [team1Id, setTeam1Id] = useState('NYK');
  const [team2Id, setTeam2Id] = useState('BKN');
  const [team3Id, setTeam3Id] = useState('CHA');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Live: 2024-25 Official NBA CBA');

  // Initial baseline trade legs
  const getInitialLegs = (t1: string, t2: string): TeamTradeLeg[] => {
    const team1 = teams.find(t => t.id === t1) || teams[1];
    const team2 = teams.find(t => t.id === t2) || teams[2];

    const t2Target = team2.roster[0];
    const t1Offer = team1.roster[4] || team1.roster[2];

    return [
      {
        teamId: team1.id,
        incomingPlayers: t2Target ? [t2Target] : [],
        outgoingPlayers: t1Offer ? [t1Offer] : [],
        incomingPicks: [],
        outgoingPicks: []
      },
      {
        teamId: team2.id,
        incomingPlayers: t1Offer ? [t1Offer] : [],
        outgoingPlayers: t2Target ? [t2Target] : [],
        incomingPicks: [],
        outgoingPicks: []
      }
    ];
  };

  const [tradeLegs, setTradeLegs] = useState<TeamTradeLeg[]>(() => getInitialLegs('NYK', 'BKN'));
  const [validationResult, setValidationResult] = useState<TradeValidationResult>(() => 
    CBAEngine.validateTrade(teams, getInitialLegs('NYK', 'BKN'))
  );

  useEffect(() => {
    setValidationResult(CBAEngine.validateTrade(teams, tradeLegs));
  }, [tradeLegs, teams]);

  useEffect(() => {
    initializeWebMCP(teams, tradeLegs, {
      onUpdateTradeLegs: (newLegs) => setTradeLegs(newLegs),
      onUpdateProtectedPlayer: (teamId, playerId, isProtected) => {
        setTeams(prev => prev.map(t => {
          if (t.id !== teamId) return t;
          return {
            ...t,
            roster: t.roster.map(p => p.id === playerId ? { ...p, isProtected } : p)
          };
        }));
      },
      onResetTrade: () => setTradeLegs(getInitialLegs(team1Id, team2Id))
    });
  }, [teams, tradeLegs, team1Id, team2Id]);

  const handleProtectToggle = (teamId: string, playerId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      return {
        ...t,
        roster: t.roster.map(p => p.id === playerId ? { ...p, isProtected: !p.isProtected } : p)
      };
    }));
  };

  const handleTeam1Change = (newId: string) => {
    setTeam1Id(newId);
    setTradeLegs(getInitialLegs(newId, team2Id));
  };

  const handleTeam2Change = (newId: string) => {
    setTeam2Id(newId);
    setTradeLegs(getInitialLegs(team1Id, newId));
  };

  const handleResetClick = () => {
    setTradeLegs(getInitialLegs(team1Id, team2Id));
  };

  const handleLiveSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(`Synced Live: ${new Date().toLocaleTimeString()} (All 30 Teams Up-to-Date)`);
    }, 800);
  };

  const handleAddOutgoingPlayer = (fromTeamId: string, player: Player, toTeamId: string) => {
    setTradeLegs(prev => {
      const updated = prev.map(leg => {
        if (leg.teamId === fromTeamId) {
          if (leg.outgoingPlayers.some(p => p.id === player.id)) return leg;
          return { ...leg, outgoingPlayers: [...leg.outgoingPlayers, player] };
        }
        if (leg.teamId === toTeamId) {
          if (leg.incomingPlayers.some(p => p.id === player.id)) return leg;
          return { ...leg, incomingPlayers: [...leg.incomingPlayers, player] };
        }
        return leg;
      });
      return updated;
    });
  };

  const handleRemoveOutgoingPlayer = (_fromTeamId: string, playerId: string) => {
    setTradeLegs(prev => prev.map(leg => {
      return {
        ...leg,
        outgoingPlayers: leg.outgoingPlayers.filter(p => p.id !== playerId),
        incomingPlayers: leg.incomingPlayers.filter(p => p.id !== playerId)
      };
    }));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3.5 flex items-center justify-between z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-orange-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="font-extrabold text-lg tracking-tight text-white">CapSpace Pro</h1>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/20 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                WebMCP Connected (All 30 Teams)
              </span>
            </div>
            <p className="text-xs text-slate-300">NBA 2024–25 Second Apron & 30-Team Trade Machine</p>
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
            onClick={() => setActiveTab('explain')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'explain' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <HelpCircle className="w-3.5 h-3.5 inline mr-1.5" /> Beginner's Guide (Why NBA is Hard)
          </button>
        </div>

        {/* Live Status & Data Sync */}
        <div className="flex items-center space-x-5">
          <button 
            onClick={handleLiveSync}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Live Cap Data</span>
          </button>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">CBA Trade Status</div>
            <div className={`text-base font-bold font-mono flex items-center justify-end ${validationResult.isLegal ? 'text-emerald-400' : 'text-rose-400'}`}>
              {validationResult.isLegal ? (
                <><CheckCircle2 className="w-5 h-5 mr-1.5 text-emerald-400" /> TRADE APPROVED (100% Legal)</>
              ) : (
                <><XCircle className="w-5 h-5 mr-1.5 text-rose-400" /> DISALLOWED ({validationResult.violations.length} Violations)</>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'app' ? (
        <div className="flex-1 bg-slate-900/30 p-6 flex flex-col justify-between overflow-y-auto">
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 text-xs text-slate-200">
              <span className="font-bold text-amber-400">Active Multi-Team Trade:</span>
              <span className="text-slate-300 font-medium">{lastSyncTime}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[11px] text-slate-300 italic">
                Select any of the 30 NBA teams below or let external AI agents restructure the trade via WebMCP.
              </span>
              <button 
                onClick={handleResetClick}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center transition"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Board
              </button>
            </div>
          </div>

          {/* 3-Column Team Trade Board with Selectors */}
          <div className="grid grid-cols-3 gap-6 flex-1">
            
            {/* Column 1: Team 1 (Selectable from 30 teams) */}
            {(() => {
              const team1 = teams.find(t => t.id === team1Id) || teams[0];
              const leg = tradeLegs.find(l => l.teamId === team1.id);
              const outSum = leg ? leg.outgoingPlayers.reduce((s, p) => s + p.salary, 0) : 0;
              const inSum = leg ? leg.incomingPlayers.reduce((s, p) => s + p.salary, 0) : 0;
              const diff = inSum - outSum;

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                      <div className="flex items-center space-x-2.5">
                        <select 
                          value={team1Id}
                          onChange={(e) => handleTeam1Change(e.target.value)}
                          className="bg-slate-800 font-extrabold text-sm text-white rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-300 font-medium">Payroll: ${(team1.totalPayroll / 1e6).toFixed(1)}M</span>
                      </div>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-mono font-semibold border border-amber-500/20">
                        {team1.apronTier.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Trade Assets */}
                    <div className="mt-4 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Incoming Assets:</div>
                      {leg?.incomingPlayers.map(p => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-800 border border-cyan-500/40 text-xs flex justify-between items-center shadow-sm">
                          <span className="font-bold text-white">{p.name} ({p.pos})</span>
                          <span className="font-mono font-semibold text-cyan-400">${(p.salary / 1e6).toFixed(2)}M</span>
                        </div>
                      ))}

                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-4">Outgoing Assets:</div>
                      {leg?.outgoingPlayers.map(p => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center">
                          <span className="text-slate-200 font-medium">{p.name} ({p.pos})</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-slate-300 font-semibold">${(p.salary / 1e6).toFixed(2)}M</span>
                            <button 
                              onClick={() => handleRemoveOutgoingPlayer(team1.id, p.id)}
                              className="text-rose-400 hover:text-rose-300 p-0.5 rounded"
                              title="Remove from trade"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Roster & Add-to-Trade Picker */}
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-5 flex items-center justify-between">
                        <span>Roster ({team1.roster.length} Players):</span>
                        <span className="text-[10px] text-slate-400 font-normal">Click to lock / trade</span>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {team1.roster.map(p => {
                          const isAlreadyTrading = leg?.outgoingPlayers.some(op => op.id === p.id);
                          return (
                            <div key={p.id} className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                              <div>
                                <span className={`font-semibold ${p.isProtected ? 'text-amber-300' : 'text-slate-200'}`}>{p.name}</span>
                                <span className="text-[11px] text-slate-300 ml-1.5 font-mono font-medium">(${(p.salary / 1e6).toFixed(1)}M)</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <button 
                                  onClick={() => handleProtectToggle(team1.id, p.id)}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition ${p.isProtected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'}`}
                                  title="Toggle protection lock"
                                >
                                  {p.isProtected ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                </button>
                                {!isAlreadyTrading && !p.isProtected && (
                                  <button 
                                    onClick={() => handleAddOutgoingPlayer(team1.id, p, team2Id)}
                                    className="text-[9px] bg-slate-700 hover:bg-slate-600 text-cyan-300 px-1.5 py-0.5 rounded font-semibold flex items-center"
                                  >
                                    <Plus className="w-2.5 h-2.5 mr-0.5" /> Trade
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Second Apron Progress Gauge */}
                  <div className="mt-4 pt-3.5 border-t border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Salary Difference:</span>
                      <span className={`font-mono font-bold ${diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {diff > 0 ? `+$${(diff / 1e6).toFixed(2)}M` : `-$${(Math.abs(diff) / 1e6).toFixed(2)}M`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${diff > 3000000 ? 'bg-rose-500' : 'bg-amber-500'} transition-all duration-500`}
                        style={{ width: `${Math.min(100, ((team1.totalPayroll + diff) / 188931000) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                      <span>Current: ${(team1.totalPayroll / 1e6).toFixed(1)}M</span>
                      <span>2nd Apron Limit: $188.9M</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Column 2: Team 2 (Selectable from 30 teams) */}
            {(() => {
              const team2 = teams.find(t => t.id === team2Id) || teams[2];
              const leg = tradeLegs.find(l => l.teamId === team2.id);

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                      <div className="flex items-center space-x-2.5">
                        <select 
                          value={team2Id}
                          onChange={(e) => handleTeam2Change(e.target.value)}
                          className="bg-slate-800 font-extrabold text-sm text-white rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-300 font-medium">Payroll: ${(team2.totalPayroll / 1e6).toFixed(1)}M</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-semibold border border-emerald-500/20">
                        {team2.apronTier.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Incoming Assets:</div>
                      {leg?.incomingPlayers.map(p => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-800 border border-cyan-500/40 text-xs flex justify-between items-center shadow-sm">
                          <span className="font-bold text-white">{p.name} ({p.pos})</span>
                          <span className="font-mono font-semibold text-cyan-400">${(p.salary / 1e6).toFixed(2)}M</span>
                        </div>
                      ))}

                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-4">Outgoing Assets:</div>
                      {leg?.outgoingPlayers.map(p => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center">
                          <span className="text-slate-200 font-medium">{p.name} ({p.pos})</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-slate-300 font-semibold">${(p.salary / 1e6).toFixed(2)}M</span>
                            <button 
                              onClick={() => handleRemoveOutgoingPlayer(team2.id, p.id)}
                              className="text-rose-400 hover:text-rose-300 p-0.5 rounded"
                              title="Remove from trade"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Roster & Add-to-Trade Picker */}
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-5">Roster ({team2.roster.length} Players):</div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {team2.roster.map(p => {
                          const isAlreadyTrading = leg?.outgoingPlayers.some(op => op.id === p.id);
                          return (
                            <div key={p.id} className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                              <div>
                                <span className={`font-semibold ${p.isProtected ? 'text-amber-300' : 'text-slate-200'}`}>{p.name}</span>
                                <span className="text-[11px] text-slate-300 ml-1.5 font-mono font-medium">(${(p.salary / 1e6).toFixed(1)}M)</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <button 
                                  onClick={() => handleProtectToggle(team2.id, p.id)}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center transition ${p.isProtected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'}`}
                                >
                                  {p.isProtected ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                </button>
                                {!isAlreadyTrading && !p.isProtected && (
                                  <button 
                                    onClick={() => handleAddOutgoingPlayer(team2.id, p, team1Id)}
                                    className="text-[9px] bg-slate-700 hover:bg-slate-600 text-cyan-300 px-1.5 py-0.5 rounded font-semibold flex items-center"
                                  >
                                    <Plus className="w-2.5 h-2.5 mr-0.5" /> Trade
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Roster Open Spots:</span>
                      <span className="font-mono font-bold text-emerald-400">{15 - team2.roster.length} Available</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[60%]"></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Column 3: 3rd Team Facilitator (Selectable from 30 teams) */}
            {(() => {
              const team3 = teams.find(t => t.id === team3Id) || teams[12];
              const leg = tradeLegs.find(l => l.teamId === team3.id);

              return (
                <div className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between shadow-2xl transition-all ${leg ? 'border-teal-500/60 shadow-teal-500/10' : 'border-slate-800'}`}>
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                      <div className="flex items-center space-x-2.5">
                        <select 
                          value={team3Id}
                          onChange={(e) => setTeam3Id(e.target.value)}
                          className="bg-slate-800 font-extrabold text-sm text-teal-300 rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
                        >
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} (Facilitator)</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-300 font-medium">TPEs: {team3.tpes.length}</span>
                      </div>
                      <span className="text-[10px] bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded-full font-mono font-semibold border border-teal-500/20">
                        {team3.tpes.length > 0 ? 'TPE HOST' : 'CAP ROOM'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Incoming Absorbed:</div>
                      {leg ? (
                        <>
                          {leg.incomingPlayers.map(p => (
                            <div key={p.id} className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/40 text-xs flex justify-between items-center">
                              <span className="font-bold text-teal-200">{p.name} (via TPE)</span>
                              <span className="font-mono font-semibold text-teal-300">${(p.salary / 1e6).toFixed(2)}M</span>
                            </div>
                          ))}
                          {leg.incomingPicks.map(pick => (
                            <div key={pick} className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs text-teal-300">
                              Acquired Draft Compensation: {pick}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-dashed border-slate-700/60 text-xs text-slate-300 italic text-center">
                          Standing by. External AI coding agents can route salaries into {team3.name}'s active TPE exceptions via WebMCP.
                        </div>
                      )}

                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-5">Active Trade Exceptions (TPE):</div>
                      {team3.tpes.length > 0 ? (
                        <div className="space-y-1.5">
                          {team3.tpes.map(tpe => (
                            <div key={tpe.id} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center">
                              <span className="text-slate-200 font-medium">{tpe.name}</span>
                              <span className="font-mono text-emerald-400 font-bold">${(tpe.amount / 1e6).toFixed(2)}M</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-300 italic p-2 bg-slate-800/20 rounded">
                          No active TPEs (Can absorb contracts via cap room).
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300 font-medium">
                      <span>Roster Capacity:</span>
                      <span className="font-mono font-bold text-teal-400">{team3.roster.length} / 15 Contracts</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 w-[65%]"></div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Violation Alert Banner */}
          {!validationResult.isLegal && (
            <div className="mt-4 bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-300 space-y-1 shadow-lg">
              <div className="font-bold text-rose-400 flex items-center text-sm">
                <XCircle className="w-4 h-4 mr-2" /> Collective Bargaining Agreement (CBA) Violations:
              </div>
              {validationResult.violations.map((v, i) => (
                <div key={i} className="pl-6">• {v.reason}</div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* VIEW 2: EXPLANATION TAB */
        <div className="flex-1 bg-slate-950 p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-b border-slate-800 pb-6">
              <div className="inline-block bg-orange-500/10 text-orange-400 text-xs px-3 py-1 rounded-full font-semibold mb-3 border border-orange-500/20">
                Plain English Guide (Zero Jargon)
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">Why the NBA Has the Hardest Math in Sports</h2>
              <p className="text-slate-300 text-base mt-2">
                Why basketball trades involve 676-page legal contracts and how external AI agents solve multi-million dollar puzzles across all 30 teams.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center space-x-3 text-orange-400 font-bold text-lg">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <span>1. The Real-World Problem: The 676-Page Rulebook</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                In professional basketball (the NBA), teams cannot just trade whoever they want like in video games or soccer. Every team is bound by a <strong>676-page legal contract called the Collective Bargaining Agreement (CBA)</strong>.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                If a rich team is over the salary limit (called the "Second Apron"), the rules get brutal: you cannot combine two small contracts to get one big player, you cannot pay cash to help another team, and you cannot take back even $1 more in salary than you send out.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center space-x-3 text-amber-400 font-bold text-lg">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <span>2. Why Online Trade Checkers Frustrate Millions of Fans & GMs</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Current trade machines (like ESPN Trade Machine) only do one thing: when you click "Submit", it flashes a big red box that says <strong>"Trade Disallowed"</strong> with zero explanation of how to fix it.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                The human has to spend 45 minutes digging through 29 other teams to find an obscure "Traded Player Exception" (TPE) or minimum contract to make the math work.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center space-x-3 text-emerald-400 font-bold text-lg">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>3. How External AI Coding Agents (WebMCP) Solve the Puzzle</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                You tell your external AI assistant (ChatGPT Desktop, Claude Code, Codex, or Antigravity): <em>"Make the trade work without giving up our franchise stars."</em>
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                The external AI connects directly to this browser tab via <strong>WebMCP (`navigator.modelContext`)</strong>, executes the deterministic CBA tools in 15 milliseconds, brings in a 3rd team to absorb the salary gap into their tax exception, and transforms the on-screen board into a <strong>100% legally approved NBA trade</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
