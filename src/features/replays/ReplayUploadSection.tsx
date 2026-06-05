"use client"

import { useRef, useState } from "react"
import { Film, Upload, X, Search, ChevronRight, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SESSION_TYPE_LABELS } from "@/lib/constants"

interface SessionOption {
  id:          string
  sessionType: string
  sessionDate: string
  trackName:   string
  carName:     string
}

interface ReplayUploadSectionProps {
  sessions: SessionOption[]
}

type Step = "idle" | "pick-session" | "uploading" | "done"

const TYPE_COLORS: Record<string, string> = {
  RACE:       "text-orange-400 bg-orange-500/10",
  QUALIFYING: "text-cyan-400 bg-cyan-500/10",
  PRACTICE:   "text-zinc-400 bg-zinc-700/40",
  HOTLAP:     "text-purple-400 bg-purple-500/10",
  TIME_TRIAL: "text-purple-400 bg-purple-500/10",
}

export function ReplayUploadSection({ sessions }: ReplayUploadSectionProps) {
  const fileRef               = useRef<HTMLInputElement>(null)
  const [step, setStep]       = useState<Step>("idle")
  const [file, setFile]       = useState<File | null>(null)
  const [query, setQuery]     = useState("")
  const [selected, setSelected] = useState<SessionOption | null>(null)
  const [dragging, setDragging] = useState(false)

  const filtered = sessions.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      s.trackName.toLowerCase().includes(q) ||
      s.carName.toLowerCase().includes(q) ||
      SESSION_TYPE_LABELS[s.sessionType as keyof typeof SESSION_TYPE_LABELS]?.toLowerCase().includes(q)
    )
  })

  function onFileChosen(f: File) {
    if (!f.name.toLowerCase().endsWith(".vcr")) {
      toast.error("Only .vcr files are supported")
      return
    }
    setFile(f)
    setStep("pick-session")
    setQuery("")
    setSelected(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFileChosen(f)
  }

  function cancel() {
    setStep("idle")
    setFile(null)
    setSelected(null)
    setQuery("")
    if (fileRef.current) fileRef.current.value = ""
  }

  async function upload() {
    if (!file || !selected) return
    setStep("uploading")
    try {
      const form = new FormData()
      form.append("file", file)
      const res  = await fetch(`/api/sessions/${selected.id}/replays`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed")
        setStep("pick-session")
        return
      }
      setStep("done")
      toast.success("Replay uploaded and associated with session")
    } catch {
      toast.error("Network error")
      setStep("pick-session")
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">Replay uploaded</p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{file?.name} → {selected?.trackName}</p>
        </div>
        <button onClick={cancel} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Upload another
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
        onDrop={onDrop}
        onClick={() => step === "idle" && fileRef.current?.click()}
        className={cn(
          "relative rounded-xl border transition-all duration-200 overflow-hidden",
          step === "idle"
            ? dragging
              ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10 cursor-pointer"
              : "border-zinc-800 hover:border-zinc-700 cursor-pointer"
            : "border-zinc-800 cursor-default"
        )}
      >
        {dragging && step === "idle" && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgb(6 182 212 / 0.07) 0%, transparent 60%)" }}
          />
        )}
        <div className="flex items-center gap-4 px-6 py-5">
          <div className={cn(
            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            dragging ? "bg-cyan-500/15 border border-cyan-500/30" : "bg-zinc-900 border border-zinc-700"
          )}>
            <Film className={cn("w-5 h-5 transition-colors", dragging ? "text-cyan-400" : "text-zinc-500")} />
          </div>
          <div className="flex-1 min-w-0">
            {step === "idle" ? (
              <>
                <p className={cn("text-sm font-semibold transition-colors", dragging ? "text-cyan-300" : "text-zinc-200")}>
                  {dragging ? "Drop replay here" : "Upload a replay"}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Drag & drop a .vcr file or click to browse</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-zinc-200 truncate">{file?.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {((file?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB
                </p>
              </>
            )}
          </div>
          {step === "idle" && (
            <span className="shrink-0 text-xs font-mono font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">.vcr</span>
          )}
          {step !== "idle" && (
            <button onClick={cancel} className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".vcr"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onFileChosen(e.target.files[0]) }}
      />

      {/* Session picker */}
      {(step === "pick-session" || step === "uploading") && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-300 mb-2.5">Which session does this replay belong to?</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by track, car or type…"
                disabled={step === "uploading"}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/50">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-600 text-center">No sessions found</p>
            ) : (
              filtered.map((s) => {
                const isSelected = selected?.id === s.id
                const typeColor  = TYPE_COLORS[s.sessionType] ?? "text-zinc-400 bg-zinc-800"
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(isSelected ? null : s)}
                    disabled={step === "uploading"}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:opacity-50",
                      isSelected ? "bg-cyan-500/10" : "hover:bg-zinc-800/60"
                    )}
                  >
                    <span className={cn("shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded", typeColor)}>
                      {SESSION_TYPE_LABELS[s.sessionType as keyof typeof SESSION_TYPE_LABELS] ?? s.sessionType}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-zinc-200">{s.trackName}</span>
                      <span className="text-zinc-600 mx-1.5">·</span>
                      <span className="text-xs text-zinc-500">{s.carName}</span>
                    </span>
                    <span className="text-[11px] text-zinc-600 shrink-0">
                      {new Date(s.sessionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              {selected ? `Selected: ${selected.trackName}` : "No session selected"}
            </p>
            <button
              onClick={upload}
              disabled={!selected || step === "uploading"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs transition-colors"
            >
              {step === "uploading"
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                : <><Upload className="w-3.5 h-3.5" /> Upload replay</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
