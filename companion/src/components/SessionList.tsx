import { useState } from "react"
import { Trash2, Clock, Flag, Search, RotateCcw } from "lucide-react"
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
  webSessionId:     string | null
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  RACE:       { label: "Race",     color: "#fb923c", bg: "rgba(251,146,60,0.09)"   },
  QUALIFYING: { label: "Quali",    color: "#06b6d4", bg: "rgba(6,182,212,0.09)"    },
  PRACTICE:   { label: "Practice", color: "#71717a", bg: "rgba(113,113,122,0.07)"  },
  HOTLAP:     { label: "Hot Lap",  color: "#a78bfa", bg: "rgba(167,139,250,0.09)"  },
}

function positionColor(p: number): string {
  if (p === 1) return "#fbbf24"
  if (p === 2) return "#d4d4d8"
  if (p === 3) return "#fb923c"
  return "#71717a"
}

function positionBg(p: number): string {
  if (p === 1) return "rgba(251,191,36,0.12)"
  if (p === 2) return "rgba(212,212,216,0.08)"
  if (p === 3) return "rgba(249,115,22,0.1)"
  return "rgba(255,255,255,0.04)"
}

function consistencyColor(v: number): string {
  if (v >= 85) return "#4ade80"
  if (v >= 70) return "#22d3ee"
  if (v >= 50) return "#f59e0b"
  return "#f87171"
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short" })
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
  { value: "ALL",    label: "All"    },
  { value: "ONLINE", label: "Online" },
  { value: "AI",     label: "AI"     },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sessions:   SessionSummary[]
  selectedId: string | null
  onSelect:   (id: string) => void
  onDelete:   (id: string) => void
  onRefresh?: () => void
  compact?:   boolean
}

// ── Main component ────────────────────────────────────────────────────────────

export function SessionList({ sessions, selectedId, onSelect, onDelete, onRefresh, compact = false }: Props) {
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>("ALL")
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>("ALL")
  const [search, setSearch]             = useState("")

  const hasRaces = sessions.some(s => s.sessionType === "RACE")

  const filtered = sessions.filter(s => {
    if (typeFilter !== "ALL" && s.sessionType !== typeFilter) return false
    if (onlineFilter !== "ALL" && s.sessionType === "RACE") {
      if (onlineFilter === "ONLINE" && !s.isOnline) return false
      if (onlineFilter === "AI"     &&  s.isOnline) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!s.trackName.toLowerCase().includes(q) && !s.carName.toLowerCase().includes(q)) return false
    }
    return true
  })

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 600,
    cursor: "pointer", border: "1px solid transparent", transition: "all 0.12s",
    background: active ? "rgba(6,182,212,0.12)" : "transparent",
    color:      active ? "var(--cyan)"           : "var(--text-dim)",
    borderColor: active ? "rgba(6,182,212,0.22)" : "transparent",
  })

  if (sessions.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-dim)", padding: 40, textAlign: "center" }}>
        <Flag size={36} strokeWidth={1} style={{ opacity: 0.2 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>No sessions yet</p>
          <p style={{ fontSize: 11, lineHeight: 1.6 }}>Import XML files or start the watcher<br />to see your sessions here.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

      {/* ── Filter bar ── */}
      <div style={{
        padding: compact ? "7px 10px 6px" : "10px 14px 8px",
        borderBottom: "1px solid var(--border-soft)",
        flexShrink: 0,
        display: "flex", flexDirection: "column", gap: 6,
        background: "var(--surface)",
      }}>

        {/* Search (full mode only) */}
        {!compact && (
          <div style={{ position: "relative" }}>
            <Search size={11} strokeWidth={2} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tracks or cars…"
              style={{ paddingLeft: 28, fontSize: 11, height: 30, borderRadius: 7 }}
            />
          </div>
        )}

        {/* Type chips + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {TYPE_CHIPS.map(c => (
            <button key={c.value} onClick={() => setTypeFilter(c.value)} style={chip(typeFilter === c.value)}>
              {c.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
              {filtered.length}<span style={{ color: "var(--border)" }}>/{sessions.length}</span>
            </span>
            {onRefresh && (
              <button onClick={onRefresh} style={{ color: "var(--text-dim)", opacity: 0.6, padding: "2px" }}>
                <RotateCcw size={11} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Online/AI chips (race mode, non-compact only) */}
        {!compact && hasRaces && (typeFilter === "ALL" || typeFilter === "RACE") && (
          <div style={{ display: "flex", gap: 2 }}>
            {ONLINE_CHIPS.map(c => (
              <button key={c.value} onClick={() => setOnlineFilter(c.value)} style={chip(onlineFilter === c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Session grid / list ── */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: compact ? "8px 8px" : "14px 14px",
        display: compact ? "flex" : "grid",
        flexDirection: compact ? "column" : undefined,
        gridTemplateColumns: compact ? undefined : "repeat(2, 1fr)",
        gap: compact ? 5 : 10,
        alignContent: "start",
      }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 11 }}>
            No sessions match the current filters.
          </div>
        )}

        {filtered.map(s => compact
          ? <CompactCard key={s.id} session={s} active={selectedId === s.id} onSelect={onSelect} onDelete={onDelete} />
          : <GridCard    key={s.id} session={s} active={selectedId === s.id} onSelect={onSelect} onDelete={onDelete} />
        )}
      </div>
    </div>
  )
}

// ── Compact card ──────────────────────────────────────────────────────────────

function CompactCard({ session: s, active, onSelect, onDelete }: {
  session: SessionSummary; active: boolean
  onSelect: (id: string) => void; onDelete: (id: string) => void
}) {
  const cfg = TYPE_CFG[s.sessionType] ?? TYPE_CFG.PRACTICE
  return (
    <div
      className="session-compact-card"
      onClick={() => onSelect(s.id)}
      style={{
        borderRadius: 8,
        border: `1px solid ${active ? "rgba(6,182,212,0.4)" : "var(--border-soft)"}`,
        background: active ? "rgba(6,182,212,0.05)" : "var(--surface-2)",
        borderLeft: `3px solid ${active ? "var(--cyan)" : cfg.color}`,
        cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
        padding: "8px 9px 7px",
      }}
    >
      {/* Row 1: type + badges + date + delete */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 4 }}>
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.05em", padding: "1px 5px", borderRadius: 3, color: cfg.color, background: cfg.bg, textTransform: "uppercase", flexShrink: 0 }}>
          {cfg.label}
        </span>
        {s.isNewPb && <span className="badge-pill" style={{ color: "#06b6d4", background: "rgba(6,182,212,0.1)", borderColor: "rgba(6,182,212,0.25)" }}>PB</span>}
        {s.dnf      && <span className="badge-pill" style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.2)" }}>DNF</span>}
        {s.finalPosition != null && !s.dnf && (
          <span className="badge-pill" style={{ color: positionColor(s.finalPosition), background: positionBg(s.finalPosition), borderColor: "transparent" }}>
            P{s.finalPosition}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-dim)", flexShrink: 0 }}>{fmtDate(s.sessionDate)}</span>
        <button onClick={e => { e.stopPropagation(); onDelete(s.id) }} style={{ color: "var(--text-dim)", opacity: 0.35, flexShrink: 0, padding: "1px", marginLeft: 1 }}>
          <Trash2 size={9} strokeWidth={2} />
        </button>
      </div>

      {/* Row 2: track + lap time */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 3 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: active ? "#fff" : "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, margin: 0 }}>
          {s.trackName}
        </p>
        {s.bestLapMs != null && (
          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: active ? "var(--cyan)" : "var(--text-dim)", flexShrink: 0, letterSpacing: "-0.01em" }}>
            {formatLapTime(s.bestLapMs)}
          </span>
        )}
      </div>

      {/* Row 3: car + consistency */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <p style={{ fontSize: 10, color: "var(--text-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
          {s.carName}
        </p>
        {s.consistencyScore != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            <div style={{ width: 30, height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, s.consistencyScore)}%`, background: consistencyColor(s.consistencyScore), borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: consistencyColor(s.consistencyScore), fontVariantNumeric: "tabular-nums" }}>
              {s.consistencyScore.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function GridCard({ session: s, active, onSelect, onDelete }: {
  session: SessionSummary; active: boolean
  onSelect: (id: string) => void; onDelete: (id: string) => void
}) {
  const cfg = TYPE_CFG[s.sessionType] ?? TYPE_CFG.PRACTICE

  const gradientBg = active
    ? "linear-gradient(105deg, rgba(6,182,212,0.07) 0%, #18181b 55%)"
    : `linear-gradient(105deg, ${cfg.bg} 0%, #18181b 55%)`

  return (
    <div
      className="session-grid-card"
      onClick={() => onSelect(s.id)}
      style={{
        borderRadius: 10,
        border: `1px solid ${active ? "rgba(6,182,212,0.45)" : "var(--border-soft)"}`,
        background: gradientBg,
        borderLeft: `3px solid ${active ? "var(--cyan)" : cfg.color}`,
        cursor: "pointer",
        transition: "all 0.15s",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 13px 11px" }}>

        {/* Row 1: type + badges + date + delete */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 9 }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", padding: "2px 7px", borderRadius: 4, color: cfg.color, background: cfg.bg, textTransform: "uppercase", flexShrink: 0 }}>
            {cfg.label}
          </span>

          {s.isNewPb && (
            <span className="badge-pill" style={{ color: "#06b6d4", background: "rgba(6,182,212,0.12)", borderColor: "rgba(6,182,212,0.3)", fontSize: 9 }}>PB</span>
          )}
          {s.dnf && (
            <span className="badge-pill" style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.2)", fontSize: 9 }}>DNF</span>
          )}
          {s.finalPosition != null && !s.dnf && (
            <span className="badge-pill" style={{ color: positionColor(s.finalPosition), background: positionBg(s.finalPosition), borderColor: "transparent", fontSize: 9 }}>
              P{s.finalPosition}
            </span>
          )}
          {s.sessionType === "RACE" && (
            s.isOnline
              ? <span className="badge-pill" style={{ color: "#60a5fa", background: "rgba(96,165,250,0.1)", borderColor: "rgba(96,165,250,0.2)", fontSize: 9 }}>MP</span>
              : <span className="badge-pill" style={{ color: "#52525b", background: "rgba(82,82,91,0.08)", borderColor: "rgba(82,82,91,0.15)", fontSize: 9 }}>AI</span>
          )}

          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>{fmtDate(s.sessionDate)}</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(s.id) }}
            style={{ color: "var(--text-dim)", opacity: 0.35, flexShrink: 0, padding: "2px", marginLeft: 2 }}
          >
            <Trash2 size={10} strokeWidth={2} />
          </button>
        </div>

        {/* Row 2: track name + best lap */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: active ? "#fff" : "var(--text)", lineHeight: 1.15, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
            {s.trackName}
          </p>
          {s.bestLapMs != null && (
            <span style={{
              fontFamily: "monospace", fontSize: 15, fontWeight: 800, lineHeight: 1,
              letterSpacing: "-0.02em", flexShrink: 0,
              color: s.isNewPb ? "var(--cyan)" : active ? "#a1a1aa" : "#71717a",
              textShadow: s.isNewPb ? "0 0 14px rgba(6,182,212,0.45)" : "none",
            }}>
              {formatLapTime(s.bestLapMs)}
            </span>
          )}
        </div>

        {/* Row 3: car name */}
        <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "0 0 9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {s.carName}
          {s.serverName && <span style={{ color: "var(--border)", marginLeft: 6 }}>· {s.serverName}</span>}
          {!s.syncedToServer && <span style={{ color: "var(--border)", marginLeft: 6, fontSize: 9 }}>local</span>}
        </p>

        {/* Row 4: laps + consistency bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-dim)", fontSize: 10, flexShrink: 0 }}>
            <Clock size={9} strokeWidth={2} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {s.validLaps}<span style={{ color: "var(--border)" }}>/{s.totalLaps} laps</span>
            </span>
          </div>
          {s.consistencyScore != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }}>
              <div style={{ flex: 1, height: 3, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${Math.min(100, s.consistencyScore)}%`,
                  background: consistencyColor(s.consistencyScore),
                }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: consistencyColor(s.consistencyScore), flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                {s.consistencyScore.toFixed(0)}%
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
