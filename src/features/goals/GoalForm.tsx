"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

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

const GOAL_TYPES: { value: GoalType; label: string; unit: string; placeholder: string; hint: string }[] = [
  {
    value: "BEST_LAP_TIME",
    label: "Best lap time",
    unit: "ms",
    placeholder: "e.g. 141742",
    hint: "Target time in milliseconds (141742 = 2:21.742)",
  },
  {
    value: "CONSISTENCY_SCORE",
    label: "Consistency score",
    unit: "score",
    placeholder: "e.g. 85",
    hint: "Target score 0–100. 85+ is very consistent.",
  },
  {
    value: "CLEAN_LAP_COUNT",
    label: "Clean laps",
    unit: "laps",
    placeholder: "e.g. 50",
    hint: "Number of valid clean laps to complete.",
  },
  {
    value: "SESSION_COUNT",
    label: "Sessions completed",
    unit: "sessions",
    placeholder: "e.g. 20",
    hint: "Total number of sessions to import.",
  },
  {
    value: "HOURS_DRIVEN",
    label: "Hours driven",
    unit: "hours",
    placeholder: "e.g. 10",
    hint: "Total time behind the wheel in hours.",
  },
  {
    value: "REDUCE_INCIDENTS",
    label: "Reduce incidents",
    unit: "incidents/race",
    placeholder: "e.g. 1",
    hint: "Maximum average incidents per race session.",
  },
  {
    value: "IMPROVE_SAFETY",
    label: "Safety score",
    unit: "score",
    placeholder: "e.g. 90",
    hint: "Target safety score 0–100.",
  },
  {
    value: "COMPLETE_STINTS",
    label: "Complete stints",
    unit: "stints",
    placeholder: "e.g. 5",
    hint: "Number of long stints (20+ laps) to complete.",
  },
  {
    value: "CUSTOM",
    label: "Custom",
    unit: "units",
    placeholder: "e.g. 100",
    hint: "Set any numeric target you want to track.",
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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Goal name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Sub 1:42 at Spa with the 499P"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Goal type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as GoalType, targetValue: "" })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="Choose a goal type…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {GOAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target value */}
          {selectedType && (
            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Target value
                <span className="text-zinc-600 font-normal ml-1.5">({selectedType.unit})</span>
              </Label>
              <Input
                type="number"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                placeholder={selectedType.placeholder}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                step={selectedType.value === "BEST_LAP_TIME" ? "1" : "0.1"}
                min="0"
                required
              />
              <p className="text-xs text-zinc-500">{selectedType.hint}</p>
            </div>
          )}

          {/* Optional: track and car */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Circuit <span className="text-zinc-600 font-normal">(optional)</span>
              </Label>
              <Select
                value={form.trackId}
                onValueChange={(v) => setForm({ ...form, trackId: !v || v === "any" ? "" : v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">Any circuit</SelectItem>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Car <span className="text-zinc-600 font-normal">(optional)</span>
              </Label>
              <Select
                value={form.carId}
                onValueChange={(v) => setForm({ ...form, carId: !v || v === "any" ? "" : v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="any" className="text-zinc-500 focus:bg-zinc-800">Any car</SelectItem>
                  {cars.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">
              Deadline <span className="text-zinc-600 font-normal">(optional)</span>
            </Label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold"
            >
              {submitting ? "Creating…" : "Create goal"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
