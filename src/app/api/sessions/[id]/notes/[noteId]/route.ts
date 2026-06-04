import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, noteId } = await params

  const note = await db.sessionNote.findFirst({
    where: { id: noteId, sessionId: id, session: { userId: session.user.id } },
  })
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.sessionNote.delete({ where: { id: noteId } })
  return new NextResponse(null, { status: 204 })
}
