import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDriveTime, formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS } from "@/lib/constants"
import {
  Upload, Clock, Flag, Map, Car, TrendingUp,
  Trophy, Target, ArrowRight, Timer, Activity,
  BarChart2, CheckCircle2, ShieldOff, Shield, Sliders,
} from "lucide-react"
import Link from "next/link"
import type { GoalType } from "@prisma/client"
import { ActivityChart } from "@/components/charts/ActivityChart"
import { TrendChart } from "@/components/charts/TrendChart"

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
  // Stable filter id derived from the label — no spaces/special chars
  const filterId = `glow-${label.replace(/\s+/g, "-").toLowerCase()}`
  const showGlow = Boolean(sc && pct > 0 && size === "lg")

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={dim} height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="-rotate-90"
        >
          {showGlow && (
            <defs>
              {/* Glow applied only to the arc, not the whole SVG */}
              <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}
          <circle cx={dim/2} cy={dim/2} r={R} fill="none" stroke="#27272a" strokeWidth={sw} />
          {pct > 0 && (
            <circle
              cx={dim/2} cy={dim/2} r={R}
              fill="none"
              stroke={sc?.stroke ?? "#27272a"}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={`${pct * C} ${C}`}
              filter={showGlow ? `url(#${filterId})` : undefined}
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

  // 12-week activity window
  const twelveWeeksAgo = new Date(weekStart)
  twelveWeeksAgo.setDate(weekStart.getDate() - 11 * 7)

  const [profile, recentSessions, recentPBs, activeGoals, recentAchievements, thisWeekCount, lastWeekCount, activitySessions, allSessionDates] =
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
      db.userAchievement.findMany({
        where: { userId, unlockedAt: { not: null } },
        orderBy: { unlockedAt: "desc" },
        take: 3,
        include: { achievement: { select: { name: true, description: true, rarity: true } } },
      }),
      db.session.count({ where: { userId, deletedAt: null, sessionDate: { gte: weekStart } } }),
      db.session.count({ where: { userId, deletedAt: null, sessionDate: { gte: prevWeekStart, lt: weekStart } } }),
      db.session.findMany({
        where: { userId, deletedAt: null, sessionDate: { gte: twelveWeeksAgo } },
        select: { sessionDate: true, consistencyScore: true },
        orderBy: { sessionDate: "asc" },
      }),
      db.session.findMany({
        where: { userId, deletedAt: null },
        select: { sessionDate: true },
        orderBy: { sessionDate: "desc" },
      }),
    ])

  const hasData  = (profile?.totalSessions ?? 0) > 0
  const firstName = profile?.displayName?.split(" ")[0] ?? session.user.name?.split(" ")[0]
  const lastSession = recentSessions[0]
  const weekDelta = thisWeekCount - lastWeekCount

  const rating = driverRating([profile?.consistencyScore, profile?.safetyScore, profile?.paceScore, profile?.improvementScore])
  const ratingInfo = rating != null ? scoreColor(rating) : null

  // Build 12-week activity buckets
  const weekBuckets = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(weekStart)
    start.setDate(weekStart.getDate() - (11 - i) * 7)
    const end = new Date(start); end.setDate(start.getDate() + 7)
    const count = activitySessions.filter(s => {
      const d = new Date(s.sessionDate)
      return d >= start && d < end
    }).length
    const label = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    return { label, sessions: count, isCurrentWeek: i === 11 }
  })

  // Consistency trend from activity sessions
  const consistencyTrend = activitySessions
    .filter(s => s.consistencyScore != null)
    .map(s => ({
      date: new Date(s.sessionDate).toISOString().split("T")[0],
      value: s.consistencyScore!,
    }))

  // Streak — consecutive distinct days from today going back
  const uniqueDays = [...new Set(
    allSessionDates.map(s => new Date(s.sessionDate).toISOString().split("T")[0])
  )].sort().reverse() // newest first
  let streak = 0
  if (uniqueDays.length > 0) {
    const todayStr  = now.toISOString().split("T")[0]
    const yestStr   = new Date(now.getTime() - 864e5).toISOString().split("T")[0]
    // streak starts from today or yesterday (so a gap of 1 day doesn't break it)
    const startStr  = uniqueDays[0] === todayStr || uniqueDays[0] === yestStr ? uniqueDays[0] : null
    if (startStr) {
      let cursor = new Date(startStr)
      for (const day of uniqueDays) {
        const cursorStr = cursor.toISOString().split("T")[0]
        if (day === cursorStr) {
          streak++
          cursor = new Date(cursor.getTime() - 864e5)
        } else {
          break
        }
      }
    }
  }

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
            label: "Sessions", icon: Flag,       iconBg: "bg-cyan-500/10",    iconColor: "text-cyan-400",
            value: profile?.totalSessions ?? 0,
            sub: weekDelta > 0 ? `+${weekDelta} this week` : thisWeekCount > 0 ? `${thisWeekCount} this week` : undefined,
            valueColor: "text-cyan-400",
          },
          {
            label: "Laps",       icon: TrendingUp, iconBg: "bg-green-500/10",   iconColor: "text-green-400",
            value: (profile?.totalLaps ?? 0).toLocaleString(), mono: true, valueColor: "text-zinc-100",
          },
          {
            label: "Drive time", icon: Clock,       iconBg: "bg-purple-500/10",  iconColor: "text-purple-400",
            value: formatDriveTime(profile?.totalDriveTimeSec ?? 0), sub: "on track", valueColor: "text-zinc-100",
          },
          {
            label: "Circuits",   icon: Map,         iconBg: "bg-orange-500/10",  iconColor: "text-orange-400",
            value: profile?.uniqueTracks ?? 0, valueColor: "text-zinc-100",
          },
          {
            label: "Cars",       icon: Car,         iconBg: "bg-amber-500/10",   iconColor: "text-amber-400",
            value: profile?.uniqueCars ?? 0, valueColor: "text-zinc-100",
          },
        ].map(({ label, icon: Icon, iconBg, iconColor, value, mono, sub, valueColor }) => (
          <div
            key={label}
            className="relative rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3.5 overflow-hidden hover:border-zinc-700 transition-all duration-200 group backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
            </div>
            <div className={`text-2xl font-black leading-none tracking-tight ${mono ? "font-mono" : ""} ${valueColor}`}>
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
        {/* Background glow matching rating color */}
        {ratingInfo && (
          <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${ratingInfo.stroke}06 0%, transparent 70%)` }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-80 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at right center, ${ratingInfo.stroke}05 0%, transparent 70%)` }}
            />
          </>
        )}
        {/* Top accent line */}
        {ratingInfo && (
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(to right, ${ratingInfo.stroke}60, ${ratingInfo.stroke}20, transparent)` }} />
        )}

        <div className="relative flex items-center gap-6 sm:gap-10 px-6 sm:px-8 py-6">
          {/* Left: overall rating */}
          <div className="shrink-0 text-center min-w-[72px]">
            {rating != null ? (
              <>
                <div className={`text-6xl font-black tabular-nums leading-none ${ratingInfo?.text}`}
                  style={{ textShadow: ratingInfo ? `0 0 32px ${ratingInfo.stroke}50` : undefined }}
                >
                  {rating.toFixed(0)}
                </div>
                <div className={`text-xs font-black mt-1.5 uppercase tracking-[0.2em] ${ratingInfo?.text} opacity-60`}>
                  {ratingInfo?.grade}
                </div>
              </>
            ) : (
              <div className="text-5xl font-black text-zinc-800">—</div>
            )}
            <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest font-semibold">Rating</p>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-zinc-800 shrink-0" />

          {/* Score rings */}
          <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-around flex-wrap">
            <ScoreRing value={profile?.consistencyScore} label="Consistency" size="lg" />
            <ScoreRing value={profile?.safetyScore}      label="Safety"      size="lg" />
            <ScoreRing value={profile?.paceScore}        label="Pace"        size="lg" />
            <ScoreRing value={profile?.improvementScore} label="Improvement" size="lg" />
            {profile?.racecraftScore != null && (
              <ScoreRing value={profile.racecraftScore} label="Racecraft" size="lg" />
            )}
            {profile?.qualifyingScore != null && (
              <ScoreRing value={profile.qualifyingScore} label="Qualifying" size="lg" />
            )}
          </div>

          {!hasData && (
            <div className="shrink-0 max-w-[160px] text-right hidden sm:block">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Import sessions to calculate your scores
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
                          {s.sessionType === "RACE" && (
                            s.isOnline
                              ? <span className="text-[9px] font-bold text-blue-400/70 px-1 py-0.5 rounded bg-blue-500/8 border border-blue-500/15">MP</span>
                              : <span className="text-[9px] font-bold text-zinc-600 px-1 py-0.5 rounded bg-zinc-800/50 border border-zinc-700/30">AI</span>
                          )}
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

          {/* Recent achievements */}
          {recentAchievements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-orange-400" />
                  Achievements
                </h2>
                <Link href="/achievements" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden divide-y divide-zinc-800/40">
                {recentAchievements.map((ua) => {
                  const RARITY_COLOR: Record<string, string> = {
                    COMMON: "text-zinc-400", UNCOMMON: "text-green-400",
                    RARE: "text-blue-400", EPIC: "text-purple-400", LEGENDARY: "text-orange-400",
                  }
                  const RARITY_ICON: Record<string, string> = {
                    COMMON: "⬡", UNCOMMON: "◆", RARE: "◈", EPIC: "✦", LEGENDARY: "★",
                  }
                  const color = RARITY_COLOR[ua.achievement.rarity] ?? "text-zinc-400"
                  const icon  = RARITY_ICON[ua.achievement.rarity]  ?? "⬡"
                  return (
                    <Link key={ua.achievementId} href="/achievements"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group">
                      <span className={`text-base shrink-0 ${color}`}>{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors">
                          {ua.achievement.name}
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{ua.achievement.description}</p>
                      </div>
                      <p className="text-[10px] text-zinc-600 shrink-0">
                        {ua.unlockedAt ? new Date(ua.unlockedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Streak widget */}
          {streak > 0 && (
            <div className="rounded-2xl border border-orange-800/30 bg-orange-950/10 backdrop-blur-sm px-4 py-3.5 flex items-center gap-4">
              <div className="text-3xl leading-none">🔥</div>
              <div>
                <p className="text-xl font-black text-orange-400 tabular-nums leading-none">{streak} day{streak !== 1 ? "s" : ""}</p>
                <p className="text-[11px] text-orange-600/70 mt-0.5 font-medium">active streak</p>
              </div>
              {streak >= 7 && (
                <div className="ml-auto">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/20">
                    {streak >= 30 ? "🏆 LEGEND" : streak >= 14 ? "⚡ ON FIRE" : "🎯 WEEKLY"}
                  </span>
                </div>
              )}
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

      {/* ── Progress section ── */}
      {hasData && (weekBuckets.some(b => b.sessions > 0) || consistencyTrend.length >= 3) && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Training activity
          </h2>
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Weekly sessions */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50">
                <h3 className="text-sm font-semibold text-zinc-300">Sessions per week</h3>
                <span className="text-xs text-zinc-600">last 12 weeks</span>
              </div>
              <div className="px-4 py-4">
                <ActivityChart data={weekBuckets} />
              </div>
            </div>

            {/* Consistency trend */}
            {consistencyTrend.length >= 3 && (
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50">
                  <h3 className="text-sm font-semibold text-zinc-300">Consistency trend</h3>
                  <span className="text-xs text-zinc-600">last 12 weeks</span>
                </div>
                <div className="px-4 py-4">
                  <TrendChart
                    data={consistencyTrend}
                    color="#4ade80"
                    domain={[0, 100]}
                    formatter={(v) => v.toFixed(0)}
                    label="Consistency"
                    height={120}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
