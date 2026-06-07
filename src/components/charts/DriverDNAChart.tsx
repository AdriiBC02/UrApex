"use client"

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts"

interface DriverDNAChartProps {
  scores: { label: string; value: number | null | undefined }[]
  height?: number
}

export function DriverDNAChart({ scores, height = 220 }: DriverDNAChartProps) {
  const data = scores.map(s => ({
    dimension: s.label,
    value:     s.value != null ? Math.round(s.value) : 0,
    fullMark:  100,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#27272a" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "#71717a", fontSize: 11, fontWeight: 600 }}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`${v}`, "Score"]}
        />
        <Radar
          name="Score"
          dataKey="value"
          stroke="#06b6d4"
          fill="#06b6d4"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ fill: "#06b6d4", r: 3 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
