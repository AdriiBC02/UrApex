"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface TrendPoint {
  date: string
  value: number
}

interface TrendChartProps {
  data: TrendPoint[]
  color?: string
  height?: number
  domain?: [number, number]
  formatter?: (v: number) => string
  label?: string
}

export function TrendChart({
  data,
  color = "#06b6d4",
  height = 140,
  domain,
  formatter = (v) => v.toFixed(1),
  label = "Value",
}: TrendChartProps) {
  if (data.length < 2) return null

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.2 || 5
  const yDomain = domain ?? [Math.max(0, min - pad), Math.min(100, max + pad)]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(d: string) =>
            new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          }
        />
        <YAxis
          domain={yDomain}
          tickFormatter={formatter}
          tick={{ fill: "#71717a", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a1a1aa" }}
          labelFormatter={(d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          formatter={(v) => [formatter(v as number), label]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 3 }}
          activeDot={{ r: 5, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
