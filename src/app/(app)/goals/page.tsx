import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { EmptyState } from "@/components/shared/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Target, CheckCircle2, Clock, Plus, TrendingUp, XCircle, Map, Car } from "lucide-react"
import type { GoalType, GoalStatus } from "@prisma/client"
import Link from "next/link"
import { GoalActions } from "@/features/goals/GoalActions"

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  BEST_LAP_TIME: "Best lap time",
  CONSISTENCY_SCORE: "Consistency score",
  CLEAN_LAP_COUNT: "Clean laps",
  SESSION_COUNT: "Sessions",
  HOURS_DRIVEN: "Hours driven",
  REDUCE_INCIDENTS: "Reduce incidents",
  IMPROVE_SAFETY: "Safety score",
  COMPLETE_STINTS: "Complete stints",
  CUSTOM: "Custom",
}

const LOWER_IS_BETTER: GoalType[] = ["BEST_LAP_TIME", "REDUCE_INCIDENTS"]

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [active, completed, abandoned] = await Promise.all([
    db.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, type: true, status: true, targetValue: true, currentValue: true, unit: true, deadline: true, completedAt: true, trackId: true, carId: true },
    }),
    db.goal.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: { id: true, name: true, type: true, status: true, targetValue: true, currentValue: true, unit: true, deadline: true, completedAt: true, trackId: true, carId: true },
    }),
    db.goal.findMany({
      where: { userId, status: "ABANDONED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, type: true, status: true, targetValue: true, currentValue: true, unit: true, deadline: true, completedAt: true, trackId: true, carId: true },
    }),
  ])

  // Resolve track/car names for scoped goals
  const allGoals = [...active, ...completed, ...abandoned]
  const trackIds = [...new Set(allGoals.map(g => g.trackId).filter((id): id is string => !!id))]
  const carIds   = [...new Set(allGoals.map(g => g.carId).filter((id): id is string => !!id))]
  const [goalTracks, goalCars] = await Promise.all([
    trackIds.length ? db.track.findMany({ where: { id: { in: trackIds } }, select: { id: true, name: true } }) : [],
    carIds.length   ? db.car.findMany({ where: { id: { in: carIds } }, select: { id: true, name: true } }) : [],
  ])
  const trackNameById = Object.fromEntries(goalTracks.map(t => [t.id, t.name]))
  const carNameById   = Object.fromEntries(goalCars.map(c => [c.id, c.name]))

  const hasGoals = active.length > 0 || completed.length > 0 || abandoned.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Goals</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {hasGoals
              ? `${active.length} active · ${completed.length} completed${abandoned.length > 0 ? ` · ${abandoned.length} abandoned` : ""}`
              : "Set personal objectives and track your progress."}
          </p>
        </div>
        <Link
          href="/goals/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          New goal
        </Link>
      </div>

      {!hasGoals ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a goal to track your progress — best lap times, consistency, clean races and more."
          action={{ label: "Create your first goal", href: "/goals/new" }}
        />
      ) : (
        <div className="space-y-8">
          {/* Active */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Active
              </h2>
              <span className="text-xs text-zinc-700 font-mono">{active.length}</span>
            </div>

            {active.length === 0 ? (
              <p className="text-sm text-zinc-700 italic">No active goals. <Link href="/goals/new" className="text-cyan-500 hover:text-cyan-400 not-italic">Create one →</Link></p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {active.map((goal) => <GoalCard key={goal.id} goal={goal} trackName={goal.trackId ? trackNameById[goal.trackId] : undefined} carName={goal.carId ? carNameById[goal.carId] : undefined} />)}
              </div>
            )}
          </section>

          {/* Completed */}
          {completed.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Completed</h2>
                <span className="text-xs text-zinc-700 font-mono">{completed.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {completed.map((goal) => <GoalCard key={goal.id} goal={goal} trackName={goal.trackId ? trackNameById[goal.trackId] : undefined} carName={goal.carId ? carNameById[goal.carId] : undefined} />)}
              </div>
            </section>
          )}

          {/* Abandoned */}
          {abandoned.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Abandoned</h2>
                <span className="text-xs text-zinc-700 font-mono">{abandoned.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {abandoned.map((goal) => <GoalCard key={goal.id} goal={goal} trackName={goal.trackId ? trackNameById[goal.trackId] : undefined} carName={goal.carId ? carNameById[goal.carId] : undefined} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function GoalCard({
  goal,
  trackName,
  carName,
}: {
  goal: {
    id: string
    name: string
    type: GoalType
    status: GoalStatus
    targetValue: number
    currentValue: number
    unit: string | null
    deadline: Date | null
    completedAt: Date | null
  }
  trackName?: string
  carName?: string
}) {
  const { status } = goal
  const isCompleted = status === "COMPLETED"
  const isAbandoned = status === "ABANDONED"
  const isActive = status === "ACTIVE"
  const lowerIsBetter = LOWER_IS_BETTER.includes(goal.type)

  const progress = (() => {
    if (lowerIsBetter) {
      if (!goal.currentValue) return 0
      return goal.currentValue <= goal.targetValue ? 100 : 0
    }
    return Math.min(100, goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0)
  })()

  const displayTarget =
    goal.type === "BEST_LAP_TIME" ? formatLapTime(goal.targetValue)
    : goal.type === "HOURS_DRIVEN" ? `${goal.targetValue}h`
    : goal.targetValue.toLocaleString()

  const displayCurrent =
    goal.type === "BEST_LAP_TIME" ? formatLapTime(goal.currentValue || null)
    : goal.type === "HOURS_DRIVEN" ? `${goal.currentValue.toFixed(1)}h`
    : goal.currentValue.toLocaleString()

  const progressColor =
    isCompleted ? "bg-green-500"
    : progress >= 80 ? "bg-green-500"
    : progress >= 50 ? "bg-cyan-500"
    : "bg-zinc-600"

  const deadlineOverdue =
    isActive && goal.deadline && new Date(goal.deadline) < new Date()

  return (
    <div className={`relative rounded-xl border bg-zinc-900 overflow-hidden transition-all ${
      isAbandoned ? "border-zinc-800/50 opacity-50" :
      isCompleted ? "border-green-900/40 bg-green-950/10" :
      "border-zinc-800 hover:border-zinc-700"
    }`}>
      {/* Top accent bar */}
      {isActive && (
        <div className={`absolute top-0 left-0 right-0 h-px ${progressColor} opacity-60`} />
      )}
      {isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-px bg-green-500 opacity-40" />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Status icon */}
            <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
              isCompleted ? "bg-green-500/15 text-green-400" :
              isAbandoned ? "bg-zinc-800 text-zinc-600" :
              "bg-cyan-500/10 text-cyan-400"
            }`}>
              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> :
               isAbandoned ? <XCircle className="w-3.5 h-3.5" /> :
               <Target className="w-3.5 h-3.5" />}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 leading-snug">{goal.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{GOAL_TYPE_LABELS[goal.type]}</p>
              {(trackName || carName) && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {trackName && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 rounded px-1.5 py-0.5">
                      <Map className="w-2.5 h-2.5" />{trackName}
                    </span>
                  )}
                  {carName && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 rounded px-1.5 py-0.5">
                      <Car className="w-2.5 h-2.5" />{carName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {goal.deadline && isActive && (
              <div className={`flex items-center gap-1 text-xs ${deadlineOverdue ? "text-red-400" : "text-zinc-500"}`}>
                <Clock className="w-3 h-3" />
                {deadlineOverdue ? "Overdue" : new Date(goal.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </div>
            )}
            {isCompleted && goal.completedAt && (
              <Badge className="bg-green-950/60 text-green-400 border-0 text-[10px]">
                Done {new Date(goal.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </Badge>
            )}
            <GoalActions goalId={goal.id} status={status} />
          </div>
        </div>

        {/* Progress — active goals only */}
        {isActive && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span className="font-mono tabular-nums">{displayCurrent}</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span className="font-mono tabular-nums">{displayTarget}</span>
              </div>
            </div>

            {lowerIsBetter ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full" />
                <span className={`text-[10px] font-semibold ${goal.currentValue && goal.currentValue <= goal.targetValue ? "text-green-400" : "text-zinc-600"}`}>
                  {goal.currentValue && goal.currentValue <= goal.targetValue ? "Achieved" : "In progress"}
                </span>
              </div>
            ) : (
              <>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5 tabular-nums">{progress.toFixed(0)}% complete</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
