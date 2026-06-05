import { formatLapTime, formatDelta } from "../lib/time"
import type { SessionSummary } from "./SessionList"

interface LapRow {
  lapNumber: number
  lapTimeMs: number | null
  isValid: boolean
  sector1Ms: number | null
  sector2Ms: number | null
  sector3Ms: number | null
}

export interface SessionDetail extends SessionSummary {
  carClass: string | null
  finalPosition: number | null
  durationSec: number | null
  isOnline: boolean
  avgLapMs: number | null
  idealLapMs: number | null
  laps: LapRow[]
}

const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice",
}

interface Props {
  session: SessionDetail
  onBack: () => void
}

export function SessionDetailView({ session: s, onBack }: Props) {
  const best = s.bestLapMs
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Back */}
      <button onClick={onBack} style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)", background: "none" }}>
        ← Back to sessions
      </button>

      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        {/* Header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              {TYPE_LABEL[s.sessionType] ?? s.sessionType}
            </span>
            {s.isNewPb && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--cyan)", background: "rgba(6,182,212,0.1)", padding: "1px 5px", borderRadius: 3 }}>New PB</span>}
            {s.dnf && <span style={{ fontSize: 9, color: "var(--red)", background: "rgba(239,68,68,0.1)", padding: "1px 5px", borderRadius: 3 }}>DNF</span>}
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 2px" }}>{s.trackName}</h2>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            {s.carName}{s.carClass ? ` · ${s.carClass}` : ""}
            {s.isOnline ? " · Online" : ""}
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <StatCard label="Best lap"   value={formatLapTime(s.bestLapMs)} highlight />
          <StatCard label="Avg lap"    value={formatLapTime(s.avgLapMs ? Math.round(s.avgLapMs) : null)} />
          <StatCard label="Ideal lap"  value={formatLapTime(s.idealLapMs)} />
          <StatCard label="Consistency" value={s.consistencyScore != null ? `${s.consistencyScore.toFixed(1)}` : "—"} />
          <StatCard label="Valid laps" value={`${s.validLaps}/${s.totalLaps}`} />
          {s.finalPosition != null && <StatCard label="Position" value={`P${s.finalPosition}`} />}
        </div>

        {/* Lap table */}
        {s.laps.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Laps</p>
            <div style={{ fontSize: 11, fontFamily: "monospace" }}>
              <div style={{ display: "grid", gridTemplateColumns: "32px 80px 1fr 1fr 1fr", gap: "2px 8px", color: "var(--text-dim)", marginBottom: 4 }}>
                <span>#</span><span>Time</span><span>S1</span><span>S2</span><span>S3</span>
              </div>
              {s.laps.map((lap) => {
                const delta = best && lap.lapTimeMs ? lap.lapTimeMs - best : null
                const isB   = lap.lapTimeMs === best
                return (
                  <div
                    key={lap.lapNumber}
                    style={{
                      display: "grid", gridTemplateColumns: "32px 80px 1fr 1fr 1fr",
                      gap: "2px 8px", padding: "2px 0",
                      opacity: lap.isValid ? 1 : 0.4,
                      color: isB ? "var(--cyan)" : "var(--text)",
                    }}
                  >
                    <span style={{ color: "var(--text-dim)" }}>{lap.lapNumber}</span>
                    <span>{formatLapTime(lap.lapTimeMs)}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatLapTime(lap.sector1Ms)}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatLapTime(lap.sector2Ms)}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatLapTime(lap.sector3Ms)}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: "var(--border-light)", borderRadius: 6, padding: "7px 8px", border: "1px solid var(--border)" }}>
      <p style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: highlight ? "var(--cyan)" : "var(--text)", margin: 0 }}>{value}</p>
    </div>
  )
}
