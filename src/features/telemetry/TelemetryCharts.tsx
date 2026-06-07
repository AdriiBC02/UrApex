"use client"

import { useState } from "react"
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpeedPoint {
  t:   number   // ms from start
  spd: number   // km/h
  thr: number   // 0-100
  brk: number   // 0-100
}

export interface LapPoint {
  lap:    number
  flWear: number; frWear: number; rlWear: number; rrWear: number
  flTemp: number; frTemp: number; rlTemp: number; rrTemp: number
  flBrk:  number; frBrk:  number; rlBrk:  number; rrBrk:  number
  fuel:   number
}

// ─── Chart config ─────────────────────────────────────────────────────────────

const AXIS_STYLE    = { fontSize: 10, fill: "#71717a" }
const GRID_STROKE   = "#27272a"
const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border:          "1px solid #3f3f46",
  borderRadius:    8,
  fontSize:        11,
  color:           "#e4e4e7",
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

// ─── View toggle ──────────────────────────────────────────────────────────────

type View = "speed" | "tires" | "brakes" | "fuel"

const VIEWS: { id: View; label: string }[] = [
  { id: "speed",  label: "Speed trace"  },
  { id: "tires",  label: "Tyre wear"    },
  { id: "brakes", label: "Brake temps"  },
  { id: "fuel",   label: "Fuel"         },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function TelemetryCharts({
  speedTrace,
  lapStats,
  totalFrames,
  sampleHz,
  durationSec,
}: {
  speedTrace:  SpeedPoint[]
  lapStats:    LapPoint[]
  totalFrames: number
  sampleHz:    number
  durationSec: number | null
}) {
  const [view, setView] = useState<View>("speed")

  const dur = durationSec
    ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
    : "—"

  return (
    <div className="space-y-5">

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          {totalFrames.toLocaleString()} samples @ {sampleHz} Hz
        </span>
        <span>Duration: {dur}</span>
      </div>

      {/* View selector */}
      <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === v.id
                ? "bg-zinc-800 text-zinc-100 shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">

        {/* Speed trace */}
        {view === "speed" && speedTrace.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Speed (km/h) · Throttle & Brake (%)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={speedTrace} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="thrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="brkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="t" tickFormatter={fmtMs} tick={AXIS_STYLE}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(v) => `Time: ${fmtMs(Number(v))}`}
                  formatter={(v, n) => [`${Number(v).toFixed(1)}${n === "spd" ? " km/h" : "%"}`, n === "spd" ? "Speed" : n === "thr" ? "Throttle" : "Brake"]}
                />
                <Area type="monotone" dataKey="thr" stroke="#4ade80" strokeWidth={1} fill="url(#thrGrad)" dot={false} />
                <Area type="monotone" dataKey="brk" stroke="#f87171" strokeWidth={1} fill="url(#brkGrad)" dot={false} />
                <Area type="monotone" dataKey="spd" stroke="#06b6d4" strokeWidth={2} fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-3">
              {[
                { color: "bg-cyan-400",  label: "Speed"    },
                { color: "bg-green-400", label: "Throttle" },
                { color: "bg-red-400",   label: "Brake"    },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tyre wear */}
        {view === "tires" && lapStats.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Tyre wear per lap (% remaining)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lapStats} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="lap" tick={AXIS_STYLE} axisLine={false} tickLine={false} label={{ value: "Lap", position: "insideBottom", offset: -2, fontSize: 10, fill: "#71717a" }} />
                <YAxis domain={[0, 100]} tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${Number(v).toFixed(1)}%`, String(n)]} />
                <Line type="monotone" dataKey="flWear" name="FL" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="frWear" name="FR" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rlWear" name="RL" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rrWear" name="RR" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#a1a1aa" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Brake temps */}
        {view === "brakes" && lapStats.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Brake temperatures per lap (°C)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lapStats} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="lap" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="°" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${Number(v).toFixed(0)}°C`, String(n)]} />
                <Line type="monotone" dataKey="flBrk" name="FL" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="frBrk" name="FR" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rlBrk" name="RL" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rrBrk" name="RR" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#a1a1aa" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fuel */}
        {view === "fuel" && lapStats.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Fuel remaining per lap (L)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={lapStats} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="lap" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="L" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)}L`, "Fuel"]} />
                <Area type="monotone" dataKey="fuel" name="Fuel (L)" stroke="#22d3ee" strokeWidth={2} fill="url(#fuelGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tyre temp */}
        {view === "tires" && lapStats.length > 0 && (
          <div className="mt-6 pt-5 border-t border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Tyre temperature per lap (°C avg)
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={lapStats} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="lap" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="°" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${Number(v).toFixed(0)}°C`, String(n)]} />
                <Line type="monotone" dataKey="flTemp" name="FL" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="frTemp" name="FR" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="rlTemp" name="RL" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="rrTemp" name="RR" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
