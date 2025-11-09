import crypto from "crypto"
import { fromBase32, toBase32 } from "@/lib/security/base32"

type TotpOptions = {
  step?: number
  window?: number
  digits?: number
}

const DEFAULT_STEP = 30
const DEFAULT_WINDOW = 1
const DEFAULT_DIGITS = 6

export function generateTotpSecret(bytes = 32) {
  return toBase32(crypto.randomBytes(bytes))
}

export function generateTotpUri({
  secret,
  label,
  issuer,
  digits = DEFAULT_DIGITS,
}: {
  secret: string
  label: string
  issuer: string
  digits?: number
}) {
  const encodedLabel = encodeURIComponent(label)
  const encodedIssuer = encodeURIComponent(issuer)
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&digits=${digits}`
}

export function verifyTotpCode(secret: string, token: string, options: TotpOptions = {}) {
  const step = options.step ?? DEFAULT_STEP
  const window = options.window ?? DEFAULT_WINDOW
  const digits = options.digits ?? DEFAULT_DIGITS

  const trimmed = token.trim().replace(/\s+/g, "")
  if (!/^\d{6}$/.test(trimmed)) return false

  const counter = Math.floor(Date.now() / 1000 / step)
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const generated = generateCode(secret, counter + errorWindow, digits)
    if (generated === trimmed) {
      return true
    }
  }

  return false
}

function generateCode(secret: string, counter: number, digits: number) {
  if (counter < 0) return ""
  const decodedSecret = fromBase32(secret)
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(counter / Math.pow(2, 32)), 0)
  buffer.writeUInt32BE(counter & 0xffffffff, 4)

  const hmac = crypto.createHmac("sha1", decodedSecret)
  hmac.update(buffer)
  const digest = hmac.digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  const otp = binary % 10 ** digits
  return otp.toString().padStart(digits, "0")
}
