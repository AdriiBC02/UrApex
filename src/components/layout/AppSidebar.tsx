"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Upload,
  Clock,
  Map,
  Car,
  Target,
  Trophy,
  Settings,
  LogOut,
  Wrench,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/upload", icon: Upload, label: "Upload" },
  { href: "/sessions", icon: Clock, label: "Sessions" },
  { href: "/tracks", icon: Map, label: "Tracks" },
  { href: "/cars", icon: Car, label: "Cars" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/achievements", icon: Trophy, label: "Achievements" },
  { href: "/setups", icon: Wrench, label: "Setups" },
]

interface AppSidebarProps {
  user: { name?: string | null; email?: string | null }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col h-full w-56 bg-zinc-900 border-r border-zinc-800">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-cyan-500 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-zinc-950 -ml-0.5" strokeWidth={3} />
          </div>
          <span className="text-lg font-bold text-cyan-400 tracking-tight">UrApex</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-cyan-500/10 text-cyan-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-zinc-800 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "bg-cyan-500/10 text-cyan-400 font-medium"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>

        <div className="px-3 py-2">
          <p className="text-xs text-zinc-500 truncate mb-1.5">
            {user.name ?? user.email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 px-0 text-zinc-500 hover:text-red-400 hover:bg-transparent text-xs gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  )
}
