import { PrismaClient } from "@prisma/client"
import path from "path"

if (process.env.DATABASE_URL?.startsWith("file:./")) {
  const relativePath = process.env.DATABASE_URL.replace("file:", "")
  const absolutePath = path.resolve(process.cwd(), relativePath)
  process.env.DATABASE_URL = `file:${absolutePath}`
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
