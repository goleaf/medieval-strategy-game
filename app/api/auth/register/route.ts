import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"
import { type NextRequest, NextResponse } from "next/server"
import { VillageService } from "@/lib/game-services/village-service"
import { CulturePointService } from "@/lib/game-services/culture-point-service"
import { validatePassword, validateUsername } from "@/lib/security/password-policy"
import { CaptchaService } from "@/lib/security/captcha-service"
import { EmailVerificationService } from "@/lib/security/email-verification-service"
import { SecurityQuestionService } from "@/lib/security/security-question-service"

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      username,
      password,
      displayName,
      gameWorldId,
      tribe,
      securityQuestions = [],
      captchaId,
      captchaAnswer,
    } = await req.json()

    // Validation
    if (!email || !username || !password || !captchaId || !captchaAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const captchaValid = await CaptchaService.verifyChallenge(captchaId, captchaAnswer)
    if (!captchaValid) {
      return NextResponse.json({ error: "Captcha validation failed" }, { status: 400 })
    }

    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return NextResponse.json({ error: usernameValidation.errors[0] }, { status: 400 })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors[0] }, { status: 400 })
    }

    // Validate game world and tribe selection
    let selectedGameWorld = null
    if (gameWorldId) {
      selectedGameWorld = await prisma.gameWorld.findUnique({
        where: { id: gameWorldId },
        include: { availableTribes: true }
      })

      if (!selectedGameWorld) {
        return NextResponse.json({ error: "Selected game world not found" }, { status: 400 })
      }

      if (!selectedGameWorld.isRegistrationOpen) {
        return NextResponse.json({ error: "Registration is closed for this game world" }, { status: 400 })
      }

      if (tribe && !selectedGameWorld.availableTribes.some(t => t.tribe === tribe)) {
        return NextResponse.json({
          error: `Tribe ${tribe} is not available in this game world. Available tribes: ${selectedGameWorld.availableTribes.map(t => t.tribe).join(', ')}`
        }, { status: 400 })
      }
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password: hashedPassword,
        displayName: displayName || username,
      },
    })

    // Create initial player with game world assignment
    const player = await prisma.player.create({
      data: {
        userId: user.id,
        playerName: username,
        gameWorldId: selectedGameWorld?.id,
        culturePoints: selectedGameWorld?.startingCulturePoints || 500,
        ...(tribe && { tribeId: tribe }),
      },
    })

    await CulturePointService.refreshAccount(player.id, selectedGameWorld)

    // Initialize beginner protection
    const { ProtectionService } = await import("@/lib/game-services/protection-service")
    await ProtectionService.initializeProtection(player.id)

    // Apply optional security questions
    if (securityQuestions.length) {
      await SecurityQuestionService.upsertQuestions(user.id, securityQuestions)
    }

    // Create initial village with random name
    await VillageService.ensurePlayerHasVillage(player.id)

    // Send verification email
    await EmailVerificationService.sendVerificationEmail(user.id, user.email)

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, username: user.username },
        player: { id: player.id, playerName: player.playerName },
        verificationRequired: true,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
