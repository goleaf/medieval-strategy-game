import { NextRequest, NextResponse } from "next/server"
import { AccountRecoveryService } from "@/lib/security/account-recovery-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, reason, details, securityQuestionId, securityAnswer } = body

    if (!email || !reason) {
      return NextResponse.json({ error: "Email and reason are required" }, { status: 400 })
    }

    const requestRecord = await AccountRecoveryService.createRequest({
      email,
      reason,
      details,
      securityQuestionId,
      securityAnswer,
    })

    return NextResponse.json(
      {
        success: true,
        ticketId: requestRecord.id,
        status: requestRecord.status,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Recovery request error:", error)
    return NextResponse.json({ error: (error as Error).message || "Unable to submit recovery request" }, { status: 400 })
  }
}
