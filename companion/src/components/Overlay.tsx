import { useState, useEffect, useRef, memo, useCallback } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { type OverlayConfig, DEFAULT_OVERLAY_CONFIG } from "./OverlaySettings"

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
  cur_sector1_ms:   number
  cur_sector2_ms:   number
  best_sector1_ms:  number
  best_sector2_ms:  number
  last_sector1_ms:  number
  last_sector2_ms:  number
  gap_ahead_ms:     number
  gap_leader_ms:    number
  vehicle_flag:     number
  game_phase:       number
  yellow_flag_state: number
  tire_temp_l: number[]
  tire_temp_c: number[]
  tire_temp_r: number[]
  tire_wear:   number[]
  tire_pres:   number[]
  brake_temp:  number[]
  connected:   boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_LEN = 200  // 20s at 10 Hz

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

// ─── Colour helpers ───────────────────────────────────────────────────────────

function tireTempColor(temp: number): string {
  if (temp <= 0) return "#374151"
  if (temp < 60)  return "#3b82f6"
  if (temp < 75)  return "#06b6d4"
  if (temp < 85)  return "#4ade80"
  if (temp < 95)  return "#f59e0b"
  if (temp < 105) return "#f97316"
  return "#ef4444"
}

function wearColor(pct: number): string {
  if (pct > 70) return "#4ade80"
  if (pct > 40) return "#f59e0b"
  if (pct > 20) return "#f97316"
  return "#ef4444"
}

function brakeColor(temp: number): string {
  if (temp < 200) return "#94a3b8"
  if (temp < 400) return "#f59e0b"
  if (temp < 650) return "#f97316"
  return "#ef4444"
}

// ─── Flag ─────────────────────────────────────────────────────────────────────

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

const Bar = memo(function Bar({ value, color, height = 5, glow = false }: {
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
})

// ─── Rolling input trace ──────────────────────────────────────────────────────

function InputTrace({ history }: { history: Array<[number, number]> }) {
  const W = 280, H = 48
  const n = history.length

  if (n < 2) {
    return (
      <div style={{
        flex: 1, height: H,
        background: "rgba(0,0,0,0.2)",
        borderRadius: 5, border: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.1)", letterSpacing: "0.1em" }}>TELEMETRY</span>
      </div>
    )
  }

  const xOf = (i: number) => W - (n - 1 - i) * (W / HISTORY_LEN)
  const thCoords: [number, number][] = history.map(([t,], i) => [xOf(i), H - t * (H - 2) - 1])
  const brCoords: [number, number][] = history.map(([,b], i) => [xOf(i), H - b * (H - 2) - 1])

  const toLine = (pts: [number, number][]) =>
    pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")

  const toFill = (pts: [number, number][]) => {
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
    return `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  }

  return (
    <div style={{
      flex: 1, height: H,
      background: "rgba(0,0,0,0.25)",
      borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="th-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="br-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1={f * W} y1={0} x2={f * W} y2={H} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
        ))}

        {/* Gradient fills */}
        <path d={toFill(brCoords)} fill="url(#br-grad)" />
        <path d={toFill(thCoords)} fill="url(#th-grad)" />

        {/* Trace lines — brake behind throttle */}
        <polyline points={toLine(brCoords)} fill="none" stroke="#f87171" strokeWidth={1.5} strokeLinejoin="round" opacity={0.9} />
        <polyline points={toLine(thCoords)} fill="none" stroke="#4ade80" strokeWidth={1.5} strokeLinejoin="round" opacity={0.9} />
      </svg>
    </div>
  )
}

// ─── Vertical input bar ───────────────────────────────────────────────────────

const VertInputBar = memo(function VertInputBar({ value, color, height = 48, label }: {
  value: number; color: string; height?: number; label: string
}) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ width: 9, height, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: `${pct}%`, background: color, borderRadius: 3,
          transition: "height 0.07s",
          boxShadow: pct > 85 ? `0 0 6px ${color}` : "none",
        }} />
      </div>
      <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>{label}</span>
    </div>
  )
})

// ─── Circular gear + RPM gauge ────────────────────────────────────────────────

const CircularGauge = memo(function CircularGauge({ gear, rpmPct, rpmColor }: {
  gear: number; rpmPct: number; rpmColor: string
}) {
  const SIZE = 72, R = 28, cx = 36, cy = 36
  const circumference = 2 * Math.PI * R
  // Arc spans 270° starting at 135° (bottom-left → top → bottom-right)
  const arcSpan = circumference * (270 / 360)
  const filled  = arcSpan * Math.min(1, rpmPct)

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: "absolute", inset: 0, width: SIZE, height: SIZE }}>
        {/* Track arc */}
        <circle cx={cx} cy={cy} r={R}
          fill="rgba(0,0,0,0.5)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={4}
          strokeDasharray={`${arcSpan} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* RPM fill */}
        {rpmPct > 0.015 && (
          <circle cx={cx} cy={cy} r={R}
            fill="none"
            stroke={rpmColor}
            strokeWidth={4}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
            style={rpmPct > 0.92 ? { filter: `drop-shadow(0 0 5px ${rpmColor})` } : undefined}
          />
        )}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 1,
      }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: gearColor(gear), lineHeight: 1 }}>
          {gearLabel(gear)}
        </span>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
          {rpmPct > 0 ? `${Math.round(rpmPct * 100)}%` : "rpm"}
        </span>
      </div>
    </div>
  )
})

// ─── Tire cell ────────────────────────────────────────────────────────────────

const WHEEL_LABELS = ["FL", "FR", "RL", "RR"]

const TireCell = memo(function TireCell({ label, tempC, wear, pres, brakeT }: {
  label: string; tempC: number; wear: number; pres: number; brakeT: number
}) {
  const tc = tireTempColor(tempC)
  const wc = wearColor(wear)

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: 6,
      padding: "6px 7px", display: "flex", flexDirection: "column", gap: 3,
      border: `1px solid ${tc}33`, minWidth: 58,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontSize: 9, color: tc, fontWeight: 700 }}>{tempC > 0 ? `${Math.round(tempC)}°` : "—"}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, (tempC / 120) * 100)}%`, background: tc, borderRadius: 2 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>Wear</span>
        <span style={{ fontSize: 8, color: wc, fontWeight: 600 }}>{wear > 0 ? `${Math.round(wear)}%` : "—"}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>Brk</span>
        <span style={{ fontSize: 8, color: brakeColor(brakeT) }}>{brakeT > 0 ? `${Math.round(brakeT)}°` : "—"}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>kPa</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.45)" }}>{pres > 0 ? Math.round(pres) : "—"}</span>
      </div>
    </div>
  )
})

// ─── Sector row ───────────────────────────────────────────────────────────────

const SectorRow = memo(function SectorRow({ label, cur, best, last }: {
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
})

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
  const [data, setData] = useState<TelemetryFrame>(IDLE)
  const [live, setLive] = useState(false)
  const [cfg, setCfg]   = useState<OverlayConfig>(DEFAULT_OVERLAY_CONFIG)
  const historyRef  = useRef<Array<[number, number]>>([])
  // Ref-based idle timer — avoids one extra setState per telemetry frame
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track connected state to skip redundant setLive(true) calls on every frame
  const connectedRef = useRef(false)

  useEffect(() => {
    document.documentElement.style.background = "transparent"
    document.body.style.background            = "transparent"

    // Expose direct JS functions so Rust can call them via w.eval()
    ;(window as unknown as Record<string, unknown>).__setOverlayConfig = (c: OverlayConfig) => setCfg(c)
    ;(window as unknown as Record<string, unknown>).__togglePanel = (key: string) => {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_OVERLAY_CONFIG, key)) {
        const k = key as keyof OverlayConfig
        setCfg((prev) => {
          if (typeof prev[k] === "boolean") return { ...prev, [k]: !prev[k] }
          return prev
        })
      }
    }

    // Tell Rust that React has mounted and the overlay is ready
    import("@tauri-apps/api/event").then(({ emit }) => {
      emit("overlay-ready", { ts: Date.now() }).catch(() => {})
    })

    const unlisten: Array<() => void> = []
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<TelemetryFrame>("telemetry", (e) => {
        historyRef.current.push([e.payload.throttle, e.payload.brake])
        if (historyRef.current.length > HISTORY_LEN) historyRef.current.shift()

        setData(e.payload)

        // Only update live state when connected status actually changes
        if (e.payload.connected !== connectedRef.current) {
          connectedRef.current = e.payload.connected
          setLive(e.payload.connected)
        }

        // Reset the idle timer without touching React state
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        idleTimerRef.current = setTimeout(() => {
          connectedRef.current = false
          setLive(false)
        }, 3000)
      }).then((fn) => unlisten.push(fn))

      listen<OverlayConfig>("overlay-config", (e) => {
        setCfg(e.payload)
      }).then((fn) => unlisten.push(fn))

      listen<string>("overlay-panel-toggle", (e) => {
        const key = e.payload as keyof OverlayConfig
        setCfg((prev) => ({ ...prev, [key]: !prev[key] }))
      }).then((fn) => unlisten.push(fn))
    })
    return () => {
      unlisten.forEach((fn) => fn())
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const close = useCallback(async () => { await getCurrentWindow().hide() }, [])

  const rpmPct   = data.max_rpm > 0 ? Math.min(data.rpm / data.max_rpm, 1) : 0
  const rpmColor = rpmPct > 0.92 ? "#ef4444" : rpmPct > 0.78 ? "#f59e0b" : "#06b6d4"
  const rpmGlow  = rpmPct > 0.92
  const delta    = fmtDelta(data.lap_time_ms, data.best_lap_ms)
  const flag     = getFlag(data)

  const avgTireTemp = (i: number) =>
    (data.tire_temp_l[i] + data.tire_temp_c[i] + data.tire_temp_r[i]) / 3

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
        background: `rgba(9,9,11,${cfg.opacity})`,
        border: `1px solid ${live ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 12,
        width: "100%",
        overflow: "hidden",
        fontFamily: "'SF Mono','JetBrains Mono','Fira Mono',monospace",
        transition: "border-color 0.4s, background 0.3s",
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
            <span
              title="Overlay visible but no telemetry. Start telemetry in Settings. LMU must run in Borderless Windowed mode."
              style={{
                marginLeft: 6, fontSize: 8, fontWeight: 700,
                color: "#000", background: "#f59e0b",
                padding: "1px 6px", borderRadius: 3, cursor: "help",
                letterSpacing: "0.05em",
              }}
            >
              ⚡ NO SHM
            </span>
          )}
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

          {/* ── Row 1: Circular gauge / Speed / Position ── */}
          {cfg.showSpeedGear && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CircularGauge gear={data.gear} rpmPct={rpmPct} rpmColor={rpmColor} />

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                    {Math.round(data.speed_kph)}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>km/h</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontVariantNumeric: "tabular-nums" }}>
                    {Math.round(data.rpm).toLocaleString()} rpm
                  </span>
                  {data.pit_limiter && (
                    <span style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
                      background: "#f59e0b", color: "#000", padding: "1px 5px", borderRadius: 3,
                    }}>PIT LIM</span>
                  )}
                </div>
              </div>

              {data.position > 0 && (
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>P</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.8)" }}>
                    {data.position}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Row 2: RPM bar ── */}
          {cfg.showRpmBar && (
            <Bar value={rpmPct * 100} color={rpmColor} height={4} glow={rpmGlow} />
          )}

          {/* ── Row 3: Rolling input trace + vertical bars ── */}
          {cfg.showInputTrace && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                <InputTrace history={historyRef.current} />
                <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingTop: 2 }}>
                  <VertInputBar value={data.throttle} color="#4ade80" label="T" />
                  <VertInputBar value={data.brake}    color="#f87171" label="B" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, paddingLeft: 2 }}>
                <span style={{ fontSize: 7, color: "rgba(74,222,128,0.5)", display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 12, height: 2, background: "#4ade80", display: "inline-block", borderRadius: 1 }} />
                  Throttle
                </span>
                <span style={{ fontSize: 7, color: "rgba(248,113,113,0.5)", display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 12, height: 2, background: "#f87171", display: "inline-block", borderRadius: 1 }} />
                  Brake
                </span>
              </div>
            </div>
          )}

          {/* ── Row 4: Steering ── */}
          {cfg.showSteering && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>STR</span>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)" }}>
                  {data.steering > 0.02 ? "R" : data.steering < -0.02 ? "L" : "—"}{" "}
                  {Math.abs(Math.round(data.steering * 100))}%
                </span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, position: "relative" }}>
                <div style={{
                  position: "absolute", top: 0, height: "100%", borderRadius: 2,
                  background: "#a78bfa",
                  left: data.steering < 0 ? `${(0.5 + data.steering * 0.5) * 100}%` : "50%",
                  width: `${Math.abs(data.steering) * 50}%`,
                }} />
                <div style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: 1, height: "100%", background: "rgba(255,255,255,0.2)",
                }} />
              </div>
            </div>
          )}

          {/* ── Row 5: Lap time + delta + sectors ── */}
          {cfg.showLapTime && (
            <div style={{
              paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", flexDirection: "column", gap: 5,
            }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <SectorRow label="S1"
                  cur={data.cur_sector1_ms} best={data.best_sector1_ms} last={data.last_sector1_ms} />
                <SectorRow label="S2"
                  cur={data.cur_sector2_ms} best={data.best_sector2_ms} last={data.last_sector2_ms} />
              </div>
            </div>
          )}

          {/* ── Row 6: Tyres ── */}
          {cfg.showTyres && (
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
          )}

          {/* ── Row 7: Fuel + Gaps + Engine ── */}
          {cfg.showFuelGaps && (
            <div style={{
              paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
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
          )}

        </div>
      </div>
    </div>
  )
}
