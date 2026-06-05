import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"

interface Achievement {
  slug:       string
  name:       string
  description:string
  category:   string
  rarity:     string
  icon:       string
  target:     number
  progress:   number
  unlockedAt: string | null
}

const RARITY_COLORS: Record<string, { badge: string; bar: string; border: string }> = {
  COMMON:    { badge: "#71717a",  bar: "#52525b",  border: "transparent" },
  UNCOMMON:  { badge: "#22c55e",  bar: "#16a34a",  border: "transparent" },
  RARE:      { badge: "#3b82f6",  bar: "#2563eb",  border: "transparent" },
  EPIC:      { badge: "#a855f7",  bar: "#9333ea",  border: "rgba(168,85,247,0.3)" },
  LEGENDARY: { badge: "#f59e0b",  bar: "#d97706",  border: "rgba(245,158,11,0.4)" },
}

const CATEGORIES = ["ALL", "VOLUME", "PACE", "CONSISTENCY", "ENDURANCE", "RACE_CRAFT", "EXPLORATION"]
const CAT_LABELS: Record<string, string> = {
  ALL: "All", VOLUME: "Volume", PACE: "Pace", CONSISTENCY: "Consistency",
  ENDURANCE: "Endurance", RACE_CRAFT: "Race Craft", EXPLORATION: "Exploration",
}

function pct(a: Achievement): number {
  if (a.target === 0) return 0
  return Math.min(100, (a.progress / a.target) * 100)
}

function fmtProgress(a: Achievement): string {
  if (a.unlockedAt) return "Unlocked"
  if (a.target === 1) return a.progress > 0 ? "In progress" : "Locked"
  if (a.category === "VOLUME" && a.target >= 1) {
    return `${Math.round(a.progress)} / ${Math.round(a.target)}`
  }
  if (a.slug === "night_owl" || a.slug === "time_lord") {
    return `${a.progress.toFixed(1)}h / ${a.target}h`
  }
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
  const filtered = category === "ALL"
    ? achievements
    : achievements.filter((a) => a.category === category)

  // Sort: unlocked first (by date desc), then by rarity, then by name
  const sorted = [...filtered].sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1
    if (!a.unlockedAt && b.unlockedAt) return  1
    if (a.unlockedAt && b.unlockedAt) return b.unlockedAt.localeCompare(a.unlockedAt)
    const order = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"]
    return order.indexOf(a.rarity) - order.indexOf(b.rarity)
  })

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  }

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {unlocked.length} / {achievements.length} unlocked
          </span>
          {achievements.length > 0 && (
            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
              {Math.round((unlocked.length / achievements.length) * 100)}%
            </span>
          )}
        </div>
        {/* Overall progress bar */}
        <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${achievements.length ? (unlocked.length / achievements.length) * 100 : 0}%`,
            background: "var(--cyan)", transition: "width 0.4s",
          }} />
        </div>
        {/* Category filter */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                background: category === c ? "var(--cyan)" : "var(--border-light)",
                color: category === c ? "#09090b" : "var(--text-muted)",
                border: `1px solid ${category === c ? "var(--cyan)" : "var(--border)"}`,
              }}
            >
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Achievement grid */}
      <div style={{ flex: 1, overflow: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((a) => {
          const colors   = RARITY_COLORS[a.rarity] ?? RARITY_COLORS.COMMON
          const isLocked = !a.unlockedAt
          const p        = pct(a)

          return (
            <div
              key={a.slug}
              style={{
                display: "flex", gap: 10, padding: "9px 10px",
                borderRadius: 8,
                background: a.unlockedAt ? "var(--border-light)" : "var(--surface)",
                border: `1px solid ${a.unlockedAt && colors.border !== "transparent" ? colors.border : "var(--border)"}`,
                opacity: isLocked ? 0.72 : 1,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
                background: a.unlockedAt ? `${colors.badge}22` : "var(--border)",
                filter: isLocked ? "grayscale(1)" : "none",
              }}>
                {a.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: a.unlockedAt ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </span>
                  <span style={{
                    fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "1px 5px", borderRadius: 99, flexShrink: 0,
                    background: `${colors.badge}22`, color: colors.badge,
                  }}>
                    {a.rarity}
                  </span>
                </div>

                <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "0 0 5px", lineHeight: 1.3 }}>
                  {a.description}
                </p>

                {/* Progress */}
                {a.target > 1 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${p}%`, background: a.unlockedAt ? colors.bar : "#52525b", transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: a.unlockedAt ? colors.badge : "var(--text-dim)", flexShrink: 0 }}>
                      {fmtProgress(a)}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 9, color: a.unlockedAt ? "#4ade80" : "var(--text-dim)" }}>
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
