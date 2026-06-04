import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime, formatDelta, formatDuration } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { LapTimeChart } from "@/components/charts/LapTimeChart"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { SessionNotes } from "@/features/sessions/SessionNotes"
import {
  Flag, Clock, Map, Car, Trophy, AlertTriangle,
  ArrowLeft, TrendingUp, Gauge, Timer, Activity, StickyNote,
  Lightbulb, CheckCircle2, AlertCircle, Info, GitCompare,
} from "lucide-react"
import Link from "next/link"

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
      notes:    { orderBy: { createdAt: "desc" } },
      insights: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!s || s.userId !== sessionAuth.user.id) notFound()

  const validLaps = s.laps.filter((l) => l.isValid && l.lapTimeMs)
  const hasSectors = validLaps.some((l) => l.sector1Ms && l.sector2Ms && l.sector3Ms)

  const bestS1 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector1Ms).map((l) => l.sector1Ms!)) : null
  const bestS2 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector2Ms).map((l) => l.sector2Ms!)) : null
  const bestS3 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector3Ms).map((l) => l.sector3Ms!)) : null

  const typeColors: Record<string, { bg: string; text: string }> = {
    RACE:        { bg: "bg-orange-500/10", text: "text-orange-400" },
    QUALIFYING:  { bg: "bg-cyan-500/10",   text: "text-cyan-400" },
    PRACTICE:    { bg: "bg-zinc-700/40",   text: "text-zinc-400" },
    HOTLAP:      { bg: "bg-purple-500/10", text: "text-purple-400" },
    TIME_TRIAL:  { bg: "bg-purple-500/10", text: "text-purple-400" },
  }
  const tc = typeColors[s.sessionType] ?? { bg: "bg-zinc-800", text: "text-zinc-400" }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Back nav + compare button */}
      <div className="flex items-center justify-between">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Sessions
        </Link>
        <Link
          href={`/sessions/compare?a=${s.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-1.5"
        >
          <GitCompare className="w-3.5 h-3.5" />
          Compare
        </Link>
      </div>

      {/* Hero header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {/* Top color bar */}
        <div className={`h-1 w-full ${s.sessionType === "RACE" ? "bg-gradient-to-r from-orange-500/60 via-orange-400/30 to-transparent" : s.sessionType === "QUALIFYING" ? "bg-gradient-to-r from-cyan-500/60 via-cyan-400/30 to-transparent" : "bg-gradient-to-r from-zinc-600/40 to-transparent"}`} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Type + PB badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md ${tc.bg} ${tc.text}`}>
                  {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                </span>
                {s.isNewPB && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-400">
                    <Trophy className="w-3 h-3" />
                    New PB
                  </span>
                )}
                {s.dnf && (
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-md bg-red-500/10 text-red-400">DNF</span>
                )}
                {s.dq && (
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-md bg-red-500/10 text-red-400">DQ</span>
                )}
              </div>

              {/* Track name */}
              <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-1">
                {s.track.name}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-zinc-600" />
                  {s.car.name}
                </span>
                {s.carClass && (
                  <span className="text-zinc-700">·</span>
                )}
                {s.carClass && <span>{s.carClass.name}</span>}
                <span className="text-zinc-700">·</span>
                <span className="uppercase font-medium tracking-wide text-zinc-600 text-xs">
                  {SIMULATOR_LABELS[s.simulator.slug] ?? s.simulator.slug}
                </span>
                <span className="text-zinc-700">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  {new Date(s.sessionDate).toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                {s.serverName && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="text-zinc-600 text-xs">{s.serverName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Position */}
            {s.finalPosition != null && (
              <div className="shrink-0 text-center">
                <div className="text-5xl font-black font-mono text-zinc-100 leading-none">
                  P{s.finalPosition}
                </div>
                {s.participants.length > 1 && (
                  <div className="text-sm text-zinc-600 mt-1">
                    of {s.participants.length}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile
          label="Best lap"
          value={formatLapTime(s.bestLapMs)}
          icon={Timer}
          accent
          mono
        />
        <MetricTile
          label="Avg lap"
          value={formatLapTime(s.avgLapMs ? Math.round(s.avgLapMs) : null)}
          icon={Activity}
          mono
        />
        <MetricTile
          label="Ideal lap"
          value={formatLapTime(s.idealLapMs)}
          icon={Gauge}
          mono
        />
        <MetricTile
          label="Gap to ideal"
          value={s.bestLapMs && s.idealLapMs ? formatDelta(s.bestLapMs - s.idealLapMs) : "—"}
          icon={TrendingUp}
          mono
          dimmed={!s.bestLapMs || !s.idealLapMs}
        />
        <MetricTile
          label="Valid laps"
          value={`${s.validLaps} / ${s.totalLaps}`}
          icon={Flag}
        />
        <MetricTile
          label="Consistency"
          value={s.consistencyScore?.toFixed(1) ?? "—"}
          score={s.consistencyScore}
        />
        <MetricTile
          label="Safety score"
          value={s.safetyScore?.toFixed(1) ?? "—"}
          score={s.safetyScore}
        />
        {s.racecraftScore != null && (
          <MetricTile
            label="Racecraft"
            value={s.racecraftScore.toFixed(1)}
            score={s.racecraftScore}
          />
        )}
        {s.qualifyingScore != null && (
          <MetricTile
            label="Qualifying"
            value={s.qualifyingScore.toFixed(1)}
            score={s.qualifyingScore}
          />
        )}
        <MetricTile
          label="Drop-off"
          value={s.dropOffMs != null ? formatDelta(s.dropOffMs) : "—"}
          icon={TrendingUp}
          mono
          dimmed={s.dropOffMs == null}
        />
      </div>

      {/* Lap time chart */}
      {validLaps.length > 1 && (
        <Section title="Lap times">
          <LapTimeChart
            laps={s.laps.map((l) => ({
              lapNumber: l.lapNumber,
              lapTimeMs: l.lapTimeMs,
              isValid: l.isValid,
              isPersonalBest: l.isPersonalBest,
            }))}
          />
        </Section>
      )}

      {/* Sectors */}
      {hasSectors && bestS1 && bestS2 && bestS3 && (
        <Section title="Best sectors">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "S1", best: bestS1 },
              { label: "S2", best: bestS2 },
              { label: "S3", best: bestS3 },
            ].map(({ label, best }) => (
              <div key={label} className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 text-center">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">{label}</p>
                <p className="text-xl font-mono font-bold text-cyan-400 tabular-nums">
                  {formatLapTime(best)}
                </p>
              </div>
            ))}
          </div>
          {s.idealLapMs && (
            <div className="mt-4 pt-4 border-t border-zinc-800/60 flex justify-between text-sm items-center">
              <span className="text-zinc-500 font-medium">Ideal lap (sum of best sectors)</span>
              <span className="font-mono text-zinc-200 tabular-nums text-base font-semibold">{formatLapTime(s.idealLapMs)}</span>
            </div>
          )}
        </Section>
      )}

      {/* Lap table */}
      {s.laps.length > 0 && (
        <Section title={`Laps (${s.laps.length})`}>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["#", "Time", "Delta", "S1", "S2", "S3", "Fuel"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.laps.map((lap, i) => {
                  const isBest = lap.isPersonalBest
                  const isSessionBest = lap.isSessionBest && !lap.isPersonalBest
                  const isInvalid = !lap.isValid

                  return (
                    <tr
                      key={lap.lapNumber}
                      className={`border-b border-zinc-800/30 transition-colors
                        ${isBest ? "bg-cyan-500/5 hover:bg-cyan-500/8" : isInvalid ? "opacity-35" : "hover:bg-zinc-800/30"}
                        ${i === s.laps.length - 1 ? "border-b-0" : ""}
                      `}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600">{lap.lapNumber}</td>
                      <td className="px-3 py-2 font-mono text-zinc-200 tabular-nums font-medium">
                        {formatLapTime(lap.lapTimeMs)}
                        {isBest && <span className="ml-2 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1 py-0.5 rounded">PB</span>}
                        {isSessionBest && <span className="ml-2 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-1 py-0.5 rounded">SB</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums">
                        {lap.lapTimeMs && s.bestLapMs ? (
                          <span className={lap.lapTimeMs === s.bestLapMs ? "text-cyan-400 font-medium" : "text-zinc-600"}>
                            {lap.lapTimeMs === s.bestLapMs ? "—" : `+${((lap.lapTimeMs - s.bestLapMs) / 1000).toFixed(3)}`}
                          </span>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500 tabular-nums">{formatLapTime(lap.sector1Ms)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500 tabular-nums">{formatLapTime(lap.sector2Ms)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500 tabular-nums">{formatLapTime(lap.sector3Ms)}</td>
                      <td className="px-3 py-2 text-xs text-zinc-600 tabular-nums">
                        {lap.fuelLoad != null ? `${lap.fuelLoad.toFixed(1)}L` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Participants / Results */}
      {s.participants.length > 0 && (
        <Section title={`Results (${s.participants.length} drivers)`}>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Pos", "Driver", "Car", "Class", "Laps", "Best lap"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.participants.map((p, i) => (
                  <tr
                    key={i}
                    className={`border-b border-zinc-800/30 hover:bg-zinc-800/30 transition-colors ${i === s.participants.length - 1 ? "border-b-0" : ""}`}
                  >
                    <td className="px-3 py-2.5 font-mono text-sm font-semibold text-zinc-300">
                      {p.dnf ? <span className="text-red-400 text-xs">DNF</span>
                       : p.dq ? <span className="text-red-400 text-xs">DQ</span>
                       : p.position != null ? `P${p.position}`
                       : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-200 font-medium">{p.driverName}</td>
                    <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-32 truncate">{p.carName ?? "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-600 text-xs">{p.carClass ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{p.lapsCompleted ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-zinc-300 tabular-nums text-sm">{formatLapTime(p.bestLapMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Incidents & Penalties */}
      {(s.incidents.length > 0 || s.penalties.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {s.incidents.length > 0 && (
            <Section title={`Incidents (${s.incidents.length})`} icon={AlertTriangle} iconColor="text-orange-400">
              <div className="space-y-1.5">
                {s.incidents.map((inc, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    {inc.lapNumber != null && (
                      <span className="font-mono text-xs text-zinc-600 mt-0.5 w-8 shrink-0">L{inc.lapNumber}</span>
                    )}
                    <span className="text-zinc-400">{inc.description ?? inc.type ?? "Incident"}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {s.penalties.length > 0 && (
            <Section title={`Penalties (${s.penalties.length})`} icon={Flag} iconColor="text-red-400">
              <div className="space-y-1.5">
                {s.penalties.map((pen, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    {pen.lapNumber != null && (
                      <span className="font-mono text-xs text-zinc-600 mt-0.5 w-8 shrink-0">L{pen.lapNumber}</span>
                    )}
                    <span className="text-zinc-400">
                      {pen.description ?? pen.type ?? "Penalty"}
                      {pen.timeSec != null && <span className="text-zinc-600 ml-1">+{pen.timeSec}s</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Insights */}
      {s.insights.length > 0 && (
        <Section title={`Insights (${s.insights.length})`} icon={Lightbulb} iconColor="text-yellow-400">
          <div className="space-y-2">
            {s.insights.map((ins) => {
              const { icon: Icon, color, bg } =
                ins.severity === "positive"
                  ? { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/8 border-green-800/40" }
                  : ins.severity === "warning"
                    ? { icon: AlertCircle,  color: "text-orange-400", bg: "bg-orange-500/8 border-orange-800/40" }
                    : { icon: Info,         color: "text-zinc-400",   bg: "bg-zinc-800/40 border-zinc-700/40" }
              return (
                <div key={ins.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${bg}`}>
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                  <p className="text-sm text-zinc-300 leading-relaxed">{ins.message}</p>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Notes & Debrief */}
      <Section title={`Notes${s.notes.length > 0 ? ` (${s.notes.length})` : ""}`} icon={StickyNote} iconColor="text-zinc-500">
        <SessionNotes
          sessionId={s.id}
          initialNotes={s.notes.map((n) => ({
            id: n.id,
            content: n.content,
            tags: n.tags,
            videoUrl: n.videoUrl,
            createdAt: n.createdAt,
          }))}
        />
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
  icon: Icon,
  iconColor,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ElementType
  iconColor?: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/60">
        {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor ?? "text-zinc-500"}`} />}
        <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
  mono = false,
  accent = false,
  score,
  dimmed = false,
}: {
  label: string
  value: string
  icon?: React.ElementType
  mono?: boolean
  accent?: boolean
  score?: number | null
  dimmed?: boolean
}) {
  const scoreTextColor =
    score == null ? "" :
    score >= 90 ? "text-green-400" :
    score >= 75 ? "text-lime-400" :
    score >= 60 ? "text-yellow-400" :
    score >= 40 ? "text-orange-400" : "text-red-400"

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 group hover:border-zinc-700 transition-colors ${dimmed ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`w-5 h-5 rounded flex items-center justify-center ${accent ? "bg-cyan-500/10" : "bg-zinc-800"}`}>
            <Icon className={`w-3 h-3 ${accent ? "text-cyan-400" : "text-zinc-600"}`} />
          </div>
        )}
      </div>
      <div className={`text-xl font-bold leading-none tabular-nums
        ${mono ? "font-mono" : ""}
        ${scoreTextColor || (accent ? "text-cyan-400" : "text-zinc-100")}
      `}>
        {value}
      </div>
      {score != null && (
        <div className="mt-2">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                score >= 90 ? "bg-green-500" :
                score >= 75 ? "bg-lime-500" :
                score >= 60 ? "bg-yellow-500" :
                score >= 40 ? "bg-orange-500" : "bg-red-500"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
