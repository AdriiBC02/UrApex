"use client"

import { useCallback, useRef, useState } from "react"
import {
  Upload, X, FileText, CheckCircle2, AlertCircle, Copy, ArrowRight,
  Loader2, FolderOpen, User, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"

interface FileEntry {
  file: File
  id: string
  status: "queued" | "uploading" | "processing" | "imported" | "duplicate" | "failed"
  error?: string
  sessionId?: string
  existingSessionId?: string
  importFileId?: string
}

interface DriverSelectState {
  driverNames: string[]
  pendingIds: Array<{ importFileId: string; originalName: string }>
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UploadZoneProps {
  onImported?: (sessionId: string) => void
}

export function UploadZone({ onImported }: UploadZoneProps = {}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [driverSelect, setDriverSelect] = useState<DriverSelectState | null>(null)
  const [selectedDriver, setSelectedDriver] = useState("")
  const [confirming, setConfirming] = useState(false)

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

  const pollImportFile = useCallback(async (importFileId: string, entryId: string) => {
    const INTERVAL = 1500
    const TIMEOUT  = 120_000
    const start    = Date.now()

    const tick = async () => {
      if (Date.now() - start > TIMEOUT) {
        setEntries((prev) =>
          prev.map((e) => e.id === entryId ? { ...e, status: "failed", error: "Timed out" } : e)
        )
        return
      }
      try {
        const res  = await fetch(`/api/import/${importFileId}`)
        const data = await res.json() as { status: string; sessionId?: string; errorMessage?: string }

        if (data.status === "IMPORTED") {
          setEntries((prev) =>
            prev.map((e) => e.id === entryId ? { ...e, status: "imported", sessionId: data.sessionId } : e)
          )
          if (data.sessionId && onImported) onImported(data.sessionId)
          toast.success("Session imported")
        } else if (data.status === "FAILED") {
          setEntries((prev) =>
            prev.map((e) => e.id === entryId ? { ...e, status: "failed", error: data.errorMessage ?? "Import failed" } : e)
          )
          toast.error("Import failed")
        } else {
          setTimeout(tick, INTERVAL)
        }
      } catch {
        setTimeout(tick, INTERVAL)
      }
    }
    setTimeout(tick, INTERVAL)
  }, [onImported])

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

      // Driver selection needed before processing
      if (data.needsDriverSelection) {
        const deferred = (data.imports as Array<{
          importFileId?: string; originalName: string; deferred?: boolean; isDuplicate?: boolean; status: string
        }>).filter((r) => r.deferred)
        const duplicates = (data.imports as Array<{
          importFileId?: string; originalName: string; deferred?: boolean; isDuplicate?: boolean; status: string; existingSessionId?: string
        }>).filter((r) => r.isDuplicate || r.status === "DUPLICATE")

        // Mark duplicates immediately
        setEntries((prev) =>
          prev.map((e) => {
            if (e.status !== "uploading") return e
            const dup = duplicates.find((d) => d.originalName === e.file.name)
            if (dup) return { ...e, status: "duplicate" as const, existingSessionId: dup.existingSessionId }
            return e
          })
        )

        if (deferred.length > 0) {
          setDriverSelect({
            driverNames: data.driverNames ?? [],
            pendingIds: deferred.map((r) => ({ importFileId: r.importFileId!, originalName: r.originalName })),
          })
        }
        return
      }

      applyResults(data.imports, queued)
    } catch {
      toast.error("Network error — please try again")
      setEntries((prev) =>
        prev.map((e) => (e.status === "uploading" ? { ...e, status: "failed", error: "Network error" } : e))
      )
    } finally {
      setUploading(false)
    }
  }

  function applyResults(
    imports: Array<{
      originalName: string; status: string; isDuplicate?: boolean;
      existingSessionId?: string; sessionId?: string; importFileId?: string;
      error?: string; errorMessage?: string
    }>,
    _queued: FileEntry[]
  ) {
    const resultMap = new Map(imports.map((r) => [r.originalName, r]))
    const pendingPolls: Array<{ importFileId: string; entryId: string }> = []

    setEntries((prev) => {
      const next = prev.map((e) => {
        if (e.status !== "uploading") return e
        const r = resultMap.get(e.file.name)
        if (!r) return { ...e, status: "failed" as const, error: "No result" }
        if (r.isDuplicate || r.status === "DUPLICATE")
          return { ...e, status: "duplicate" as const, existingSessionId: r.existingSessionId }
        if (r.status === "IMPORTED")
          return { ...e, status: "imported" as const, sessionId: r.sessionId }
        if ((r.status === "PENDING" || r.status === "PARSING") && r.importFileId) {
          pendingPolls.push({ importFileId: r.importFileId, entryId: e.id })
          return { ...e, status: "processing" as const, importFileId: r.importFileId }
        }
        return { ...e, status: "failed" as const, error: r.error ?? r.errorMessage ?? "Import failed" }
      })
      return next
    })

    // Kick off polling outside of setState
    setTimeout(() => {
      for (const { importFileId, entryId } of pendingPolls) {
        pollImportFile(importFileId, entryId)
      }
    }, 0)

    const dupes  = imports.filter((r) => r.isDuplicate).length
    const failed = imports.filter((r) => r.status === "FAILED").length
    if (dupes > 0)  toast.info(`${dupes} duplicate${dupes > 1 ? "s" : ""} skipped`)
    if (failed > 0) toast.error(`${failed} import${failed > 1 ? "s" : ""} failed`)
  }

  const confirmDriver = async () => {
    if (!driverSelect || !selectedDriver) return
    setConfirming(true)
    try {
      const res = await fetch("/api/import/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importFileIds: driverSelect.pendingIds.map((p) => p.importFileId),
          driverName: selectedDriver,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Processing failed")
        return
      }

      setEntries((prev) =>
        prev.map((e) =>
          driverSelect.pendingIds.some((p) => p.originalName === e.file.name)
            ? { ...e, status: "uploading" as const }
            : e
        )
      )

      applyResults(data.imports, [])
      setDriverSelect(null)
      setSelectedDriver("")
      toast.success(`Driver set to "${selectedDriver}" — processing…`)
    } catch {
      toast.error("Network error")
    } finally {
      setConfirming(false)
      setUploading(false)
    }
  }

  const queuedCount  = entries.filter((e) => e.status === "queued").length
  const hasCompleted = entries.some((e) => ["imported", "duplicate", "failed", "processing"].includes(e.status))

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        multiple
        onChange={onFileInput}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "relative rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200",
          dragging
            ? "border border-cyan-500/50 shadow-lg shadow-cyan-500/10"
            : "border border-zinc-800 hover:border-zinc-700"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200 pointer-events-none",
            dragging ? "opacity-100" : "opacity-30 group-hover:opacity-50"
          )}
          style={{
            backgroundImage:
              "linear-gradient(rgb(6 182 212 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(6 182 212 / 0.05) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {dragging && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgb(6 182 212 / 0.07) 0%, transparent 60%)" }}
          />
        )}

        <div className="relative flex items-center gap-5 px-8 py-8">
          <div className={cn(
            "shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200",
            dragging
              ? "bg-cyan-500/15 border border-cyan-500/30 shadow-md shadow-cyan-500/20"
              : "bg-zinc-900 border border-zinc-700"
          )}>
            <Upload className={cn("w-6 h-6 transition-colors duration-200", dragging ? "text-cyan-400" : "text-zinc-500")} />
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn("text-base font-semibold transition-colors duration-200", dragging ? "text-cyan-300" : "text-zinc-200")}>
              {dragging ? "Release to import" : "Drop session files here"}
            </p>
            <p className="text-sm text-zinc-500 mt-0.5">
              Drag & drop your XML result files, or click to browse
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-mono font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">.xml</span>
              <span className="text-[11px] text-zinc-600">Le Mans Ultimate · max 50 MB per file</span>
            </div>
          </div>

          <div
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 text-sm font-medium transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            Browse
          </div>
        </div>
      </div>

      {/* Driver selection modal */}
      {driverSelect && (
        <div className="rounded-xl border border-cyan-500/30 bg-zinc-900 p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <User className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Who are you in these files?</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select your driver name — this will be saved for future imports.
              </p>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full appearance-none rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 pr-8 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Select your name…</option>
              {driverSelect.driverNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={confirmDriver}
              disabled={!selectedDriver || confirming}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-colors"
            >
              {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : "Confirm & import"}
            </button>
            <button
              onClick={() => {
                setDriverSelect(null)
                setEntries((prev) => prev.filter((e) => e.status !== "uploading"))
              }}
              className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-[11px] text-zinc-600">
            {driverSelect.pendingIds.length} file{driverSelect.pendingIds.length !== 1 ? "s" : ""} waiting:{" "}
            {driverSelect.pendingIds.map((p) => p.originalName).join(", ")}
          </p>
        </div>
      )}

      {/* File queue */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden divide-y divide-zinc-800/50">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
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
      {(queuedCount > 0 || hasCompleted) && !driverSelect && (
        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <button
              onClick={uploadAll}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
              ) : (
                <><Upload className="w-4 h-4" /> Import {queuedCount} file{queuedCount > 1 ? "s" : ""}</>
              )}
            </button>
          )}
          {hasCompleted && (
            <button
              onClick={() => setEntries((prev) => prev.filter((e) => e.status === "queued"))}
              className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 text-sm font-medium transition-colors"
            >
              Clear done
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FileStatusIcon({ status }: { status: FileEntry["status"] }) {
  if (status === "imported")   return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
  if (status === "failed")     return <AlertCircle  className="w-4 h-4 text-red-400 shrink-0" />
  if (status === "duplicate")  return <Copy         className="w-4 h-4 text-zinc-500 shrink-0" />
  if (status === "uploading" || status === "processing")
    return <Loader2 className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />
  return <FileText className="w-4 h-4 text-zinc-600 shrink-0" />
}

function StatusPill({ entry }: { entry: FileEntry }) {
  switch (entry.status) {
    case "queued":
      return <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Queued</span>
    case "uploading":
      return <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded animate-pulse">Uploading…</span>
    case "processing":
      return <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded animate-pulse">Processing…</span>
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
