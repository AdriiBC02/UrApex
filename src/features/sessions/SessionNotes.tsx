"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StickyNote, X, Plus, Link as LinkIcon, Tag, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface Note {
  id: string
  content: string
  tags: string[]
  videoUrl: string | null
  createdAt: Date
}

interface SessionNotesProps {
  sessionId: string
  initialNotes: Note[]
}

export function SessionNotes({ sessionId, initialNotes }: SessionNotesProps) {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-")
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
    }
    setTagInput("")
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags(tags.slice(0, -1))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), tags, videoUrl: videoUrl.trim() || undefined }),
      })

      if (!res.ok) {
        toast.error("Failed to save note")
        return
      }

      const note = await res.json()
      setNotes([{ ...note, createdAt: new Date(note.createdAt) }, ...notes])
      setContent("")
      setTags([])
      setVideoUrl("")
      setOpen(false)
      toast.success("Note saved")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/notes/${noteId}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to delete note"); return }
      setNotes(notes.filter((n) => n.id !== noteId))
      toast.success("Note deleted")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">

      {/* Add note form */}
      {open ? (
        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What happened in this session? Setup changes, track conditions, mental notes..."
            rows={4}
            autoFocus
            className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none leading-relaxed"
          />

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full"
              >
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-cyan-200 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder={tags.length === 0 ? "Add tags (Enter or comma)…" : ""}
              className="flex-1 min-w-[120px] bg-transparent text-xs text-zinc-400 placeholder:text-zinc-600 outline-none"
            />
          </div>

          {/* Video URL */}
          <div className="flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Video URL (optional)"
              type="url"
              className="flex-1 bg-transparent text-xs text-zinc-400 placeholder:text-zinc-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-zinc-700/40">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs transition-colors"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save note
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setContent(""); setTags([]); setVideoUrl("") }}
              className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-700/60 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-all w-full"
        >
          <Plus className="w-4 h-4" />
          Add a debrief note
        </button>
      )}

      {/* Notes list */}
      {notes.length > 0 && (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-4 space-y-3"
            >
              {/* Content */}
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {note.tags.map((t) => (
                    <span key={t} className="text-[11px] font-medium text-cyan-400/70 bg-cyan-500/8 border border-cyan-500/15 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Video URL */}
              {note.videoUrl && (
                <a
                  href={note.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span className="truncate max-w-xs">{note.videoUrl}</span>
                </a>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40">
                <span className="text-[11px] text-zinc-600">
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </span>
                <button
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-zinc-600 hover:text-red-400 transition-all"
                >
                  {deletingId === note.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Trash2 className="w-3 h-3" />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && !open && (
        <p className="text-xs text-zinc-700 text-center py-4">
          No notes yet. Debrief after each session to track what you learned.
        </p>
      )}
    </div>
  )
}
