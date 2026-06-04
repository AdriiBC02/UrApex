import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { SetupForm } from "@/features/setups/SetupForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewSetupPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [tracks, cars, simulators] = await Promise.all([
    db.session.groupBy({ by: ["trackId"], where: { userId, deletedAt: null } }).then(async rows => {
      const ids = rows.map(r => r.trackId)
      return db.track.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } })
    }),
    db.session.groupBy({ by: ["carId"], where: { userId, deletedAt: null } }).then(async rows => {
      const ids = rows.map(r => r.carId)
      return db.car.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } })
    }),
    db.simulator.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/setups" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Setups
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">New setup</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Save a car configuration to track which setup worked best.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-6">
        <SetupForm tracks={tracks} cars={cars} simulators={simulators} />
      </div>
    </div>
  )
}
