import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const s = await db.session.findUnique({
    where: { id, deletedAt: null },
    select: {
      id:               true,
      sessionType:      true,
      bestLapMs:        true,
      isNewPB:          true,
      totalLaps:        true,
      consistencyScore: true,
      userId:           true,
      track: { select: { name: true } },
      car:   { select: { name: true } },
    },
  })

  if (!s || s.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    id:               s.id,
    trackName:        s.track.name,
    carName:          s.car.name,
    sessionType:      s.sessionType,
    bestLapMs:        s.bestLapMs,
    isNewPB:          s.isNewPB,
    totalLaps:        s.totalLaps,
    consistencyScore: s.consistencyScore,
  })
}
