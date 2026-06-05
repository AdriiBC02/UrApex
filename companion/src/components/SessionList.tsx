import { formatLapTime } from "../lib/time"

export interface SessionSummary {
  id: string
  trackName: string
  carName: string
  sessionType: string
  sessionDate: string
  totalLaps: number
  validLaps: number
  bestLapMs: number | null
  consistencyScore: number | null
  isNewPb: boolean
  dnf: boolean
  syncedToServer: boolean
}

const TYPE_COLOR: Record<string, string> = {
  RACE: "var(--orange)", QUALIFYING: "var(--cyan)", PRACTICE: "var(--text-muted)",
}

const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Quali", PRACTICE: "Practice",
}

interface Props {
  sessions: SessionSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function SessionList({ sessions, selectedId, onSelect, onDelete }: Props) {
  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-dim)" }}>
        <p style={{ fontSize: 13, marginBottom: 6 }}>No sessions yet</p>
        <p style={{ fontSize: 11 }}>Import XML files or start the file watcher to add sessions.</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {sessions.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
            background: selectedId === s.id ? "var(--border-light)" : "transparent",
            transition: "background 0.1s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLOR[s.sessionType] ?? "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {TYPE_LABEL[s.sessionType] ?? s.sessionType}
            </span>
            {s.isNewPb && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--cyan)", background: "rgba(6,182,212,0.1)", padding: "1px 5px", borderRadius: 3 }}>PB</span>}
            {!s.syncedToServer && <span style={{ fontSize: 9, color: "var(--text-dim)", marginLeft: "auto" }}>local</span>}
            {s.syncedToServer && <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}>synced</span>}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
              style={{ fontSize: 10, color: "var(--text-dim)", background: "none", padding: "0 4px", marginLeft: s.syncedToServer ? 0 : "auto" }}
              title="Delete session"
            >×</button>
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: 0, marginBottom: 2 }}>{s.trackName}</p>
          <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span>{s.carName}</span>
            <span>·</span>
            <span>{s.totalLaps} laps</span>
            {s.bestLapMs && <><span>·</span><span style={{ fontFamily: "monospace" }}>{formatLapTime(s.bestLapMs)}</span></>}
          </div>
          <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "3px 0 0" }}>
            {new Date(s.sessionDate).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}
