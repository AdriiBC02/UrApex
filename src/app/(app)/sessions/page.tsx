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
  online?: string
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

  const typeFilter   = params.type as SessionType | undefined
  const sortParam    = params.sort
  const trackSlug    = params.track
  const carSlug      = params.car
  const pbOnly       = params.pb === "1"
  const fromDate     = params.from ? new Date(params.from) : undefined
  const toDate       = params.to   ? new Date(params.to + "T23:59:59Z") : undefined
  const onlineFilter = params.online // "1" = online only, "0" = AI only, undefined = all

  const activeFilters = [typeFilter, trackSlug, carSlug, pbOnly || undefined, fromDate, toDate, onlineFilter].filter(Boolean).length

  const where: Prisma.SessionWhereInput = {
    userId,
    deletedAt: null,
    ...(typeFilter ? { sessionType: typeFilter } : {}),
    ...(pbOnly ? { isNewPB: true } : {}),
    ...(fromDate || toDate ? { sessionDate: { gte: fromDate, lte: toDate } } : {}),
    ...(trackSlug ? { track: { slug: trackSlug } } : {}),
    ...(carSlug   ? { car:   { slug: carSlug } }   : {}),
    ...(onlineFilter === "1" ? { isOnline: true }  : {}),
    ...(onlineFilter === "0" ? { isOnline: false } : {}),
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
    ...(typeFilter    ? { type: typeFilter }      : {}),
    ...(sortParam     ? { sort: sortParam }       : {}),
    ...(trackSlug     ? { track: trackSlug }      : {}),
    ...(carSlug       ? { car: carSlug }          : {}),
    ...(pbOnly        ? { pb: "1" }              : {}),
    ...(params.from   ? { from: params.from }    : {}),
    ...(params.to     ? { to: params.to }        : {}),
    ...(onlineFilter  ? { online: onlineFilter } : {}),
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
          type:   typeFilter,
          sort:   sortParam,
          track:  trackSlug,
          car:    carSlug,
          pb:     params.pb,
          from:   params.from,
          to:     params.to,
          online: onlineFilter,
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map((s) => {
              const tc   = TYPE_COLORS[s.sessionType]
              const date = new Date(s.sessionDate)
              const posColor =
                s.finalPosition === 1 ? "text-yellow-400" :
                s.finalPosition != null && s.finalPosition <= 3 ? "text-orange-400" : "text-zinc-200"

              return (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all overflow-hidden"
                >
                  {/* Top accent */}
                  <div className={`h-[2px] w-full ${
                    s.sessionType === "RACE"       ? "bg-orange-500/50" :
                    s.sessionType === "QUALIFYING" ? "bg-cyan-500/50"   :
                    s.sessionType === "HOTLAP" || s.sessionType === "TIME_TRIAL" ? "bg-purple-500/50" :
                    "bg-zinc-700/40"
                  }`} />

                  <div className="p-4">
                    {/* Row 1: type badge + date + position */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${tc?.bg ?? "bg-zinc-800"} ${tc?.text ?? "text-zinc-400"}`}>
                          <span className={`w-1 h-1 rounded-full ${tc?.dot ?? "bg-zinc-500"}`} />
                          {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                        </span>
                        {s.isNewPB && (
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">PB</span>
                        )}
                        {s.dnf && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">DNF</span>
                        )}
                        {s.sessionType === "RACE" && (
                          s.isOnline
                            ? <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">MP</span>
                            : <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 px-1.5 py-0.5 rounded">AI</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {s.finalPosition != null && (
                          <span className={`font-mono text-sm font-bold tabular-nums ${posColor}`}>
                            P{s.finalPosition}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">
                          {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: track name */}
                    <div className="font-bold text-zinc-100 text-base leading-tight mb-1 group-hover:text-white transition-colors">
                      {s.track.name}
                    </div>
                    <div className="text-xs text-zinc-500 mb-3 truncate">{s.car.name}</div>

                    {/* Row 3: stats strip */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                      <div className="flex items-center gap-4">
                        {/* Best lap */}
                        <div>
                          <div className="text-[10px] text-zinc-600 mb-0.5">Best lap</div>
                          <div className="font-mono text-sm font-semibold text-zinc-200 tabular-nums">
                            {formatLapTime(s.bestLapMs)}
                          </div>
                        </div>
                        {/* Consistency */}
                        {s.consistencyScore != null && (
                          <div>
                            <div className="text-[10px] text-zinc-600 mb-0.5">Cons.</div>
                            <ScoreCell value={s.consistencyScore} size="sm" />
                          </div>
                        )}
                        {/* Safety */}
                        {s.safetyScore != null && (
                          <div>
                            <div className="text-[10px] text-zinc-600 mb-0.5">Safety</div>
                            <ScoreCell value={s.safetyScore} size="sm" />
                          </div>
                        )}
                      </div>
                      {/* Right: laps + replay + compare */}
                      <div className="flex items-center gap-3 text-zinc-600">
                        <span className="text-xs tabular-nums">{s.totalLaps}L</span>
                        {s._count.replays > 0 && (
                          <Film className="w-3 h-3 text-zinc-600" />
                        )}
                        <GitCompare className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
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

function ScoreCell({ value, size = "md" }: { value: number | null; size?: "sm" | "md" }) {
  if (value === null) return <span className="text-zinc-700 text-xs">—</span>
  const color =
    value >= 90 ? "text-green-400" :
    value >= 75 ? "text-lime-400" :
    value >= 60 ? "text-yellow-400" :
    value >= 40 ? "text-orange-400" : "text-red-400"
  return <span className={`font-mono font-semibold ${color} ${size === "sm" ? "text-sm" : "text-xs"}`}>{value.toFixed(0)}</span>
}
