export function StatusDot({ watching }: { watching: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: watching ? "var(--green)" : "var(--border-light)",
        boxShadow: watching ? "0 0 6px var(--green)" : "none",
        animation: watching ? "pulse 2s infinite" : "none",
      }} />
      <span style={{ fontSize: 11, color: watching ? "var(--green)" : "var(--text-dim)" }}>
        {watching ? "Watching" : "Idle"}
      </span>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  )
}
