"use client"

import { useCallback, useState } from "react"
import { Upload, X, FileText, CheckCircle2, AlertCircle, Copy, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"

interface FileEntry {
  file: File
  id: string
  status: "queued" | "uploading" | "imported" | "duplicate" | "failed"
  error?: string
  sessionId?: string
  existingSessionId?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadZone() {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const xmlFiles = arr.filter((f) => f.name.toLowerCase().endsWith(".xml"))
    if (xmlFiles.length < arr.length) {
      toast.warning("Some files skipped — only .xml files are supported.")
    }
    setEntries((prev) => [
      ...prev,
      ...xmlFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: "queued" as const,
      })),
    ])
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ""
  }

  const uploadAll = async () => {
    const queued = entries.filter((e) => e.status === "queued")
    if (!queued.length) return

    setUploading(true)
    setEntries((prev) =>
      prev.map((e) => (e.status === "queued" ? { ...e, status: "uploading" } : e))
    )

    const formData = new FormData()
    queued.forEach((e) => formData.append("files", e.file))

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Upload failed")
        setEntries((prev) =>
          prev.map((e) => (e.status === "uploading" ? { ...e, status: "failed", error: "Upload failed" } : e))
        )
        return
      }

      const resultMap = new Map<string, (typeof data.imports)[0]>()
      for (const r of data.imports) resultMap.set(r.originalName, r)

      setEntries((prev) =>
        prev.map((e) => {
          if (e.status !== "uploading") return e
          const r = resultMap.get(e.file.name)
          if (!r) return { ...e, status: "failed" as const, error: "No result" }
          if (r.isDuplicate || r.status === "DUPLICATE")
            return { ...e, status: "duplicate" as const, existingSessionId: r.existingSessionId }
          if (r.status === "IMPORTED")
            return { ...e, status: "imported" as const, sessionId: r.sessionId }
          return { ...e, status: "failed" as const, error: r.error ?? r.errorMessage ?? "Import failed" }
        })
      )

      const imported = data.imports.filter((r: { status: string }) => r.status === "IMPORTED").length
      const dupes    = data.imports.filter((r: { isDuplicate: boolean }) => r.isDuplicate).length
      const failed   = data.imports.filter((r: { status: string }) => r.status === "FAILED").length

      if (imported > 0) toast.success(`${imported} session${imported > 1 ? "s" : ""} imported`)
      if (dupes > 0)    toast.info(`${dupes} duplicate${dupes > 1 ? "s" : ""} skipped`)
      if (failed > 0)   toast.error(`${failed} import${failed > 1 ? "s" : ""} failed`)
    } catch {
      toast.error("Network error — please try again")
      setEntries((prev) =>
        prev.map((e) => (e.status === "uploading" ? { ...e, status: "failed", error: "Network error" } : e))
      )
    } finally {
      setUploading(false)
    }
  }

  const queuedCount  = entries.filter((e) => e.status === "queued").length
  const hasCompleted = entries.some((e) => e.status === "imported" || e.status === "duplicate" || e.status === "failed")

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative rounded-2xl transition-all duration-200 cursor-pointer",
          dragging
            ? "border-2 border-dashed border-cyan-500 bg-cyan-500/5 shadow-lg shadow-cyan-500/10"
            : "border-2 border-dashed border-zinc-700 hover:border-zinc-600 bg-zinc-900/60 hover:bg-zinc-900"
        )}
      >
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          multiple
          onChange={onFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center gap-4 pointer-events-none py-12 px-6 text-center">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
            dragging
              ? "bg-cyan-500/20 shadow-lg shadow-cyan-500/20"
              : "bg-zinc-800 border border-zinc-700"
          )}>
            <Upload className={cn("w-6 h-6 transition-colors", dragging ? "text-cyan-400" : "text-zinc-500")} />
          </div>
          <div>
            <p className={cn("text-base font-semibold transition-colors", dragging ? "text-cyan-300" : "text-zinc-200")}>
              {dragging ? "Drop to import" : "Drop XML files here"}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              or <span className="text-zinc-300 underline underline-offset-2">click to browse</span>
            </p>
            <p className="text-xs text-zinc-600 mt-2">Le Mans Ultimate result files · .xml · max 50 MB</p>
          </div>
        </div>
      </div>

      {/* File queue */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800/60">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
              <FileStatusIcon status={entry.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 font-mono truncate">{entry.file.name}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {formatBytes(entry.file.size)}
                  {entry.error && <span className="text-red-400 ml-2">{entry.error}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill entry={entry} />
                {entry.status === "queued" && (
                  <button
                    onClick={() => setEntries((prev) => prev.filter((e) => e.id !== entry.id))}
                    className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {queuedCount > 0 && (
          <button
            onClick={uploadAll}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import {queuedCount} file{queuedCount > 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
        {hasCompleted && (
          <button
            onClick={() => setEntries((prev) => prev.filter((e) => e.status === "queued"))}
            className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-sm font-medium transition-colors"
          >
            Clear done
          </button>
        )}
      </div>
    </div>
  )
}

function FileStatusIcon({ status }: { status: FileEntry["status"] }) {
  if (status === "imported")  return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
  if (status === "failed")    return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
  if (status === "duplicate") return <Copy className="w-4 h-4 text-zinc-500 shrink-0" />
  if (status === "uploading") return <Loader2 className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />
  return <FileText className="w-4 h-4 text-zinc-600 shrink-0" />
}

function StatusPill({ entry }: { entry: FileEntry }) {
  switch (entry.status) {
    case "queued":
      return <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Queued</span>
    case "uploading":
      return <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded animate-pulse">Importing…</span>
    case "imported":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Imported</span>
          {entry.sessionId && (
            <Link href={`/sessions/${entry.sessionId}`} className="flex items-center gap-0.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )
    case "duplicate":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Duplicate</span>
          {entry.existingSessionId && (
            <Link href={`/sessions/${entry.existingSessionId}`} className="flex items-center gap-0.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )
    case "failed":
      return <span className="text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Failed</span>
    default:
      return null
  }
}
