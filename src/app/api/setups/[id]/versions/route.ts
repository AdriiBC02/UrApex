import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const schema = z.object({ notes: z.string().max(1000).nullable().optional() })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const setup = await db.setup.findUnique({ where: { id } })
  if (!setup || setup.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 })

  // Next version number
  const latest = await db.setupVersion.findFirst({
    where: { setupId: id },
    orderBy: { version: "desc" },
    select: { version: true },
  })
  const nextVersion = (latest?.version ?? 0) + 1

  const version = await db.setupVersion.create({
    data: { setupId: id, version: nextVersion, notes: parsed.data.notes ?? null },
  })

  // Bump setup updatedAt
  await db.setup.update({ where: { id }, data: { updatedAt: new Date() } })

  return NextResponse.json(version, { status: 201 })
}
