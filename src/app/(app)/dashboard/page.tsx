import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shared/StatCard"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDriveTime, formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import { Upload, Clock, Flag, Map, Car, TrendingUp, Trophy, Target } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [profile, recentSessions, recentPBs] = await Promise.all([
    db.driverProfile.findUnique({ where: { userId } }),
    db.session.findMany({
      where: { userId, deletedAt: null },
      orderBy: { sessionDate: "desc" },
      take: 5,
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
  ])

  const hasData = (profile?.totalSessions ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          {profile?.displayName ? `Welcome back, ${profile.displayName}` : "Dashboard"}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {hasData ? "Here's your performance overview." : "Import your first session to get started."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Sessions" value={profile?.totalSessions ?? 0} icon={Flag} />
        <StatCard label="Laps" value={(profile?.totalLaps ?? 0).toLocaleString()} icon={TrendingUp} mono />
        <StatCard label="Drive time" value={formatDriveTime(profile?.totalDriveTimeSec ?? 0)} icon={Clock} />
        <StatCard label="Circuits" value={profile?.uniqueTracks ?? 0} icon={Map} />
        <StatCard label="Cars" value={profile?.uniqueCars ?? 0} icon={Car} />
      </div>

      {/* Scores + Recent sessions — 2 col on desktop */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Recent sessions */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-zinc-800 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300">Recent sessions</CardTitle>
              {hasData && (
                <Link href="/sessions" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                  View all →
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <EmptyState
                  icon={Upload}
                  title="No sessions yet"
                  description="Import your first XML result file to start tracking."
                  action={{ label: "Upload session", href: "/upload" }}
                />
              ) : (
                <div className="space-y-1.5">
                  {recentSessions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {s.track.name}
                          </span>
                          <Badge className="text-[10px] h-4 px-1.5 bg-zinc-700/80 text-zinc-400 border-0 shrink-0">
                            {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                          </Badge>
                          {s.isNewPB && (
                            <Badge className="text-[10px] h-4 px-1.5 bg-cyan-500/15 text-cyan-400 border-0 shrink-0">
                              PB
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {s.car.name} · {SIMULATOR_LABELS[s.simulator.slug] ?? s.simulator.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-3">
                        {s.bestLapMs && (
                          <span className="text-sm font-mono text-zinc-300">
                            {formatLapTime(s.bestLapMs)}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600 w-14 text-right">
                          {new Date(s.sessionDate).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short",
                          })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: scores + PBs */}
        <div className="space-y-4">
          {/* Driver scores */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300">Driver scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 divide-y divide-zinc-800">
              {[
                { label: "Consistency", value: profile?.consistencyScore },
                { label: "Safety", value: profile?.safetyScore },
                { label: "Pace", value: profile?.paceScore },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-zinc-400">{label}</span>
                  {value != null ? (
                    <ScoreBadge value={value} size="sm" />
                  ) : (
                    <span className="text-xs text-zinc-600">Need more data</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent PBs */}
          {recentPBs.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                  Recent PBs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentPBs.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between hover:text-zinc-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{s.track.name}</p>
                      <p className="text-xs text-zinc-600">{s.car.name}</p>
                    </div>
                    <span className="text-sm font-mono text-cyan-400 shrink-0 ml-2">
                      {formatLapTime(s.bestLapMs)}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          {!hasData && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-3">Quick actions</p>
                <div className="space-y-2">
                  <Link
                    href="/upload"
                    className="flex items-center gap-2 text-sm text-zinc-300 hover:text-cyan-400 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import a session
                  </Link>
                  <Link
                    href="/goals"
                    className="flex items-center gap-2 text-sm text-zinc-300 hover:text-cyan-400 transition-colors"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Set a goal
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
