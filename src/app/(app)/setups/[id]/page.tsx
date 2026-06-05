import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { formatDistanceToNow } from "date-fns"
import {
  Wrench, ChevronLeft, Star, Map, Car,
  Flag, FileText, GitBranch, ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { SetupActions } from "@/features/setups/SetupActions"
import { AddVersionForm } from "@/features/setups/AddVersionForm"

export default async function SetupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params

  const setup = await db.setup.findUnique({
    where: { id },
    include: {
      simulator: { select: { name: true } },
      car:       { select: { name: true, slug: true } },
      track:     { select: { name: true, slug: true } },
      versions:  { orderBy: { version: "desc" } },
      sessions:  {
        include: {
          session: {
            select: {
              id: true, sessionDate: true, sessionType: true,
              bestLapMs: true, totalLaps: true, consistencyScore: true, isNewPB: true,
              track: { select: { name: true } },
              car:   { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!setup || setup.userId !== session.user.id) notFound()

  const latestVersion = setup.versions[0]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back nav */}
      <Link
        href="/setups"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Setups
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Wrench className="w-4.5 h-4.5 text-zinc-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">{setup.name}</h1>
              {setup.isFavorite && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span>{setup.simulator.name}</span>
              {setup.type && <span className="capitalize">{setup.type}</span>}
              {setup.conditions && <span className="capitalize">{setup.conditions}</span>}
              <span>Updated {formatDistanceToNow(setup.updatedAt, { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        <SetupActions setupId={setup.id} isFavorite={setup.isFavorite} />
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Car,      label: "Car",      value: setup.car?.name   ?? "Any car",      href: setup.car   ? `/cars/${setup.car.slug}`     : undefined },
          { icon: Map,      label: "Circuit",  value: setup.track?.name ?? "Any circuit",  href: setup.track ? `/tracks/${setup.track.slug}` : undefined },
          { icon: GitBranch,label: "Versions", value: setup.versions.length },
          { icon: Flag,     label: "Sessions", value: setup.sessions.length },
        ].map(({ icon: Icon, label, value, href }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="w-3 h-3 text-zinc-600" />
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{label}</span>
            </div>
            {href ? (
              <Link href={href} className="text-sm font-semibold text-zinc-200 hover:text-cyan-400 transition-colors truncate block">
                {value}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-zinc-200 truncate">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {setup.notes && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</span>
          </div>
          <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{setup.notes}</p>
        </div>
      )}

      {/* Version history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            Version history
          </h2>
        </div>

        {setup.versions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-5 text-center text-sm text-zinc-600">
            No versions yet — add one below to track setup changes over time.
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/50">
            {setup.versions.map((v) => (
              <div key={v.id} className="flex items-start gap-4 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <span className="text-xs font-mono font-bold text-zinc-400">v{v.version}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {v.notes ? (
                    <p className="text-sm text-zinc-300">{v.notes}</p>
                  ) : (
                    <p className="text-sm text-zinc-600 italic">No notes</p>
                  )}
                  <p className="text-[11px] text-zinc-600 mt-1">
                    {formatDistanceToNow(v.createdAt, { addSuffix: true })}
                  </p>
                </div>
                {v === latestVersion && (
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-medium shrink-0">
                    Latest
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add version */}
        <div className="mt-3">
          <AddVersionForm setupId={setup.id} nextVersion={(latestVersion?.version ?? 0) + 1} />
        </div>
      </div>

      {/* Sessions using this setup */}
      {setup.sessions.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
            <Flag className="w-3.5 h-3.5" />
            Sessions with this setup
          </h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/50">
            {setup.sessions.map(({ session: s }) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {s.track.name}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {s.sessionType} · {s.car.name}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs shrink-0">
                  {s.bestLapMs != null && (
                    <span className="font-mono text-zinc-300">{formatLapTime(s.bestLapMs)}</span>
                  )}
                  {s.isNewPB && (
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">PB</span>
                  )}
                  <span className="text-zinc-600">
                    {new Date(s.sessionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
