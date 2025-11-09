import { EmailDeliverySchedule } from "@prisma/client"
import { EmailNotificationService } from "@/lib/notifications/email-notification-service"

export async function runEmailNotificationTick(): Promise<void> {
  await EmailNotificationService.processImmediateQueue()
  await EmailNotificationService.processDigestQueue(EmailDeliverySchedule.HOURLY)
  await EmailNotificationService.processDigestQueue(EmailDeliverySchedule.DAILY)
}
