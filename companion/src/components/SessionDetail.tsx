import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import type { SessionSummary } from "./SessionList"

interface LapRow {
  lapNumber:    number
  lapTimeMs:    number | null
  isValid:      boolean
  sector1Ms:    number | null
  sector2Ms:    number | null
  sector3Ms:    number | null
  fuelLoad:     number | null
  tyreCompound: string | null
}

export interface SessionDetail extends SessionSummary {
  carClass:      string | null
  finalPosition: number | null
  durationSec:   number | null
  isOnline:      boolean
  avgLapMs:      number | null
  idealLapMs:    number | null
  weather:       string | null
  tempAmbient:   number | null
  tempTrack:     number | null
  humidity:      number | null
  trackLengthM:  number | null
  laps:          LapRow[]
}

interface Participant {
  id:             string
  sessionId:      string
  driverName:     string
  carName:        string | null
  carClass:       string | null
  position:       number | null
  lapsCompleted:  number
  bestLapMs:      number | null
  finishStatus:   string | null
  pitStopsCount:  number
  dnf:            boolean
}

interface ParticipantLap {
  lapNumber:    number
  lapTimeMs:    number | null
  isValid:      boolean
  sector1Ms:    number | null
  sector2Ms:    number | null
  sector3Ms:    number | null
  fuelLoad:     number | null
  tyreCompound: string | null
}

interface Note {
  id:        string
  sessionId: string
  content:   string
  tags:      string
  videoUrl:  string | null
  createdAt: string
}

interface Stint {
  compound:  string | null
  lapCount:  number
}

const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice",
}

// ── Stint computation ─────────────────────────────────────────────────────────

function computeStints(laps: ParticipantLap[]): Stint[] {
  if (!laps.length) return []
  const stints: Stint[] = []
  let cur = laps[0].tyreCompound ?? null
  let count = 0
  for (const lap of laps) {
    const c = lap.tyreCompound ?? null
    if (count > 0 && c !== cur) {
      stints.push({ compound: cur, lapCount: count })
      cur = c; count = 0
    }
    cur = c; count++
  }
  if (count > 0) stints.push({ compound: cur, lapCount: count })
  return stints
}

function compoundStyle(compound: string | null): React.CSSProperties {
  if (!compound) return { background: "var(--border-light)", color: "var(--text-muted)" }
  const c = compound.toUpperCase()
  if (c.includes("SOFT")   || c === "S") return { background: "rgba(239,68,68,0.15)",  color: "#f87171" }
  if (c.includes("MEDIUM") || c === "M") return { background: "rgba(234,179,8,0.15)",  color: "#facc15" }
  if (c.includes("HARD")   || c === "H") return { background: "rgba(113,113,122,0.2)", color: "#d4d4d8" }
  if (c.includes("INTER")  || c === "I") return { background: "rgba(34,197,94,0.15)",  color: "#4ade80" }
  if (c.includes("WET")    || c === "W") return { background: "rgba(59,130,246,0.15)", color: "#60a5fa" }
  return { background: "var(--border-light)", color: "var(--text-muted)" }
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  session:    SessionDetail
  allSessions: import("./SessionList").SessionSummary[]
  onBack:     () => void
  onCompare:  (secondId: string) => void
}

export function SessionDetailView({ session: s, allSessions, onBack, onCompare }: Props) {
  const [participants, setParticipants]         = useState<Participant[]>([])
  const [expandedDriver, setExpandedDriver]     = useState<string | null>(null)
  const [driverLaps, setDriverLaps]             = useState<Record<string, ParticipantLap[]>>({})
  const [notes, setNotes]                       = useState<Note[]>([])
  const [noteContent, setNoteContent]           = useState("")
  const [noteVideoUrl, setNoteVideoUrl]         = useState("")
  const [savingNote, setSavingNote]             = useState(false)
  const [activeTab, setActiveTab]               = useState<"laps" | "grid" | "notes">("laps")
  const [showComparePicker, setShowComparePicker] = useState(false)

  const best = s.bestLapMs

  useEffect(() => {
    invoke<Participant[]>("get_participants", { sessionId: s.id })
      .then(setParticipants).catch(console.error)
    invoke<Note[]>("get_notes", { sessionId: s.id })
      .then(setNotes).catch(console.error)
  }, [s.id])

  async function loadDriverLaps(participantId: string) {
    if (driverLaps[participantId]) return
    try {
      const laps = await invoke<ParticipantLap[]>("get_participant_laps", { participantId })
      setDriverLaps((prev) => ({ ...prev, [participantId]: laps }))
    } catch (e) { console.error(e) }
  }

  function toggleDriver(id: string) {
    if (expandedDriver === id) {
      setExpandedDriver(null)
    } else {
      setExpandedDriver(id)
      loadDriverLaps(id)
    }
  }

  async function saveNote() {
    if (!noteContent.trim()) return
    setSavingNote(true)
    try {
      await invoke("create_note", {
        sessionId: s.id,
        content:   noteContent.trim(),
        tags:      "[]",
        videoUrl:  noteVideoUrl.trim() || null,
      })
      const updated = await invoke<Note[]>("get_notes", { sessionId: s.id })
      setNotes(updated)
      setNoteContent("")
      setNoteVideoUrl("")
    } catch (e) { console.error(e) }
    finally { setSavingNote(false) }
  }

  async function deleteNote(id: string) {
    await invoke("delete_note", { id })
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  const hasConditions = s.weather || s.tempAmbient != null || s.tempTrack != null || s.trackLengthM != null
  const hasParticipants = participants.length > 0

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Back + Compare */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        <button onClick={onBack} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "var(--text-muted)", background: "none", flex: 1 }}>
          ← Back
        </button>
        <button
          onClick={() => setShowComparePicker((v) => !v)}
          style={{ padding: "5px 10px", fontSize: 10, color: showComparePicker ? "var(--cyan)" : "var(--text-muted)", background: "none", fontWeight: 600 }}
        >
          ⇄ Compare
        </button>
      </div>

      {/* Compare picker */}
      {showComparePicker && (
        <div style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)", maxHeight: 160, overflow: "auto" }}>
          <p style={{ fontSize: 10, color: "var(--text-dim)", padding: "4px 10px 2px", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Pick session B
          </p>
          {allSessions.filter((ss) => ss.id !== s.id).map((ss) => (
            <div
              key={ss.id}
              onClick={() => { onCompare(ss.id); setShowComparePicker(false) }}
              style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", margin: 0 }}>{ss.trackName}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>{ss.carName} · {new Date(ss.sessionDate).toLocaleDateString()}</p>
              </div>
              {ss.bestLapMs && <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>{formatLapTime(ss.bestLapMs)}</span>}
            </div>
          ))}
          {allSessions.filter((ss) => ss.id !== s.id).length === 0 && (
            <p style={{ fontSize: 11, color: "var(--text-dim)", padding: "8px 10px" }}>No other sessions.</p>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        {/* Header */}
        <div style={{ marginBottom: 12 }}>
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
            {s.finalPosition != null ? ` · P${s.finalPosition}` : ""}
            {s.isOnline ? " · Online" : ""}
          </p>
          {hasConditions && (
            <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "4px 0 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {s.weather && <span>{s.weather}</span>}
              {s.tempAmbient != null && <span>{s.tempAmbient.toFixed(0)}°C air</span>}
              {s.tempTrack   != null && <span>{s.tempTrack.toFixed(0)}°C track</span>}
              {s.humidity    != null && <span>{s.humidity.toFixed(0)}% humidity</span>}
              {s.trackLengthM != null && <span>{(s.trackLengthM / 1000).toFixed(3)} km</span>}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <StatCard label="Best lap"    value={formatLapTime(s.bestLapMs)} highlight />
          <StatCard label="Avg lap"     value={formatLapTime(s.avgLapMs ? Math.round(s.avgLapMs) : null)} />
          <StatCard label="Ideal lap"   value={formatLapTime(s.idealLapMs)} />
          <StatCard label="Consistency" value={s.consistencyScore != null ? `${s.consistencyScore.toFixed(1)}` : "—"} />
          <StatCard label="Valid laps"  value={`${s.validLaps}/${s.totalLaps}`} />
          {s.finalPosition != null ? <StatCard label="Position" value={`P${s.finalPosition}`} /> : null}
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 12, borderBottom: "1px solid var(--border)" }}>
          {(["laps", hasParticipants ? "grid" : null, "notes"] as const).filter(Boolean).map((t) => (
            <button
              key={t!}
              onClick={() => setActiveTab(t!)}
              style={{
                padding: "5px 10px", fontSize: 11, fontWeight: 600, background: "none", border: "none",
                color: activeTab === t ? "var(--cyan)" : "var(--text-muted)",
                borderBottom: activeTab === t ? "2px solid var(--cyan)" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {t === "laps" ? "Laps" : t === "grid" ? `Grid (${participants.length})` : `Notes${notes.length ? ` (${notes.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ── LAPS TAB ── */}
        {activeTab === "laps" && s.laps.length > 0 && (
          <div style={{ fontSize: 11, fontFamily: "monospace" }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px 76px 52px 48px 48px 48px 48px", gap: "2px 6px", color: "var(--text-dim)", marginBottom: 4, fontSize: 10 }}>
              <span>#</span><span>Time</span><span>Cmpd</span><span>S1</span><span>S2</span><span>S3</span><span>Fuel</span>
            </div>
            {s.laps.map((lap) => {
              const isB = lap.lapTimeMs === best
              return (
                <div
                  key={lap.lapNumber}
                  style={{
                    display: "grid", gridTemplateColumns: "28px 76px 52px 48px 48px 48px 48px",
                    gap: "2px 6px", padding: "2px 0",
                    opacity: lap.isValid ? 1 : 0.4,
                    color: isB ? "var(--cyan)" : "var(--text)",
                  }}
                >
                  <span style={{ color: "var(--text-dim)" }}>{lap.lapNumber}</span>
                  <span>{formatLapTime(lap.lapTimeMs)}</span>
                  <span style={{ fontSize: 9, ...compoundStyle(lap.tyreCompound), borderRadius: 3, padding: "0 3px", display: "inline-block", textAlign: "center" }}>
                    {lap.tyreCompound ?? "—"}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatLapTime(lap.sector1Ms)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatLapTime(lap.sector2Ms)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatLapTime(lap.sector3Ms)}</span>
                  <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
                    {lap.fuelLoad != null ? `${lap.fuelLoad.toFixed(1)}L` : "—"}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── RACE GRID TAB ── */}
        {activeTab === "grid" && (
          <div style={{ fontSize: 11 }}>
            {participants.map((p) => {
              const isExpanded  = expandedDriver === p.id
              const pLaps       = driverLaps[p.id] ?? []
              const stints      = computeStints(pLaps)

              return (
                <div key={p.id} style={{ marginBottom: 2 }}>
                  {/* Driver row */}
                  <div
                    onClick={() => toggleDriver(p.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 1fr 70px 50px 50px",
                      gap: "0 6px", padding: "5px 8px",
                      borderRadius: isExpanded ? "6px 6px 0 0" : 6,
                      background: isExpanded ? "rgba(6,182,212,0.06)" : "var(--border-light)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontFamily: "monospace", color: p.dnf ? "var(--red)" : "var(--text-muted)" }}>
                      {p.dnf ? "DNF" : p.position != null ? `P${p.position}` : "—"}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.driverName}
                    </span>
                    <span style={{ fontFamily: "monospace", color: "var(--cyan)" }}>
                      {formatLapTime(p.bestLapMs)}
                    </span>
                    <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
                      {p.lapsCompleted}L · {p.pitStopsCount}pit
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      {stints.map((st, i) => (
                        <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, ...compoundStyle(st.compound) }}>
                          {st.compound ?? "?"}{st.lapCount}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expanded laps */}
                  {isExpanded && (
                    <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 6px 6px", background: "var(--surface)", padding: "6px 8px" }}>
                      {pLaps.length === 0 ? (
                        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Loading…</span>
                      ) : (
                        <div style={{ fontFamily: "monospace", fontSize: 10 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "24px 70px 44px 44px 44px 44px", gap: "1px 6px", color: "var(--text-dim)", marginBottom: 3 }}>
                            <span>#</span><span>Time</span><span>S1</span><span>S2</span><span>S3</span><span>Cmpd</span>
                          </div>
                          {pLaps.map((lap) => (
                            <div
                              key={lap.lapNumber}
                              style={{
                                display: "grid", gridTemplateColumns: "24px 70px 44px 44px 44px 44px",
                                gap: "1px 6px", padding: "1.5px 0",
                                opacity: lap.isValid ? 1 : 0.4,
                              }}
                            >
                              <span style={{ color: "var(--text-dim)" }}>{lap.lapNumber}</span>
                              <span style={{ color: "var(--text)" }}>{formatLapTime(lap.lapTimeMs)}</span>
                              <span style={{ color: "var(--text-muted)" }}>{formatLapTime(lap.sector1Ms)}</span>
                              <span style={{ color: "var(--text-muted)" }}>{formatLapTime(lap.sector2Ms)}</span>
                              <span style={{ color: "var(--text-muted)" }}>{formatLapTime(lap.sector3Ms)}</span>
                              <span style={{ ...compoundStyle(lap.tyreCompound), padding: "0 3px", borderRadius: 2, fontSize: 9 }}>
                                {lap.tyreCompound ?? "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Add note */}
            <div style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a debrief note…"
                rows={3}
                style={{ width: "100%", resize: "vertical", fontSize: 11, background: "transparent", color: "var(--text)", border: "none", outline: "none", boxSizing: "border-box" }}
              />
              <input
                value={noteVideoUrl}
                onChange={(e) => setNoteVideoUrl(e.target.value)}
                placeholder="Video URL (optional)"
                style={{ width: "100%", fontSize: 10, marginTop: 4, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <button
                  onClick={saveNote}
                  disabled={savingNote || !noteContent.trim()}
                  style={{ padding: "5px 12px", borderRadius: 5, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 11, opacity: !noteContent.trim() ? 0.5 : 1 }}
                >
                  {savingNote ? "Saving…" : "Save note"}
                </button>
              </div>
            </div>

            {/* Note list */}
            {notes.map((n) => (
              <div key={n.id} style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <p style={{ fontSize: 11, color: "var(--text)", margin: 0, lineHeight: 1.5, flex: 1 }}>{n.content}</p>
                  <button onClick={() => deleteNote(n.id)} style={{ fontSize: 10, color: "var(--text-dim)", background: "none", flexShrink: 0 }}>✕</button>
                </div>
                {n.videoUrl && (
                  <a href={n.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: "var(--cyan)", display: "block", marginTop: 4 }}>
                    {n.videoUrl}
                  </a>
                )}
                <p style={{ fontSize: 9, color: "var(--text-dim)", margin: "4px 0 0" }}>
                  {new Date(n.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            {notes.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", paddingTop: 8 }}>No notes yet.</p>
            )}
          </div>
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
