import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import {
  Car, Timer, BarChart3, Calendar, ArrowLeft,
  TrendingDown, TrendingUp, Flag, Star, StarOff,
} from "lucide-react"

interface CarStat {
  carName:    string
  carClass:   string | null
  sessions:   number
  bestLapMs:  number | null
  lastDriven: string
  totalLaps:  number
}

interface PbPoint    { date: string; bestLapMs: number }
interface TrendPoint { date: string; value: number }
interface TypeCount  { sessionType: string; count: number }
interface TrackBest  { trackName: string; bestLapMs: number }
interface SessionRow { id: string; sessionDate: string; trackName: string; sessionType: string; totalLaps: number; bestLapMs: number | null; consistencyScore: number | null; isNewPb: boolean }

interface CarDetail {
  carName:           string
  carClass:          string | null
  totalSessions:     number
  totalLaps:         number
  bestLapMs:         number | null
  avgConsistency:    number | null
  trackBests:        TrackBest[]
  pbHistory:         PbPoint[]
  consistencyTrend:  TrendPoint[]
  sessionTypeCounts: TypeCount[]
  sessions:          SessionRow[]
}

const TYPE_COLOR: Record<string, string> = {
  RACE: "var(--orange)", QUALIFYING: "var(--cyan)", PRACTICE: "var(--text-muted)",
}
const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice", HOTLAP: "Hot Lap",
}

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

function CarDetailView({ carName, onBack }: { carName: string; onBack: () => void }) {
  const [detail, setDetail] = useState<CarDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<CarDetail | null>("get_car_detail", { carName })
      .then(d => { setDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [carName])

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  )
  if (!detail) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>No data</div>
  )

  const typeTotal  = detail.sessionTypeCounts.reduce((s, t) => s + t.count, 0) || 1
  const pbData     = detail.pbHistory.map((p, i) => ({ x: i, y: p.bestLapMs }))
  const trendData  = detail.consistencyTrend.map((p, i) => ({ x: i, y: p.value }))
  const bestCircuit  = detail.trackBests[0] ?? null
  const worstCircuit = detail.trackBests.length > 1 ? detail.trackBests[detail.trackBests.length - 1] : null

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Back + header */}
      <div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 11, padding: 0, marginBottom: 8 }}>
          <ArrowLeft size={12} /> Cars
        </button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{detail.carName}</p>
          {detail.carClass && <span style={{ fontSize: 11, color: "var(--text-dim)", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "1px 6px" }}>{detail.carClass}</span>}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{detail.totalSessions} sessions</span>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {[
          { label: "Best lap",    value: formatLapTime(detail.bestLapMs), accent: true },
          { label: "Total laps",  value: detail.totalLaps.toString() },
          { label: "Avg consist.", value: detail.avgConsistency != null ? detail.avgConsistency.toFixed(0) : "—" },
          { label: "Circuits",    value: detail.trackBests.length.toString() },
        ].map(({ label, value, accent }) => (
          <div key={label} className="stat-tile">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: 13, color: accent ? "var(--orange)" : "var(--text)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Best / worst circuit */}
      {bestCircuit && worstCircuit && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <Star size={10} style={{ color: "#22c55e" }} />
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#22c55e" }}>Best circuit</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: 12, margin: "0 0 2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bestCircuit.trackName}</p>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#22c55e" }}>{formatLapTime(bestCircuit.bestLapMs)}</span>
          </div>
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <StarOff size={10} style={{ color: "#ef4444" }} />
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#ef4444" }}>Weakest circuit</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: 12, margin: "0 0 2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{worstCircuit.trackName}</p>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ef4444" }}>{formatLapTime(worstCircuit.bestLapMs)}</span>
          </div>
        </div>
      )}

      {/* Best by circuit (full list) */}
      {detail.trackBests.length > 0 && (
        <div className="card" style={{ padding: "10px 12px" }}>
          <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 8px 0" }}>Best lap by circuit</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {detail.trackBests.map((tb, i) => (
              <div key={tb.trackName} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < detail.trackBests.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                {i === 0
                  ? <span style={{ fontSize: 11 }}>🏆</span>
                  : <span style={{ fontSize: 10, color: "var(--text-dim)", width: 16, textAlign: "center" }}>{i + 1}</span>}
                <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tb.trackName}</span>
                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>{formatLapTime(tb.bestLapMs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PB evolution */}
      {detail.pbHistory.length >= 2 && (
        <div className="card" style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <TrendingDown size={11} style={{ color: "var(--orange)" }} />
            <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>Best lap evolution</p>
          </div>
          <LineChart data={pbData} color="#f97316" height={70} />
        </div>
      )}

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

      {/* Session history */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 6 }}>
          <Flag size={11} style={{ color: "var(--text-dim)" }} />
          <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: 0 }}>All sessions ({detail.sessions.length})</p>
        </div>
        {detail.sessions.map((s, i) => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", fontSize: 11,
            borderBottom: i < detail.sessions.length - 1 ? "1px solid var(--border-soft)" : "none",
          }}>
            <span style={{ color: "var(--text-dim)", width: 64, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {new Date(s.sessionDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" })}
            </span>
            <span style={{ flex: 1, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.trackName}</span>
            <span style={{ color: TYPE_COLOR[s.sessionType] ?? "var(--text-muted)", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {TYPE_LABEL[s.sessionType] ?? s.sessionType}
            </span>
            {s.isNewPb && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--orange)", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 3, padding: "1px 4px" }}>PB</span>}
            <span style={{ fontFamily: "monospace", color: "var(--orange)", fontWeight: 700, flexShrink: 0 }}>{formatLapTime(s.bestLapMs)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CarsView() {
  const [cars, setCars] = useState<CarStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    invoke<CarStat[]>("get_cars")
      .then(c => { setCars(c); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (selected) {
    return <CarDetailView carName={selected} onBack={() => setSelected(null)} />
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  )

  if (cars.length === 0) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-dim)", padding: 32 }}>
      <Car size={36} strokeWidth={1.25} />
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>No cars yet</p>
      <p style={{ fontSize: 11, textAlign: "center" }}>Import sessions to see your garage.</p>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <p style={{ fontWeight: 800, fontSize: 15 }}>Cars</p>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{cars.length} in garage</span>
      </div>
      {cars.map(c => (
        <button
          key={c.carName}
          onClick={() => setSelected(c.carName)}
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", textAlign: "left", width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Car size={13} strokeWidth={2} style={{ color: "var(--orange)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{c.carName}</p>
              {c.carClass && <p style={{ fontSize: 10, color: "var(--text-dim)", margin: 0 }}>{c.carClass}</p>}
            </div>
            {c.bestLapMs && (
              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>{formatLapTime(c.bestLapMs)}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 10, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BarChart3 size={10} strokeWidth={2} />{c.sessions} sessions</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Timer size={10} strokeWidth={2} />{c.totalLaps} laps</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              <Calendar size={10} strokeWidth={2} />
              {new Date(c.lastDriven).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
