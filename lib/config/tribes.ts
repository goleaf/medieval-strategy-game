import type { TribePermissionValue } from "@/lib/tribes/permissions"
import { TRIBE_PERMISSION_VALUES, TRIBE_ROLE_DEFAULTS } from "@/lib/tribes/permissions"
import type { TribeRole } from "@prisma/client"

export const TRIBE_CREATION_MIN_POINTS = 5000
export const TRIBE_CREATION_PREMIUM_COST = 250
export const TRIBE_INVITE_EXPIRY_HOURS = 72
export const TRIBE_LEAVE_COOLDOWN_HOURS = 24

export function getRolePermissionDefaults(role: TribeRole, memberDefaults?: TribePermissionValue[]): TribePermissionValue[] {
  if (role === "MEMBER") {
    return memberDefaults && memberDefaults.length > 0 ? memberDefaults : []
  }
  return TRIBE_ROLE_DEFAULTS[role] ?? []
}

export const ALL_TRIBE_PERMISSIONS = [...TRIBE_PERMISSION_VALUES]
