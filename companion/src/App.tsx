import { useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { load, Store } from "@tauri-apps/plugin-store"
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart"
import { SyncLog, SyncStatus } from "./components/SyncLog"
import { StatusDot } from "./components/StatusDot"

interface Settings {
  watchFolder: string
  apiUrl: string
  apiKey: string
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
  const [settings, setSettings]       = useState<Settings>({ watchFolder: "", apiUrl: "http://localhost:3000", apiKey: "" })
  const [watching, setWatching]       = useState(false)
  const [logs, setLogs]               = useState<LogEntry[]>([])
  const [tab, setTab]                 = useState<"sync" | "settings">("sync")
  const [autostart, setAutostart]     = useState(false)
  const [importing, setImporting]     = useState(false)
  const logsRef                       = useRef(logs)

  // Keep ref in sync for persistence without stale closure
  logsRef.current = logs

  useEffect(() => {
    load("companion-settings.json", { autoSave: true, defaults: {} }).then((s) => {
      store = s

      // Load settings
      s.get<Settings>("settings").then((saved) => { if (saved) setSettings(saved) })

      // CA-011: Load persisted sync history
      s.get<Array<LogEntry & { timestamp: string }>>("syncLogs").then((saved) => {
        if (saved?.length) {
          const restored = saved.map((l) => ({ ...l, timestamp: new Date(l.timestamp) }))
          logId = Math.max(...restored.map((l) => l.id)) + 1
          setLogs(restored)
        }
      })
    })

    // CA-013: Read current autostart state
    isEnabled().then(setAutostart).catch(() => {})

    // Listen for file-detected events from Rust
    let unlistenFn: (() => void) | undefined
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ file: string }>("file-detected", (event) => {
        addLog(event.payload.file, "uploading")
      }).then((fn) => { unlistenFn = fn })
    }).catch(console.error)

    return () => { unlistenFn?.() }
  }, [])

  // CA-011: Persist logs to store whenever they change
  useEffect(() => {
    if (!store) return
    store.set("syncLogs", logs.slice(0, 100))
    store.save()
  }, [logs])

  function addLog(file: string, status: LogEntry["status"]) {
    const entry: LogEntry = { id: logId++, file: file.split(/[\\/]/).pop() ?? file, status, timestamp: new Date() }
    setLogs((prev) => [entry, ...prev].slice(0, 100))
  }

  function updateLog(file: string, status: LogEntry["status"], message?: string) {
    const name = file.split(/[\\/]/).pop() ?? file
    setLogs((prev) =>
      prev.map((l) => (l.file === name && l.status === "uploading" ? { ...l, status, message } : l))
    )
  }

  async function saveSettings() {
    await store?.set("settings", settings)
    await store?.save()
  }

  async function browseFolder() {
    const selected = await open({ directory: true, title: "Select LMU Results folder" })
    if (selected && typeof selected === "string") {
      setSettings((s) => ({ ...s, watchFolder: selected }))
    }
  }

  async function toggleWatch() {
    if (watching) {
      await invoke("stop_watching")
      setWatching(false)
    } else {
      await saveSettings()
      try {
        await invoke("start_watching", { folder: settings.watchFolder, apiUrl: settings.apiUrl, apiKey: settings.apiKey })
        setWatching(true)
      } catch (err) {
        addLog("", "error")
        console.error(err)
      }
    }
  }

  // CA-012: Import all existing XML files in the folder
  async function importAll() {
    if (!canWatch || importing) return
    await saveSettings()
    setImporting(true)
    try {
      const count = await invoke<number>("import_all_files", {
        folder: settings.watchFolder,
        apiUrl: settings.apiUrl,
        apiKey: settings.apiKey,
      })
      if (count === 0) addLog("(no XML files found)", "error")
    } catch (err) {
      addLog("Import all failed", "error")
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  // CA-013: Toggle Windows autostart
  async function toggleAutostart() {
    try {
      if (autostart) { await disable(); setAutostart(false) }
      else           { await enable();  setAutostart(true)  }
    } catch (err) {
      console.error("Autostart error:", err)
    }
  }

  const canWatch = settings.watchFolder && settings.apiUrl && settings.apiKey

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }} data-tauri-drag-region>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>UrApex Companion</span>
        <StatusDot watching={watching} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {(["sync", "settings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "3px 10px", borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: tab === t ? "var(--border-light)" : "transparent",
              color: tab === t ? "var(--text)" : "var(--text-muted)",
            }}>
              {t === "sync" ? "Sync" : "Settings"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "sync" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            {/* Watch + Import All buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={toggleWatch}
                disabled={!canWatch}
                style={{
                  padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: 13,
                  background: watching ? "var(--red)" : canWatch ? "var(--cyan)" : "var(--border)",
                  color: watching || canWatch ? "#09090b" : "var(--text-dim)",
                  opacity: !canWatch ? 0.5 : 1,
                }}
              >
                {watching ? "Stop watching" : "Start watching"}
              </button>

              {/* CA-012: Import all */}
              <button
                onClick={importAll}
                disabled={!canWatch || importing}
                title="Upload all XML files in the folder that haven't been imported yet"
                style={{
                  padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12,
                  background: "var(--border-light)", color: "var(--text)",
                  opacity: !canWatch || importing ? 0.5 : 1,
                  border: "1px solid var(--border)",
                }}
              >
                {importing ? "Importing…" : "Import all"}
              </button>

              {!canWatch && (
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>Configure settings first</span>
              )}
              {watching && settings.watchFolder && (
                <span style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}>
                  {settings.watchFolder}
                </span>
              )}
            </div>

            {/* Log */}
            <SyncLog logs={logs} />

            {/* CA-011: Clear history button */}
            {logs.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setLogs([])}
                  style={{ fontSize: 11, color: "var(--text-dim)", background: "none", padding: "2px 6px" }}
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); saveSettings() }} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
            <Field label="LMU Results folder" hint="e.g. C:\Users\You\Documents\Le Mans Ultimate\UserData\player\Results">
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={settings.watchFolder}
                  onChange={(e) => setSettings((s) => ({ ...s, watchFolder: e.target.value }))}
                  placeholder="Click Browse or paste path"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={browseFolder} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--border-light)", color: "var(--text)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
                  Browse
                </button>
              </div>
            </Field>

            <Field label="UrApex URL" hint="Your UrApex instance (default: localhost:3000)">
              <input value={settings.apiUrl} onChange={(e) => setSettings((s) => ({ ...s, apiUrl: e.target.value }))} placeholder="https://your-urapex.com" />
            </Field>

            <Field label="API key" hint="Generate this in UrApex → Settings → Companion app">
              <input type="password" value={settings.apiKey} onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))} placeholder="uapx_..." />
            </Field>

            {/* CA-013: Autostart with Windows */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--border-light)", border: "1px solid var(--border)" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: 0 }}>Start with Windows</p>
                <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "2px 0 0" }}>Launch companion automatically on login</p>
              </div>
              <button
                type="button"
                onClick={toggleAutostart}
                style={{
                  width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
                  background: autostart ? "var(--cyan)" : "var(--border)",
                  transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: autostart ? 18 : 2, width: 16, height: 16,
                  borderRadius: "50%", background: "#fff", transition: "left 0.2s",
                }} />
              </button>
            </div>

            <button type="submit" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--cyan)", color: "#09090b", fontWeight: 700, fontSize: 13, alignSelf: "flex-start" }}>
              Save settings
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  )
}
