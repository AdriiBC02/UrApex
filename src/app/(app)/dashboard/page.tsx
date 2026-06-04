import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDriveTime, formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS, SIMULATOR_LABELS } from "@/lib/constants"
import { Upload, Clock, Flag, Map, Car, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [profile, recentSessions] = await Promise.all([
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
  ])

  const stats = [
    {
      label: "Sessions",
      value: profile?.totalSessions ?? 0,
      icon: Flag,
    },
    {
      label: "Laps",
      value: (profile?.totalLaps ?? 0).toLocaleString(),
      icon: TrendingUp,
    },
    {
      label: "Drive time",
      value: formatDriveTime(profile?.totalDriveTimeSec ?? 0),
      icon: Clock,
    },
    {
      label: "Circuits",
      value: profile?.uniqueTracks ?? 0,
      icon: Map,
    },
    {
      label: "Cars",
      value: profile?.uniqueCars ?? 0,
      icon: Car,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          Welcome back{profile?.displayName ? `, ${profile.displayName}` : ""}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Here&apos;s your performance overview.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100 font-mono">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent sessions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Recent sessions</CardTitle>
          <Link href="/sessions" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <EmptyState
              icon={Upload}
              title="No sessions yet"
              description="Import your first XML result file to start tracking your performance."
              action={{ label: "Upload session", href: "/upload" }}
            />
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {s.track.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1.5 bg-zinc-700 text-zinc-400 border-0 shrink-0"
                        >
                          {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                        </Badge>
                        {s.isNewPB && (
                          <Badge className="text-[10px] h-4 px-1.5 bg-cyan-500/15 text-cyan-400 border-0 shrink-0">
                            PB
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {s.car.name} ·{" "}
                        {SIMULATOR_LABELS[s.simulator.slug] ?? s.simulator.slug}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    {s.bestLapMs && (
                      <span className="text-sm font-mono text-zinc-300">
                        {formatLapTime(s.bestLapMs)}
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">
                      {new Date(s.sessionDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
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
  )
}
