import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { HardDrive } from "lucide-react"
import { SESSION_TYPE_LABELS } from "@/lib/constants"
import { StorageFileList } from "@/features/replays/StorageFileList"

function formatBytes(bytes: bigint): string {
  const n = Number(bytes)
  if (n < 1024 * 1024)       return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default async function StoragePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const replays = await db.replay.findMany({
    where:   { userId: session.user.id },
    orderBy: { fileSizeBytes: "desc" },
    include: {
      session: {
        select: {
          id:          true,
          sessionType: true,
          sessionDate: true,
          track:       { select: { name: true } },
        },
      },
    },
  })

  const totalBytes = replays.reduce((sum, r) => sum + r.fileSizeBytes, BigInt(0))

  // Soft reference point: R2 free tier 10 GB
  const FREE_TIER_BYTES = BigInt(10 * 1024 * 1024 * 1024)
  const usedPct = totalBytes === BigInt(0)
    ? 0
    : Math.min(100, Number((totalBytes * BigInt(1000)) / FREE_TIER_BYTES) / 10)

  const barColor =
    usedPct >= 90 ? "bg-red-500" :
    usedPct >= 70 ? "bg-amber-500" :
    "bg-cyan-500"

  const rows = replays.map((r) => ({
    id:            r.id,
    originalName:  r.originalName,
    fileSizeBytes: r.fileSizeBytes.toString(),
    createdAt:     r.createdAt.toISOString(),
    session: {
      id:          r.session.id,
      sessionType: r.session.sessionType,
      sessionDate: r.session.sessionDate.toISOString(),
      trackName:   r.session.track.name,
    },
  }))

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HardDrive className="w-5 h-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Storage</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Replay files stored in the cloud</p>
        </div>
      </div>

      {/* Usage card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-zinc-100">{formatBytes(totalBytes)}</p>
            <p className="text-sm text-zinc-500 mt-0.5">
              of 10 GB free tier used · {replays.length} file{replays.length !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="text-sm font-medium text-zinc-400">{usedPct.toFixed(1)}%</p>
        </div>

        {/* Bar */}
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.max(usedPct, usedPct > 0 ? 0.5 : 0)}%` }}
          />
        </div>

        {usedPct >= 80 && (
          <p className="text-xs text-amber-400">
            Approaching free tier limit. Beyond 10 GB, Cloudflare R2 charges $0.015/GB.
          </p>
        )}
      </div>

      {/* File list */}
      <StorageFileList rows={rows} />
    </div>
  )
}
