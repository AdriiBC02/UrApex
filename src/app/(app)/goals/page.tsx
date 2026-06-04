import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, CheckCircle2, Clock } from "lucide-react"
import type { GoalType, GoalStatus } from "@prisma/client"
import Link from "next/link"

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

  const [active, completed] = await Promise.all([
    db.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      }),
    db.goal.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Goals"
        description="Track your personal objectives and measure progress."
        icon={Target}
        action={
          <Link
            href="/goals/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-zinc-950 text-sm font-semibold transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
            New goal
          </Link>
        }
      />

      {active.length === 0 && completed.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a goal to track your progress — best lap times, consistency, clean races and more."
          action={{ label: "Create your first goal", href: "/goals/new" }}
        />
      ) : (
        <>
          {/* Active goals */}
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Active</h2>
              {active.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}

          {/* Completed goals */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Completed</h2>
              {completed.map((goal) => (
                <GoalCard key={goal.id} goal={goal} completed />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function GoalCard({ goal, completed = false }: {
  goal: {
    id: string
    name: string
    type: GoalType
    targetValue: number
    currentValue: number
    unit: string | null
    deadline: Date | null
    completedAt: Date | null
    status: GoalStatus
  }
  completed?: boolean
}) {
  const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100)

  const displayTarget = goal.type === "BEST_LAP_TIME"
    ? formatLapTime(goal.targetValue)
    : goal.type === "HOURS_DRIVEN"
      ? `${goal.targetValue}h`
      : goal.targetValue.toString()

  const displayCurrent = goal.type === "BEST_LAP_TIME"
    ? formatLapTime(goal.currentValue || null)
    : goal.type === "HOURS_DRIVEN"
      ? `${goal.currentValue.toFixed(1)}h`
      : goal.currentValue.toString()

  return (
    <Card className={`bg-zinc-900 border-zinc-800 ${completed ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              {completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <Target className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span className="text-sm font-medium text-zinc-200 truncate">{goal.name}</span>
            </div>
            <p className="text-xs text-zinc-500 ml-6">{GOAL_TYPE_LABELS[goal.type]}</p>
          </div>
          {goal.deadline && !completed && (
            <div className="flex items-center gap-1 text-xs text-zinc-500 shrink-0 ml-3">
              <Clock className="w-3 h-3" />
              {new Date(goal.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </div>
          )}
          {completed && goal.completedAt && (
            <Badge className="bg-green-950/50 text-green-400 border-0 text-[10px] shrink-0">
              {new Date(goal.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </Badge>
          )}
        </div>

        {!completed && (
          <>
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5 ml-6">
              <span>{displayCurrent}</span>
              <span>Target: {displayTarget}</span>
            </div>
            <div className="ml-6 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600 mt-1 ml-6">{progress.toFixed(0)}%</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
