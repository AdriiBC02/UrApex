import { db } from "@/lib/db"
import { sha256 } from "@/lib/hash"
import { getStorageService, rawFileKey } from "./storage.service"
import { parseFile, extractDriverNames } from "@/server/parsers/registry"
import { findOrCreateTrack } from "@/server/normalizers/track.normalizer"
import { findOrCreateCar, findOrCreateCarClass } from "@/server/normalizers/car.normalizer"
import {
  bestLap, avgLap, medianLap, idealLap, stdDev,
  consistencyScore, safetyScore, cleanLapRatio, dropOff, paceScore,
  racecraftScore, qualifyingScore,
} from "./metrics.service"
import { updateGoalProgress } from "./goals.service"
import { evaluateAchievements } from "./achievements.service"
import { generateInsights } from "./insights.service"
import type { NormalizedSession } from "@/server/parsers/types"
import type { ImportStatus } from "@prisma/client"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  importFileId: string
  originalName: string
  status: ImportStatus
  isDuplicate: boolean
  existingSessionId?: string
  driverNames?: string[]
}

// ─── Step 1: Receive upload, dedup, save raw file ─────────────────────────────

export async function handleUpload(
  userId: string,
  file: File
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileHash = sha256(buffer)

  // Check for duplicate
  const existing = await db.importFile.findUnique({
    where: { fileHash },
    include: { session: { select: { id: true } } },
  })

  if (existing) {
    return {
      importFileId: existing.id,
      originalName: file.name,
      status: "DUPLICATE",
      isDuplicate: true,
      existingSessionId: existing.session?.id,
    }
  }

  // Save raw file
  const storage = getStorageService()
  const key = rawFileKey(userId, fileHash)
  const storagePath = await storage.save(buffer, key)

  // Detect simulator and extract driver names
  const content = buffer.toString("utf-8")
  const { detectParser, extractDriverNames } = await import("@/server/parsers/registry")
  const parser = detectParser(content)

  // Get simulator DB record if detected
  const simulator = parser
    ? await db.simulator.findUnique({ where: { slug: parser.simulatorSlug } })
    : null

  // Extract driver names for selection (only when simulator is detected)
  const driverNames = parser ? extractDriverNames(content, parser.simulatorSlug) : []

  // Create ImportFile record
  const importFile = await db.importFile.create({
    data: {
      userId,
      simulatorId: simulator?.id,
      originalName: file.name,
      storagePath,
      fileHash,
      fileSizeBytes: buffer.byteLength,
      mimeType: file.type || "text/xml",
      status: "PENDING",
    },
  })

  return {
    importFileId: importFile.id,
    originalName: file.name,
    status: "PENDING",
    isDuplicate: false,
    driverNames,
  }
}

// ─── Step 2: Process import (parse → normalize → save → metrics) ──────────────

export async function processImport(importFileId: string): Promise<void> {
  // Mark as parsing
  await db.importFile.update({
    where: { id: importFileId },
    data: { status: "PARSING" },
  })

  try {
    await runImport(importFileId)
    await db.importFile.update({
      where: { id: importFileId },
      data: { status: "IMPORTED", importedAt: new Date() },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const stack = err instanceof Error ? err.stack : undefined
    await db.importFile.update({
      where: { id: importFileId },
      data: {
        status: "FAILED",
        errorMessage: message,
        errorDetails: { stack },
      },
    })
    throw err
  }
}

async function runImport(importFileId: string): Promise<void> {
  const importFile = await db.importFile.findUniqueOrThrow({
    where: { id: importFileId },
    include: { simulator: true, user: { include: { profile: true } } },
  })

  // Read raw file
  const storage = getStorageService()
  const buffer = await storage.read(importFile.storagePath)
  const content = buffer.toString("utf-8")

  // Resolve driver name from user profile (used to identify the player in multiplayer files)
  const driverName = importFile.user.profile?.simDriverName ?? undefined

  // Parse
  const result = await parseFile(content, importFile.simulator?.slug, { driverName })
  if (!result.success) throw new Error(result.error)

  const parsed = result.session
  const userId = importFile.userId

  // Get or resolve simulator
  const simulator = await db.simulator.findUniqueOrThrow({
    where: { slug: parsed.simulatorSlug },
  })

  // Normalize track and car
  const [track, car] = await Promise.all([
    findOrCreateTrack(parsed.trackRawName, simulator.id),
    findOrCreateCar(parsed.carRawName, simulator.id),
  ])

  // Optional car class
  let carClassId: string | undefined
  if (parsed.carClassRawName) {
    const cc = await findOrCreateCarClass(parsed.carClassRawName, simulator.id)
    carClassId = cc.id
  }

  // Calculate metrics
  const metrics = calculateMetrics(parsed, importFile.userId)
  const isPB = await detectPersonalBest(userId, track.id, car.id, metrics.bestLapMs)

  // Save everything in a transaction
  await db.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        userId,
        importFileId,
        simulatorId: simulator.id,
        trackId: track.id,
        carId: car.id,
        carClassId,
        sessionType: parsed.sessionType,
        sessionName: parsed.sessionName,
        serverName: parsed.serverName,
        isOnline: parsed.isOnline,
        sessionDate: parsed.sessionDate,
        durationSec: parsed.durationSec,
        finalPosition: parsed.finalPosition,
        totalLaps: parsed.totalLaps,
        validLaps: parsed.laps.filter((l) => l.isValid).length,
        invalidLaps: parsed.laps.filter((l) => !l.isValid).length,
        dnf: parsed.dnf,
        dq: parsed.dq,
        weather:      parsed.weather,
        tempAmbient:  parsed.tempAmbient,
        tempTrack:    parsed.tempTrack,
        humidity:     parsed.humidity,
        trackLengthM: parsed.trackLengthM,
        ...metrics,
        isNewPB: isPB,
      },
    })

    if (parsed.laps.length > 0) {
      await tx.lap.createMany({
        data: parsed.laps.map((lap) => ({
          sessionId: session.id,
          lapNumber: lap.lapNumber,
          lapTimeMs: lap.lapTimeMs,
          isValid: lap.isValid,
          isSessionBest: metrics.bestLapMs !== null && lap.lapTimeMs === metrics.bestLapMs,
          isPersonalBest: isPB && metrics.bestLapMs !== null && lap.lapTimeMs === metrics.bestLapMs,
          sector1Ms: lap.sector1Ms,
          sector2Ms: lap.sector2Ms,
          sector3Ms: lap.sector3Ms,
          fuelLoad: lap.fuelLoad,
          tyreCompound: lap.tyreCompound,
        })),
      })
    }

    // Participants: create individually so we can get IDs for nested laps + pit stops
    const participantIdByName = new Map<string, string>()
    for (const p of parsed.participants) {
      const participant = await tx.sessionParticipant.create({
        data: {
          sessionId:     session.id,
          driverName:    p.driverName,
          teamName:      p.teamName,
          carName:       p.carRawName,
          carClass:      p.carClassRawName,
          position:      p.position,
          lapsCompleted: p.lapsCompleted,
          bestLapMs:     p.bestLapMs,
          totalTimeMs:   p.totalTimeMs !== undefined ? BigInt(Math.round(p.totalTimeMs)) : null,
          gapToLeaderMs: p.gapToLeaderMs !== undefined ? BigInt(Math.round(p.gapToLeaderMs)) : null,
          dnf:           p.dnf ?? false,
          dq:            p.dq ?? false,
          finishStatus:  p.finishStatus,
          pitStopsCount: p.pitStopsCount,
        },
      })
      participantIdByName.set(p.driverName, participant.id)

      if (p.laps && p.laps.length > 0) {
        await tx.participantLap.createMany({
          data: p.laps.map((lap) => ({
            participantId: participant.id,
            lapNumber:     lap.lapNumber,
            lapTimeMs:     lap.lapTimeMs,
            isValid:       lap.isValid,
            sector1Ms:     lap.sector1Ms,
            sector2Ms:     lap.sector2Ms,
            sector3Ms:     lap.sector3Ms,
            fuelLoad:      lap.fuelLoad,
            tyreCompound:  lap.tyreCompound,
          })),
        })
      }
    }

    if (parsed.incidents.length > 0) {
      await tx.incident.createMany({
        data: parsed.incidents.map((i) => ({
          sessionId: session.id,
          lapNumber: i.lapNumber,
          type: i.type,
          description: i.description,
          severity: i.severity,
        })),
      })
    }

    if (parsed.penalties.length > 0) {
      await tx.penalty.createMany({
        data: parsed.penalties.map((p) => ({
          sessionId: session.id,
          lapNumber: p.lapNumber,
          type: p.type,
          description: p.description,
          timeSec: p.timeSec,
        })),
      })
    }

    if (parsed.pitStops.length > 0) {
      await tx.pitStop.createMany({
        data: parsed.pitStops.map((p) => ({
          sessionId:     session.id,
          participantId: p.driverName ? (participantIdByName.get(p.driverName) ?? null) : null,
          driverName:    p.driverName,
          lapNumber:     p.lapNumber,
          durationMs:    p.durationMs,
          fuelAdded:     p.fuelAdded,
          tyreChange:    p.tyreChange ?? false,
          tyreCompound:  p.tyreCompound,
        })),
      })
    }
  })

  // Update parserVersion on ImportFile
  await db.importFile.update({
    where: { id: importFileId },
    data: { parserVersion: parsed.parserVersion },
  })

  // Update cached profile stats + goal progress (outside transaction — non-critical)
  const [savedSession] = await Promise.all([
    db.session.findFirst({
      where: { importFileId },
      include: { _count: { select: { incidents: true } } },
    }),
    updateProfileStats(userId),
  ])

  if (savedSession) {
    const [track] = await Promise.all([
      db.track.findUnique({ where: { id: savedSession.trackId }, select: { name: true } }),
      db.car.findUnique({ where: { id: savedSession.carId }, select: { name: true } }),
    ])

    await Promise.all([
      updateGoalProgress(userId, {
        trackId: savedSession.trackId,
        carId: savedSession.carId,
        bestLapMs: savedSession.bestLapMs,
        validLaps: savedSession.validLaps,
        consistencyScore: savedSession.consistencyScore,
        safetyScore: savedSession.safetyScore,
        durationSec: savedSession.durationSec,
        incidentCount: savedSession._count.incidents,
      }),
      evaluateAchievements({
        userId,
        sessionId:        savedSession.id,
        validLaps:        savedSession.validLaps,
        totalLaps:        savedSession.totalLaps,
        isNewPB:          savedSession.isNewPB,
        consistencyScore: savedSession.consistencyScore,
        safetyScore:      savedSession.safetyScore,
        incidentCount:    savedSession._count.incidents,
        sessionType:      savedSession.sessionType,
        finalPosition:    savedSession.finalPosition,
        dnf:              savedSession.dnf,
        isOnline:         savedSession.isOnline,
        trackId:          savedSession.trackId,
        durationSec:      savedSession.durationSec,
      }),
      generateInsights({
        sessionId:        savedSession.id,
        userId,
        trackId:          savedSession.trackId,
        trackName:        track?.name ?? "Unknown track",
        carName:          savedSession.carId,
        bestLapMs:        savedSession.bestLapMs,
        idealLapMs:       savedSession.idealLapMs,
        consistencyScore: savedSession.consistencyScore,
        safetyScore:      savedSession.safetyScore,
        paceScore:        savedSession.paceScore,
        totalLaps:        savedSession.totalLaps,
        validLaps:        savedSession.validLaps,
        isNewPB:          savedSession.isNewPB,
        dnf:              savedSession.dnf,
        dq:               savedSession.dq,
        dropOffMs:        savedSession.dropOffMs,
        incidentCount:    savedSession._count.incidents,
        penaltyCount:     0,
        sessionType:      savedSession.sessionType,
        durationSec:      savedSession.durationSec,
      }),
    ])
  }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function calculateMetrics(parsed: NormalizedSession, _userId: string) {
  const { laps, incidents, penalties, dnf, dq } = parsed
  const validLaps = laps.filter((l) => l.isValid)

  const best  = bestLap(laps)
  const ideal = idealLap(laps)

  const cScore = consistencyScore(laps)
  const sScore = safetyScore({
    incidents: incidents.length,
    penalties: penalties.length,
    dnf,
    dq,
    validLaps: validLaps.length,
    totalLaps: laps.length,
  })

  const participantCount = parsed.participants.length

  return {
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
      sessionType:    parsed.sessionType,
      finalPosition:  parsed.finalPosition,
      participantCount,
      safetyScore:    sScore,
      consistencyScore: cScore,
    }),
    qualifyingScore:  qualifyingScore({
      sessionType:    parsed.sessionType,
      finalPosition:  parsed.finalPosition,
      participantCount,
      consistencyScore: cScore,
    }),
    dropOffMs:  dropOff(laps),
  }
}

async function detectPersonalBest(
  userId: string,
  trackId: string,
  carId: string,
  currentBestMs: number | null
): Promise<boolean> {
  if (!currentBestMs) return false

  const previousBest = await db.session.findFirst({
    where: { userId, trackId, carId, bestLapMs: { not: null }, deletedAt: null },
    orderBy: { bestLapMs: "asc" },
    select: { bestLapMs: true },
  })

  // No previous session = first session at this track/car = PB by definition
  if (!previousBest?.bestLapMs) return true
  return currentBestMs < previousBest.bestLapMs
}

// ─── Profile stats cache ──────────────────────────────────────────────────────

async function updateProfileStats(userId: string): Promise<void> {
  const [sessionCount, lapCount, trackCount, carCount, totalDriveSec, recentSessions] =
    await Promise.all([
      db.session.count({ where: { userId, deletedAt: null } }),
      db.lap.count({ where: { session: { userId, deletedAt: null } } }),
      db.session.groupBy({ by: ["trackId"], where: { userId, deletedAt: null } }).then(r => r.length),
      db.session.groupBy({ by: ["carId"],   where: { userId, deletedAt: null } }).then(r => r.length),
      db.session.aggregate({
        where: { userId, deletedAt: null, durationSec: { not: null } },
        _sum: { durationSec: true },
      }).then(r => r._sum.durationSec ?? 0),
      // Last 20 sessions for rolling score averages
      db.session.findMany({
        where: { userId, deletedAt: null },
        orderBy: { sessionDate: "desc" },
        take: 20,
        select: {
          consistencyScore: true, safetyScore: true, paceScore: true,
          racecraftScore: true, qualifyingScore: true,
          trackId: true, carId: true, bestLapMs: true, sessionDate: true,
        },
      }),
    ])

  // ── Rolling score averages (last 20 sessions) ──────────────────────────────
  const avg = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x != null)
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null
  }

  const profileConsistency  = avg(recentSessions.map(s => s.consistencyScore))
  const profileSafety       = avg(recentSessions.map(s => s.safetyScore))
  const profilePace         = avg(recentSessions.map(s => s.paceScore))
  const profileRacecraft    = avg(recentSessions.filter(s => s.racecraftScore != null).map(s => s.racecraftScore))
  const profileQualifying   = avg(recentSessions.filter(s => s.qualifyingScore != null).map(s => s.qualifyingScore))

  // ── Improvement Score ──────────────────────────────────────────────────────
  // For each track+car combo, compare first-session best lap to current best.
  // improvement% per combo = (firstBest - currentBest) / firstBest * 100
  // Profile score = avg(improvement%) * 5, capped 0–100 (20% avg improvement → 100)
  const profileImprovementScore = await calculateImprovementScore(userId)

  await db.driverProfile.update({
    where: { userId },
    data: {
      totalSessions:    sessionCount,
      totalLaps:        lapCount,
      totalDriveTimeSec: totalDriveSec,
      uniqueTracks:     trackCount,
      uniqueCars:       carCount,
      consistencyScore: profileConsistency,
      safetyScore:      profileSafety,
      paceScore:        profilePace,
      racecraftScore:   profileRacecraft,
      qualifyingScore:  profileQualifying,
      improvementScore: profileImprovementScore,
    },
  })
}

async function calculateImprovementScore(userId: string): Promise<number | null> {
  // Fetch all track+car combos with 2+ sessions
  const combos = await db.session.groupBy({
    by: ["trackId", "carId"],
    where: { userId, deletedAt: null, bestLapMs: { not: null } },
    _count: { id: true },
    having: { id: { _count: { gte: 2 } } },
  })

  if (!combos.length) return null

  const improvements: number[] = []

  await Promise.all(combos.map(async ({ trackId, carId }) => {
    const [first, best] = await Promise.all([
      // Oldest session with a lap time at this track+car
      db.session.findFirst({
        where: { userId, trackId, carId, deletedAt: null, bestLapMs: { not: null } },
        orderBy: { sessionDate: "asc" },
        select: { bestLapMs: true },
      }),
      // Overall best at this combo
      db.session.findFirst({
        where: { userId, trackId, carId, deletedAt: null, bestLapMs: { not: null } },
        orderBy: { bestLapMs: "asc" },
        select: { bestLapMs: true },
      }),
    ])

    if (!first?.bestLapMs || !best?.bestLapMs) return
    const improvePct = ((first.bestLapMs - best.bestLapMs) / first.bestLapMs) * 100
    if (improvePct >= 0) improvements.push(improvePct)
  }))

  if (!improvements.length) return 0

  const avgImprove = improvements.reduce((a, b) => a + b, 0) / improvements.length
  // Scale: 20% average improvement across all combos → score 100
  return Math.round(Math.min(100, avgImprove * 5) * 10) / 10
}
