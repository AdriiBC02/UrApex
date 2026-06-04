import type { ParsedLap } from "@/server/parsers/types"

// ─── Basic lap statistics ─────────────────────────────────────────────────────

export function bestLap(laps: ParsedLap[]): number | null {
  const valid = validTimes(laps)
  return valid.length ? Math.min(...valid) : null
}

export function avgLap(laps: ParsedLap[]): number | null {
  const valid = validTimes(laps)
  if (!valid.length) return null
  return valid.reduce((s, t) => s + t, 0) / valid.length
}

export function medianLap(laps: ParsedLap[]): number | null {
  const valid = [...validTimes(laps)].sort((a, b) => a - b)
  if (!valid.length) return null
  const mid = Math.floor(valid.length / 2)
  return valid.length % 2 === 0 ? (valid[mid - 1] + valid[mid]) / 2 : valid[mid]
}

export function idealLap(laps: ParsedLap[]): number | null {
  const valid = laps.filter((l) => l.isValid)
  const s1 = minOf(valid.map((l) => l.sector1Ms))
  const s2 = minOf(valid.map((l) => l.sector2Ms))
  const s3 = minOf(valid.map((l) => l.sector3Ms))
  if (s1 === null || s2 === null || s3 === null) return null
  return s1 + s2 + s3
}

export function stdDev(laps: ParsedLap[]): number | null {
  const avg = avgLap(laps)
  const valid = validTimes(laps)
  if (avg === null || valid.length < 2) return null
  const variance = valid.reduce((s, t) => s + (t - avg) ** 2, 0) / valid.length
  return Math.sqrt(variance)
}

// ─── Composite scores ─────────────────────────────────────────────────────────

/**
 * Consistency Score (0–100).
 * Based on coefficient of variation. Lower spread = higher score.
 * CV = stdDev / avg. Score = 100 * e^(-CV * 50).
 */
export function consistencyScore(laps: ParsedLap[]): number | null {
  const avg = avgLap(laps)
  const sd = stdDev(laps)
  if (avg === null || sd === null) return null
  const cv = sd / avg
  return round(Math.max(0, Math.min(100, 100 * Math.exp(-cv * 50))))
}

/**
 * Safety Score (0–100). 100 = perfectly clean session.
 */
export function safetyScore(params: {
  incidents: number
  penalties: number
  dnf: boolean
  dq: boolean
  validLaps: number
  totalLaps: number
}): number {
  if (params.dq) return 0
  let score = 100
  if (params.dnf) score -= 25
  const incidentRate = params.incidents / Math.max(params.totalLaps, 1)
  score -= incidentRate * 30
  score -= params.penalties * 5
  const invalidRatio = (params.totalLaps - params.validLaps) / Math.max(params.totalLaps, 1)
  score -= invalidRatio * 20
  return round(Math.max(0, Math.min(100, score)))
}

/**
 * Clean lap ratio (0.0 – 1.0).
 */
export function cleanLapRatio(laps: ParsedLap[]): number | null {
  if (!laps.length) return null
  const valid = laps.filter((l) => l.isValid).length
  return round(valid / laps.length, 4)
}

/**
 * Drop-off in ms: average pace of last third minus first third.
 * Positive = pace got worse (slower) = degradation.
 * Returns null if fewer than 6 valid laps.
 */
export function dropOff(laps: ParsedLap[]): number | null {
  const valid = laps.filter((l) => l.isValid && l.lapTimeMs !== null)
  if (valid.length < 6) return null
  const third = Math.floor(valid.length / 3)
  const firstAvg = mean(valid.slice(0, third).map((l) => l.lapTimeMs!))
  const lastAvg = mean(valid.slice(-third).map((l) => l.lapTimeMs!))
  if (firstAvg === null || lastAvg === null) return null
  return round(lastAvg - firstAvg)
}

/**
 * Pace Score (0–100).
 * Measures how well the driver extracts maximum pace from the car.
 * Compares best lap achieved to the theoretical ideal lap (sum of best sectors).
 * 100 = best lap equals ideal lap (perfect execution). Lower = gap to ideal.
 * Returns null when sector data is unavailable (ideal lap can't be calculated).
 */
export function paceScore(bestMs: number | null, idealMs: number | null): number | null {
  if (!bestMs || !idealMs || idealMs <= 0) return null
  // idealMs is always <= bestMs; ratio approaches 1 as driver extracts max pace
  return round(Math.max(0, Math.min(100, (idealMs / bestMs) * 100)))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validTimes(laps: ParsedLap[]): number[] {
  return laps.filter((l) => l.isValid && l.lapTimeMs !== null).map((l) => l.lapTimeMs!)
}

function minOf(values: (number | null)[]): number | null {
  const filtered = values.filter((v): v is number => v !== null)
  return filtered.length ? Math.min(...filtered) : null
}

function mean(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

function round(n: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}
