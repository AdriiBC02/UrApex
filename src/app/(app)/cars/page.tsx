import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { Car, Upload } from "lucide-react"
import Link from "next/link"

export default async function CarsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const carGroups = await db.session.groupBy({
    by: ["carId"],
    where: { userId, deletedAt: null },
    _count: { id: true },
    _min: { bestLapMs: true },
  })

  const carIds = carGroups.map((c) => c.carId)
  const carDetails = await db.car.findMany({
    where: { id: { in: carIds } },
    include: { class: { select: { name: true } } },
  })
  const carMap = new Map(carDetails.map((c) => [c.id, c]))

  const rows = carGroups
    .map((c) => ({ ...c, car: carMap.get(c.carId) }))
    .filter((c) => c.car != null)
    .sort((a, b) => b._count.id - a._count.id)

  return (
    <div>
      <PageHeader
        title="Cars"
        description={`${rows.length} car${rows.length !== 1 ? "s" : ""} driven`}
        icon={Car}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No cars yet"
          description="Import sessions to see your car stats here."
          action={{ label: "Upload session", href: "/upload" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ car, _count, _min }) => (
            <Link
              key={car!.id}
              href={`/cars/${car!.slug}`}
              className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all hover:bg-zinc-800/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                    {car!.name}
                  </h3>
                  {car!.class && (
                    <p className="text-xs text-zinc-500 mt-0.5">{car!.class.name}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-600 shrink-0 ml-2">
                  {_count.id} session{_count.id !== 1 ? "s" : ""}
                </span>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Best lap</p>
                <p className="text-lg font-mono font-semibold text-cyan-400">
                  {formatLapTime(_min.bestLapMs)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
