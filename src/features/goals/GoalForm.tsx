"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Timer, TrendingUp, CheckCircle2, Flag, Clock,
  ShieldOff, Shield, BarChart2, Sliders,
} from "lucide-react"

type GoalType =
  | "BEST_LAP_TIME"
  | "CONSISTENCY_SCORE"
  | "CLEAN_LAP_COUNT"
  | "SESSION_COUNT"
  | "HOURS_DRIVEN"
  | "REDUCE_INCIDENTS"
  | "IMPROVE_SAFETY"
  | "COMPLETE_STINTS"
  | "CUSTOM"

const GOAL_TYPES: {
  value: GoalType
  label: string
  unit: string
  placeholder: string
  hint: string
  icon: React.ElementType
  color: string
}[] = [
  {
    value: "BEST_LAP_TIME",
    label: "Best lap time",
    unit: "ms",
    placeholder: "e.g. 141742",
    hint: "Target in milliseconds — 141742 = 2:21.742",
    icon: Timer,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    value: "CONSISTENCY_SCORE",
    label: "Consistency score",
    unit: "score",
    placeholder: "e.g. 85",
    hint: "Target score 0–100. 85+ is very consistent.",
    icon: TrendingUp,
    color: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    value: "CLEAN_LAP_COUNT",
    label: "Clean laps",
    unit: "laps",
    placeholder: "e.g. 50",
    hint: "Total valid clean laps to complete.",
    icon: CheckCircle2,
    color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
  },
  {
    value: "SESSION_COUNT",
    label: "Sessions",
    unit: "sessions",
    placeholder: "e.g. 20",
    hint: "Total number of sessions to import.",
    icon: Flag,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    value: "HOURS_DRIVEN",
    label: "Hours driven",
    unit: "hours",
    placeholder: "e.g. 10",
    hint: "Total time behind the wheel in hours.",
    icon: Clock,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    value: "REDUCE_INCIDENTS",
    label: "Reduce incidents",
    unit: "avg/race",
    placeholder: "e.g. 1",
    hint: "Target average incidents per race session.",
    icon: ShieldOff,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  {
    value: "IMPROVE_SAFETY",
    label: "Safety score",
    unit: "score",
    placeholder: "e.g. 90",
    hint: "Target safety score 0–100.",
    icon: Shield,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    value: "COMPLETE_STINTS",
    label: "Complete stints",
    unit: "stints",
    placeholder: "e.g. 5",
    hint: "Stints with 20+ valid laps each.",
    icon: BarChart2,
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  },
  {
    value: "CUSTOM",
    label: "Custom",
    unit: "units",
    placeholder: "e.g. 100",
    hint: "Set any numeric target you want to track manually.",
    icon: Sliders,
    color: "text-zinc-400 bg-zinc-700/40 border-zinc-700",
  },
]

interface GoalFormProps {
  tracks: { id: string; name: string; slug: string }[]
  cars: { id: string; name: string; slug: string }[]
}

export function GoalForm({ tracks, cars }: GoalFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    type: "" as GoalType | "",
    targetValue: "",
    trackId: "",
    carId: "",
    deadline: "",
  })

  const selectedType = GOAL_TYPES.find((t) => t.value === form.type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.type || !form.targetValue) {
      toast.error("Fill in name, type, and target value.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          targetValue: parseFloat(form.targetValue),
          trackId: form.trackId || undefined,
          carId: form.carId || undefined,
          deadline: form.deadline || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to create goal")
        return
      }

      toast.success("Goal created!")
      router.push("/goals")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* ── Goal name ── */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-zinc-300">Goal name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Sub 1:42 at Spa with the 499P"
          className="bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 h-10 focus:border-cyan-500/50"
          required
        />
      </div>

      {/* ── Goal type grid ── */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-zinc-300">Goal type</Label>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_TYPES.map((t) => {
            const Icon = t.icon
            const active = form.type === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, type: t.value, targetValue: "" })}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-150",
                  active
                    ? `${t.color} border-current/30`
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/60"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg border flex items-center justify-center transition-all",
                  active ? t.color : "bg-zinc-800 border-zinc-700 text-zinc-500"
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={cn(
                  "text-xs font-medium leading-tight",
                  active ? "text-zinc-100" : "text-zinc-400"
                )}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Target value — shown after type selected ── */}
      {selectedType && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded-md border flex items-center justify-center", selectedType.color)}>
              <selectedType.icon className="w-3 h-3" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">{selectedType.label}</span>
            <span className="text-xs text-zinc-600 ml-auto">{selectedType.unit}</span>
          </div>
          <Input
            type="number"
            value={form.targetValue}
            onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
            placeholder={selectedType.placeholder}
            className="bg-zinc-800/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 h-10 focus:border-cyan-500/50 font-mono"
            step={selectedType.value === "BEST_LAP_TIME" ? "1" : "0.1"}
            min="0"
            required
          />
          <p className="text-xs text-zinc-500">{selectedType.hint}</p>
        </div>
      )}

      {/* ── Optional: scope + deadline ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-zinc-300">Scope</span>
          <span className="text-xs text-zinc-600">(optional — restrict goal to a specific circuit or car)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Circuit</Label>
            <Select
              value={form.trackId}
              onValueChange={(v) => setForm({ ...form, trackId: !v || v === "any" ? "" : v })}
            >
              <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-9 text-sm">
                <SelectValue placeholder="Any circuit" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">Any circuit</SelectItem>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-zinc-200 focus:bg-zinc-800">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Car</Label>
            <Select
              value={form.carId}
              onValueChange={(v) => setForm({ ...form, carId: !v || v === "any" ? "" : v })}
            >
              <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-9 text-sm">
                <SelectValue placeholder="Any car" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">Any car</SelectItem>
                {cars.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5 mt-3">
          <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Deadline</Label>
          <Input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="bg-zinc-800/60 border-zinc-700 text-zinc-300 h-9 text-sm w-44"
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting || !form.type || !form.name || !form.targetValue}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          {submitting ? "Creating…" : "Create goal"}
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
