import { z } from "zod"
import { type NextRequest } from "next/server"

import { getRallyPointEngine } from "@/lib/rally-point/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

const targetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("village"), villageId: z.string().min(1) }),
  z.object({
    type: z.literal("coords"),
    x: z.number(),
    y: z.number(),
    targetVillageId: z.string().optional(),
  }),
])

const waveMemberSchema = z.object({
  mission: z.enum(["attack", "raid", "reinforce", "siege"]),
  target: targetSchema,
  units: z.record(z.number().int().nonnegative()),
  catapultTargets: z.array(z.string().min(1)).max(2).optional(),
  departAt: z.string().datetime().optional(),
})

const waveSchema = z.object({
  sourceVillageId: z.string().min(1),
  sourceAccountId: z.string().min(1),
  arriveAt: z.string().datetime(),
  tag: z.string().min(1),
  jitterMs: z.number().int().min(0).optional(),
  members: z.array(waveMemberSchema).min(1),
  idempotencyKey: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = waveSchema.safeParse(json)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const engine = getRallyPointEngine()
    const { arriveAt, members, ...rest } = parsed.data
    const result = await engine.sendWaveGroup({
      ...rest,
      arriveAt: new Date(arriveAt),
      members: members.map((member) => ({
        ...member,
        departAt: member.departAt ? new Date(member.departAt) : undefined,
      })),
    })

    return successResponse(result)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
