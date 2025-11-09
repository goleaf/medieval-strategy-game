import type { TribeRole } from "@prisma/client"

export const TRIBE_PERMISSION_VALUES = [
  "INVITE_MEMBER",
  "REMOVE_MEMBER",
  "EDIT_DIPLOMACY",
  "MODERATE_FORUM",
  "SEND_MASS_MAIL",
  "EDIT_PROFILE",
  "VIEW_APPLICATIONS",
  "MANAGE_PERMISSIONS",
] as const

export type TribePermissionValue = (typeof TRIBE_PERMISSION_VALUES)[number]

export const TRIBE_ROLE_DEFAULTS: Record<TribeRole, TribePermissionValue[]> = {
  FOUNDER: [...TRIBE_PERMISSION_VALUES],
  CO_FOUNDER: [...TRIBE_PERMISSION_VALUES],
  OFFICER: ["INVITE_MEMBER", "REMOVE_MEMBER", "SEND_MASS_MAIL", "MODERATE_FORUM", "VIEW_APPLICATIONS"],
  MEMBER: [],
}
