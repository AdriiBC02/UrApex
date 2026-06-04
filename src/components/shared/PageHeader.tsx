import { LucideIcon } from "lucide-react"
import { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  badge?: ReactNode
}

export function PageHeader({ title, description, icon: Icon, action, badge }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2.5 mb-0.5">
          {Icon && (
            <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center">
              <Icon className="w-4 h-4 text-zinc-400" />
            </div>
          )}
          <h1 className="text-2xl font-semibold text-zinc-100">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5 ml-9">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
