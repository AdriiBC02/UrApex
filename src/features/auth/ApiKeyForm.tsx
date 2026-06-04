"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Copy, RefreshCw, Trash2, Key, Eye, EyeOff } from "lucide-react"

interface ApiKeyFormProps {
  hasKey: boolean
  preview: string | null
}

export function ApiKeyForm({ hasKey: initialHasKey, preview: initialPreview }: ApiKeyFormProps) {
  const [hasKey, setHasKey] = useState(initialHasKey)
  const [preview, setPreview] = useState(initialPreview)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/api-key", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { toast.error("Failed to generate key"); return }
      setNewKey(data.apiKey)
      setHasKey(true)
      setPreview(`...${data.apiKey.slice(-8)}`)
      setShowKey(true)
      toast.success("API key generated — copy it now, it won't be shown again")
    } catch { toast.error("Network error") }
    finally { setLoading(false) }
  }

  async function revoke() {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/api-key", { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to revoke key"); return }
      setHasKey(false)
      setPreview(null)
      setNewKey(null)
      toast.success("API key revoked")
    } catch { toast.error("Network error") }
    finally { setLoading(false) }
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 leading-relaxed">
        Used by the UrApex companion app to upload sessions automatically from your PC.
        Generate a key here, then paste it into the companion app settings.
      </p>

      {newKey ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-amber-400 uppercase tracking-wide">
            Copy this key now — it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5">
            <Key className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <code className="flex-1 text-xs text-zinc-200 font-mono break-all">
              {showKey ? newKey : newKey.replace(/./g, "•")}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={copyKey}
              className="text-zinc-500 hover:text-cyan-400 transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : hasKey && preview ? (
        <div className="flex items-center gap-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 px-3 py-2.5">
          <Key className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-xs text-zinc-400 font-mono flex-1">Active key {preview}</span>
          <span className="text-[10px] text-green-400 font-medium">Active</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          onClick={generate}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {hasKey ? "Regenerate" : "Generate API key"}
        </Button>
        {hasKey && (
          <Button
            onClick={revoke}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-zinc-700 text-red-400 hover:text-red-300 hover:border-red-800 gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  )
}
