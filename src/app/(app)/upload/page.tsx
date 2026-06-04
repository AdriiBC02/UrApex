import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { UploadZone } from "@/features/import/UploadZone"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2, AlertCircle, Copy, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function UploadPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const imports = await db.importFile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { session: { select: { id: true } }, simulator: { select: { name: true } } },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Import sessions</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Drop your Le Mans Ultimate XML result files to import sessions.
        </p>
      </div>

      {/* Upload zone */}
      <div className="max-w-2xl">
        <UploadZone />
      </div>

      {/* Import history */}
      {imports.length > 0 && (
        <div className="max-w-2xl space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Import history</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/60">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
              >
                <StatusIcon status={imp.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 font-mono truncate">{imp.originalName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {imp.simulator && (
                      <span className="text-[11px] text-zinc-600 font-medium uppercase tracking-wide">{imp.simulator.name}</span>
                    )}
                    <span className="text-[11px] text-zinc-700">
                      {formatDistanceToNow(imp.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <ImportStatusBadge status={imp.status} />
                {imp.session?.id && (
                  <Link
                    href={`/sessions/${imp.session.id}`}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400 transition-colors shrink-0"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === "IMPORTED") return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
  if (status === "FAILED") return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
  if (status === "DUPLICATE") return <Copy className="w-4 h-4 text-zinc-500 shrink-0" />
  return <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
}

function ImportStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING:   { label: "Pending",   className: "bg-yellow-950/60 text-yellow-500 border-yellow-900/40" },
    PARSING:   { label: "Parsing",   className: "bg-blue-950/60 text-blue-400 border-blue-900/40" },
    IMPORTED:  { label: "Imported",  className: "bg-green-950/60 text-green-400 border-green-900/40" },
    FAILED:    { label: "Failed",    className: "bg-red-950/60 text-red-400 border-red-900/40" },
    DUPLICATE: { label: "Duplicate", className: "bg-zinc-800/80 text-zinc-500 border-zinc-700/40" },
  }
  const { label, className } = map[status] ?? { label: status, className: "bg-zinc-800 text-zinc-400 border-zinc-700" }
  return (
    <Badge className={`text-[10px] h-5 px-2 border shrink-0 font-medium ${className}`}>
      {label}
    </Badge>
  )
}
