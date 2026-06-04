import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDriveTime, formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import {
  Upload, Clock, Flag, Map, Car, TrendingUp,
  Trophy, Target, ArrowRight, Timer,
  BarChart2, CheckCircle2, ShieldOff, Shield, Sliders,
} from "lucide-react"
import Link from "next/link"
import type { GoalType } from "@prisma/client"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(v: number) {
  if (v >= 90) return { stroke: "#4ade80", text: "text-green-400",  glowColor: "rgba(74,222,128,0.35)",  grade: "A+" }
  if (v >= 80) return { stroke: "#a3e635", text: "text-lime-400",   glowColor: "rgba(163,230,53,0.30)",  grade: "A"  }
  if (v >= 70) return { stroke: "#facc15", text: "text-yellow-400", glowColor: "rgba(250,204,21,0.30)",  grade: "B"  }
  if (v >= 55) return { stroke: "#fb923c", text: "text-orange-400", glowColor: "rgba(251,146,60,0.30)",  grade: "C"  }
  return              { stroke: "#f87171", text: "text-red-400",    glowColor: "rgba(248,113,113,0.30)", grade: "D"  }
}

function driverRating(scores: (number | null | undefined)[]) {
  const valid = scores.filter((s): s is number => s != null)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({
  value, label, size = "md",
}: {
  value: number | null | undefined
  label: string
  size?: "sm" | "md" | "lg"
}) {
  const dim = size === "lg" ? 96 : size === "md" ? 76 : 60
  const R   = size === "lg" ? 37 : size === "md" ? 28 : 22
  const sw  = size === "lg" ? 6  : size === "md" ? 5  : 4
  const C   = 2 * Math.PI * R
  const pct = value != null ? Math.min(100, value) / 100 : 0
  const sc  = value != null ? scoreColor(value) : null

  // CSS drop-shadow on the SVG arc — follows the circle shape, no box
  const glowFilter = sc && pct > 0 && size === "lg"
    ? `drop-shadow(0 0 6px ${sc.glowColor})`
    : undefined

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={dim} height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="-rotate-90"
          style={glowFilter ? { filter: glowFilter } : undefined}
        >
          <circle cx={dim/2} cy={dim/2} r={R} fill="none" stroke="#27272a" strokeWidth={sw} />
          {pct > 0 && (
            <circle
              cx={dim/2} cy={dim/2} r={R}
              fill="none"
              stroke={sc?.stroke ?? "#27272a"}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={`${pct * C} ${C}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {value != null ? (
            <>
              <span className={`font-black tabular-nums leading-none ${sc?.text} ${size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-sm"}`}>
                {value.toFixed(0)}
              </span>
              {size === "lg" && (
                <span className={`text-[11px] font-bold mt-0.5 ${sc?.text} opacity-60`}>{sc?.grade}</span>
              )}
            </>
          ) : (
            <span className={`font-bold text-zinc-700 ${size === "lg" ? "text-xl" : "text-sm"}`}>—</span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ─── Goal icon map ────────────────────────────────────────────────────────────

const GOAL_ICONS: Record<GoalType, { icon: React.ElementType; color: string }> = {
  BEST_LAP_TIME:     { icon: Timer,        color: "text-cyan-400"   },
  CONSISTENCY_SCORE: { icon: TrendingUp,   color: "text-green-400"  },
  CLEAN_LAP_COUNT:   { icon: CheckCircle2, color: "text-lime-400"   },
  SESSION_COUNT:     { icon: Flag,         color: "text-orange-400" },
  HOURS_DRIVEN:      { icon: Clock,        color: "text-purple-400" },
  REDUCE_INCIDENTS:  { icon: ShieldOff,    color: "text-red-400"    },
  IMPROVE_SAFETY:    { icon: Shield,       color: "text-blue-400"   },
  COMPLETE_STINTS:   { icon: BarChart2,    color: "text-yellow-400" },
  CUSTOM:            { icon: Sliders,      color: "text-zinc-400"   },
}

// ─── Session type styling ─────────────────────────────────────────────────────

const SESSION_STYLE: Record<string, { border: string; label: string }> = {
  RACE:       { border: "border-l-orange-500/60", label: "text-orange-400/70" },
  QUALIFYING: { border: "border-l-cyan-500/60",   label: "text-cyan-400/70"   },
  PRACTICE:   { border: "border-l-zinc-700",       label: "text-zinc-500"      },
  HOTLAP:     { border: "border-l-purple-500/60",  label: "text-purple-400/70" },
  TIME_TRIAL: { border: "border-l-purple-500/60",  label: "text-purple-400/70" },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(weekStart.getDate() - 7)

  const [profile, recentSessions, recentPBs, activeGoals, thisWeekCount, lastWeekCount] =
    await Promise.all([
      db.driverProfile.findUnique({ where: { userId } }),
      db.session.findMany({
        where: { userId, deletedAt: null },
        orderBy: { sessionDate: "desc" },
        take: 7,
        include: {
          track: { select: { name: true, slug: true } },
          car:   { select: { name: true, slug: true } },
          simulator: { select: { slug: true } },
        },
      }),
      db.session.findMany({
        where: { userId, deletedAt: null, isNewPB: true },
        orderBy: { sessionDate: "desc" },
        take: 4,
        include: { track: { select: { name: true } }, car: { select: { name: true } } },
      }),
      db.goal.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.session.count({ where: { userId, deletedAt: null, sessionDate: { gte: weekStart } } }),
      db.session.count({ where: { userId, deletedAt: null, sessionDate: { gte: prevWeekStart, lt: weekStart } } }),
    ])

  const hasData  = (profile?.totalSessions ?? 0) > 0
  const firstName = profile?.displayName?.split(" ")[0] ?? session.user.name?.split(" ")[0]
  const lastSession = recentSessions[0]
  const weekDelta = thisWeekCount - lastWeekCount

  const rating = driverRating([profile?.consistencyScore, profile?.safetyScore, profile?.paceScore])
  const ratingInfo = rating != null ? scoreColor(rating) : null

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500 mb-0.5">
            {greeting}{firstName ? `, ${firstName}` : ""}
            {hasData && lastSession && (
              <span className="text-zinc-700 ml-2">
                · last session{" "}
                <span className="text-zinc-500">
                  {new Date(lastSession.sessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </span>
            )}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            {hasData ? "Performance Overview" : "Welcome to UrApex"}
          </h1>
        </div>
        <Link
          href="/upload"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/25"
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </Link>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Sessions", icon: Flag, accent: true,
            value: profile?.totalSessions ?? 0,
            sub: weekDelta > 0 ? `+${weekDelta} this week` : thisWeekCount > 0 ? `${thisWeekCount} this week` : undefined,
          },
          { label: "Laps",       icon: TrendingUp, value: (profile?.totalLaps ?? 0).toLocaleString(), mono: true },
          { label: "Drive time", icon: Clock,       value: formatDriveTime(profile?.totalDriveTimeSec ?? 0), sub: "on track" },
          { label: "Circuits",   icon: Map,         value: profile?.uniqueTracks ?? 0 },
          { label: "Cars",       icon: Car,         value: profile?.uniqueCars ?? 0 },
        ].map(({ label, icon: Icon, value, accent, mono, sub }) => (
          <div
            key={label}
            className={`relative rounded-xl border px-4 py-3.5 overflow-hidden hover:border-zinc-700 transition-all duration-200 group backdrop-blur-sm ${
              accent ? "border-cyan-800/40 bg-zinc-900/50" : "border-zinc-800/60 bg-zinc-900/50"
            }`}
          >
            {accent && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            )}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                accent ? "bg-cyan-500/10" : "bg-zinc-800 group-hover:bg-zinc-700/60"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${accent ? "text-cyan-400" : "text-zinc-500"}`} />
              </div>
            </div>
            <div className={`text-2xl font-black leading-none tracking-tight ${mono ? "font-mono" : ""} ${accent ? "text-cyan-400" : "text-zinc-100"}`}>
              {value}
            </div>
            {sub && (
              <p className={`text-[11px] mt-1.5 font-medium ${
                sub.startsWith("+") ? "text-green-400" : "text-zinc-600"
              }`}>
                {sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Driver rating card (full width) ── */}
      <div className="relative rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
        {/* Gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/60 via-transparent to-transparent pointer-events-none" />
        {ratingInfo && (
          <div
            className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at right center, ${ratingInfo.stroke}08 0%, transparent 70%)` }}
          />
        )}

        <div className="relative flex items-center gap-8 px-8 py-6">
          {/* Left: overall rating */}
          <div className="shrink-0 text-center">
            {rating != null ? (
              <>
                <div className={`text-5xl font-black tabular-nums leading-none ${ratingInfo?.text}`}>
                  {rating.toFixed(0)}
                </div>
                <div className={`text-xs font-bold mt-1 uppercase tracking-widest ${ratingInfo?.text} opacity-70`}>
                  {ratingInfo?.grade}
                </div>
              </>
            ) : (
              <div className="text-4xl font-black text-zinc-800">—</div>
            )}
            <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest font-semibold">Driver Rating</p>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-zinc-700/40 shrink-0" />

          {/* Three rings */}
          <div className="flex items-center gap-8 flex-1">
            <ScoreRing value={profile?.consistencyScore} label="Consistency" size="lg" />
            <ScoreRing value={profile?.safetyScore}      label="Safety"      size="lg" />
            <ScoreRing value={profile?.paceScore}        label="Pace"        size="lg" />
          </div>

          {/* Right: hint */}
          {!hasData && (
            <div className="shrink-0 max-w-[180px] text-right">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Import sessions to calculate your driver scores
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Sessions — 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Recent sessions</h2>
            {hasData && (
              <Link href="/sessions" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm flex-1">
              <EmptyState
                icon={Upload}
                title="No sessions yet"
                description="Import your first XML result file to start tracking."
                action={{ label: "Upload session", href: "/upload" }}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
              {recentSessions.map((s, i) => {
                const st = SESSION_STYLE[s.sessionType] ?? SESSION_STYLE.PRACTICE
                const cScore = s.consistencyScore
                return (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className={`
                      relative flex items-center gap-0 hover:bg-zinc-800/40 transition-colors group
                      border-l-[3px] ${st.border}
                      ${i > 0 ? "border-t border-t-zinc-800/40" : ""}
                    `}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 px-4 py-3.5">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                            {s.track.name}
                          </span>
                          {s.isNewPB && (
                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                              PB
                            </span>
                          )}
                          {s.finalPosition != null && (
                            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-md shrink-0">
                              P{s.finalPosition}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[11px] font-semibold uppercase tracking-wide ${st.label}`}>
                            {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                          </span>
                          <span className="text-zinc-700 text-[11px]">·</span>
                          <span className="text-xs text-zinc-600 truncate">{s.car.name}</span>
                        </div>
                      </div>

                      {/* Scores + lap + date */}
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Consistency mini */}
                        {cScore != null && (
                          <div className="hidden sm:flex flex-col items-center gap-1">
                            <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${cScore}%`,
                                  background: cScore >= 80 ? "#4ade80" : cScore >= 60 ? "#facc15" : "#f87171",
                                }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono tabular-nums ${
                              cScore >= 80 ? "text-green-400/60" : cScore >= 60 ? "text-yellow-400/60" : "text-red-400/60"
                            }`}>{cScore.toFixed(0)}</span>
                          </div>
                        )}

                        {s.bestLapMs != null && (
                          <span className="font-mono text-sm text-zinc-300 tabular-nums">
                            {formatLapTime(s.bestLapMs)}
                          </span>
                        )}

                        <span className="text-[11px] text-zinc-600 w-12 text-right tabular-nums">
                          {new Date(s.sessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Active goals</h2>
                <Link href="/goals" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden divide-y divide-zinc-800/40">
                {activeGoals.map((goal) => {
                  const pct = Math.min(100, goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0)
                  const gi = GOAL_ICONS[goal.type]
                  const Icon = gi?.icon ?? Target
                  const bar = pct >= 80 ? "#4ade80" : pct >= 40 ? "#22d3ee" : "#52525b"
                  return (
                    <Link key={goal.id} href="/goals" className="block px-4 py-3.5 hover:bg-zinc-800/40 transition-colors group">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className={`w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${gi?.color ?? "text-zinc-500"}`} />
                        </div>
                        <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors truncate flex-1">
                          {goal.name}
                        </span>
                        <span className="text-xs font-mono font-bold tabular-nums text-zinc-500 shrink-0">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: bar }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent PBs */}
          {recentPBs.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                Personal bests
              </h2>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden divide-y divide-zinc-800/40">
                {recentPBs.map((s, i) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-black text-zinc-600 bg-zinc-800 shrink-0 tabular-nums">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors">
                        {s.track.name}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5 truncate">{s.car.name}</p>
                    </div>
                    <span className="text-sm font-mono text-cyan-400 shrink-0 tabular-nums font-bold">
                      {formatLapTime(s.bestLapMs)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty CTA — spacer aligns it with the sessions empty state below the section label */}
          {!hasData && (
            <div aria-hidden className="h-3" />
          )}
          {!hasData && (
            <div className="flex-1 rounded-2xl border border-dashed border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto">
                <Target className="w-5 h-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-400">Ready to start?</p>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Import your first session to unlock your scores, goals and PBs.
                </p>
              </div>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-semibold border border-cyan-500/20 hover:bg-cyan-500/15 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Import session
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
