import fs from "fs/promises"
import path from "path"

const LOG_PATH = path.join(process.cwd(), "server.log")

async function logSms(phoneNumber: string, message: string) {
  const entry = `[${new Date().toISOString()}] SMS to ${phoneNumber}\n${message}\n\n`
  try {
    await fs.appendFile(LOG_PATH, entry, "utf8")
  } catch (error) {
    console.error("Failed to log SMS", error)
  }
}

export const SmsService = {
  async sendTwoFactorCode(phoneNumber: string, code: string) {
    await logSms(phoneNumber, `Your Medieval Strategy security code is ${code}`)
  },
}
