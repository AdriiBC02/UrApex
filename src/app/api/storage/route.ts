import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const replays = await db.replay.findMany({
    where:   { userId: session.user.id },
    orderBy: { fileSizeBytes: "desc" },
    include: {
      session: {
        select: {
          id:          true,
          sessionType: true,
          sessionDate: true,
          track:       { select: { name: true } },
        },
      },
    },
  })

  const totalBytes = replays.reduce((sum, r) => sum + r.fileSizeBytes, BigInt(0))

  return NextResponse.json({
    totalBytes:   totalBytes.toString(),
    replayCount:  replays.length,
    replays: replays.map((r) => ({
      id:            r.id,
      originalName:  r.originalName,
      fileSizeBytes: r.fileSizeBytes.toString(),
      createdAt:     r.createdAt,
      session: {
        id:          r.session.id,
        sessionType: r.session.sessionType,
        sessionDate: r.session.sessionDate,
        trackName:   r.session.track.name,
      },
    })),
  })
}
