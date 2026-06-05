import { ArrowLeft } from "lucide-react"
import { formatLapTime } from "../lib/time"
import type { SessionDetail } from "./SessionDetail"

interface Props {
  sessionA: SessionDetail
  sessionB: SessionDetail
  onBack:   () => void
}

const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice",
}

function delta(a: number | null, b: number | null): string {
  if (a == null || b == null) return "—"
  const d = a - b
  if (d === 0) return "="
  return (d > 0 ? "+" : "") + (d / 1000).toFixed(3)
}

function deltaColor(a: number | null, b: number | null, lowerIsBetter = true): string {
  if (a == null || b == null) return "var(--text-dim)"
  const d = a - b
  if (d === 0) return "var(--text-muted)"
  return (lowerIsBetter ? d < 0 : d > 0) ? "var(--green)" : "var(--red)"
}

function scoreDelta(a: number | null, b: number | null): string {
  if (a == null || b == null) return "—"
  const d = a - b
  if (Math.abs(d) < 0.05) return "="
  return (d > 0 ? "+" : "") + d.toFixed(1)
}

export function CompareView({ sessionA: a, sessionB: b, onBack }: Props) {
  const lapsA = new Map(a.laps.map((l) => [l.lapNumber, l]))
  const lapsB = new Map(b.laps.map((l) => [l.lapNumber, l]))
  const allLapNums = Array.from(new Set([...lapsA.keys(), ...lapsB.keys()])).sort((x, y) => x - y)

  const hasSectors = a.laps.some((l) => l.sector1Ms) || b.laps.some((l) => l.sector1Ms)

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Toolbar */}
      <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border-soft)", flexShrink: 0 }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: "4px 8px", gap: 5, fontSize: 11 }}>
          <ArrowLeft size={12} strokeWidth={2.5} /> Back to session
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "14px" }}>

        {/* Session headers A / B */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {([a, b] as const).map((s, i) => {
            const color = i === 0 ? "var(--cyan)" : "var(--orange)"
            return (
              <div key={i} style={{ background: "var(--surface-2)", border: `1px solid ${color}30`, borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
                <p style={{ fontSize: 9, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>
                  Session {i === 0 ? "A" : "B"} · {TYPE_LABEL[s.sessionType] ?? s.sessionType}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.trackName}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.carName}
                </p>
                <p style={{ fontSize: 9, color: "var(--text-dim)", margin: 0 }}>
                  {new Date(s.sessionDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            )
          })}
        </div>

        {/* Metrics */}
        <p className="section-label" style={{ marginBottom: 6 }}>Metrics</p>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <th style={TH}>Metric</th>
                <th style={{ ...TH, color: "var(--cyan)" }}>A</th>
                <th style={{ ...TH, color: "var(--orange)" }}>B</th>
                <th style={{ ...TH, textAlign: "center" }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              <MRow label="Best lap"    vA={formatLapTime(a.bestLapMs)} vB={formatLapTime(b.bestLapMs)} d={delta(a.bestLapMs, b.bestLapMs)} dc={deltaColor(a.bestLapMs, b.bestLapMs)} />
              <MRow label="Avg lap"     vA={formatLapTime(a.avgLapMs ? Math.round(a.avgLapMs) : null)} vB={formatLapTime(b.avgLapMs ? Math.round(b.avgLapMs) : null)} d={delta(a.avgLapMs ? Math.round(a.avgLapMs) : null, b.avgLapMs ? Math.round(b.avgLapMs) : null)} dc={deltaColor(a.avgLapMs, b.avgLapMs)} />
              <MRow label="Ideal lap"   vA={formatLapTime(a.idealLapMs)} vB={formatLapTime(b.idealLapMs)} d={delta(a.idealLapMs, b.idealLapMs)} dc={deltaColor(a.idealLapMs, b.idealLapMs)} />
              <MRow label="Consistency" vA={a.consistencyScore?.toFixed(1) ?? "—"} vB={b.consistencyScore?.toFixed(1) ?? "—"} d={scoreDelta(a.consistencyScore, b.consistencyScore)} dc={deltaColor(b.consistencyScore, a.consistencyScore, true)} last />
            </tbody>
          </table>
        </div>

        {/* Lap-by-lap */}
        {allLapNums.length > 0 && (
          <>
            <p className="section-label" style={{ marginBottom: 6 }}>Lap by lap</p>
            <div className="card" style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 64px", gap: "2px 8px", color: "var(--text-dim)", marginBottom: 5, paddingBottom: 5, borderBottom: "1px solid var(--border-soft)" }}>
                <span className="section-label" style={{ fontSize: 9 }}>#</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.05em" }}>A</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.05em" }}>B</span>
                <span className="section-label" style={{ fontSize: 9, textAlign: "center" }}>Δ</span>
              </div>
              {allLapNums.map((num, i) => {
                const lA = lapsA.get(num)
                const lB = lapsB.get(num)
                const d  = delta(lA?.lapTimeMs ?? null, lB?.lapTimeMs ?? null)
                const dc = deltaColor(lA?.lapTimeMs ?? null, lB?.lapTimeMs ?? null)
                const invalid = lA?.isValid === false || lB?.isValid === false
                return (
                  <div key={num} style={{
                    display: "grid", gridTemplateColumns: "24px 1fr 1fr 64px",
                    gap: "2px 8px", padding: "2.5px 0",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    borderRadius: 3,
                    opacity: invalid ? 0.4 : 1,
                  }}>
                    <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{num}</span>
                    <span style={{ color: lA ? "var(--text)" : "var(--text-dim)" }}>{formatLapTime(lA?.lapTimeMs ?? null)}</span>
                    <span style={{ color: lB ? "var(--text)" : "var(--text-dim)" }}>{formatLapTime(lB?.lapTimeMs ?? null)}</span>
                    <span style={{ color: dc, fontWeight: d !== "—" && d !== "=" ? 700 : 400, textAlign: "center", fontSize: 10 }}>{d}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Best sectors */}
        {hasSectors && (
          <div style={{ marginTop: 16 }}>
            <p className="section-label" style={{ marginBottom: 6 }}>Best sectors</p>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <th style={TH}>Sector</th>
                    <th style={{ ...TH, color: "var(--cyan)" }}>A best</th>
                    <th style={{ ...TH, color: "var(--orange)" }}>B best</th>
                    <th style={{ ...TH, textAlign: "center" }}>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {(["sector1Ms", "sector2Ms", "sector3Ms"] as const).map((key, i) => {
                    const valsA = a.laps.map((l) => l[key]).filter((v): v is number => v != null)
                    const valsB = b.laps.map((l) => l[key]).filter((v): v is number => v != null)
                    const bestA = valsA.length ? Math.min(...valsA) : null
                    const bestB = valsB.length ? Math.min(...valsB) : null
                    return (
                      <MRow key={key} label={`S${i + 1}`} vA={formatLapTime(bestA)} vB={formatLapTime(bestB)} d={delta(bestA, bestB)} dc={deltaColor(bestA, bestB)} last={i === 2} />
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const TH: React.CSSProperties = {
  padding: "6px 12px", textAlign: "left",
  fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  background: "var(--surface-3)",
}

function MRow({ label, vA, vB, d, dc, last }: { label: string; vA: string; vB: string; d: string; dc: string; last?: boolean }) {
  return (
    <tr style={{ borderBottom: last ? "none" : "1px solid var(--border-soft)" }}>
      <td style={{ padding: "7px 12px", color: "var(--text-muted)", fontSize: 11, fontWeight: 500 }}>{label}</td>
      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: "var(--text)", fontSize: 11 }}>{vA}</td>
      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: "var(--text)", fontSize: 11 }}>{vB}</td>
      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: dc, fontWeight: 700, fontSize: 11, textAlign: "center" }}>{d}</td>
    </tr>
  )
}
