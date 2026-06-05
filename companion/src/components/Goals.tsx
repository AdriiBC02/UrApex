import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"

interface Goal {
  id:           string
  name:         string
  goalType:     string
  targetValue:  number
  currentValue: number
  unit:         string | null
  trackName:    string | null
  carName:      string | null
  status:       string
  deadline:     string | null
  completedAt:  string | null
  createdAt:    string
}

const GOAL_TYPES = [
  { value: "BEST_LAP_TIME",     label: "Best lap time",    unit: "ms",   hint: "Target lap time in ms (e.g. 98000)" },
  { value: "CONSISTENCY_SCORE", label: "Consistency score",unit: "%",    hint: "Target consistency score (0–100)" },
  { value: "SESSION_COUNT",     label: "Session count",    unit: "sessions", hint: "Complete N sessions" },
  { value: "HOURS_DRIVEN",      label: "Hours driven",     unit: "h",    hint: "Total hours on track" },
  { value: "CUSTOM",            label: "Custom",           unit: "",     hint: "Manual tracking" },
]

function progressPct(goal: Goal): number {
  if (goal.targetValue === 0) return 0
  if (goal.goalType === "BEST_LAP_TIME") {
    if (goal.currentValue === 0) return 0
    const pct = (1 - (goal.currentValue - goal.targetValue) / goal.targetValue) * 100
    return Math.max(0, Math.min(100, pct))
  }
  return Math.min(100, (goal.currentValue / goal.targetValue) * 100)
}

function formatValue(goal: Goal, value: number): string {
  if (goal.goalType === "BEST_LAP_TIME") {
    if (value === 0) return "—"
    const s = value / 1000
    const m = Math.floor(s / 60)
    const rem = (s % 60).toFixed(3)
    return m > 0 ? `${m}:${rem.padStart(6, "0")}` : `${rem}s`
  }
  if (goal.goalType === "HOURS_DRIVEN") return `${value.toFixed(2)}h`
  if (goal.goalType === "CONSISTENCY_SCORE") return `${value.toFixed(1)}`
  return `${Math.round(value)}`
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "var(--cyan)", COMPLETED: "#4ade80", ABANDONED: "var(--text-dim)",
}

export function GoalsView() {
  const [goals, setGoals]       = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName]           = useState("")
  const [goalType, setGoalType]   = useState("BEST_LAP_TIME")
  const [targetValue, setTarget]  = useState("")
  const [trackName, setTrackName] = useState("")
  const [carName, setCarName]     = useState("")
  const [deadline, setDeadline]   = useState("")
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    try {
      const list = await invoke<Goal[]>("get_goals")
      setGoals(list)
    } catch (e) { console.error(e) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !targetValue) return
    setSaving(true)
    try {
      const typeInfo = GOAL_TYPES.find((t) => t.value === goalType)
      await invoke("create_goal", {
        input: {
          name: name.trim(),
          goalType,
          targetValue: parseFloat(targetValue),
          unit: typeInfo?.unit || null,
          trackName: trackName.trim() || null,
          carName:   carName.trim()   || null,
          deadline:  deadline || null,
        },
      })
      await loadGoals()
      setShowForm(false)
      setName(""); setTarget(""); setTrackName(""); setCarName(""); setDeadline("")
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function deleteGoal(id: string) {
    await invoke("delete_goal", { id })
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  async function markStatus(id: string, status: string) {
    await invoke("update_goal_status", { id, status })
    await loadGoals()
  }

  const active    = goals.filter((g) => g.status === "ACTIVE")
  const completed = goals.filter((g) => g.status === "COMPLETED")
  const abandoned = goals.filter((g) => g.status === "ABANDONED")
  const curType   = GOAL_TYPES.find((t) => t.value === goalType)

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
          {active.length} active · {completed.length} completed
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ padding: "5px 12px", borderRadius: 6, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 11 }}
        >
          {showForm ? "Cancel" : "+ New goal"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <FormField label="Goal name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sub 1:38 at Fuji" required />
          </FormField>
          <FormField label="Type">
            <select value={goalType} onChange={(e) => setGoalType(e.target.value)}>
              {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label={`Target value${curType?.unit ? ` (${curType.unit})` : ""}`} hint={curType?.hint}>
            <input type="number" step="any" value={targetValue} onChange={(e) => setTarget(e.target.value)} placeholder={goalType === "BEST_LAP_TIME" ? "98000" : "10"} required />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FormField label="Track filter (optional)">
              <input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Any track" />
            </FormField>
            <FormField label="Car filter (optional)">
              <input value={carName} onChange={(e) => setCarName(e.target.value)} placeholder="Any car" />
            </FormField>
          </div>
          <FormField label="Deadline (optional)">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </FormField>
          <button type="submit" disabled={saving} style={{ alignSelf: "flex-end", padding: "6px 16px", borderRadius: 6, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 11 }}>
            {saving ? "Saving…" : "Create goal"}
          </button>
        </form>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Active</p>
          {active.map((g) => <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onStatus={markStatus} />)}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Completed</p>
          {completed.map((g) => <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onStatus={markStatus} />)}
        </div>
      )}

      {/* Abandoned */}
      {abandoned.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Abandoned</p>
          {abandoned.map((g) => <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onStatus={markStatus} />)}
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", paddingTop: 24 }}>
          No goals yet. Create one to track your progress.
        </p>
      )}
    </div>
  )
}

function GoalCard({ goal: g, onDelete, onStatus }: {
  goal: Goal
  onDelete: (id: string) => void
  onStatus: (id: string, status: string) => void
}) {
  const pct      = progressPct(g)
  const typLabel = GOAL_TYPES.find((t) => t.value === g.goalType)?.label ?? g.goalType

  return (
    <div style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</p>
          <p style={{ fontSize: 10, color: "var(--text-dim)", margin: 0 }}>
            {typLabel}
            {(g.trackName || g.carName) && ` · ${[g.trackName, g.carName].filter(Boolean).join(" / ")}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {g.status === "ACTIVE" && (
            <button
              onClick={() => onStatus(g.id, "ABANDONED")}
              title="Abandon"
              style={{ fontSize: 10, color: "var(--text-dim)", background: "none", padding: "1px 4px", border: "1px solid var(--border)", borderRadius: 3 }}
            >
              Abandon
            </button>
          )}
          <button onClick={() => onDelete(g.id)} style={{ fontSize: 10, color: "var(--text-dim)", background: "none", padding: "1px 4px" }}>✕</button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${pct}%`,
            background: g.status === "COMPLETED" ? "#4ade80" : g.status === "ABANDONED" ? "var(--text-dim)" : "var(--cyan)",
            transition: "width 0.3s",
          }} />
        </div>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: STATUS_COLOR[g.status] ?? "var(--text-muted)", flexShrink: 0 }}>
          {formatValue(g, g.currentValue)} / {formatValue(g, g.targetValue)}{g.unit ? ` ${g.unit}` : ""}
        </span>
      </div>

      {g.completedAt && (
        <p style={{ fontSize: 9, color: "#4ade80", margin: "4px 0 0" }}>
          Completed {new Date(g.completedAt).toLocaleDateString()}
        </p>
      )}
      {g.deadline && g.status === "ACTIVE" && (
        <p style={{ fontSize: 9, color: "var(--text-dim)", margin: "4px 0 0" }}>
          Deadline: {new Date(g.deadline).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 9, color: "var(--text-dim)", margin: 0 }}>{hint}</p>}
    </div>
  )
}
