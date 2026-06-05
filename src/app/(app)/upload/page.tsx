import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { UploadPageClient } from "@/features/import/UploadPageClient"
import { ImportHistory } from "@/features/import/ImportHistory"
import { ReplayUploadSection } from "@/features/replays/ReplayUploadSection"
import { Settings, Film } from "lucide-react"
import Link from "next/link"

export default async function UploadPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [imports, profile, recentSessions] = await Promise.all([
    db.importFile.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    30,
      include: { session: { select: { id: true } }, simulator: { select: { name: true } } },
    }),
    db.driverProfile.findUnique({
      where:  { userId: session.user.id },
      select: { simDriverName: true },
    }),
    db.session.findMany({
      where:   { userId: session.user.id, deletedAt: null },
      orderBy: { sessionDate: "desc" },
      take:    50,
      include: { track: { select: { name: true } }, car: { select: { name: true } } },
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Import sessions</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Drop your Le Mans Ultimate XML result files to import sessions.
        </p>
      </div>

      {/* Driver name banner */}
      {profile?.simDriverName ? (
        <div className="max-w-2xl flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm">
          <span className="text-zinc-500">Importing as</span>
          <span className="text-zinc-100 font-semibold font-mono">{profile.simDriverName}</span>
          <Link href="/settings#simulator" className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
            <Settings className="w-3.5 h-3.5" />Change
          </Link>
        </div>
      ) : (
        <div className="max-w-2xl flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-900/40 bg-amber-950/20 text-sm">
          <span className="text-amber-400 font-medium">Driver not configured</span>
          <span className="text-zinc-500">— you&apos;ll be asked to select your name when importing.</span>
          <Link href="/settings#simulator" className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
            <Settings className="w-3.5 h-3.5" />Set now
          </Link>
        </div>
      )}

      {/* Upload zone + post-session modal */}
      <div className="max-w-2xl">
        <UploadPageClient />
      </div>

      {/* Replay upload */}
      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-zinc-500" />
          <h2 className="text-base font-semibold text-zinc-200">Upload replay</h2>
          <span className="text-xs text-zinc-600">.vcr</span>
        </div>
        <ReplayUploadSection
          sessions={recentSessions.map((s) => ({
            id:          s.id,
            sessionType: s.sessionType,
            sessionDate: s.sessionDate.toISOString(),
            trackName:   s.track.name,
            carName:     s.car.name,
          }))}
        />
      </div>

      <ImportHistory imports={imports.map((imp) => ({ ...imp, errorMessage: imp.errorMessage ?? null }))} />
    </div>
  )
}
