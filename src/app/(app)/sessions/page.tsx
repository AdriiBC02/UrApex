import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { SESSION_TYPE_LABELS } from "@/lib/constants"
import { EmptyState } from "@/components/shared/EmptyState"
import { SessionFilters } from "@/features/sessions/SessionFilters"
import { Upload, Flag, GitCompare, ArrowLeft, ArrowRight, Film } from "lucide-react"
import Link from "next/link"
import type { SessionType, Prisma } from "@prisma/client"

interface SearchParams {
  type?: string
  sort?: string
  track?: string
  car?: string
  pb?: string
  from?: string
  to?: string
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

function buildOrderBy(sort?: string): Prisma.SessionOrderByWithRelationInput {
  switch (sort) {
    case "date_asc":          return { sessionDate: "asc" }
    case "best_lap_asc":      return { bestLapMs: "asc" }
    case "consistency_desc":  return { consistencyScore: "desc" }
    default:                  return { sessionDate: "desc" }
  }
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

  const typeFilter  = params.type as SessionType | undefined
  const sortParam   = params.sort
  const trackSlug   = params.track
  const carSlug     = params.car
  const pbOnly      = params.pb === "1"
  const fromDate    = params.from ? new Date(params.from) : undefined
  const toDate      = params.to   ? new Date(params.to + "T23:59:59Z") : undefined

  const activeFilters = [typeFilter, trackSlug, carSlug, pbOnly || undefined, fromDate, toDate].filter(Boolean).length

  const where: Prisma.SessionWhereInput = {
    userId,
    deletedAt: null,
    ...(typeFilter ? { sessionType: typeFilter } : {}),
    ...(pbOnly ? { isNewPB: true } : {}),
    ...(fromDate || toDate ? { sessionDate: { gte: fromDate, lte: toDate } } : {}),
    ...(trackSlug ? { track: { slug: trackSlug } } : {}),
    ...(carSlug   ? { car:   { slug: carSlug } }   : {}),
  }

  const [sessions, total, userTracks, userCars] = await Promise.all([
    db.session.findMany({
      where,
      orderBy: buildOrderBy(sortParam),
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        track: { select: { name: true, slug: true } },
        car:   { select: { name: true, slug: true } },
        simulator: { select: { slug: true, name: true } },
        _count: { select: { replays: true } },
      },
    }),
    db.session.count({ where }),
    // Distinct tracks this user has driven
    db.track.findMany({
      where: { sessions: { some: { userId, deletedAt: null } } },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Distinct cars this user has driven
    db.car.findMany({
      where: { sessions: { some: { userId, deletedAt: null } } },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  const paginationBase = new URLSearchParams({
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(sortParam ? { sort: sortParam } : {}),
    ...(trackSlug ? { track: trackSlug } : {}),
    ...(carSlug ? { car: carSlug } : {}),
    ...(pbOnly ? { pb: "1" } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
  }).toString()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Sessions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {total} session{total !== 1 ? "s" : ""}
            {activeFilters > 0 ? ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active` : ""}
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

      {/* Filters */}
      <SessionFilters
        tracks={userTracks.map((t) => ({ value: t.slug, label: t.name }))}
        cars={userCars.map((c) => ({ value: c.slug, label: c.name }))}
        current={{
          type: typeFilter,
          sort: sortParam,
          track: trackSlug,
          car: carSlug,
          pb: params.pb,
          from: params.from,
          to: params.to,
        }}
        totalActive={activeFilters}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={total === 0 ? Upload : Flag}
          title={total === 0 ? "No sessions yet" : "No sessions match these filters"}
          description={
            total === 0
              ? "Import your first XML result file to start tracking your performance."
              : "Try changing or clearing the filters."
          }
          action={total === 0 ? { label: "Upload session", href: "/upload" } : undefined}
        />
      ) : (
        <>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
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
                    { label: "", w: "w-6" },
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
                      <td className="px-4 py-3"><ScoreCell value={s.consistencyScore} /></td>
                      <td className="px-4 py-3"><ScoreCell value={s.safetyScore} /></td>
                      <td className="px-4 py-3">
                        {s._count.replays > 0 && (
                          <Link href={`/sessions/${s.id}`} title={`${s._count.replays} replay${s._count.replays > 1 ? "s" : ""}`}>
                            <Film className="w-3.5 h-3.5 text-zinc-500 hover:text-cyan-400 transition-colors" />
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/sessions/compare?a=${s.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-cyan-400"
                          title="Compare"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`/sessions?${paginationBase ? paginationBase + "&" : ""}page=${page - 1}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Prev
                  </Link>
                ) : <div />}
                {page < totalPages && (
                  <Link
                    href={`/sessions?${paginationBase ? paginationBase + "&" : ""}page=${page + 1}`}
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

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-700 text-xs">—</span>
  const color =
    value >= 90 ? "text-green-400" :
    value >= 75 ? "text-lime-400" :
    value >= 60 ? "text-yellow-400" :
    value >= 40 ? "text-orange-400" : "text-red-400"
  return <span className={`font-mono text-xs font-semibold ${color}`}>{value.toFixed(0)}</span>
}
