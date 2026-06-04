import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  mono?: boolean
  delta?: string
  deltaPositive?: boolean
  accent?: boolean
  className?: string
  sublabel?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  mono = false,
  delta,
  deltaPositive,
  accent = false,
  className,
  sublabel,
}: StatCardProps) {
  return (
    <div className={cn(
      "relative rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 overflow-hidden group hover:border-zinc-700 transition-all duration-200",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative">
        {/* Label + Icon row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
          {Icon && (
            <div className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center",
              accent ? "bg-cyan-500/15" : "bg-zinc-800"
            )}>
              <Icon className={cn("w-3.5 h-3.5", accent ? "text-cyan-400" : "text-zinc-500")} />
            </div>
          )}
        </div>

        {/* Value */}
        <div className={cn(
          "text-2xl font-bold tracking-tight leading-none",
          mono && "font-mono",
          accent ? "text-cyan-400" : "text-zinc-100"
        )}>
          {value}
        </div>

        {/* Delta or sublabel */}
        {delta && (
          <p className={cn(
            "text-xs mt-1.5 font-medium",
            deltaPositive ? "text-green-400" : "text-red-400"
          )}>
            {delta}
          </p>
        )}
        {sublabel && !delta && (
          <p className="text-xs mt-1.5 text-zinc-600">{sublabel}</p>
        )}
      </div>

      {/* Bottom accent line */}
      {accent && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      )}
    </div>
  )
}
