import { createElement as h } from "react"

export interface CertificateData {
  sessionType:       string
  sessionDate:       string
  duration:          string
  isNewPB:           boolean
  isOnline:          boolean
  trackName:         string
  trackLogoB64:      string | null
  trackBgB64:        string | null
  finalPosition:     number | null
  totalParticipants: number
  bestLap:           string
  totalLaps:         number
  carName:           string
  carClass:          string | null
  manufacturerB64:   string | null
  consistency:       number | null
  pitStops:          number
  incidents:         number
  finishStatus:      string
  urApexLogoB64:     string | null
  lmuLogoB64:        string | null
}

function consistencyLabel(v: number): string {
  if (v >= 95) return "PERFECT"
  if (v >= 88) return "VERY HIGH"
  if (v >= 75) return "HIGH"
  if (v >= 60) return "MODERATE"
  return "LOW"
}

function finishStatusShort(status: string): { main: string; sub: string } {
  const s = status.toLowerCase()
  if (s.includes("normally"))   return { main: "FINISHED", sub: "NORMALLY" }
  if (s === "dnf")              return { main: "DNF",      sub: "DID NOT FINISH" }
  if (s === "dq")               return { main: "DQ",       sub: "DISQUALIFIED" }
  if (s.includes("accident"))   return { main: "DNF",      sub: "ACCIDENT" }
  if (s.includes("mechanical")) return { main: "DNF",      sub: "MECHANICAL" }
  if (s === "" || s === "none") return { main: "FINISHED", sub: "NORMALLY" }
  return { main: "FINISHED", sub: status.toUpperCase() }
}

const CYAN   = "#00b4d8"
const DARK   = "#0a0a0b"
const CARD   = "#111113"
const BORDER = "#1e1e22"
const DIM    = "#6b7280"

const W = 800
const H = 1420

// Shorthand helpers
const flex  = (extra?: object) => ({ display: "flex", ...extra })
const col   = (extra?: object) => ({ display: "flex", flexDirection: "column" as const, ...extra })
const abs   = (extra?: object) => ({ display: "flex", position: "absolute" as const, ...extra })

export function buildCertificateJSX(d: CertificateData) {
  const { main: finMain, sub: finSub } = finishStatusShort(d.finishStatus)
  const isRace = d.sessionType === "RACE"

  const statCells: Array<{ label: string; value: string; sub: string | null }> = [
    ...(d.consistency != null
      ? [{ label: "CONSISTENCY", value: `${Math.round(d.consistency)}%`, sub: consistencyLabel(d.consistency) }]
      : []),
    ...(isRace
      ? [{ label: "PIT STOPS", value: String(d.pitStops), sub: null }]
      : []),
    { label: "INCIDENTS", value: String(d.incidents), sub: d.incidents === 0 ? "CLEAN" : null },
    { label: "FINISH",    value: finMain,              sub: finSub },
  ]

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = h("div", {
    style: flex({ alignItems: "center", padding: "0 32px", height: 80,
                  borderBottom: `1px solid ${BORDER}`, backgroundColor: "#0d0d0f", flexShrink: 0 }),
  },
    d.urApexLogoB64
      ? h("img", { src: d.urApexLogoB64, width: 64, height: 64, style: { objectFit: "contain" } })
      : h("div", { style: flex({ fontSize: 28, fontWeight: 900, color: "white", letterSpacing: -1 }) }, "URAPEX"),
    h("div", { style: flex({ width: 1, height: 40, backgroundColor: BORDER, margin: "0 24px", flexShrink: 0 }) }),
    d.lmuLogoB64
      ? h("img", { src: d.lmuLogoB64, width: 120, height: 36, style: { objectFit: "contain" } })
      : h("div", { style: flex() }),
    d.isNewPB
      ? h("div", {
          style: flex({ marginLeft: "auto", backgroundColor: CYAN, color: DARK, fontSize: 11,
                        fontWeight: 700, letterSpacing: 2, padding: "5px 12px", borderRadius: 4 }),
        }, "NEW PB")
      : h("div", { style: flex({ marginLeft: "auto" }) }),
  )

  // ── Session info ─────────────────────────────────────────────────────────────
  const sessionInfo = h("div", {
    style: flex({ padding: "28px 32px 20px", height: 210,
                  borderBottom: `1px solid ${BORDER}`, backgroundColor: "#0d0d0f", flexShrink: 0 }),
  },
    // Left: title
    h("div", { style: col({ flex: 1 }) },
      h("div", { style: flex({ fontSize: 13, letterSpacing: 8, color: DIM, fontWeight: 600, marginBottom: 4 }) },
        d.sessionType === "QUALIFYING" ? "QUALIFYING" : d.sessionType === "PRACTICE" ? "PRACTICE" : "SESSION",
      ),
      h("div", { style: flex({ fontFamily: "Lexend", fontSize: 72, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: -2 }) },
        d.sessionType === "QUALIFYING" ? "QUALI" : d.sessionType === "PRACTICE" ? "REPORT" : "SUMMARY",
      ),
      h("div", { style: flex({ marginTop: 12, gap: 12, fontSize: 14, color: DIM, alignItems: "center" }) },
        h("span", {}, d.sessionDate),
        h("div", { style: flex({ width: 4, height: 4, borderRadius: 2, backgroundColor: CYAN }) }),
        h("span", {}, d.duration),
        ...(d.isOnline ? [
          h("div", { key: "dot2", style: flex({ width: 4, height: 4, borderRadius: 2, backgroundColor: CYAN }) }),
          h("span", { key: "online", style: { color: CYAN, fontWeight: 600 } }, "ONLINE"),
        ] : []),
      ),
    ),
    // Right: circuit
    h("div", { style: col({ alignItems: "flex-end" }) },
      h("div", { style: flex({ fontSize: 10, color: CYAN, letterSpacing: 3, marginBottom: 4, fontWeight: 600 }) }, "CIRCUIT"),
      h("div", { style: flex({ fontSize: 16, fontWeight: 700, color: "white", textAlign: "right", maxWidth: 200 }) }, d.trackName),
      d.trackLogoB64
        ? h("img", { src: d.trackLogoB64, width: 160, height: 80, style: { objectFit: "contain", marginTop: 8, opacity: 0.9 } })
        : h("div", { style: flex({ width: 160, height: 80 }) }),
    ),
  )

  // ── Hero ─────────────────────────────────────────────────────────────────────
  const hero = h("div", { style: { display: "flex", position: "relative", height: 360, flexShrink: 0 } },
    d.trackBgB64
      ? h("img", { src: d.trackBgB64, width: W, height: 360, style: { objectFit: "cover", position: "absolute", top: 0, left: 0 } })
      : h("div", { style: abs({ inset: 0, backgroundColor: "#0d0d10" }) }),
    h("div", { style: abs({ bottom: 0, left: 0, right: 0, height: 160, background: `linear-gradient(to bottom, transparent, ${DARK})` }) }),
    h("div", { style: abs({ top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, #0d0d0f, transparent)" }) }),
  )

  // ── Position + Best Lap ──────────────────────────────────────────────────────
  const posRow = h("div", {
    style: flex({ alignItems: "center", padding: "0 32px", height: 130,
                  borderBottom: `1px solid ${BORDER}`, backgroundColor: CARD, flexShrink: 0 }),
  },
    isRace && d.finalPosition != null
      ? h("div", { style: flex({ flex: 1, alignItems: "center", gap: 16 }) },
          h("div", { style: flex({ fontFamily: "Lexend", fontSize: 88, fontWeight: 900, color: "white", lineHeight: 1 }) },
            `P${d.finalPosition}`,
          ),
          h("div", { style: col({ gap: 2 }) },
            h("div", { style: flex({ fontSize: 10, color: CYAN, letterSpacing: 3, fontWeight: 600 }) }, "POSITION"),
            h("div", { style: flex({ fontSize: 22, fontWeight: 700 }) }, `${d.finalPosition} / ${d.totalParticipants}`),
          ),
        )
      : h("div", { style: col({ flex: 1 }) },
          h("div", { style: flex({ fontSize: 10, color: CYAN, letterSpacing: 3, fontWeight: 600 }) }, d.sessionType),
          h("div", { style: flex({ fontFamily: "Lexend", fontSize: 36, fontWeight: 900, color: DIM }) }, `${d.totalLaps} LAPS`),
        ),
    h("div", { style: flex({ width: 1, height: 70, backgroundColor: BORDER, margin: "0 32px", flexShrink: 0 }) }),
    h("div", { style: col({ flex: 1 }) },
      h("div", { style: flex({ fontSize: 10, color: CYAN, letterSpacing: 3, fontWeight: 600, marginBottom: 4 }) }, "BEST LAP"),
      h("div", { style: flex({ fontFamily: "Antonio", fontSize: 54, fontWeight: 600, color: "white", letterSpacing: 1 }) }, d.bestLap),
    ),
  )

  // ── Car section ──────────────────────────────────────────────────────────────
  const carRow = h("div", {
    style: flex({ alignItems: "center", padding: "0 32px", height: 90,
                  borderBottom: `1px solid ${BORDER}`, backgroundColor: DARK, gap: 20, flexShrink: 0 }),
  },
    d.manufacturerB64
      ? h("img", { src: d.manufacturerB64, width: 50, height: 50, style: { objectFit: "contain", flexShrink: 0 } })
      : h("div", { style: flex({ width: 50, height: 50, flexShrink: 0 }) }),
    h("div", { style: col({ flex: 1 }) },
      h("div", { style: flex({ fontSize: 10, color: DIM, letterSpacing: 2, marginBottom: 2 }) }, "CAR"),
      h("div", { style: flex({ fontSize: 17, fontWeight: 600, color: "white" }) }, d.carName),
    ),
    d.carClass
      ? h("div", { style: col({ alignItems: "center", gap: 4 }) },
          h("div", { style: flex({ fontSize: 10, color: DIM, letterSpacing: 2 }) }, "CLASS"),
          h("div", { style: flex({ fontSize: 12, fontWeight: 700, color: CYAN,
                                   border: `1px solid ${CYAN}`, padding: "3px 8px", borderRadius: 3, letterSpacing: 1 }) },
            d.carClass.toUpperCase(),
          ),
        )
      : h("div", { style: flex() }),
    h("div", { style: col({ alignItems: "center", marginLeft: 8 }) },
      h("div", { style: flex({ fontSize: 10, color: DIM, letterSpacing: 2 }) }, "LAPS"),
      h("div", { style: flex({ fontFamily: "Lexend", fontSize: 28, fontWeight: 900, color: "white" }) }, String(d.totalLaps)),
    ),
  )

  // ── Stats row ────────────────────────────────────────────────────────────────
  const statsRow = h("div", {
    style: flex({ height: 130, borderBottom: `1px solid ${BORDER}`, backgroundColor: CARD, flexShrink: 0 }),
  },
    ...statCells.map((cell, i) =>
      h("div", {
        key: cell.label,
        style: flex({
          flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          borderRight: i < statCells.length - 1 ? `1px solid ${BORDER}` : "none",
          padding: "0 8px",
        }),
      },
        h("div", { style: flex({ fontSize: 9, color: DIM, letterSpacing: 2, fontWeight: 600 }) }, cell.label),
        h("div", { style: flex({ fontFamily: "Antonio", fontSize: 36, fontWeight: 600, color: "white", lineHeight: 1 }) }, cell.value),
        cell.sub
          ? h("div", { style: flex({ fontSize: 9, color: DIM, letterSpacing: 1 }) }, cell.sub)
          : h("div", { style: flex({ height: 12 }) }),
      ),
    ),
  )

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footer = h("div", {
    style: flex({ alignItems: "center", justifyContent: "center", flex: 1,
                  gap: 10, backgroundColor: "#0d0d0f", borderTop: `1px solid ${BORDER}` }),
  },
    h("span", { style: { display: "flex", fontSize: 10, color: DIM, letterSpacing: 3, fontWeight: 600 } }, "POWERED BY"),
    d.urApexLogoB64
      ? h("img", { src: d.urApexLogoB64, width: 32, height: 32, style: { objectFit: "contain" } })
      : h("div", { style: flex() }),
    h("div", { style: flex({ width: 4, height: 4, borderRadius: 2, backgroundColor: BORDER }) }),
    h("span", { style: { display: "flex", fontSize: 11, color: DIM, letterSpacing: 2 } }, "URAPEX.GG"),
  )

  // ── Root ─────────────────────────────────────────────────────────────────────
  return h("div", {
    style: col({ width: W, height: H, backgroundColor: DARK, color: "white",
                 fontFamily: "Heebo", overflow: "hidden", position: "relative" }),
  },
    header,
    sessionInfo,
    hero,
    posRow,
    carRow,
    statsRow,
    footer,
  )
}
