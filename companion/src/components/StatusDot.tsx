export function StatusDot({ watching }: { watching: boolean }) {
  if (!watching) return null
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "block", boxShadow: "0 0 6px var(--green)" }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--green)" }}>Live</span>
    </div>
  )
}
