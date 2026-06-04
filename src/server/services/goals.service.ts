import { db } from "@/lib/db"
import type { GoalType } from "@prisma/client"

interface SessionSnapshot {
  trackId: string
  carId: string
  bestLapMs: number | null
  validLaps: number
  consistencyScore: number | null
  safetyScore: number | null
  durationSec: number | null
  incidentCount: number
}

const LOWER_IS_BETTER: GoalType[] = ["BEST_LAP_TIME", "REDUCE_INCIDENTS"]

export async function updateGoalProgress(
  userId: string,
  snapshot: SessionSnapshot
): Promise<void> {
  const goals = await db.goal.findMany({
    where: { userId, status: "ACTIVE" },
  })

  if (goals.length === 0) return

  await Promise.all(
    goals.map((goal) => processGoal(goal, snapshot))
  )
}

async function processGoal(
  goal: {
    id: string
    type: GoalType
    targetValue: number
    currentValue: number
    trackId: string | null
    carId: string | null
  },
  snapshot: SessionSnapshot
): Promise<void> {
  // Track/car scoping: if set on the goal, session must match
  if (goal.trackId && goal.trackId !== snapshot.trackId) return
  if (goal.carId && goal.carId !== snapshot.carId) return

  let newValue: number | null = null

  switch (goal.type) {
    case "BEST_LAP_TIME":
      if (snapshot.bestLapMs !== null) {
        newValue = goal.currentValue === 0
          ? snapshot.bestLapMs
          : Math.min(goal.currentValue, snapshot.bestLapMs)
      }
      break

    case "CONSISTENCY_SCORE":
      if (snapshot.consistencyScore !== null) {
        newValue = Math.max(goal.currentValue, snapshot.consistencyScore)
      }
      break

    case "IMPROVE_SAFETY":
      if (snapshot.safetyScore !== null) {
        newValue = Math.max(goal.currentValue, snapshot.safetyScore)
      }
      break

    case "CLEAN_LAP_COUNT":
      newValue = goal.currentValue + snapshot.validLaps
      break

    case "SESSION_COUNT":
      newValue = goal.currentValue + 1
      break

    case "HOURS_DRIVEN":
      if (snapshot.durationSec !== null) {
        newValue = goal.currentValue + snapshot.durationSec / 3600
      }
      break

    case "REDUCE_INCIDENTS":
      // Running average: incidents per session
      // currentValue = running average; we approximate with a 10-session window
      newValue = goal.currentValue === 0
        ? snapshot.incidentCount
        : parseFloat(((goal.currentValue * 9 + snapshot.incidentCount) / 10).toFixed(2))
      break

    case "COMPLETE_STINTS":
      // A stint = session with >= 20 valid laps
      if (snapshot.validLaps >= 20) {
        newValue = goal.currentValue + 1
      }
      break

    case "CUSTOM":
      // Custom goals are not auto-updated
      return
  }

  if (newValue === null) return

  const lowerIsBetter = LOWER_IS_BETTER.includes(goal.type)
  const achieved = lowerIsBetter
    ? newValue <= goal.targetValue
    : newValue >= goal.targetValue

  await db.goal.update({
    where: { id: goal.id },
    data: {
      currentValue: newValue,
      ...(achieved && {
        status: "COMPLETED",
        completedAt: new Date(),
      }),
    },
  })
}
