"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AddVersionFormProps {
  setupId: string
  nextVersion: number
}

export function AddVersionForm({ setupId, nextVersion }: AddVersionFormProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/setups/${setupId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null }),
      })
      if (!res.ok) { toast.error("Could not add version"); return }
      toast.success(`Version ${nextVersion} added`)
      setOpen(false)
      setNotes("")
      router.refresh()
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add version {nextVersion}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <p className="text-xs font-semibold text-zinc-400">Adding version {nextVersion}</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What changed in this version? (optional)"
        rows={3}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2 resize-none focus:outline-none focus:border-zinc-600"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-zinc-950 font-bold text-xs transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Save version
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setNotes("") }}
          className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
