"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface SetupFormProps {
  tracks:     { id: string; name: string }[]
  cars:       { id: string; name: string }[]
  simulators: { id: string; slug: string; name: string }[]
}

const CONDITIONS = ["Dry", "Wet", "Mixed", "Endurance", "Sprint", "Qualifying"]
const TYPES      = ["Baseline", "Low downforce", "High downforce", "Balanced", "Experimental"]

export function SetupForm({ tracks, cars, simulators }: SetupFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "", simulatorSlug: "", trackId: "", carId: "",
    conditions: "", type: "", notes: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.simulatorSlug) {
      toast.error("Name and simulator are required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/setups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          simulatorSlug: form.simulatorSlug,
          trackId:    form.trackId || undefined,
          carId:      form.carId || undefined,
          conditions: form.conditions || undefined,
          type:       form.type || undefined,
          notes:      form.notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to create setup")
        return
      }

      toast.success("Setup created!")
      router.push("/setups")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-zinc-300">Setup name</Label>
        <Input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Spa low-downforce baseline"
          className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 h-10 focus:border-cyan-500/50"
          required
        />
      </div>

      {/* Simulator */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-zinc-300">Simulator</Label>
        <Select value={form.simulatorSlug} onValueChange={v => set("simulatorSlug")(v ?? "")}>
          <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-10">
            <SelectValue placeholder="Select simulator…" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {simulators.map(s => (
              <SelectItem key={s.slug} value={s.slug} className="text-zinc-200 focus:bg-zinc-800">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Track + Car */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Circuit <span className="text-zinc-700 normal-case">(optional)</span></Label>
          <Select value={form.trackId} onValueChange={v => set("trackId")(!v || v === "any" ? "" : v)}>
            <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-9 text-sm">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">Any circuit</SelectItem>
              {tracks.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-zinc-200 focus:bg-zinc-800">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Car <span className="text-zinc-700 normal-case">(optional)</span></Label>
          <Select value={form.carId} onValueChange={v => set("carId")(!v || v === "any" ? "" : v)}>
            <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-9 text-sm">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">Any car</SelectItem>
              {cars.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conditions + Type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Conditions</Label>
          <Select value={form.conditions} onValueChange={v => set("conditions")(!v || v === "any" ? "" : v)}>
            <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-9 text-sm">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">—</SelectItem>
              {CONDITIONS.map(c => (
                <SelectItem key={c} value={c} className="text-zinc-200 focus:bg-zinc-800">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Type</Label>
          <Select value={form.type} onValueChange={v => set("type")(!v || v === "any" ? "" : v)}>
            <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-9 text-sm">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">—</SelectItem>
              {TYPES.map(t => (
                <SelectItem key={t} value={t} className="text-zinc-200 focus:bg-zinc-800">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Notes <span className="text-zinc-700 normal-case">(optional)</span></Label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Setup changes, key differences from baseline, conditions…"
          rows={4}
          className="w-full bg-zinc-800/60 border border-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-600 rounded-lg px-3 py-2.5 resize-none outline-none leading-relaxed focus:border-cyan-500/50 transition-colors"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting || !form.name || !form.simulatorSlug}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? "Creating…" : "Create setup"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
