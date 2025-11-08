import { RallyPointEngine } from "./engine"
import { PrismaRallyPointRepository } from "./prisma-repository"
import { buildUnitCatalog } from "./unit-catalog"

let engine: RallyPointEngine | null = null

export function getRallyPointEngine(): RallyPointEngine {
  if (!engine) {
    const repo = new PrismaRallyPointRepository()
    const catalog = buildUnitCatalog()
    engine = new RallyPointEngine(repo, catalog)
  }
  return engine
}
