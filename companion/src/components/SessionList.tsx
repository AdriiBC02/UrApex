import { useState } from "react"
import { Trash2, Clock, Flag, ChevronRight } from "lucide-react"
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

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { label: string; color: string; bg: string; accent: string }> = {
  RACE:       { label: "Race",     color: "#fb923c", bg: "rgba(251,146,60,0.10)",  accent: "#fb923c" },
  QUALIFYING: { label: "Quali",    color: "#06b6d4", bg: "rgba(6,182,212,0.10)",   accent: "#06b6d4" },
  PRACTICE:   { label: "Practice", color: "#71717a", bg: "rgba(113,113,122,0.10)", accent: "#52525b" },
  HOTLAP:     { label: "Hot Lap",  color: "#a78bfa", bg: "rgba(167,139,250,0.10)", accent: "#a78bfa" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function positionColor(p: number): string {
  if (p === 1) return "#fbbf24"
  if (p === 2) return "#d4d4d8"
  if (p === 3) return "#fb923c"
  return "#71717a"
}

function consistencyColor(v: number): string {
  if (v >= 85) return "#4ade80"
  if (v >= 70) return "#22d3ee"
  if (v >= 50) return "#f59e0b"
  return "#f87171"
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

// ── Filters ───────────────────────────────────────────────────────────────────

type TypeFilter   = "ALL" | "RACE" | "QUALIFYING" | "PRACTICE"
type OnlineFilter = "ALL" | "ONLINE" | "AI"

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "ALL",        label: "All"      },
  { value: "RACE",       label: "Race"     },
  { value: "QUALIFYING", label: "Quali"    },
  { value: "PRACTICE",   label: "Practice" },
]

const ONLINE_CHIPS: { value: OnlineFilter; label: string }[] = [
  { value: "ALL",    label: "All" },
  { value: "ONLINE", label: "🌐 Online" },
  { value: "AI",     label: "🤖 AI"    },
]

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  sessions:   SessionSummary[]
  selectedId: string | null
  onSelect:   (id: string) => void
  onDelete:   (id: string) => void
}

export function SessionList({ sessions, selectedId, onSelect, onDelete }: Props) {
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>("ALL")
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

  const chip = (active: boolean, accent?: string): React.CSSProperties => ({
    padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
    cursor: "pointer", border: "1px solid transparent", transition: "all 0.12s",
    background: active ? (accent ?? "rgba(6,182,212,0.12)") : "transparent",
    color: active ? (accent ? "#fff" : "var(--cyan)") : "var(--text-dim)",
    borderColor: active ? (accent ?? "rgba(6,182,212,0.25)") : "transparent",
  })

  if (sessions.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-dim)", padding: 32, textAlign: "center" }}>
        <Flag size={32} strokeWidth={1.25} style={{ opacity: 0.3 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>No sessions yet</p>
        <p style={{ fontSize: 11, margin: 0, lineHeight: 1.6 }}>Import XML files or start the watcher to see your sessions here.</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Filter bar ── */}
      <div style={{
        padding: "10px 12px 8px",
        borderBottom: "1px solid var(--border-soft)",
        flexShrink: 0,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {TYPE_CHIPS.map(c => (
            <button key={c.value} onClick={() => setTypeFilter(c.value)} style={chip(typeFilter === c.value)}>
              {c.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            {filtered.length}<span style={{ color: "var(--border)" }}>/{sessions.length}</span>
          </span>
        </div>

        {hasRaces && (typeFilter === "ALL" || typeFilter === "RACE") && (
          <div style={{ display: "flex", gap: 3 }}>
            {ONLINE_CHIPS.map(c => (
              <button key={c.value} onClick={() => setOnlineFilter(c.value)} style={chip(onlineFilter === c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Session list ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        {filtered.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 11 }}>
            No sessions match the current filters.
          </div>
        )}

        {filtered.map((s) => {
          const cfg    = TYPE_CFG[s.sessionType] ?? TYPE_CFG.PRACTICE
          const active = selectedId === s.id

          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                borderRadius: 8,
                border: `1px solid ${active ? "rgba(6,182,212,0.35)" : "var(--border-soft)"}`,
                background: active ? "rgba(6,182,212,0.05)" : "var(--surface-2)",
                borderLeft: `3px solid ${active ? "var(--cyan)" : cfg.accent}`,
                cursor: "pointer",
                overflow: "hidden",
                transition: "border-color 0.12s, background 0.12s",
                position: "relative",
              }}
            >
              {/* ── Inner padding ── */}
              <div style={{ padding: "9px 10px 9px 10px" }}>

                {/* Row 1: badges + date + delete */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                  {/* Type pill */}
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                    padding: "1px 7px", borderRadius: 4,
                    color: cfg.color, background: cfg.bg,
                    textTransform: "uppercase", flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>

                  {/* Status badges */}
                  {s.isNewPb && (
                    <span style={{ fontSize: 8, fontWeight: 800, color: "#06b6d4", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", padding: "0 5px", borderRadius: 4, flexShrink: 0 }}>
                      PB
                    </span>
                  )}
                  {s.dnf && (
                    <span style={{ fontSize: 8, fontWeight: 800, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", padding: "0 5px", borderRadius: 4, flexShrink: 0 }}>
                      DNF
                    </span>
                  )}
                  {s.finalPosition != null && !s.dnf && (
                    <span style={{ fontSize: 8, fontWeight: 800, color: positionColor(s.finalPosition), background: "rgba(255,255,255,0.05)", padding: "0 5px", borderRadius: 4, flexShrink: 0 }}>
                      P{s.finalPosition}
                    </span>
                  )}
                  {s.sessionType === "RACE" && (
                    s.isOnline
                      ? <span style={{ fontSize: 8, fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", padding: "0 4px", borderRadius: 3, flexShrink: 0 }}>MP</span>
                      : <span style={{ fontSize: 8, fontWeight: 700, color: "#71717a", background: "rgba(113,113,122,0.1)", border: "1px solid rgba(113,113,122,0.18)", padding: "0 4px", borderRadius: 3, flexShrink: 0 }}>AI</span>
                  )}

                  {/* Date pushed right */}
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-dim)", flexShrink: 0 }}>
                    {fmtDate(s.sessionDate)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
                    style={{ color: "var(--text-dim)", padding: "2px 2px", opacity: 0.5, flexShrink: 0, marginLeft: 2 }}
                    title="Delete session"
                  >
                    <Trash2 size={10} strokeWidth={2} />
                  </button>
                </div>

                {/* Row 2: track name */}
                <p style={{
                  fontSize: 13, fontWeight: 700, color: active ? "#fff" : "var(--text)",
                  margin: "0 0 4px", lineHeight: 1.2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {s.trackName}
                </p>

                {/* Row 3: car name */}
                <p style={{
                  fontSize: 10, color: "var(--text-dim)", margin: "0 0 6px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {s.carName}
                  {!s.syncedToServer && <span style={{ marginLeft: 6, color: "var(--border)", fontSize: 9 }}>local</span>}
                  {s.serverName && <span style={{ marginLeft: 6, color: "var(--text-dim)", fontSize: 9 }}>· {s.serverName}</span>}
                </p>

                {/* Row 4: stats */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Laps */}
                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text-dim)", fontSize: 10 }}>
                    <Clock size={9} strokeWidth={2} />
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{s.validLaps}<span style={{ color: "var(--border)" }}>/{s.totalLaps}</span></span>
                  </div>

                  {/* Consistency bar */}
                  {s.consistencyScore != null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                      <div style={{ flex: 1, height: 3, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, s.consistencyScore)}%`,
                          background: consistencyColor(s.consistencyScore),
                          borderRadius: 2,
                          transition: "width 0.3s",
                        }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: consistencyColor(s.consistencyScore), flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {s.consistencyScore.toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Best lap */}
                  {s.bestLapMs != null && (
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: active ? "var(--cyan)" : "var(--text-muted)", flexShrink: 0 }}>
                      {formatLapTime(s.bestLapMs)}
                    </span>
                  )}

                  {/* Arrow indicator */}
                  <ChevronRight size={10} strokeWidth={2.5} style={{ color: active ? "var(--cyan)" : "var(--border)", flexShrink: 0, marginLeft: "auto" }} />
                </div>

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
