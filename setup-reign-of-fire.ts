import { prisma } from "./lib/db";
import { generateRegions } from "./generate-regions";

async function setupReignOfFire() {
  console.log("🔥 Setting up Reign of Fire - This will reset all data! 🔥");

  try {
    // Clear all existing data in reverse dependency order
    console.log("🗑️  Clearing existing data...");

    const deleteOperations = [
      () => prisma.auditLog.deleteMany(),
      () => prisma.adminNotification.deleteMany(),
      () => prisma.maintenance.deleteMany(),
      () => prisma.adminMessage.deleteMany(),
      () => prisma.troopProduction.deleteMany(),
      () => prisma.troop.deleteMany(),
      () => prisma.movement.deleteMany(),
      () => prisma.attackUnit.deleteMany(),
      () => prisma.defenseUnit.deleteMany(),
      () => prisma.attack.deleteMany(),
      () => prisma.defense.deleteMany(),
      () => prisma.marketOrder.deleteMany(),
      () => prisma.message.deleteMany(),
      () => prisma.building.deleteMany(),
      () => prisma.village.deleteMany(),
      () => prisma.continent.deleteMany(),
      () => prisma.barbarian.deleteMany(),
      () => prisma.region.deleteMany(),
      () => prisma.tribeInvite.deleteMany(),
      () => prisma.alliance.deleteMany(),
      () => prisma.war.deleteMany(),
      () => prisma.tribe.deleteMany(),
      () => prisma.heroAdventure.deleteMany(),
      () => prisma.heroEquipment.deleteMany(),
      () => prisma.heroItem.deleteMany(),
      () => prisma.hero.deleteMany(),
      () => prisma.material.deleteMany(),
      () => prisma.craftingAction.deleteMany(),
      () => prisma.player.deleteMany(),
      () => prisma.admin.deleteMany(),
      () => prisma.user.deleteMany(),
      () => prisma.leaderboardCache.deleteMany(),
      () => prisma.troopBalance.deleteMany(),
      () => prisma.worldConfig.deleteMany(),
      () => prisma.gameWorldTribe.deleteMany(),
      () => prisma.gameWorld.deleteMany(),
    ];

    for (const deleteOp of deleteOperations) {
      try {
        await deleteOp();
      } catch (error) {
        // Table might not exist yet, continue
      }
    }

    console.log("✅ Database cleared");

    // Initialize the world
    console.log("🌍 Initializing Reign of Fire world...");
    const { initializeWorld } = await import("./lib/world-generator");
    await initializeWorld();

    // Generate regions
    console.log("🏛️  Generating 87 regions...");
    await generateRegions();

    console.log("🎉 Reign of Fire setup complete!");
    console.log("🚀 You can now start the application and test the new features.");

  } catch (error) {
    console.error("❌ Error during setup:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupReignOfFire()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Setup failed:", error);
      process.exit(1);
    });
}
