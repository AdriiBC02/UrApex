import { db } from "@/lib/db"

interface ImportContext {
  userId: string
  sessionId: string
  validLaps: number
  totalLaps: number
  isNewPB: boolean
  consistencyScore: number | null
  safetyScore: number | null
  incidentCount: number
  sessionType: string
}

type ConditionType =
  | "import_count"
  | "lap_count"
  | "pb_count"
  | "consistency_score_above"
  | "clean_race"
  | "laps_in_session"
  | "sessions_in_month"
  | "all_sector_pbs"

interface AchievementCondition {
  type: ConditionType
  threshold: number
}

export async function evaluateAchievements(ctx: ImportContext): Promise<void> {
  const [achievements, userAchievements] = await Promise.all([
    db.achievement.findMany(),
    db.userAchievement.findMany({ where: { userId: ctx.userId } }),
  ])

  const achievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))

  // Pre-compute aggregates used by multiple conditions
  const [totalImports, totalLaps, totalPBs, sessionsThisMonth] = await Promise.all([
    db.importFile.count({ where: { userId: ctx.userId, status: "IMPORTED" } }),
    db.lap.count({ where: { session: { userId: ctx.userId, deletedAt: null } } }),
    db.session.count({ where: { userId: ctx.userId, isNewPB: true, deletedAt: null } }),
    db.session.count({
      where: {
        userId: ctx.userId,
        deletedAt: null,
        sessionDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ])

  const aggregates = { totalImports, totalLaps, totalPBs, sessionsThisMonth }

  await Promise.all(
    achievements.map((ach) =>
      processAchievement(ach, ctx, aggregates, achievementMap.get(ach.id))
    )
  )
}

async function processAchievement(
  ach: { id: string; condition: unknown; maxProgress: number },
  ctx: ImportContext,
  agg: { totalImports: number; totalLaps: number; totalPBs: number; sessionsThisMonth: number },
  existing: { unlockedAt: Date | null; progress: number } | undefined,
): Promise<void> {
  // Already fully unlocked — skip
  if (existing?.unlockedAt) return

  const condition = ach.condition as AchievementCondition
  const { type, threshold } = condition

  let progress = 0
  let unlocked = false

  switch (type) {
    case "import_count":
      progress = Math.min(agg.totalImports, threshold)
      unlocked = agg.totalImports >= threshold
      break

    case "lap_count":
      progress = Math.min(agg.totalLaps, threshold)
      unlocked = agg.totalLaps >= threshold
      break

    case "pb_count":
      progress = Math.min(agg.totalPBs, threshold)
      unlocked = agg.totalPBs >= threshold
      break

    case "consistency_score_above":
      if (ctx.consistencyScore !== null && ctx.consistencyScore >= threshold) {
        progress = threshold
        unlocked = true
      } else {
        progress = existing?.progress ?? 0
      }
      break

    case "clean_race": {
      const isRace = ctx.sessionType === "RACE"
      if (isRace && ctx.incidentCount === 0 && ctx.totalLaps > 0) {
        progress = 1
        unlocked = true
      } else {
        progress = existing?.progress ?? 0
      }
      break
    }

    case "laps_in_session":
      if (ctx.validLaps >= threshold) {
        progress = threshold
        unlocked = true
      } else {
        // Track the best single-session lap count ever
        progress = Math.max(existing?.progress ?? 0, ctx.validLaps)
      }
      break

    case "sessions_in_month":
      progress = Math.min(agg.sessionsThisMonth, threshold)
      unlocked = agg.sessionsThisMonth >= threshold
      break

    case "all_sector_pbs":
      // Requires sector PB detection — skip auto-evaluation for now
      return
  }

  // Nothing changed and not newly unlocked — skip DB write
  if (!unlocked && progress === (existing?.progress ?? 0)) return

  await db.userAchievement.upsert({
    where: {
      userId_achievementId: { userId: ctx.userId, achievementId: ach.id },
    },
    update: {
      progress,
      ...(unlocked && !existing?.unlockedAt ? { unlockedAt: new Date() } : {}),
    },
    create: {
      userId: ctx.userId,
      achievementId: ach.id,
      progress,
      unlockedAt: unlocked ? new Date() : null,
    },
  })
}
