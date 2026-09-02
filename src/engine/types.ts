export type ApronTier = 'under_cap' | 'taxpayer' | 'first_apron' | 'second_apron';

export interface Player {
  id: string;
  name: string;
  pos: string;
  salary: number;
  isProtected?: boolean;
  isAnchor?: boolean;
  tradeStatus?: string;
}

export interface TPE {
  id: string;
  name: string;
  amount: number;
  expires: string;
}

export interface Team {
  id: string;
  name: string;
  fullName: string;
  conference: string;
  color: string;
  totalPayroll: number;
  apronTier: ApronTier;
  tpes: TPE[];
  roster: Player[];
  draftPicks: string[];
}

export interface TeamTradeLeg {
  teamId: string;
  incomingPlayers: Player[];
  outgoingPlayers: Player[];
  incomingPicks: string[];
  outgoingPicks: string[];
  tpeUsed?: { id: string; amountAbsorbed: number };
}

export interface TradeValidationResult {
  isLegal: boolean;
  violations: { teamId: string; reason: string }[];
  summary: {
    teamId: string;
    incomingSalary: number;
    outgoingSalary: number;
    allowableIncoming: number;
    salaryDifference: number;
    newPayroll: number;
    newApronTier: ApronTier;
  }[];
}
