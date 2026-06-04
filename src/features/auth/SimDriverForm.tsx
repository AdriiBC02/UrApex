"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Info } from "lucide-react"

interface SimDriverFormProps {
  initialName: string
}

export function SimDriverForm({ initialName }: SimDriverFormProps) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simDriverName: name.trim() || null }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Driver name updated — re-import your files to apply it")
    } catch {
      toast.error("Could not save driver name")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="simDriverName" className="text-zinc-300">In-game driver name</Label>
        <Input
          id="simDriverName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono"
          placeholder="e.g. YourName#1234"
          maxLength={128}
        />
        <p className="flex items-start gap-1.5 text-[11px] text-zinc-600 mt-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Must match your exact name in the LMU result XML (case-sensitive). Open any XML file and look for your{" "}
          <code className="font-mono">&lt;Name&gt;</code> element.
        </p>
      </div>
      <Button
        type="submit"
        disabled={saving}
        className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold"
      >
        {saving ? "Saving…" : "Save driver name"}
      </Button>
    </form>
  )
}
