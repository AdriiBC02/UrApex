import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"

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

interface Props {
  onOpenSession: (id: string) => void
}

export function DashboardView({ onOpenSession }: Props) {
  const [stats, setStats]       = useState<DashboardStats | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    invoke<DashboardStats>("get_dashboard_stats")
      .then((s) => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
  }

  if (!stats) {
    return <div style={{ flex: 1, padding: 14, color: "var(--text-dim)", fontSize: 12 }}>No data yet. Import some sessions first.</div>
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatTile label="Sessions"   value={String(stats.totalSessions)} />
        <StatTile label="Valid laps" value={String(stats.totalLaps)} />
        <StatTile label="Hours"      value={stats.totalHours.toFixed(1)} />
        <StatTile label="Tracks"     value={String(stats.uniqueTracks)} />
        <StatTile label="Cars"       value={String(stats.uniqueCars)} />
        <StatTile label="PBs"        value={String(stats.pbCount)} accent />
      </div>

      {/* Consistency */}
      {stats.avgConsistency != null && (
        <div style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
            Avg consistency
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, width: `${stats.avgConsistency}%`,
                background: stats.avgConsistency >= 80 ? "#4ade80" : stats.avgConsistency >= 60 ? "var(--cyan)" : "#facc15",
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "var(--text)", minWidth: 36 }}>
              {stats.avgConsistency.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Most recent PB */}
      {stats.recentPb && (
        <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, padding: "10px 12px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
            Latest PB
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            {formatLapTime(stats.recentPb.bestLapMs)}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "2px 0 0" }}>
            {stats.recentPb.trackName} · {stats.recentPb.carName}
          </p>
          <p style={{ fontSize: 9, color: "var(--text-dim)", margin: "2px 0 0" }}>
            {new Date(stats.recentPb.sessionDate).toLocaleDateString()}
          </p>
          <button
            onClick={() => onOpenSession(stats.recentPb!.sessionId)}
            style={{ marginTop: 6, fontSize: 10, color: "var(--cyan)", background: "none", padding: 0, textDecoration: "underline" }}
          >
            Open session →
          </button>
        </div>
      )}

      {stats.totalSessions === 0 && (
        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", paddingTop: 8 }}>
          Import your first LMU session to see stats here.
        </p>
      )}
    </div>
  )
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px" }}>
      <p style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px" }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: accent ? "var(--cyan)" : "var(--text)", margin: 0 }}>{value}</p>
    </div>
  )
}
