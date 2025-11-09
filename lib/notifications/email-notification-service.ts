import { prisma } from "@/lib/db"
import {
  EmailDeliverySchedule,
  EmailDeliveryStatus,
  EmailLanguage,
  EmailNotificationStatus,
  EmailNotificationTopic,
  Prisma,
} from "@prisma/client"
import crypto from "node:crypto"
import { getEmailTransport } from "@/lib/email/transport"
import { renderNotificationEmail, renderVerificationEmail } from "@/lib/email/templates"
import {
  EMAIL_NOTIFICATION_CONFIG,
  EMAIL_TOPIC_TO_PREFERENCE_KEY,
  type EmailNotificationPreferences,
  getDefaultEmailNotificationPreferences,
} from "@/lib/config/email-notifications"

type SettingContext = Prisma.EmailNotificationSettingGetPayload<{
  include: { player: { include: { user: true } } }
}>

type EventWithPlayer = Prisma.EmailNotificationEventGetPayload<{
  include: {
    player: {
      include: {
        user: true
        emailNotificationSetting: true
      }
    }
  }
}>

type QueueOptions = {
  playerId: string
  topic: EmailNotificationTopic
  payload: Record<string, any>
  linkTarget?: string | null
  messageId?: string
  forceSend?: boolean
}

type PreferenceUpdateInput = {
  email?: string
  deliverySchedule?: EmailDeliverySchedule
  language?: EmailLanguage
  preferences?: Partial<EmailNotificationPreferences>
  dailyDigestHour?: number
}

const APP_ORIGIN = process.env.APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Medieval Strategy HQ <no-reply@medievalstrategy.game>"

export class EmailNotificationService {
  static async getSettings(playerId: string) {
    return this.getOrCreateSetting(playerId)
  }

  static async queueEvent(options: QueueOptions): Promise<void> {
    const setting = await this.getOrCreateSetting(options.playerId)
    if (!setting) return

    if (!this.isTopicEnabled(setting, options.topic)) {
      return
    }

    if (this.isChannelDisabled(setting)) {
      return
    }

    const schedule = setting.deliverySchedule
    if (
      schedule === EmailDeliverySchedule.IMMEDIATE &&
      !options.forceSend &&
      !this.isPlayerOffline(setting.player.lastActiveAt)
    ) {
      return
    }

    const readyAt =
      schedule === EmailDeliverySchedule.IMMEDIATE
        ? new Date()
        : this.computeNextDigestTime(schedule, setting.dailyDigestHour)

    await prisma.emailNotificationEvent.create({
      data: {
        playerId: options.playerId,
        topic: options.topic,
        payload: options.payload as Prisma.JsonObject,
        linkTarget: options.linkTarget ?? null,
        messageId: options.messageId ?? null,
        readyAt,
        forceSend: Boolean(options.forceSend),
      },
    })
  }

  static async processImmediateQueue(limit = EMAIL_NOTIFICATION_CONFIG.dispatchBatchSize): Promise<void> {
    const now = new Date()
    const events = await prisma.emailNotificationEvent.findMany({
      where: {
        status: EmailNotificationStatus.PENDING,
        readyAt: { lte: now },
        player: {
          emailNotificationSetting: {
            deliverySchedule: EmailDeliverySchedule.IMMEDIATE,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        player: {
          include: {
            user: true,
            emailNotificationSetting: true,
          },
        },
      },
    })

    for (const event of events as EventWithPlayer[]) {
      await this.dispatchEvent(event)
    }
  }

  static async processDigestQueue(schedule: EmailDeliverySchedule): Promise<void> {
    const now = new Date()
    const events = await prisma.emailNotificationEvent.findMany({
      where: {
        status: EmailNotificationStatus.PENDING,
        readyAt: { lte: now },
        player: {
          emailNotificationSetting: {
            deliverySchedule: schedule,
          },
        },
      },
      include: {
        player: {
          include: {
            user: true,
            emailNotificationSetting: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: EMAIL_NOTIFICATION_CONFIG.digestBatchSize,
    })

    const grouped = (events as EventWithPlayer[]).reduce<Record<string, EventWithPlayer[]>>((acc, event) => {
      acc[event.playerId] = acc[event.playerId] ?? []
      acc[event.playerId].push(event)
      return acc
    }, {})

    for (const [playerId, playerEvents] of Object.entries(grouped)) {
      const setting = await this.getOrCreateSetting(playerId)
      if (!setting || this.isChannelDisabled(setting)) {
        await this.markEvents(playerEvents, EmailNotificationStatus.SKIPPED, "channel disabled")
        continue
      }

      const preferences = this.parsePreferences(setting)
      const eligibleEvents = playerEvents.filter((event) => this.isTopicEnabled(setting, event.topic))
      if (!eligibleEvents.length && !preferences.dailySummary) {
        await this.markEvents(playerEvents, EmailNotificationStatus.SKIPPED, "no eligible events")
        continue
      }

      const digestEvents = eligibleEvents.slice(0, EMAIL_NOTIFICATION_CONFIG.maxEventsPerDigest).map((event) => ({
        topic: event.topic,
        payload: event.payload as Record<string, any>,
        linkTarget: event.linkTarget,
      }))

      if (preferences.dailySummary) {
        digestEvents.push({
          topic: EmailNotificationTopic.DAILY_SUMMARY,
          payload: {
            counts: eligibleEvents.reduce<Record<string, number>>((acc, event) => {
              acc[event.topic] = (acc[event.topic] ?? 0) + 1
              return acc
            }, {}),
            windowEndedAt: now.toISOString(),
          },
        })
      }

      try {
        await this.sendEmail({
          setting,
          playerId,
          events: digestEvents,
          schedule,
          mode: "digest",
        })
        await prisma.emailNotificationSetting.update({
          where: { id: setting.id },
          data: { lastDigestSentAt: new Date() },
        })
        await this.markEvents(playerEvents, EmailNotificationStatus.SENT)
      } catch (error) {
        console.error("Failed to send digest email", error)
        await this.markEvents(playerEvents, EmailNotificationStatus.FAILED, String(error))
      }
    }
  }

  static async requestVerification(playerId: string): Promise<void> {
    const setting = await this.getOrCreateSetting(playerId)
    if (!setting) return

    const token = this.generateToken()
    const hash = this.hashToken(token)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

    await prisma.emailNotificationSetting.update({
      where: { id: setting.id },
      data: {
        verificationTokenHash: hash,
        verificationSentAt: new Date(),
        verificationExpiresAt: expiresAt,
      },
    })

    const verifyUrl = `${APP_ORIGIN}/api/email-notifications/verify?token=${token}`
    const message = renderVerificationEmail({
      language: setting.language,
      verifyUrl,
    })

    await this.safeSendMail({
      to: setting.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
  }

  static async verifyEmail(token: string): Promise<boolean> {
    const hash = this.hashToken(token)
    const setting = await prisma.emailNotificationSetting.findFirst({
      where: {
        verificationTokenHash: hash,
        verificationExpiresAt: { gte: new Date() },
      },
    })

    if (!setting) return false

    await prisma.emailNotificationSetting.update({
      where: { id: setting.id },
      data: {
        emailVerifiedAt: new Date(),
        verificationTokenHash: null,
        verificationExpiresAt: null,
      },
    })

    return true
  }

  static async unsubscribe(token: string): Promise<boolean> {
    const hash = this.hashToken(token)
    const setting = await prisma.emailNotificationSetting.findFirst({
      where: { unsubscribeTokenHash: hash },
    })

    if (!setting) return false

    await prisma.emailNotificationSetting.update({
      where: { id: setting.id },
      data: {
        unsubscribedAt: new Date(),
      },
    })

    return true
  }

  static async updatePreferences(playerId: string, updates: PreferenceUpdateInput) {
    const setting = await this.getOrCreateSetting(playerId)
    if (!setting) {
      throw new Error("Player not found")
    }

    const mergedPrefs = {
      ...getDefaultEmailNotificationPreferences(),
      ...this.parsePreferences(setting),
      ...updates.preferences,
    }

    const data: Prisma.EmailNotificationSettingUpdateInput = {
      preferences: mergedPrefs as Prisma.JsonObject,
    }

    if (updates.email && updates.email !== setting.email) {
      data.email = updates.email
      data.emailVerifiedAt = null
    }
    if (updates.deliverySchedule) {
      data.deliverySchedule = updates.deliverySchedule
    }
    if (updates.language) {
      data.language = updates.language
    }
    if (typeof updates.dailyDigestHour === "number") {
      data.dailyDigestHour = updates.dailyDigestHour
    }

    await prisma.emailNotificationSetting.update({
      where: { id: setting.id },
      data,
    })
  }

  private static async dispatchEvent(event: EventWithPlayer) {
    const setting = event.player.emailNotificationSetting ?? (await this.getOrCreateSetting(event.playerId))
    if (!setting || this.isChannelDisabled(setting)) {
      await this.markEvents([event], EmailNotificationStatus.SKIPPED, "channel disabled")
      return
    }

    if (!this.isTopicEnabled(setting, event.topic)) {
      await this.markEvents([event], EmailNotificationStatus.SKIPPED, "preference disabled")
      return
    }

    if (!event.forceSend && !this.isPlayerOffline(event.player.lastActiveAt)) {
      await this.markEvents([event], EmailNotificationStatus.SKIPPED, "player online")
      return
    }

    try {
      await this.sendEmail({
        setting,
        playerId: event.playerId,
        events: [
          {
            topic: event.topic,
            payload: event.payload as Record<string, any>,
            linkTarget: event.linkTarget,
          },
        ],
        schedule: EmailDeliverySchedule.IMMEDIATE,
        mode: "single",
      })
      await this.markEvents([event], EmailNotificationStatus.SENT)
    } catch (error) {
      console.error("Failed to send notification email", error)
      await this.markEvents([event], EmailNotificationStatus.FAILED, String(error))
    }
  }

  private static async getOrCreateSetting(playerId: string): Promise<SettingContext | null> {
    const existing = await prisma.emailNotificationSetting.findUnique({
      where: { playerId },
      include: { player: { include: { user: true } } },
    })
    if (existing) return existing

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { user: true },
    })
    if (!player || !player.user) {
      return null
    }

    const defaults = getDefaultEmailNotificationPreferences()
    const unsubscribeToken = this.generateToken()

    return prisma.emailNotificationSetting.create({
      data: {
        playerId,
        email: player.user.email,
        language: EmailLanguage.EN,
        emailVerifiedAt: new Date(),
        preferences: defaults as Prisma.JsonObject,
        dailyDigestHour: EMAIL_NOTIFICATION_CONFIG.digestDefaultHour,
        unsubscribeTokenHash: this.hashToken(unsubscribeToken),
      },
      include: { player: { include: { user: true } } },
    })
  }

  private static parsePreferences(setting: { preferences: Prisma.JsonValue }): EmailNotificationPreferences {
    const current = (setting.preferences as EmailNotificationPreferences) ?? {}
    return {
      ...getDefaultEmailNotificationPreferences(),
      ...current,
    }
  }

  private static isTopicEnabled(setting: { preferences: Prisma.JsonValue }, topic: EmailNotificationTopic): boolean {
    const prefKey = EMAIL_TOPIC_TO_PREFERENCE_KEY[topic]
    if (!prefKey) return true

    const prefs = this.parsePreferences(setting)
    return prefs[prefKey]
  }

  private static isChannelDisabled(setting: { emailVerifiedAt: Date | null; unsubscribedAt: Date | null }): boolean {
    if (!setting.emailVerifiedAt) return true
    if (setting.unsubscribedAt) return true
    return false
  }

  private static isPlayerOffline(lastActiveAt: Date, thresholdMinutes = EMAIL_NOTIFICATION_CONFIG.offlineMinutesThreshold): boolean {
    const lastActive = new Date(lastActiveAt)
    const diff = Date.now() - lastActive.getTime()
    return diff > thresholdMinutes * 60 * 1000
  }

  private static computeNextDigestTime(schedule: EmailDeliverySchedule, preferredHour?: number): Date {
    const now = new Date()
    if (schedule === EmailDeliverySchedule.HOURLY) {
      const next = new Date(now)
      next.setMinutes(0, 0, 0)
      next.setHours(next.getHours() + 1)
      return next
    }

    const hour = typeof preferredHour === "number" ? preferredHour : EMAIL_NOTIFICATION_CONFIG.digestDefaultHour
    const next = new Date(now)
    next.setHours(hour, 0, 0, 0)
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    return next
  }

  private static async markEvents(events: EventWithPlayer[], status: EmailNotificationStatus, error?: string) {
    await prisma.emailNotificationEvent.updateMany({
      where: { id: { in: events.map((event) => event.id) } },
      data: {
        status,
        sentAt: status === EmailNotificationStatus.SENT ? new Date() : null,
        error: error ?? null,
      },
    })
  }

  private static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex")
  }

  private static generateToken(): string {
    return crypto.randomBytes(24).toString("hex")
  }

  private static async rotateUnsubscribeToken(settingId: string): Promise<string> {
    const token = this.generateToken()
    await prisma.emailNotificationSetting.update({
      where: { id: settingId },
      data: { unsubscribeTokenHash: this.hashToken(token) },
    })
    return token
  }

  private static async enforceRateLimit(setting: SettingContext): Promise<void> {
    const windowMs = EMAIL_NOTIFICATION_CONFIG.rateLimitWindowMinutes * 60 * 1000
    const now = new Date()
    let windowStart = setting.rateLimitWindowStart ?? now
    let count = setting.rateLimitCount ?? 0

    if (!setting.rateLimitWindowStart || now.getTime() - setting.rateLimitWindowStart.getTime() > windowMs) {
      windowStart = now
      count = 0
    }

    if (count >= EMAIL_NOTIFICATION_CONFIG.rateLimitMaxPerWindow) {
      throw new Error("Email rate limit reached")
    }

    const updated = await prisma.emailNotificationSetting.update({
      where: { id: setting.id },
      data: {
        rateLimitWindowStart: windowStart,
        rateLimitCount: count + 1,
      },
    })

    setting.rateLimitWindowStart = updated.rateLimitWindowStart
    setting.rateLimitCount = updated.rateLimitCount
  }

  private static async sendEmail(args: {
    setting: SettingContext
    playerId: string
    events: Array<{ topic: EmailNotificationTopic; payload: Record<string, any>; linkTarget?: string | null }>
    schedule: EmailDeliverySchedule
    mode: "single" | "digest"
  }): Promise<void> {
    await this.enforceRateLimit(args.setting)
    const unsubscribeToken = await this.rotateUnsubscribeToken(args.setting.id)
    const unsubscribeUrl = `${APP_ORIGIN}/api/email-notifications/unsubscribe?token=${unsubscribeToken}`

    const rendered = renderNotificationEmail({
      mode: args.mode,
      events: args.events,
      language: args.setting.language,
      schedule: args.schedule,
      unsubscribeUrl,
      appOrigin: APP_ORIGIN,
    })

    await this.safeSendMail({
      to: args.setting.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })

    await prisma.emailNotificationDelivery.create({
      data: {
        playerId: args.playerId,
        toAddress: args.setting.email,
        topic: args.events[0]?.topic ?? EmailNotificationTopic.DAILY_SUMMARY,
        status: EmailDeliveryStatus.SENT,
      },
    })
  }

  private static async safeSendMail(mail: { to: string; subject: string; html: string; text: string }) {
    const transport = getEmailTransport()
    await transport.sendMail({
      from: EMAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    })
  }
}
