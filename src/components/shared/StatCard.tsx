import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
}: StatCardProps) {
  return (
    <Card className={cn("bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">{label}</span>
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-600" />}
        </div>
        <div className={cn(
          "text-2xl font-bold",
          mono && "font-mono",
          accent ? "text-cyan-400" : "text-zinc-100"
        )}>
          {value}
        </div>
        {delta && (
          <p className={cn(
            "text-xs mt-1",
            deltaPositive ? "text-green-400" : "text-red-400"
          )}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
