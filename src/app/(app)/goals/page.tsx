import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { EmptyState } from "@/components/shared/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Target, CheckCircle2, Clock, Plus } from "lucide-react"
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

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [active, completed, abandoned] = await Promise.all([
    db.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
    db.goal.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    db.goal.findMany({
      where: { userId, status: "ABANDONED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ])

  const hasGoals = active.length > 0 || completed.length > 0 || abandoned.length > 0

  return (
    <div className="space-y-6">
      {/* Page header — same width as rest of app */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Goals</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {hasGoals
              ? `${active.length} active · ${completed.length} completed${abandoned.length > 0 ? ` · ${abandoned.length} abandoned` : ""}`
              : "Set personal objectives and track your progress."}
          </p>
        </div>
        <Link href="/goals/new">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold gap-2">
            <Plus className="w-4 h-4" />
            New goal
          </Button>
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
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Active */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Active ({active.length})
              </h2>
              {active.length === 0 ? (
                <p className="text-sm text-zinc-600 italic">No active goals.</p>
              ) : (
                active.map((goal) => <GoalCard key={goal.id} goal={goal} />)
              )}
            </div>

            {/* Completed */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Completed ({completed.length})
              </h2>
              {completed.length === 0 ? (
                <p className="text-sm text-zinc-600 italic">No completed goals yet.</p>
              ) : (
                completed.map((goal) => <GoalCard key={goal.id} goal={goal} completed />)
              )}
            </div>
          </div>

          {abandoned.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Abandoned ({abandoned.length})
              </h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {abandoned.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} dimmed />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GoalCard({
  goal,
  completed = false,
  dimmed = false,
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
  completed?: boolean
  dimmed?: boolean
}) {
  const progress = Math.min(100, goal.targetValue > 0
    ? (goal.currentValue / goal.targetValue) * 100
    : 0)

  const displayTarget =
    goal.type === "BEST_LAP_TIME"
      ? formatLapTime(goal.targetValue)
      : goal.type === "HOURS_DRIVEN"
        ? `${goal.targetValue}h`
        : goal.targetValue.toLocaleString()

  const displayCurrent =
    goal.type === "BEST_LAP_TIME"
      ? formatLapTime(goal.currentValue || null)
      : goal.type === "HOURS_DRIVEN"
        ? `${goal.currentValue.toFixed(1)}h`
        : goal.currentValue.toLocaleString()

  const iconColor = completed ? "text-green-400" : dimmed ? "text-zinc-600" : "text-cyan-400"

  return (
    <Card className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors ${completed || dimmed ? "opacity-55" : ""}`}>
      <CardContent className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center ${iconColor}`}>
              {completed ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 leading-snug">{goal.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{GOAL_TYPE_LABELS[goal.type]}</p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1">
            {goal.deadline && !completed && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                {new Date(goal.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </div>
            )}
            {completed && goal.completedAt && (
              <Badge className="bg-green-950/60 text-green-400 border-0 text-[10px]">
                Done {new Date(goal.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </Badge>
            )}
            <GoalActions goalId={goal.id} status={goal.status} />
          </div>
        </div>

        {/* Progress */}
        {!completed && !dimmed && (
          <div className="pl-7">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span className="font-mono">{displayCurrent}</span>
              <span className="font-mono">→ {displayTarget}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: progress >= 80
                    ? "rgb(34 197 94)"
                    : progress >= 50
                      ? "rgb(6 182 212)"
                      : "rgb(100 116 139)",
                }}
              />
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">{progress.toFixed(0)}% complete</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
