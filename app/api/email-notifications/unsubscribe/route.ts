import { type NextRequest } from "next/server"
import { EmailNotificationService } from "@/lib/notifications/email-notification-service"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return new Response("Missing unsubscribe token", { status: 400 })
    }

    const removed = await EmailNotificationService.unsubscribe(token)
    return new Response(
      removed ? "You will no longer receive email notifications." : "Unsubscribe link is invalid or expired.",
      {
        status: removed ? 200 : 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    )
  } catch (error) {
    return new Response("Unable to process unsubscribe request.", { status: 500 })
  }
}
