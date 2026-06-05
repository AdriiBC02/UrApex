import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { SlidersHorizontal, Plus, X, Star, Pencil, Trash2, Check } from "lucide-react"

interface Setup {
  id:         string
  name:       string
  carName:    string | null
  trackName:  string | null
  conditions: string | null
  setupType:  string | null
  notes:      string | null
  isFavorite: boolean
  createdAt:  string
  updatedAt:  string
}

const CONDITIONS = ["Dry", "Wet", "Mixed", "Endurance"]
const TYPES      = ["Qualifying", "Race", "Practice", "Endurance"]

const COND_COLORS: Record<string, string> = {
  Dry: "var(--amber)", Wet: "var(--cyan)", Mixed: "var(--purple)", Endurance: "var(--orange)",
}
const TYPE_COLORS: Record<string, string> = {
  Qualifying: "var(--cyan)", Race: "var(--orange)", Practice: "var(--text-muted)", Endurance: "var(--purple)",
}

export function SetupsView() {
  const [setups, setSetups]       = useState<Setup[]>([])
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [name, setName]           = useState("")
  const [carName, setCar]         = useState("")
  const [trackName, setTrack]     = useState("")
  const [conditions, setConditions] = useState("")
  const [setupType, setType]      = useState("")
  const [notes, setNotes]         = useState("")
  const [saving, setSaving]       = useState(false)

  useEffect(() => { loadSetups() }, [])

  async function loadSetups() {
    try { setSetups(await invoke<Setup[]>("get_setups")) } catch { /* ignore */ }
  }
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await invoke("create_setup", { input: { name: name.trim(), carName: carName.trim() || null, trackName: trackName.trim() || null, conditions: conditions || null, setupType: setupType || null, notes: notes.trim() || null } })
      await loadSetups()
      resetForm()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }
  function resetForm() { setShowForm(false); setName(""); setCar(""); setTrack(""); setConditions(""); setType(""); setNotes("") }

  async function toggleFav(id: string) { await invoke("toggle_setup_favorite", { id }); await loadSetups() }
  async function saveNotes(id: string) { await invoke("update_setup_notes", { id, notes: editNotes }); setEditingId(null); await loadSetups() }
  async function deleteSetup(id: string) { await invoke("delete_setup", { id }); setSetups((p) => p.filter((s) => s.id !== id)) }

  const favs   = setups.filter((s) => s.isFavorite)
  const others = setups.filter((s) => !s.isFavorite)

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <p style={{ fontWeight: 800, fontSize: 15 }}>Setups</p>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{setups.length} saved</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`btn ${showForm ? "btn-ghost" : "btn-primary"}`}
          style={{ marginLeft: "auto", padding: "5px 12px", gap: 5 }}
        >
          {showForm ? <><X size={12} strokeWidth={2.5} /> Cancel</> : <><Plus size={12} strokeWidth={2.5} /> New setup</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 10 }}>
            <SlidersHorizontal size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
            <span style={{ fontWeight: 600, fontSize: 12 }}>New setup</span>
          </div>
          <FF label="Setup name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fuji Race — Low drag" required />
          </FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Car"><input value={carName} onChange={(e) => setCar(e.target.value)} placeholder="Any car" /></FF>
            <FF label="Track"><input value={trackName} onChange={(e) => setTrack(e.target.value)} placeholder="Any track" /></FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FF label="Conditions">
              <select value={conditions} onChange={(e) => setConditions(e.target.value)}>
                <option value="">Any</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FF>
            <FF label="Type">
              <select value={setupType} onChange={(e) => setType(e.target.value)}>
                <option value="">Any</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FF>
          </div>
          <FF label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wing angles, ride height, tuning notes…" rows={3} style={{ resize: "vertical" }} />
          </FF>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Save setup"}</button>
          </div>
        </form>
      )}

      {/* Favorites */}
      {favs.length > 0 && (
        <SetupSection label="Pinned" count={favs.length}>
          {favs.map((s) => <SetupCard key={s.id} s={s} editingId={editingId} editNotes={editNotes} setEditingId={setEditingId} setEditNotes={setEditNotes} onFav={toggleFav} onSave={saveNotes} onDelete={deleteSetup} />)}
        </SetupSection>
      )}

      {others.length > 0 && (
        <SetupSection label={favs.length > 0 ? "All setups" : undefined} count={others.length} showCount={favs.length > 0}>
          {others.map((s) => <SetupCard key={s.id} s={s} editingId={editingId} editNotes={editNotes} setEditingId={setEditingId} setEditNotes={setEditNotes} onFav={toggleFav} onSave={saveNotes} onDelete={deleteSetup} />)}
        </SetupSection>
      )}

      {setups.length === 0 && !showForm && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 32 }}>
          <SlidersHorizontal size={32} strokeWidth={1.25} style={{ color: "var(--text-dim)" }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>No setups yet</p>
          <p style={{ fontSize: 11, color: "var(--text-dim)" }}>Save your first car setup configuration.</p>
        </div>
      )}
    </div>
  )
}

function SetupCard({ s, editingId, editNotes, setEditingId, setEditNotes, onFav, onSave, onDelete }: {
  s: Setup; editingId: string | null; editNotes: string
  setEditingId: (id: string | null) => void; setEditNotes: (v: string) => void
  onFav: (id: string) => void; onSave: (id: string) => void; onDelete: (id: string) => void
}) {
  const isEditing = editingId === s.id

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Top */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 5 }}>{s.name}</p>
          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {s.carName   && <Tag label={s.carName}   />}
            {s.trackName && <Tag label={s.trackName} />}
            {s.conditions && <Tag label={s.conditions} color={COND_COLORS[s.conditions]} />}
            {s.setupType  && <Tag label={s.setupType}  color={TYPE_COLORS[s.setupType]} />}
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 3, flexShrink: 0, marginTop: 1 }}>
          <button onClick={() => onFav(s.id)} className="btn btn-ghost" style={{ padding: "4px 7px" }} title={s.isFavorite ? "Unpin" : "Pin"}>
            <Star size={12} strokeWidth={2} style={{ color: s.isFavorite ? "var(--amber)" : undefined, fill: s.isFavorite ? "var(--amber)" : "none" }} />
          </button>
          <button onClick={() => { setEditingId(isEditing ? null : s.id); setEditNotes(s.notes ?? "") }} className="btn btn-ghost" style={{ padding: "4px 7px" }} title="Edit notes">
            <Pencil size={11} strokeWidth={2} />
          </button>
          <button onClick={() => onDelete(s.id)} className="btn btn-ghost" style={{ padding: "4px 7px" }} title="Delete">
            <Trash2 size={11} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Notes editor */}
      {isEditing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} placeholder="Wing angles, ride height, tuning notes…" style={{ resize: "vertical" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button type="button" onClick={() => setEditingId(null)} className="btn btn-ghost" style={{ padding: "5px 10px" }}>Cancel</button>
            <button type="button" onClick={() => onSave(s.id)} className="btn btn-primary" style={{ padding: "5px 12px", gap: 5 }}>
              <Check size={12} strokeWidth={2.5} /> Save notes
            </button>
          </div>
        </div>
      )}

      {/* Notes preview */}
      {!isEditing && s.notes && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap", paddingTop: 2, borderTop: "1px solid var(--border-soft)" }}>
          {s.notes}
        </p>
      )}

      <p style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 2 }}>Updated {new Date(s.updatedAt).toLocaleDateString()}</p>
    </div>
  )
}

function Tag({ label, color }: { label: string; color?: string }) {
  return (
    <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, background: color ? `${color}15` : "var(--surface-3)", color: color ?? "var(--text-muted)", fontWeight: 600, border: `1px solid ${color ? `${color}25` : "var(--border-soft)"}` }}>
      {label}
    </span>
  )
}

function SetupSection({ label, count, showCount = true, children }: { label?: string; count: number; showCount?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="section-label">{label}</span>
          {showCount && <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-dim)", background: "var(--surface-3)", padding: "1px 6px", borderRadius: 99 }}>{count}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  )
}
