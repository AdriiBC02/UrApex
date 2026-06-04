import { db } from "@/lib/db"
import { formatLapTime, formatDelta } from "@/lib/time"

interface SessionSnapshot {
  sessionId: string
  userId: string
  trackId: string
  trackName: string
  carName: string
  bestLapMs: number | null
  idealLapMs: number | null
  consistencyScore: number | null
  safetyScore: number | null
  paceScore: number | null
  totalLaps: number
  validLaps: number
  isNewPB: boolean
  dnf: boolean
  dq: boolean
  dropOffMs: number | null
  incidentCount: number
  penaltyCount: number
  sessionType: string
  durationSec: number | null
}

interface Insight {
  type: string
  message: string
  severity: "info" | "positive" | "warning"
}

export async function generateInsights(snap: SessionSnapshot): Promise<void> {
  const insights: Insight[] = []

  // ── Rule 1: New PB ──────────────────────────────────────────────────────────
  if (snap.isNewPB && snap.bestLapMs) {
    // Find previous PB to calculate delta
    const prev = await db.session.findFirst({
      where: {
        userId: snap.userId,
        trackId: snap.trackId,
        deletedAt: null,
        bestLapMs: { not: null },
        id: { not: snap.sessionId },
      },
      orderBy: { bestLapMs: "asc" },
      select: { bestLapMs: true },
    })

    if (prev?.bestLapMs) {
      const delta = prev.bestLapMs - snap.bestLapMs
      insights.push({
        type: "new_pb",
        message: `New PB at ${snap.trackName}! ${formatDelta(delta)} faster than your previous best (${formatLapTime(prev.bestLapMs)}).`,
        severity: "positive",
      })
    } else {
      insights.push({
        type: "first_session_track",
        message: `First timed session at ${snap.trackName} with the ${snap.carName}. ${formatLapTime(snap.bestLapMs)} is your benchmark — now beat it.`,
        severity: "info",
      })
    }
  }

  // ── Rule 2: Consistency ─────────────────────────────────────────────────────
  if (snap.consistencyScore != null) {
    if (snap.consistencyScore >= 90) {
      // Check if it's a personal best consistency
      const prevBest = await db.session.aggregate({
        where: {
          userId: snap.userId, deletedAt: null, id: { not: snap.sessionId },
          consistencyScore: { not: null },
        },
        _max: { consistencyScore: true },
      })
      const prevMax = prevBest._max.consistencyScore

      if (prevMax == null || snap.consistencyScore > prevMax) {
        insights.push({
          type: "consistency_pb",
          message: `New personal best consistency score: ${snap.consistencyScore.toFixed(1)} — your most consistent session ever.`,
          severity: "positive",
        })
      } else {
        insights.push({
          type: "consistency_high",
          message: `Exceptional consistency this session (${snap.consistencyScore.toFixed(1)}). Keep replicating this.`,
          severity: "positive",
        })
      }
    } else if (snap.consistencyScore < 60 && snap.validLaps >= 5) {
      insights.push({
        type: "consistency_low",
        message: `Consistency was low this session (${snap.consistencyScore.toFixed(1)}). High variance in lap times suggests room for improvement.`,
        severity: "warning",
      })
    }
  }

  // ── Rule 3: Clean session ───────────────────────────────────────────────────
  if (snap.incidentCount === 0 && snap.penaltyCount === 0 && !snap.dnf && !snap.dq && snap.totalLaps >= 5) {
    insights.push({
      type: "clean_session",
      message: `Perfectly clean session — no incidents or penalties across ${snap.totalLaps} laps.`,
      severity: "positive",
    })
  }

  // ── Rule 4: Safety warning ──────────────────────────────────────────────────
  if (snap.incidentCount >= 3 && snap.totalLaps > 0) {
    const rate = (snap.incidentCount / snap.totalLaps).toFixed(2)
    insights.push({
      type: "safety_warning",
      message: `${snap.incidentCount} incidents in ${snap.totalLaps} laps (${rate}/lap). Focus on cleaner racecraft.`,
      severity: "warning",
    })
  }

  // ── Rule 5: DNF / DQ ───────────────────────────────────────────────────────
  if (snap.dq) {
    insights.push({ type: "dq", message: "Session ended with a disqualification.", severity: "warning" })
  } else if (snap.dnf) {
    insights.push({ type: "dnf", message: "Session ended with a DNF — work on finishing races consistently.", severity: "warning" })
  }

  // ── Rule 6: Drop-off ───────────────────────────────────────────────────────
  if (snap.dropOffMs !== null && snap.dropOffMs > 2000 && snap.validLaps >= 10) {
    insights.push({
      type: "dropoff_high",
      message: `Significant pace drop-off detected: last laps averaged ${(snap.dropOffMs / 1000).toFixed(2)}s slower than the opening. Consider tyre/fuel management.`,
      severity: "warning",
    })
  } else if (snap.dropOffMs !== null && snap.dropOffMs < -500 && snap.validLaps >= 10) {
    insights.push({
      type: "negative_dropoff",
      message: `Pace improved throughout the session — you found ${(Math.abs(snap.dropOffMs) / 1000).toFixed(2)}s over the stint.`,
      severity: "positive",
    })
  }

  // ── Rule 7: Pace vs ideal ──────────────────────────────────────────────────
  if (snap.bestLapMs && snap.idealLapMs) {
    const gapToIdeal = snap.bestLapMs - snap.idealLapMs
    if (gapToIdeal <= 100) {
      insights.push({
        type: "near_ideal",
        message: `Best lap within ${gapToIdeal}ms of the theoretical ideal — near-perfect execution.`,
        severity: "positive",
      })
    }
  }

  // ── Rule 8: Long stint ─────────────────────────────────────────────────────
  if (snap.validLaps >= 20) {
    insights.push({
      type: "long_stint",
      message: `Completed a ${snap.validLaps}-lap stint — solid endurance session.`,
      severity: "info",
    })
  }

  if (!insights.length) return

  await db.sessionInsight.createMany({
    data: insights.map(ins => ({
      sessionId: snap.sessionId,
      type: ins.type,
      message: ins.message,
      severity: ins.severity,
    })),
  })
}
