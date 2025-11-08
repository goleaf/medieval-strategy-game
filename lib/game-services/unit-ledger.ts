import type { Prisma } from "@prisma/client"

interface SyncHomeUnitParams {
  villageId: string
  ownerAccountId: string
  unitTypeId: string
  count: number
}

interface AdjustHomeUnitParams extends Omit<SyncHomeUnitParams, "count"> {
  delta: number
}

async function deleteHomeRows(
  tx: Prisma.TransactionClient,
  { villageId, ownerAccountId, unitTypeId }: Omit<SyncHomeUnitParams, "count">,
) {
  await tx.unitStack.deleteMany({
    where: { villageId, unitTypeId },
  })
  await tx.garrisonStack.deleteMany({
    where: { villageId, ownerAccountId, unitTypeId },
  })
}

export async function syncHomeUnitCount(tx: Prisma.TransactionClient, params: SyncHomeUnitParams): Promise<void> {
  const { villageId, ownerAccountId, unitTypeId, count } = params
  if (count <= 0) {
    await deleteHomeRows(tx, params)
    return
  }

  await tx.unitStack.upsert({
    where: { villageId_unitTypeId: { villageId, unitTypeId } },
    update: { count },
    create: { villageId, unitTypeId, count },
  })

  await tx.garrisonStack.upsert({
    where: { villageId_ownerAccountId_unitTypeId: { villageId, ownerAccountId, unitTypeId } },
    update: { count },
    create: { villageId, ownerAccountId, unitTypeId, count },
  })
}

export async function adjustHomeUnitCount(tx: Prisma.TransactionClient, params: AdjustHomeUnitParams): Promise<number> {
  const { villageId, ownerAccountId, unitTypeId, delta } = params
  if (delta === 0) return (await tx.unitStack.findUnique({ where: { villageId_unitTypeId: { villageId, unitTypeId } } }))
    ?.count ?? 0

  const existing = await tx.unitStack.findUnique({ where: { villageId_unitTypeId: { villageId, unitTypeId } } })
  const nextCount = Math.max(0, (existing?.count ?? 0) + delta)
  await syncHomeUnitCount(tx, { villageId, ownerAccountId, unitTypeId, count: nextCount })
  return nextCount
}
