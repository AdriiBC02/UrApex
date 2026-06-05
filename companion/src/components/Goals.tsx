import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Target, Plus, X, CheckCircle2, XCircle, Clock, CalendarDays, Trash2 } from "lucide-react"

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
  { value: "BEST_LAP_TIME",     label: "Best lap time",     unit: "ms",       hint: "Target lap time in ms (e.g. 98000)" },
  { value: "CONSISTENCY_SCORE", label: "Consistency score", unit: "%",        hint: "Target score 0–100" },
  { value: "SESSION_COUNT",     label: "Session count",     unit: "sessions", hint: "Complete N sessions" },
  { value: "HOURS_DRIVEN",      label: "Hours driven",      unit: "h",        hint: "Total hours on track" },
  { value: "CUSTOM",            label: "Custom",            unit: "",         hint: "Manual tracking" },
]

function progressPct(g: Goal): number {
  if (g.targetValue === 0) return 0
  if (g.goalType === "BEST_LAP_TIME") {
    if (g.currentValue === 0) return 0
    return Math.max(0, Math.min(100, (1 - (g.currentValue - g.targetValue) / g.targetValue) * 100))
  }
  return Math.min(100, (g.currentValue / g.targetValue) * 100)
}

function fmtVal(g: Goal, v: number): string {
  if (g.goalType === "BEST_LAP_TIME") {
    if (v === 0) return "—"
    const s = v / 1000, m = Math.floor(s / 60), r = (s % 60).toFixed(3)
    return m > 0 ? `${m}:${r.padStart(6, "0")}` : `${r}s`
  }
  if (g.goalType === "HOURS_DRIVEN") return `${v.toFixed(2)}h`
  if (g.goalType === "CONSISTENCY_SCORE") return `${v.toFixed(1)}`
  return `${Math.round(v)}`
}

const STATUS_STYLE: Record<string, { bar: string; text: string }> = {
  ACTIVE:    { bar: "var(--cyan)",     text: "var(--cyan)" },
  COMPLETED: { bar: "var(--green)",    text: "var(--green)" },
  ABANDONED: { bar: "var(--text-dim)", text: "var(--text-dim)" },
}

export function GoalsView() {
  const [goals, setGoals]       = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState("")
  const [goalType, setGoalType] = useState("BEST_LAP_TIME")
  const [target, setTarget]     = useState("")
  const [trackName, setTrack]   = useState("")
  const [carName, setCar]       = useState("")
  const [deadline, setDeadline] = useState("")
  const [saving, setSaving]     = useState(false)

  useEffect(() => { loadGoals() }, [])

  async function loadGoals() {
    try { setGoals(await invoke<Goal[]>("get_goals")) } catch { /* ignore */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !target) return
    setSaving(true)
    try {
      const info = GOAL_TYPES.find((t) => t.value === goalType)
      await invoke("create_goal", { input: { name: name.trim(), goalType, targetValue: parseFloat(target), unit: info?.unit || null, trackName: trackName.trim() || null, carName: carName.trim() || null, deadline: deadline || null } })
      await loadGoals()
      setShowForm(false)
      setName(""); setTarget(""); setTrack(""); setCar(""); setDeadline("")
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function deleteGoal(id: string)               { await invoke("delete_goal", { id }); setGoals((p) => p.filter((g) => g.id !== id)) }
  async function markStatus(id: string, status: string) { await invoke("update_goal_status", { id, status }); await loadGoals() }

  const active    = goals.filter((g) => g.status === "ACTIVE")
  const completed = goals.filter((g) => g.status === "COMPLETED")
  const abandoned = goals.filter((g) => g.status === "ABANDONED")
  const curType   = GOAL_TYPES.find((t) => t.value === goalType)

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <p style={{ fontWeight: 800, fontSize: 15 }}>Goals</p>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {active.length} active{completed.length > 0 ? ` · ${completed.length} completed` : ""}
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`btn ${showForm ? "btn-ghost" : "btn-primary"}`}
          style={{ marginLeft: "auto", padding: "5px 12px", gap: 5 }}
        >
          {showForm ? <><X size={12} strokeWidth={2.5} /> Cancel</> : <><Plus size={12} strokeWidth={2.5} /> New goal</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 10 }}>
            <Target size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
            <span style={{ fontWeight: 600, fontSize: 12 }}>New goal</span>
          </div>
          <FF label="Goal name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sub 1:38 at Fuji" required />
          </FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Type">
              <select value={goalType} onChange={(e) => setGoalType(e.target.value)}>
                {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FF>
            <FF label={`Target${curType?.unit ? ` (${curType.unit})` : ""}`} hint={curType?.hint}>
              <input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={goalType === "BEST_LAP_TIME" ? "98000" : "10"} required />
            </FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Track filter">
              <input value={trackName} onChange={(e) => setTrack(e.target.value)} placeholder="Any track" />
            </FF>
            <FF label="Car filter">
              <input value={carName} onChange={(e) => setCar(e.target.value)} placeholder="Any car" />
            </FF>
          </div>
          <FF label="Deadline (optional)">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </FF>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving…" : "Create goal"}
            </button>
          </div>
        </form>
      )}

      {/* Active */}
      {active.length > 0 && (
        <Section label="Active" count={active.length}>
          {active.map((g) => <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onStatus={markStatus} />)}
        </Section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <Section label="Completed" count={completed.length}>
          {completed.map((g) => <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onStatus={markStatus} />)}
        </Section>
      )}

      {/* Abandoned */}
      {abandoned.length > 0 && (
        <Section label="Abandoned" count={abandoned.length}>
          {abandoned.map((g) => <GoalCard key={g.id} goal={g} onDelete={deleteGoal} onStatus={markStatus} />)}
        </Section>
      )}

      {goals.length === 0 && !showForm && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 32 }}>
          <Target size={32} strokeWidth={1.25} style={{ color: "var(--text-dim)" }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>No goals yet</p>
          <p style={{ fontSize: 11, color: "var(--text-dim)" }}>Create one to track your progress.</p>
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal: g, onDelete, onStatus }: { goal: Goal; onDelete: (id: string) => void; onStatus: (id: string, s: string) => void }) {
  const pct   = progressPct(g)
  const style = STATUS_STYLE[g.status] ?? STATUS_STYLE.ACTIVE
  const label = GOAL_TYPES.find((t) => t.value === g.goalType)?.label ?? g.goalType

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="badge badge-dim">{label}</span>
            {g.trackName && <span className="badge badge-dim">{g.trackName}</span>}
            {g.carName   && <span className="badge badge-dim">{g.carName}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {g.status === "ACTIVE" && (
            <button onClick={() => onStatus(g.id, "ABANDONED")} className="btn btn-ghost" style={{ padding: "3px 8px", gap: 4, fontSize: 10 }} title="Abandon">
              <XCircle size={11} strokeWidth={2} /> Abandon
            </button>
          )}
          <button onClick={() => onDelete(g.id)} className="btn btn-ghost" style={{ padding: "4px 7px" }} title="Delete">
            <Trash2 size={11} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: style.bar, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontVariantNumeric: "tabular-nums", color: "var(--text-dim)" }}>
            {fmtVal(g, g.currentValue)} / {fmtVal(g, g.targetValue)}{g.unit && g.goalType !== "BEST_LAP_TIME" ? ` ${g.unit}` : ""}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: style.text }}>{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Footer */}
      {(g.completedAt || (g.deadline && g.status === "ACTIVE")) && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: g.completedAt ? "var(--green)" : "var(--text-dim)" }}>
          {g.completedAt ? <CheckCircle2 size={10} strokeWidth={2} /> : <CalendarDays size={10} strokeWidth={2} />}
          {g.completedAt
            ? `Completed ${new Date(g.completedAt).toLocaleDateString()}`
            : `Deadline: ${new Date(g.deadline!).toLocaleDateString()}`}
        </div>
      )}
    </div>
  )
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="section-label">{label}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-dim)", background: "var(--surface-3)", padding: "1px 6px", borderRadius: 99 }}>{count}</span>
      </div>
      {children}
    </div>
  )
}

function FF({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 10, color: "var(--text-dim)", margin: 0, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  )
}
