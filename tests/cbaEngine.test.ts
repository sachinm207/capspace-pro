import { describe, it, expect } from 'vitest';
import { CBAEngine } from '../src/engine/cbaEngine';
import cbaData from '../src/data/nba_cba_2025.json';
import { Team, TeamTradeLeg } from '../src/engine/types';

describe('CBAEngine Deterministic Calculations & CBA Invariants', () => {
  const teams = cbaData.teams as unknown as Team[];
  const { cbaConstants } = cbaData;

  describe('Apron Tier Classification', () => {
    it('correctly classifies all payroll ranges into apron tiers', () => {
      // Under cap / non-taxpayer
      expect(CBAEngine.getTeamApronTier(100000000)).toBe('under_cap');
      expect(CBAEngine.getTeamApronTier(cbaConstants.salaryCap)).toBe('under_cap');
      expect(CBAEngine.getTeamApronTier(cbaConstants.luxuryTaxThreshold - 1)).toBe('under_cap');

      // Taxpayer
      expect(CBAEngine.getTeamApronTier(cbaConstants.luxuryTaxThreshold)).toBe('taxpayer');
      expect(CBAEngine.getTeamApronTier(175000000)).toBe('taxpayer');
      expect(CBAEngine.getTeamApronTier(cbaConstants.firstApronThreshold - 1)).toBe('taxpayer');

      // First Apron
      expect(CBAEngine.getTeamApronTier(cbaConstants.firstApronThreshold)).toBe('first_apron');
      expect(CBAEngine.getTeamApronTier(185000000)).toBe('first_apron');
      expect(CBAEngine.getTeamApronTier(cbaConstants.secondApronThreshold - 1)).toBe('first_apron');

      // Second Apron
      expect(CBAEngine.getTeamApronTier(cbaConstants.secondApronThreshold)).toBe('second_apron');
      expect(CBAEngine.getTeamApronTier(200000000)).toBe('second_apron');
    });
  });

  describe('Allowable Incoming Salary Calculations (Matching Tiers)', () => {
    it('applies Tier 1 matching (200% + $250k) for non-taxpayers with outgoing <= $7.5M', () => {
      const outgoing = 5000000;
      const allowable = CBAEngine.getAllowableIncomingSalary(outgoing, 130000000);
      expect(allowable).toBe(5000000 * 2.0 + 250000); // $10.25M
    });

    it('applies Tier 2 matching (outgoing + $7.5M) for non-taxpayers with outgoing between $7.5M and $29M', () => {
      const outgoing = 15000000;
      const allowable = CBAEngine.getAllowableIncomingSalary(outgoing, 130000000);
      expect(allowable).toBe(15000000 + 7500000); // $22.5M
    });

    it('applies Tier 3 matching (125% + $250k) for non-taxpayers with outgoing > $29M', () => {
      const outgoing = 35000000;
      const allowable = CBAEngine.getAllowableIncomingSalary(outgoing, 130000000);
      expect(allowable).toBe(35000000 * 1.25 + 250000); // $44.0M
    });

    it('applies Taxpayer matching (110% + $250k) for teams between tax line and 1st Apron', () => {
      const outgoing = 20000000;
      const allowable = CBAEngine.getAllowableIncomingSalary(outgoing, 175000000);
      expect(allowable).toBe(20000000 * 1.10 + 250000); // $22.25M
    });

    it('applies 100% hard limit (no excess salary) for First Apron teams', () => {
      const outgoing = 25000000;
      const allowable = CBAEngine.getAllowableIncomingSalary(outgoing, 182000000);
      expect(allowable).toBe(25000000);
    });

    it('applies 100% hard limit (no excess salary) for Second Apron teams', () => {
      const outgoing = 30000000;
      const allowable = CBAEngine.getAllowableIncomingSalary(outgoing, 195000000);
      expect(allowable).toBe(30000000);
    });
  });

  describe('Trade Validation & Rule Enforcement', () => {
    it('approves a fully legal, balanced 2-team trade', () => {
      const nyk = teams.find(t => t.id === 'NYK')!;
      const bkn = teams.find(t => t.id === 'BKN')!;

      const bogdanovic = nyk.roster.find(p => p.id === 'p_bogdanovic')!;
      const bridges = bkn.roster.find(p => p.id === 'p_bridges_mikal')!;

      // BKN (non-taxpayer) sending Bridges ($23.3M) for Bogdanovic ($19.0M)
      const legalLegs: TeamTradeLeg[] = [
        {
          teamId: 'NYK',
          incomingPlayers: [bridges],
          outgoingPlayers: [bogdanovic, nyk.roster.find(p => p.id === 'p_mcbride')!], // $19.0M + $4.7M = $23.7M
          incomingPicks: [],
          outgoingPicks: []
        },
        {
          teamId: 'BKN',
          incomingPlayers: [bogdanovic, nyk.roster.find(p => p.id === 'p_mcbride')!],
          outgoingPlayers: [bridges],
          incomingPicks: [],
          outgoingPicks: []
        }
      ];

      const result = CBAEngine.validateTrade(teams, legalLegs);
      expect(result.isLegal).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.summary.length).toBe(2);
    });

    it('flags salary matching violation when team takes back excess incoming salary', () => {
      const nyk = teams.find(t => t.id === 'NYK')!;
      const bkn = teams.find(t => t.id === 'BKN')!;

      const bridges = bkn.roster.find(p => p.id === 'p_bridges_mikal')!; // $23.3M
      const bojan = nyk.roster.find(p => p.id === 'p_bogdanovic')!;       // $19.0M

      const illegalLegs: TeamTradeLeg[] = [
        {
          teamId: 'NYK',
          incomingPlayers: [bridges],
          outgoingPlayers: [bojan],
          incomingPicks: [],
          outgoingPicks: []
        }
      ];

      const result = CBAEngine.validateTrade(teams, illegalLegs);
      expect(result.isLegal).toBe(false);
      expect(result.violations.some(v => v.reason.includes('exceeds maximum allowable threshold'))).toBe(true);
    });

    it('enforces 2nd Apron aggregation prohibition (sending >1 player)', () => {
      // Find or create second apron team
      const bos = teams.find(t => t.id === 'BOS')!;
      const por = teams.find(t => t.id === 'POR')!;

      const bosP1 = bos.roster[0];
      const bosP2 = bos.roster[1];
      const porP1 = por.roster[0];

      const aggregationLegs: TeamTradeLeg[] = [
        {
          teamId: 'BOS',
          incomingPlayers: [porP1],
          outgoingPlayers: [bosP1, bosP2], // 2 players from 2nd Apron team
          incomingPicks: [],
          outgoingPicks: []
        }
      ];

      const result = CBAEngine.validateTrade(teams, aggregationLegs);
      expect(result.isLegal).toBe(false);
      expect(result.violations.some(v => v.reason.includes('prohibited from aggregating multiple player salaries'))).toBe(true);
    });

    it('enforces 2nd Apron incoming salary ceiling (incoming cannot exceed outgoing)', () => {
      const bos = teams.find(t => t.id === 'BOS')!;
      const por = teams.find(t => t.id === 'POR')!;

      const bosPlayer = bos.roster[0]; // e.g. Tatum
      const porPlayer = { ...por.roster[0], salary: bosPlayer.salary + 500000 };

      const excessLegs: TeamTradeLeg[] = [
        {
          teamId: 'BOS',
          incomingPlayers: [porPlayer],
          outgoingPlayers: [bosPlayer],
          incomingPicks: [],
          outgoingPicks: []
        }
      ];

      const result = CBAEngine.validateTrade(teams, excessLegs);
      expect(result.isLegal).toBe(false);
      expect(result.violations.some(v => v.reason.includes('cannot take back more incoming salary than outgoing'))).toBe(true);
    });

    it('enforces maximum 15-man roster contract limit', () => {
      const bos = teams.find(t => t.id === 'BOS')!;

      // NYK (starts with 10 players) taking 7 incoming players with 0 outgoing makes 17 (> 15)
      const rosterOverflowLegs: TeamTradeLeg[] = [
        {
          teamId: 'NYK',
          incomingPlayers: bos.roster.slice(0, 7),
          outgoingPlayers: [],
          incomingPicks: [],
          outgoingPicks: [],
          tpeUsed: { id: 'tpe_test', amountAbsorbed: 100000000 }
        }
      ];

      const result = CBAEngine.validateTrade(teams, rosterOverflowLegs);
      expect(result.isLegal).toBe(false);
      expect(result.violations.some(v => v.reason.includes('exceed maximum roster limit'))).toBe(true);
    });

    it('accurately validates 3-team trade facilitated by TPE exception', () => {
      const nyk = teams.find(t => t.id === 'NYK')!;
      const bkn = teams.find(t => t.id === 'BKN')!;

      const mikal = bkn.roster.find(p => p.id === 'p_bridges_mikal')!;
      const bojan = nyk.roster.find(p => p.id === 'p_bogdanovic')!;
      const sims = nyk.roster.find(p => p.id === 'p_sims')!;

      const threeTeamLegs: TeamTradeLeg[] = [
        {
          teamId: 'NYK',
          incomingPlayers: [mikal],
          outgoingPlayers: [bojan, sims],
          incomingPicks: [],
          outgoingPicks: ['2026 2nd (NYK)']
        },
        {
          teamId: 'BKN',
          incomingPlayers: [bojan],
          outgoingPlayers: [mikal],
          incomingPicks: ['2026 2nd (NYK)'],
          outgoingPicks: []
        },
        {
          teamId: 'CHA',
          incomingPlayers: [sims],
          outgoingPlayers: [],
          incomingPicks: ['2026 2nd (NYK)'],
          outgoingPicks: [],
          tpeUsed: { id: 'tpe_hayward', amountAbsorbed: sims.salary }
        }
      ];

      const result = CBAEngine.validateTrade(teams, threeTeamLegs);
      expect(result.isLegal).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.summary.length).toBe(3);
    });
  });

  describe('Facilitator Scanner', () => {
    it('finds facilitators with active TPEs meeting required threshold', () => {
      const facilitators = CBAEngine.findFacilitators(teams, 3000000);
      expect(facilitators.length).toBeGreaterThan(0);
      expect(facilitators.some(f => f.id === 'CHA')).toBe(true);
    });

    it('excludes teams if their TPE amount is below the requested threshold and not under cap', () => {
      const highAmountFacilitators = CBAEngine.findFacilitators(teams, 50000000);
      // Only teams under cap can absorb huge amounts without massive TPE
      expect(highAmountFacilitators.every(f => f.apronTier === 'under_cap' || f.tpes.some(t => t.amount >= 50000000))).toBe(true);
    });
  });
});

