import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-500" />
      </div>
      <h3 className="text-base font-medium text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-xs mb-6">{description}</p>
      {action && (
        <Link href={action.href}>
          <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  )
}
