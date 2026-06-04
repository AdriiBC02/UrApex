"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts"
import { formatLapTime } from "@/lib/time"

interface LapPoint {
  lapNumber: number
  lapTimeMs: number | null
  isValid: boolean
  isPersonalBest: boolean
}

interface Props {
  laps: LapPoint[]
}

export function LapTimeChart({ laps }: Props) {
  const data = laps
    .filter((l) => l.lapTimeMs != null)
    .map((l) => ({
      lap: l.lapNumber,
      ms: l.lapTimeMs!,
      valid: l.isValid,
      pb: l.isPersonalBest,
      label: formatLapTime(l.lapTimeMs),
    }))

  if (data.length < 2) return null

  const times = data.map((d) => d.ms)
  const minMs = Math.min(...times)
  const maxMs = Math.max(...times)
  const padding = (maxMs - minMs) * 0.1 || 1000

  const yMin = Math.floor((minMs - padding) / 1000) * 1000
  const yMax = Math.ceil((maxMs + padding) / 1000) * 1000

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="lap"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Lap", position: "insideBottomRight", offset: -4, fill: "#52525b", fontSize: 11 }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={(ms: number) => formatLapTime(ms)}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(value) => [formatLapTime(typeof value === "number" ? value : null), "Lap time"]}
          labelFormatter={(lap) => `Lap ${lap}`}
        />
        {/* Invalid laps in muted color */}
        <Line
          data={data.filter((d) => !d.valid)}
          type="monotone"
          dataKey="ms"
          stroke="#52525b"
          strokeWidth={1}
          dot={{ fill: "#52525b", r: 2 }}
          activeDot={false}
          connectNulls={false}
        />
        {/* Valid laps */}
        <Line
          data={data.filter((d) => d.valid)}
          type="monotone"
          dataKey="ms"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props
            if (payload.pb) return <circle cx={cx} cy={cy} r={4} fill="#22c55e" stroke="none" />
            return <circle cx={cx} cy={cy} r={2} fill="#06b6d4" stroke="none" />
          }}
          activeDot={{ r: 5, fill: "#06b6d4" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
