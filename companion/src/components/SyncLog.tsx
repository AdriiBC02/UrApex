export type SyncStatus = "uploading" | "success" | "duplicate" | "error"

interface LogEntry {
  id: number
  file: string
  status: SyncStatus
  message?: string
  timestamp: Date
}

const STATUS_CONFIG: Record<SyncStatus, { icon: string; color: string; label: string }> = {
  uploading: { icon: "↑", color: "var(--cyan)",  label: "Uploading" },
  success:   { icon: "✓", color: "var(--green)", label: "Imported" },
  duplicate: { icon: "=", color: "var(--text-dim)", label: "Duplicate" },
  error:     { icon: "✕", color: "var(--red)",   label: "Failed" },
}

export function SyncLog({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: "var(--text-dim)", gap: 8,
      }}>
        <span style={{ fontSize: 28 }}>📂</span>
        <p style={{ fontSize: 13 }}>No sessions synced yet</p>
        <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Start watching to auto-upload new LMU result files
        </p>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, overflow: "auto", borderRadius: 8, border: "1px solid var(--border)",
      background: "var(--surface)",
    }}>
      {logs.map((entry) => {
        const cfg = STATUS_CONFIG[entry.status]
        return (
          <div
            key={entry.id}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ color: cfg.color, fontSize: 14, width: 16, textAlign: "center", flexShrink: 0 }}>
              {cfg.icon}
            </span>
            <span style={{
              fontFamily: "monospace", fontSize: 11, color: "var(--text)", flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {entry.file || "—"}
            </span>
            <span style={{ fontSize: 11, color: cfg.color, flexShrink: 0 }}>
              {cfg.label}
              {entry.message ? ` — ${entry.message}` : ""}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>
              {entry.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
