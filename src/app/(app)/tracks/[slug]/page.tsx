import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime, formatDriveTime } from "@/lib/time"
import { SESSION_TYPE_LABELS } from "@/lib/constants"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { PBEvolutionChart } from "@/components/charts/PBEvolutionChart"
import { TrendChart } from "@/components/charts/TrendChart"
import { LapDistributionChart } from "@/components/charts/LapDistributionChart"
import { ArrowLeft, Flag, TrendingDown, TrendingUp, Trophy, Zap } from "lucide-react"
import Link from "next/link"

const SESSION_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  RACE:       { bg: "bg-orange-500/10", text: "text-orange-400" },
  QUALIFYING: { bg: "bg-cyan-500/10",   text: "text-cyan-400"   },
  PRACTICE:   { bg: "bg-zinc-700/40",   text: "text-zinc-400"   },
  HOTLAP:     { bg: "bg-purple-500/10", text: "text-purple-400" },
  TIME_TRIAL: { bg: "bg-purple-500/10", text: "text-purple-400" },
}

function Section({ title, children, icon: Icon, iconColor = "text-zinc-500" }: {
  title: string; children: React.ReactNode
  icon?: React.ElementType; iconColor?: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/50">
        {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor}`} />}
        <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default async function TrackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [sessionAuth, { slug }] = await Promise.all([auth(), params])
  if (!sessionAuth?.user?.id) redirect("/login")

  const userId = sessionAuth.user.id
  const track = await db.track.findUnique({ where: { slug } })
  if (!track) notFound()

  const [sessions, bestSectors, lapTimes] = await Promise.all([
    db.session.findMany({
      where: { userId, trackId: track.id, deletedAt: null },
      orderBy: { sessionDate: "asc" },
      include: {
        car:       { select: { name: true, slug: true } },
        simulator: { select: { slug: true, name: true } },
      },
    }),
    db.lap.aggregate({
      where: { session: { userId, trackId: track.id, deletedAt: null }, isValid: true },
      _min: { sector1Ms: true, sector2Ms: true, sector3Ms: true },
    }),
    db.lap.findMany({
      where: { session: { userId, trackId: track.id, deletedAt: null }, isValid: true },
      select: { lapTimeMs: true },
      orderBy: { lapTimeMs: "asc" },
    }),
  ])
  if (sessions.length === 0) notFound()

  // ── Aggregates ──────────────────────────────────────────────────────────────
  const sessionsByDate  = [...sessions].reverse() // newest first for table
  const bestLapMs       = Math.min(...sessions.filter(s => s.bestLapMs).map(s => s.bestLapMs!)) || null
  const totalLaps       = sessions.reduce((n, s) => n + s.totalLaps, 0)
  const totalDriveSec   = sessions.reduce((n, s) => n + (s.durationSec ?? 0), 0)

  const consistentSessions = sessions.filter(s => s.consistencyScore != null)
  const safetySessions     = sessions.filter(s => s.safetyScore != null)
  const avgConsistency = consistentSessions.length
    ? consistentSessions.reduce((n, s) => n + s.consistencyScore!, 0) / consistentSessions.length
    : null
  const avgSafety = safetySessions.length
    ? safetySessions.reduce((n, s) => n + s.safetyScore!, 0) / safetySessions.length
    : null

  // Improvement: first session best vs overall best
  const firstWithLap  = sessions.find(s => s.bestLapMs)
  const improvementMs = firstWithLap?.bestLapMs && bestLapMs
    ? firstWithLap.bestLapMs - bestLapMs
    : null
  const improvementPct = improvementMs && firstWithLap?.bestLapMs
    ? (improvementMs / firstWithLap.bestLapMs) * 100
    : null

  // Session type counts
  const typeCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.sessionType] = (acc[s.sessionType] ?? 0) + 1
    return acc
  }, {})

  // Best lap per car
  const carBests = sessions.reduce<Record<string, { car: typeof sessions[0]["car"]; best: number }>>((acc, s) => {
    if (!s.bestLapMs) return acc
    if (!acc[s.car.slug] || s.bestLapMs < acc[s.car.slug].best)
      acc[s.car.slug] = { car: s.car, best: s.bestLapMs }
    return acc
  }, {})

  // PB evolution (running minimum)
  const pbHistory = sessions
    .filter(s => s.bestLapMs)
    .reduce<{ data: { date: string; bestLapMs: number }[]; best: number }>(
      (acc, s) => {
        if (s.bestLapMs! < acc.best) {
          return {
            data: [...acc.data, { date: s.sessionDate.toISOString().split("T")[0], bestLapMs: s.bestLapMs! }],
            best: s.bestLapMs!,
          }
        }
        return acc
      },
      { data: [], best: Infinity },
    ).data

  // Consistency trend
  const consistencyTrend = consistentSessions
    .map(s => ({ date: s.sessionDate.toISOString().split("T")[0], value: s.consistencyScore! }))

  const lastSession = sessionsByDate[0]

  const bestS1 = bestSectors._min.sector1Ms
  const bestS2 = bestSectors._min.sector2Ms
  const bestS3 = bestSectors._min.sector3Ms
  const idealLap = bestS1 != null && bestS2 != null && bestS3 != null ? bestS1 + bestS2 + bestS3 : null
  const lapTimesMs = lapTimes.map(l => l.lapTimeMs).filter((v): v is number => v != null)

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/tracks"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tracks
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-100">{track.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-zinc-500">
              {track.country && <span>{track.country}</span>}
              {track.lengthM && (
                <>
                  {track.country && <span className="text-zinc-700">·</span>}
                  <span className="font-mono">{(track.lengthM / 1000).toFixed(3)} km</span>
                </>
              )}
              <span className="text-zinc-700">·</span>
              <span>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
              <span className="text-zinc-700">·</span>
              <span>Last: {new Date(lastSession.sessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
            </div>
          </div>

          {improvementMs != null && improvementMs > 0 && (
            <div className="shrink-0 rounded-xl border border-green-800/40 bg-green-950/20 px-4 py-2.5 text-center">
              <div className="flex items-center gap-1.5 text-green-400 text-sm font-bold">
                <TrendingDown className="w-4 h-4" />
                {(improvementMs / 1000).toFixed(3)}s faster
              </div>
              <p className="text-xs text-green-600 mt-0.5">
                {improvementPct!.toFixed(1)}% improvement
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Best lap",     value: formatLapTime(bestLapMs ?? null), mono: true, accent: true },
          { label: "Sessions",     value: sessions.length },
          { label: "Total laps",   value: totalLaps.toLocaleString(), mono: true },
          { label: "Drive time",   value: formatDriveTime(totalDriveSec) },
          { label: "Avg consist.", value: avgConsistency != null ? avgConsistency.toFixed(0) : "—" },
          { label: "Avg safety",   value: avgSafety != null ? avgSafety.toFixed(0) : "—" },
        ].map(({ label, value, mono, accent }) => (
          <div
            key={label}
            className={`rounded-xl border px-3 py-3 ${
              accent ? "border-cyan-800/40 bg-zinc-900/50" : "border-zinc-800/60 bg-zinc-900/50"
            } backdrop-blur-sm`}
          >
            {accent && <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />}
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</p>
            <p className={`text-xl font-black leading-none ${mono ? "font-mono" : ""} ${accent ? "text-cyan-400" : "text-zinc-100"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Session types + PB chart row */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* PB evolution */}
        <div className="lg:col-span-2">
          <Section title="Best lap evolution" icon={TrendingDown} iconColor="text-cyan-400">
            {pbHistory.length >= 2 ? (
              <PBEvolutionChart data={pbHistory} />
            ) : (
              <p className="text-sm text-zinc-600 text-center py-6">Need more sessions to show PB trend</p>
            )}
          </Section>
        </div>

        {/* Right col: type breakdown + top improvement */}
        <div className="space-y-4">
          {/* Session types */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-4 space-y-2">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Session types</p>
            {Object.entries(typeCounts).map(([type, count]) => {
              const tc = SESSION_TYPE_COLORS[type] ?? SESSION_TYPE_COLORS.PRACTICE
              const pct = Math.round((count / sessions.length) * 100)
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${tc.bg} ${tc.text} w-24 shrink-0`}>
                    {SESSION_TYPE_LABELS[type] ?? type}
                  </span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${tc.text.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-zinc-600 tabular-nums w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Best by car */}
          {Object.values(carBests).length > 1 && (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-4">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Best lap by car</p>
              <div className="space-y-0 divide-y divide-zinc-800/40">
                {Object.values(carBests)
                  .sort((a, b) => a.best - b.best)
                  .map(({ car, best }, i) => (
                    <div key={car.slug} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
                        {i > 0 && <span className="w-3 text-center text-[10px] text-zinc-700">{i + 1}</span>}
                        <Link href={`/cars/${car.slug}`} className="text-sm text-zinc-300 hover:text-cyan-400 transition-colors truncate">
                          {car.name}
                        </Link>
                      </div>
                      <span className="font-mono text-sm text-zinc-200 tabular-nums shrink-0 ml-2">{formatLapTime(best)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consistency trend */}
      {consistencyTrend.length >= 3 && (
        <Section title="Consistency trend" icon={TrendingUp} iconColor="text-green-400">
          <TrendChart
            data={consistencyTrend}
            color="#4ade80"
            domain={[0, 100]}
            label="Consistency"
            height={140}
          />
        </Section>
      )}

      {/* Best sectors + lap distribution */}
      {(idealLap != null || lapTimesMs.length >= 5) && (
        <div className="grid lg:grid-cols-2 gap-5">
          {idealLap != null && (
            <Section title="Best sectors" icon={Zap} iconColor="text-yellow-400">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "S1", ms: bestS1 },
                  { label: "S2", ms: bestS2 },
                  { label: "S3", ms: bestS3 },
                ].map(({ label, ms }) => (
                  <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-800/30 px-3 py-2.5 text-center">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="font-mono text-sm font-bold text-cyan-400">{formatLapTime(ms ?? null)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-yellow-800/30 bg-yellow-950/10 px-4 py-2.5">
                <span className="text-sm text-zinc-400">Ideal lap</span>
                <span className="font-mono text-sm font-bold text-yellow-400">{formatLapTime(idealLap)}</span>
              </div>
            </Section>
          )}
          {lapTimesMs.length >= 5 && (
            <Section title="Lap time distribution" icon={Flag} iconColor="text-zinc-500">
              <LapDistributionChart data={lapTimesMs} />
            </Section>
          )}
        </div>
      )}

      {/* Session history */}
      <Section title={`All sessions (${sessions.length})`} icon={Flag}>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-zinc-800/60">
                {["Date", "Car", "Type", "Laps", "Best lap", "Cons.", "Safety"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessionsByDate.map((s, i) => {
                const tc = SESSION_TYPE_COLORS[s.sessionType]
                return (
                  <tr key={s.id} className={`hover:bg-zinc-800/30 transition-colors ${i < sessionsByDate.length - 1 ? "border-b border-zinc-800/30" : ""}`}>
                    <td className="px-3 py-2.5">
                      <Link href={`/sessions/${s.id}`} className="text-zinc-400 hover:text-zinc-200 transition-colors text-xs tabular-nums">
                        {new Date(s.sessionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/cars/${s.car.slug}`} className="text-zinc-300 hover:text-cyan-400 transition-colors text-sm">
                        {s.car.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${tc?.bg ?? "bg-zinc-800"} ${tc?.text ?? "text-zinc-400"}`}>
                        {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-500 tabular-nums">{s.totalLaps}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-zinc-200 text-sm tabular-nums">{formatLapTime(s.bestLapMs)}</span>
                        {s.isNewPB && <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">PB</span>}
                        {s.sessionType === "RACE" && (s.isOnline ? <span className="text-[9px] font-bold text-blue-400/70 px-1 rounded border border-blue-500/15">MP</span> : <span className="text-[9px] font-bold text-zinc-600 px-1 rounded border border-zinc-700/30">AI</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><ScoreBadge value={s.consistencyScore} size="sm" /></td>
                    <td className="px-3 py-2.5"><ScoreBadge value={s.safetyScore} size="sm" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
