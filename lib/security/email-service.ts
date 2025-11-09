import fs from "fs/promises"
import path from "path"

const LOG_PATH = path.join(process.cwd(), "server.log")
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"

async function logEmail(subject: string, to: string, body: string) {
  const entry = `[${new Date().toISOString()}] EMAIL to ${to} :: ${subject}\n${body}\n\n`
  try {
    await fs.appendFile(LOG_PATH, entry, "utf8")
  } catch (error) {
    console.error("Failed to log email", error)
  }
}

export const EmailService = {
  async sendVerificationEmail(email: string, token: string) {
    const link = `${APP_URL}/verify-email?token=${token}`
    const subject = "Verify your Medieval Strategy account"
    const body = `Welcome to Medieval Strategy!\n\nPlease verify your email by visiting: ${link}\n\nThis link expires in 24 hours.`
    await logEmail(subject, email, body)
  },

  async sendPasswordResetEmail(email: string, token: string) {
    const link = `${APP_URL}/reset-password?token=${token}`
    const subject = "Password reset requested"
    const body = `We received a password reset request for your account.\n\nUse the secure link below within 30 minutes:\n${link}\n\nIf you did not request this, you can safely ignore the message.`
    await logEmail(subject, email, body)
  },

  async sendSecurityAlertEmail(email: string, context: { ipAddress?: string | null; userAgent?: string | null }) {
    const subject = "Security alert: new login detected"
    const body = [
      "We noticed a login from a new device or location.",
      context.ipAddress ? `IP Address: ${context.ipAddress}` : null,
      context.userAgent ? `User Agent: ${context.userAgent}` : null,
      "",
      "If this was you, no action is required.",
      "If not, please reset your password immediately and lock down your account.",
    ]
      .filter(Boolean)
      .join("\n")
    await logEmail(subject, email, body)
  },

  async sendTwoFactorBackupCodes(email: string, codes: string[]) {
    const subject = "Two-factor authentication backup codes"
    const body = `Store these backup codes safely:\n\n${codes.join("\n")}\n\nEach code can only be used once.`
    await logEmail(subject, email, body)
  },
}
