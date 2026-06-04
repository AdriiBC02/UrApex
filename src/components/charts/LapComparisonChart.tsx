"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { formatLapTime } from "@/lib/time"

interface ComparisonPoint {
  lap: number
  a: number | null
  b: number | null
}

interface Props {
  data: ComparisonPoint[]
  labelA: string
  labelB: string
}

export function LapComparisonChart({ data, labelA, labelB }: Props) {
  const allMs = data.flatMap(d => [d.a, d.b]).filter((v): v is number => v != null)
  if (allMs.length < 2) return null

  const minMs = Math.min(...allMs)
  const maxMs = Math.max(...allMs)
  const pad   = (maxMs - minMs) * 0.12 || 1500
  const yMin  = Math.floor((minMs - pad) / 1000) * 1000
  const yMax  = Math.ceil((maxMs + pad) / 1000) * 1000

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="lap"
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false} tickLine={false}
          label={{ value: "Lap", position: "insideBottomRight", offset: -4, fill: "#52525b", fontSize: 10 }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={(ms: number) => formatLapTime(ms)}
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false} tickLine={false}
          width={72}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a1a1aa" }}
          labelFormatter={(l) => `Lap ${l}`}
          formatter={(v, name) => [formatLapTime(v as number), name === "a" ? labelA : labelB]}
        />
        <Legend
          formatter={(value) => value === "a" ? labelA : labelB}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Line
          type="monotone" dataKey="a" name="a"
          stroke="#06b6d4" strokeWidth={2}
          dot={{ fill: "#06b6d4", r: 2 }} activeDot={{ r: 4 }}
          connectNulls={false}
        />
        <Line
          type="monotone" dataKey="b" name="b"
          stroke="#f97316" strokeWidth={2}
          dot={{ fill: "#f97316", r: 2 }} activeDot={{ r: 4 }}
          strokeDasharray="5 3"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
