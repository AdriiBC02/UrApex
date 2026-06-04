"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface WeekBucket {
  label: string   // e.g. "2 Jun"
  sessions: number
  isCurrentWeek: boolean
}

export function ActivityChart({ data }: { data: WeekBucket[] }) {
  if (!data.length) return null

  const max = Math.max(...data.map(d => d.sessions), 1)

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#52525b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, max + 1]}
          tick={{ fill: "#52525b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={20}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(v) => [v as number, "sessions"]}
        />
        <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.sessions === 0 ? "#27272a" : entry.isCurrentWeek ? "#06b6d4" : "#3f3f46"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
