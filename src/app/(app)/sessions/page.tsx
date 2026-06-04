import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS } from "@/lib/constants"
import { EmptyState } from "@/components/shared/EmptyState"
import { Upload, Flag, ArrowLeft, ArrowRight, GitCompare } from "lucide-react"
import Link from "next/link"
import type { SessionType } from "@prisma/client"

interface SearchParams {
  type?: string
  page?: string
}

const PER_PAGE = 20

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  RACE:        { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  QUALIFYING:  { bg: "bg-cyan-500/10",   text: "text-cyan-400",   dot: "bg-cyan-400" },
  PRACTICE:    { bg: "bg-zinc-700/40",   text: "text-zinc-400",   dot: "bg-zinc-500" },
  HOTLAP:      { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400" },
  TIME_TRIAL:  { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400" },
}

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Sessions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {total} session{total !== 1 ? "s" : ""}
            {typeFilter ? ` · filtered by ${SESSION_TYPE_LABELS[typeFilter] ?? typeFilter}` : ""}
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700"
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </Link>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip label="All" href="/sessions" active={!typeFilter} count={total} />
        {types.map((t) => (
          <FilterChip
            key={t}
            label={SESSION_TYPE_LABELS[t] ?? t}
            href={`/sessions?type=${t}`}
            active={typeFilter === t}
            color={TYPE_COLORS[t]}
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  {[
                    { label: "Date", w: "" },
                    { label: "Track", w: "" },
                    { label: "Car", w: "" },
                    { label: "Type", w: "w-24" },
                    { label: "Pos", w: "w-12" },
                    { label: "Laps", w: "w-12" },
                    { label: "Best lap", w: "w-24" },
                    { label: "Cons.", w: "w-14" },
                    { label: "Safety", w: "w-14" },
                    { label: "", w: "w-10" },
                  ].map(({ label, w }) => (
                    <th key={label} className={`text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ${w}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const tc = TYPE_COLORS[s.sessionType]
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group ${i === sessions.length - 1 ? "border-b-0" : ""}`}
                    >
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                        <Link href={`/sessions/${s.id}`} className="hover:text-zinc-300 transition-colors font-medium">
                          {new Date(s.sessionDate).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "2-digit",
                          })}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tracks/${s.track.slug}`} className="font-medium text-zinc-200 hover:text-cyan-400 transition-colors">
                          {s.track.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 max-w-32 truncate">
                        <Link href={`/cars/${s.car.slug}`} className="hover:text-cyan-400 transition-colors text-xs">
                          {s.car.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${tc?.bg ?? "bg-zinc-800"} ${tc?.text ?? "text-zinc-400"}`}>
                          <span className={`w-1 h-1 rounded-full shrink-0 ${tc?.dot ?? "bg-zinc-500"}`} />
                          {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 font-mono text-xs">
                        {s.finalPosition != null ? <span className="font-semibold">P{s.finalPosition}</span> : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{s.totalLaps}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-zinc-200 text-xs tabular-nums">{formatLapTime(s.bestLapMs)}</span>
                          {s.isNewPB && (
                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1 py-0.5 rounded">PB</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreCell value={s.consistencyScore} />
                      </td>
                      <td className="px-4 py-3">
                        <ScoreCell value={s.safetyScore} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/sessions/compare?a=${s.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-cyan-400"
                          title="Compare this session"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`/sessions?${typeFilter ? `type=${typeFilter}&` : ""}page=${page - 1}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Prev
                  </Link>
                ) : <div />}
                {page < totalPages && (
                  <Link
                    href={`/sessions?${typeFilter ? `type=${typeFilter}&` : ""}page=${page + 1}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
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

function FilterChip({
  label,
  href,
  active,
  count,
  color,
}: {
  label: string
  href: string
  active: boolean
  count?: number
  color?: { bg: string; text: string; dot: string }
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
          : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
      }`}
    >
      {color && <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-cyan-400" : color.dot}`} />}
      {label}
      {count !== undefined && (
        <span className={`ml-0.5 ${active ? "text-cyan-500" : "text-zinc-600"}`}>{count}</span>
      )}
    </Link>
  )
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-700 text-xs">—</span>
  const color =
    value >= 90 ? "text-green-400" :
    value >= 75 ? "text-lime-400" :
    value >= 60 ? "text-yellow-400" :
    value >= 40 ? "text-orange-400" : "text-red-400"
  return <span className={`font-mono text-xs font-semibold ${color}`}>{value.toFixed(0)}</span>
}
