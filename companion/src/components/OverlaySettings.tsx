import { useState, useEffect } from "react"

// ─── Overlay configuration ────────────────────────────────────────────────────

export interface OverlayConfig {
  showSpeedGear:  boolean
  showRpmBar:     boolean
  showInputTrace: boolean
  showSteering:   boolean
  showLapTime:    boolean
  showTyres:      boolean
  showFuelGaps:   boolean
  opacity:        number   // 0.40–0.98
}

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  showSpeedGear:  true,
  showRpmBar:     true,
  showInputTrace: true,
  showSteering:   true,
  showLapTime:    true,
  showTyres:      true,
  showFuelGaps:   true,
  opacity:        0.88,
}

// ─── Shared mini-preview styles ───────────────────────────────────────────────

const MONO = "'SF Mono','JetBrains Mono','Fira Mono',monospace"

const WRAP: React.CSSProperties = {
  background: "#09090b",
  border: "1px solid #1c1c1f",
  borderRadius: 6,
  padding: "7px 8px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
}

// ─── Section preview thumbnails ───────────────────────────────────────────────

function SpeedGearPreview() {
  const R = 15, cx = 20, cy = 20
  const circ = 2 * Math.PI * R
  const arc  = circ * 0.75
  const fill = arc * 0.68
  return (
    <div style={WRAP}>
      <svg viewBox="0 0 40 40" style={{ width: 36, height: 36, flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="rgba(0,0,0,0.5)"
          stroke="rgba(255,255,255,0.07)" strokeWidth={3}
          strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke="#06b6d4" strokeWidth={3}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#06b6d4"
          fontSize={13} fontWeight={900} fontFamily={MONO}>4</text>
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: MONO }}>247</span>
          <span style={{ fontSize: 7, color: "#52525b" }}>km/h</span>
        </div>
        <span style={{ fontSize: 7, color: "#3f3f46", fontFamily: MONO }}>7,234 rpm</span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 7, color: "#52525b" }}>P</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#a1a1aa", lineHeight: 1, fontFamily: MONO }}>3</div>
      </div>
    </div>
  )
}

function RpmBarPreview() {
  return (
    <div style={WRAP}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 7, color: "#52525b", letterSpacing: "0.06em" }}>RPM</span>
          <span style={{ fontSize: 7, color: "#71717a", fontFamily: MONO }}>7,234</span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "68%", background: "#06b6d4", borderRadius: 3, boxShadow: "0 0 5px #06b6d4" }} />
        </div>
      </div>
    </div>
  )
}

function InputTracePreview() {
  const W = 130, H = 42
  // Fake throttle: high in straights, low under braking
  const thPts = "0,42 8,42 16,4 28,4 40,4 48,30 58,4 68,4 76,4 84,18 94,42 104,4 114,4 124,4 130,4"
  // Fake brake: low on straights, peaks under braking
  const brPts = "0,42 8,42 16,42 26,14 36,42 48,42 56,42 66,15 76,42 84,42 92,42 100,7 110,20 120,42 130,42"
  return (
    <div style={{ ...WRAP, flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 5, width: "100%" }}>
        <div style={{ flex: 1, height: H, background: "rgba(0,0,0,0.3)", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="prev-th" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="prev-br" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <polygon points={`${brPts} ${W},${H} 0,${H}`} fill="url(#prev-br)" />
            <polygon points={`${thPts} ${W},${H} 0,${H}`} fill="url(#prev-th)" />
            <polyline points={brPts} fill="none" stroke="#f87171" strokeWidth={1.5} strokeLinejoin="round" />
            <polyline points={thPts} fill="none" stroke="#4ade80" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {[["#4ade80", 0.92, "T"], ["#f87171", 0.05, "B"]].map(([color, pct, label]) => (
            <div key={label as string} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: 7, height: H, background: "rgba(255,255,255,0.07)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${(pct as number) * 100}%`, background: color as string }} />
              </div>
              <span style={{ fontSize: 6, color: "rgba(255,255,255,0.2)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {[["#4ade80", "Throttle"], ["#f87171", "Brake"]].map(([c, l]) => (
          <span key={l} style={{ fontSize: 6, color: `${c}80`, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 10, height: 1.5, background: c as string, display: "inline-block", borderRadius: 1 }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

function SteeringPreview() {
  return (
    <div style={WRAP}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 7, color: "#52525b" }}>STR</span>
          <span style={{ fontSize: 7, color: "#71717a", fontFamily: MONO }}>L 23%</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, position: "relative" }}>
          <div style={{
            position: "absolute", top: 0, height: "100%", borderRadius: 2,
            background: "#a78bfa",
            left: `${(0.5 - 0.115) * 100}%`,
            width: "11.5%",
          }} />
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 1, height: "100%", background: "rgba(255,255,255,0.2)" }} />
        </div>
      </div>
    </div>
  )
}

function LapTimePreview() {
  return (
    <div style={{ ...WRAP, flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 7, color: "#52525b", fontFamily: MONO }}>L12</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>1:23.456</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", fontFamily: MONO }}>+0.231</span>
        <span style={{ marginLeft: "auto", fontSize: 7, color: "#52525b", fontFamily: MONO }}>Best 1:23.225</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {[{ s: "S1", t: "0:28.145", d: null }, { s: "S2", t: "0:32.455", d: "+0.120" }].map(({ s, t, d }) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 7, color: "#52525b", width: 14 }}>{s}</span>
            <span style={{ fontSize: 9, fontFamily: MONO, color: "#a1a1aa" }}>{t}</span>
            {d && <span style={{ fontSize: 8, fontWeight: 700, marginLeft: "auto", color: "#f87171", fontFamily: MONO }}>{d}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function TyresPreview() {
  const cells = [
    { l: "FL", temp: 89, wear: 94, c: "#4ade80" },
    { l: "FR", temp: 91, wear: 93, c: "#4ade80" },
    { l: "RL", temp: 84, wear: 91, c: "#06b6d4" },
    { l: "RR", temp: 86, wear: 90, c: "#06b6d4" },
  ]
  return (
    <div style={{ ...WRAP, flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 7, fontWeight: 700, color: "#52525b", letterSpacing: "0.08em" }}>TYRES</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
        {cells.map(({ l, temp, wear, c }) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "4px 5px", border: `1px solid ${c}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>{l}</span>
              <span style={{ fontSize: 7, color: c, fontWeight: 700 }}>{temp}°</span>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1, margin: "2px 0", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(temp / 120) * 100}%`, background: c }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 6, color: "#52525b" }}>Wear</span>
              <span style={{ fontSize: 6, color: "#4ade80" }}>{wear}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FuelGapsPreview() {
  return (
    <div style={{ ...WRAP, flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 7, color: "#52525b" }}>Fuel</span>
            <span style={{ fontSize: 7, color: "#71717a", fontFamily: MONO }}>24.5L</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "38%", background: "#f59e0b", borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 7, color: "#52525b" }}>Ahead</span>
            <span style={{ fontSize: 7, color: "#f59e0b", fontFamily: MONO }}>+1.234</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ fontSize: 7, color: "#52525b" }}>H₂O</span>
            <span style={{ fontSize: 7, color: "#71717a", fontFamily: MONO }}>97°</span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ fontSize: 7, color: "#52525b" }}>Oil</span>
            <span style={{ fontSize: 7, color: "#71717a", fontFamily: MONO }}>102°</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    key:     "showSpeedGear"  as keyof OverlayConfig,
    label:   "Speed, Gear & Position",
    desc:    "Circular RPM gauge, speed readout and race position",
    Preview: SpeedGearPreview,
  },
  {
    key:     "showRpmBar"     as keyof OverlayConfig,
    label:   "RPM Bar",
    desc:    "Compact rev counter progress bar",
    Preview: RpmBarPreview,
  },
  {
    key:     "showInputTrace" as keyof OverlayConfig,
    label:   "Throttle / Brake Trace",
    desc:    "20-second rolling oscilloscope of throttle and brake inputs",
    Preview: InputTracePreview,
  },
  {
    key:     "showSteering"   as keyof OverlayConfig,
    label:   "Steering",
    desc:    "Bidirectional steering input bar",
    Preview: SteeringPreview,
  },
  {
    key:     "showLapTime"    as keyof OverlayConfig,
    label:   "Lap Time & Sectors",
    desc:    "Current lap, best-lap delta and S1 / S2 sector splits",
    Preview: LapTimePreview,
  },
  {
    key:     "showTyres"      as keyof OverlayConfig,
    label:   "Tyres",
    desc:    "Temperature, wear, brake temps and pressures per corner",
    Preview: TyresPreview,
  },
  {
    key:     "showFuelGaps"   as keyof OverlayConfig,
    label:   "Fuel, Gaps & Engine",
    desc:    "Fuel level, gap to car ahead and engine water/oil temps",
    Preview: FuelGapsPreview,
  },
]

// ─── Panel component ──────────────────────────────────────────────────────────

interface Props {
  config:   OverlayConfig
  onChange: (config: OverlayConfig) => void
}

export function OverlaySettingsPanel({ config, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {SECTIONS.map(({ key, label, desc, Preview }) => {
        const on = Boolean(config[key])
        return (
          <div
            key={key}
            style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "10px 12px", borderRadius: 9,
              background: on ? "rgba(6,182,212,0.04)" : "var(--surface-2)",
              border: `1px solid ${on ? "rgba(6,182,212,0.18)" : "var(--border-soft)"}`,
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {/* Preview thumbnail */}
            <div style={{ width: 200, flexShrink: 0, opacity: on ? 1 : 0.3, transition: "opacity 0.2s" }}>
              <Preview />
            </div>

            {/* Label + description */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.45 }}>{desc}</p>
            </div>

            {/* Toggle */}
            <button
              onClick={() => onChange({ ...config, [key]: !on })}
              style={{
                flexShrink: 0,
                width: 36, height: 20, borderRadius: 10,
                background: on ? "var(--cyan)" : "var(--border)",
                border: "none", cursor: "pointer", position: "relative",
                transition: "background 0.18s", marginTop: 2,
              }}
              title={on ? "Disable panel" : "Enable panel"}
            >
              <span style={{
                position: "absolute", top: 2,
                left: on ? 18 : 2,
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                transition: "left 0.18s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }} />
            </button>
          </div>
        )
      })}

      {/* Opacity */}
      <div style={{
        padding: "10px 12px", background: "var(--surface-2)", borderRadius: 9,
        border: "1px solid var(--border-soft)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Background opacity</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)" }}>
            {Math.round(config.opacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={40}
          max={98}
          value={Math.round(config.opacity * 100)}
          onChange={(e) => onChange({ ...config, opacity: parseInt(e.target.value) / 100 })}
          style={{ width: "100%", accentColor: "var(--cyan)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 9, color: "var(--text-dim)" }}>Semi-transparent</span>
          <span style={{ fontSize: 9, color: "var(--text-dim)" }}>Solid</span>
        </div>
      </div>
    </div>
  )
}

// ─── Keybindings ─────────────────────────────────────────────────────────────

export interface KeybindingsConfig {
  toggleOverlay:    string
  toggleSpeedGear:  string
  toggleRpmBar:     string
  toggleInputTrace: string
  toggleSteering:   string
  toggleLapTime:    string
  toggleTyres:      string
  toggleFuelGaps:   string
}

export const DEFAULT_KEYBINDINGS: KeybindingsConfig = {
  toggleOverlay:    "Alt+Shift+O",
  toggleSpeedGear:  "F1",
  toggleRpmBar:     "F2",
  toggleInputTrace: "F3",
  toggleSteering:   "F4",
  toggleLapTime:    "F5",
  toggleTyres:      "F6",
  toggleFuelGaps:   "F7",
}

const KB_ROWS: { key: keyof KeybindingsConfig; label: string }[] = [
  { key: "toggleOverlay",    label: "Show / hide overlay" },
  { key: "toggleSpeedGear",  label: "Speed, Gear & Position" },
  { key: "toggleRpmBar",     label: "RPM Bar" },
  { key: "toggleInputTrace", label: "Throttle / Brake Trace" },
  { key: "toggleSteering",   label: "Steering" },
  { key: "toggleLapTime",    label: "Lap Time & Sectors" },
  { key: "toggleTyres",      label: "Tyres" },
  { key: "toggleFuelGaps",   label: "Fuel, Gaps & Engine" },
]

function captureShortcut(e: KeyboardEvent): string | null {
  if (["Control", "Alt", "Shift", "Meta", "CapsLock", "Tab"].includes(e.key)) return null
  const mods: string[] = []
  if (e.ctrlKey)  mods.push("Ctrl")
  if (e.altKey)   mods.push("Alt")
  if (e.shiftKey) mods.push("Shift")
  if (e.metaKey)  mods.push("Super")
  if (mods.length === 0) return null // require at least one modifier
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key // "o"→"O", "F5"→"F5"
  return [...mods, key].join("+")
}

interface KbProps {
  config:   KeybindingsConfig
  onChange: (config: KeybindingsConfig) => void
}

export function KeybindingsPanel({ config, onChange }: KbProps) {
  const [recording, setRecording] = useState<keyof KeybindingsConfig | null>(null)

  useEffect(() => {
    if (!recording) return
    const key = recording // capture narrowed (non-null) value for the closure
    function handler(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === "Escape") { setRecording(null); return }
      const shortcut = captureShortcut(e)
      if (shortcut) {
        onChange({ ...config, [key]: shortcut })
        setRecording(null)
      }
    }
    window.addEventListener("keydown", handler, true)
    return () => window.removeEventListener("keydown", handler, true)
  }, [recording, config, onChange])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {KB_ROWS.map(({ key, label }) => {
        const isRec = recording === key
        const value = config[key]
        return (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 10px", borderRadius: 8,
            background: isRec ? "rgba(6,182,212,0.06)" : "var(--surface-2)",
            border: `1px solid ${isRec ? "rgba(6,182,212,0.25)" : "var(--border-soft)"}`,
            transition: "all 0.15s",
          }}>
            {/* Label */}
            <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>{label}</span>

            {/* Shortcut pill */}
            <span style={{
              fontSize: 10, fontFamily: "monospace",
              padding: "2px 8px", borderRadius: 4, minWidth: 110, textAlign: "center",
              background: value ? "rgba(255,255,255,0.05)" : "transparent",
              border: "1px solid var(--border-soft)",
              color: isRec ? "var(--cyan)" : value ? "rgba(255,255,255,0.55)" : "var(--text-dim)",
            }}>
              {isRec ? "Press keys…" : (value || "—")}
            </span>

            {/* Change */}
            <button
              onClick={() => setRecording(isRec ? null : key)}
              style={{
                fontSize: 10, padding: "3px 9px", borderRadius: 5, cursor: "pointer",
                background: isRec ? "var(--cyan)" : "var(--surface-3)",
                color: isRec ? "#000" : "var(--text-dim)",
                border: "1px solid var(--border)", transition: "all 0.15s",
              }}
            >
              {isRec ? "Cancel" : "Change"}
            </button>

            {/* Clear */}
            {value && !isRec && (
              <button
                onClick={() => onChange({ ...config, [key]: "" })}
                title="Clear shortcut"
                style={{
                  fontSize: 12, lineHeight: 1, padding: "2px 5px", borderRadius: 4,
                  background: "none", color: "rgba(255,255,255,0.2)",
                  border: "none", cursor: "pointer",
                }}
              >×</button>
            )}
          </div>
        )
      })}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
        <button
          onClick={() => onChange(DEFAULT_KEYBINDINGS)}
          style={{
            fontSize: 10, padding: "4px 11px", borderRadius: 5,
            background: "none", color: "var(--text-dim)",
            border: "1px solid var(--border-soft)", cursor: "pointer",
          }}
        >
          Reset to defaults
        </button>
      </div>

      <p style={{ fontSize: 9, color: "var(--text-dim)", lineHeight: 1.5, margin: 0 }}>
        Requires at least one modifier (Alt, Ctrl, Shift). Esc cancels recording.
        Works in-game when LMU runs in <strong>borderless windowed</strong> mode.
      </p>
    </div>
  )
}
