"use client"

import { useState, useEffect } from "react"
import { Monitor } from "lucide-react"

// ─── Config type ──────────────────────────────────────────────────────────────

interface OverlayConfig {
  showSpeedGear:  boolean
  showRpmBar:     boolean
  showInputTrace: boolean
  showSteering:   boolean
  showLapTime:    boolean
  showTyres:      boolean
  showFuelGaps:   boolean
  opacity:        number
}

const DEFAULT: OverlayConfig = {
  showSpeedGear:  true,
  showRpmBar:     true,
  showInputTrace: true,
  showSteering:   true,
  showLapTime:    true,
  showTyres:      true,
  showFuelGaps:   true,
  opacity:        0.88,
}

const STORAGE_KEY = "urapex-overlay-config"

// ─── Preview thumbnails (inline-styled — same look as the companion) ──────────

const MONO = "'SF Mono','JetBrains Mono','Fira Mono',monospace"
const WRAP: React.CSSProperties = {
  background: "#09090b", border: "1px solid #1c1c1f", borderRadius: 6,
  padding: "7px 8px", display: "flex", alignItems: "center", gap: 8, width: "100%",
}

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
  const thPts = "0,42 8,42 16,4 28,4 40,4 48,30 58,4 68,4 76,4 84,18 94,42 104,4 114,4 124,4 130,4"
  const brPts = "0,42 8,42 16,42 26,14 36,42 48,42 56,42 66,15 76,42 84,42 92,42 100,7 110,20 120,42 130,42"
  return (
    <div style={{ ...WRAP, flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 5, width: "100%" }}>
        <div style={{ flex: 1, height: H, background: "rgba(0,0,0,0.3)", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="web-th" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="web-br" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <polygon points={`${brPts} ${W},${H} 0,${H}`} fill="url(#web-br)" />
            <polygon points={`${thPts} ${W},${H} 0,${H}`} fill="url(#web-th)" />
            <polyline points={brPts} fill="none" stroke="#f87171" strokeWidth={1.5} strokeLinejoin="round" />
            <polyline points={thPts} fill="none" stroke="#4ade80" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {([["#4ade80", 0.92, "T"], ["#f87171", 0.05, "B"]] as const).map(([color, pct, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: 7, height: H, background: "rgba(255,255,255,0.07)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${pct * 100}%`, background: color }} />
              </div>
              <span style={{ fontSize: 6, color: "rgba(255,255,255,0.2)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {([["#4ade80", "Throttle"], ["#f87171", "Brake"]] as const).map(([c, l]) => (
          <span key={l} style={{ fontSize: 6, color: `${c}80`, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 10, height: 1.5, background: c, display: "inline-block", borderRadius: 1 }} />{l}
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
          <div style={{ position: "absolute", top: 0, height: "100%", borderRadius: 2, background: "#a78bfa", left: "38.5%", width: "11.5%" }} />
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
        {[{ s: "S1", t: "0:28.145" }, { s: "S2", t: "0:32.455", d: "+0.120" }].map(({ s, t, d }) => (
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

const SECTIONS: {
  key: keyof OverlayConfig
  label: string
  desc: string
  Preview: () => React.ReactElement
}[] = [
  { key: "showSpeedGear",  label: "Speed, Gear & Position",   desc: "Circular RPM gauge, speed readout and race position",              Preview: SpeedGearPreview  },
  { key: "showRpmBar",     label: "RPM Bar",                  desc: "Compact rev counter progress bar",                                  Preview: RpmBarPreview     },
  { key: "showInputTrace", label: "Throttle / Brake Trace",   desc: "20-second rolling oscilloscope of throttle and brake inputs",       Preview: InputTracePreview },
  { key: "showSteering",   label: "Steering",                 desc: "Bidirectional steering input bar",                                  Preview: SteeringPreview   },
  { key: "showLapTime",    label: "Lap Time & Sectors",       desc: "Current lap, best-lap delta and S1 / S2 sector splits",            Preview: LapTimePreview    },
  { key: "showTyres",      label: "Tyres",                    desc: "Temperature, wear, brake temps and pressures per corner",           Preview: TyresPreview      },
  { key: "showFuelGaps",   label: "Fuel, Gaps & Engine",      desc: "Fuel level, gap to car ahead and engine water / oil temps",        Preview: FuelGapsPreview   },
]

// ─── Panel ────────────────────────────────────────────────────────────────────

export function OverlaySettingsPanel() {
  const [config, setConfig] = useState<OverlayConfig>(DEFAULT)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setConfig(JSON.parse(saved) as OverlayConfig)
    } catch { /* ignore */ }
  }, [])

  function handleChange(next: OverlayConfig) {
    setConfig(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const activeCount = SECTIONS.filter(({ key }) => Boolean(config[key])).length

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/60">
        <Monitor className="w-3.5 h-3.5 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-300">Overlay layout</h2>
        <span className="text-xs text-zinc-600 ml-auto">
          {mounted ? `${activeCount} / ${SECTIONS.length} panels active` : "Companion app · in-game HUD"}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs text-zinc-500 leading-relaxed">
          Select which panels appear in the companion app's in-game HUD overlay. Preferences sync to the companion app the next time it reads your settings.
        </p>

        <div className="space-y-2">
          {SECTIONS.map(({ key, label, desc, Preview }) => {
            const on = Boolean(config[key])
            return (
              <div
                key={key}
                className={`flex gap-4 items-start rounded-xl border p-3 transition-colors ${
                  on ? "bg-cyan-950/20 border-cyan-900/30" : "bg-zinc-800/30 border-zinc-800"
                }`}
              >
                {/* Thumbnail */}
                <div style={{ width: 210, flexShrink: 0, opacity: on ? 1 : 0.3, transition: "opacity 0.2s" }}>
                  <Preview />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs font-semibold text-zinc-200">{label}</p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleChange({ ...config, [key]: !on })}
                  className={`flex-shrink-0 relative w-9 h-5 rounded-full transition-colors mt-0.5 cursor-pointer border-0 ${
                    on ? "bg-cyan-500" : "bg-zinc-700"
                  }`}
                  aria-label={on ? `Disable ${label}` : `Enable ${label}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
            )
          })}

          {/* Opacity */}
          <div className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-zinc-300">Background opacity</span>
              <span className="text-xs font-bold text-cyan-400 tabular-nums">
                {mounted ? `${Math.round(config.opacity * 100)}%` : "88%"}
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={98}
              value={Math.round(config.opacity * 100)}
              onChange={(e) => handleChange({ ...config, opacity: parseInt(e.target.value) / 100 })}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-zinc-600">Semi-transparent</span>
              <span className="text-xs text-zinc-600">Solid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
