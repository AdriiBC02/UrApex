import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { Map as MapIcon, Upload } from "lucide-react"
import Link from "next/link"

export default async function TracksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  // Get all tracks the user has driven at, with stats
  const tracks = await db.session.groupBy({
    by: ["trackId"],
    where: { userId, deletedAt: null },
    _count: { id: true },
    _min: { bestLapMs: true, sessionDate: true },
    _max: { sessionDate: true },
    orderBy: { _count: { id: "desc" } },
  })

  const trackIds = tracks.map((t) => t.trackId)
  const trackDetails = await db.track.findMany({
    where: { id: { in: trackIds } },
  })
  const trackMap = new Map(trackDetails.map((t) => [t.id, t]))

  const rows = tracks
    .map((t) => ({ ...t, track: trackMap.get(t.trackId) }))
    .filter((t) => t.track != null)

  return (
    <div>
      <PageHeader
        title="Tracks"
        description={`${rows.length} circuit${rows.length !== 1 ? "s" : ""} driven`}
        icon={MapIcon}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No tracks yet"
          description="Import sessions to see your circuit stats here."
          action={{ label: "Upload session", href: "/upload" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ track, _count, _min }) => (
            <Link
              key={track!.id}
              href={`/tracks/${track!.slug}`}
              className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all hover:bg-zinc-800/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                    {track!.name}
                  </h3>
                  {track!.country && (
                    <p className="text-xs text-zinc-500 mt-0.5">{track!.country}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-600 shrink-0 ml-2">
                  {_count.id} session{_count.id !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Best lap</p>
                  <p className="text-lg font-mono font-semibold text-cyan-400">
                    {formatLapTime(_min.bestLapMs)}
                  </p>
                </div>
                {track!.lengthM && (
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 mb-0.5">Length</p>
                    <p className="text-sm text-zinc-400">{(track!.lengthM / 1000).toFixed(3)} km</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
