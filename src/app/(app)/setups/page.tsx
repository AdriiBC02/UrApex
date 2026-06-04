import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { EmptyState } from "@/components/shared/EmptyState"
import { Wrench, Plus, Star, Flag, Map, ArrowRight } from "lucide-react"
import Link from "next/link"
import { SetupActions } from "@/features/setups/SetupActions"

export default async function SetupsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [setups, tracks, cars, simulators] = await Promise.all([
    db.setup.findMany({
      where: { userId, isObsolete: false },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      include: {
        car:       { select: { name: true, slug: true } },
        track:     { select: { name: true, slug: true } },
        simulator: { select: { name: true, slug: true } },
        versions:  { orderBy: { version: "desc" }, take: 1 },
        _count:    { select: { sessions: true } },
      },
    }),
    db.session.groupBy({
      by: ["trackId"], where: { userId, deletedAt: null },
    }).then(async (rows) => {
      const ids = rows.map(r => r.trackId)
      return db.track.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } })
    }),
    db.session.groupBy({
      by: ["carId"], where: { userId, deletedAt: null },
    }).then(async (rows) => {
      const ids = rows.map(r => r.carId)
      return db.car.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } })
    }),
    db.simulator.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Setups</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {setups.length > 0
              ? `${setups.length} setup${setups.length !== 1 ? "s" : ""} · track which setup worked best`
              : "Store and version your car setups, link them to sessions."}
          </p>
        </div>
        <Link
          href="/setups/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          New setup
        </Link>
      </div>

      {setups.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No setups yet"
          description="Create your first setup to track which configuration works best at each circuit."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {setups.map((setup) => (
            <div
              key={setup.id}
              className="group relative rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-5 hover:border-zinc-700 transition-all overflow-hidden"
            >
              {/* Favorite indicator */}
              {setup.isFavorite && (
                <div className="absolute top-3 right-3">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                </div>
              )}

              <div className="flex-1 min-w-0 pr-6">
                <Link href={`/setups/${setup.id}`} className="block">
                  <h3 className="font-semibold text-zinc-100 truncate text-base mb-1 hover:text-cyan-400 transition-colors">{setup.name}</h3>
                </Link>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 mb-3">
                  {setup.track && (
                    <span className="flex items-center gap-1">
                      <Map className="w-3 h-3" />{setup.track.name}
                    </span>
                  )}
                  {setup.car && (
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />{setup.car.name}
                    </span>
                  )}
                  {setup.conditions && (
                    <span className="text-zinc-600">{setup.conditions}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-zinc-800/60 px-2.5 py-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Version</p>
                    <p className="text-sm font-bold text-zinc-200">v{setup.versions[0]?.version ?? 1}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 px-2.5 py-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Used in</p>
                    <p className="text-sm font-bold text-zinc-200">
                      {setup._count.sessions} session{setup._count.sessions !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {setup.notes && (
                  <p className="mt-3 text-xs text-zinc-600 line-clamp-2 leading-relaxed">{setup.notes}</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/40 flex items-center justify-between">
                <span className="text-[11px] text-zinc-600 uppercase tracking-wide font-medium">
                  {setup.simulator.name}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/setups/${setup.id}`}
                    className="flex items-center gap-1 text-xs text-zinc-600 hover:text-cyan-400 transition-colors"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                  <SetupActions setupId={setup.id} isFavorite={setup.isFavorite} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

