import { db } from "@/lib/db"
import { sha256 } from "@/lib/hash"
import { getStorageService, rawFileKey } from "./storage.service"
import { parseFile } from "@/server/parsers/registry"
import { findOrCreateTrack } from "@/server/normalizers/track.normalizer"
import { findOrCreateCar, findOrCreateCarClass } from "@/server/normalizers/car.normalizer"
import {
  bestLap, avgLap, medianLap, idealLap, stdDev,
  consistencyScore, safetyScore, cleanLapRatio, dropOff,
} from "./metrics.service"
import { updateGoalProgress } from "./goals.service"
import { evaluateAchievements } from "./achievements.service"
import type { NormalizedSession } from "@/server/parsers/types"
import type { ImportStatus } from "@prisma/client"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  importFileId: string
  originalName: string
  status: ImportStatus
  isDuplicate: boolean
  existingSessionId?: string
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

  // Detect simulator for display (non-blocking, best-effort)
  const content = buffer.toString("utf-8")
  const { detectParser } = await import("@/server/parsers/registry")
  const parser = detectParser(content)

  // Get simulator DB record if detected
  const simulator = parser
    ? await db.simulator.findUnique({ where: { slug: parser.simulatorSlug } })
    : null

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
    include: { simulator: true, user: true },
  })

  // Read raw file
  const storage = getStorageService()
  const buffer = await storage.read(importFile.storagePath)
  const content = buffer.toString("utf-8")

  // Parse
  const result = await parseFile(content, importFile.simulator?.slug)
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
        weather: parsed.weather,
        tempAmbient: parsed.tempAmbient,
        tempTrack: parsed.tempTrack,
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

    if (parsed.participants.length > 0) {
      await tx.sessionParticipant.createMany({
        data: parsed.participants.map((p) => ({
          sessionId: session.id,
          driverName: p.driverName,
          teamName: p.teamName,
          carName: p.carRawName,
          carClass: p.carClassRawName,
          position: p.position,
          lapsCompleted: p.lapsCompleted,
          bestLapMs: p.bestLapMs,
          totalTimeMs: p.totalTimeMs !== undefined ? BigInt(Math.round(p.totalTimeMs)) : null,
          gapToLeaderMs: p.gapToLeaderMs !== undefined ? BigInt(Math.round(p.gapToLeaderMs)) : null,
          dnf: p.dnf ?? false,
          dq: p.dq ?? false,
        })),
      })
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
          sessionId: session.id,
          lapNumber: p.lapNumber,
          durationMs: p.durationMs,
          fuelAdded: p.fuelAdded,
          tyreChange: p.tyreChange ?? false,
          tyreCompound: p.tyreCompound,
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
        sessionId: savedSession.id,
        validLaps: savedSession.validLaps,
        totalLaps: savedSession.totalLaps,
        isNewPB: savedSession.isNewPB,
        consistencyScore: savedSession.consistencyScore,
        safetyScore: savedSession.safetyScore,
        incidentCount: savedSession._count.incidents,
        sessionType: savedSession.sessionType,
      }),
    ])
  }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function calculateMetrics(parsed: NormalizedSession, _userId: string) {
  const { laps, incidents, penalties, dnf, dq } = parsed
  const validLaps = laps.filter((l) => l.isValid)

  return {
    bestLapMs: bestLap(laps),
    avgLapMs: avgLap(laps),
    medianLapMs: medianLap(laps),
    idealLapMs: idealLap(laps),
    stdDevMs: stdDev(laps),
    cleanLapRatio: cleanLapRatio(laps),
    consistencyScore: consistencyScore(laps),
    safetyScore: safetyScore({
      incidents: incidents.length,
      penalties: penalties.length,
      dnf,
      dq,
      validLaps: validLaps.length,
      totalLaps: laps.length,
    }),
    dropOffMs: dropOff(laps),
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
  const [sessionCount, lapAgg, trackCount, carCount] = await Promise.all([
    db.session.count({ where: { userId, deletedAt: null } }),
    db.lap.aggregate({
      where: { session: { userId, deletedAt: null } },
      _count: { id: true },
      _sum: {},
    }),
    db.session.groupBy({
      by: ["trackId"],
      where: { userId, deletedAt: null },
    }).then((r) => r.length),
    db.session.groupBy({
      by: ["carId"],
      where: { userId, deletedAt: null },
    }).then((r) => r.length),
  ])

  const totalDriveSec = await db.session.aggregate({
    where: { userId, deletedAt: null, durationSec: { not: null } },
    _sum: { durationSec: true },
  }).then((r) => r._sum.durationSec ?? 0)

  await db.driverProfile.update({
    where: { userId },
    data: {
      totalSessions: sessionCount,
      totalLaps: lapAgg._count.id,
      totalDriveTimeSec: totalDriveSec,
      uniqueTracks: trackCount,
      uniqueCars: carCount,
    },
  })
}
