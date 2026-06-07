"use client"

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface LapDistributionChartProps {
  data: number[]   // lap times in ms, already sorted asc
  height?: number
}

export function LapDistributionChart({ data, height = 160 }: LapDistributionChartProps) {
  if (data.length < 5) return null

  const points = data.map((ms, i) => ({ index: i + 1, ms }))
  const best   = data[0]
  const median = data[Math.floor(data.length / 2)]
  const pct5   = data[Math.floor(data.length * 0.05)]
  const pct95  = data[Math.floor(data.length * 0.95)]

  const fmt = (ms: number) => {
    const m = Math.floor(ms / 60000)
    const s = ((ms % 60000) / 1000).toFixed(3)
    return m > 0 ? `${m}:${s.padStart(6, "0")}` : `${s}s`
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="index"
          name="Lap #"
          type="number"
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Lap #", fill: "#52525b", fontSize: 10, position: "insideBottomRight", offset: -4 }}
        />
        <YAxis
          dataKey="ms"
          name="Time"
          type="number"
          domain={[pct5 - 500, pct95 + 500]}
          tickFormatter={fmt}
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
          cursor={{ strokeDasharray: "3 3", stroke: "#3f3f46" }}
          formatter={(v, name) => [name === "Time" ? fmt(v as number) : v, name]}
        />
        <ReferenceLine y={best}   stroke="#06b6d4" strokeDasharray="4 2" strokeWidth={1} label={{ value: "PB", fill: "#06b6d4", fontSize: 10 }} />
        <ReferenceLine y={median} stroke="#71717a" strokeDasharray="4 2" strokeWidth={1} label={{ value: "Med", fill: "#71717a", fontSize: 10 }} />
        <Scatter data={points} fill="#6366f1" opacity={0.7} r={3} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
