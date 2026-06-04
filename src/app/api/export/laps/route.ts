import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/export/laps — download all laps as CSV
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const laps = await db.lap.findMany({
    where: { session: { userId, deletedAt: null } },
    orderBy: [{ session: { sessionDate: "desc" } }, { lapNumber: "asc" }],
    include: {
      session: {
        select: {
          sessionDate: true,
          sessionType: true,
          track: { select: { name: true } },
          car: { select: { name: true } },
        },
      },
    },
  })

  const header = [
    "session_date", "track", "car", "session_type",
    "lap_number", "lap_time_ms", "is_valid", "is_personal_best", "is_session_best",
    "sector1_ms", "sector2_ms", "sector3_ms", "fuel_load", "tyre_compound",
  ]

  const rows = laps.map((l) => [
    l.session.sessionDate.toISOString(),
    l.session.track.name,
    l.session.car.name,
    l.session.sessionType,
    l.lapNumber,
    l.lapTimeMs ?? "",
    l.isValid ? "true" : "false",
    l.isPersonalBest ? "true" : "false",
    l.isSessionBest ? "true" : "false",
    l.sector1Ms ?? "",
    l.sector2Ms ?? "",
    l.sector3Ms ?? "",
    l.fuelLoad ?? "",
    l.tyreCompound ? `"${l.tyreCompound.replace(/"/g, '""')}"` : "",
  ])

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
  const filename = `urapex-laps-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
