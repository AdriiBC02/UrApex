"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2, AlertCircle, Copy, Clock, ArrowRight, Trash2, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { toast } from "sonner"

interface ImportEntry {
  id: string
  originalName: string
  status: string
  createdAt: Date
  simulator: { name: string } | null
  session: { id: string } | null
  errorMessage: string | null
}

interface ImportHistoryProps {
  imports: ImportEntry[]
}

export function ImportHistory({ imports: initial }: ImportHistoryProps) {
  const [imports, setImports] = useState(initial)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [retrying, setRetrying] = useState<Set<string>>(new Set())

  async function handleDelete(id: string) {
    setDeleting((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/import/${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Could not delete import")
        return
      }
      setImports((prev) => prev.filter((i) => i.id !== id))
      toast.success("Import deleted")
    } catch {
      toast.error("Network error")
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleRetry(id: string) {
    setRetrying((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/import/${id}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Retry failed")
        return
      }
      setImports((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: data.status, session: data.sessionId ? { id: data.sessionId } : i.session }
            : i
        )
      )
      if (data.status === "IMPORTED") toast.success("Import succeeded")
      else toast.error("Import still failed — check driver name in settings")
    } catch {
      toast.error("Network error")
    } finally {
      setRetrying((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  if (imports.length === 0) return null

  return (
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
                  <span className="text-[11px] text-zinc-600 font-medium uppercase tracking-wide">
                    {imp.simulator.name}
                  </span>
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

            {imp.status === "FAILED" && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleRetry(imp.id)}
                  disabled={retrying.has(imp.id) || deleting.has(imp.id)}
                  title="Retry import"
                  className="p-1.5 rounded text-zinc-600 hover:text-cyan-400 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  {retrying.has(imp.id) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(imp.id)}
                  disabled={deleting.has(imp.id) || retrying.has(imp.id)}
                  title="Delete import"
                  className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  {deleting.has(imp.id) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === "IMPORTED")  return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
  if (status === "FAILED")    return <AlertCircle  className="w-4 h-4 text-red-400 shrink-0" />
  if (status === "DUPLICATE") return <Copy         className="w-4 h-4 text-zinc-500 shrink-0" />
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
