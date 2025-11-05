import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "../middleware"
import { prisma } from "@/lib/db"
import { VillageService } from "@/lib/game-services/village-service"
import { ProtectionService } from "@/lib/game-services/protection-service"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth || !auth.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { mapQuarter, tribe, playerName } = await req.json()

    // Validate input
    if (!mapQuarter || !tribe || !playerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate map quarter
    const validQuarters = ["NW", "NE", "SW", "SE"]
    if (!validQuarters.includes(mapQuarter)) {
      return NextResponse.json({ error: "Invalid map quarter" }, { status: 400 })
    }

    // Validate tribe
    const validTribes = ["ROMANS", "TEUTONS", "GAULS", "HUNS", "EGYPTIANS", "SPARTANS", "VIKINGS"]
    if (!validTribes.includes(tribe)) {
      return NextResponse.json({ error: "Invalid tribe" }, { status: 400 })
    }

    // Check if player name is already taken
    const existingPlayer = await prisma.player.findUnique({
      where: { playerName }
    })

    if (existingPlayer) {
      return NextResponse.json({ error: "Player name already taken" }, { status: 409 })
    }

    // Get current player data with all necessary relations
    const currentPlayer = await prisma.player.findUnique({
      where: { id: auth.playerId },
      include: {
        hero: true,
        Village: true,
        gameWorld: true,
        materials: true,
        craftingActions: true,
        receivedMessages: true,
        AdminMessage: true,
      }
    })

    if (!currentPlayer) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    // Check respawn conditions
    const conditionsCheck = await checkRespawnConditions(currentPlayer)
    if (!conditionsCheck.canRespawn) {
      return NextResponse.json({
        error: "Cannot respawn: " + conditionsCheck.reasons.join(", ")
      }, { status: 400 })
    }

    // Perform respawn in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark current player as deleted
      await tx.player.update({
        where: { id: currentPlayer.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          playerName: `${currentPlayer.playerName}_abandoned_${Date.now()}`, // Rename to free up the name
        }
      })

      // 2. Create new player
      const newPlayer = await tx.player.create({
        data: {
          userId: auth.userId,
          playerName,
          gameWorldId: currentPlayer.gameWorldId,
          gameTribe: tribe as any, // Set the selected tribe
        }
      })

      // 3. Transfer materials (which contain gold information)
      if (currentPlayer.materials.length > 0) {
        await tx.material.createMany({
          data: currentPlayer.materials.map(material => ({
            playerId: newPlayer.id,
            rarity: material.rarity,
            quantity: material.quantity,
          }))
        })
      }

      // 4. Initialize beginner protection for new player
      await ProtectionService.initializeProtection(newPlayer.id)

      // 5. Create new village for new player
      await VillageService.ensurePlayerHasVillage(newPlayer.id)

      // 6. Set tribe for new player (this would normally be done through tribe selection)
      // For now, we'll create a basic tribe assignment
      // In a full implementation, this would be part of the tribe selection flow

      // Note: Gold transfer logic would go here if we had a gold system
      // For now, we're assuming materials represent the gold/currency system

      // Log the respawn action for audit purposes
      // This would be implemented when audit logging is added
    })

    return NextResponse.json({
      success: true,
      message: "Avatar respawned successfully"
    })

  } catch (error) {
    console.error("Respawn failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function checkRespawnConditions(player: any): Promise<{ canRespawn: boolean, reasons: string[] }> {
  const reasons: string[] = []

  // Check if game world is still open for registration
  if (!player.gameWorld?.isRegistrationOpen) {
    reasons.push("Game world registration is closed")
  }

  // Check if avatar is not scheduled for deletion
  if (player.isDeleted) {
    reasons.push("Avatar is scheduled for deletion")
  }

  // Check if avatar is not banned
  if (player.banReason) {
    reasons.push("Avatar is banned")
  }

  // Check if still under beginner's protection
  if (!player.beginnerProtectionUntil || new Date(player.beginnerProtectionUntil) < new Date()) {
    reasons.push("Beginner protection has expired")
  }

  // Check if auction house is not fully unlocked (hero completed enough adventures)
  // Travian has 20 adventures to unlock auction house
  if (player.hero && player.hero.adventuresCompleted >= 20) {
    reasons.push("Auction house is fully unlocked")
  }

  // Check if only has one village
  if (player.Village.length !== 1) {
    reasons.push("Must have exactly one village")
  }

  return {
    canRespawn: reasons.length === 0,
    reasons
  }
}
