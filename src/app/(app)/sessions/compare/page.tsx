import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime, formatDelta, formatDriveTime } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { LapComparisonChart } from "@/components/charts/LapComparisonChart"
import { ArrowLeft, ArrowRight, GitCompare, Flag, Clock, TrendingUp, Timer } from "lucide-react"
import Link from "next/link"

function Section({ title, children, icon: Icon }: {
  title: string; children: React.ReactNode; icon?: React.ElementType
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/50">
        {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500" />}
        <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default async function SessionComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const [sessionAuth, params] = await Promise.all([auth(), searchParams])
  if (!sessionAuth?.user?.id) redirect("/login")

  const userId = sessionAuth.user.id
  const idA = params.a
  const idB = params.b

  // Fetch session A if provided
  const sessionA = idA
    ? await db.session.findFirst({
        where: { id: idA, userId, deletedAt: null },
        include: {
          track: true, car: true, simulator: true,
          laps: { orderBy: { lapNumber: "asc" } },
        },
      })
    : null

  // Fetch session B if provided
  const sessionB = idB
    ? await db.session.findFirst({
        where: { id: idB, userId, deletedAt: null },
        include: {
          track: true, car: true, simulator: true,
          laps: { orderBy: { lapNumber: "asc" } },
        },
      })
    : null

  // Sessions picker — user sessions (most recent, excluding already-selected)
  const sessions = await db.session.findMany({
    where: {
      userId, deletedAt: null,
      ...(idA && !idB ? { id: { not: idA } } : {}),
    },
    orderBy: { sessionDate: "desc" },
    take: 30,
    include: {
      track: { select: { name: true, slug: true } },
      car:   { select: { name: true } },
    },
  })

  const bothSelected = sessionA && sessionB

  // Best sectors for each session
  const bestSectors = bothSelected
    ? {
        a: {
          s1: sessionA.laps.filter(l => l.isValid && l.sector1Ms).length
            ? Math.min(...sessionA.laps.filter(l => l.isValid && l.sector1Ms).map(l => l.sector1Ms!)) : null,
          s2: sessionA.laps.filter(l => l.isValid && l.sector2Ms).length
            ? Math.min(...sessionA.laps.filter(l => l.isValid && l.sector2Ms).map(l => l.sector2Ms!)) : null,
          s3: sessionA.laps.filter(l => l.isValid && l.sector3Ms).length
            ? Math.min(...sessionA.laps.filter(l => l.isValid && l.sector3Ms).map(l => l.sector3Ms!)) : null,
        },
        b: {
          s1: sessionB.laps.filter(l => l.isValid && l.sector1Ms).length
            ? Math.min(...sessionB.laps.filter(l => l.isValid && l.sector1Ms).map(l => l.sector1Ms!)) : null,
          s2: sessionB.laps.filter(l => l.isValid && l.sector2Ms).length
            ? Math.min(...sessionB.laps.filter(l => l.isValid && l.sector2Ms).map(l => l.sector2Ms!)) : null,
          s3: sessionB.laps.filter(l => l.isValid && l.sector3Ms).length
            ? Math.min(...sessionB.laps.filter(l => l.isValid && l.sector3Ms).map(l => l.sector3Ms!)) : null,
        },
      }
    : null

  const hasSectors = bestSectors &&
    (bestSectors.a.s1 || bestSectors.a.s2 || bestSectors.a.s3 ||
     bestSectors.b.s1 || bestSectors.b.s2 || bestSectors.b.s3)

  // Build lap comparison data (pad shorter session with nulls)
  const maxLap = bothSelected
    ? Math.max(
        sessionA.laps.length ? sessionA.laps[sessionA.laps.length - 1].lapNumber : 0,
        sessionB.laps.length ? sessionB.laps[sessionB.laps.length - 1].lapNumber : 0,
      )
    : 0

  const comparisonData = bothSelected
    ? Array.from({ length: maxLap }, (_, i) => {
        const lap = i + 1
        const lapA = sessionA.laps.find(l => l.lapNumber === lap && l.isValid)
        const lapB = sessionB.laps.find(l => l.lapNumber === lap && l.isValid)
        return { lap, a: lapA?.lapTimeMs ?? null, b: lapB?.lapTimeMs ?? null }
      }).filter(d => d.a !== null || d.b !== null)
    : []

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Sessions
        </Link>
        <div className="flex items-center gap-3">
          <GitCompare className="w-6 h-6 text-zinc-500" />
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">Session Comparison</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">Compare lap times, scores and metrics between two sessions.</p>
      </div>

      {/* Session selectors */}
      <div className="grid grid-cols-2 gap-4">
        {/* Slot A */}
        <SessionSlot
          label="Session A"
          color="cyan"
          session={sessionA ? {
            id: sessionA.id,
            track: sessionA.track.name,
            car: sessionA.car.name,
            date: sessionA.sessionDate,
            type: sessionA.sessionType,
            sim: sessionA.simulator.slug,
          } : null}
          href={idB ? `/sessions/compare?b=${idB}` : "/sessions/compare"}
        />
        {/* Slot B */}
        <SessionSlot
          label="Session B"
          color="orange"
          session={sessionB ? {
            id: sessionB.id,
            track: sessionB.track.name,
            car: sessionB.car.name,
            date: sessionB.sessionDate,
            type: sessionB.sessionType,
            sim: sessionB.simulator.slug,
          } : null}
          href={idA ? `/sessions/compare?a=${idA}` : "/sessions/compare"}
        />
      </div>

      {/* Session picker — shown when one slot is empty */}
      {(idA && !idB) || (!idA && !idB) ? (
        <Section title={idA ? "Pick a session to compare with" : "Pick session A"} icon={Flag}>
          <div className="space-y-1">
            {sessions.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-4">No sessions found.</p>
            )}
            {sessions.map((s) => {
              const href = idA
                ? `/sessions/compare?a=${idA}&b=${s.id}`
                : `/sessions/compare?a=${s.id}`
              return (
                <Link
                  key={s.id}
                  href={href}
                  className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                      {s.track.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.car.name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-500">
                    <span className="uppercase tracking-wide text-[11px]">
                      {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                    </span>
                    <span className="tabular-nums">
                      {new Date(s.sessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )
            })}
          </div>
        </Section>
      ) : null}

      {/* Full comparison — only when both are selected */}
      {bothSelected && (
        <>
          {/* Key metrics diff */}
          <Section title="Metrics comparison" icon={TrendingUp}>
            <div className="grid grid-cols-2 gap-px bg-zinc-800/40 rounded-xl overflow-hidden">
              {/* Headers */}
              <div className="bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Session A — {sessionA.track.name}
              </div>
              <div className="bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-orange-400 uppercase tracking-wider">
                Session B — {sessionB.track.name}
              </div>

              {[
                {
                  label: "Best lap",
                  a: formatLapTime(sessionA.bestLapMs),
                  b: formatLapTime(sessionB.bestLapMs),
                  deltaMs: sessionA.bestLapMs && sessionB.bestLapMs
                    ? sessionB.bestLapMs - sessionA.bestLapMs : null,
                  lowerBetter: true,
                },
                {
                  label: "Ideal lap",
                  a: formatLapTime(sessionA.idealLapMs),
                  b: formatLapTime(sessionB.idealLapMs),
                  deltaMs: sessionA.idealLapMs && sessionB.idealLapMs
                    ? sessionB.idealLapMs - sessionA.idealLapMs : null,
                  lowerBetter: true,
                },
                {
                  label: "Avg lap",
                  a: formatLapTime(sessionA.avgLapMs ? Math.round(sessionA.avgLapMs) : null),
                  b: formatLapTime(sessionB.avgLapMs ? Math.round(sessionB.avgLapMs) : null),
                  deltaMs: sessionA.avgLapMs && sessionB.avgLapMs
                    ? sessionB.avgLapMs - sessionA.avgLapMs : null,
                  lowerBetter: true,
                },
                {
                  label: "Valid / Total laps",
                  a: `${sessionA.validLaps} / ${sessionA.totalLaps}`,
                  b: `${sessionB.validLaps} / ${sessionB.totalLaps}`,
                  deltaMs: null,
                },
                {
                  label: "Consistency",
                  aNode: <ScoreBadge value={sessionA.consistencyScore} size="sm" />,
                  bNode: <ScoreBadge value={sessionB.consistencyScore} size="sm" />,
                  deltaMs: null,
                },
                {
                  label: "Safety",
                  aNode: <ScoreBadge value={sessionA.safetyScore} size="sm" />,
                  bNode: <ScoreBadge value={sessionB.safetyScore} size="sm" />,
                  deltaMs: null,
                },
                {
                  label: "Pace",
                  aNode: <ScoreBadge value={sessionA.paceScore} size="sm" />,
                  bNode: <ScoreBadge value={sessionB.paceScore} size="sm" />,
                  deltaMs: null,
                },
              ].map(({ label, a, b, aNode, bNode, deltaMs, lowerBetter }) => {
                const deltaColor = deltaMs === null ? ""
                  : lowerBetter
                    ? deltaMs < 0 ? "text-green-400" : deltaMs > 0 ? "text-red-400" : "text-zinc-500"
                    : deltaMs > 0 ? "text-green-400" : deltaMs < 0 ? "text-red-400" : "text-zinc-500"

                return [
                  <div key={`a-${label}`} className="bg-zinc-900/40 px-4 py-3 flex items-center justify-between border-t border-zinc-800/40">
                    <span className="text-xs text-zinc-500 font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      {aNode ?? <span className="font-mono text-sm text-zinc-200">{a}</span>}
                      {deltaMs !== null && (
                        <span className={`text-xs font-mono tabular-nums ${deltaColor}`}>
                          {deltaMs > 0 ? "+" : ""}{formatDelta(deltaMs)}
                        </span>
                      )}
                    </div>
                  </div>,
                  <div key={`b-${label}`} className="bg-zinc-900/40 px-4 py-3 flex items-center justify-end border-t border-zinc-800/40">
                    {bNode ?? <span className="font-mono text-sm text-zinc-200">{b}</span>}
                  </div>,
                ]
              })}
            </div>
          </Section>

          {/* Lap time chart overlay */}
          {comparisonData.length > 1 && (
            <Section title="Lap time overlay" icon={Flag}>
              <LapComparisonChart
                data={comparisonData}
                labelA={`A: ${sessionA.track.name}`}
                labelB={`B: ${sessionB.track.name}`}
              />
            </Section>
          )}

          {/* Sector delta */}
          {hasSectors && bestSectors && (
            <Section title="Best sector comparison" icon={Timer}>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Sector</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider">Session A</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold text-orange-400/80 uppercase tracking-wider">Session B</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Delta (B−A)</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Faster</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["s1", "s2", "s3"] as const).map((sector, i) => {
                      const a = bestSectors.a[sector]
                      const b = bestSectors.b[sector]
                      const delta = a !== null && b !== null ? b - a : null
                      const aWins = delta !== null && delta > 0
                      const bWins = delta !== null && delta < 0
                      return (
                        <tr key={sector} className={`${i < 2 ? "border-b border-zinc-800/30" : ""}`}>
                          <td className="px-3 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                            Sector {i + 1}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono text-sm tabular-nums ${aWins ? "text-cyan-400 font-bold" : "text-zinc-400"}`}>
                            {formatLapTime(a)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono text-sm tabular-nums ${bWins ? "text-orange-400 font-bold" : "text-zinc-400"}`}>
                            {formatLapTime(b)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono text-sm tabular-nums ${
                            delta === null ? "text-zinc-700"
                            : delta < 0 ? "text-orange-400"
                            : delta > 0 ? "text-cyan-400"
                            : "text-zinc-500"
                          }`}>
                            {delta === null ? "—" : `${delta > 0 ? "+" : ""}${formatDelta(delta)}`}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs">
                            {aWins && <span className="text-cyan-400 font-semibold">A</span>}
                            {bWins && <span className="text-orange-400 font-semibold">B</span>}
                            {delta === 0 && <span className="text-zinc-600">Tie</span>}
                            {delta === null && <span className="text-zinc-700">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Ideal lap row */}
                    {(sessionA.idealLapMs || sessionB.idealLapMs) && (
                      <tr className="border-t border-zinc-800/60">
                        <td className="px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Ideal lap</td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-zinc-300">{formatLapTime(sessionA.idealLapMs)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-zinc-300">{formatLapTime(sessionB.idealLapMs)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono text-sm tabular-nums ${
                          !sessionA.idealLapMs || !sessionB.idealLapMs ? "text-zinc-700"
                          : sessionB.idealLapMs - sessionA.idealLapMs < 0 ? "text-orange-400"
                          : sessionB.idealLapMs - sessionA.idealLapMs > 0 ? "text-cyan-400"
                          : "text-zinc-500"
                        }`}>
                          {sessionA.idealLapMs && sessionB.idealLapMs
                            ? `${sessionB.idealLapMs - sessionA.idealLapMs > 0 ? "+" : ""}${formatDelta(sessionB.idealLapMs - sessionA.idealLapMs)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs">
                          {sessionA.idealLapMs && sessionB.idealLapMs && (
                            sessionB.idealLapMs > sessionA.idealLapMs
                              ? <span className="text-cyan-400 font-semibold">A</span>
                              : sessionB.idealLapMs < sessionA.idealLapMs
                                ? <span className="text-orange-400 font-semibold">B</span>
                                : <span className="text-zinc-600">Tie</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Lap-by-lap table */}
          {comparisonData.length > 0 && (
            <Section title="Lap-by-lap delta" icon={Clock}>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider w-16">Lap</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider">Session A</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold text-orange-400/80 uppercase tracking-wider">Session B</th>
                      <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Delta (B−A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => {
                      const delta = row.a !== null && row.b !== null ? row.b - row.a : null
                      return (
                        <tr key={row.lap} className={`${i < comparisonData.length - 1 ? "border-b border-zinc-800/30" : ""} hover:bg-zinc-800/20 transition-colors`}>
                          <td className="px-3 py-2 font-mono text-xs text-zinc-600">{row.lap}</td>
                          <td className="px-3 py-2 text-right font-mono text-sm text-cyan-400/90 tabular-nums">
                            {formatLapTime(row.a)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-sm text-orange-400/90 tabular-nums">
                            {formatLapTime(row.b)}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono text-sm tabular-nums ${
                            delta === null ? "text-zinc-700"
                            : delta < 0 ? "text-red-400"   // B is faster (lower) than A
                            : delta > 0 ? "text-green-400" // A is faster
                            : "text-zinc-500"
                          }`}>
                            {delta === null ? "—" : `${delta > 0 ? "+" : ""}${formatDelta(delta)}`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function SessionSlot({
  label, color, session, href,
}: {
  label: string
  color: "cyan" | "orange"
  session: { id: string; track: string; car: string; date: Date; type: string; sim: string } | null
  href: string
}) {
  const accent = color === "cyan"
    ? { border: "border-cyan-800/40", text: "text-cyan-400", bg: "bg-cyan-500/8" }
    : { border: "border-orange-800/40", text: "text-orange-400", bg: "bg-orange-500/8" }

  if (!session) {
    return (
      <div className={`rounded-2xl border border-dashed border-zinc-700/50 bg-zinc-900/30 p-5 flex flex-col items-center justify-center gap-2 min-h-24 text-center`}>
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">{label}</p>
        <p className="text-sm text-zinc-600">Select a session below</p>
      </div>
    )
  }

  return (
    <div className={`relative rounded-2xl border ${accent.border} ${accent.bg} backdrop-blur-sm p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${accent.text}`}>{label}</p>
          <p className="text-lg font-bold text-zinc-100 truncate">{session.track}</p>
          <p className="text-sm text-zinc-400 mt-0.5 truncate">{session.car}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
            <span className="uppercase tracking-wide">{SESSION_TYPE_LABELS[session.type] ?? session.type}</span>
            <span className="text-zinc-700">·</span>
            <span>{new Date(session.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
        <Link
          href={href}
          className="shrink-0 text-xs text-zinc-600 hover:text-red-400 transition-colors mt-1"
          title="Remove"
        >
          ✕
        </Link>
      </div>
    </div>
  )
}
