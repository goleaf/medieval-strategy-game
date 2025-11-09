import jwt from "jsonwebtoken"
import { SECURITY_CONFIG } from "@/lib/config/security"
import { SessionService, type CreateSessionOptions } from "@/lib/security/session-service"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export type AuthTokenPayload = {
  userId: string
  sessionId?: string
  isSitter?: boolean
  sitterFor?: string
  isDual?: boolean
  dualFor?: string
  playerId?: string
}

export async function createSessionToken(
  userId: string,
  options: CreateSessionOptions & { additionalPayload?: Record<string, unknown> } = {},
) {
  const session = await SessionService.createSession(userId, options)
  const expiresIn = options.rememberMe
    ? `${SECURITY_CONFIG.session.rememberLifetimeDays}d`
    : `${SECURITY_CONFIG.session.defaultLifetimeHours}h`

  const token = jwt.sign(
    {
      userId,
      sessionId: session.id,
      ...(options.additionalPayload || {}),
    },
    JWT_SECRET,
    { expiresIn },
  )

  return { token, session }
}

export async function verifyAuth(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload
    if (decoded.isSitter || decoded.isDual) {
      return decoded
    }

    if (!decoded.sessionId) {
      return null
    }

    const session = await SessionService.validateSession(decoded.sessionId)
    if (!session) {
      return null
    }
    const rotatedToken = await maybeRotateToken(decoded.userId, session)
    return { ...decoded, session, rotatedToken }
  } catch (error) {
    return null
  }
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.slice(7)
  return verifyAuth(token)
}

export const authOptions = {
  providers: [],
  secret: JWT_SECRET,
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.userId = token.userId
      }
      return session
    },
  },
}

export const auth = {
  verifyAuth,
  createSessionToken,
  getAuthUser,
}

// Rotate JWT periodically to reduce replay window (stateless servers)
const ROTATE_MINUTES = parseInt(process.env.SESSION_ROTATE_MINUTES || "15", 10)
async function maybeRotateToken(userId: string, session: { id: string; lastSeenAt: Date; expiresAt: Date }) {
  try {
    const now = Date.now()
    if (now - new Date(session.lastSeenAt).getTime() < ROTATE_MINUTES * 60_000) return undefined
    const expiresInMs = new Date(session.expiresAt).getTime() - now
    if (expiresInMs <= 0) return undefined
    const token = jwt.sign({ userId, sessionId: session.id }, JWT_SECRET, { expiresIn: Math.floor(expiresInMs / 1000) })
    return token
  } catch {
    return undefined
  }
}
