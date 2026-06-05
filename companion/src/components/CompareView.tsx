import { formatLapTime } from "../lib/time"
import type { SessionDetail } from "./SessionDetail"

interface Props {
  sessionA:  SessionDetail
  sessionB:  SessionDetail
  onBack:    () => void
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
  const better = lowerIsBetter ? d < 0 : d > 0
  return better ? "#4ade80" : "#f87171"
}

function scoreDelta(a: number | null, b: number | null): string {
  if (a == null || b == null) return "—"
  const d = a - b
  if (Math.abs(d) < 0.05) return "="
  return (d > 0 ? "+" : "") + d.toFixed(1)
}

const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice",
}

export function CompareView({ sessionA: a, sessionB: b, onBack }: Props) {
  // Build lap map for each session
  const lapsA = new Map(a.laps.map((l) => [l.lapNumber, l]))
  const lapsB = new Map(b.laps.map((l) => [l.lapNumber, l]))
  const allLapNums = Array.from(
    new Set([...lapsA.keys(), ...lapsB.keys()])
  ).sort((x, y) => x - y)

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Back */}
      <button onClick={onBack} style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)", background: "none" }}>
        ← Back
      </button>

      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>

        {/* Session headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[a, b].map((s, i) => (
            <div key={i} style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 9px" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: i === 0 ? "var(--cyan)" : "var(--orange)", textTransform: "uppercase", margin: "0 0 2px" }}>
                {i === 0 ? "A" : "B"} · {TYPE_LABEL[s.sessionType] ?? s.sessionType}
              </p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.trackName}</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.carName}</p>
              <p style={{ fontSize: 9, color: "var(--text-dim)", margin: "1px 0 0" }}>{new Date(s.sessionDate).toLocaleDateString()}</p>
            </div>
          ))}
        </div>

        {/* Metrics comparison */}
        <SectionLabel>Metrics</SectionLabel>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginBottom: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={thStyle}>Metric</th>
              <th style={{ ...thStyle, color: "var(--cyan)" }}>A</th>
              <th style={{ ...thStyle, color: "var(--orange)" }}>B</th>
              <th style={thStyle}>Δ</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow label="Best lap"    vA={formatLapTime(a.bestLapMs)}    vB={formatLapTime(b.bestLapMs)}
              delta={delta(a.bestLapMs, b.bestLapMs)}
              deltaColor={deltaColor(a.bestLapMs, b.bestLapMs)} />
            <MetricRow label="Avg lap"     vA={formatLapTime(a.avgLapMs ? Math.round(a.avgLapMs) : null)}
              vB={formatLapTime(b.avgLapMs ? Math.round(b.avgLapMs) : null)}
              delta={delta(a.avgLapMs ? Math.round(a.avgLapMs) : null, b.avgLapMs ? Math.round(b.avgLapMs) : null)}
              deltaColor={deltaColor(a.avgLapMs, b.avgLapMs)} />
            <MetricRow label="Ideal lap"   vA={formatLapTime(a.idealLapMs)}   vB={formatLapTime(b.idealLapMs)}
              delta={delta(a.idealLapMs, b.idealLapMs)}
              deltaColor={deltaColor(a.idealLapMs, b.idealLapMs)} />
            <MetricRow label="Consistency" vA={a.consistencyScore?.toFixed(1) ?? "—"}  vB={b.consistencyScore?.toFixed(1) ?? "—"}
              delta={scoreDelta(a.consistencyScore, b.consistencyScore)}
              deltaColor={deltaColor(b.consistencyScore, a.consistencyScore, true)} />
            <MetricRow label="Valid laps"  vA={`${a.validLaps}/${a.totalLaps}`} vB={`${b.validLaps}/${b.totalLaps}`} delta="" deltaColor="" />
          </tbody>
        </table>

        {/* Lap-by-lap */}
        {allLapNums.length > 0 && (
          <>
            <SectionLabel>Laps</SectionLabel>
            <div style={{ fontFamily: "monospace", fontSize: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 60px", gap: "1px 6px", color: "var(--text-dim)", marginBottom: 4, paddingBottom: 3, borderBottom: "1px solid var(--border)" }}>
                <span>#</span>
                <span style={{ color: "var(--cyan)" }}>A</span>
                <span style={{ color: "var(--orange)" }}>B</span>
                <span>Δ</span>
              </div>
              {allLapNums.map((num) => {
                const lA = lapsA.get(num)
                const lB = lapsB.get(num)
                const d  = delta(lA?.lapTimeMs ?? null, lB?.lapTimeMs ?? null)
                const dc = deltaColor(lA?.lapTimeMs ?? null, lB?.lapTimeMs ?? null)
                return (
                  <div key={num} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 60px", gap: "1px 6px", padding: "2px 0", opacity: (lA?.isValid === false || lB?.isValid === false) ? 0.45 : 1 }}>
                    <span style={{ color: "var(--text-dim)" }}>{num}</span>
                    <span style={{ color: lA ? "var(--text)" : "var(--text-dim)" }}>{formatLapTime(lA?.lapTimeMs ?? null)}</span>
                    <span style={{ color: lB ? "var(--text)" : "var(--text-dim)" }}>{formatLapTime(lB?.lapTimeMs ?? null)}</span>
                    <span style={{ color: dc, fontWeight: d !== "—" && d !== "=" ? 600 : 400 }}>{d}</span>
                  </div>
                )
              })}
            </div>

            {/* Sector best comparison */}
            {(a.laps.some((l) => l.sector1Ms) || b.laps.some((l) => l.sector1Ms)) && (
              <>
                <SectionLabel style={{ marginTop: 12 }}>Best sectors</SectionLabel>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={thStyle}>Sector</th>
                      <th style={{ ...thStyle, color: "var(--cyan)" }}>A best</th>
                      <th style={{ ...thStyle, color: "var(--orange)" }}>B best</th>
                      <th style={thStyle}>Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["sector1Ms", "sector2Ms", "sector3Ms"] as const).map((s, i) => {
                      const valsA = a.laps.map((l) => l[s]).filter((v): v is number => v != null)
                      const valsB = b.laps.map((l) => l[s]).filter((v): v is number => v != null)
                      const bestA = valsA.length ? Math.min(...valsA) : null
                      const bestB = valsB.length ? Math.min(...valsB) : null
                      return (
                        <MetricRow key={s}
                          label={`S${i + 1}`}
                          vA={formatLapTime(bestA)} vB={formatLapTime(bestB)}
                          delta={delta(bestA, bestB)}
                          deltaColor={deltaColor(bestA, bestB)}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "4px 6px",
  fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.04em",
}

function MetricRow({ label, vA, vB, delta: d, deltaColor: dc }: {
  label: string; vA: string; vB: string; delta: string; deltaColor: string
}) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "5px 6px", color: "var(--text-muted)", fontSize: 11 }}>{label}</td>
      <td style={{ padding: "5px 6px", fontFamily: "monospace", color: "var(--text)" }}>{vA}</td>
      <td style={{ padding: "5px 6px", fontFamily: "monospace", color: "var(--text)" }}>{vB}</td>
      <td style={{ padding: "5px 6px", fontFamily: "monospace", color: dc, fontWeight: 600 }}>{d}</td>
    </tr>
  )
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, ...style }}>
      {children}
    </p>
  )
}
