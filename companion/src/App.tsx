import { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { load, Store } from "@tauri-apps/plugin-store"
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart"
import { SyncLog, SyncStatus } from "./components/SyncLog"
import { StatusDot } from "./components/StatusDot"
import { SessionList, type SessionSummary } from "./components/SessionList"
import { SessionDetailView, type SessionDetail } from "./components/SessionDetail"

interface Settings {
  watchFolder: string
  apiUrl: string
  apiKey: string
  driverName: string
}

interface LogEntry {
  id: number
  file: string
  status: "uploading" | "success" | "duplicate" | "error"
  message?: string
  timestamp: Date
}

let store: Store | null = null
let logId = 0

export default function App() {
  const [settings, setSettings]             = useState<Settings>({ watchFolder: "", apiUrl: "", apiKey: "", driverName: "" })
  const [watching, setWatching]             = useState(false)
  const [logs, setLogs]                     = useState<LogEntry[]>([])
  const [tab, setTab]                       = useState<"sync" | "sessions" | "settings">("sync")
  const [autostart, setAutostart]           = useState(false)
  const [importing, setImporting]           = useState(false)
  const [sessions, setSessions]             = useState<SessionSummary[]>([])
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [sessionDetail, setSessionDetail]   = useState<SessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail]   = useState(false)

  useEffect(() => {
    load("companion-settings.json", { autoSave: true, defaults: {} }).then((s) => {
      store = s
      s.get<Settings>("settings").then((saved) => { if (saved) setSettings(saved) })
      s.get<Array<LogEntry & { timestamp: string }>>("syncLogs").then((saved) => {
        if (saved?.length) {
          const r = saved.map((l) => ({ ...l, timestamp: new Date(l.timestamp) }))
          logId = Math.max(...r.map((l) => l.id)) + 1
          setLogs(r)
        }
      })
    })
    isEnabled().then(setAutostart).catch(() => {})
    loadSessions()

    const unlisteners: Array<() => void> = []
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ file: string }>("file-detected", (e) => addLog(e.payload.file, "uploading"))
        .then((fn) => unlisteners.push(fn))

      listen<{ file: string; status: string; message?: string }>("file-result", (e) => {
        const { file, status, message } = e.payload
        setLogs((prev) => prev.map((l) => {
          const name = file.split(/[\\/]/).pop() ?? file
          if (l.file === name && l.status === "uploading") {
            return { ...l, status: status as LogEntry["status"], message }
          }
          return l
        }))
        // Refresh sessions list when a new session is saved
        if (status === "success") loadSessions()
      }).then((fn) => unlisteners.push(fn))
    }).catch(console.error)

    return () => { unlisteners.forEach((fn) => fn()) }
  }, [])

  useEffect(() => {
    if (!store) return
    store.set("syncLogs", logs.slice(0, 100))
    store.save()
  }, [logs])

  async function loadSessions() {
    try {
      const list = await invoke<SessionSummary[]>("get_sessions")
      setSessions(list)
    } catch (e) { console.error(e) }
  }

  async function openSession(id: string) {
    setSelectedId(id)
    setLoadingDetail(true)
    try {
      const detail = await invoke<SessionDetail>("get_session_detail", { id })
      setSessionDetail(detail)
    } catch (e) { console.error(e) }
    finally { setLoadingDetail(false) }
  }

  async function handleDeleteSession(id: string) {
    await invoke("delete_session", { id })
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (selectedId === id) { setSelectedId(null); setSessionDetail(null) }
  }

  function addLog(file: string, status: LogEntry["status"]) {
    const entry: LogEntry = { id: logId++, file: file.split(/[\\/]/).pop() ?? file, status, timestamp: new Date() }
    setLogs((prev) => [entry, ...prev].slice(0, 100))
  }

  async function saveSettings() {
    await store?.set("settings", settings)
    await store?.save()
  }

  async function browseFolder() {
    const sel = await open({ directory: true, title: "Select LMU Results folder" })
    if (sel && typeof sel === "string") setSettings((s) => ({ ...s, watchFolder: sel }))
  }

  async function toggleWatch() {
    if (watching) {
      await invoke("stop_watching")
      setWatching(false)
    } else {
      await saveSettings()
      try {
        await invoke("start_watching", {
          folder: settings.watchFolder, apiUrl: settings.apiUrl,
          apiKey: settings.apiKey, driverName: settings.driverName || null,
        })
        setWatching(true)
      } catch (err) { addLog("", "error"); console.error(err) }
    }
  }

  async function importAll() {
    if (!canWatch || importing) return
    await saveSettings()
    setImporting(true)
    try {
      const count = await invoke<number>("import_all_files", {
        folder: settings.watchFolder, apiUrl: settings.apiUrl,
        apiKey: settings.apiKey, driverName: settings.driverName || null,
      })
      if (count === 0) addLog("(no XML files found)", "error")
      else setTimeout(loadSessions, 2000)
    } catch (err) { addLog("Import all failed", "error"); console.error(err) }
    finally { setImporting(false) }
  }

  async function toggleAutostart() {
    try {
      if (autostart) { await disable(); setAutostart(false) }
      else           { await enable();  setAutostart(true) }
    } catch (e) { console.error(e) }
  }

  const canWatch = Boolean(settings.watchFolder)
  const tabs = ["sync", "sessions", "settings"] as const

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }} data-tauri-drag-region>
        <span style={{ fontSize: 15 }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>UrApex Companion</span>
        <StatusDot watching={watching} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 600,
              background: tab === t ? "var(--border-light)" : "transparent",
              color: tab === t ? "var(--text)" : "var(--text-muted)",
              position: "relative",
            }}>
              {t === "sessions" ? `Sessions${sessions.length ? ` (${sessions.length})` : ""}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── SYNC TAB ── */}
        {tab === "sync" && (
          <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button onClick={toggleWatch} disabled={!canWatch} style={{
                padding: "8px 18px", borderRadius: 8, fontWeight: 700, fontSize: 12,
                background: watching ? "var(--red)" : canWatch ? "var(--cyan)" : "var(--border)",
                color: watching || canWatch ? "#09090b" : "var(--text-dim)", opacity: !canWatch ? 0.5 : 1,
              }}>
                {watching ? "Stop watching" : "Start watching"}
              </button>
              <button onClick={importAll} disabled={!canWatch || importing} style={{
                padding: "8px 14px", borderRadius: 8, fontWeight: 600, fontSize: 11,
                background: "var(--border-light)", color: "var(--text)",
                opacity: !canWatch || importing ? 0.5 : 1, border: "1px solid var(--border)",
              }}>
                {importing ? "Importing…" : "Import all"}
              </button>
              {!canWatch && <span style={{ color: "var(--text-dim)", fontSize: 11 }}>Set folder in Settings first</span>}
            </div>
            <SyncLog logs={logs} />
            {logs.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setLogs([])} style={{ fontSize: 11, color: "var(--text-dim)", background: "none", padding: "2px 6px" }}>
                  Clear history
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab === "sessions" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
            {/* List */}
            <div style={{ width: selectedId ? 200 : "100%", borderRight: selectedId ? "1px solid var(--border)" : "none", overflow: "auto", flexShrink: 0 }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </span>
                <button onClick={loadSessions} style={{ fontSize: 10, color: "var(--text-dim)", background: "none", padding: "2px 6px" }}>↻</button>
              </div>
              <SessionList sessions={sessions} selectedId={selectedId} onSelect={openSession} onDelete={handleDeleteSession} />
            </div>

            {/* Detail */}
            {selectedId && (
              <div style={{ flex: 1, overflow: "hidden" }}>
                {loadingDetail ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
                ) : sessionDetail ? (
                  <SessionDetailView session={sessionDetail} onBack={() => { setSelectedId(null); setSessionDetail(null) }} />
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            <form onSubmit={(e) => { e.preventDefault(); saveSettings() }} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
              <Field label="LMU Results folder" hint="e.g. C:\Users\You\Documents\Le Mans Ultimate\UserData\player\Results">
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={settings.watchFolder} onChange={(e) => setSettings((s) => ({ ...s, watchFolder: e.target.value }))} placeholder="Click Browse or paste path" style={{ flex: 1 }} />
                  <button type="button" onClick={browseFolder} style={{ padding: "6px 10px", borderRadius: 6, background: "var(--border-light)", color: "var(--text)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>Browse</button>
                </div>
              </Field>

              <Field label="Driver name" hint="Your in-game name — used to identify your laps in multiplayer sessions">
                <input value={settings.driverName} onChange={(e) => setSettings((s) => ({ ...s, driverName: e.target.value }))} placeholder="Adrian Doom" />
              </Field>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
                  Cloud sync (optional)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Field label="UrApex URL" hint="Leave empty to use standalone (local only)">
                    <input value={settings.apiUrl} onChange={(e) => setSettings((s) => ({ ...s, apiUrl: e.target.value }))} placeholder="https://your-urapex.com" />
                  </Field>
                  <Field label="API key" hint="Generate in UrApex → Settings → Companion app">
                    <input type="password" value={settings.apiKey} onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))} placeholder="uapx_..." />
                  </Field>
                </div>
              </div>

              {/* Autostart toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--border-light)", border: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: 0 }}>Start with Windows</p>
                  <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "2px 0 0" }}>Launch automatically on login</p>
                </div>
                <button type="button" onClick={toggleAutostart} style={{
                  width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
                  background: autostart ? "var(--cyan)" : "var(--border)", transition: "background 0.2s",
                }}>
                  <span style={{ position: "absolute", top: 2, left: autostart ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
              </div>

              <button type="submit" style={{ padding: "8px 18px", borderRadius: 8, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 12, alignSelf: "flex-start" }}>
                Save settings
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontWeight: 600, fontSize: 11, color: "var(--text)" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.4, margin: 0 }}>{hint}</p>}
    </div>
  )
}
