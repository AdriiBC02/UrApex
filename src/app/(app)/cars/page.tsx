import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { EmptyState } from "@/components/shared/EmptyState"
import { Car, Upload, Flag } from "lucide-react"
import Link from "next/link"

export default async function CarsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const carGroups = await db.session.groupBy({
    by: ["carId"],
    where: { userId, deletedAt: null },
    _count: { id: true },
    _min: { bestLapMs: true, sessionDate: true },
    _max: { sessionDate: true },
    orderBy: { _count: { id: "desc" } },
  })

  const carIds = carGroups.map((c) => c.carId)
  const carDetails = await db.car.findMany({
    where: { id: { in: carIds } },
    include: { class: { select: { name: true } } },
  })
  const carMap = new Map(carDetails.map((c) => [c.id, c]))

  const rows = carGroups
    .map((c) => ({ ...c, car: carMap.get(c.carId) }))
    .filter((c): c is typeof c & { car: NonNullable<typeof c.car> } => c.car != null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Cars</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {rows.length} car{rows.length !== 1 ? "s" : ""} driven
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No cars yet"
          description="Import sessions to see your car stats here."
          action={{ label: "Upload session", href: "/upload" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ car, _count, _min, _max }) => (
            <Link
              key={car.id}
              href={`/cars/${car.slug}`}
              className="group relative rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 p-5 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative">
                {/* Car header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors truncate text-base">
                      {car.name}
                    </h3>
                    {car.class && (
                      <p className="text-xs text-zinc-500 mt-0.5">{car.class.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-800 rounded-md px-2 py-1 shrink-0 ml-2">
                    <Flag className="w-3 h-3" />
                    {_count.id}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-800/60 px-3 py-2.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Best lap</p>
                    <p className="text-base font-mono font-bold text-cyan-400 tabular-nums">
                      {formatLapTime(_min.bestLapMs)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 px-3 py-2.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Last session</p>
                    <p className="text-sm text-zinc-300 font-medium">
                      {_max.sessionDate
                        ? new Date(_max.sessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
