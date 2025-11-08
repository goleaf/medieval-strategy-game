import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export async function verifyAuth(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch {
    return null
  }
}

export function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
}

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  return verifyAuth(token)
}

// NextAuth.js compatibility exports
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
    }
  }
}

export const auth = {
  verifyAuth,
  generateToken,
  getAuthUser
}
