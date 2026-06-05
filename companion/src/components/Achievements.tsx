import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Trophy, Lock } from "lucide-react"

interface Achievement {
  slug:        string
  name:        string
  description: string
  category:    string
  rarity:      string
  icon:        string
  target:      number
  progress:    number
  unlockedAt:  string | null
}

const RARITY: Record<string, { label: string; bar: string; badge: string; border: string; glow: string }> = {
  COMMON:    { label: "Common",    bar: "#52525b",  badge: "#71717a",  border: "var(--border)",                   glow: "" },
  UNCOMMON:  { label: "Uncommon",  bar: "#16a34a",  badge: "#22c55e",  border: "rgba(34,197,94,0.2)",             glow: "" },
  RARE:      { label: "Rare",      bar: "#2563eb",  badge: "#3b82f6",  border: "rgba(59,130,246,0.25)",           glow: "" },
  EPIC:      { label: "Epic",      bar: "#9333ea",  badge: "#a855f7",  border: "rgba(168,85,247,0.3)",            glow: "0 0 12px rgba(168,85,247,0.12)" },
  LEGENDARY: { label: "Legendary", bar: "#d97706",  badge: "#f59e0b",  border: "rgba(245,158,11,0.35)",           glow: "0 0 16px rgba(245,158,11,0.14)" },
}

const CATEGORIES = ["ALL", "VOLUME", "PACE", "CONSISTENCY", "ENDURANCE", "RACE_CRAFT", "EXPLORATION"]
const CAT_LABELS: Record<string, string> = {
  ALL: "All", VOLUME: "Volume", PACE: "Pace", CONSISTENCY: "Consistency",
  ENDURANCE: "Endurance", RACE_CRAFT: "Race Craft", EXPLORATION: "Exploration",
}

function pct(a: Achievement) {
  if (a.target === 0) return 0
  return Math.min(100, (a.progress / a.target) * 100)
}

function fmtProgress(a: Achievement): string {
  if (a.unlockedAt) return "Unlocked"
  if (a.target <= 1) return a.progress > 0 ? "In progress" : "Locked"
  if (a.slug === "night_owl" || a.slug === "time_lord") return `${a.progress.toFixed(1)}h / ${a.target}h`
  return `${Math.round(a.progress)} / ${Math.round(a.target)}`
}

export function AchievementsView() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [category, setCategory]         = useState("ALL")
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    invoke<Achievement[]>("get_achievements")
      .then((a) => { setAchievements(a); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const unlocked = achievements.filter((a) => a.unlockedAt)
  const filtered = category === "ALL" ? achievements : achievements.filter((a) => a.category === category)
  const sorted = [...filtered].sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1
    if (!a.unlockedAt && b.unlockedAt) return 1
    if (a.unlockedAt && b.unlockedAt) return b.unlockedAt.localeCompare(a.unlockedAt)
    const order = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"]
    return order.indexOf(a.rarity) - order.indexOf(b.rarity)
  })

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  }

  const pctUnlocked = achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontWeight: 800, fontSize: 15 }}>Achievements</p>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{unlocked.length} / {achievements.length} unlocked</span>
          {achievements.length > 0 && (
            <span className="badge badge-cyan" style={{ marginLeft: "auto" }}>{Math.round(pctUnlocked)}%</span>
          )}
        </div>

        {/* Overall progress bar */}
        <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, width: `${pctUnlocked}%`, background: "var(--cyan)", transition: "width 0.5s ease" }} />
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                background: category === c ? "var(--cyan)" : "var(--surface-3)",
                color: category === c ? "#09090b" : "var(--text-muted)",
                border: `1px solid ${category === c ? "var(--cyan)" : "var(--border)"}`,
                transition: "all 0.1s",
              }}
            >
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((a) => {
          const r       = RARITY[a.rarity] ?? RARITY.COMMON
          const locked  = !a.unlockedAt
          const p       = pct(a)

          return (
            <div
              key={a.slug}
              style={{
                display: "flex", gap: 12, padding: "10px 12px",
                borderRadius: 10,
                background: a.unlockedAt ? "var(--surface-2)" : "var(--surface)",
                border: `1px solid ${locked ? "var(--border)" : r.border}`,
                boxShadow: locked ? "none" : r.glow,
                opacity: locked ? 0.65 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, background: locked ? "var(--surface-3)" : `${r.badge}20`,
                filter: locked ? "grayscale(1) brightness(0.6)" : "none",
                position: "relative",
              }}>
                {a.icon}
                {locked && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(9,9,11,0.5)" }}>
                    <Lock size={10} strokeWidth={2.5} style={{ color: "var(--text-dim)" }} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: locked ? "var(--text-muted)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </span>
                  <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", padding: "1px 5px", borderRadius: 99, flexShrink: 0, background: `${r.badge}20`, color: r.badge }}>
                    {r.label}
                  </span>
                  {a.unlockedAt && <Trophy size={10} strokeWidth={2} style={{ color: "var(--amber)", flexShrink: 0, marginLeft: "auto" }} />}
                </div>

                <p style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 6, lineHeight: 1.4 }}>{a.description}</p>

                {a.target > 1 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${p}%`, background: locked ? "#52525b" : r.bar, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: 9, fontVariantNumeric: "tabular-nums", color: locked ? "var(--text-dim)" : r.badge, flexShrink: 0 }}>
                      {fmtProgress(a)}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 9, color: a.unlockedAt ? "var(--green)" : "var(--text-dim)" }}>
                    {a.unlockedAt ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}` : "Not yet unlocked"}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
