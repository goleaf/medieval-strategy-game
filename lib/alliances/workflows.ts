import type { AllianceAnnouncementStatus, AllianceAnnouncementType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AllianceMemberStatus, assertMemberTransition } from "./states";
import { recordAllianceAudit } from "./audit";

interface MemberTransitionInput {
  allianceId: string;
  memberId: string;
  actorId: string;
  from: AllianceMemberStatus;
  to: AllianceMemberStatus;
  reason?: string;
}

export async function transitionMemberState(input: MemberTransitionInput) {
  assertMemberTransition(input.from, input.to);
  await prisma.allianceMember.update({
    where: { id: input.memberId },
    data: { state: input.to }
  });
  await recordAllianceAudit({
    allianceId: input.allianceId,
    actorId: input.actorId,
    category: "ADMISSION",
    action: `member_state_${input.from.toLowerCase()}_${input.to.toLowerCase()}`,
    metadata: { reason: input.reason }
  });
}

interface AnnouncementWorkflowInput {
  allianceId: string;
  announcementId: string;
  actorId: string;
  type: AllianceAnnouncementType;
  status: AllianceAnnouncementStatus;
}

export async function updateAnnouncementStatus(input: AnnouncementWorkflowInput) {
  await prisma.allianceAnnouncement.update({
    where: { id: input.announcementId },
    data: { status: input.status }
  });
  await recordAllianceAudit({
    allianceId: input.allianceId,
    actorId: input.actorId,
    category: "ANNOUNCEMENT",
    action: `announcement_${input.status.toLowerCase()}`,
    metadata: { type: input.type }
  });
}
