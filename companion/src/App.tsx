import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { getVersion } from "@tauri-apps/api/app"
import { open } from "@tauri-apps/plugin-dialog"
import { load, Store } from "@tauri-apps/plugin-store"
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart"
import { check, type Update } from "@tauri-apps/plugin-updater"
import {
  LayoutGrid, RadioTower, List, Target, Trophy,
  SlidersHorizontal, Film, Settings, Minus, X,
  FolderOpen, CloudUpload, RotateCcw, Trash2,
  ArrowUpCircle, RefreshCw, Loader2, Download,
  Map, Car, MonitorPlay, LogOut,
  type LucideIcon,
} from "lucide-react"
import { SyncLog } from "./components/SyncLog"
import { StatusDot } from "./components/StatusDot"
import { SessionList, type SessionSummary } from "./components/SessionList"
import { SessionDetailView, type SessionDetail } from "./components/SessionDetail"
import { GoalsView } from "./components/Goals"
import { DashboardView } from "./components/Dashboard"
import { SetupsView } from "./components/Setups"
import { CompareView } from "./components/CompareView"
import { AchievementsView } from "./components/Achievements"
import { TracksView } from "./components/TracksView"
import { CarsView } from "./components/CarsView"

interface Settings {
  watchFolder:  string
  replayFolder: string
  apiUrl:       string
  apiKey:       string
  driverName:   string
}

interface ReplaySummary {
  id:         string
  sessionId:  string | null
  filePath:   string
  filename:   string
  fileSize:   number | null
  matchedAt:  string | null
  importedAt: string
}

interface LogEntry {
  id:        number
  file:      string
  status:    "uploading" | "success" | "duplicate" | "error"
  message?:  string
  timestamp: Date
}

type Tab = "dashboard" | "sync" | "sessions" | "tracks" | "cars" | "goals" | "setups" | "achievements" | "replays" | "settings"

let store: Store | null = null
let logId = 0

const NAV_SECTIONS: { label: string; items: { tab: Tab; icon: LucideIcon; label: string }[] }[] = [
  {
    label: "Sessions",
    items: [
      { tab: "dashboard",    icon: LayoutGrid,        label: "Dashboard"    },
      { tab: "sessions",     icon: List,              label: "Sessions"     },
      { tab: "tracks",       icon: Map,               label: "Tracks"       },
      { tab: "cars",         icon: Car,               label: "Cars"         },
    ],
  },
  {
    label: "Training",
    items: [
      { tab: "goals",        icon: Target,            label: "Goals"        },
      { tab: "achievements", icon: Trophy,            label: "Achievements" },
      { tab: "setups",       icon: SlidersHorizontal, label: "Setups"       },
    ],
  },
  {
    label: "Sync",
    items: [
      { tab: "sync",         icon: RadioTower,        label: "Sync"         },
      { tab: "replays",      icon: Film,              label: "Replays"      },
    ],
  },
]

export default function App() {
  const [settings, setSettings]           = useState<Settings>({ watchFolder: "", replayFolder: "", apiUrl: "", apiKey: "", driverName: "" })
  const [watching, setWatching]           = useState(false)
  const [watchError, setWatchError]       = useState<string | null>(null)
  const [logs, setLogs]                   = useState<LogEntry[]>([])
  const [tab, setTab]                     = useState<Tab>("dashboard")
  const [autostart, setAutostart]         = useState(false)
  const [importing, setImporting]         = useState(false)
  const [sessions, setSessions]           = useState<SessionSummary[]>([])
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replays, setReplays]             = useState<ReplaySummary[]>([])
  const [compareDetail, setCompareDetail] = useState<SessionDetail | null>(null)
  const [appVersion, setAppVersion]       = useState("")
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [installing, setInstalling]       = useState(false)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateStatus, setUpdateStatus]   = useState("Up to date")
  const [overlayVisible, setOverlayVisible]     = useState(false)
  const [telemetryActive, setTelemetryActive]   = useState(false)
  const [recordingId, setRecordingId]           = useState<string | null>(null)

  useEffect(() => {
    load("companion-settings.json", { autoSave: true, defaults: {} }).then(async (s) => {
      store = s
      const [savedSettings, savedLogs, wasWatching] = await Promise.all([
        s.get<Settings>("settings"),
        s.get<Array<LogEntry & { timestamp: string }>>("syncLogs"),
        s.get<boolean>("watchActive"),
      ])

      if (savedSettings) setSettings(savedSettings)

      if (savedLogs?.length) {
        const r = savedLogs.map((l) => ({ ...l, timestamp: new Date(l.timestamp) }))
        logId = Math.max(...r.map((l) => l.id)) + 1
        setLogs(r)
      }

      if (wasWatching && savedSettings?.watchFolder) {
        try {
          await invoke("start_watching", {
            folder:       savedSettings.watchFolder,
            apiUrl:       savedSettings.apiUrl       || "",
            apiKey:       savedSettings.apiKey       || "",
            driverName:   savedSettings.driverName   || null,
            replayFolder: savedSettings.replayFolder || null,
          })
          setWatching(true)
        } catch { /* settings may be stale — ignore */ }
      }
    })
    isEnabled().then(setAutostart).catch(() => {})
    getVersion().then(setAppVersion).catch(() => {})
    loadSessions()
    loadReplays()

    // Background update check after 8s — non-blocking
    const updateTimer = setTimeout(() => {
      check().then((u) => {
        if (u) { setPendingUpdate(u); setUpdateStatus(`v${u.version} available`) }
      }).catch(() => {})
    }, 8000)

    const unlisteners: Array<() => void> = []
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<{ file: string }>("file-detected", (e) => addLog(e.payload.file, "uploading"))
        .then((fn) => unlisteners.push(fn))
      listen<{ file: string }>("replay-detected", (e) => {
        addLog(e.payload.file, "success"); loadReplays()
      }).then((fn) => unlisteners.push(fn))
      listen<{ file: string; status: string; message?: string }>("file-result", (e) => {
        const { file, status, message } = e.payload
        setLogs((prev) => prev.map((l) => {
          const name = file.split(/[\\/]/).pop() ?? file
          return (l.file === name && l.status === "uploading") ? { ...l, status: status as LogEntry["status"], message } : l
        }))
        if (status === "success") loadSessions()
      }).then((fn) => unlisteners.push(fn))
    }).catch(console.error)

    return () => { clearTimeout(updateTimer); unlisteners.forEach((fn) => fn()) }
  }, [])

  useEffect(() => {
    if (!store) return
    store.set("syncLogs", logs.slice(0, 100))
    store.save()
  }, [logs])

  async function checkForUpdates() {
    setCheckingUpdate(true); setUpdateStatus("Checking…")
    try {
      const u = await check()
      if (u) { setPendingUpdate(u); setUpdateStatus(`v${u.version} available`) }
      else   { setUpdateStatus("Up to date") }
    } catch { setUpdateStatus("Check failed — no network or key not configured") }
    finally { setCheckingUpdate(false) }
  }

  async function installUpdate() {
    if (!pendingUpdate) return
    setInstalling(true); setUpdateProgress(0)
    let total = 0, downloaded = 0
    try {
      await pendingUpdate.downloadAndInstall((event) => {
        if      (event.event === "Started")  { total = event.data.contentLength ?? 0 }
        else if (event.event === "Progress") { downloaded += event.data.chunkLength; if (total > 0) setUpdateProgress(Math.round(downloaded / total * 100)) }
        else if (event.event === "Finished") { setUpdateProgress(100) }
      })
      // NSIS installer handles closing + restart automatically on Windows
    } catch (err) { setUpdateStatus(`Install failed: ${String(err)}`); setInstalling(false) }
  }

  async function loadSessions() {
    try { setSessions(await invoke<SessionSummary[]>("get_sessions")) } catch { /* ignore */ }
  }
  async function loadReplays() {
    try { setReplays(await invoke<ReplaySummary[]>("get_replays")) } catch { /* ignore */ }
  }
  async function openSession(id: string) {
    setSelectedId(id); setLoadingDetail(true)
    try { setSessionDetail(await invoke<SessionDetail>("get_session_detail", { id })) } catch { /* ignore */ }
    finally { setLoadingDetail(false) }
  }
  async function handleDeleteSession(id: string) {
    await invoke("delete_session", { id })
    setSessions((p) => p.filter((s) => s.id !== id))
    if (selectedId === id) { setSelectedId(null); setSessionDetail(null) }
  }
  async function handleDeleteReplay(id: string) {
    await invoke("delete_replay", { id })
    setReplays((p) => p.filter((r) => r.id !== id))
  }
  function addLog(file: string, status: LogEntry["status"]) {
    const entry: LogEntry = { id: logId++, file: file.split(/[\\/]/).pop() ?? file, status, timestamp: new Date() }
    setLogs((prev) => [entry, ...prev].slice(0, 100))
  }
  async function saveSettings() {
    await store?.set("settings", settings)
    await store?.save()
  }
  async function browseFolder(key: "watchFolder" | "replayFolder", title: string) {
    const sel = await open({ directory: true, title })
    if (sel && typeof sel === "string") setSettings((s) => ({ ...s, [key]: sel }))
  }
  async function toggleWatch() {
    if (watching) {
      await invoke("stop_watching")
      setWatching(false); setWatchError(null)
      store?.set("watchActive", false); store?.save()
    } else {
      await saveSettings(); setWatchError(null)
      try {
        await invoke("start_watching", {
          folder: settings.watchFolder, apiUrl: settings.apiUrl,
          apiKey: settings.apiKey, driverName: settings.driverName || null,
          replayFolder: settings.replayFolder || null,
        })
        setWatching(true)
        store?.set("watchActive", true); store?.save()
      } catch (err) {
        setWatchError(String(err))
        addLog("", "error")
      }
    }
  }
  async function importAll() {
    if (!canWatch || importing) return
    await saveSettings(); setImporting(true)
    try {
      const count = await invoke<number>("import_all_files", {
        folder: settings.watchFolder, apiUrl: settings.apiUrl,
        apiKey: settings.apiKey, driverName: settings.driverName || null,
      })
      if (count === 0) addLog("(no XML files found)", "error")
      else setTimeout(loadSessions, 2000)
    } catch { addLog("Import all failed", "error") }
    finally { setImporting(false) }
  }
  async function toggleAutostart() {
    try {
      if (autostart) { await disable(); setAutostart(false) }
      else            { await enable();  setAutostart(true) }
    } catch { /* ignore */ }
  }
  async function handleCompare(secondId: string) {
    try {
      const detail = await invoke<SessionDetail>("get_session_detail", { id: secondId })
      if (detail) setCompareDetail(detail)
    } catch { /* ignore */ }
  }

  async function toggleOverlay() {
    try {
      if (overlayVisible) {
        await invoke("hide_overlay")
        setOverlayVisible(false)
      } else {
        await invoke("show_overlay")
        setOverlayVisible(true)
      }
    } catch { /* ignore */ }
  }

  async function toggleTelemetry() {
    try {
      if (telemetryActive) {
        await invoke("stop_telemetry")
        if (recordingId) {
          await invoke("stop_recording")
          setRecordingId(null)
        }
        setTelemetryActive(false)
      } else {
        await invoke("start_telemetry")
        setTelemetryActive(true)
      }
    } catch { /* ignore */ }
  }

  async function toggleRecording() {
    try {
      if (recordingId) {
        await invoke("stop_recording")
        setRecordingId(null)
      } else {
        const id = await invoke<string>("start_recording", {
          trackName: "Unknown", sessionType: "RACE",
        })
        setRecordingId(id)
      }
    } catch { /* ignore */ }
  }

  const canWatch = Boolean(settings.watchFolder)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      {/* ── Title bar ── */}
      <TitleBar watching={watching} pendingUpdate={!!pendingUpdate} onUpdateClick={() => setTab("settings")} />

      {/* ── Body: sidebar + content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{
          width: 180, flexShrink: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--border-soft)",
          display: "flex", flexDirection: "column",
          padding: "8px 8px",
          overflowY: "auto",
        }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
            {NAV_SECTIONS.map((section, si) => (
              <div key={section.label} style={{ marginBottom: si < NAV_SECTIONS.length - 1 ? 4 : 0 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 4px" }}>
                  {section.label}
                </p>
                {section.items.map(({ tab: t, icon: Icon, label }) => {
                  const badge = t === "sessions" ? sessions.length : t === "replays" ? replays.length : t === "tracks" ? 0 : t === "cars" ? 0 : 0
                  const isActive = tab === t
                  return (
                    <button key={t} onClick={() => setTab(t)} className={`nav-item ${isActive ? "active" : ""}`}>
                      <Icon size={14} strokeWidth={1.75} className="nav-icon" />
                      <span style={{ flex: 1 }}>{label}</span>
                      {badge > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: isActive ? "var(--cyan)" : "var(--text-dim)", background: "var(--border)", padding: "1px 6px", borderRadius: 10 }}>
                          {badge}
                        </span>
                      )}
                      {t === "sync" && watching && (
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} className="pulse" />
                      )}
                    </button>
                  )
                })}
                {si < NAV_SECTIONS.length - 1 && <div style={{ height: 1, background: "var(--border-soft)", margin: "4px 8px" }} />}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 6, display: "flex", flexDirection: "column", gap: 1 }}>
            <button onClick={() => setTab("settings")} className={`nav-item ${tab === "settings" ? "active" : ""}`}>
              <Settings size={14} strokeWidth={1.75} className="nav-icon" />
              <span>Settings</span>
            </button>
            <div style={{ padding: "6px 10px 2px", display: "flex", alignItems: "center", gap: 6 }}>
              <span className={watching ? "pulse" : undefined} style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: watching ? "var(--green)" : "var(--border)" }} />
              <span style={{ fontSize: 10, color: watching ? "var(--green)" : "var(--text-dim)", fontWeight: watching ? 600 : 400 }}>
                {watching ? "Live" : "Idle"}
              </span>
            </div>
            {watching && settings.watchFolder && (
              <p style={{ fontSize: 9, color: "var(--text-dim)", padding: "0 10px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {settings.watchFolder.split(/[\\/]/).pop() || settings.watchFolder}
              </p>
            )}
          </div>
        </aside>

        {/* ── Content ── */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
         <div key={tab} className="tab-content">

          {tab === "dashboard" && (
            <DashboardView
              onOpenSession={(id) => { setTab("sessions"); openSession(id) }}
              hasFolder={Boolean(settings.watchFolder)}
              watching={watching}
            />
          )}

          {tab === "goals"        && <GoalsView />}
          {tab === "setups"       && <SetupsView />}
          {tab === "achievements" && <AchievementsView />}
          {tab === "tracks"       && <TracksView />}
          {tab === "cars"         && <CarsView />}

          {tab === "sync" && (
            <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Watch control */}
              <div className="card" style={{
                display: "flex", flexDirection: "column", gap: 10,
                transition: "border-color 0.4s, box-shadow 0.4s",
                borderColor: watching ? "rgba(74,222,128,0.3)" : undefined,
                boxShadow:   watching ? "0 0 0 1px rgba(74,222,128,0.06), inset 0 0 24px rgba(74,222,128,0.03)" : undefined,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 2 }}>
                      {watching ? "Watching for new sessions" : "File watcher"}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
                      {watching ? (settings.watchFolder || "—") : canWatch ? "Ready to start" : "Configure a folder in Settings first"}
                    </p>
                  </div>
                  {watching && <StatusDot watching />}
                  <button
                    onClick={toggleWatch}
                    disabled={!canWatch}
                    className={`btn ${watching ? "btn-danger" : "btn-primary"}`}
                    style={{ flexShrink: 0 }}
                  >
                    {watching ? "Stop" : "Start watching"}
                  </button>
                </div>
                {watchError && (
                  <p style={{ fontSize: 11, color: "var(--red)", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "6px 10px", margin: 0 }}>
                    {watchError}
                  </p>
                )}
              </div>

              {/* Import all */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={importAll} disabled={!canWatch || importing} className="btn btn-ghost" style={{ gap: 6 }}>
                  <CloudUpload size={13} strokeWidth={2} />
                  {importing ? "Importing…" : "Import all existing files"}
                </button>
                {logs.length > 0 && (
                  <button onClick={() => setLogs([])} className="btn btn-ghost" style={{ gap: 6 }}>
                    <Trash2 size={12} strokeWidth={2} />
                    Clear log
                  </button>
                )}
              </div>

              <SyncLog logs={logs} />
            </div>
          )}

          {tab === "replays" && (
            <div style={{ flex: 1, overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Replays</p>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{replays.length} tracked</span>
                <button onClick={loadReplays} className="btn btn-ghost" style={{ marginLeft: "auto", padding: "4px 8px", gap: 4, fontSize: 11 }}>
                  <RotateCcw size={11} strokeWidth={2} /> Refresh
                </button>
                {settings.replayFolder && (
                  <button
                    onClick={async () => {
                      const added = await invoke<number>("import_all_replays", { folder: settings.replayFolder })
                      if (added > 0) loadReplays()
                    }}
                    className="btn btn-ghost"
                    style={{ padding: "4px 8px", gap: 4, fontSize: 11 }}
                  >
                    <CloudUpload size={11} strokeWidth={2} /> Import existing
                  </button>
                )}
              </div>
              {replays.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
                  <Film size={28} strokeWidth={1.5} style={{ color: "var(--text-dim)", margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>No replays tracked yet</p>
                  <p style={{ fontSize: 11, color: "var(--text-dim)" }}>Set a Replays folder in Settings to auto-detect .vcr files.</p>
                </div>
              ) : replays.map((r) => (
                <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Film size={14} strokeWidth={1.75} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.filename}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      {r.sessionId ? (
                        <span style={{ fontSize: 10, color: "var(--green)" }}>
                          {sessions.find((s) => s.id === r.sessionId)
                            ? `↳ ${sessions.find((s) => s.id === r.sessionId)!.trackName}`
                            : "Linked"}
                        </span>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={async (e) => {
                            if (!e.target.value) return
                            await invoke("match_replay", { replayId: r.id, sessionId: e.target.value })
                            loadReplays()
                          }}
                          style={{ fontSize: 10, padding: "2px 4px", background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-muted)", maxWidth: 180 }}
                        >
                          <option value="">Link to session…</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.trackName} · {new Date(s.sessionDate).toLocaleDateString()}
                            </option>
                          ))}
                        </select>
                      )}
                      <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                        {r.fileSize != null ? `${(r.fileSize / 1024 / 1024).toFixed(1)} MB` : ""} · {new Date(r.importedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteReplay(r.id)} className="btn btn-ghost" style={{ padding: "4px 8px", flexShrink: 0 }} title="Remove">
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "sessions" && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
              <div style={{ width: selectedId ? 210 : "100%", borderRight: selectedId ? "1px solid var(--border)" : "none", overflow: "auto", flexShrink: 0 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
                  <p style={{ fontWeight: 700, fontSize: 13 }}>Sessions</p>
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: 8 }}>{sessions.length}</span>
                  <button onClick={loadSessions} style={{ marginLeft: "auto", color: "var(--text-dim)", padding: "2px 6px" }}>
                    <RotateCcw size={12} strokeWidth={2} />
                  </button>
                </div>
                <SessionList sessions={sessions} selectedId={selectedId} onSelect={openSession} onDelete={handleDeleteSession} />
              </div>
              {selectedId && (
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {loadingDetail ? (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>Loading…</div>
                  ) : compareDetail && sessionDetail ? (
                    <CompareView sessionA={sessionDetail} sessionB={compareDetail} onBack={() => setCompareDetail(null)} />
                  ) : sessionDetail ? (
                    <SessionDetailView session={sessionDetail} allSessions={sessions} onBack={() => { setSelectedId(null); setSessionDetail(null); setCompareDetail(null) }} onCompare={handleCompare} />
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 12 }}>
                      Failed to load session
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div style={{ flex: 1, overflow: "auto", padding: "20px 18px" }}>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 18 }}>Settings</p>
              <form onSubmit={(e) => { e.preventDefault(); saveSettings() }} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>

                {/* LMU paths */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="card-header">
                    <FolderOpen size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
                    <span style={{ fontWeight: 600, fontSize: 12 }}>LMU paths</span>
                  </div>
                  <Field label="Results folder" hint="…\Le Mans Ultimate\UserData\player\Results">
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={settings.watchFolder} onChange={(e) => setSettings((s) => ({ ...s, watchFolder: e.target.value }))} placeholder="Click Browse or paste path" />
                      <BrowseBtn onClick={() => browseFolder("watchFolder", "Select LMU Results folder")} />
                    </div>
                  </Field>
                  <Field label="Replays folder" hint="Optional — auto-detects new .vcr files">
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={settings.replayFolder} onChange={(e) => setSettings((s) => ({ ...s, replayFolder: e.target.value }))} placeholder="Optional" />
                      <BrowseBtn onClick={() => browseFolder("replayFolder", "Select LMU Replays folder")} />
                    </div>
                  </Field>
                  <Field label="Driver name" hint="Your in-game name — identifies your laps in multiplayer">
                    <input value={settings.driverName} onChange={(e) => setSettings((s) => ({ ...s, driverName: e.target.value }))} placeholder="Adrian Doom" />
                  </Field>
                </div>

                {/* Cloud sync */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="card-header">
                    <CloudUpload size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
                    <span style={{ fontWeight: 600, fontSize: 12 }}>Cloud sync</span>
                    <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: "auto" }}>Optional</span>
                  </div>
                  <Field label="UrApex URL" hint="Leave empty to use standalone (local only)">
                    <input value={settings.apiUrl} onChange={(e) => setSettings((s) => ({ ...s, apiUrl: e.target.value }))} placeholder="https://your-urapex.com" />
                  </Field>
                  <Field label="API key" hint="Generate in UrApex → Settings → Companion app">
                    <input type="password" value={settings.apiKey} onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))} placeholder="uapx_…" />
                  </Field>
                </div>

                {/* System */}
                <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 12 }}>Start with Windows</p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>Launch automatically on login</p>
                  </div>
                  <Toggle on={autostart} onChange={toggleAutostart} />
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                  Save settings
                </button>

                {/* Danger zone */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border-soft)", marginTop: 4 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>Quit app</p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)" }}>Close completely and exit from tray</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => invoke("quit_app")}
                    className="btn btn-danger"
                    style={{ gap: 6, flexShrink: 0 }}
                  >
                    <LogOut size={12} strokeWidth={2} />
                    Quit
                  </button>
                </div>
              </form>

              {/* ── Overlay & Telemetry ── */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 0 }}>
                <div className="card-header">
                  <MonitorPlay size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>In-game overlay</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: "auto" }}>SHM</span>
                </div>
                <p style={{ fontSize: 10, color: "var(--text-dim)", margin: 0, lineHeight: 1.5 }}>
                  Reads LMU Shared Memory directly (<code>$rFactor2SMMP_Telemetry$</code>). Requires{" "}
                  <strong>rFactor2SharedMemoryMapPlugin64.dll</strong> in the LMU Plugins folder.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={toggleTelemetry}
                    className={`btn ${telemetryActive ? "btn-danger" : "btn-ghost"}`}
                    style={{ gap: 6 }}
                  >
                    <RadioTower size={12} strokeWidth={2} />
                    {telemetryActive ? "Stop telemetry" : "Start telemetry"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleOverlay}
                    className={`btn ${overlayVisible ? "btn-primary" : "btn-ghost"}`}
                    style={{ gap: 6 }}
                  >
                    <MonitorPlay size={12} strokeWidth={2} />
                    {overlayVisible ? "Hide overlay" : "Show overlay"}
                  </button>
                  {telemetryActive && (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`btn ${recordingId ? "btn-danger" : "btn-ghost"}`}
                      style={{ gap: 6 }}
                    >
                      <RadioTower size={12} strokeWidth={2} />
                      {recordingId ? "Stop recording" : "Record session"}
                    </button>
                  )}
                </div>
                {telemetryActive && (
                  <p style={{ fontSize: 10, color: "var(--green)", margin: 0 }}>
                    Reading LMU shared memory…
                    {recordingId && <span style={{ color: "var(--red)", marginLeft: 8 }}>● Recording</span>}
                  </p>
                )}
              </div>

              {/* ── Updates ── */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                <div className="card-header" style={{ marginBottom: 0, paddingBottom: 10 }}>
                  <RefreshCw size={13} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>About & updates</span>
                  {appVersion && <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: "auto" }}>v{appVersion}</span>}
                </div>

                {pendingUpdate ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ArrowUpCircle size={14} strokeWidth={2} style={{ color: "var(--amber)", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>v{pendingUpdate.version} available</p>
                        {pendingUpdate.body && <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>{pendingUpdate.body}</p>}
                      </div>
                    </div>
                    {installing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${updateProgress}%`, background: "var(--cyan)", borderRadius: 99, transition: "width 0.2s" }} />
                        </div>
                        <p style={{ fontSize: 10, color: "var(--text-dim)" }}>
                          {updateProgress < 100 ? `Downloading… ${updateProgress}%` : "Installing — the app will restart"}
                        </p>
                      </div>
                    ) : (
                      <button onClick={installUpdate} className="btn btn-primary" style={{ alignSelf: "flex-start", gap: 6 }}>
                        <Download size={13} strokeWidth={2} /> Download and install
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ flex: 1, fontSize: 11, color: "var(--text-dim)" }}>{updateStatus}</p>
                    <button onClick={checkForUpdates} disabled={checkingUpdate} className="btn btn-ghost" style={{ padding: "5px 10px", gap: 5, flexShrink: 0 }}>
                      {checkingUpdate ? <Loader2 size={12} strokeWidth={2} className="spin" /> : <RefreshCw size={12} strokeWidth={2} />}
                      Check
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

         </div>{/* .tab-content */}
        </main>
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────── */

function TitleBar({ watching, pendingUpdate, onUpdateClick }: { watching: boolean; pendingUpdate: boolean; onUpdateClick: () => void }) {
  async function minimize() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window")
    await getCurrentWindow().minimize()
  }
  async function hideWindow() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window")
    await getCurrentWindow().hide()
  }
  return (
    <div
      data-tauri-drag-region
      style={{
        height: 40, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 10px 0 14px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1, pointerEvents: "none" }}>⚡</span>
      <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.03em", color: "var(--text)", marginLeft: 7, pointerEvents: "none" }}>UrApex</span>

      {watching && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          marginLeft: 14, padding: "2px 9px",
          background: "rgba(74,222,128,0.07)",
          border: "1px solid rgba(74,222,128,0.18)",
          borderRadius: 20, pointerEvents: "none",
        }}>
          <span className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", display: "block" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--green)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Watching</span>
        </div>
      )}

      {pendingUpdate && (
        <button
          onClick={onUpdateClick}
          data-tauri-drag-region="false"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            marginLeft: 10, padding: "2px 9px",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: 20, cursor: "pointer",
          }}
          title="Update available — click to install"
        >
          <ArrowUpCircle size={10} strokeWidth={2.5} style={{ color: "var(--amber)" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--amber)", letterSpacing: "0.05em" }}>Update</span>
        </button>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
        <button className="wbtn" onClick={minimize} title="Minimize"><Minus size={10} strokeWidth={2} /></button>
        <button className="wbtn wbtn-close" onClick={hideWindow} title="Minimize to tray (right-click tray → Quit to exit)"><X size={10} strokeWidth={2} /></button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontWeight: 600, fontSize: 11, color: "var(--text-muted)" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.5, margin: 0 }}>{hint}</p>}
    </div>
  )
}

function BrowseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-ghost" style={{ flexShrink: 0, padding: "6px 11px", fontSize: 11, gap: 5 }}>
      <FolderOpen size={12} strokeWidth={2} /> Browse
    </button>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 38, height: 22, borderRadius: 11,
        background: on ? "var(--cyan)" : "var(--border)",
        border: "none", cursor: "pointer",
        position: "relative", flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: on ? 19 : 3,
        width: 16, height: 16,
        borderRadius: "50%", background: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  )
}
