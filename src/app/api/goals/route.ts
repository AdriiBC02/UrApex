import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const goals = await db.goal.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      targetValue: true,
      currentValue: true,
      unit: true,
      deadline: true,
      completedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ goals })
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum([
    "BEST_LAP_TIME",
    "CONSISTENCY_SCORE",
    "CLEAN_LAP_COUNT",
    "SESSION_COUNT",
    "HOURS_DRIVEN",
    "REDUCE_INCIDENTS",
    "IMPROVE_SAFETY",
    "COMPLETE_STINTS",
    "CUSTOM",
  ]),
  targetValue: z.number().positive(),
  trackId: z.string().cuid().optional(),
  carId: z.string().cuid().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { name, type, targetValue, trackId, carId, deadline } = parsed.data

  const goal = await db.goal.create({
    data: {
      userId: session.user.id,
      name,
      type,
      targetValue,
      trackId: trackId ?? null,
      carId: carId ?? null,
      deadline: deadline ? new Date(`${deadline}T00:00:00.000Z`) : null,
    },
    select: { id: true, name: true, type: true, status: true, targetValue: true, createdAt: true },
  })

  return NextResponse.json(goal, { status: 201 })
}
