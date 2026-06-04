import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { GoalForm } from "@/features/goals/GoalForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewGoalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  // Fetch tracks and cars for the selectors
  const [tracks, cars] = await Promise.all([
    db.session.findMany({
      where: { userId, deletedAt: null },
      select: { track: { select: { id: true, name: true, slug: true } } },
      distinct: ["trackId"],
      orderBy: { sessionDate: "desc" },
    }).then((rows) => rows.map((r) => r.track)),
    db.session.findMany({
      where: { userId, deletedAt: null },
      select: { car: { select: { id: true, name: true, slug: true } } },
      distinct: ["carId"],
      orderBy: { sessionDate: "desc" },
    }).then((rows) => rows.map((r) => r.car)),
  ])

  return (
    <div className="max-w-xl">
      <Link
        href="/goals"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to goals
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">New goal</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Set a measurable objective with an optional deadline.
        </p>
      </div>

      <GoalForm tracks={tracks} cars={cars} />
    </div>
  )
}
