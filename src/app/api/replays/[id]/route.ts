import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStorageService } from "@/server/services/storage.service"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const replay = await db.replay.findUnique({ where: { id } })
  if (!replay || replay.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await getStorageService().delete(replay.storagePath)
  await db.replay.delete({ where: { id } })

  return NextResponse.json({ deleted: true })
}
