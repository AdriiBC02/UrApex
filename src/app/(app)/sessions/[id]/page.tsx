import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime, formatDelta, formatDuration } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LapTimeChart } from "@/components/charts/LapTimeChart"
import { Flag, Clock, Map, Car, Trophy, AlertTriangle, Fuel } from "lucide-react"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [sessionAuth, { id }] = await Promise.all([auth(), params])
  if (!sessionAuth?.user?.id) redirect("/login")

  const s = await db.session.findUnique({
    where: { id, deletedAt: null },
    include: {
      track: true,
      car: true,
      carClass: true,
      simulator: true,
      laps: { orderBy: { lapNumber: "asc" } },
      participants: { orderBy: { position: "asc" }, take: 30 },
      incidents: { orderBy: { lapNumber: "asc" } },
      penalties: { orderBy: { lapNumber: "asc" } },
      pitStops: { orderBy: { lapNumber: "asc" } },
    },
  })

  if (!s || s.userId !== sessionAuth.user.id) notFound()

  const validLaps = s.laps.filter((l) => l.isValid && l.lapTimeMs)
  const hasSectors = validLaps.some((l) => l.sector1Ms && l.sector2Ms && l.sector3Ms)

  // Best sectors
  const bestS1 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector1Ms).map((l) => l.sector1Ms!)) : null
  const bestS2 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector2Ms).map((l) => l.sector2Ms!)) : null
  const bestS3 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector3Ms).map((l) => l.sector3Ms!)) : null

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-zinc-100">{s.track.name}</h1>
            <TypeBadge type={s.sessionType} />
            {s.isNewPB && (
              <Badge className="bg-cyan-500/15 text-cyan-400 border-0">New PB</Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            {s.car.name}
            {s.carClass && <span className="text-zinc-600"> · {s.carClass.name}</span>}
            <span className="mx-2 text-zinc-700">·</span>
            {SIMULATOR_LABELS[s.simulator.slug] ?? s.simulator.slug}
            <span className="mx-2 text-zinc-700">·</span>
            {new Date(s.sessionDate).toLocaleDateString("en-GB", {
              weekday: "short", day: "numeric", month: "long", year: "numeric",
            })}
            {s.serverName && <span className="text-zinc-600"> · {s.serverName}</span>}
          </p>
        </div>
        {s.finalPosition != null && (
          <div className="text-right shrink-0">
            <div className="text-4xl font-bold font-mono text-zinc-100">P{s.finalPosition}</div>
            <div className="text-xs text-zinc-500">
              {s.participants.length > 1 && `of ${s.participants.length}`}
            </div>
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Best lap" value={formatLapTime(s.bestLapMs)} mono />
        <MetricCard label="Avg lap" value={formatLapTime(s.avgLapMs ? Math.round(s.avgLapMs) : null)} mono />
        <MetricCard label="Ideal lap" value={formatLapTime(s.idealLapMs)} mono />
        <MetricCard
          label="Gap to ideal"
          value={
            s.bestLapMs && s.idealLapMs
              ? formatDelta(s.bestLapMs - s.idealLapMs)
              : "—"
          }
          mono
        />
        <MetricCard label="Laps" value={`${s.validLaps}/${s.totalLaps}`} />
        <MetricCard label="Consistency" value={s.consistencyScore?.toFixed(1) ?? "—"} score={s.consistencyScore} />
        <MetricCard label="Safety" value={s.safetyScore?.toFixed(1) ?? "—"} score={s.safetyScore} />
        <MetricCard
          label="Drop-off"
          value={s.dropOffMs != null ? formatDelta(s.dropOffMs) : "—"}
          mono
        />
      </div>

      {/* Lap time chart */}
      {validLaps.length > 1 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Lap times</CardTitle>
          </CardHeader>
          <CardContent>
            <LapTimeChart
              laps={s.laps.map((l) => ({
                lapNumber: l.lapNumber,
                lapTimeMs: l.lapTimeMs,
                isValid: l.isValid,
                isPersonalBest: l.isPersonalBest,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Sectors */}
      {hasSectors && bestS1 && bestS2 && bestS3 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Sector breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Sector 1", best: bestS1 },
                { label: "Sector 2", best: bestS2 },
                { label: "Sector 3", best: bestS3 },
              ].map(({ label, best }) => (
                <div key={label} className="text-center">
                  <div className="text-xs text-zinc-500 mb-1">{label}</div>
                  <div className="text-lg font-mono font-semibold text-cyan-400">
                    {formatLapTime(best)}
                  </div>
                </div>
              ))}
            </div>
            {s.idealLapMs && (
              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between text-sm">
                <span className="text-zinc-400">Ideal lap</span>
                <span className="font-mono text-zinc-200">{formatLapTime(s.idealLapMs)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lap table */}
      {s.laps.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Laps</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["#", "Time", "Delta", "S1", "S2", "S3", "Fuel", "Valid"].map((h) => (
                      <th key={h} className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {s.laps.map((lap) => (
                    <tr
                      key={lap.lapNumber}
                      className={`${
                        !lap.isValid
                          ? "opacity-50"
                          : lap.isPersonalBest
                            ? "bg-cyan-500/5"
                            : ""
                      }`}
                    >
                      <td className="px-4 py-2 text-zinc-500 font-mono">{lap.lapNumber}</td>
                      <td className="px-4 py-2 font-mono text-zinc-200">
                        <span>{formatLapTime(lap.lapTimeMs)}</span>
                        {lap.isPersonalBest && (
                          <span className="ml-1.5 text-[10px] text-cyan-400">PB</span>
                        )}
                        {lap.isSessionBest && !lap.isPersonalBest && (
                          <span className="ml-1.5 text-[10px] text-yellow-400">SB</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {lap.lapTimeMs && s.bestLapMs ? (
                          <span className={lap.lapTimeMs === s.bestLapMs ? "text-cyan-400" : "text-zinc-500"}>
                            {lap.lapTimeMs === s.bestLapMs ? "---.---" : `+${((lap.lapTimeMs - s.bestLapMs) / 1000).toFixed(3)}`}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                        {formatLapTime(lap.sector1Ms)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                        {formatLapTime(lap.sector2Ms)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                        {formatLapTime(lap.sector3Ms)}
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-500">
                        {lap.fuelLoad != null ? `${lap.fuelLoad.toFixed(1)}L` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {lap.isValid ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <span className="text-red-400 text-xs">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      {s.participants.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Pos", "Driver", "Car", "Class", "Laps", "Best lap"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {s.participants.map((p, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2 font-mono text-zinc-400">
                      {p.dnf ? "DNF" : p.dq ? "DQ" : p.position != null ? `P${p.position}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-200">{p.driverName}</td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">{p.carName ?? "—"}</td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">{p.carClass ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-zinc-400">{p.lapsCompleted ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-zinc-300">{formatLapTime(p.bestLapMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Incidents & Penalties */}
      {(s.incidents.length > 0 || s.penalties.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {s.incidents.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  Incidents ({s.incidents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-zinc-400">
                  {s.incidents.map((inc, i) => (
                    <div key={i} className="flex gap-2">
                      {inc.lapNumber != null && (
                        <span className="font-mono text-zinc-600">L{inc.lapNumber}</span>
                      )}
                      <span>{inc.description ?? inc.type ?? "Incident"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {s.penalties.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5 text-red-400" />
                  Penalties ({s.penalties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-zinc-400">
                  {s.penalties.map((pen, i) => (
                    <div key={i} className="flex gap-2">
                      {pen.lapNumber != null && (
                        <span className="font-mono text-zinc-600">L{pen.lapNumber}</span>
                      )}
                      <span>{pen.description ?? pen.type ?? "Penalty"}</span>
                      {pen.timeSec != null && (
                        <span className="text-zinc-500">+{pen.timeSec}s</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  mono = false,
  score,
}: {
  label: string
  value: string
  mono?: boolean
  score?: number | null
}) {
  const scoreColor =
    score == null ? "" :
    score >= 90 ? "text-green-400" :
    score >= 75 ? "text-lime-400" :
    score >= 60 ? "text-yellow-400" :
    score >= 40 ? "text-orange-400" : "text-red-400"

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="text-xs text-zinc-500 mb-1">{label}</div>
        <div className={`text-xl font-semibold ${mono ? "font-mono" : ""} ${scoreColor || "text-zinc-100"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    RACE: "bg-orange-950/60 text-orange-400",
    QUALIFYING: "bg-cyan-950/60 text-cyan-400",
    PRACTICE: "bg-zinc-800 text-zinc-400",
    HOTLAP: "bg-purple-950/60 text-purple-400",
  }
  return (
    <Badge className={`text-[10px] border-0 ${colors[type] ?? "bg-zinc-800 text-zinc-500"}`}>
      {SESSION_TYPE_LABELS[type] ?? type}
    </Badge>
  )
}
