import type { AllianceAuditCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface AuditEventInput {
  allianceId: string;
  actorId?: string;
  category: AllianceAuditCategory;
  action: string;
  before?: Prisma.JsonValue;
  after?: Prisma.JsonValue;
  confirmationToken?: string;
  ipAddress?: string;
  deviceInfo?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
}

export async function recordAllianceAudit(event: AuditEventInput) {
  await prisma.allianceAuditLog.create({
    data: {
      allianceId: event.allianceId,
      actorId: event.actorId,
      category: event.category,
      action: event.action,
      beforeState: event.before ?? null,
      afterState: event.after ?? null,
      confirmationToken: event.confirmationToken,
      ipAddress: event.ipAddress,
      deviceInfo: event.deviceInfo ?? null,
      metadata: event.metadata ?? null
    }
  });
}
