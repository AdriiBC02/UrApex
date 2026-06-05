"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { formatLapTime } from "@/lib/time"

interface DataPoint {
  date: string
  bestLapMs: number
}

export function PBEvolutionChart({ data }: { data: DataPoint[] }) {
  if (data.length < 2) return null

  const times = data.map((d) => d.bestLapMs)
  const minMs = Math.min(...times)
  const maxMs = Math.max(...times)
  const padding = (maxMs - minMs) * 0.15 || 2000

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(d: string) => {
            const dt = new Date(d)
            return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          }}
        />
        <YAxis
          domain={[minMs - padding, maxMs + padding]}
          tickFormatter={(ms: number) => formatLapTime(ms)}
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={72}
          reversed
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(value) => [formatLapTime(typeof value === "number" ? value : null), "Best lap"]}
        />
        <Line
          type="monotone"
          dataKey="bestLapMs"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={{ fill: "#06b6d4", r: 3 }}
          activeDot={{ r: 5, fill: "#06b6d4" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
