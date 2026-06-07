import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime, formatDriveTime } from "@/lib/time"
import { formatDistanceToNow } from "date-fns"
import {
  Map, Car, Flag, Clock, TrendingUp,
  Trophy, Settings, ArrowRight,
} from "lucide-react"
import { DriverDNAChart } from "@/components/charts/DriverDNAChart"
import Link from "next/link"

function scoreLabel(v: number | null | undefined) {
  if (v == null) return { grade: "—", color: "text-zinc-600" }
  if (v >= 90) return { grade: "A+", color: "text-green-400" }
  if (v >= 80) return { grade: "A",  color: "text-lime-400" }
  if (v >= 70) return { grade: "B",  color: "text-yellow-400" }
  if (v >= 55) return { grade: "C",  color: "text-orange-400" }
  return              { grade: "D",  color: "text-red-400" }
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [profile, user, topTracks, topCars, recentSessions, unlockedAchievements, totalAchievements] =
    await Promise.all([
      db.driverProfile.findUnique({ where: { userId } }),
      db.user.findUnique({ where: { id: userId }, select: { email: true, name: true, createdAt: true } }),

      // Top 3 tracks by session count
      db.session.groupBy({
        by: ["trackId"],
        where: { userId, deletedAt: null },
        _count: { id: true },
        _min: { bestLapMs: true },
        orderBy: { _count: { id: "desc" } },
        take: 3,
      }).then(async (rows) => {
        const ids = rows.map(r => r.trackId)
        const tracks = await db.track.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true } })
        return rows.map(r => ({
          ...tracks.find(t => t.id === r.trackId)!,
          sessions: r._count.id,
          bestLapMs: r._min.bestLapMs,
        }))
      }),

      // Top 3 cars by session count
      db.session.groupBy({
        by: ["carId"],
        where: { userId, deletedAt: null },
        _count: { id: true },
        _min: { bestLapMs: true },
        orderBy: { _count: { id: "desc" } },
        take: 3,
      }).then(async (rows) => {
        const ids = rows.map(r => r.carId)
        const cars = await db.car.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true } })
        return rows.map(r => ({
          ...cars.find(c => c.id === r.carId)!,
          sessions: r._count.id,
          bestLapMs: r._min.bestLapMs,
        }))
      }),

      db.session.findMany({
        where: { userId, deletedAt: null },
        orderBy: { sessionDate: "desc" },
        take: 5,
        include: { track: { select: { name: true } }, car: { select: { name: true } } },
      }),

      db.userAchievement.count({ where: { userId, unlockedAt: { not: null } } }),
      db.achievement.count(),
    ])

  const displayName = profile?.displayName ?? user?.name ?? user?.email?.split("@")[0] ?? "Driver"
  const hasData = (profile?.totalSessions ?? 0) > 0

  const SCORES = [
    { label: "Consistency",  value: profile?.consistencyScore },
    { label: "Safety",       value: profile?.safetyScore },
    { label: "Pace",         value: profile?.paceScore },
    { label: "Improvement",  value: profile?.improvementScore },
    { label: "Racecraft",    value: profile?.racecraftScore },
    { label: "Qualifying",   value: profile?.qualifyingScore },
  ].filter(s => s.value != null || ["Consistency","Safety","Pace","Improvement"].includes(s.label))

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header card */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-zinc-400">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-zinc-100 tracking-tight">{displayName}</h1>
              {profile?.country && (
                <p className="text-sm text-zinc-500 mt-0.5 uppercase tracking-wide">{profile.country}</p>
              )}
              {profile?.simDriverName && (
                <p className="text-xs text-zinc-600 mt-0.5 font-mono">{profile.simDriverName}</p>
              )}
              {user?.createdAt && (
                <p className="text-xs text-zinc-700 mt-1">
                  Member since {new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Edit
          </Link>
        </div>

        {profile?.bio && (
          <p className="mt-4 pt-4 border-t border-zinc-800/50 text-sm text-zinc-400 leading-relaxed">{profile.bio}</p>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: Flag,       label: "Sessions",   value: profile?.totalSessions ?? 0 },
          { icon: TrendingUp, label: "Laps",       value: (profile?.totalLaps ?? 0).toLocaleString() },
          { icon: Clock,      label: "Drive time", value: formatDriveTime(profile?.totalDriveTimeSec ?? 0) },
          { icon: Map,        label: "Circuits",   value: profile?.uniqueTracks ?? 0 },
          { icon: Car,        label: "Cars",       value: profile?.uniqueCars ?? 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center">
            <Icon className="w-3.5 h-3.5 text-zinc-600 mx-auto mb-1.5" />
            <p className="text-lg font-black text-zinc-100">{value}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Driver scores + DNA radar */}
      {hasData && (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Driver DNA</h2>
          <div className="grid sm:grid-cols-2 gap-6 items-center">
            {/* Radar chart */}
            <DriverDNAChart scores={SCORES} height={220} />
            {/* Score grades */}
            <div className="grid grid-cols-2 gap-3">
              {SCORES.map(({ label, value }) => {
                const { grade, color } = scoreLabel(value)
                return (
                  <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-800/30 px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
                      {value != null && (
                        <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{value.toFixed(1)}</p>
                      )}
                    </div>
                    <span className={`text-xl font-black ${color}`}>{grade}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Top circuits */}
        {topTracks.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5" /> Top circuits
            </h2>
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 divide-y divide-zinc-800/40 overflow-hidden">
              {topTracks.map((t, i) => (
                <Link key={t.id} href={`/tracks/${t.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group">
                  <span className="text-sm font-black text-zinc-700 w-4 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-300 group-hover:text-cyan-400 transition-colors truncate">{t.name}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{t.sessions} session{t.sessions !== 1 ? "s" : ""}</p>
                  </div>
                  {t.bestLapMs && (
                    <span className="font-mono text-xs text-zinc-400 shrink-0">{formatLapTime(t.bestLapMs)}</span>
                  )}
                  <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top cars */}
        {topCars.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" /> Preferred cars
            </h2>
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 divide-y divide-zinc-800/40 overflow-hidden">
              {topCars.map((c, i) => (
                <Link key={c.id} href={`/cars/${c.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group">
                  <span className="text-sm font-black text-zinc-700 w-4 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-300 group-hover:text-cyan-400 transition-colors truncate">{c.name}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{c.sessions} session{c.sessions !== 1 ? "s" : ""}</p>
                  </div>
                  {c.bestLapMs && (
                    <span className="font-mono text-xs text-zinc-400 shrink-0">{formatLapTime(c.bestLapMs)}</span>
                  )}
                  <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievements summary */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Trophy className="w-4.5 h-4.5 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {unlockedAchievements} / {totalAchievements} achievements unlocked
            </p>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5 w-48">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                style={{ width: totalAchievements > 0 ? `${(unlockedAchievements / totalAchievements) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>
        <Link href="/achievements" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Recent sessions</h2>
            <Link href="/sessions" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 divide-y divide-zinc-800/40 overflow-hidden">
            {recentSessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/40 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">{s.track.name}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{s.sessionType} · {s.car.name}</p>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  {s.bestLapMs && <span className="font-mono text-zinc-300">{formatLapTime(s.bestLapMs)}</span>}
                  {s.isNewPB && <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">PB</span>}
                  <span className="text-zinc-600">
                    {formatDistanceToNow(s.sessionDate, { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
