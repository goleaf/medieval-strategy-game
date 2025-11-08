export enum AllianceMemberStatus {
  PROSPECT = "PROSPECT",
  INVITED = "INVITED",
  APPLICANT = "APPLICANT",
  PROBATION = "PROBATION",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
  FORMER = "FORMER"
}

export enum AllianceInviteState {
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED"
}

export enum AllianceApplicationState {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DECLINED = "DECLINED",
  WITHDRAWN = "WITHDRAWN",
  EXPIRED = "EXPIRED",
  AUTO_CLOSED = "AUTO_CLOSED"
}

export enum AllianceAnnouncementState {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  SENDING = "SENDING",
  SENT = "SENT",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED"
}

const memberTransitions: Record<AllianceMemberStatus, AllianceMemberStatus[]> = {
  [AllianceMemberStatus.PROSPECT]: [AllianceMemberStatus.INVITED, AllianceMemberStatus.APPLICANT],
  [AllianceMemberStatus.INVITED]: [AllianceMemberStatus.PROBATION, AllianceMemberStatus.FORMER],
  [AllianceMemberStatus.APPLICANT]: [AllianceMemberStatus.PROBATION, AllianceMemberStatus.FORMER],
  [AllianceMemberStatus.PROBATION]: [AllianceMemberStatus.ACTIVE, AllianceMemberStatus.SUSPENDED, AllianceMemberStatus.FORMER],
  [AllianceMemberStatus.ACTIVE]: [AllianceMemberStatus.SUSPENDED, AllianceMemberStatus.BANNED, AllianceMemberStatus.FORMER],
  [AllianceMemberStatus.SUSPENDED]: [AllianceMemberStatus.ACTIVE, AllianceMemberStatus.BANNED, AllianceMemberStatus.FORMER],
  [AllianceMemberStatus.BANNED]: [AllianceMemberStatus.FORMER],
  [AllianceMemberStatus.FORMER]: []
};

export type TransitionContext = {
  actorId: string;
  allianceId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export function canTransitionMember(
  from: AllianceMemberStatus,
  to: AllianceMemberStatus
): boolean {
  return memberTransitions[from]?.includes(to) ?? false;
}

export function assertMemberTransition(
  from: AllianceMemberStatus,
  to: AllianceMemberStatus
) {
  if (!canTransitionMember(from, to)) {
    throw new Error(`Illegal member transition: ${from} → ${to}`);
  }
}

export function announcementAllowsRetry(state: AllianceAnnouncementState): boolean {
  return state === AllianceAnnouncementState.FAILED || state === AllianceAnnouncementState.CANCELLED;
}

export const inviteTerminalStates = new Set([
  AllianceInviteState.ACCEPTED,
  AllianceInviteState.DECLINED,
  AllianceInviteState.EXPIRED,
  AllianceInviteState.REVOKED
]);

export const applicationTerminalStates = new Set([
  AllianceApplicationState.APPROVED,
  AllianceApplicationState.DECLINED,
  AllianceApplicationState.WITHDRAWN,
  AllianceApplicationState.EXPIRED,
  AllianceApplicationState.AUTO_CLOSED
]);
