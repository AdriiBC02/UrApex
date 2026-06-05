"use client"

import { useState } from "react"
import { Globe, Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SessionPrivacyToggleProps {
  sessionId: string
  initialIsPublic: boolean
}

export function SessionPrivacyToggle({ sessionId, initialIsPublic }: SessionPrivacyToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [loading, setLoading]   = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/sessions/${sessionId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isPublic: !isPublic }),
      })
      if (!res.ok) { toast.error("Could not update visibility"); return }
      setIsPublic((prev) => !prev)
      toast.success(!isPublic ? "Session set to public" : "Session set to private")
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isPublic ? "Public — click to make private" : "Private — click to make public"}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all disabled:opacity-50",
        isPublic
          ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20"
          : "text-zinc-500 bg-zinc-800/60 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600"
      )}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isPublic ? (
        <Globe className="w-3 h-3" />
      ) : (
        <Lock className="w-3 h-3" />
      )}
      {isPublic ? "Public" : "Private"}
    </button>
  )
}
