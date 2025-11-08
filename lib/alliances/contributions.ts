export interface ContributionSnapshot {
  opsAttendance: number;
  donations: number;
  scoutingReports: number;
  supportTickets: number;
}

const defaultWeights: ContributionSnapshot = {
  opsAttendance: 5,
  donations: 3,
  scoutingReports: 2,
  supportTickets: 1
};

export function scoreContribution(
  snapshot: ContributionSnapshot,
  weights: ContributionSnapshot = defaultWeights
): number {
  return (
    snapshot.opsAttendance * weights.opsAttendance +
    snapshot.donations * weights.donations +
    snapshot.scoutingReports * weights.scoutingReports +
    snapshot.supportTickets * weights.supportTickets
  );
}

export function needsReview(score: number, minimum = 10): boolean {
  return score < minimum;
}
