import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import {
  Timer, LayoutGrid, Map, Car, Trophy, Clock, TrendingUp,
  ArrowRight, Target, CheckCircle2, FolderOpen, RadioTower,
  Gamepad2, type LucideIcon,
} from "lucide-react"

interface RecentPb {
  sessionId:   string
  trackName:   string
  carName:     string
  bestLapMs:   number
  sessionDate: string
}

interface DashboardStats {
  totalSessions:  number
  totalLaps:      number
  totalHours:     number
  uniqueTracks:   number
  uniqueCars:     number
  avgConsistency: number | null
  pbCount:        number
  recentPb:       RecentPb | null
}

interface GoalSummary {
  id:           string
  name:         string
  goalType:     string
  status:       string
  currentValue: number
  targetValue:  number
  unit:         string | null
  trackName:    string | null
}

interface AchieveSummary {
  slug:       string
  name:       string
  icon:       string
  rarity:     string
  unlockedAt: string | null
}

function goalPct(g: GoalSummary): number {
  if (g.targetValue === 0) return 0
  if (g.goalType === "BEST_LAP_TIME") {
    if (g.currentValue === 0) return 0
    return Math.max(0, Math.min(100, (1 - (g.currentValue - g.targetValue) / g.targetValue) * 100))
  }
  return Math.min(100, (g.currentValue / g.targetValue) * 100)
}

const RARITY_COLOR: Record<string, string> = {
  COMMON:    "#71717a",
  UNCOMMON:  "#22c55e",
  RARE:      "#3b82f6",
  EPIC:      "#a855f7",
  LEGENDARY: "#f59e0b",
}

interface Props {
  onOpenSession: (id: string) => void
  hasFolder:     boolean
  watching:      boolean
}

const TILES: { key: keyof DashboardStats; label: string; icon: LucideIcon; accent?: boolean; fmt?: (v: number) => string }[] = [
  { key: "totalSessions",  label: "Sessions",   icon: LayoutGrid, fmt: String },
  { key: "totalLaps",      label: "Valid laps",  icon: Timer,      fmt: String },
  { key: "totalHours",     label: "Hours",       icon: Clock,      fmt: (v) => v.toFixed(1) },
  { key: "uniqueTracks",   label: "Tracks",      icon: Map,        fmt: String },
  { key: "uniqueCars",     label: "Cars",        icon: Car,        fmt: String },
  { key: "pbCount",        label: "PBs",         icon: Trophy,     fmt: String, accent: true },
]

export function DashboardView({ onOpenSession, hasFolder, watching }: Props) {
  const [stats, setStats]             = useState<DashboardStats | null>(null)
  const [goals, setGoals]             = useState<GoalSummary[]>([])
  const [achievements, setAchievements] = useState<AchieveSummary[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      invoke<DashboardStats>("get_dashboard_stats"),
      invoke<GoalSummary[]>("get_goals").catch(() => [] as GoalSummary[]),
      invoke<AchieveSummary[]>("get_achievements").catch(() => [] as AchieveSummary[]),
    ]).then(([s, g, a]) => {
      setStats(s)
      setGoals(g)
      setAchievements(a)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  }

  // ── Empty / quickstart ──────────────────────────────────────────────────────
  if (!stats || stats.totalSessions === 0) {
    const folderDone = hasFolder
    const watchDone  = watching

    return (
      <div style={{ flex: 1, overflow: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Get started</p>
          <p style={{ fontSize: 12, color: "var(--text-dim)" }}>Three steps to your first auto-imported session.</p>
        </div>

        <div className="card" style={{ padding: "4px 16px 12px" }}>

          <div className={`step ${folderDone ? "step-done" : ""}`}>
            <div className="step-num">{folderDone ? <CheckCircle2 size={12} strokeWidth={2.5} /> : "1"}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: folderDone ? "var(--text-muted)" : "var(--text)", marginBottom: 2 }}>
                Set your LMU Results folder
              </p>
              <p style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                Go to <strong style={{ color: "var(--text-muted)" }}>Settings</strong> and paste or browse to:
              </p>
              <code style={{ fontSize: 10, color: "var(--text-dim)", display: "block", marginTop: 4, background: "var(--surface-3)", padding: "3px 7px", borderRadius: 5, fontFamily: "monospace" }}>
                …\Le Mans Ultimate\UserData\player\Results\
              </code>
            </div>
            <FolderOpen size={15} strokeWidth={1.75} style={{ color: folderDone ? "var(--green)" : "var(--text-dim)", flexShrink: 0, marginTop: 3 }} />
          </div>

          <div className={`step ${watchDone ? "step-done" : ""}`}>
            <div className="step-num">{watchDone ? <CheckCircle2 size={12} strokeWidth={2.5} /> : "2"}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: watchDone ? "var(--text-muted)" : "var(--text)", marginBottom: 2 }}>
                Start watching
              </p>
              <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
                Go to <strong style={{ color: "var(--text-muted)" }}>Sync</strong> and press <strong style={{ color: "var(--cyan)" }}>Start watching</strong>.
              </p>
            </div>
            <RadioTower size={15} strokeWidth={1.75} style={{ color: watchDone ? "var(--green)" : "var(--text-dim)", flexShrink: 0, marginTop: 3 }} />
          </div>

          <div className="step" style={{ paddingBottom: 4 }}>
            <div className="step-num">3</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", marginBottom: 2 }}>
                Play a session in LMU
              </p>
              <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
                When you finish, the result file is picked up and imported automatically.
              </p>
            </div>
            <Gamepad2 size={15} strokeWidth={1.75} style={{ color: "var(--text-dim)", flexShrink: 0, marginTop: 3 }} />
          </div>
        </div>

        {!watching && folderDone && (
          <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <RadioTower size={14} strokeWidth={1.75} style={{ color: "var(--cyan)", flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Folder configured — go to <strong style={{ color: "var(--cyan)" }}>Sync</strong> and start watching to begin auto-importing.
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const activeGoals      = goals.filter((g) => g.status === "ACTIVE").slice(0, 3)
  const recentUnlocked   = achievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!))
    .slice(0, 3)

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Stats grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {TILES.map(({ key, label, icon: Icon, accent, fmt }) => {
          const raw = stats[key]
          const value = typeof raw === "number" && fmt ? fmt(raw) : String(raw ?? 0)
          return (
            <div key={key} className="stat-tile">
              <div className="stat-label">
                <Icon size={11} strokeWidth={2} />
                {label}
              </div>
              <div className="stat-value" style={{ color: accent ? "var(--cyan)" : "var(--text)" }}>
                {value}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Avg consistency ── */}
      {stats.avgConsistency != null && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <TrendingUp size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
            <span style={{ fontWeight: 600, fontSize: 12 }}>Avg consistency</span>
            <span style={{
              marginLeft: "auto", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums",
              color: stats.avgConsistency >= 80 ? "var(--green)" : stats.avgConsistency >= 60 ? "var(--cyan)" : "var(--amber)",
            }}>
              {stats.avgConsistency.toFixed(1)}
            </span>
          </div>
          <div style={{ height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${Math.min(100, stats.avgConsistency)}%`,
              background: stats.avgConsistency >= 80 ? "var(--green)" : stats.avgConsistency >= 60 ? "var(--cyan)" : "var(--amber)",
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      )}

      {/* ── Latest PB ── */}
      {stats.recentPb && (
        <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Trophy size={15} strokeWidth={1.75} style={{ color: "var(--cyan)", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p className="section-label" style={{ color: "var(--cyan-dim)", marginBottom: 5 }}>Latest PB</p>
              <p style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "var(--text)", lineHeight: 1, marginBottom: 6 }}>
                {formatLapTime(stats.recentPb.bestLapMs)}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 }}>{stats.recentPb.trackName}</p>
              <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {stats.recentPb.carName} · {new Date(stats.recentPb.sessionDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => onOpenSession(stats.recentPb!.sessionId)}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--cyan)", background: "none", padding: 0, flexShrink: 0, marginTop: 2 }}
            >
              View <ArrowRight size={11} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* ── Active goals ── */}
      {activeGoals.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Target size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
            <span style={{ fontWeight: 600, fontSize: 12 }}>Active Goals</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)" }}>{activeGoals.length} active</span>
          </div>
          {activeGoals.map((g) => {
            const pct = goalPct(g)
            return (
              <div key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 8 }}>
                    {g.name}
                    {g.trackName && <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 400, marginLeft: 4 }}>· {g.trackName}</span>}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: pct >= 100 ? "var(--green)" : "var(--cyan)",
                    borderRadius: 99, transition: "width 0.5s ease",
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Recent achievements ── */}
      {recentUnlocked.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Trophy size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
            <span style={{ fontWeight: 600, fontSize: 12 }}>Recent Achievements</span>
          </div>
          {recentUnlocked.map((a) => (
            <div key={a.slug} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.name}
                </p>
                <p style={{ fontSize: 10, color: RARITY_COLOR[a.rarity] ?? "var(--text-dim)", textTransform: "capitalize" }}>
                  {a.rarity.toLowerCase()}
                </p>
              </div>
              <span style={{ fontSize: 9, color: "var(--text-dim)", flexShrink: 0 }}>
                {new Date(a.unlockedAt!).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
