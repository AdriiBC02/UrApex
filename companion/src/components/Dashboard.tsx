import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import { Timer, LayoutGrid, Map, Car, Trophy, Clock, TrendingUp, ArrowRight } from "lucide-react"

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

interface Props { onOpenSession: (id: string) => void }

const TILES: { key: keyof DashboardStats; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; accent?: boolean; fmt?: (v: number) => string }[] = [
  { key: "totalSessions",  label: "Sessions",   icon: LayoutGrid, fmt: String },
  { key: "totalLaps",      label: "Valid laps",  icon: Timer,      fmt: String },
  { key: "totalHours",     label: "Hours",       icon: Clock,      fmt: (v) => v.toFixed(1) },
  { key: "uniqueTracks",   label: "Tracks",      icon: Map,        fmt: String },
  { key: "uniqueCars",     label: "Cars",        icon: Car,        fmt: String },
  { key: "pbCount",        label: "PBs",         icon: Trophy,     fmt: String, accent: true },
]

export function DashboardView({ onOpenSession }: Props) {
  const [stats, setStats]     = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<DashboardStats>("get_dashboard_stats")
      .then((s) => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
        <LayoutGrid size={36} strokeWidth={1.25} style={{ color: "var(--text-dim)" }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>No sessions yet</p>
        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", maxWidth: 260 }}>
          Import your first LMU session via Sync to see your stats here.
        </p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Stats grid */}
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

      {/* Consistency */}
      {stats.avgConsistency != null && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <TrendingUp size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
            <span style={{ fontWeight: 600, fontSize: 12 }}>Avg consistency</span>
            <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: stats.avgConsistency >= 80 ? "var(--green)" : stats.avgConsistency >= 60 ? "var(--cyan)" : "var(--amber)" }}>
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

      {/* Latest PB */}
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
    </div>
  )
}
