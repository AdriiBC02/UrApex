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
  User,
  HardDrive,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/upload", icon: Upload, label: "Import" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { href: "/sessions", icon: Clock, label: "Sessions" },
      { href: "/tracks", icon: Map, label: "Tracks" },
      { href: "/cars", icon: Car, label: "Cars" },
    ],
  },
  {
    label: "Progress",
    items: [
      { href: "/goals",        icon: Target,     label: "Goals" },
      { href: "/achievements", icon: Trophy,     label: "Achievements" },
      { href: "/setups",       icon: Wrench,     label: "Setups" },
      { href: "/storage",      icon: HardDrive,  label: "Storage" },
    ],
  },
]

interface AppSidebarProps {
  user: { name?: string | null; email?: string | null }
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return (email ?? "U").slice(0, 2).toUpperCase()
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const initials = getInitials(user.name, user.email)
  const displayName = user.name ?? user.email ?? "Driver"

  return (
    <aside className="relative flex flex-col h-full w-58 bg-zinc-950/90 backdrop-blur-md border-r border-zinc-800/50 z-10">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800/60">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
            <ChevronRight className="w-4 h-4 text-zinc-950 -ml-px" strokeWidth={3} />
          </div>
          <span className="text-base font-bold tracking-tight">
            <span className="text-cyan-400">Ur</span>
            <span className="text-zinc-100">Apex</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/")) || (href === "/upload" && pathname.startsWith("/upload"))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                      active
                        ? "bg-cyan-500/10 text-cyan-400 font-medium"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-r-full" />
                    )}
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-cyan-400" : "text-zinc-500")} />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-800/60 space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
            pathname.startsWith("/profile")
              ? "bg-cyan-500/10 text-cyan-400 font-medium"
              : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
          )}
        >
          <User className="w-4 h-4 shrink-0" />
          Profile
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
            pathname.startsWith("/settings")
              ? "bg-cyan-500/10 text-cyan-400 font-medium"
              : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>

        {/* User section */}
        <div className="mt-1 px-2 py-2.5 flex items-center gap-3 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-zinc-300">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-300 truncate">{displayName}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
