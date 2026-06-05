"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2, ArrowRight, CheckCircle2, Trophy, Clock, Car, Map } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatLapTime } from "@/lib/time"

interface SessionSummary {
  id:           string
  trackName:    string
  carName:      string
  sessionType:  string
  bestLapMs:    number | null
  isNewPB:      boolean
  totalLaps:    number
  consistencyScore: number | null
}

interface PostSessionModalProps {
  sessionId: string | null
  onClose:   () => void
}

const QUICK_TAGS = ["consistent", "struggled", "clean", "setup issue", "good pace", "tyre management", "traffic"]

const FEELINGS = [
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😐", label: "OK" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😄", label: "Great" },
  { emoji: "🔥", label: "On fire" },
]

const TYPE_LABEL: Record<string, string> = {
  RACE: "Race", QUALIFYING: "Qualifying", PRACTICE: "Practice",
  HOTLAP: "Hotlap", TIME_TRIAL: "Time Trial",
}

export function PostSessionModal({ sessionId, onClose }: PostSessionModalProps) {
  const router                          = useRouter()
  const [summary, setSummary]           = useState<SessionSummary | null>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [feeling, setFeeling]           = useState<number | null>(null)
  const [note, setNote]                 = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    fetch(`/api/sessions/${sessionId}/summary`)
      .then((r) => r.json())
      .then((data) => { setSummary(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId])

  if (!sessionId) return null

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    if (!sessionId) return
    setSaving(true)

    const parts: string[] = []
    if (feeling !== null) parts.push(`Feeling: ${FEELINGS[feeling].emoji} ${FEELINGS[feeling].label}`)
    if (note.trim()) parts.push(note.trim())

    const content = parts.join("\n") || null

    try {
      if (content || selectedTags.length > 0) {
        await fetch(`/api/sessions/${sessionId}/notes`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content: content ?? "", tags: selectedTags }),
        })
      }
      toast.success("Session logged")
      router.push(`/sessions/${sessionId}`)
      onClose()
    } catch {
      toast.error("Could not save note")
    } finally {
      setSaving(false)
    }
  }

  function handleViewOnly() {
    router.push(`/sessions/${sessionId}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">Session imported</p>
              </div>

              {summary ? (
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-zinc-100">{summary.trackName}</h2>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Car className="w-3 h-3" />{summary.carName}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{TYPE_LABEL[summary.sessionType] ?? summary.sessionType}</span>
                    <span className="flex items-center gap-1"><Map className="w-3 h-3" />{summary.totalLaps} laps</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {summary.bestLapMs && (
                      <span className="text-sm font-mono font-bold text-zinc-200">
                        {formatLapTime(summary.bestLapMs)}
                      </span>
                    )}
                    {summary.isNewPB && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        <Trophy className="w-3 h-3" /> New PB
                      </span>
                    )}
                    {summary.consistencyScore != null && (
                      <span className="text-xs text-zinc-500">
                        Consistency <span className="text-zinc-300 font-medium">{summary.consistencyScore.toFixed(0)}</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Session ready to review.</p>
              )}
            </div>

            {/* Debrief */}
            <div className="px-6 py-5 space-y-5">
              {/* Feeling */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-2.5">How did it go?</p>
                <div className="flex gap-2">
                  {FEELINGS.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setFeeling(feeling === i ? null : i)}
                      title={f.label}
                      className={cn(
                        "flex-1 py-2 rounded-lg border text-xl transition-all",
                        feeling === i
                          ? "border-cyan-500/40 bg-cyan-500/10"
                          : "border-zinc-800 bg-zinc-800/60 hover:border-zinc-700"
                      )}
                    >
                      {f.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick tags */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-2.5">Quick tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all",
                        selectedTags.includes(tag)
                          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                          : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-2">Quick note <span className="text-zinc-600 font-normal">(optional)</span></p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What happened? What to work on next time…"
                  rows={3}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2.5 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-zinc-950 font-bold text-sm transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {saving ? "Saving…" : "Save & view session"}
              </button>
              <button
                onClick={handleViewOnly}
                className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 text-sm font-medium transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
