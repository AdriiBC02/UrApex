import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStorageService } from "@/server/services/storage.service"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const replay = await db.replay.findUnique({ where: { id } })
  if (!replay || replay.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const buffer = await getStorageService().read(replay.storagePath)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/octet-stream",
      "Content-Disposition": `attachment; filename="${replay.originalName}"`,
      "Content-Length":      buffer.byteLength.toString(),
    },
  })
}
