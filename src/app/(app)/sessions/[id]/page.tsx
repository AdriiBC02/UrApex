import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime, formatDelta } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import { LapTimeChart } from "@/components/charts/LapTimeChart"
import { SessionNotes } from "@/features/sessions/SessionNotes"
import { SessionPrivacyToggle } from "@/features/sessions/SessionPrivacyToggle"
import { SessionDetailTabs } from "@/features/sessions/SessionDetailTabs"
import { TelemetryCharts, type SpeedPoint, type LapPoint } from "@/features/telemetry/TelemetryCharts"
import { ReplaySection } from "@/features/replays/ReplaySection"
import { ShareCertificateButton } from "@/features/sessions/ShareCertificateButton"
import {
  Flag, Clock, Map, Car, Trophy, AlertTriangle,
  ArrowLeft, TrendingUp, Gauge, Timer, Activity, StickyNote,
  Lightbulb, CheckCircle2, AlertCircle, Info, GitCompare, Radio,
} from "lucide-react"
import Link from "next/link"

// ─── Telemetry sample type ────────────────────────────────────────────────────

interface TelemetrySample {
  t_ms: number; lap: number
  speed_kph?: number; throttle?: number; brake?: number; fuel_l?: number
  tire_fl_temp?: number; tire_fr_temp?: number; tire_rl_temp?: number; tire_rr_temp?: number
  tire_fl_wear?: number; tire_fr_wear?: number; tire_rl_wear?: number; tire_rr_wear?: number
  brk_fl_temp?: number; brk_fr_temp?: number; brk_rl_temp?: number; brk_rr_temp?: number
}

function preprocessTelemetry(rawFrames: TelemetrySample[]) {
  // Speed trace: downsample to max 500 points
  const step = Math.max(1, Math.floor(rawFrames.length / 500))
  const speedTrace: SpeedPoint[] = rawFrames
    .filter((_, i) => i % step === 0)
    .map(f => ({
      t:   f.t_ms,
      spd: Math.round(f.speed_kph ?? 0),
      thr: Math.round((f.throttle ?? 0) * 100),
      brk: Math.round((f.brake ?? 0) * 100),
    }))

  // Per-lap stats
  const lapGroups: { [lap: number]: TelemetrySample[] } = {}
  for (const f of rawFrames) {
    if (!lapGroups[f.lap]) lapGroups[f.lap] = []
    lapGroups[f.lap].push(f)
  }

  const lapStats: LapPoint[] = Object.entries(lapGroups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([lapStr, frames]) => {
      const lap = Number(lapStr)
      const avg = (key: keyof TelemetrySample): number => {
        const vals = frames.map((f: TelemetrySample) => f[key] as number | undefined).filter((v): v is number => v != null && v > 0)
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0
      }
      const last = (key: keyof TelemetrySample): number => {
        for (let i = frames.length - 1; i >= 0; i--) {
          const v = frames[i][key] as number | undefined
          if (v != null && v > 0) return v
        }
        return 0
      }
      return {
        lap,
        flWear: Math.round(last("tire_fl_wear")),
        frWear: Math.round(last("tire_fr_wear")),
        rlWear: Math.round(last("tire_rl_wear")),
        rrWear: Math.round(last("tire_rr_wear")),
        flTemp: Math.round(avg("tire_fl_temp")),
        frTemp: Math.round(avg("tire_fr_temp")),
        rlTemp: Math.round(avg("tire_rl_temp")),
        rrTemp: Math.round(avg("tire_rr_temp")),
        flBrk:  Math.round(avg("brk_fl_temp")),
        frBrk:  Math.round(avg("brk_fr_temp")),
        rlBrk:  Math.round(avg("brk_rl_temp")),
        rrBrk:  Math.round(avg("brk_rr_temp")),
        fuel:   parseFloat(avg("fuel_l").toFixed(1)),
      }
    })

  return { speedTrace, lapStats }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
      participants: {
        orderBy: { position: "asc" },
        include: {
          laps:     { orderBy: { lapNumber: "asc" } },
          pitStops: { orderBy: { lapNumber: "asc" } },
        },
      },
      incidents: { orderBy: { lapNumber: "asc" } },
      penalties: { orderBy: { lapNumber: "asc" } },
      pitStops: { orderBy: { lapNumber: "asc" } },
      notes:    { orderBy: { createdAt: "desc" } },
      insights: { orderBy: { createdAt: "asc" } },
      replays:  { orderBy: { createdAt: "desc" } },
      telemetryRecording: {
        select: { id: true, totalFrames: true, sampleHz: true, durationSec: true, uploadedAt: true, frames: true }
      },
    },
  })

  if (!s || s.userId !== sessionAuth.user.id) notFound()

  const validLaps = s.laps.filter((l) => l.isValid && l.lapTimeMs)
  const hasSectors = validLaps.some((l) => l.sector1Ms && l.sector2Ms && l.sector3Ms)

  const bestS1 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector1Ms).map((l) => l.sector1Ms!)) : null
  const bestS2 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector2Ms).map((l) => l.sector2Ms!)) : null
  const bestS3 = hasSectors ? Math.min(...validLaps.filter((l) => l.sector3Ms).map((l) => l.sector3Ms!)) : null

  const hasGrid     = s.participants.length > 1
  const hasStrategy = s.sessionType === "RACE" && s.participants.some((p) => p.laps.length > 0)

  const tc: Record<string, { bg: string; text: string; grad: string; dot: string }> = {
    RACE:       { bg: "bg-orange-500/10", text: "text-orange-400", grad: "from-orange-500/60 via-orange-400/20 to-transparent", dot: "bg-orange-400" },
    QUALIFYING: { bg: "bg-cyan-500/10",   text: "text-cyan-400",   grad: "from-cyan-500/60 via-cyan-400/20 to-transparent",    dot: "bg-cyan-400" },
    PRACTICE:   { bg: "bg-zinc-700/40",   text: "text-zinc-400",   grad: "from-zinc-600/40 to-transparent",                    dot: "bg-zinc-500" },
    HOTLAP:     { bg: "bg-purple-500/10", text: "text-purple-400", grad: "from-purple-500/60 via-purple-400/20 to-transparent", dot: "bg-purple-400" },
    TIME_TRIAL: { bg: "bg-purple-500/10", text: "text-purple-400", grad: "from-purple-500/60 via-purple-400/20 to-transparent", dot: "bg-purple-400" },
  }
  const typeStyle = tc[s.sessionType] ?? { bg: "bg-zinc-800", text: "text-zinc-400", grad: "from-zinc-600/40 to-transparent", dot: "bg-zinc-500" }

  // Telemetry preprocessing
  const rawFrames = (s.telemetryRecording?.frames ?? []) as unknown as TelemetrySample[]
  const { speedTrace, lapStats } = preprocessTelemetry(rawFrames)

  // ── Tab content ──────────────────────────────────────────────────────────────

  const overviewTab = (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricTile label="Best lap"     value={formatLapTime(s.bestLapMs)}                                  icon={Timer} accent mono />
        <MetricTile label="Avg lap"      value={formatLapTime(s.avgLapMs ? Math.round(s.avgLapMs) : null)}  icon={Activity} mono />
        <MetricTile label="Ideal lap"    value={formatLapTime(s.idealLapMs)}                                 icon={Gauge} mono />
        <MetricTile label="Gap to ideal" value={s.bestLapMs && s.idealLapMs ? formatDelta(s.bestLapMs - s.idealLapMs) : "—"} icon={TrendingUp} mono dimmed={!s.bestLapMs || !s.idealLapMs} />
        <MetricTile label="Valid laps"   value={`${s.validLaps} / ${s.totalLaps}`} icon={Flag} />
        <MetricTile label="Consistency"  value={s.consistencyScore?.toFixed(1) ?? "—"} score={s.consistencyScore} />
        <MetricTile label="Safety"       value={s.safetyScore?.toFixed(1) ?? "—"}       score={s.safetyScore} />
        {s.paceScore != null && (
          <MetricTile label="Pace" value={s.paceScore.toFixed(1)} score={s.paceScore} />
        )}
        {s.racecraftScore != null && (
          <MetricTile label="Racecraft" value={s.racecraftScore.toFixed(1)} score={s.racecraftScore} />
        )}
        {s.qualifyingScore != null && (
          <MetricTile label="Qualifying" value={s.qualifyingScore.toFixed(1)} score={s.qualifyingScore} />
        )}
        {s.dropOffMs != null && (
          <MetricTile label="Drop-off" value={formatDelta(s.dropOffMs)} icon={TrendingUp} mono />
        )}
      </div>

      {/* Lap time chart */}
      {validLaps.length > 1 && (
        <Section title="Lap times">
          <LapTimeChart
            laps={s.laps.map((l) => ({
              lapNumber: l.lapNumber, lapTimeMs: l.lapTimeMs,
              isValid: l.isValid, isPersonalBest: l.isPersonalBest,
            }))}
          />
        </Section>
      )}

      {/* Best sectors */}
      {hasSectors && bestS1 && bestS2 && bestS3 && (
        <Section title="Best sectors">
          <div className="grid grid-cols-3 gap-4">
            {[{ label: "S1", best: bestS1 }, { label: "S2", best: bestS2 }, { label: "S3", best: bestS3 }].map(({ label, best }) => (
              <div key={label} className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 text-center">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">{label}</p>
                <p className="text-xl font-mono font-bold text-cyan-400 tabular-nums">{formatLapTime(best)}</p>
              </div>
            ))}
          </div>
          {s.idealLapMs && (
            <div className="mt-4 pt-4 border-t border-zinc-800/60 flex justify-between text-sm items-center">
              <span className="text-zinc-500 font-medium">Ideal lap</span>
              <span className="font-mono text-zinc-200 tabular-nums text-base font-semibold">{formatLapTime(s.idealLapMs)}</span>
            </div>
          )}
        </Section>
      )}

      {/* Insights */}
      {s.insights.length > 0 && (
        <Section title={`Insights (${s.insights.length})`} icon={Lightbulb} iconColor="text-yellow-400">
          <div className="space-y-2">
            {s.insights.map((ins) => {
              const { icon: Icon, color, bg } =
                ins.severity === "positive"
                  ? { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/[0.06] border-green-900/40" }
                  : ins.severity === "warning"
                    ? { icon: AlertCircle,  color: "text-orange-400", bg: "bg-orange-500/[0.06] border-orange-900/40" }
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
    </div>
  )

  const lapsTab = (
    <div className="space-y-4">
      {s.laps.length === 0 ? (
        <p className="text-zinc-600 text-sm">No lap data available.</p>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                {["Lap", "Time", "Valid", "Δ Best", "S1", "S2", "S3", "Fuel", "Compound"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.laps.map((lap, i) => {
                const delta = lap.lapTimeMs && s.bestLapMs ? lap.lapTimeMs - s.bestLapMs : null
                const isPB  = lap.isPersonalBest
                return (
                  <tr key={lap.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i === s.laps.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-3 py-2 font-mono text-zinc-500 text-xs">{lap.lapNumber}</td>
                    <td className="px-3 py-2 font-mono font-medium tabular-nums">
                      <span className={isPB ? "text-cyan-400 font-bold" : lap.isValid ? "text-zinc-200" : "text-zinc-600"}>
                        {formatLapTime(lap.lapTimeMs)}
                      </span>
                      {isPB && <span className="ml-1.5 text-[10px] font-semibold text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded">PB</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {lap.isValid
                        ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" />}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">
                      {delta != null && delta > 0
                        ? <span className="text-red-400">+{formatDelta(delta)}</span>
                        : delta === 0
                          ? <span className="text-cyan-400">±0.000</span>
                          : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500 tabular-nums">{formatLapTime(lap.sector1Ms)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500 tabular-nums">{formatLapTime(lap.sector2Ms)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500 tabular-nums">{formatLapTime(lap.sector3Ms)}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600 tabular-nums">
                      {lap.fuelLoad != null ? `${lap.fuelLoad.toFixed(1)}L` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {lap.tyreCompound
                        ? <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${compoundColor(lap.tyreCompound)}`}>{lap.tyreCompound}</span>
                        : <span className="text-zinc-700">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const telemetryTab = s.telemetryRecording ? (
    <TelemetryCharts
      speedTrace={speedTrace}
      lapStats={lapStats}
      totalFrames={s.telemetryRecording.totalFrames ?? rawFrames.length}
      sampleHz={s.telemetryRecording.sampleHz ?? 10}
      durationSec={s.telemetryRecording.durationSec}
    />
  ) : (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
        <Radio className="w-5 h-5 text-zinc-600" />
      </div>
      <div>
        <p className="text-zinc-300 font-medium mb-1">No telemetry recording</p>
        <p className="text-sm text-zinc-600 max-w-sm">
          Open the companion app, enable telemetry from Shared Memory, and click{" "}
          <span className="font-medium text-zinc-500">Record session</span> before your next race.
        </p>
      </div>
    </div>
  )

  const raceGridTab = (
    <div className="space-y-6">
      {/* Race grid table */}
      {hasGrid && (
        <Section title={`Race grid · ${s.participants.length} drivers`}>
          <div className="rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  {["Pos", "Driver", "Car / Class", "Laps", "Best lap", "Pits", "Status", "Strategy"].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.participants.map((p, i) => (
                  <tr key={p.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i === s.participants.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-3 py-2.5 font-mono font-bold text-zinc-300">
                      {p.position != null ? `P${p.position}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-200 max-w-[160px] truncate">{p.driverName}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-500 max-w-[140px]">
                      <div className="truncate">{p.carName ?? "—"}</div>
                      {p.carClass && <div className="text-zinc-600 mt-0.5">{p.carClass}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{p.lapsCompleted}</td>
                    <td className="px-3 py-2.5 font-mono text-zinc-300 tabular-nums text-sm">{formatLapTime(p.bestLapMs)}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{p.pitStopsCount}</td>
                    <td className="px-3 py-2.5">
                      {p.dnf
                        ? <span className="text-xs font-semibold text-red-400">DNF</span>
                        : p.finishStatus
                          ? <span className="text-xs text-zinc-500">{p.finishStatus}</span>
                          : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <StintBadges laps={p.laps} pitStops={p.pitStops} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Strategy detail */}
      {hasStrategy && (
        <Section title="Strategy detail">
          <div className="space-y-1">
            {s.participants.filter((p) => p.laps.length > 0).map((p) => {
              const stints = computeStints(p.laps, p.pitStops)
              return (
                <div key={p.id} className="grid grid-cols-[120px_1fr] gap-3 items-start py-1.5 border-b border-zinc-800/40 last:border-0">
                  <div className="text-xs text-zinc-400 font-medium truncate pt-0.5">{p.driverName}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {stints.map((stint, si) => (
                      <div key={si} className="flex items-center gap-1">
                        {si > 0 && <span className="text-zinc-700 text-xs">·pit·</span>}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${compoundColor(stint.compound)}`}>
                          {stint.compound ?? "?"} {stint.lapCount}L
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
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
                    {inc.lapNumber != null && <span className="font-mono text-xs text-zinc-600 mt-0.5 w-8 shrink-0">L{inc.lapNumber}</span>}
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
                    {pen.lapNumber != null && <span className="font-mono text-xs text-zinc-600 mt-0.5 w-8 shrink-0">L{pen.lapNumber}</span>}
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

      {!hasGrid && !hasStrategy && (
        <p className="text-zinc-600 text-sm py-8 text-center">No race grid data available for this session.</p>
      )}
    </div>
  )

  const notesTab = (
    <div className="space-y-6">
      <Section title={`Notes${s.notes.length > 0 ? ` (${s.notes.length})` : ""}`} icon={StickyNote} iconColor="text-zinc-500">
        <SessionNotes
          sessionId={s.id}
          initialNotes={s.notes.map((n) => ({
            id: n.id, content: n.content, tags: n.tags,
            videoUrl: n.videoUrl, createdAt: n.createdAt,
          }))}
        />
      </Section>
      <ReplaySection
        sessionId={s.id}
        initial={s.replays.map((r) => ({
          id:            r.id,
          originalName:  r.originalName,
          fileSizeBytes: r.fileSizeBytes.toString(),
          createdAt:     r.createdAt.toISOString(),
        }))}
      />
    </div>
  )

  // ── Build tabs ────────────────────────────────────────────────────────────────

  const tabs = [
    { id: "overview",  label: "Overview",       content: overviewTab },
    { id: "laps",      label: "Laps",           content: lapsTab, badge: s.totalLaps },
    { id: "telemetry", label: "Telemetry",      content: telemetryTab, disabled: !s.telemetryRecording },
    ...(s.sessionType === "RACE" ? [{ id: "grid", label: "Race grid", content: raceGridTab, badge: hasGrid ? s.participants.length : undefined }] : []),
    { id: "notes", label: "Notes", content: notesTab, badge: s.notes.length > 0 ? s.notes.length : undefined },
  ]

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Back nav + actions */}
      <div className="flex items-center justify-between">
        <Link href="/sessions" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Sessions
        </Link>
        <div className="flex items-center gap-2">
          <ShareCertificateButton sessionId={s.id} />
          <SessionPrivacyToggle sessionId={s.id} initialIsPublic={s.isPublic} />
          <Link
            href={`/sessions/compare?a=${s.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-1.5"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare
          </Link>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950">
        {/* Accent bar */}
        <div className={`h-[3px] w-full bg-gradient-to-r ${typeStyle.grad}`} />

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">

            {/* Left: metadata */}
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md ${typeStyle.bg} ${typeStyle.text}`}>
                  {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                </span>
                {s.isNewPB && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-400">
                    <Trophy className="w-3 h-3" /> New PB
                  </span>
                )}
                {s.dnf && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-red-500/10 text-red-400">DNF</span>}
                {s.dq  && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-red-500/10 text-red-400">DQ</span>}
                {s.sessionType === "RACE" && (
                  s.isOnline
                    ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">🌐 Multiplayer</span>
                    : <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-zinc-800/60 text-zinc-500 border border-zinc-700/40">🤖 vs AI</span>
                )}
              </div>

              {/* Track name */}
              <h1 className="text-4xl font-black text-zinc-100 tracking-tight leading-tight mb-1">
                {s.track.name}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 mt-3">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-zinc-600" />
                  {s.car.name}
                </span>
                {s.carClass && <><span className="text-zinc-700">·</span><span>{s.carClass.name}</span></>}
                <span className="text-zinc-700">·</span>
                <span className="uppercase font-medium tracking-wide text-zinc-600 text-xs">
                  {SIMULATOR_LABELS[s.simulator.slug] ?? s.simulator.slug}
                </span>
                <span className="text-zinc-700">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  {new Date(s.sessionDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                </span>
                {s.durationSec && (
                  <><span className="text-zinc-700">·</span>
                  <span>{Math.floor(s.durationSec / 3600)}h {Math.floor((s.durationSec % 3600) / 60)}m</span></>
                )}
                {s.serverName && (
                  <><span className="text-zinc-700">·</span><span className="text-zinc-600 text-xs">{s.serverName}</span></>
                )}
              </div>

              {/* Weather row */}
              {(s.weather || s.tempAmbient != null || s.tempTrack != null) && (
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-zinc-600">
                  {s.weather && <span>{s.weather}</span>}
                  {s.tempAmbient != null && <span>{s.tempAmbient.toFixed(0)}°C air</span>}
                  {s.tempTrack != null && <span>{s.tempTrack.toFixed(0)}°C track</span>}
                  {s.humidity != null && <span>{s.humidity.toFixed(0)}% humidity</span>}
                  {s.trackLengthM != null && (
                    <span className="flex items-center gap-1"><Map className="w-3 h-3 text-zinc-700" />{(s.trackLengthM / 1000).toFixed(3)} km</span>
                  )}
                  {s.telemetryRecording && (
                    <span className="flex items-center gap-1 text-cyan-700">
                      <Radio className="w-2.5 h-2.5" /> Telemetry recorded
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: key result */}
            <div className="shrink-0 flex flex-col items-end gap-3">
              {/* Final position (race) */}
              {s.finalPosition != null && (
                <div className="text-right">
                  <div className={`text-5xl font-black font-mono leading-none ${
                    s.finalPosition === 1 ? "text-yellow-400" :
                    s.finalPosition <= 3  ? "text-orange-400" : "text-zinc-200"
                  }`}>P{s.finalPosition}</div>
                  {s.participants.length > 1 && (
                    <div className="text-xs text-zinc-600 mt-1">of {s.participants.length}</div>
                  )}
                </div>
              )}
              {/* Best lap */}
              {s.bestLapMs && (
                <div className="text-right">
                  <div className="text-xl font-mono font-bold text-cyan-400 tabular-nums">{formatLapTime(s.bestLapMs)}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">best lap</div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <SessionDetailTabs tabs={tabs} />

    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, iconColor = "text-zinc-500", children,
}: {
  title: string; icon?: React.ElementType; iconColor?: string; children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
        <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function MetricTile({
  label, value, icon: Icon, mono = false, accent = false, score, dimmed = false,
}: {
  label: string; value: string; icon?: React.ElementType; mono?: boolean; accent?: boolean; score?: number | null; dimmed?: boolean
}) {
  const sc =
    score == null ? "" :
    score >= 90 ? "text-green-400" : score >= 75 ? "text-lime-400" :
    score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400"

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
      <div className={`text-xl font-bold leading-none tabular-nums ${mono ? "font-mono" : ""} ${sc || (accent ? "text-cyan-400" : "text-zinc-100")}`}>
        {value}
      </div>
      {score != null && (
        <div className="mt-2">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${score >= 90 ? "bg-green-500" : score >= 75 ? "bg-lime-500" : score >= 60 ? "bg-yellow-500" : score >= 40 ? "bg-orange-500" : "bg-red-500"}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Strategy helpers ─────────────────────────────────────────────────────────

interface Stint { compound: string | null; lapCount: number; startLap: number; pitLapAfter: number | null }

function computeStints(
  laps: Array<{ lapNumber: number; tyreCompound?: string | null }>,
  pitStops: Array<{ lapNumber?: number | null }>,
): Stint[] {
  if (laps.length === 0) return []
  const pitLaps = new Set(pitStops.map((p) => p.lapNumber).filter(Boolean))
  const stints: Stint[] = []
  let current: Stint = { compound: laps[0].tyreCompound ?? null, lapCount: 0, startLap: laps[0].lapNumber, pitLapAfter: null }
  for (const lap of laps) {
    if (current.lapCount > 0 && lap.tyreCompound && lap.tyreCompound !== current.compound) {
      stints.push({ ...current })
      current = { compound: lap.tyreCompound, lapCount: 0, startLap: lap.lapNumber, pitLapAfter: null }
    }
    current.lapCount++
    if (pitLaps.has(lap.lapNumber)) {
      current.pitLapAfter = lap.lapNumber
      stints.push({ ...current })
      current = { compound: null, lapCount: 0, startLap: lap.lapNumber + 1, pitLapAfter: null }
    }
  }
  if (current.lapCount > 0) stints.push(current)
  return stints
}

function compoundColor(compound: string | null | undefined): string {
  if (!compound) return "bg-zinc-800 text-zinc-400"
  const c = compound.toUpperCase()
  if (c.includes("SOFT") || c === "S")   return "bg-red-500/20 text-red-400"
  if (c.includes("MED")  || c === "M")   return "bg-yellow-500/20 text-yellow-400"
  if (c.includes("HARD") || c === "H")   return "bg-zinc-600/30 text-zinc-300"
  if (c.includes("WET")  || c === "W")   return "bg-blue-500/20 text-blue-400"
  if (c.includes("INT")  || c === "I")   return "bg-green-500/20 text-green-400"
  return "bg-zinc-800 text-zinc-400"
}

function StintBadges({
  laps, pitStops,
}: {
  laps: Array<{ lapNumber: number; tyreCompound?: string | null }>
  pitStops: Array<{ lapNumber?: number | null }>
}) {
  const stints = computeStints(laps, pitStops)
  if (stints.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {stints.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-700 text-[10px]">|</span>}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${compoundColor(s.compound)}`}>
            {s.compound ?? "?"} ×{s.lapCount}
          </span>
        </div>
      ))}
    </div>
  )
}
