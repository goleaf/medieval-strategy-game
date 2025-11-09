import { NextRequest, NextResponse } from "next/server"
import { SECURITY_QUESTIONS } from "@/lib/security/security-questions"

export async function GET(_req: NextRequest) {
  return NextResponse.json({ success: true, questions: SECURITY_QUESTIONS }, { status: 200 })
}
