import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import type { SessionSummary } from "./SessionList"
import {
  ArrowLeft, GitCompare, Timer, TrendingUp, BarChart3,
  List, Users, FileText, Thermometer, Wind, Droplets,
  MapPin, Plus, Trash2, ExternalLink, type LucideIcon,
} from "lucide-react"

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
  id:            string
  sessionId:     string
  driverName:    string
  carName:       string | null
  carClass:      string | null
  position:      number | null
  lapsCompleted: number
  bestLapMs:     number | null
  finishStatus:  string | null
  pitStopsCount: number
  dnf:           boolean
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

interface Stint { compound: string | null; lapCount: number }

const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice",
}
const TYPE_COLOR: Record<string, string> = {
  RACE: "var(--orange)", QUALIFYING: "var(--cyan)", PRACTICE: "var(--text-muted)",
}

function computeStints(laps: ParticipantLap[]): Stint[] {
  if (!laps.length) return []
  const stints: Stint[] = []
  let cur = laps[0].tyreCompound ?? null, count = 0
  for (const lap of laps) {
    const c = lap.tyreCompound ?? null
    if (count > 0 && c !== cur) { stints.push({ compound: cur, lapCount: count }); cur = c; count = 0 }
    cur = c; count++
  }
  if (count > 0) stints.push({ compound: cur, lapCount: count })
  return stints
}

function compoundStyle(compound: string | null): React.CSSProperties {
  if (!compound) return { background: "var(--surface-3)", color: "var(--text-dim)" }
  const c = compound.toUpperCase()
  if (c.includes("SOFT")   || c === "S") return { background: "rgba(239,68,68,0.15)",  color: "#f87171" }
  if (c.includes("MEDIUM") || c === "M") return { background: "rgba(234,179,8,0.15)",  color: "#facc15" }
  if (c.includes("HARD")   || c === "H") return { background: "rgba(113,113,122,0.2)", color: "#d4d4d8" }
  if (c.includes("INTER")  || c === "I") return { background: "rgba(34,197,94,0.15)",  color: "#4ade80" }
  if (c.includes("WET")    || c === "W") return { background: "rgba(59,130,246,0.15)", color: "#60a5fa" }
  return { background: "var(--surface-3)", color: "var(--text-dim)" }
}

interface Props {
  session:     SessionDetail
  allSessions: SessionSummary[]
  onBack:      () => void
  onCompare:   (secondId: string) => void
}

export function SessionDetailView({ session: s, allSessions, onBack, onCompare }: Props) {
  const [participants, setParticipants]           = useState<Participant[]>([])
  const [expandedDriver, setExpandedDriver]       = useState<string | null>(null)
  const [driverLaps, setDriverLaps]               = useState<Record<string, ParticipantLap[]>>({})
  const [notes, setNotes]                         = useState<Note[]>([])
  const [noteContent, setNoteContent]             = useState("")
  const [noteVideoUrl, setNoteVideoUrl]           = useState("")
  const [savingNote, setSavingNote]               = useState(false)
  const [activeTab, setActiveTab]                 = useState<"laps" | "grid" | "notes">("laps")
  const [showComparePicker, setShowComparePicker] = useState(false)
  const [showReassign, setShowReassign]           = useState(false)
  const [reassigning, setReassigning]             = useState(false)
  const [compareDriver, setCompareDriver]         = useState<string | null>(null)

  const best = s.bestLapMs

  useEffect(() => {
    invoke<Participant[]>("get_participants", { sessionId: s.id }).then(setParticipants).catch(console.error)
    invoke<Note[]>("get_notes", { sessionId: s.id }).then(setNotes).catch(console.error)
  }, [s.id])

  async function loadDriverLaps(id: string) {
    if (driverLaps[id]) return
    try {
      const laps = await invoke<ParticipantLap[]>("get_participant_laps", { participantId: id })
      setDriverLaps((p) => ({ ...p, [id]: laps }))
    } catch { /* ignore */ }
  }

  function toggleDriver(id: string) {
    if (expandedDriver === id) { setExpandedDriver(null) }
    else { setExpandedDriver(id); loadDriverLaps(id) }
  }

  async function saveNote() {
    if (!noteContent.trim()) return
    setSavingNote(true)
    try {
      await invoke("create_note", { sessionId: s.id, content: noteContent.trim(), tags: "[]", videoUrl: noteVideoUrl.trim() || null })
      setNotes(await invoke<Note[]>("get_notes", { sessionId: s.id }))
      setNoteContent(""); setNoteVideoUrl("")
    } catch { /* ignore */ }
    finally { setSavingNote(false) }
  }

  async function deleteNote(id: string) {
    await invoke("delete_note", { id })
    setNotes((p) => p.filter((n) => n.id !== id))
  }

  const hasGrid = participants.length > 0
  const tabs    = ["laps", hasGrid ? "grid" : null, "notes"].filter(Boolean) as ("laps" | "grid" | "notes")[]
  const tabLabel = (t: string) =>
    t === "laps"  ? "Laps" :
    t === "grid"  ? `Grid (${participants.length})` :
    `Notes${notes.length ? ` (${notes.length})` : ""}`

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderBottom: "1px solid var(--border-soft)", flexShrink: 0 }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: "4px 8px", gap: 5, fontSize: 11 }}>
          <ArrowLeft size={12} strokeWidth={2.5} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowComparePicker((v) => !v)}
          className={`btn btn-ghost ${showComparePicker ? "active" : ""}`}
          style={{ padding: "4px 10px", gap: 5, fontSize: 11, color: showComparePicker ? "var(--cyan)" : undefined }}
        >
          <GitCompare size={12} strokeWidth={2} /> Compare
        </button>
        <button
          onClick={() => setShowReassign((v) => !v)}
          className={`btn btn-ghost ${showReassign ? "active" : ""}`}
          style={{ padding: "4px 10px", gap: 5, fontSize: 11, color: showReassign ? "var(--amber)" : undefined }}
        >
          <Users size={12} strokeWidth={2} /> Reassign
        </button>
      </div>

      {/* ── Compare picker ── */}
      {showComparePicker && (
        <div style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface)", maxHeight: 160, overflow: "auto", flexShrink: 0 }}>
          <p className="section-label" style={{ padding: "8px 12px 4px" }}>Compare with</p>
          {allSessions.filter((ss) => ss.id !== s.id).map((ss) => (
            <div
              key={ss.id}
              onClick={() => { onCompare(ss.id); setShowComparePicker(false) }}
              style={{ padding: "7px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{ss.trackName}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>{ss.carName} · {new Date(ss.sessionDate).toLocaleDateString()}</p>
              </div>
              {ss.bestLapMs && <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{formatLapTime(ss.bestLapMs)}</span>}
            </div>
          ))}
          {allSessions.filter((ss) => ss.id !== s.id).length === 0 && (
            <p style={{ fontSize: 11, color: "var(--text-dim)", padding: "10px 12px" }}>No other sessions to compare.</p>
          )}
        </div>
      )}

      {showReassign && participants.length > 0 && (
        <div style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface)", maxHeight: 160, overflow: "auto", flexShrink: 0 }}>
          <p className="section-label" style={{ padding: "8px 12px 4px" }}>Set player as…</p>
          {participants.map((p) => (
            <div
              key={p.id}
              onClick={async () => {
                if (reassigning) return
                setReassigning(true)
                try {
                  await invoke("reassign_player", { sessionId: s.id, driverName: p.driverName })
                  setShowReassign(false)
                  onBack()
                } catch { /* ignore */ }
                finally { setReassigning(false) }
              }}
              style={{ padding: "7px 12px", cursor: reassigning ? "wait" : "pointer", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.driverName}</span>
              {p.bestLapMs && <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{formatLapTime(p.bestLapMs)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {/* Hero header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--border-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: TYPE_COLOR[s.sessionType] ?? "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {TYPE_LABEL[s.sessionType] ?? s.sessionType}
            </span>
            {s.isNewPb && <span className="badge badge-cyan">PB</span>}
            {s.dnf     && <span className="badge" style={{ background: "rgba(248,113,113,0.12)", color: "var(--red)" }}>DNF</span>}
            {s.isOnline && <span className="badge badge-dim">Online</span>}
            <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-dim)" }}>
              {new Date(s.sessionDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: "0 0 3px", lineHeight: 1.2 }}>{s.trackName}</h2>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            {s.carName}{s.carClass ? ` · ${s.carClass}` : ""}{s.finalPosition != null ? ` · P${s.finalPosition}` : ""}
          </p>

          {/* Conditions */}
          {(s.weather || s.tempAmbient != null || s.tempTrack != null || s.trackLengthM != null) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 7, fontSize: 10, color: "var(--text-dim)" }}>
              {s.weather       && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Wind size={10} strokeWidth={2} />{s.weather}</span>}
              {s.tempAmbient   != null && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Thermometer size={10} strokeWidth={2} />{s.tempAmbient.toFixed(0)}°C air</span>}
              {s.tempTrack     != null && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Thermometer size={10} strokeWidth={2} style={{ color: "var(--orange)" }} />{s.tempTrack.toFixed(0)}°C track</span>}
              {s.humidity      != null && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Droplets size={10} strokeWidth={2} />{s.humidity.toFixed(0)}%</span>}
              {s.trackLengthM  != null && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} strokeWidth={2} />{(s.trackLengthM / 1000).toFixed(3)} km</span>}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px 14px" }}>
          <MiniStat icon={Timer}     label="Best lap"    value={formatLapTime(best)}                                      accent />
          <MiniStat icon={Timer}     label="Avg lap"     value={formatLapTime(s.avgLapMs ? Math.round(s.avgLapMs) : null)} />
          <MiniStat icon={Timer}     label="Ideal lap"   value={formatLapTime(s.idealLapMs)}                              />
          <MiniStat icon={TrendingUp} label="Consistency" value={s.consistencyScore != null ? `${s.consistencyScore.toFixed(1)}` : "—"} />
          <MiniStat icon={BarChart3} label="Valid laps"  value={`${s.validLaps}/${s.totalLaps}`}                          />
          {s.finalPosition != null
            ? <MiniStat icon={BarChart3} label="Position" value={`P${s.finalPosition}`} />
            : <div />}
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 4, padding: "4px 14px 10px", borderBottom: "1px solid var(--border-soft)" }}>
          {tabs.map((t) => {
            const icons = { laps: List, grid: Users, notes: FileText }
            const Icon = icons[t]
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 6,
                  fontSize: 11, fontWeight: 600,
                  background: activeTab === t ? "var(--surface-2)" : "transparent",
                  color: activeTab === t ? "var(--text)" : "var(--text-muted)",
                  border: activeTab === t ? "1px solid var(--border)" : "1px solid transparent",
                  transition: "all 0.1s",
                }}
              >
                <Icon size={12} strokeWidth={2} style={{ color: activeTab === t ? "var(--cyan)" : undefined }} />
                {tabLabel(t)}
              </button>
            )
          })}
        </div>

        {/* ── Laps tab ── */}
        {activeTab === "laps" && (
          <div style={{ padding: "10px 14px" }}>
            {s.laps.length === 0 ? (
              <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>No lap data.</p>
            ) : (
              <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "24px 74px 52px 46px 46px 46px 42px", gap: "2px 6px", padding: "4px 6px", borderRadius: 5, marginBottom: 3 }}>
                  {["#", "Time", "Cmpd", "S1", "S2", "S3", "Fuel"].map((h) => (
                    <span key={h} className="section-label" style={{ fontSize: 9 }}>{h}</span>
                  ))}
                </div>
                {/* Rows */}
                {s.laps.map((lap, i) => {
                  const isBest = lap.lapTimeMs === best && lap.lapTimeMs != null
                  return (
                    <div
                      key={lap.lapNumber}
                      style={{
                        display: "grid", gridTemplateColumns: "24px 74px 52px 46px 46px 46px 42px",
                        gap: "2px 6px", padding: "3px 6px",
                        borderRadius: 5,
                        background: isBest ? "rgba(6,182,212,0.06)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                        borderLeft: isBest ? "2px solid var(--cyan)" : "2px solid transparent",
                        opacity: lap.isValid ? 1 : 0.4,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{lap.lapNumber}</span>
                      <span style={{ color: isBest ? "var(--cyan)" : "var(--text)", fontWeight: isBest ? 700 : 400 }}>
                        {formatLapTime(lap.lapTimeMs)}
                      </span>
                      <span style={{ fontSize: 9, borderRadius: 3, padding: "1px 4px", textAlign: "center", ...compoundStyle(lap.tyreCompound) }}>
                        {lap.tyreCompound ?? "—"}
                      </span>
                      {[lap.sector1Ms, lap.sector2Ms, lap.sector3Ms].map((ms, si) => (
                        <span key={si} style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatLapTime(ms)}</span>
                      ))}
                      <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
                        {lap.fuelLoad != null ? `${lap.fuelLoad.toFixed(1)}L` : "—"}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Grid tab ── */}
        {activeTab === "grid" && (
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            {participants.map((p) => {
              const isEx  = expandedDriver === p.id
              const pLaps = driverLaps[p.id] ?? []
              const stints = computeStints(pLaps)

              return (
                <div key={p.id}>
                  <div
                    onClick={() => toggleDriver(p.id)}
                    style={{
                      display: "grid", gridTemplateColumns: "36px 1fr 70px 60px",
                      gap: "0 8px", padding: "7px 10px",
                      borderRadius: isEx ? "8px 8px 0 0" : 8,
                      background: isEx ? "rgba(6,182,212,0.06)" : "var(--surface-2)",
                      border: `1px solid ${isEx ? "rgba(6,182,212,0.2)" : "var(--border)"}`,
                      cursor: "pointer", alignItems: "center",
                      transition: "background 0.1s",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 12, fontFamily: "monospace", color: p.dnf ? "var(--red)" : "var(--text-muted)", textAlign: "center" }}>
                      {p.dnf ? "DNF" : p.position != null ? `P${p.position}` : "—"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCompareDriver(compareDriver === p.id ? null : p.id)
                          loadDriverLaps(p.id)
                        }}
                        style={{ fontSize: 9, fontWeight: 700, color: "var(--cyan)", padding: "2px 6px", borderRadius: 4, background: compareDriver === p.id ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.2)", marginRight: 4, flexShrink: 0 }}
                      >
                        VS
                      </button>
                      <span style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.driverName}
                      </span>
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--cyan)", fontWeight: 600 }}>
                      {formatLapTime(p.bestLapMs)}
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "flex-end" }}>
                      {stints.length > 0
                        ? stints.map((st, i) => (
                            <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, ...compoundStyle(st.compound) }}>
                              {st.compound ?? "?"}{st.lapCount}
                            </span>
                          ))
                        : <span style={{ fontSize: 9, color: "var(--text-dim)" }}>{p.lapsCompleted}L · {p.pitStopsCount}pit</span>
                      }
                    </div>
                  </div>

                  {isEx && (
                    <div style={{ border: "1px solid rgba(6,182,212,0.15)", borderTop: "none", borderRadius: "0 0 8px 8px", background: "var(--surface)", padding: "8px 10px" }}>
                      {pLaps.length === 0 ? (
                        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Loading…</span>
                      ) : compareDriver === p.id ? (
                        <div style={{ fontFamily: "monospace", fontSize: 10 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                            You vs {p.driverName}
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 52px", gap: "1px 6px", marginBottom: 4, paddingBottom: 3, borderBottom: "1px solid var(--border-soft)" }}>
                            <span style={{ color: "var(--text-dim)" }}>#</span>
                            <span style={{ color: "var(--cyan)", fontWeight: 700 }}>You</span>
                            <span style={{ color: "var(--orange)", fontWeight: 700 }}>{p.driverName.split(" ")[0]}</span>
                            <span style={{ color: "var(--text-dim)", textAlign: "center" }}>Δ</span>
                          </div>
                          {(() => {
                            const myLaps    = new Map(s.laps.map((l) => [l.lapNumber, l]))
                            const theirLaps = new Map(pLaps.map((l) => [l.lapNumber, l]))
                            const allNums   = Array.from(new Set([...myLaps.keys(), ...theirLaps.keys()])).sort((a, b) => a - b)
                            return allNums.map((num, i) => {
                              const me    = myLaps.get(num)
                              const them  = theirLaps.get(num)
                              const d     = me?.lapTimeMs != null && them?.lapTimeMs != null ? me.lapTimeMs - them.lapTimeMs : null
                              const dStr  = d == null ? "—" : d === 0 ? "=" : (d > 0 ? "+" : "") + (d / 1000).toFixed(3)
                              const dColor = d == null ? "var(--text-dim)" : d < 0 ? "var(--green)" : d > 0 ? "var(--red)" : "var(--text-muted)"
                              return (
                                <div key={num} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 52px", gap: "1px 6px", padding: "2px 0", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                                  <span style={{ color: "var(--text-dim)" }}>{num}</span>
                                  <span style={{ color: me ? "var(--text)" : "var(--text-dim)", opacity: me?.isValid === false ? 0.4 : 1 }}>{formatLapTime(me?.lapTimeMs ?? null)}</span>
                                  <span style={{ color: them ? "var(--text)" : "var(--text-dim)", opacity: them?.isValid === false ? 0.4 : 1 }}>{formatLapTime(them?.lapTimeMs ?? null)}</span>
                                  <span style={{ color: dColor, fontWeight: d != null && d !== 0 ? 700 : 400, textAlign: "center" }}>{dStr}</span>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      ) : (
                        <div style={{ fontFamily: "monospace", fontSize: 10 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "22px 68px 42px 42px 42px 48px", gap: "1px 6px", color: "var(--text-dim)", marginBottom: 4, paddingBottom: 3, borderBottom: "1px solid var(--border-soft)" }}>
                            {["#", "Time", "S1", "S2", "S3", "Cmpd"].map((h) => <span key={h}>{h}</span>)}
                          </div>
                          {pLaps.map((lap) => (
                            <div key={lap.lapNumber} style={{ display: "grid", gridTemplateColumns: "22px 68px 42px 42px 42px 48px", gap: "1px 6px", padding: "2px 0", opacity: lap.isValid ? 1 : 0.4 }}>
                              <span style={{ color: "var(--text-dim)" }}>{lap.lapNumber}</span>
                              <span style={{ color: "var(--text)" }}>{formatLapTime(lap.lapTimeMs)}</span>
                              <span style={{ color: "var(--text-muted)" }}>{formatLapTime(lap.sector1Ms)}</span>
                              <span style={{ color: "var(--text-muted)" }}>{formatLapTime(lap.sector2Ms)}</span>
                              <span style={{ color: "var(--text-muted)" }}>{formatLapTime(lap.sector3Ms)}</span>
                              <span style={{ fontSize: 9, ...compoundStyle(lap.tyreCompound), padding: "0 3px", borderRadius: 2 }}>
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

        {/* ── Notes tab ── */}
        {activeTab === "notes" && (
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Add note */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="card-header" style={{ marginBottom: 0, paddingBottom: 8 }}>
                <Plus size={12} strokeWidth={2.5} style={{ color: "var(--text-dim)" }} />
                <span style={{ fontWeight: 600, fontSize: 11 }}>Add debrief note</span>
              </div>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="What happened this session? Any observations…"
                rows={3}
                style={{ resize: "vertical" }}
              />
              <input
                value={noteVideoUrl}
                onChange={(e) => setNoteVideoUrl(e.target.value)}
                placeholder="Video URL (optional)"
                style={{ fontSize: 11 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={saveNote} disabled={savingNote || !noteContent.trim()} className="btn btn-primary" style={{ padding: "5px 14px" }}>
                  {savingNote ? "Saving…" : "Save note"}
                </button>
              </div>
            </div>

            {/* Notes list */}
            {notes.map((n) => (
              <div key={n.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <p style={{ fontSize: 12, color: "var(--text)", margin: 0, lineHeight: 1.55, flex: 1 }}>{n.content}</p>
                  <button onClick={() => deleteNote(n.id)} className="btn btn-ghost" style={{ padding: "3px 6px", flexShrink: 0 }}>
                    <Trash2 size={11} strokeWidth={2} />
                  </button>
                </div>
                {n.videoUrl && (
                  <a href={n.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "var(--cyan)", display: "flex", alignItems: "center", gap: 4 }}>
                    <ExternalLink size={10} strokeWidth={2} /> {n.videoUrl}
                  </a>
                )}
                <p style={{ fontSize: 9, color: "var(--text-dim)", margin: 0 }}>
                  {new Date(n.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}

            {notes.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", padding: "16px 0" }}>No notes yet for this session.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent?: boolean }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">
        <Icon size={10} strokeWidth={2} />
        {label}
      </div>
      <div className="stat-value" style={{ fontSize: 14, color: accent ? "var(--cyan)" : "var(--text)" }}>{value}</div>
    </div>
  )
}
