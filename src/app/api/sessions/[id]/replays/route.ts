import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sha256 } from "@/lib/hash"
import { getStorageService } from "@/server/services/storage.service"

function replayKey(userId: string, hash: string) {
  return `replays/${userId}/${hash}.vcr`
}

// POST /api/sessions/[id]/replays — upload a .vcr replay file
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: sessionId } = await params
  const gameSession = await db.session.findUnique({ where: { id: sessionId, deletedAt: null } })
  if (!gameSession || gameSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 422 })

  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext !== "vcr") return NextResponse.json({ error: "Only .vcr files are supported" }, { status: 422 })

  const buffer   = Buffer.from(await file.arrayBuffer())
  const fileHash = sha256(buffer)

  // Dedup: same hash = same replay already stored
  const existing = await db.replay.findUnique({ where: { fileHash } })
  if (existing) return NextResponse.json({ error: "This replay is already uploaded" }, { status: 409 })

  const storage     = getStorageService()
  const storagePath = await storage.save(buffer, replayKey(session.user.id, fileHash))

  const replay = await db.replay.create({
    data: {
      userId:        session.user.id,
      sessionId,
      storagePath,
      originalName:  file.name,
      fileSizeBytes: BigInt(buffer.byteLength),
      fileHash,
    },
  })

  return NextResponse.json({
    id:           replay.id,
    originalName: replay.originalName,
    fileSizeBytes: replay.fileSizeBytes.toString(),
    createdAt:    replay.createdAt,
  }, { status: 201 })
}

// GET /api/sessions/[id]/replays — list replays for a session
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: sessionId } = await params
  const gameSession = await db.session.findUnique({ where: { id: sessionId, deletedAt: null } })
  if (!gameSession || gameSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const replays = await db.replay.findMany({
    where:   { sessionId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(replays.map((r) => ({
    id:            r.id,
    originalName:  r.originalName,
    fileSizeBytes: r.fileSizeBytes.toString(),
    createdAt:     r.createdAt,
  })))
}
