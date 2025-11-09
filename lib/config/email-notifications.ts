import { EmailLanguage, EmailNotificationTopic } from "@prisma/client"

export type EmailNotificationPreferences = {
  attackIncoming: boolean
  attackReport: boolean
  conquestWarning: boolean
  conquestLost: boolean
  tribeMessage: boolean
  trainingComplete: boolean
  buildingComplete: boolean
  dailySummary: boolean
}

export const EMAIL_TOPIC_TO_PREFERENCE_KEY: Record<EmailNotificationTopic, keyof EmailNotificationPreferences> = {
  ATTACK_INCOMING: "attackIncoming",
  ATTACK_REPORT: "attackReport",
  CONQUEST_WARNING: "conquestWarning",
  CONQUEST_LOST: "conquestLost",
  TRIBE_MESSAGE: "tribeMessage",
  TRAINING_COMPLETE: "trainingComplete",
  BUILDING_COMPLETE: "buildingComplete",
  DAILY_SUMMARY: "dailySummary",
}

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const EMAIL_NOTIFICATION_CONFIG = {
  offlineMinutesThreshold: toInt(process.env.EMAIL_OFFLINE_THRESHOLD_MINUTES, 10),
  digestDefaultHour: toInt(process.env.EMAIL_DIGEST_HOUR_DEFAULT, 8),
  rateLimitWindowMinutes: toInt(process.env.EMAIL_RATE_LIMIT_WINDOW_MINUTES, 60),
  rateLimitMaxPerWindow: toInt(process.env.EMAIL_RATE_LIMIT_MAX, 20),
  dispatchBatchSize: toInt(process.env.EMAIL_DISPATCH_BATCH_SIZE, 75),
  digestBatchSize: toInt(process.env.EMAIL_DIGEST_BATCH_SIZE, 200),
  maxEventsPerDigest: toInt(process.env.EMAIL_DIGEST_EVENT_CAP, 50),
}

export const SUPPORTED_EMAIL_LANGUAGES: EmailLanguage[] = [EmailLanguage.EN, EmailLanguage.DE]

export function getDefaultEmailNotificationPreferences(): EmailNotificationPreferences {
  return {
    attackIncoming: true,
    attackReport: true,
    conquestWarning: true,
    conquestLost: true,
    tribeMessage: true,
    trainingComplete: true,
    buildingComplete: true,
    dailySummary: false,
  }
}
