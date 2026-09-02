import { describe, it, expect } from 'vitest';
import cbaData from '../src/data/nba_cba_2025.json';
import { CBAEngine } from '../src/engine/cbaEngine';

describe('NBA 2024-25 Dataset & CBA Schema Integrity', () => {
  const { teams, cbaConstants } = cbaData;

  it('contains all 30 NBA teams', () => {
    expect(teams.length).toBe(30);
    const teamIds = new Set(teams.map(t => t.id));
    expect(teamIds.size).toBe(30);

    const standardIds = [
      'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
      'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
      'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'
    ];

    for (const id of standardIds) {
      expect(teamIds.has(id)).toBe(true);
    }
  });

  it('verifies CBA constant values match official 2024-25 numbers', () => {
    expect(cbaConstants.salaryCap).toBe(140588000);
    expect(cbaConstants.luxuryTaxThreshold).toBe(170814000);
    expect(cbaConstants.firstApronThreshold).toBe(178132000);
    expect(cbaConstants.secondApronThreshold).toBe(188931000);
    expect(cbaConstants.maxRosterSpots).toBe(15);
  });

  it('verifies each team has valid roster numbers, positions, and positive salaries', () => {
    for (const team of teams) {
      expect(team.name).toBeTruthy();
      expect(team.fullName).toBeTruthy();
      expect(['Eastern', 'Western']).toContain(team.conference);
      expect(team.roster.length).toBeGreaterThanOrEqual(4);
      expect(team.roster.length).toBeLessThanOrEqual(15);

      let computedRosterSalary = 0;
      for (const player of team.roster) {
        expect(player.id).toBeTruthy();
        expect(player.name).toBeTruthy();
        expect(['PG', 'SG', 'SF', 'PF', 'C']).toContain(player.pos);
        expect(player.salary).toBeGreaterThan(0);
        computedRosterSalary += player.salary;
      }

      expect(team.totalPayroll).toBeGreaterThan(0);
      expect(team.totalPayroll).toBeGreaterThanOrEqual(computedRosterSalary);
      const expectedTier = CBAEngine.getTeamApronTier(team.totalPayroll);
      expect(team.apronTier).toBe(expectedTier);
    }
  });

  it('verifies all TPEs have valid amounts, ids, and expiration dates', () => {
    for (const team of teams) {
      if (team.tpes && team.tpes.length > 0) {
        for (const tpe of team.tpes) {
          expect(tpe.id).toBeTruthy();
          expect(tpe.name).toBeTruthy();
          expect(tpe.amount).toBeGreaterThan(0);
          expect(tpe.expires).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });
});
