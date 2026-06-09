import { useState } from "react"
import { Trash2 } from "lucide-react"
import { formatLapTime } from "../lib/time"

export interface SessionSummary {
  id:               string
  trackName:        string
  carName:          string
  sessionType:      string
  sessionDate:      string
  totalLaps:        number
  validLaps:        number
  bestLapMs:        number | null
  consistencyScore: number | null
  isNewPb:          boolean
  dnf:              boolean
  syncedToServer:   boolean
  finalPosition:    number | null
  serverName:       string | null
  isOnline:         boolean
}

const TYPE: Record<string, { label: string; color: string }> = {
  RACE:       { label: "Race",     color: "var(--orange)" },
  QUALIFYING: { label: "Quali",    color: "var(--cyan)"   },
  PRACTICE:   { label: "Practice", color: "var(--text-muted)" },
}

// Badge for AI vs Online — only meaningful for RACE sessions
function OnlineBadge({ isOnline, sessionType }: { isOnline: boolean; sessionType: string }) {
  if (sessionType !== "RACE") return null
  return isOnline
    ? <span style={{ fontSize: 8, fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", padding: "0 5px", borderRadius: 4, letterSpacing: "0.04em" }}>MP</span>
    : <span style={{ fontSize: 8, fontWeight: 700, color: "#a1a1aa", background: "rgba(161,161,170,0.1)", border: "1px solid rgba(161,161,170,0.2)", padding: "0 5px", borderRadius: 4, letterSpacing: "0.04em" }}>AI</span>
}

interface Props {
  sessions:   SessionSummary[]
  selectedId: string | null
  onSelect:   (id: string) => void
  onDelete:   (id: string) => void
}

type TypeFilter   = "ALL" | "RACE" | "QUALIFYING" | "PRACTICE"
type OnlineFilter = "ALL" | "ONLINE" | "AI"

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "ALL",        label: "All"      },
  { value: "RACE",       label: "Race"     },
  { value: "QUALIFYING", label: "Quali"    },
  { value: "PRACTICE",   label: "Practice" },
]

const ONLINE_CHIPS: { value: OnlineFilter; label: string }[] = [
  { value: "ALL",    label: "All races" },
  { value: "ONLINE", label: "🌐 Online" },
  { value: "AI",     label: "🤖 AI"    },
]

export function SessionList({ sessions, selectedId, onSelect, onDelete }: Props) {
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>("ALL")
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>("ALL")

  const hasRaces = sessions.some(s => s.sessionType === "RACE")

  const filtered = sessions.filter(s => {
    if (typeFilter !== "ALL" && s.sessionType !== typeFilter) return false
    if (onlineFilter !== "ALL" && s.sessionType === "RACE") {
      if (onlineFilter === "ONLINE" && !s.isOnline) return false
      if (onlineFilter === "AI"     &&  s.isOnline) return false
    }
    return true
  })

  const chipStyle = (active: boolean, accent?: "blue" | "zinc"): React.CSSProperties => ({
    padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
    border: "none", letterSpacing: "0.02em",
    background: active
      ? accent === "blue" ? "rgba(96,165,250,0.15)" : accent === "zinc" ? "rgba(161,161,170,0.15)" : "rgba(6,182,212,0.12)"
      : "transparent",
    color: active
      ? accent === "blue" ? "#60a5fa" : accent === "zinc" ? "#a1a1aa" : "var(--cyan)"
      : "var(--text-dim)",
  })

  if (sessions.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-dim)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>No sessions yet</p>
        <p style={{ fontSize: 11 }}>Import XML files or start the watcher.</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Filter bar */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
        {/* Type chips */}
        <div style={{ display: "flex", gap: 2 }}>
          {TYPE_CHIPS.map(c => (
            <button key={c.value} onClick={() => setTypeFilter(c.value)} style={chipStyle(typeFilter === c.value)}>
              {c.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)", alignSelf: "center" }}>
            {filtered.length}/{sessions.length}
          </span>
        </div>
        {/* Online/AI chips — shown when races exist and type filter allows races */}
        {hasRaces && (typeFilter === "ALL" || typeFilter === "RACE") && (
          <div style={{ display: "flex", gap: 2 }}>
            {ONLINE_CHIPS.map(c => (
              <button
                key={c.value}
                onClick={() => setOnlineFilter(c.value)}
                style={chipStyle(onlineFilter === c.value, c.value === "ONLINE" ? "blue" : c.value === "AI" ? "zinc" : undefined)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflow: "auto" }}>
      {filtered.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-dim)", fontSize: 11 }}>
          No sessions match the current filters.
        </div>
      )}
      {filtered.map((s) => {
        const type    = TYPE[s.sessionType] ?? { label: s.sessionType, color: "var(--text-muted)" }
        const active  = selectedId === s.id

        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="session-row"
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              borderBottom: "1px solid var(--border-soft)",
              background: active ? "rgba(6,182,212,0.06)" : "transparent",
              borderLeft: active ? "2px solid var(--cyan)" : "2px solid transparent",
              transition: "background 0.1s",
              position: "relative",
            }}
          >
            {/* Top row: type + badges + delete */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: type.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {type.label}
              </span>
              {s.isNewPb && (
                <span style={{ fontSize: 8, fontWeight: 800, color: "var(--cyan)", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", padding: "0 5px", borderRadius: 4, letterSpacing: "0.04em" }}>
                  PB
                </span>
              )}
              {s.dnf && (
                <span style={{ fontSize: 8, fontWeight: 700, color: "var(--red)", background: "rgba(248,113,113,0.1)", padding: "0 5px", borderRadius: 4 }}>
                  DNF
                </span>
              )}
              <OnlineBadge isOnline={s.isOnline} sessionType={s.sessionType} />
              {s.finalPosition != null && !s.dnf && (
                <span style={{
                  fontSize: 8, fontWeight: 800,
                  color: s.finalPosition === 1 ? "#fbbf24"
                    : s.finalPosition === 2 ? "#d4d4d8"
                    : s.finalPosition === 3 ? "#fb923c"
                    : "var(--text-muted)",
                  padding: "0 5px", borderRadius: 4,
                  background: s.finalPosition === 1 ? "rgba(251,191,36,0.12)"
                    : s.finalPosition === 2 ? "rgba(212,212,216,0.1)"
                    : s.finalPosition === 3 ? "rgba(251,146,60,0.12)"
                    : "transparent",
                }}>
                  P{s.finalPosition}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
                style={{ marginLeft: "auto", color: "var(--text-dim)", padding: "2px 4px", opacity: 0.6 }}
                title="Delete"
              >
                <Trash2 size={11} strokeWidth={2} />
              </button>
            </div>

            {/* Track name */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.trackName}
            </p>

            {/* Car + laps + best */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--text-muted)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{s.carName}</span>
              <span style={{ flexShrink: 0, color: "var(--text-dim)" }}>{s.validLaps}/{s.totalLaps}L</span>
              {s.consistencyScore != null && (
                <span style={{
                  flexShrink: 0, fontSize: 9, fontWeight: 700,
                  color: s.consistencyScore >= 80 ? "var(--green)" : s.consistencyScore >= 60 ? "var(--amber)" : "var(--red)",
                }}>
                  {s.consistencyScore.toFixed(0)}%
                </span>
              )}
              {s.bestLapMs && (
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: active ? "var(--cyan)" : "var(--text-muted)", flexShrink: 0 }}>
                  {formatLapTime(s.bestLapMs)}
                </span>
              )}
            </div>

            {/* Date */}
            <p style={{ fontSize: 9, color: "var(--text-dim)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {new Date(s.sessionDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              {!s.syncedToServer && <span style={{ marginLeft: 5, color: "var(--text-dim)" }}>· local</span>}
              {s.serverName && <span style={{ marginLeft: 5 }}>· {s.serverName}</span>}
            </p>
          </div>
        )
      })}
      </div>
    </div>
  )
}
