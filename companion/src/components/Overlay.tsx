import { useState, useEffect } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

interface TelemetryFrame {
  speed_kph:   number
  rpm:         number
  max_rpm:     number
  gear:        number
  fuel_liters: number
  fuel_pct:    number
  lap_number:  number
  lap_time_ms: number
  last_lap_ms: number
  best_lap_ms: number
  position:    number
  throttle:    number
  brake:       number
}

function fmtTime(ms: number): string {
  if (ms <= 0) return "—:——.———"
  const m  = Math.floor(ms / 60000)
  const s  = Math.floor((ms % 60000) / 1000)
  const ms3 = Math.floor(ms % 1000)
  return `${m}:${String(s).padStart(2, "0")}.${String(ms3).padStart(3, "0")}`
}

function gearLabel(g: number): string {
  if (g === -1) return "R"
  if (g === 0)  return "N"
  return String(g)
}

function deltaStr(lap: number, best: number): string {
  if (best <= 0 || lap <= 0) return ""
  const d = lap - best
  if (Math.abs(d) < 1) return ""
  return (d > 0 ? "+" : "") + (d / 1000).toFixed(3)
}

const IDLE: TelemetryFrame = {
  speed_kph: 0, rpm: 0, max_rpm: 9000, gear: 0,
  fuel_liters: 0, fuel_pct: 0, lap_number: 0,
  lap_time_ms: 0, last_lap_ms: 0, best_lap_ms: 0,
  position: 0, throttle: 0, brake: 0,
}

export function OverlayApp() {
  const [data, setData]   = useState<TelemetryFrame>(IDLE)
  const [live, setLive]   = useState(false)
  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Make window background transparent
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"

    const unlisten: Array<() => void> = []
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<TelemetryFrame>("telemetry", (e) => {
        setData(e.payload)
        setLive(true)
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

  async function close() {
    await getCurrentWindow().hide()
  }

  const rpmPct   = data.max_rpm > 0 ? Math.min(data.rpm / data.max_rpm, 1) : 0
  const rpmColor = rpmPct > 0.9 ? "#ef4444" : rpmPct > 0.75 ? "#f59e0b" : "#06b6d4"
  const delta    = deltaStr(data.lap_time_ms, data.best_lap_ms)
  const hasDelta = delta !== ""

  return (
    <div
      data-tauri-drag-region
      style={{
        width: "100vw", height: "100vh",
        display: "flex", alignItems: "flex-start", justifyContent: "flex-start",
        background: "transparent",
        userSelect: "none",
      }}
    >
      {/* HUD card */}
      <div style={{
        background: "rgba(9,9,11,0.82)",
        border: `1px solid ${live ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        backdropFilter: "blur(8px)",
        width: "100%",
        overflow: "hidden",
        fontFamily: "'SF Mono', 'Fira Mono', monospace",
        transition: "border-color 0.4s",
      }}>

        {/* Title bar (drag region) */}
        <div
          data-tauri-drag-region
          style={{
            display: "flex", alignItems: "center",
            padding: "5px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", pointerEvents: "none" }}>
            ⚡ URAPEX
          </span>
          {live && (
            <span style={{
              marginLeft: 8, width: 5, height: 5, borderRadius: "50%",
              background: "#4ade80", display: "inline-block",
              boxShadow: "0 0 6px #4ade80",
            }} />
          )}
          <button
            onClick={close}
            data-tauri-drag-region="false"
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "rgba(255,255,255,0.3)", cursor: "pointer",
              fontSize: 14, lineHeight: 1, padding: "0 2px",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            title="Hide overlay"
          >
            ×
          </button>
        </div>

        {/* Main content */}
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Row 1: Speed + Gear + Position */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                {Math.round(data.speed_kph)}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>km/h</span>
            </div>
            <div style={{
              fontSize: 34, fontWeight: 800, lineHeight: 1,
              color: data.gear === -1 ? "#f87171" : data.gear === 0 ? "#94a3b8" : "#06b6d4",
              minWidth: 28, textAlign: "center",
            }}>
              {gearLabel(data.gear)}
            </div>
            {data.position > 0 && (
              <div style={{ marginLeft: "auto" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>P</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>{data.position}</span>
              </div>
            )}
          </div>

          {/* Row 2: RPM bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>RPM</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>
                {Math.round(data.rpm).toLocaleString()}
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${rpmPct * 100}%`,
                background: rpmColor,
                transition: "width 0.1s, background 0.15s",
                boxShadow: rpmPct > 0.9 ? `0 0 8px ${rpmColor}` : "none",
              }} />
            </div>
          </div>

          {/* Row 3: Throttle + Brake bars */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "T", value: data.throttle, color: "#4ade80" },
              { label: "B", value: data.brake,    color: "#f87171" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{label}</span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{Math.round(value * 100)}%</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${value * 100}%`, background: color, borderRadius: 2, transition: "width 0.08s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Row 4: Lap time + delta + fuel */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 1 }}>
                L{data.lap_number > 0 ? data.lap_number : "—"}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>
                {fmtTime(data.lap_time_ms)}
              </span>
            </div>
            {hasDelta && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: delta.startsWith("+") ? "#f87171" : "#4ade80",
              }}>
                {delta}
              </span>
            )}
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 2 }}>Fuel</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${data.fuel_pct}%`,
                    background: data.fuel_pct < 20 ? "#f87171" : data.fuel_pct < 40 ? "#f59e0b" : "#4ade80",
                    transition: "width 0.3s",
                  }} />
                </div>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>
                  {data.fuel_liters.toFixed(1)}L
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
