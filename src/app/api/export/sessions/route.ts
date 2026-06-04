import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/export/sessions — download all sessions as CSV
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const sessions = await db.session.findMany({
    where: { userId, deletedAt: null },
    orderBy: { sessionDate: "desc" },
    include: {
      track:     { select: { name: true } },
      car:       { select: { name: true } },
      simulator: { select: { name: true } },
    },
  })

  const header = [
    "date", "simulator", "track", "car", "session_type",
    "total_laps", "valid_laps", "best_lap_ms", "avg_lap_ms", "ideal_lap_ms",
    "consistency_score", "safety_score", "pace_score", "improvement_score",
    "final_position", "is_new_pb", "dnf", "dq",
    "duration_sec", "is_online", "server_name",
  ]

  const rows = sessions.map((s) => [
    s.sessionDate.toISOString(),
    s.simulator.name,
    s.track.name,
    s.car.name,
    s.sessionType,
    s.totalLaps,
    s.validLaps,
    s.bestLapMs ?? "",
    s.avgLapMs != null ? Math.round(s.avgLapMs) : "",
    s.idealLapMs ?? "",
    s.consistencyScore ?? "",
    s.safetyScore ?? "",
    s.paceScore ?? "",
    "",
    s.finalPosition ?? "",
    s.isNewPB ? "true" : "false",
    s.dnf ? "true" : "false",
    s.dq  ? "true" : "false",
    s.durationSec ?? "",
    s.isOnline ? "true" : "false",
    s.serverName ? `"${s.serverName.replace(/"/g, '""')}"` : "",
  ])

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
  const filename = `urapex-sessions-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
