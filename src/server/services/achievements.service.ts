import { db } from "@/lib/db"

export interface ImportContext {
  userId:           string
  sessionId:        string
  validLaps:        number
  totalLaps:        number
  isNewPB:          boolean
  consistencyScore: number | null
  safetyScore:      number | null
  incidentCount:    number
  sessionType:      string
  finalPosition:    number | null
  dnf:              boolean
  isOnline:         boolean
  trackId:          string
  durationSec:      number | null
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
  | "session_count"
  | "hours_driven"
  | "consistency_sessions_count"
  | "race_position_lte"
  | "race_wins_count"
  | "races_no_dnf_count"
  | "unique_tracks_count"
  | "unique_cars_count"
  | "triple_threat"

interface AchievementCondition {
  type:      ConditionType
  threshold: number
  count?:    number   // used by consistency_sessions_count
}

export async function evaluateAchievements(ctx: ImportContext): Promise<void> {
  const [achievements, userAchievements] = await Promise.all([
    db.achievement.findMany(),
    db.userAchievement.findMany({ where: { userId: ctx.userId } }),
  ])

  const achievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))

  // ── Pre-compute all aggregates ─────────────────────────────────────────────
  const [
    totalImports,
    totalLaps,
    totalPBs,
    sessionsThisMonth,
    totalSessions,
    totalDriveSec,
    consistencyAbove85Count,
    raceWins,
    racesNoDnf,
    uniqueTracks,
    uniqueCars,
  ] = await Promise.all([
    db.importFile.count({ where: { userId: ctx.userId, status: "IMPORTED" } }),

    db.lap.count({ where: { session: { userId: ctx.userId, deletedAt: null }, isValid: true } }),

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

    db.session.count({ where: { userId: ctx.userId, deletedAt: null } }),

    db.session.aggregate({
      where: { userId: ctx.userId, deletedAt: null, durationSec: { not: null } },
      _sum: { durationSec: true },
    }).then((r) => r._sum.durationSec ?? 0),

    db.session.count({
      where: { userId: ctx.userId, deletedAt: null, consistencyScore: { gte: 85 } },
    }),

    db.session.count({
      where: { userId: ctx.userId, deletedAt: null, sessionType: "RACE", finalPosition: 1, isOnline: true },
    }),

    db.session.count({
      where: { userId: ctx.userId, deletedAt: null, sessionType: "RACE", dnf: false },
    }),

    db.session.groupBy({ by: ["trackId"], where: { userId: ctx.userId, deletedAt: null } })
      .then((r) => r.length),

    db.session.groupBy({ by: ["carId"], where: { userId: ctx.userId, deletedAt: null } })
      .then((r) => r.length),
  ])

  const totalHours = (totalDriveSec as number) / 3600

  // Triple threat: at this session's track, do all 3 session types exist?
  const tripleThreatMet = await db.session.groupBy({
    by:    ["sessionType"],
    where: { userId: ctx.userId, trackId: ctx.trackId, deletedAt: null, sessionType: { in: ["PRACTICE", "QUALIFYING", "RACE"] } },
  }).then((r) => r.length >= 3)

  const aggregates = {
    totalImports, totalLaps, totalPBs, sessionsThisMonth, totalSessions, totalHours,
    consistencyAbove85Count, raceWins, racesNoDnf, uniqueTracks, uniqueCars, tripleThreatMet,
  }

  await Promise.all(
    achievements.map((ach) =>
      processAchievement(ach, ctx, aggregates, achievementMap.get(ach.id))
    )
  )
}

async function processAchievement(
  ach: { id: string; condition: unknown; maxProgress: number },
  ctx: ImportContext,
  agg: {
    totalImports: number; totalLaps: number; totalPBs: number
    sessionsThisMonth: number; totalSessions: number; totalHours: number
    consistencyAbove85Count: number; raceWins: number; racesNoDnf: number
    uniqueTracks: number; uniqueCars: number; tripleThreatMet: boolean
  },
  existing: { unlockedAt: Date | null; progress: number } | undefined,
): Promise<void> {
  if (existing?.unlockedAt) return

  const condition = ach.condition as AchievementCondition
  const { type, threshold } = condition

  let progress = existing?.progress ?? 0
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
        progress = threshold; unlocked = true
      }
      break

    case "clean_race":
      if (ctx.sessionType === "RACE" && ctx.incidentCount === 0 && ctx.totalLaps > 0) {
        progress = 1; unlocked = true
      }
      break

    case "laps_in_session":
      if (ctx.validLaps >= threshold) { progress = threshold; unlocked = true }
      else progress = Math.max(progress, ctx.validLaps)
      break

    case "sessions_in_month":
      progress = Math.min(agg.sessionsThisMonth, threshold)
      unlocked = agg.sessionsThisMonth >= threshold
      break

    case "all_sector_pbs":
      // Complex: handled separately — keep as skip (no regression)
      return

    case "session_count":
      progress = Math.min(agg.totalSessions, threshold)
      unlocked = agg.totalSessions >= threshold
      break

    case "hours_driven":
      progress = Math.min(agg.totalHours, threshold)
      unlocked = agg.totalHours >= threshold
      break

    case "consistency_sessions_count": {
      const needed = condition.count ?? threshold
      progress = Math.min(agg.consistencyAbove85Count, needed)
      unlocked = agg.consistencyAbove85Count >= needed
      break
    }

    case "race_position_lte":
      if (ctx.sessionType === "RACE" && ctx.isOnline &&
          ctx.finalPosition !== null && ctx.finalPosition <= threshold) {
        progress = 1; unlocked = true
      }
      break

    case "race_wins_count":
      progress = Math.min(agg.raceWins, threshold)
      unlocked = agg.raceWins >= threshold
      break

    case "races_no_dnf_count":
      progress = Math.min(agg.racesNoDnf, threshold)
      unlocked = agg.racesNoDnf >= threshold
      break

    case "unique_tracks_count":
      progress = Math.min(agg.uniqueTracks, threshold)
      unlocked = agg.uniqueTracks >= threshold
      break

    case "unique_cars_count":
      progress = Math.min(agg.uniqueCars, threshold)
      unlocked = agg.uniqueCars >= threshold
      break

    case "triple_threat":
      if (agg.tripleThreatMet) { progress = 1; unlocked = true }
      break

    default:
      return
  }

  if (!unlocked && progress === (existing?.progress ?? 0)) return

  await db.userAchievement.upsert({
    where: { userId_achievementId: { userId: ctx.userId, achievementId: ach.id } },
    update: {
      progress,
      ...(unlocked && !existing?.unlockedAt ? { unlockedAt: new Date() } : {}),
    },
    create: {
      userId:        ctx.userId,
      achievementId: ach.id,
      progress,
      unlockedAt:    unlocked ? new Date() : null,
    },
  })
}
