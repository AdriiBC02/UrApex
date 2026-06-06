import { CheckCircle2, AlertCircle, CopyMinus, Loader2, CloudUpload, type LucideIcon } from "lucide-react"

export type SyncStatus = "uploading" | "success" | "duplicate" | "error"

interface LogEntry {
  id:        number
  file:      string
  status:    SyncStatus
  message?:  string
  timestamp: Date
}

const STATUS: Record<SyncStatus, {
  icon: LucideIcon
  color: string
  label: string
}> = {
  uploading: { icon: Loader2,       color: "var(--cyan)",     label: "Uploading"  },
  success:   { icon: CheckCircle2,  color: "var(--green)",    label: "Imported"   },
  duplicate: { icon: CopyMinus,     color: "var(--text-dim)", label: "Duplicate"  },
  error:     { icon: AlertCircle,   color: "var(--red)",      label: "Failed"     },
}

export function SyncLog({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, minHeight: 140 }}>
        <CloudUpload size={32} strokeWidth={1.25} style={{ color: "var(--text-dim)" }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>No activity yet</p>
        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>
          Start watching to auto-import new LMU result files
        </p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: "auto", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)" }}>
      {logs.map((entry, i) => {
        const cfg = STATUS[entry.status]
        const Icon = cfg.icon
        return (
          <div
            key={entry.id}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px",
              borderBottom: i < logs.length - 1 ? "1px solid var(--border-soft)" : "none",
            }}
          >
            <Icon
              size={13} strokeWidth={2}
              className={entry.status === "uploading" ? "spin" : undefined}
              style={{ color: cfg.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.file || "—"}
            </span>
            {entry.message && (
              <span
                title={entry.message}
                style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {entry.message}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, flexShrink: 0 }}>{cfg.label}</span>
            <span style={{ fontSize: 9, color: "var(--text-dim)", flexShrink: 0, minWidth: 48, textAlign: "right" }}>
              {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
