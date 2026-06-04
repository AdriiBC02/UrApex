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

  const [tracks, cars] = await Promise.all([
    db.session.findMany({
      where: { userId, deletedAt: null },
      select: { track: { select: { id: true, name: true, slug: true } } },
      distinct: ["trackId"],
      orderBy: { sessionDate: "desc" },
    }).then((rows) => rows.map((r) => r.track).filter((t): t is NonNullable<typeof t> => t !== null)),
    db.session.findMany({
      where: { userId, deletedAt: null },
      select: { car: { select: { id: true, name: true, slug: true } } },
      distinct: ["carId"],
      orderBy: { sessionDate: "desc" },
    }).then((rows) => rows.map((r) => r.car).filter((c): c is NonNullable<typeof c> => c !== null)),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to goals
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">New goal</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Set a measurable objective — progress updates automatically when you import sessions.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <GoalForm tracks={tracks} cars={cars} />
      </div>
    </div>
  )
}
