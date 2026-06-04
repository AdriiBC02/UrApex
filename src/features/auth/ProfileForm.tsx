"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface ProfileFormProps {
  initialData: {
    displayName: string
    country: string
    bio: string
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [data, setData] = useState(initialData)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Profile updated")
    } catch {
      toast.error("Could not save profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="displayName" className="text-zinc-300">Display name</Label>
        <Input
          id="displayName"
          value={data.displayName}
          onChange={(e) => setData({ ...data, displayName: e.target.value })}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
          placeholder="Your racing name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="country" className="text-zinc-300">
          Country <span className="text-zinc-600 font-normal">(ISO 3166-1, e.g. ES)</span>
        </Label>
        <Input
          id="country"
          value={data.country}
          onChange={(e) => setData({ ...data, country: e.target.value.toUpperCase().slice(0, 2) })}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 w-20"
          placeholder="ES"
          maxLength={2}
        />
      </div>
      <Button
        type="submit"
        disabled={saving}
        className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold"
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  )
}
