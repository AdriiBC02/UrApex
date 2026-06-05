"use client"

import { useState } from "react"
import { Film, Trash2, Download, Loader2, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { SESSION_TYPE_LABELS } from "@/lib/constants"

interface ReplayRow {
  id:            string
  originalName:  string
  fileSizeBytes: string
  createdAt:     string
  session: {
    id:          string
    sessionType: string
    sessionDate: string
    trackName:   string
  }
}

interface StorageFileListProps {
  rows: ReplayRow[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024)        return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function StorageFileList({ rows: initial }: StorageFileListProps) {
  const [rows, setRows]           = useState<ReplayRow[]>(initial)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/replays/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Delete failed"); return }
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success("Replay deleted")
    } catch {
      toast.error("Network error")
    } finally {
      setDeleting(null)
    }
  }

  async function handleDownload(id: string, name: string) {
    setDownloading(id)
    try {
      const res  = await fetch(`/api/replays/${id}/download`)
      if (!res.ok) { toast.error("Download failed"); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Network error")
    } finally {
      setDownloading(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
        <Film className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">No replays uploaded yet.</p>
        <p className="text-xs text-zinc-600 mt-1">Open a session and upload a .vcr file to store it here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_140px_130px_100px_80px] gap-4 px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 min-w-[580px]">
        <span>File</span>
        <span>Session</span>
        <span>Track</span>
        <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" />Size</span>
        <span />
      </div>

      <div className="divide-y divide-zinc-800/50 min-w-[580px]">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_140px_130px_100px_80px] gap-4 items-center px-4 py-3 hover:bg-zinc-800/30 transition-colors">
            {/* File */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Film className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <p className="text-xs font-mono text-zinc-300 truncate">{r.originalName}</p>
            </div>

            {/* Session */}
            <Link
              href={`/sessions/${r.session.id}`}
              className="text-xs text-zinc-400 hover:text-cyan-400 transition-colors truncate"
            >
              {SESSION_TYPE_LABELS[r.session.sessionType as keyof typeof SESSION_TYPE_LABELS] ?? r.session.sessionType}
              <span className="text-zinc-600 ml-1">
                {new Date(r.session.sessionDate).toLocaleDateString()}
              </span>
            </Link>

            {/* Track */}
            <p className="text-xs text-zinc-500 truncate">{r.session.trackName}</p>

            {/* Size */}
            <p className="text-xs font-mono text-zinc-400">
              {formatBytes(Number(r.fileSizeBytes))}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={() => handleDownload(r.id, r.originalName)}
                disabled={!!downloading}
                className="p-1.5 rounded text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                title="Download"
              >
                {downloading === r.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />
                }
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={!!deleting}
                className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                title="Delete"
              >
                {deleting === r.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
