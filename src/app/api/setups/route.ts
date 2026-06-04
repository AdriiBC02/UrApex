import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  name:       z.string().min(1).max(100),
  trackId:    z.string().cuid().optional(),
  carId:      z.string().cuid().optional(),
  conditions: z.string().max(80).optional(),
  type:       z.string().max(40).optional(),
  notes:      z.string().max(4000).optional(),
  simulatorSlug: z.string().min(1),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const setups = await db.setup.findMany({
    where: { userId: session.user.id, isObsolete: false },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    include: {
      car:   { select: { name: true, slug: true } },
      track: { select: { name: true, slug: true } },
      simulator: { select: { name: true, slug: true } },
      versions: { orderBy: { version: "desc" }, take: 1, select: { version: true, createdAt: true } },
      _count: { select: { sessions: true } },
    },
  })

  return NextResponse.json({ setups })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 })

  const { name, trackId, carId, conditions, type, notes, simulatorSlug } = parsed.data

  const simulator = await db.simulator.findUnique({ where: { slug: simulatorSlug } })
  if (!simulator) return NextResponse.json({ error: "Simulator not found" }, { status: 422 })

  const setup = await db.setup.create({
    data: {
      userId: session.user.id,
      simulatorId: simulator.id,
      name,
      trackId: trackId ?? null,
      carId: carId ?? null,
      conditions: conditions ?? null,
      type: type ?? null,
      notes: notes ?? null,
    },
  })

  return NextResponse.json(setup, { status: 201 })
}
