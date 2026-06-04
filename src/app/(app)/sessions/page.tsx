import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS } from "@/lib/constants"
import { EmptyState } from "@/components/shared/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Upload, Flag } from "lucide-react"
import Link from "next/link"
import type { SessionType } from "@prisma/client"

interface SearchParams {
  type?: string
  page?: string
}

const PER_PAGE = 20

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const userId = session.user.id
  const page = Math.max(1, parseInt(params.page ?? "1"))
  const typeFilter = params.type as SessionType | undefined

  const where = {
    userId,
    deletedAt: null,
    ...(typeFilter ? { sessionType: typeFilter } : {}),
  }

  const [sessions, total] = await Promise.all([
    db.session.findMany({
      where,
      orderBy: { sessionDate: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        track: { select: { name: true, slug: true } },
        car: { select: { name: true, slug: true } },
        simulator: { select: { slug: true, name: true } },
      },
    }),
    db.session.count({ where }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)
  const types: SessionType[] = ["PRACTICE", "QUALIFYING", "RACE", "HOTLAP", "TIME_TRIAL"]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Sessions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} session{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip label="All" href="/sessions" active={!typeFilter} />
        {types.map((t) => (
          <FilterChip
            key={t}
            label={SESSION_TYPE_LABELS[t] ?? t}
            href={`/sessions?type=${t}`}
            active={typeFilter === t}
          />
        ))}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={total === 0 ? Upload : Flag}
          title={total === 0 ? "No sessions yet" : "No sessions match this filter"}
          description={
            total === 0
              ? "Import your first XML result file to start tracking your performance."
              : "Try removing the filter to see all sessions."
          }
          action={total === 0 ? { label: "Upload session", href: "/upload" } : undefined}
        />
      ) : (
        <>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  {["Date", "Sim", "Track", "Car", "Type", "Pos", "Laps", "Best lap", "Cons.", "Safety"].map(
                    (h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-zinc-800/40 transition-colors group"
                  >
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      <Link href={`/sessions/${s.id}`} className="hover:text-zinc-200 transition-colors">
                        {new Date(s.sessionDate).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "2-digit",
                        })}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-600 uppercase tracking-wide">
                        {s.simulator.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-200 max-w-36 truncate">
                      <Link href={`/tracks/${s.track.slug}`} className="hover:text-cyan-400 transition-colors">
                        {s.track.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 max-w-32 truncate">
                      <Link href={`/cars/${s.car.slug}`} className="hover:text-cyan-400 transition-colors">
                        {s.car.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={s.sessionType} />
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono">
                      {s.finalPosition != null ? `P${s.finalPosition}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono">{s.totalLaps}</td>
                    <td className="px-4 py-3 font-mono text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {formatLapTime(s.bestLapMs)}
                        {s.isNewPB && (
                          <span className="text-[10px] text-cyan-400 font-sans">PB</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreCell value={s.consistencyScore} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreCell value={s.safetyScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/sessions?${typeFilter ? `type=${typeFilter}&` : ""}page=${page - 1}`}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    ← Prev
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/sessions?${typeFilter ? `type=${typeFilter}&` : ""}page=${page + 1}`}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
      }`}
    >
      {label}
    </Link>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    RACE: "bg-orange-950/60 text-orange-400",
    QUALIFYING: "bg-cyan-950/60 text-cyan-400",
    PRACTICE: "bg-zinc-800 text-zinc-400",
    HOTLAP: "bg-purple-950/60 text-purple-400",
    TIME_TRIAL: "bg-purple-950/60 text-purple-400",
  }
  return (
    <Badge className={`text-[10px] h-4 px-1.5 border-0 ${colors[type] ?? "bg-zinc-800 text-zinc-500"}`}>
      {SESSION_TYPE_LABELS[type] ?? type}
    </Badge>
  )
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-600">—</span>
  const color =
    value >= 90 ? "text-green-400" :
    value >= 75 ? "text-lime-400" :
    value >= 60 ? "text-yellow-400" :
    value >= 40 ? "text-orange-400" : "text-red-400"
  return <span className={`font-mono ${color}`}>{value.toFixed(0)}</span>
}
