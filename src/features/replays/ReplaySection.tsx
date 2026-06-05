"use client"

import { useRef, useState, useTransition } from "react"
import { Film, Upload, Download, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ReplayEntry {
  id:            string
  originalName:  string
  fileSizeBytes: string
  createdAt:     string
}

interface ReplaySectionProps {
  sessionId: string
  initial:   ReplayEntry[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ReplaySection({ sessionId, initial }: ReplaySectionProps) {
  const [replays, setReplays]         = useState<ReplayEntry[]>(initial)
  const [uploading, setUploading]     = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".vcr")) {
      toast.error("Only .vcr files are supported")
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res  = await fetch(`/api/sessions/${sessionId}/replays`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return }
      setReplays((prev) => [data, ...prev])
      toast.success("Replay uploaded")
    } catch {
      toast.error("Network error")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/replays/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Delete failed"); return }
      setReplays((prev) => prev.filter((r) => r.id !== id))
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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Film className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-200">Replays</h3>
          {replays.length > 0 && (
            <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
              {replays.length}
            </span>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".vcr"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-all disabled:opacity-50"
        >
          {uploading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
            : <><Upload className="w-3.5 h-3.5" /> Upload .vcr</>
          }
        </button>
      </div>

      {/* List */}
      {replays.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-4">
          No replays uploaded yet. Upload a .vcr file to store it alongside this session.
        </p>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {replays.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Film className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-zinc-300 truncate">{r.originalName}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {formatBytes(Number(r.fileSizeBytes))}
                  <span className="mx-1">·</span>
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
      )}
    </div>
  )
}
