import { NextRequest, NextResponse } from "next/server"
import { TwoFactorService } from "@/lib/security/two-factor-service"

export async function POST(req: NextRequest) {
  try {
    const { challengeId }: { challengeId: string } = await req.json()
    if (!challengeId) {
      return NextResponse.json({ error: "Challenge ID required" }, { status: 400 })
    }

    const challenge = await TwoFactorService.getChallenge(challengeId)
    if (!challenge) {
      return NextResponse.json({ error: "Challenge expired or invalid" }, { status: 400 })
    }

    await TwoFactorService.requestLoginSmsCode(challenge.userId, challengeId)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("SMS code error:", error)
    return NextResponse.json({ error: "Unable to send SMS code" }, { status: 500 })
  }
}
