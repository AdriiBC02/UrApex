import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  content:  z.string().min(1).max(4000),
  tags:     z.array(z.string().min(1).max(32)).max(10).default([]),
  videoUrl: z.string().url().optional().or(z.literal("")),
})

async function getOwnedSession(sessionId: string, userId: string) {
  return db.session.findFirst({ where: { id: sessionId, userId, deletedAt: null } })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!await getOwnedSession(id, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const notes = await db.sessionNote.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ notes })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!await getOwnedSession(id, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 422 })
  }

  const { content, tags, videoUrl } = parsed.data

  const note = await db.sessionNote.create({
    data: {
      sessionId: id,
      content,
      tags,
      videoUrl: videoUrl || null,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
