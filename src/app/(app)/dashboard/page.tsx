import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shared/StatCard"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDriveTime, formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import { Upload, Clock, Flag, Map, Car, TrendingUp, Trophy, Target, ArrowRight, Zap } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  const [profile, recentSessions, recentPBs, activeGoals] = await Promise.all([
    db.driverProfile.findUnique({ where: { userId } }),
    db.session.findMany({
      where: { userId, deletedAt: null },
      orderBy: { sessionDate: "desc" },
      take: 6,
      include: {
        track: { select: { name: true, slug: true } },
        car: { select: { name: true, slug: true } },
        simulator: { select: { slug: true } },
      },
    }),
    db.session.findMany({
      where: { userId, deletedAt: null, isNewPB: true },
      orderBy: { sessionDate: "desc" },
      take: 3,
      include: { track: { select: { name: true } }, car: { select: { name: true } } },
    }),
    db.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ])

  const hasData = (profile?.totalSessions ?? 0) > 0
  const firstName = profile?.displayName?.split(" ")[0] ?? session.user.name?.split(" ")[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 mb-0.5">{greeting}{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            {hasData ? "Performance Overview" : "Welcome to UrApex"}
          </h1>
          {hasData && (
            <p className="text-sm text-zinc-500 mt-1">
              {profile?.totalSessions} session{profile?.totalSessions !== 1 ? "s" : ""} logged
              {profile?.uniqueTracks ? ` across ${profile.uniqueTracks} circuit${profile.uniqueTracks !== 1 ? "s" : ""}` : ""}
            </p>
          )}
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Upload className="w-3.5 h-3.5" />
          Import session
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Sessions" value={profile?.totalSessions ?? 0} icon={Flag} accent />
        <StatCard label="Total laps" value={(profile?.totalLaps ?? 0).toLocaleString()} icon={TrendingUp} mono />
        <StatCard label="Drive time" value={formatDriveTime(profile?.totalDriveTimeSec ?? 0)} icon={Clock} sublabel="behind the wheel" />
        <StatCard label="Circuits" value={profile?.uniqueTracks ?? 0} icon={Map} />
        <StatCard label="Cars" value={profile?.uniqueCars ?? 0} icon={Car} />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Recent sessions — 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent sessions</h2>
            {hasData && (
              <Link href="/sessions" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <EmptyState
                icon={Upload}
                title="No sessions yet"
                description="Import your first XML result file to start tracking."
                action={{ label: "Upload session", href: "/upload" }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/60">
              {recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group"
                >
                  {/* Session type dot */}
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${SESSION_DOT_COLORS[s.sessionType] ?? "bg-zinc-600"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                        {s.track.name}
                      </span>
                      {s.isNewPB && (
                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded shrink-0">PB</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {s.car.name} · <span className="uppercase">{SIMULATOR_LABELS[s.simulator.slug] ?? s.simulator.slug}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    {s.bestLapMs && (
                      <span className="text-sm font-mono text-zinc-300 tabular-nums">
                        {formatLapTime(s.bestLapMs)}
                      </span>
                    )}
                    <div className="text-right">
                      <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                        {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                      </span>
                      <p className="text-[10px] text-zinc-600 mt-px">
                        {new Date(s.sessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Driver scores */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Driver scores</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/60">
              {[
                { label: "Consistency", value: profile?.consistencyScore, icon: TrendingUp },
                { label: "Safety", value: profile?.safetyScore, icon: Zap },
                { label: "Pace", value: profile?.paceScore, icon: Flag },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-sm text-zinc-400">{label}</span>
                  </div>
                  {value != null ? (
                    <ScoreBadge value={value} size="sm" />
                  ) : (
                    <span className="text-xs text-zinc-700">No data</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Active goals</h2>
                <Link href="/goals" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/60">
                {activeGoals.map((goal) => {
                  const pct = Math.min(100, goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0)
                  return (
                    <Link key={goal.id} href="/goals" className="block px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-zinc-300 truncate">{goal.name}</span>
                        <span className="text-xs font-mono text-zinc-500 ml-2 shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 80 ? "rgb(34 197 94)" : pct >= 40 ? "rgb(6 182 212)" : "rgb(100 116 139)",
                          }}
                        />
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
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                <Trophy className="w-3.5 h-3.5 text-cyan-400 inline mr-1.5" />
                Recent PBs
              </h2>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/60">
                {recentPBs.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{s.track.name}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{s.car.name}</p>
                    </div>
                    <span className="text-sm font-mono text-cyan-400 shrink-0 ml-3 tabular-nums">
                      {formatLapTime(s.bestLapMs)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No data CTA */}
          {!hasData && (
            <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-center">
              <Target className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-400 mb-1">Ready to start?</p>
              <p className="text-xs text-zinc-600 mb-4">Import your first session to unlock your stats and scores.</p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
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

const SESSION_DOT_COLORS: Record<string, string> = {
  RACE: "bg-orange-400",
  QUALIFYING: "bg-cyan-400",
  PRACTICE: "bg-zinc-500",
  HOTLAP: "bg-purple-400",
  TIME_TRIAL: "bg-purple-400",
}
