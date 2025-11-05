import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export type SitterAction = 'sendRaids' | 'useResources' | 'buyAndSpendGold'

/**
 * Middleware to check sitter permissions for specific actions
 */
export class SitterPermissions {
  /**
   * Check if a sitter has permission for a specific action
   */
  static async checkPermission(
    sitterId: string,
    ownerId: string,
    action: SitterAction
  ): Promise<boolean> {
    try {
      return await SitterDualService.validateSitterPermissions(sitterId, ownerId, action)
    } catch (error) {
      console.error("Error checking sitter permissions:", error)
      return false
    }
  }

  /**
   * Middleware function to enforce sitter permissions on API routes
   */
  static async enforcePermission(
    req: NextRequest,
    sitterId: string,
    ownerId: string,
    action: SitterAction
  ): Promise<NextResponse | null> {
    const hasPermission = await this.checkPermission(sitterId, ownerId, action)

    if (!hasPermission) {
      return NextResponse.json({
        error: `Sitter does not have permission to ${action.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      }, { status: 403 })
    }

    return null // Permission granted
  }

  /**
   * Check if the current request is from a sitter and return sitter context
   */
  static async getSitterContext(auth: any): Promise<{
    isSitter: boolean
    sitterId?: string
    ownerId?: string
  }> {
    if (!auth?.isSitter || !auth?.sitterFor || !auth?.userId) {
      return { isSitter: false }
    }

    return {
      isSitter: true,
      sitterId: auth.userId,
      ownerId: auth.sitterFor
    }
  }

  /**
   * Enforce that certain actions require owner permissions (not sitter)
   */
  static requireOwner(auth: any): NextResponse | null {
    if (auth?.isSitter) {
      return NextResponse.json({
        error: "This action requires account owner permissions"
      }, { status: 403 })
    }
    return null
  }
}

