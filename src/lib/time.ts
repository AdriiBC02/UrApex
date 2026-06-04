/**
 * Formats milliseconds as "M:SS.mmm" (e.g., 108321 → "1:48.321")
 * Returns "--:--.---" for null/undefined/0
 */
export function formatLapTime(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "--:--.---"

  const totalMs = Math.round(ms)
  const minutes = Math.floor(totalMs / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const milliseconds = totalMs % 1000

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`
}

/**
 * Formats milliseconds delta as "+0.321" or "-0.321"
 */
export function formatDelta(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—"
  const sign = ms >= 0 ? "+" : "-"
  const abs = Math.abs(ms)
  const seconds = (abs / 1000).toFixed(3)
  return `${sign}${seconds}`
}

/**
 * Formats seconds as "1h 23m" or "45m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Formats total seconds as "82h 30m" for large drive times
 */
export function formatDriveTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}
