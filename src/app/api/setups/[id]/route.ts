import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const patchSchema = z.object({
  name:       z.string().min(1).max(100).optional(),
  conditions: z.string().max(80).nullable().optional(),
  type:       z.string().max(40).nullable().optional(),
  notes:      z.string().max(4000).nullable().optional(),
  isFavorite: z.boolean().optional(),
  isObsolete: z.boolean().optional(),
})

async function getOwned(id: string, userId: string) {
  return db.setup.findFirst({ where: { id, userId } })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const setup = await db.setup.findFirst({
    where: { id, userId: session.user.id },
    include: {
      car:       { select: { name: true, slug: true } },
      track:     { select: { name: true, slug: true } },
      simulator: { select: { name: true, slug: true } },
      versions:  { orderBy: { version: "desc" } },
      sessions:  {
        include: {
          session: {
            select: {
              id: true, sessionDate: true, sessionType: true,
              track: { select: { name: true } },
              bestLapMs: true,
            },
          },
        },
        orderBy: { session: { sessionDate: "desc" } },
        take: 10,
      },
    },
  })

  if (!setup) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(setup)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!await getOwned(id, session.user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 })

  const updated = await db.setup.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!await getOwned(id, session.user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.setup.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
