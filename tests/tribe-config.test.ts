import { describe, expect, it } from "vitest"

import { ALL_TRIBE_PERMISSIONS, getRolePermissionDefaults } from "@/lib/config/tribes"
import { TRIBE_PERMISSION_VALUES, TRIBE_ROLE_DEFAULTS } from "@/lib/tribes/permissions"

describe("tribe permission configuration", () => {
  it("exposes every configured permission through ALL_TRIBE_PERMISSIONS", () => {
    expect(ALL_TRIBE_PERMISSIONS).toEqual(TRIBE_PERMISSION_VALUES)
  })

  it("returns full control for founders and co-founders", () => {
    expect(getRolePermissionDefaults("FOUNDER", [])).toEqual(TRIBE_PERMISSION_VALUES)
    expect(getRolePermissionDefaults("CO_FOUNDER", [])).toEqual(TRIBE_PERMISSION_VALUES)
  })

  it("falls back to role presets when no member defaults are provided", () => {
    expect(getRolePermissionDefaults("OFFICER", [])).toEqual(TRIBE_ROLE_DEFAULTS.OFFICER)
    expect(getRolePermissionDefaults("MEMBER", [])).toEqual([])
  })

  it("injects tribe-specific defaults for regular members", () => {
    const customDefaults = ["VIEW_APPLICATIONS", "SEND_MASS_MAIL"] as const
    expect(getRolePermissionDefaults("MEMBER", customDefaults)).toEqual([...customDefaults])
  })
})
