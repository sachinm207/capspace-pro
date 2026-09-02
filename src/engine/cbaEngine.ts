import { Team, TeamTradeLeg, TradeValidationResult, ApronTier } from './types';
import cbaData from '../data/nba_cba_2025.json';

const { cbaConstants } = cbaData;

export class CBAEngine {
  public static getTeamApronTier(payroll: number): ApronTier {
    if (payroll >= cbaConstants.secondApronThreshold) return 'second_apron';
    if (payroll >= cbaConstants.firstApronThreshold) return 'first_apron';
    if (payroll >= cbaConstants.luxuryTaxThreshold) return 'taxpayer';
    return 'under_cap';
  }

  public static getAllowableIncomingSalary(outgoingSalary: number, currentPayroll: number): number {
    const tier = this.getTeamApronTier(currentPayroll);
    
    // Under 2023-2030 CBA:
    // First Apron and Second Apron: 100% hard limit (Cannot take back even $1 more)
    if (tier === 'second_apron' || tier === 'first_apron') {
      return outgoingSalary;
    }

    // Taxpayer (Between Tax Line & 1st Apron): 110% + $250,000
    if (tier === 'taxpayer') {
      return outgoingSalary * 1.10 + 250000;
    }

    // Non-Taxpayer (Below Tax Line):
    // Tier 1: Up to $7.5M -> 200% + $250k
    // Tier 2: $7.5M to $29M -> Outgoing + $7.5M
    // Tier 3: Above $29M -> 125% + $250k
    if (outgoingSalary <= 7500000) {
      return outgoingSalary * 2.0 + 250000;
    } else if (outgoingSalary <= 29000000) {
      return outgoingSalary + 7500000;
    } else {
      return outgoingSalary * 1.25 + 250000;
    }
  }

  public static validateTrade(teams: Team[], legs: TeamTradeLeg[]): TradeValidationResult {
    const violations: { teamId: string; reason: string }[] = [];
    const summary: TradeValidationResult['summary'] = [];

    for (const leg of legs) {
      const team = teams.find(t => t.id === leg.teamId);
      if (!team) continue;

      const outgoingSalary = leg.outgoingPlayers.reduce((sum, p) => sum + p.salary, 0);
      const incomingSalary = leg.incomingPlayers.reduce((sum, p) => sum + p.salary, 0);
      
      const allowableIncoming = this.getAllowableIncomingSalary(outgoingSalary, team.totalPayroll);
      const salaryDiff = incomingSalary - outgoingSalary;
      const newPayroll = team.totalPayroll + salaryDiff;
      const newTier = this.getTeamApronTier(newPayroll);

      // Check 1: Second Apron Aggregation Restriction
      if (team.apronTier === 'second_apron') {
        if (leg.outgoingPlayers.length > 1) {
          violations.push({
            teamId: team.id,
            reason: `${team.name} is above the Second Apron ($188.9M) and is prohibited from aggregating multiple player salaries in trades.`
          });
        }
        if (incomingSalary > outgoingSalary) {
          violations.push({
            teamId: team.id,
            reason: `${team.name} is above Second Apron and cannot take back more incoming salary than outgoing ($${(incomingSalary - outgoingSalary).toLocaleString()} over).`
          });
        }
      }

      // Check 2: Salary Matching Rules
      if (incomingSalary > allowableIncoming && !leg.tpeUsed) {
        violations.push({
          teamId: team.id,
          reason: `${team.name} incoming salary ($${incomingSalary.toLocaleString()}) exceeds maximum allowable threshold ($${allowableIncoming.toLocaleString()}) by $${(incomingSalary - allowableIncoming).toLocaleString()}.`
        });
      }

      // Check 3: Roster Limits
      const newRosterCount = team.roster.length - leg.outgoingPlayers.length + leg.incomingPlayers.length;
      if (newRosterCount > cbaConstants.maxRosterSpots) {
        violations.push({
          teamId: team.id,
          reason: `${team.name} would exceed maximum roster limit (15 contracts). Currently at ${newRosterCount}.`
        });
      }

      summary.push({
        teamId: team.id,
        incomingSalary,
        outgoingSalary,
        allowableIncoming,
        salaryDifference: salaryDiff,
        newPayroll,
        newApronTier: newTier
      });
    }

    return {
      isLegal: violations.length === 0,
      violations,
      summary
    };
  }

  public static findFacilitators(teams: Team[], minTpeAmount: number): Team[] {
    return teams.filter(t => {
      // Must have open roster spot and valid TPE
      const hasRosterRoom = t.roster.length < cbaConstants.maxRosterSpots;
      const hasMatchingTpe = t.tpes.some(tpe => tpe.amount >= minTpeAmount);
      const isUnderApron = t.apronTier === 'under_cap';
      return (hasRosterRoom && hasMatchingTpe) || isUnderApron;
    });
  }
}
