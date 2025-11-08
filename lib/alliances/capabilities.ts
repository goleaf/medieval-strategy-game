import { AllianceMemberStatus } from "./states";

export type MemberCapability =
  | "VIEW_FORUM"
  | "POST_FORUM"
  | "JOIN_SQUAD"
  | "SEND_RESOURCE_REQUEST"
  | "RECEIVE_ANNOUNCEMENTS"
  | "VOTE_ON_DECISIONS";

const capabilityMatrix: Record<AllianceMemberStatus, MemberCapability[]> = {
  [AllianceMemberStatus.PROSPECT]: ["RECEIVE_ANNOUNCEMENTS"],
  [AllianceMemberStatus.INVITED]: ["RECEIVE_ANNOUNCEMENTS"],
  [AllianceMemberStatus.APPLICANT]: ["RECEIVE_ANNOUNCEMENTS"],
  [AllianceMemberStatus.PROBATION]: ["VIEW_FORUM", "POST_FORUM", "JOIN_SQUAD", "RECEIVE_ANNOUNCEMENTS"],
  [AllianceMemberStatus.ACTIVE]: [
    "VIEW_FORUM",
    "POST_FORUM",
    "JOIN_SQUAD",
    "SEND_RESOURCE_REQUEST",
    "RECEIVE_ANNOUNCEMENTS",
    "VOTE_ON_DECISIONS"
  ],
  [AllianceMemberStatus.SUSPENDED]: ["VIEW_FORUM", "RECEIVE_ANNOUNCEMENTS"],
  [AllianceMemberStatus.BANNED]: ["RECEIVE_ANNOUNCEMENTS"],
  [AllianceMemberStatus.FORMER]: []
};

export function listCapabilities(state: AllianceMemberStatus): MemberCapability[] {
  return capabilityMatrix[state] ?? [];
}

export function hasCapability(
  state: AllianceMemberStatus,
  capability: MemberCapability
): boolean {
  return capabilityMatrix[state]?.includes(capability) ?? false;
}
