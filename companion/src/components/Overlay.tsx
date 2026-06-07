import { useState, useEffect } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TelemetryFrame {
  speed_kph:   number
  rpm:         number
  max_rpm:     number
  gear:        number
  throttle:    number
  brake:       number
  steering:    number
  fuel_liters: number
  fuel_pct:    number
  water_temp:  number
  oil_temp:    number
  lap_number:  number
  position:    number
  in_pits:     boolean
  pit_limiter: boolean
  num_pitstops: number
  lap_time_ms:      number
  last_lap_ms:      number
  best_lap_ms:      number
  cur_sector1_ms:   number   // <0 = not completed
  cur_sector2_ms:   number
  best_sector1_ms:  number
  best_sector2_ms:  number
  last_sector1_ms:  number
  last_sector2_ms:  number
  gap_ahead_ms:     number
  gap_leader_ms:    number
  vehicle_flag:     number   // 0=none, 1=blue, 2=yellow, 3=black, 4=checkered
  game_phase:       number   // 5=green, 6=FCY, 7=stopped
  yellow_flag_state: number
  tire_temp_l: number[]      // [FL, FR, RL, RR]
  tire_temp_c: number[]
  tire_temp_r: number[]
  tire_wear:   number[]      // % remaining
  tire_pres:   number[]      // kPa
  brake_temp:  number[]
  connected:   boolean
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtTime(ms: number): string {
  if (ms <= 0) return "—:——.———"
  const m   = Math.floor(ms / 60000)
  const s   = Math.floor((ms % 60000) / 1000)
  const ms3 = Math.floor(ms % 1000)
  return `${m}:${String(s).padStart(2, "0")}.${String(ms3).padStart(3, "0")}`
}

function fmtDelta(lap: number, ref: number): string {
  if (ref <= 0 || lap <= 0) return ""
  const d = lap - ref
  if (Math.abs(d) < 50) return ""
  return (d > 0 ? "+" : "") + (d / 1000).toFixed(3)
}

function fmtSectorDelta(cur: number, best: number): string | null {
  if (cur <= 0 || best <= 0) return null
  const d = cur - best
  return (d > 0 ? "+" : "") + (d / 1000).toFixed(3)
}

function gearLabel(g: number): string {
  if (g === -1) return "R"
  if (g === 0)  return "N"
  return String(g)
}

function gearColor(g: number): string {
  if (g === -1) return "#f87171"
  if (g === 0)  return "#94a3b8"
  return "#06b6d4"
}

// ─── Tire temperature → colour ────────────────────────────────────────────────
// Cold: blue → optimal: green → hot: red
function tireTempColor(temp: number): string {
  if (temp <= 0) return "#374151"
  if (temp < 60)  return "#3b82f6"
  if (temp < 75)  return "#06b6d4"
  if (temp < 85)  return "#4ade80"
  if (temp < 95)  return "#f59e0b"
  if (temp < 105) return "#f97316"
  return "#ef4444"
}

// Tyre wear % → colour
function wearColor(pct: number): string {
  if (pct > 70) return "#4ade80"
  if (pct > 40) return "#f59e0b"
  if (pct > 20) return "#f97316"
  return "#ef4444"
}

// Brake temp → colour
function brakeColor(temp: number): string {
  if (temp < 200) return "#94a3b8"
  if (temp < 400) return "#f59e0b"
  if (temp < 650) return "#f97316"
  return "#ef4444"
}

// ─── Game phase / flags ───────────────────────────────────────────────────────
interface FlagInfo { label: string; color: string; bg: string }

function getFlag(frame: TelemetryFrame): FlagInfo | null {
  const { game_phase, vehicle_flag, yellow_flag_state } = frame
  if (game_phase === 6)  return { label: "FCY",       color: "#000", bg: "#facc15" }
  if (game_phase === 7)  return { label: "STOPPED",   color: "#fff", bg: "#ef4444" }
  if (game_phase === 9)  return { label: "PAUSED",    color: "#fff", bg: "#6366f1" }
  if (vehicle_flag === 3) return { label: "BLACK",    color: "#fff", bg: "#000" }
  if (vehicle_flag === 1) return { label: "BLUE",     color: "#fff", bg: "#3b82f6" }
  if (vehicle_flag === 2) return { label: "YELLOW",   color: "#000", bg: "#facc15" }
  if (vehicle_flag === 4) return { label: "CHEQUERED",color: "#000", bg: "#e5e7eb" }
  if (yellow_flag_state >= 1 && yellow_flag_state <= 4)
    return { label: "SC",       color: "#000", bg: "#facc15" }
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Bar({ value, color, height = 5, glow = false }: {
  value: number; color: string; height?: number; glow?: boolean
}) {
  return (
    <div style={{ height, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.max(0, Math.min(100, value))}%`,
        background: color, borderRadius: 3,
        transition: "width 0.08s",
        boxShadow: glow ? `0 0 8px ${color}` : "none",
      }} />
    </div>
  )
}

const WHEEL_LABELS = ["FL", "FR", "RL", "RR"]

function TireCell({ label, tempC, wear, pres, brakeT }: {
  label: string; tempC: number; wear: number; pres: number; brakeT: number
}) {
  const avgTemp = tempC
  const tc = tireTempColor(avgTemp)
  const wc = wearColor(wear)

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: 6,
      padding: "6px 7px", display: "flex", flexDirection: "column", gap: 3,
      border: `1px solid ${tc}33`,
      minWidth: 58,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontSize: 9, color: tc, fontWeight: 700 }}>{avgTemp > 0 ? `${Math.round(avgTemp)}°` : "—"}</span>
      </div>
      {/* Temp bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, (avgTemp / 120) * 100)}%`, background: tc, borderRadius: 2 }} />
      </div>
      {/* Wear */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>Wear</span>
        <span style={{ fontSize: 8, color: wc, fontWeight: 600 }}>{wear > 0 ? `${Math.round(wear)}%` : "—"}</span>
      </div>
      {/* Brake temp */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>Brk</span>
        <span style={{ fontSize: 8, color: brakeColor(brakeT) }}>{brakeT > 0 ? `${Math.round(brakeT)}°` : "—"}</span>
      </div>
      {/* Pressure */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>kPa</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.45)" }}>{pres > 0 ? Math.round(pres) : "—"}</span>
      </div>
    </div>
  )
}

// ─── Sector row ───────────────────────────────────────────────────────────────

function SectorRow({ label, cur, best, last }: {
  label: string; cur: number; best: number; last: number
}) {
  const active  = cur > 0
  const delta   = active ? fmtSectorDelta(cur, best) : fmtSectorDelta(last, best)
  const time    = active ? fmtTime(cur) : fmtTime(last)
  const isAhead = delta !== null && delta.startsWith("-")

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", width: 14, letterSpacing: "0.05em" }}>{label}</span>
      <span style={{
        fontSize: 11, fontVariantNumeric: "tabular-nums", fontWeight: active ? 700 : 400,
        color: active ? "#fff" : "rgba(255,255,255,0.45)",
      }}>{time}</span>
      {delta != null && (
        <span style={{
          fontSize: 10, fontWeight: 700, marginLeft: "auto",
          color: isAhead ? "#4ade80" : "#f87171",
        }}>{delta}</span>
      )}
    </div>
  )
}

// ─── Idle defaults ────────────────────────────────────────────────────────────

const IDLE: TelemetryFrame = {
  speed_kph: 0, rpm: 0, max_rpm: 9000, gear: 0,
  throttle: 0, brake: 0, steering: 0,
  fuel_liters: 0, fuel_pct: 0, water_temp: 0, oil_temp: 0,
  lap_number: 0, position: 0, in_pits: false, pit_limiter: false, num_pitstops: 0,
  lap_time_ms: 0, last_lap_ms: 0, best_lap_ms: 0,
  cur_sector1_ms: -1, cur_sector2_ms: -1,
  best_sector1_ms: 0, best_sector2_ms: 0,
  last_sector1_ms: 0, last_sector2_ms: 0,
  gap_ahead_ms: 0, gap_leader_ms: 0,
  vehicle_flag: 0, game_phase: 0, yellow_flag_state: -1,
  tire_temp_l: [0,0,0,0], tire_temp_c: [0,0,0,0], tire_temp_r: [0,0,0,0],
  tire_wear: [100,100,100,100], tire_pres: [0,0,0,0], brake_temp: [0,0,0,0],
  connected: false,
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function OverlayApp() {
  const [data, setData]     = useState<TelemetryFrame>(IDLE)
  const [live, setLive]     = useState(false)
  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.documentElement.style.background = "transparent"
    document.body.style.background            = "transparent"

    const unlisten: Array<() => void> = []
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<TelemetryFrame>("telemetry", (e) => {
        setData(e.payload)
        setLive(e.payload.connected)
        setIdleTimer((prev) => {
          if (prev) clearTimeout(prev)
          return setTimeout(() => setLive(false), 3000)
        })
      }).then((fn) => unlisten.push(fn))
    })
    return () => {
      unlisten.forEach((fn) => fn())
      setIdleTimer((prev) => { if (prev) clearTimeout(prev); return null })
    }
  }, [])

  async function close() { await getCurrentWindow().hide() }

  const rpmPct   = data.max_rpm > 0 ? Math.min(data.rpm / data.max_rpm, 1) : 0
  const rpmColor = rpmPct > 0.92 ? "#ef4444" : rpmPct > 0.78 ? "#f59e0b" : "#06b6d4"
  const rpmGlow  = rpmPct > 0.92
  const delta    = fmtDelta(data.lap_time_ms, data.best_lap_ms)
  const flag     = getFlag(data)

  const avgTireTemp = (i: number) =>
    (data.tire_temp_l[i] + data.tire_temp_c[i] + data.tire_temp_r[i]) / 3

  const steerPx = Math.round((data.steering * 0.5 + 0.5) * 100) // 0-100

  return (
    <div
      data-tauri-drag-region
      style={{
        width: "100vw", height: "100vh",
        display: "flex", alignItems: "flex-start", justifyContent: "flex-start",
        background: "transparent", userSelect: "none",
      }}
    >
      <div style={{
        background: "rgba(9,9,11,0.88)",
        border: `1px solid ${live ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12,
        backdropFilter: "blur(12px)",
        width: "100%",
        overflow: "hidden",
        fontFamily: "'SF Mono','JetBrains Mono','Fira Mono',monospace",
        transition: "border-color 0.4s",
        fontSize: 11,
      }}>

        {/* ── Title bar ── */}
        <div
          data-tauri-drag-region
          style={{
            display: "flex", alignItems: "center", padding: "5px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}>
            ⚡ URAPEX
          </span>
          {live && (
            <span style={{
              marginLeft: 7, width: 5, height: 5, borderRadius: "50%",
              background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade80",
            }} />
          )}
          {!data.connected && (
            <span style={{ marginLeft: 7, fontSize: 8, color: "#f59e0b" }}>NO SHM</span>
          )}
          {/* Flag indicator in title bar */}
          {flag && (
            <span style={{
              marginLeft: 8, padding: "1px 6px", borderRadius: 3,
              background: flag.bg, color: flag.color,
              fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
            }}>{flag.label}</span>
          )}
          <button
            onClick={close}
            data-tauri-drag-region="false"
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "rgba(255,255,255,0.25)", cursor: "pointer",
              fontSize: 14, lineHeight: 1, padding: "0 2px", transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
            title="Hide overlay"
          >×</button>
        </div>

        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 9 }}>

          {/* ── Row 1: Speed / Gear / Position ── */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div>
              <span style={{ fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                {Math.round(data.speed_kph)}
              </span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 3 }}>km/h</span>
            </div>

            <div style={{
              fontSize: 36, fontWeight: 800, lineHeight: 1,
              color: gearColor(data.gear), minWidth: 28, textAlign: "center",
            }}>
              {gearLabel(data.gear)}
            </div>

            {/* Pit limiter badge */}
            {data.pit_limiter && (
              <span style={{
                fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
                background: "#f59e0b", color: "#000", padding: "2px 5px", borderRadius: 3,
              }}>PIT LIM</span>
            )}

            {data.position > 0 && (
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>P</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.8)" }}>
                  {data.position}
                </span>
              </div>
            )}
          </div>

          {/* ── Row 2: RPM bar ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>RPM</span>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>
                {Math.round(data.rpm).toLocaleString()}
                <span style={{ color: "rgba(255,255,255,0.2)" }}> / {Math.round(data.max_rpm).toLocaleString()}</span>
              </span>
            </div>
            <Bar value={rpmPct * 100} color={rpmColor} height={6} glow={rpmGlow} />
          </div>

          {/* ── Row 3: Inputs ── */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Throttle */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>T</span>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)" }}>{Math.round(data.throttle * 100)}%</span>
              </div>
              <Bar value={data.throttle * 100} color="#4ade80" height={4} />
            </div>
            {/* Brake */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>B</span>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)" }}>{Math.round(data.brake * 100)}%</span>
              </div>
              <Bar value={data.brake * 100} color="#f87171" height={4} />
            </div>
            {/* Steering */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>STR</span>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)" }}>
                  {data.steering > 0 ? "R" : data.steering < 0 ? "L" : "—"} {Math.abs(Math.round(data.steering * 100))}%
                </span>
              </div>
              {/* Centered steering indicator */}
              <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, position: "relative" }}>
                <div style={{
                  position: "absolute", top: 0, height: "100%", borderRadius: 2,
                  background: "#a78bfa",
                  left: data.steering < 0 ? `${(0.5 + data.steering * 0.5) * 100}%` : "50%",
                  width: `${Math.abs(data.steering) * 50}%`,
                }} />
                {/* Centre line */}
                <div style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: 1, height: "100%", background: "rgba(255,255,255,0.2)",
                }} />
              </div>
            </div>
          </div>

          {/* ── Row 4: Lap time + delta + sectors ── */}
          <div style={{
            paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", gap: 5,
          }}>
            {/* Current lap */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", width: 20 }}>
                L{data.lap_number > 0 ? data.lap_number : "—"}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}>
                {fmtTime(data.lap_time_ms)}
              </span>
              {delta !== "" && (
                <span style={{ fontSize: 11, fontWeight: 700, color: delta.startsWith("+") ? "#f87171" : "#4ade80" }}>
                  {delta}
                </span>
              )}
              {data.best_lap_ms > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 8, color: "rgba(255,255,255,0.25)" }}>
                  Best {fmtTime(data.best_lap_ms)}
                </span>
              )}
            </div>

            {/* Sectors */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <SectorRow label="S1"
                cur={data.cur_sector1_ms} best={data.best_sector1_ms} last={data.last_sector1_ms} />
              <SectorRow label="S2"
                cur={data.cur_sector2_ms} best={data.best_sector2_ms} last={data.last_sector2_ms} />
            </div>
          </div>

          {/* ── Row 5: Tyres ── */}
          <div style={{ paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>TYRES</span>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>temp · wear · brake · pres</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
              {WHEEL_LABELS.map((label, i) => (
                <TireCell key={label} label={label}
                  tempC={avgTireTemp(i)} wear={data.tire_wear[i]}
                  pres={data.tire_pres[i]} brakeT={data.brake_temp[i]}
                />
              ))}
            </div>
          </div>

          {/* ── Row 6: Fuel + Gaps + Engine ── */}
          <div style={{
            paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            {/* Fuel */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>Fuel</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>
                  {data.fuel_liters.toFixed(1)}L
                </span>
              </div>
              <Bar
                value={data.fuel_pct}
                color={data.fuel_pct < 15 ? "#f87171" : data.fuel_pct < 30 ? "#f59e0b" : "#4ade80"}
                height={4}
              />
            </div>

            {/* Gaps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 80 }}>
              {data.gap_ahead_ms > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>Ahead</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>
                    +{(data.gap_ahead_ms / 1000).toFixed(3)}
                  </span>
                </div>
              )}
              {data.gap_leader_ms > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>Leader</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
                    +{(data.gap_leader_ms / 1000).toFixed(3)}
                  </span>
                </div>
              )}
              {data.num_pitstops > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>Stops</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>{data.num_pitstops}</span>
                </div>
              )}
            </div>

            {/* Engine temps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>H₂O</span>
                <span style={{
                  fontSize: 9, fontVariantNumeric: "tabular-nums",
                  color: data.water_temp > 115 ? "#ef4444" : data.water_temp > 105 ? "#f59e0b" : "rgba(255,255,255,0.45)",
                }}>{data.water_temp > 0 ? `${Math.round(data.water_temp)}°` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>Oil</span>
                <span style={{
                  fontSize: 9, fontVariantNumeric: "tabular-nums",
                  color: data.oil_temp > 130 ? "#ef4444" : data.oil_temp > 115 ? "#f59e0b" : "rgba(255,255,255,0.45)",
                }}>{data.oil_temp > 0 ? `${Math.round(data.oil_temp)}°` : "—"}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
