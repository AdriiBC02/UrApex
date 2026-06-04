import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  value: number | null | undefined
  label?: string
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

function scoreColor(value: number): string {
  if (value >= 90) return "text-green-400"
  if (value >= 75) return "text-lime-400"
  if (value >= 60) return "text-yellow-400"
  if (value >= 40) return "text-orange-400"
  return "text-red-400"
}

function scoreBg(value: number): string {
  if (value >= 90) return "bg-green-950/50 border-green-900/50"
  if (value >= 75) return "bg-lime-950/50 border-lime-900/50"
  if (value >= 60) return "bg-yellow-950/50 border-yellow-900/50"
  if (value >= 40) return "bg-orange-950/50 border-orange-900/50"
  return "bg-red-950/50 border-red-900/50"
}

const sizes = {
  sm: { wrapper: "px-2 py-0.5 text-xs", value: "text-xs" },
  md: { wrapper: "px-2.5 py-1 text-sm", value: "text-sm" },
  lg: { wrapper: "px-3 py-1.5", value: "text-2xl font-bold" },
}

export function ScoreBadge({ value, label, size = "md", showLabel = false }: ScoreBadgeProps) {
  if (value == null) return <span className="text-zinc-600 text-sm">—</span>

  const { wrapper, value: valueClass } = sizes[size]

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-md border font-mono",
      wrapper,
      scoreBg(value)
    )}>
      <span className={cn("font-bold", scoreColor(value), valueClass)}>
        {value.toFixed(0)}
      </span>
      {showLabel && label && (
        <span className="text-zinc-500 text-xs font-sans">{label}</span>
      )}
    </div>
  )
}

export function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <ScoreBadge value={value} size="sm" />
    </div>
  )
}
