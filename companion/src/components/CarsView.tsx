import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { formatLapTime } from "../lib/time"
import { Car, Timer, BarChart3, Calendar } from "lucide-react"

interface CarStat {
  carName:    string
  carClass:   string | null
  sessions:   number
  bestLapMs:  number | null
  lastDriven: string
  totalLaps:  number
}

export function CarsView() {
  const [cars, setCars] = useState<CarStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<CarStat[]>("get_cars")
      .then((c) => { setCars(c); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-dim)", fontSize:12 }}>Loading…</div>

  if (cars.length === 0) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"var(--text-dim)", padding:32 }}>
        <Car size={36} strokeWidth={1.25} />
        <p style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)" }}>No cars yet</p>
        <p style={{ fontSize:11, textAlign:"center" }}>Import sessions to see your garage.</p>
      </div>
    )
  }

  return (
    <div style={{ flex:1, overflow:"auto", padding:"20px 18px", display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
        <p style={{ fontWeight:800, fontSize:15 }}>Cars</p>
        <span style={{ fontSize:11, color:"var(--text-dim)" }}>{cars.length} in garage</span>
      </div>
      {cars.map((c) => (
        <div key={c.carName} className="card" style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Car size={13} strokeWidth={2} style={{ color:"var(--orange)", flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:700, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>{c.carName}</p>
              {c.carClass && <p style={{ fontSize:10, color:"var(--text-dim)", margin:0 }}>{c.carClass}</p>}
            </div>
            {c.bestLapMs && (
              <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"var(--orange)" }}>{formatLapTime(c.bestLapMs)}</span>
            )}
          </div>
          <div style={{ display:"flex", gap:14, fontSize:10, color:"var(--text-muted)" }}>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><BarChart3 size={10} strokeWidth={2} />{c.sessions} sessions</span>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><Timer size={10} strokeWidth={2} />{c.totalLaps} laps</span>
            <span style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
              <Calendar size={10} strokeWidth={2} />
              {new Date(c.lastDriven).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
