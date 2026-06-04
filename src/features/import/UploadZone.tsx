"use client"

import { useCallback, useState } from "react"
import { Upload, X, FileText, CheckCircle, AlertCircle, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export function UploadZone() {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(files)
      .filter((f) => f.name.toLowerCase().endsWith(".xml"))
      .map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: "queued" as const,
      }))

    if (newEntries.length < files.length) {
      toast.warning("Some files were skipped — only XML files are supported.")
    }

    setEntries((prev) => [...prev, ...newEntries])
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

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const uploadAll = async () => {
    const queued = entries.filter((e) => e.status === "queued")
    if (!queued.length) return

    setUploading(true)

    // Mark all queued as uploading
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
      for (const result of data.imports) {
        resultMap.set(result.originalName, result)
      }

      setEntries((prev) =>
        prev.map((e) => {
          if (e.status !== "uploading") return e
          const result = resultMap.get(e.file.name)
          if (!result) return { ...e, status: "failed" as const, error: "No result" }

          if (result.isDuplicate || result.status === "DUPLICATE") {
            return { ...e, status: "duplicate" as const, existingSessionId: result.existingSessionId }
          }
          if (result.status === "IMPORTED") {
            return { ...e, status: "imported" as const, sessionId: result.sessionId }
          }
          return { ...e, status: "failed" as const, error: result.error ?? result.errorMessage ?? "Import failed" }
        })
      )

      const imported = data.imports.filter((r: { status: string }) => r.status === "IMPORTED").length
      const failed = data.imports.filter((r: { status: string }) => r.status === "FAILED").length
      const dupes = data.imports.filter((r: { isDuplicate: boolean }) => r.isDuplicate).length

      if (imported > 0) toast.success(`${imported} session${imported > 1 ? "s" : ""} imported successfully`)
      if (dupes > 0) toast.info(`${dupes} duplicate${dupes > 1 ? "s" : ""} skipped`)
      if (failed > 0) toast.error(`${failed} import${failed > 1 ? "s" : ""} failed`)
    } catch {
      toast.error("Network error — please try again")
      setEntries((prev) =>
        prev.map((e) => (e.status === "uploading" ? { ...e, status: "failed", error: "Network error" } : e))
      )
    } finally {
      setUploading(false)
    }
  }

  const queuedCount = entries.filter((e) => e.status === "queued").length

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-10 text-center transition-colors",
          dragging
            ? "border-cyan-500 bg-cyan-500/5"
            : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
        )}
      >
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          multiple
          onChange={onFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
            dragging ? "bg-cyan-500/20" : "bg-zinc-800"
          )}>
            <Upload className={cn("w-5 h-5", dragging ? "text-cyan-400" : "text-zinc-400")} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Drop XML files here or click to browse
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Le Mans Ultimate result files · max 50MB each
            </p>
          </div>
        </div>
      </div>

      {/* Queue */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-300 truncate flex-1 font-mono">
                {entry.file.name}
              </span>
              <StatusBadge entry={entry} />
              {entry.status === "queued" && (
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {queuedCount > 0 && (
        <Button
          onClick={uploadAll}
          disabled={uploading}
          className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold"
        >
          {uploading
            ? "Importing..."
            : `Import ${queuedCount} file${queuedCount > 1 ? "s" : ""}`}
        </Button>
      )}
    </div>
  )
}

function StatusBadge({ entry }: { entry: FileEntry }) {
  switch (entry.status) {
    case "queued":
      return <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-400 border-0">Queued</Badge>
    case "uploading":
      return <Badge variant="secondary" className="text-xs bg-blue-950 text-blue-400 border-0 animate-pulse">Importing…</Badge>
    case "imported":
      return (
        <div className="flex items-center gap-2">
          <Badge className="text-xs bg-green-950 text-green-400 border-0">Imported</Badge>
          {entry.sessionId && (
            <Link href={`/sessions/${entry.sessionId}`} className="text-xs text-cyan-400 hover:text-cyan-300">
              View →
            </Link>
          )}
        </div>
      )
    case "duplicate":
      return (
        <div className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-zinc-500" />
          <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-500 border-0">Duplicate</Badge>
          {entry.existingSessionId && (
            <Link href={`/sessions/${entry.existingSessionId}`} className="text-xs text-zinc-400 hover:text-zinc-300">
              View →
            </Link>
          )}
        </div>
      )
    case "failed":
      return (
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <Badge className="text-xs bg-red-950 text-red-400 border-0 shrink-0">Failed</Badge>
          {entry.error && (
            <span className="text-xs text-zinc-500 truncate max-w-48" title={entry.error}>
              {entry.error}
            </span>
          )}
        </div>
      )
    default:
      return null
  }
}
