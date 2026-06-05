import { db } from "@/lib/db"
import { getStorageService } from "./storage.service"
import { parseFile } from "@/server/parsers/registry"
import {
  bestLap, avgLap, medianLap, idealLap, stdDev,
  consistencyScore, safetyScore, cleanLapRatio, dropOff, paceScore,
  racecraftScore, qualifyingScore,
} from "./metrics.service"

export interface RecalculateResult {
  total: number
  updated: number
  skipped: number
  failed: number
}

export async function recalculateUserMetrics(userId: string): Promise<RecalculateResult> {
  const importFiles = await db.importFile.findMany({
    where:   { userId, status: "IMPORTED" },
    include: { session: true, simulator: true, user: { include: { profile: true } } },
  })

  let updated = 0, skipped = 0, failed = 0
  const storage = getStorageService()

  for (const imp of importFiles) {
    if (!imp.session) { skipped++; continue }

    try {
      const buffer  = await storage.read(imp.storagePath)
      const content = buffer.toString("utf-8")
      const driverName = imp.user.profile?.simDriverName ?? undefined

      const result = await parseFile(content, imp.simulator?.slug, { driverName })
      if (!result.success) { skipped++; continue }

      const parsed   = result.session
      const { laps, incidents, penalties, dnf, dq } = parsed
      const validLaps = laps.filter((l) => l.isValid)

      const best  = bestLap(laps)
      const ideal = idealLap(laps)
      const cScore = consistencyScore(laps)
      const sScore = safetyScore({
        incidents: incidents.length,
        penalties: penalties.length,
        dnf, dq,
        validLaps: validLaps.length,
        totalLaps: laps.length,
      })
      const participantCount = parsed.participants.length

      await db.session.update({
        where: { id: imp.session.id },
        data: {
          bestLapMs:        best,
          avgLapMs:         avgLap(laps),
          medianLapMs:      medianLap(laps),
          idealLapMs:       ideal,
          stdDevMs:         stdDev(laps),
          cleanLapRatio:    cleanLapRatio(laps),
          consistencyScore: cScore,
          safetyScore:      sScore,
          paceScore:        paceScore(best, ideal),
          racecraftScore:   racecraftScore({
            sessionType: parsed.sessionType,
            finalPosition: parsed.finalPosition,
            participantCount,
            safetyScore: sScore,
            consistencyScore: cScore,
          }),
          qualifyingScore: qualifyingScore({
            sessionType: parsed.sessionType,
            finalPosition: parsed.finalPosition,
            participantCount,
            consistencyScore: cScore,
          }),
          dropOffMs: dropOff(laps),
        },
      })

      updated++
    } catch {
      failed++
    }
  }

  return { total: importFiles.length, updated, skipped, failed }
}
