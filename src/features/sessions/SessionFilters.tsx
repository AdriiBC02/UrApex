"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { SlidersHorizontal, ArrowUpDown, Trophy, Calendar, X } from "lucide-react"

interface FilterOption { value: string; label: string }

interface SessionFiltersProps {
  tracks: FilterOption[]
  cars: FilterOption[]
  current: {
    type?: string
    sort?: string
    track?: string
    car?: string
    pb?: string
    from?: string
    to?: string
  }
  totalActive: number
}

const SESSION_TYPES: FilterOption[] = [
  { value: "", label: "All" },
  { value: "PRACTICE", label: "Practice" },
  { value: "QUALIFYING", label: "Qualifying" },
  { value: "RACE", label: "Race" },
  { value: "HOTLAP", label: "Hot lap" },
]

const SORT_OPTIONS: FilterOption[] = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "best_lap_asc", label: "Best lap ↑" },
  { value: "consistency_desc", label: "Consistency ↓" },
]

export function SessionFilters({ tracks, cars, current, totalActive }: SessionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page") // reset pagination on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [pathname, router, searchParams])

  const clearAll = () => {
    startTransition(() => { router.push(pathname) })
  }

  return (
    <div className="space-y-3">
      {/* Row 1: type chips + pb toggle + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        {SESSION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => update("type", t.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              current.type === t.value || (!current.type && !t.value)
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {/* PB only toggle */}
        <button
          onClick={() => update("pb", current.pb ? "" : "1")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            current.pb
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
          }`}
        >
          <Trophy className="w-3 h-3" />
          PB sessions
        </button>

        {totalActive > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-red-400 transition-colors border border-transparent hover:border-zinc-800"
          >
            <X className="w-3 h-3" /> Clear ({totalActive})
          </button>
        )}
      </div>

      {/* Row 2: dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Track */}
        {tracks.length > 0 && (
          <select
            value={current.track ?? ""}
            onChange={(e) => update("track", e.target.value)}
            className={`text-xs rounded-lg border px-2.5 py-1.5 bg-zinc-900 transition-colors appearance-none cursor-pointer pr-6 ${
              current.track
                ? "border-cyan-500/30 text-cyan-400"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
            }`}
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2352525b'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            <option value="">All tracks</option>
            {tracks.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}

        {/* Car */}
        {cars.length > 0 && (
          <select
            value={current.car ?? ""}
            onChange={(e) => update("car", e.target.value)}
            className={`text-xs rounded-lg border px-2.5 py-1.5 bg-zinc-900 transition-colors appearance-none cursor-pointer pr-6 ${
              current.car
                ? "border-cyan-500/30 text-cyan-400"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
            }`}
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2352525b'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            <option value="">All cars</option>
            {cars.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}

        {/* Date from */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-zinc-600" />
          <input
            type="date"
            value={current.from ?? ""}
            onChange={(e) => update("from", e.target.value)}
            className={`text-xs rounded-lg border px-2 py-1.5 bg-zinc-900 transition-colors ${
              current.from ? "border-cyan-500/30 text-cyan-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
            }`}
          />
          <span className="text-xs text-zinc-700">→</span>
          <input
            type="date"
            value={current.to ?? ""}
            onChange={(e) => update("to", e.target.value)}
            className={`text-xs rounded-lg border px-2 py-1.5 bg-zinc-900 transition-colors ${
              current.to ? "border-cyan-500/30 text-cyan-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
            }`}
          />
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-0.5" />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3 h-3 text-zinc-600" />
          <select
            value={current.sort ?? "date_desc"}
            onChange={(e) => update("sort", e.target.value)}
            className="text-xs rounded-lg border border-zinc-800 px-2.5 py-1.5 bg-zinc-900 text-zinc-500 hover:border-zinc-700 transition-colors appearance-none cursor-pointer pr-6"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2352525b'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
