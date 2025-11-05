import { prisma } from "./lib/db"

// Ancient Europe regions for Reign of Fire
const ANCIENT_EUROPE_REGIONS = [
  // Core European regions
  { name: "Italia", code: "R01", centerX: 50, centerY: 30, radius: 25, type: "CAPITAL" as const },
  { name: "Gallia", code: "R02", centerX: 20, centerY: 40, radius: 30, type: "STRATEGIC" as const },
  { name: "Hispania", code: "R03", centerX: 10, centerY: 20, radius: 25, type: "NORMAL" as const },
  { name: "Britannia", code: "R04", centerX: 25, centerY: 70, radius: 20, type: "BORDER" as const },
  { name: "Germania", code: "R05", centerX: 45, centerY: 55, radius: 35, type: "STRATEGIC" as const },
  { name: "Dacia", code: "R06", centerX: 70, centerY: 45, radius: 25, type: "NORMAL" as const },
  { name: "Thracia", code: "R07", centerX: 75, centerY: 30, radius: 20, type: "NORMAL" as const },
  { name: "Macedonia", code: "R08", centerX: 80, centerY: 25, radius: 15, type: "NORMAL" as const },
  { name: "Achaea", code: "R09", centerX: 85, centerY: 20, radius: 15, type: "NORMAL" as const },

  // Extended regions to reach 87 total
  // Add more regions in a grid pattern
  ...Array.from({ length: 78 }, (_, i) => {
    const row = Math.floor(i / 10) + 1;
    const col = (i % 10) + 1;
    const types = ["NORMAL", "STRATEGIC", "BORDER"] as const;
    const type = types[i % 3];

    return {
      name: `Province ${row}-${col}`,
      code: `R${String(i + 10).padStart(2, '0')}`,
      centerX: 10 + (col - 1) * 12,
      centerY: 10 + (row - 1) * 12,
      radius: 8 + Math.floor(Math.random() * 5),
      type
    };
  })
];

export async function generateRegions() {
  console.log("[Reign of Fire] Generating 87 Ancient Europe regions...");

  // Clear existing regions
  try {
    await prisma.region.deleteMany();
  } catch (error) {
    console.log("[Reign of Fire] No existing regions to clear");
  }

  // Create regions
  for (const regionData of ANCIENT_EUROPE_REGIONS) {
    const region = await prisma.region.create({
      data: {
        name: regionData.name,
        regionCode: regionData.code,
        centerX: regionData.centerX,
        centerY: regionData.centerY,
        radius: regionData.radius,
        regionType: regionData.type,
        population: Math.floor(Math.random() * 1000) + 500, // Random population 500-1500
        victoryPoints: regionData.type === "CAPITAL" ? 50 :
                      regionData.type === "STRATEGIC" ? 30 :
                      regionData.type === "BORDER" ? 20 : 10
      }
    });

    console.log(`Created region: ${region.name} (${region.regionCode}) - ${region.victoryPoints} VP`);
  }

  console.log("[Reign of Fire] Generated 87 regions successfully!");
}

// Run if called directly
if (require.main === module) {
  generateRegions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error generating regions:", error);
      process.exit(1);
    });
}
