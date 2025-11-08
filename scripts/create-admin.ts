import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

async function createAdmin() {
  console.log("Creating admin user...")

  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { username: "admin" },
      include: { admin: true }
    })

    if (existingAdmin?.admin) {
      console.log("Admin user already exists, updating password...")
      // Force update password
      const hashedPassword = await bcrypt.hash("admin123", 12)
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword }
      })
      console.log("Admin password updated")
      return
    }

    // Create admin user with properly hashed password
    const hashedPassword = await bcrypt.hash("admin123", 12)

    // First check if user exists and update password if needed
    let user = await prisma.user.findUnique({
      where: { username: "admin" },
      include: { admin: true }
    })

    if (user) {
      // Update password if it's not properly hashed
      if (user.password === "hashed_password" || !user.password.startsWith("$")) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
          include: { admin: true }
        })
        console.log(`Updated admin password`)
      }
    } else {
      user = await prisma.user.create({
        data: {
          email: "admin@game.local",
          username: "admin",
          password: hashedPassword,
          displayName: "Administrator",
        },
        include: { admin: true }
      })
    }

    // Create admin role if it doesn't exist
    let admin = user.admin
    if (!admin) {
      admin = await prisma.admin.create({
        data: {
          userId: user.id,
          role: "SUPERADMIN",
        },
      })
      console.log(`Created admin role`)
    }

    console.log(`Admin user ready: ${user.username}`)
    console.log(`Admin ID: ${admin.id}`)
    console.log(`Login credentials: admin / admin123`)

  } catch (error) {
    console.error("Error creating admin:", error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
