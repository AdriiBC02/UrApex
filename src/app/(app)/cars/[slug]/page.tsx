import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shared/StatCard"
import { ScoreBadge } from "@/components/shared/ScoreBadge"
import { Car, Flag } from "lucide-react"
import Link from "next/link"

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [sessionAuth, { slug }] = await Promise.all([auth(), params])
  if (!sessionAuth?.user?.id) redirect("/login")

  const userId = sessionAuth.user.id

  const car = await db.car.findUnique({
    where: { slug },
    include: { class: { select: { name: true } } },
  })
  if (!car) notFound()

  const sessions = await db.session.findMany({
    where: { userId, carId: car.id, deletedAt: null },
    orderBy: { sessionDate: "desc" },
    include: { track: { select: { name: true, slug: true } } },
  })

  if (sessions.length === 0) notFound()

  const totalLaps = sessions.reduce((s, sess) => s + sess.totalLaps, 0)
  const allBestLaps = sessions.filter((s) => s.bestLapMs).map((s) => s.bestLapMs!)
  const overallBest = allBestLaps.length ? Math.min(...allBestLaps) : null
  const avgConsistency = sessions.filter((s) => s.consistencyScore).length
    ? sessions.filter((s) => s.consistencyScore).reduce((s, sess) => s + sess.consistencyScore!, 0) /
      sessions.filter((s) => s.consistencyScore).length
    : null

  // Best lap per track
  const trackBests = sessions.reduce<Record<string, { track: typeof sessions[0]["track"]; best: number }>>((acc, s) => {
    if (!s.bestLapMs) return acc
    const key = s.track.slug
    if (!acc[key] || s.bestLapMs < acc[key].best) {
      acc[key] = { track: s.track, best: s.bestLapMs }
    }
    return acc
  }, {})

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
          <Link href="/cars" className="hover:text-zinc-300 transition-colors">Cars</Link>
          <span>/</span>
          <span>{car.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-zinc-100">{car.name}</h1>
          {car.class && (
            <Badge className="bg-zinc-800 text-zinc-400 border-0">{car.class.name}</Badge>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-0.5">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Best lap" value={formatLapTime(overallBest)} mono accent />
        <StatCard label="Sessions" value={sessions.length} icon={Flag} />
        <StatCard label="Total laps" value={totalLaps} />
        <StatCard
          label="Avg consistency"
          value={avgConsistency != null ? avgConsistency.toFixed(0) : "—"}
        />
      </div>

      {/* Best by track */}
      {Object.values(trackBests).length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Best lap by circuit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-zinc-800">
              {Object.values(trackBests)
                .sort((a, b) => a.best - b.best)
                .map(({ track, best }, i) => (
                  <div key={track.slug} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 w-5 text-right">{i + 1}</span>
                      <Link href={`/tracks/${track.slug}`} className="text-sm text-zinc-300 hover:text-cyan-400 transition-colors">
                        {track.name}
                      </Link>
                    </div>
                    <span className="font-mono text-sm text-zinc-200">{formatLapTime(best)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session list */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Sessions with {car.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Date", "Track", "Type", "Laps", "Best lap", "Cons.", "Safety"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs text-zinc-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/sessions/${s.id}`} className="text-zinc-400 hover:text-zinc-200 transition-colors">
                        {new Date(s.sessionDate).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "2-digit",
                        })}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/tracks/${s.track.slug}`} className="text-zinc-300 hover:text-cyan-400 transition-colors">
                        {s.track.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className="text-[10px] h-4 px-1.5 bg-zinc-800 text-zinc-400 border-0">
                        {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-zinc-400">{s.totalLaps}</td>
                    <td className="px-4 py-2.5 font-mono text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {formatLapTime(s.bestLapMs)}
                        {s.isNewPB && <span className="text-[10px] text-cyan-400">PB</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><ScoreBadge value={s.consistencyScore} size="sm" /></td>
                    <td className="px-4 py-2.5"><ScoreBadge value={s.safetyScore} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
