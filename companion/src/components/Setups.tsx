import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"

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

export function SetupsView() {
  const [setups, setSetups]       = useState<Setup[]>([])
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState("")

  // Form
  const [name, setName]           = useState("")
  const [carName, setCarName]     = useState("")
  const [trackName, setTrackName] = useState("")
  const [conditions, setConditions] = useState("")
  const [setupType, setSetupType] = useState("")
  const [notes, setNotes]         = useState("")
  const [saving, setSaving]       = useState(false)

  useEffect(() => { loadSetups() }, [])

  async function loadSetups() {
    try {
      setSetups(await invoke<Setup[]>("get_setups"))
    } catch (e) { console.error(e) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await invoke("create_setup", {
        input: {
          name:       name.trim(),
          carName:    carName.trim()    || null,
          trackName:  trackName.trim()  || null,
          conditions: conditions        || null,
          setupType:  setupType         || null,
          notes:      notes.trim()      || null,
        },
      })
      await loadSetups()
      resetForm()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  function resetForm() {
    setShowForm(false)
    setName(""); setCarName(""); setTrackName(""); setConditions(""); setSetupType(""); setNotes("")
  }

  async function toggleFav(id: string) {
    await invoke("toggle_setup_favorite", { id })
    await loadSetups()
  }

  async function saveNotes(id: string) {
    await invoke("update_setup_notes", { id, notes: editNotes })
    setEditingId(null)
    await loadSetups()
  }

  async function deleteSetup(id: string) {
    await invoke("delete_setup", { id })
    setSetups((prev) => prev.filter((s) => s.id !== id))
  }

  const favs   = setups.filter((s) => s.isFavorite)
  const others = setups.filter((s) => !s.isFavorite)

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
          {setups.length} setup{setups.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ padding: "5px 12px", borderRadius: 6, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 11 }}
        >
          {showForm ? "Cancel" : "+ New setup"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <FF label="Setup name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fuji Race — Low drag" required />
          </FF>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FF label="Car">
              <input value={carName} onChange={(e) => setCarName(e.target.value)} placeholder="Any car" />
            </FF>
            <FF label="Track">
              <input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Any track" />
            </FF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FF label="Conditions">
              <select value={conditions} onChange={(e) => setConditions(e.target.value)}>
                <option value="">Any</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FF>
            <FF label="Type">
              <select value={setupType} onChange={(e) => setSetupType(e.target.value)}>
                <option value="">Any</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FF>
          </div>
          <FF label="Notes">
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Wing angles, ride height, any tuning notes…"
              rows={3}
              style={{ resize: "vertical", fontSize: 11, background: "transparent", color: "var(--text)" }}
            />
          </FF>
          <button type="submit" disabled={saving} style={{ alignSelf: "flex-end", padding: "6px 16px", borderRadius: 6, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 11 }}>
            {saving ? "Saving…" : "Save setup"}
          </button>
        </form>
      )}

      {/* Favorites */}
      {favs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Favorites</p>
          {favs.map((s) => <SetupCard key={s.id} setup={s} editingId={editingId} editNotes={editNotes} setEditingId={setEditingId} setEditNotes={setEditNotes} onFav={toggleFav} onSaveNotes={saveNotes} onDelete={deleteSetup} />)}
        </div>
      )}

      {/* All others */}
      {others.length > 0 && (
        <div>
          {favs.length > 0 && <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>All setups</p>}
          {others.map((s) => <SetupCard key={s.id} setup={s} editingId={editingId} editNotes={editNotes} setEditingId={setEditingId} setEditNotes={setEditNotes} onFav={toggleFav} onSaveNotes={saveNotes} onDelete={deleteSetup} />)}
        </div>
      )}

      {setups.length === 0 && !showForm && (
        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", paddingTop: 24 }}>
          No setups yet. Save your first car setup.
        </p>
      )}
    </div>
  )
}

function SetupCard({ setup: s, editingId, editNotes, setEditingId, setEditNotes, onFav, onSaveNotes, onDelete }: {
  setup: Setup
  editingId:     string | null
  editNotes:     string
  setEditingId:  (id: string | null) => void
  setEditNotes:  (v: string) => void
  onFav:         (id: string) => void
  onSaveNotes:   (id: string) => void
  onDelete:      (id: string) => void
}) {
  const isEditing = editingId === s.id
  const tags = [s.carName, s.trackName, s.conditions, s.setupType].filter(Boolean)

  return (
    <div style={{ background: "var(--border-light)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {tags.map((t) => (
                <span key={t} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: "var(--border)", color: "var(--text-muted)" }}>{t}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => onFav(s.id)} title={s.isFavorite ? "Unpin" : "Pin"} style={{ fontSize: 12, background: "none", color: s.isFavorite ? "#facc15" : "var(--text-dim)", padding: "0 2px" }}>
            {s.isFavorite ? "★" : "☆"}
          </button>
          <button
            onClick={() => { setEditingId(isEditing ? null : s.id); setEditNotes(s.notes ?? "") }}
            style={{ fontSize: 10, color: "var(--text-muted)", background: "none", padding: "1px 4px", border: "1px solid var(--border)", borderRadius: 3 }}
          >
            {isEditing ? "Close" : "Edit"}
          </button>
          <button onClick={() => onDelete(s.id)} style={{ fontSize: 10, color: "var(--text-dim)", background: "none", padding: "0 4px" }}>✕</button>
        </div>
      </div>

      {/* Inline note editor */}
      {isEditing && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={4}
            placeholder="Setup notes, wing angles, ride height…"
            style={{ width: "100%", resize: "vertical", fontSize: 11, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 6px", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={() => onSaveNotes(s.id)}
              style={{ padding: "4px 12px", borderRadius: 5, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 11 }}
            >
              Save notes
            </button>
          </div>
        </div>
      )}

      {/* Notes preview when not editing */}
      {!isEditing && s.notes && (
        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{s.notes}</p>
      )}

      <p style={{ fontSize: 9, color: "var(--text-dim)", margin: "5px 0 0" }}>
        {new Date(s.updatedAt).toLocaleDateString()}
      </p>
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  )
}
