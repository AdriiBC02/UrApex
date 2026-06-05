export function formatLapTime(ms: number | null | undefined): string {
  if (ms == null) return "--:--.---"
  const totalMs  = Math.abs(ms)
  const minutes  = Math.floor(totalMs / 60000)
  const seconds  = Math.floor((totalMs % 60000) / 1000)
  const millis   = totalMs % 1000
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

export function formatDelta(ms: number): string {
  const sign = ms >= 0 ? "+" : "-"
  return sign + formatLapTime(Math.abs(ms))
}
