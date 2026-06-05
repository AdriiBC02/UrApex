"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  LayoutDashboard, Upload, Clock, Map, Car, Target, Trophy,
  Wrench, User, Settings, HardDrive, Search, ArrowRight,
  RefreshCw, Film, ChevronRight,
} from "lucide-react"

interface RecentSession {
  id:          string
  trackName:   string
  carName:     string
  sessionType: string
  sessionDate: string
}

interface CommandPaletteProps {
  recentSessions: RecentSession[]
}

const SESSION_TYPE_SHORT: Record<string, string> = {
  RACE:       "Race",
  QUALIFYING: "Quali",
  PRACTICE:   "Practice",
  HOTLAP:     "Hotlap",
  TIME_TRIAL: "Time Trial",
}

const NAV = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Import",       href: "/upload",       icon: Upload },
  { label: "Sessions",     href: "/sessions",     icon: Clock },
  { label: "Tracks",       href: "/tracks",       icon: Map },
  { label: "Cars",         href: "/cars",         icon: Car },
  { label: "Goals",        href: "/goals",        icon: Target },
  { label: "Achievements", href: "/achievements", icon: Trophy },
  { label: "Setups",       href: "/setups",       icon: Wrench },
  { label: "Profile",      href: "/profile",      icon: User },
  { label: "Storage",      href: "/storage",      icon: HardDrive },
  { label: "Settings",     href: "/settings",     icon: Settings },
]

export function CommandPalette({ recentSessions }: CommandPaletteProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState("")
  const router            = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const go = useCallback((href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href)
  }, [router])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden">
        <Command shouldFilter={true}>
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Go to, search sessions…"
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              autoFocus
            />
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5 font-mono">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-zinc-600">
              No results for "{query}"
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading={<GroupLabel>Navigation</GroupLabel>}>
              {NAV.map(({ label, href, icon: Icon }) => (
                <Command.Item
                  key={href}
                  value={label}
                  onSelect={() => go(href)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 cursor-pointer
                             data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-700 opacity-0 data-[selected=true]:opacity-100" />
                </Command.Item>
              ))}
            </Command.Group>

            {/* Quick actions */}
            <Command.Group heading={<GroupLabel>Actions</GroupLabel>}>
              <Command.Item
                value="import session upload"
                onSelect={() => go("/upload")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 cursor-pointer
                           data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="flex-1">Import session</span>
              </Command.Item>
              <Command.Item
                value="recalculate metrics scores"
                onSelect={async () => {
                  setOpen(false)
                  await fetch("/api/import/recalculate", { method: "POST" })
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 cursor-pointer
                           data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="flex-1">Recalculate metrics</span>
              </Command.Item>
            </Command.Group>

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <Command.Group heading={<GroupLabel>Recent sessions</GroupLabel>}>
                {recentSessions.map((s) => (
                  <Command.Item
                    key={s.id}
                    value={`${s.trackName} ${s.carName} ${SESSION_TYPE_SHORT[s.sessionType] ?? s.sessionType}`}
                    onSelect={() => go(`/sessions/${s.id}`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer
                               data-[selected=true]:bg-zinc-800 transition-colors"
                  >
                    <Film className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-zinc-200 truncate">{s.trackName}</span>
                      <span className="text-zinc-600 mx-1.5">·</span>
                      <span className="text-zinc-500 text-xs truncate">{s.carName}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {SESSION_TYPE_SHORT[s.sessionType] ?? s.sessionType}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-800/60 text-[11px] text-zinc-600">
            <span className="flex items-center gap-1">
              <kbd className="border border-zinc-700 rounded px-1 py-0.5 font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-zinc-700 rounded px-1 py-0.5 font-mono">↵</kbd> open
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <kbd className="border border-zinc-700 rounded px-1 py-0.5 font-mono">⌘K</kbd> toggle
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 block">
      {children}
    </span>
  )
}
