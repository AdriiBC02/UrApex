import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getImportQueue } from "@/server/queue/import.queue"

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]
  if (bearer) {
    const user = await db.user.findUnique({ where: { apiKey: bearer }, select: { id: true } })
    return user?.id ?? null
  }
  const session = await auth()
  return session?.user?.id ?? null
}

// GET /api/import/[id] — status check (supports Bearer token for companion polling)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const importFile = await db.importFile.findUnique({
    where: { id },
    include: { session: { select: { id: true } } },
  })

  if (!importFile || importFile.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: importFile.id,
    status: importFile.status,
    sessionId: importFile.session?.id,
    errorMessage: importFile.errorMessage,
    parserVersion: importFile.parserVersion,
    importedAt: importFile.importedAt,
  })
}

// POST /api/import/[id] — retry failed import
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const importFile = await db.importFile.findUnique({ where: { id } })

  if (!importFile || importFile.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (importFile.status !== "FAILED") {
    return NextResponse.json({ error: "Only failed imports can be retried" }, { status: 422 })
  }

  await db.importFile.update({
    where: { id },
    data: { status: "PENDING" as const, errorMessage: null, errorDetails: undefined },
  })

  await getImportQueue().add("process", { importFileId: id })
  return NextResponse.json({ status: "PENDING" })
}

// DELETE /api/import/[id] — delete import + session
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const importFile = await db.importFile.findUnique({
    where: { id },
    include: { session: { select: { id: true } } },
  })

  if (!importFile || importFile.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Soft-delete session if it exists
  if (importFile.session?.id) {
    await db.session.update({
      where: { id: importFile.session.id },
      data: { deletedAt: new Date() },
    })
  }

  await db.importFile.delete({ where: { id } })

  return NextResponse.json({ deleted: true })
}
