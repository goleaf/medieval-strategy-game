import nodemailer, { type Transporter } from "nodemailer"

let transporter: Transporter | null = null

export function getEmailTransport(): Transporter {
  if (transporter) {
    return transporter
  }

  const host = process.env.EMAIL_SMTP_HOST
  const port = Number(process.env.EMAIL_SMTP_PORT ?? 587)
  const user = process.env.EMAIL_SMTP_USER
  const pass = process.env.EMAIL_SMTP_PASS

  if (!host) {
    throw new Error("EMAIL_SMTP_HOST is not configured")
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  })

  return transporter
}
