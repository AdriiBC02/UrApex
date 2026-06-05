"use client"

import { useState } from "react"
import { Globe, Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PrivacyFormProps {
  initialPublicProfile: boolean
}

export function PrivacyForm({ initialPublicProfile }: PrivacyFormProps) {
  const [publicProfile, setPublicProfile] = useState(initialPublicProfile)
  const [loading, setLoading]             = useState(false)

  async function toggleProfile() {
    setLoading(true)
    try {
      const res = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isPublic: !publicProfile }),
      })
      if (!res.ok) { toast.error("Could not update profile visibility"); return }
      setPublicProfile((prev) => !prev)
      toast.success(!publicProfile ? "Profile is now public" : "Profile is now private")
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Profile visibility */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-200">Public profile</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            When public, other drivers can view your profile and stats.
          </p>
        </div>
        <button
          onClick={toggleProfile}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 disabled:opacity-50",
            publicProfile
              ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20"
              : "text-zinc-400 bg-zinc-800 border-zinc-700 hover:text-zinc-200 hover:border-zinc-600"
          )}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : publicProfile ? (
            <Globe className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          {publicProfile ? "Public" : "Private"}
        </button>
      </div>

      <div className="border-t border-zinc-800/60 pt-4">
        <p className="text-xs font-medium text-zinc-400 mb-1">Session visibility</p>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Each session is private by default. Open a session and use the
          <span className="text-zinc-400 font-medium"> Public / Private </span>
          toggle to change its visibility individually.
        </p>
      </div>
    </div>
  )
}
