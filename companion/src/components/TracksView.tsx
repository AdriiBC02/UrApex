import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import {
  Map, Timer, BarChart3, Calendar, Flag, ArrowLeft,
  TrendingDown, TrendingUp, Zap, Trophy,
} from "lucide-react"

interface TrackStat {
  trackName:  string
  sessions:   number
  bestLapMs:  number | null
  lastDriven: string
  totalLaps:  number
}

interface PbPoint       { date: string; bestLapMs: number }
interface TrendPoint    { date: string; value: number }
interface TypeCount     { sessionType: string; count: number }
interface SessionRow    { id: string; sessionDate: string; carName: string; sessionType: string; totalLaps: number; bestLapMs: number | null; consistencyScore: number | null; isNewPb: boolean }

interface TrackDetail {
  trackName:          string
  totalSessions:      number
  totalLaps:          number
  bestLapMs:          number | null
  avgConsistency:     number | null
  bestS1Ms:           number | null
  bestS2Ms:           number | null
  bestS3Ms:           number | null
  idealLapMs:         number | null
  pbHistory:          PbPoint[]
  consistencyTrend:   TrendPoint[]
  sessionTypeCounts:  TypeCount[]
  lapTimesMs:         number[]
  sessions:           SessionRow[]
}

const TYPE_COLOR: Record<string, string> = {
  RACE: "var(--orange)", QUALIFYING: "var(--cyan)", PRACTICE: "var(--text-muted)",
}
const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice", HOTLAP: "Hot Lap",
}

// ── Tiny SVG line chart ───────────────────────────────────────────────────────

function LineChart({ data, color = "#06b6d4", height = 70 }: { data: { x: number; y: number }[]; color?: string; height?: number }) {
  if (data.length < 2) return null
  const W = 300; const H = height
  const xs = data.map(d => d.x); const ys = data.map(d => d.y)
  const minX = Math.min(...xs); const maxX = Math.max(...xs) || minX + 1
  const minY = Math.min(...ys); const maxY = Math.max(...ys) || minY + 1
  const pad = 8
  const cx = (x: number) => pad + ((x - minX) / (maxX - minX)) * (W - pad * 2)
  const cy = (y: number) => pad + (1 - (y - minY) / (maxY - minY)) * (H - pad * 2)
  const pts = data.map(d => `${cx(d.x).toFixed(1)},${cy(d.y).toFixed(1)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color + "55"} strokeWidth={1.5} />
      {data.map((d, i) => (
        <circle key={i} cx={cx(d.x)} cy={cy(d.y)} r={2.5} fill={color + "cc"} />
      ))}
    </svg>
  )
}

// ── Scatter chart for lap distribution ───────────────────────────────────────

function ScatterChart({ times, height = 80 }: { times: number[]; height?: number }) {
  if (times.length < 5) return null
  const sorted = [...times].sort((a, b) => a - b)
  const p5  = sorted[Math.floor(sorted.length * 0.05)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const best   = sorted[0]
  const median = sorted[Math.floor(sorted.length / 2)]
  const W = 300; const H = height; const pad = 8
  const minY = p5 - 500; const maxY = p95 + 500; const rangeY = maxY - minY || 1
  const cy = (ms: number) => pad + (1 - Math.max(0, Math.min(1, (ms - minY) / rangeY))) * (H - pad * 2)
  const cx = (i: number) => pad + (i / (times.length - 1 || 1)) * (W - pad * 2)
  const refLine = (ms: number, color: string, label: string) => {
    const y = cy(ms)
    if (y < pad || y > H - pad) return null
    return (
      <g key={label}>
        <line x1={pad} x2={W - pad} y1={y} y2={y} stroke={color} strokeWidth={0.8} strokeDasharray="4 2" />
        <text x={W - pad - 2} y={y - 2} fontSize={7} fill={color} textAnchor="end">{label}</text>
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      {refLine(best,   "#06b6d4", "PB")}
      {refLine(median, "#52525b", "Med")}
      {times.map((ms, i) => (
        <circle key={i} cx={cx(i)} cy={cy(ms)} r={1.8} fill="#818cf8" fillOpacity={0.7} />
      ))}
    </svg>
  )
}

// ── Track detail view ─────────────────────────────────────────────────────────

function TrackDetailView({ trackName, onBack }: { trackName: string; onBack: () => void }) {
  const [detail, setDetail] = useState<TrackDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<TrackDetail | null>("get_track_detail", { trackName })
      .then(d => { setDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [trackName])

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  )
  if (!detail) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>No data</div>
  )

  const typeTotal = detail.sessionTypeCounts.reduce((s, t) => s + t.count, 0) || 1
  const pbData = detail.pbHistory.map((p, i) => ({ x: i, y: p.bestLapMs }))
  const trendData = detail.consistencyTrend.map((p, i) => ({ x: i, y: p.value }))

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Back + header */}
      <div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 11, padding: 0, marginBottom: 8 }}>
          <ArrowLeft size={12} /> Tracks
        </button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{detail.trackName}</p>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{detail.totalSessions} sessions</span>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {[
          { label: "Best lap",   value: formatLapTime(detail.bestLapMs), accent: true },
          { label: "Total laps", value: detail.totalLaps.toString() },
          { label: "Avg consist.", value: detail.avgConsistency != null ? detail.avgConsistency.toFixed(0) : "—" },
          { label: "Sessions",   value: detail.totalSessions.toString() },
        ].map(({ label, value, accent }) => (
          <div key={label} className="stat-tile">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: 13, color: accent ? "var(--cyan)" : "var(--text)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Best sectors + ideal lap */}
      {detail.idealLapMs != null && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Zap size={11} style={{ color: "#facc15" }} />
            <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>Best sectors</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["S1", detail.bestS1Ms], ["S2", detail.bestS2Ms], ["S3", detail.bestS3Ms]].map(([label, ms]) => (
              <div key={label as string} style={{ background: "var(--surface-2)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 3 }}>{label as string}</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--cyan)" }}>{formatLapTime(ms as number | null)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.18)", borderRadius: 6, padding: "5px 10px" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Ideal lap</span>
            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#facc15" }}>{formatLapTime(detail.idealLapMs)}</span>
          </div>
        </div>
      )}

      {/* PB evolution */}
      {detail.pbHistory.length >= 2 && (
        <div className="card" style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <TrendingDown size={11} style={{ color: "var(--cyan)" }} />
            <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>Best lap evolution</p>
          </div>
          <LineChart data={pbData} color="#06b6d4" height={70} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--text-dim)" }}>
            <span>{detail.pbHistory[0].date}</span>
            <span>{detail.pbHistory[detail.pbHistory.length - 1].date}</span>
          </div>
        </div>
      )}

      {/* Session type breakdown */}
      <div className="card" style={{ padding: "10px 12px" }}>
        <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 8px 0" }}>Session types</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {detail.sessionTypeCounts.sort((a, b) => b.count - a.count).map(({ sessionType, count }) => {
            const color = TYPE_COLOR[sessionType] ?? "var(--text-muted)"
            const pct = Math.round((count / typeTotal) * 100)
            return (
              <div key={sessionType} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color, width: 70, flexShrink: 0 }}>{TYPE_LABEL[sessionType] ?? sessionType}</span>
                <div style={{ flex: 1, height: 5, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 10, color: "var(--text-dim)", width: 20, textAlign: "right" }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Consistency trend */}
      {detail.consistencyTrend.length >= 3 && (
        <div className="card" style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <TrendingUp size={11} style={{ color: "#4ade80" }} />
            <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>Consistency trend</p>
          </div>
          <LineChart data={trendData} color="#4ade80" height={60} />
        </div>
      )}

      {/* Lap distribution */}
      {detail.lapTimesMs.length >= 5 && (
        <div className="card" style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <BarChart3 size={11} style={{ color: "#818cf8" }} />
            <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>Lap distribution · {detail.lapTimesMs.length} laps</p>
          </div>
          <ScatterChart times={detail.lapTimesMs} height={75} />
        </div>
      )}

      {/* Session history */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 6 }}>
          <Flag size={11} style={{ color: "var(--text-dim)" }} />
          <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>
            All sessions ({detail.sessions.length})
          </p>
        </div>
        {detail.sessions.map((s, i) => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
            borderBottom: i < detail.sessions.length - 1 ? "1px solid var(--border-soft)" : "none",
            fontSize: 11,
          }}>
            <span style={{ color: "var(--text-dim)", width: 64, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {new Date(s.sessionDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" })}
            </span>
            <span style={{ flex: 1, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.carName}</span>
            <span style={{ color: TYPE_COLOR[s.sessionType] ?? "var(--text-muted)", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {TYPE_LABEL[s.sessionType] ?? s.sessionType}
            </span>
            {s.isNewPb && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--cyan)", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 3, padding: "1px 4px" }}>PB</span>}
            <span style={{ fontFamily: "monospace", color: "var(--cyan)", fontWeight: 700, flexShrink: 0 }}>{formatLapTime(s.bestLapMs)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

export function TracksView() {
  const [tracks, setTracks] = useState<TrackStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    invoke<TrackStat[]>("get_tracks")
      .then(t => { setTracks(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (selected) {
    return <TrackDetailView trackName={selected} onBack={() => setSelected(null)} />
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  )

  if (tracks.length === 0) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-dim)", padding: 32 }}>
      <Map size={36} strokeWidth={1.25} />
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>No tracks yet</p>
      <p style={{ fontSize: 11, textAlign: "center" }}>Import sessions to see your track history.</p>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <p style={{ fontWeight: 800, fontSize: 15 }}>Tracks</p>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{tracks.length} circuits</span>
      </div>
      {tracks.map(t => (
        <button
          key={t.trackName}
          onClick={() => setSelected(t.trackName)}
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", textAlign: "left", width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Flag size={13} strokeWidth={2} style={{ color: "var(--cyan)", flexShrink: 0 }} />
            <p style={{ fontWeight: 700, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{t.trackName}</p>
            {t.bestLapMs && (
              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--cyan)" }}>{formatLapTime(t.bestLapMs)}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 10, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BarChart3 size={10} strokeWidth={2} />{t.sessions} sessions</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Timer size={10} strokeWidth={2} />{t.totalLaps} laps</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              <Calendar size={10} strokeWidth={2} />
              {new Date(t.lastDriven).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
