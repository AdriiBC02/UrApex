import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import { Map, Timer, BarChart3, Calendar, Flag } from "lucide-react"

interface TrackStat {
  trackName:  string
  sessions:   number
  bestLapMs:  number | null
  lastDriven: string
  totalLaps:  number
}

export function TracksView() {
  const [tracks, setTracks] = useState<TrackStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<TrackStat[]>("get_tracks")
      .then((t) => { setTracks(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-dim)", fontSize:12 }}>Loading…</div>

  if (tracks.length === 0) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"var(--text-dim)", padding:32 }}>
        <Map size={36} strokeWidth={1.25} />
        <p style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)" }}>No tracks yet</p>
        <p style={{ fontSize:11, textAlign:"center" }}>Import sessions to see your track history.</p>
      </div>
    )
  }

  return (
    <div style={{ flex:1, overflow:"auto", padding:"20px 18px", display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
        <p style={{ fontWeight:800, fontSize:15 }}>Tracks</p>
        <span style={{ fontSize:11, color:"var(--text-dim)" }}>{tracks.length} circuits</span>
      </div>
      {tracks.map((t) => (
        <div key={t.trackName} className="card" style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Flag size={13} strokeWidth={2} style={{ color:"var(--cyan)", flexShrink:0 }} />
            <p style={{ fontWeight:700, fontSize:13, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.trackName}</p>
            {t.bestLapMs && (
              <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"var(--cyan)" }}>{formatLapTime(t.bestLapMs)}</span>
            )}
          </div>
          <div style={{ display:"flex", gap:14, fontSize:10, color:"var(--text-muted)" }}>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><BarChart3 size={10} strokeWidth={2} />{t.sessions} sessions</span>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><Timer size={10} strokeWidth={2} />{t.totalLaps} laps</span>
            <span style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
              <Calendar size={10} strokeWidth={2} />
              {new Date(t.lastDriven).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
