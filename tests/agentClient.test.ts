import { describe, it, expect, beforeEach } from 'vitest';
import cbaData from '../src/data/nba_cba_2025.json';
import { initializeWebMCP } from '../src/webmcp/modelContextBridge';
import { Team, TeamTradeLeg } from '../src/engine/types';

describe('External Coding Agent WebMCP Integration Test Suite', () => {
  const teams = cbaData.teams as unknown as Team[];
  let currentLegs: TeamTradeLeg[] = [];
  let logs: string[] = [];

  let modelContext: any;

  beforeEach(() => {
    logs = [];
    currentLegs = [];
    modelContext = initializeWebMCP(teams, currentLegs, {
      onUpdateTradeLegs: (legs) => { currentLegs = legs; logs.push('trade_legs_updated'); },
      onUpdateProtectedPlayer: (teamId, playerId, isProtected) => { 
        logs.push(`player_protected:${teamId}:${playerId}:${isProtected}`); 
      },
      onResetTrade: () => { logs.push('trade_reset'); },
      onLogToolExecution: (tool) => { logs.push(`tool_executed:${tool}`); }
    });
  });

  describe('Tool Registration & Discovery', () => {
    it('registers all 8 standard WebMCP tools with schemas', () => {
      const tools = modelContext.getTools();
      expect(tools.length).toBe(8);

      const toolNames = tools.map((t: any) => t.name);
      expect(toolNames).toContain('list_all_teams');
      expect(toolNames).toContain('get_team_cap_status');
      expect(toolNames).toContain('validate_cba_trade');
      expect(toolNames).toContain('find_facilitator_teams');
      expect(toolNames).toContain('set_player_protection');
      expect(toolNames).toContain('route_salary_to_tpe');
      expect(toolNames).toContain('auto_balance_trade');
      expect(toolNames).toContain('reset_trade');

      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('throws error when executing an unregistered tool', async () => {
      await expect(modelContext.executeTool('non_existent_tool', {})).rejects.toThrow(
        /not registered on modelContext/
      );
    });
  });

  describe('Tool 1: list_all_teams', () => {
    it('returns summary for all 30 NBA teams', async () => {
      const allTeams = await modelContext.executeTool('list_all_teams', {});
      expect(allTeams.length).toBe(30);

      const lakers = allTeams.find((t: any) => t.id === 'LAL');
      expect(lakers).toBeDefined();
      expect(lakers.fullName).toBe('Los Angeles Lakers');
      expect(lakers.conference).toBe('Western');
      expect(typeof lakers.payroll).toBe('number');
      expect(typeof lakers.rosterCount).toBe('number');
    });
  });

  describe('Tool 2: get_team_cap_status', () => {
    it('returns full cap status and roster for valid team ID', async () => {
      const result = await modelContext.executeTool('get_team_cap_status', { teamId: 'NYK' });
      expect(result.teamId).toBe('NYK');
      expect(result.totalPayroll).toBe(173500000);
      expect(result.apronTier).toBe('taxpayer');
      expect(result.roster.length).toBeGreaterThan(0);
      expect(result.distanceToSecondApron).toBe(188931000 - 173500000);
      expect(Array.isArray(result.draftPicks)).toBe(true);
    });

    it('handles lowercase team ID gracefully', async () => {
      const result = await modelContext.executeTool('get_team_cap_status', { teamId: 'lal' });
      expect(result.teamId).toBe('LAL');
      expect(result.teamName).toBe('Los Angeles Lakers');
    });

    it('returns error object when querying unknown team ID', async () => {
      const result = await modelContext.executeTool('get_team_cap_status', { teamId: 'XYZ' });
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Team 'XYZ' not found");
    });
  });

  describe('Tool 3: validate_cba_trade', () => {
    it('validates provided trade legs deterministically', async () => {
      const nyk = teams.find(t => t.id === 'NYK')!;
      const bkn = teams.find(t => t.id === 'BKN')!;

      const mikal = bkn.roster.find(p => p.id === 'p_bridges_mikal')!;
      const bojan = nyk.roster.find(p => p.id === 'p_bogdanovic')!;

      const customLegs: TeamTradeLeg[] = [
        {
          teamId: 'NYK',
          incomingPlayers: [mikal],
          outgoingPlayers: [bojan],
          incomingPicks: [],
          outgoingPicks: []
        }
      ];

      const result = await modelContext.executeTool('validate_cba_trade', { legs: customLegs });
      expect(result.isLegal).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Tool 4: find_facilitator_teams', () => {
    it('filters teams with matching TPE capacity >= threshold', async () => {
      const facilitators = await modelContext.executeTool('find_facilitator_teams', { minTpeAmount: 2000000 });
      expect(facilitators.length).toBeGreaterThan(0);
      expect(facilitators.some((f: any) => f.id === 'CHA')).toBe(true);

      for (const fac of facilitators) {
        expect(fac.openRosterSpots).toBeGreaterThan(0);
      }
    });
  });

  describe('Tool 5: set_player_protection', () => {
    it('sets player untouchable status and notifies app', async () => {
      const result = await modelContext.executeTool('set_player_protection', {
        teamId: 'NYK',
        playerId: 'p_brunson',
        isProtected: true
      });
      expect(result.success).toBe(true);
      expect(result.isProtected).toBe(true);
      expect(logs).toContain('player_protected:NYK:p_brunson:true');
    });

    it('clears player protection lock', async () => {
      const result = await modelContext.executeTool('set_player_protection', {
        teamId: 'NYK',
        playerId: 'p_brunson',
        isProtected: false
      });
      expect(result.success).toBe(true);
      expect(result.isProtected).toBe(false);
      expect(logs).toContain('player_protected:NYK:p_brunson:false');
    });
  });

  describe('Tool 6: route_salary_to_tpe', () => {
    it('routes salary directly into facilitator TPE', async () => {
      const result = await modelContext.executeTool('route_salary_to_tpe', {
        sourceTeamId: 'NYK',
        facilitatorTeamId: 'CHA',
        playerId: 'p_sims',
        tpeId: 'tpe_hayward'
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Routed player into CHA TPE');
    });
  });

  describe('Tool 7: auto_balance_trade', () => {
    it('autonomously restructures 3-team trade to 100% CBA compliance', async () => {
      const result = await modelContext.executeTool('auto_balance_trade', { primaryTeamId: 'NYK' });
      expect(result.success).toBe(true);
      expect(result.validation.isLegal).toBe(true);
      expect(result.solvedLegs.length).toBe(3);
      expect(logs).toContain('trade_legs_updated');
    });
  });

  describe('Tool 8: reset_trade', () => {
    it('triggers trade reset action', async () => {
      const result = await modelContext.executeTool('reset_trade', {});
      expect(result.success).toBe(true);
      expect(logs).toContain('trade_reset');
    });
  });
});

