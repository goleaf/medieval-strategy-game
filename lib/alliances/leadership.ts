type LeadershipCandidate = {
  memberId: string;
  rankWeight: number;
  tenureHours: number;
  contributionScore: number;
  barred: boolean;
};

export function pickSuccessor(candidates: LeadershipCandidate[]): LeadershipCandidate | null {
  const eligible = candidates.filter(candidate => !candidate.barred);
  if (eligible.length === 0) return null;
  const scored = eligible.map(candidate => ({
    candidate,
    score:
      candidate.rankWeight * 1000 +
      candidate.tenureHours * 10 +
      candidate.contributionScore
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

export function shouldTriggerAutoPromotion(
  lastLeaderOnlineHours: number,
  timeoutHours: number
): boolean {
  return lastLeaderOnlineHours >= timeoutHours;
}
