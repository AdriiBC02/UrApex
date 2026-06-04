import { LucideIcon } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      {/* Icon with subtle ring */}
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Icon className="w-7 h-7 text-zinc-600" />
        </div>
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-2xl border border-zinc-700/40 scale-110 pointer-events-none" />
      </div>

      <h3 className="text-base font-semibold text-zinc-200 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-6">{description}</p>

      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-semibold border border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/30 transition-all"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
