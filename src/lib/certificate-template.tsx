// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createElement as _h } from "satori/jsx"
const h = _h as (...args: any[]) => any

export type CertFormat = "portrait" | "mobile"

export const CERT_DIMS: Record<CertFormat, { w: number; h: number }> = {
  portrait: { w: 800, h: 1000 },
  mobile:   { w: 800, h: 1422 },
}

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
  return { main: "FINISHED", sub: "NORMALLY" }
}

const CYAN   = "#00b4d8"
const DARK   = "#0a0a0b"
const CARD   = "#111113"
const BORDER = "#1e1e22"
const DIM    = "#6b7280"
const WHITE  = "#ffffff"

const flex = (extra?: object) => ({ display: "flex", ...extra })
const col  = (extra?: object) => ({ display: "flex", flexDirection: "column" as const, ...extra })
const abs  = (extra?: object) => ({ display: "flex", position: "absolute" as const, ...extra })

// Section heights per format
const S = {
  portrait: { header: 65, info: 157, hero: 340, pos: 130, car: 81, stats: 130, footer: 97 },
  mobile:   { header: 88, info: 200, hero: 540, pos: 165, car: 100, stats: 165, footer: 164 },
} satisfies Record<CertFormat, Record<string, number>>

export function buildCertificateJSX(d: CertificateData, format: CertFormat = "portrait") {
  const { main: finMain, sub: finSub } = finishStatusShort(d.finishStatus)
  const isRace = d.sessionType === "RACE"
  const s = S[format]
  const W = CERT_DIMS[format].w

  const statCells: Array<{ label: string; value: string; sub: string | null; accent?: boolean }> = [
    ...(d.consistency != null
      ? [{ label: "CONSISTENCY", value: `${Math.round(d.consistency)}%`, sub: consistencyLabel(d.consistency), accent: d.consistency >= 88 }]
      : []),
    ...(isRace ? [{ label: "PIT STOPS", value: String(d.pitStops), sub: null }] : []),
    { label: "INCIDENTS", value: String(d.incidents), sub: d.incidents === 0 ? "CLEAN" : null, accent: d.incidents === 0 },
    { label: "FINISH", value: finMain, sub: finSub, accent: finMain === "FINISHED" },
  ]

  // ── Header ────────────────────────────────────────────────────────────────────
  const header = h("div", {
    style: flex({
      alignItems: "center", padding: "0 28px", height: s.header,
      backgroundColor: "#0d0d0f", flexShrink: 0,
      borderBottom: `3px solid ${CYAN}`,
    }),
  },
    d.urApexLogoB64
      ? h("img", { src: d.urApexLogoB64, width: 48, height: 48, style: { objectFit: "contain" } })
      : h("div", { style: flex({ fontFamily: "Lexend", fontSize: 22, fontWeight: 900, color: WHITE }) }, "UA"),
    h("div", { style: flex({ width: 1, height: 32, backgroundColor: BORDER, margin: "0 20px", flexShrink: 0 }) }),
    d.lmuLogoB64
      ? h("img", { src: d.lmuLogoB64, width: 108, height: 30, style: { objectFit: "contain" } })
      : h("div", { style: flex() }),
    h("div", { style: flex({ marginLeft: "auto" }) },
      d.isNewPB
        ? h("div", {
            style: flex({
              backgroundColor: CYAN, color: DARK, fontSize: 10, fontWeight: 700,
              letterSpacing: 3, padding: "5px 14px", borderRadius: 3,
            }),
          }, "NEW PB")
        : null,
    ),
  )

  // ── Session info ──────────────────────────────────────────────────────────────
  const sessionInfo = h("div", {
    style: flex({
      padding: "22px 28px 18px", height: s.info,
      backgroundColor: "#0d0d0f", flexShrink: 0,
      borderBottom: `1px solid ${BORDER}`,
    }),
  },
    h("div", { style: col({ flex: 1, justifyContent: "space-between" }) },
      h("div", { style: col({ gap: 2 }) },
        h("div", { style: flex({ fontSize: 11, letterSpacing: 7, color: DIM, fontWeight: 600 }) },
          d.sessionType === "QUALIFYING" ? "QUALIFYING"
          : d.sessionType === "PRACTICE" ? "PRACTICE"
          : "SESSION",
        ),
        h("div", {
          style: flex({ fontFamily: "Lexend", fontSize: 66, fontWeight: 900, color: WHITE, lineHeight: 1, letterSpacing: -2 }),
        },
          d.sessionType === "QUALIFYING" ? "QUALI"
          : d.sessionType === "PRACTICE" ? "PRACTICE"
          : "SUMMARY",
        ),
      ),
      h("div", { style: flex({ gap: 10, fontSize: 13, color: DIM, alignItems: "center" }) },
        h("span", {}, d.sessionDate),
        h("div", { style: flex({ width: 3, height: 3, borderRadius: 2, backgroundColor: DIM }) }),
        h("span", {}, d.duration),
        ...(d.isOnline ? [
          h("div", { style: flex({ width: 3, height: 3, borderRadius: 2, backgroundColor: CYAN }) }),
          h("span", { style: { display: "flex", color: CYAN, fontWeight: 700, fontSize: 12 } }, "ONLINE"),
        ] : []),
      ),
    ),
    h("div", { style: col({ alignItems: "flex-end", justifyContent: "space-between" }) },
      h("div", { style: col({ alignItems: "flex-end", gap: 3 }) },
        h("div", { style: flex({ fontSize: 9, color: CYAN, letterSpacing: 3, fontWeight: 700 }) }, "CIRCUIT"),
        h("div", { style: flex({ fontSize: 14, fontWeight: 700, color: WHITE, textAlign: "right", maxWidth: 180 }) }, d.trackName),
      ),
      d.trackLogoB64
        ? h("img", { src: d.trackLogoB64, width: 144, height: 68, style: { objectFit: "contain", opacity: 0.9 } })
        : h("div", { style: flex({ width: 144, height: 68 }) }),
    ),
  )

  // ── Hero ──────────────────────────────────────────────────────────────────────
  // Absolutely-positioned <img> with explicit pixel dims + objectFit cover.
  // backgroundSize:"cover" is NOT supported in satori 0.26 — image would tile.
  const hero = h("div", {
    style: {
      display: "flex", position: "relative", width: W, height: s.hero, flexShrink: 0,
      backgroundColor: "#0d0d10", overflow: "hidden",
    },
  },
    d.trackBgB64
      ? h("img", { src: d.trackBgB64, style: { position: "absolute", top: 0, left: 0, width: W, height: s.hero, objectFit: "cover" } })
      : null,
    h("div", { style: abs({ bottom: 0, left: 0, width: W, height: 220,
      background: `linear-gradient(to bottom, transparent, ${DARK})` }) }),
    h("div", { style: abs({ top: 0, left: 0, width: W, height: 80,
      background: `linear-gradient(to bottom, #0d0d0f, transparent)` }) }),
    h("div", { style: abs({ top: 0, left: 0, width: 240, height: s.hero,
      background: `linear-gradient(to right, rgba(10,10,11,0.55), transparent)` }) }),
  )

  // ── Position + Best Lap ───────────────────────────────────────────────────────
  const posRow = h("div", {
    style: flex({
      alignItems: "center", padding: "0 28px", height: s.pos,
      backgroundColor: CARD, flexShrink: 0,
      borderBottom: `1px solid ${BORDER}`,
      borderLeft: `4px solid ${CYAN}`,
    }),
  },
    isRace && d.finalPosition != null
      ? h("div", { style: flex({ flex: 1, alignItems: "center", gap: 16 }) },
          h("div", { style: flex({ fontFamily: "Lexend", fontSize: 88, fontWeight: 900, color: WHITE, lineHeight: 1, letterSpacing: -3 }) },
            `P${d.finalPosition}`),
          h("div", { style: col({ gap: 4 }) },
            h("div", { style: flex({ fontSize: 9, color: CYAN, letterSpacing: 3, fontWeight: 700 }) }, "POSITION"),
            h("div", { style: flex({ fontSize: 18, fontWeight: 700, color: WHITE }) },
              `${d.finalPosition} / ${d.totalParticipants}`),
          ),
        )
      : h("div", { style: col({ flex: 1, gap: 4 }) },
          h("div", { style: flex({ fontSize: 9, color: CYAN, letterSpacing: 3, fontWeight: 700 }) }, d.sessionType),
          h("div", { style: flex({ fontFamily: "Lexend", fontSize: 40, fontWeight: 900, color: WHITE, letterSpacing: -1 }) },
            `${d.totalLaps} LAPS`),
        ),
    h("div", { style: flex({ width: 1, height: 72, backgroundColor: BORDER, margin: "0 28px", flexShrink: 0 }) }),
    h("div", { style: col({ flex: 1, gap: 5 }) },
      h("div", { style: flex({ fontSize: 9, color: CYAN, letterSpacing: 3, fontWeight: 700 }) }, "BEST LAP"),
      h("div", { style: flex({ fontFamily: "Antonio", fontSize: 50, fontWeight: 600, color: WHITE, letterSpacing: 1 }) }, d.bestLap),
    ),
  )

  // ── Car section ───────────────────────────────────────────────────────────────
  const carRow = h("div", {
    style: flex({
      alignItems: "center", padding: "0 28px", height: s.car,
      backgroundColor: DARK, gap: 18, flexShrink: 0,
      borderBottom: `1px solid ${BORDER}`,
    }),
  },
    d.manufacturerB64
      ? h("img", { src: d.manufacturerB64, width: 40, height: 40, style: { objectFit: "contain", flexShrink: 0, opacity: 0.95 } })
      : h("div", { style: flex({ width: 40, height: 40, flexShrink: 0 }) }),
    h("div", { style: flex({ width: 1, height: 36, backgroundColor: BORDER, flexShrink: 0 }) }),
    h("div", { style: col({ flex: 1, gap: 2 }) },
      h("div", { style: flex({ fontSize: 9, color: DIM, letterSpacing: 3 }) }, "CAR"),
      h("div", { style: flex({ fontSize: 15, fontWeight: 700, color: WHITE }) }, d.carName),
    ),
    d.carClass
      ? h("div", { style: col({ alignItems: "center", gap: 3, marginRight: 20 }) },
          h("div", { style: flex({ fontSize: 9, color: DIM, letterSpacing: 2 }) }, "CLASS"),
          h("div", { style: flex({ fontSize: 10, fontWeight: 700, color: CYAN,
            border: `1px solid ${CYAN}`, padding: "3px 10px", borderRadius: 3, letterSpacing: 1 }) },
            d.carClass.toUpperCase()),
        )
      : null,
    h("div", { style: col({ alignItems: "center", gap: 2 }) },
      h("div", { style: flex({ fontSize: 9, color: DIM, letterSpacing: 2 }) }, "LAPS"),
      h("div", { style: flex({ fontFamily: "Lexend", fontSize: 28, fontWeight: 900, color: WHITE }) }, String(d.totalLaps)),
    ),
  )

  // ── Stats row ─────────────────────────────────────────────────────────────────
  const statsRow = h("div", {
    style: flex({ height: s.stats, borderBottom: `1px solid ${BORDER}`, backgroundColor: CARD, flexShrink: 0 }),
  },
    ...statCells.map((cell, i) =>
      h("div", {
        key: cell.label,
        style: flex({
          flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
          borderRight: i < statCells.length - 1 ? `1px solid ${BORDER}` : "none",
          padding: "0 10px",
          borderTop: cell.accent ? `3px solid ${CYAN}` : `3px solid transparent`,
        }),
      },
        h("div", { style: flex({ fontSize: 8, color: DIM, letterSpacing: 2, fontWeight: 700 }) }, cell.label),
        h("div", { style: flex({ fontFamily: "Antonio", fontSize: 36, fontWeight: 600,
          color: cell.accent ? CYAN : WHITE, lineHeight: 1 }) }, cell.value),
        cell.sub
          ? h("div", { style: flex({ fontSize: 8, color: cell.accent ? CYAN : DIM, letterSpacing: 1, fontWeight: 600 }) }, cell.sub)
          : h("div", { style: flex({ height: 10 }) }),
      ),
    ),
  )

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footer = format === "mobile"
    ? h("div", {
        style: col({
          alignItems: "center", justifyContent: "center", height: s.footer,
          gap: 10, backgroundColor: "#0d0d0f", flexShrink: 0,
          borderTop: `1px solid ${BORDER}`,
        }),
      },
        d.urApexLogoB64
          ? h("img", { src: d.urApexLogoB64, width: 52, height: 52, style: { objectFit: "contain", opacity: 0.85 } })
          : null,
        h("div", { style: flex({ width: 40, height: 1, backgroundColor: BORDER }) }),
        h("div", { style: flex({ gap: 8, alignItems: "center" }) },
          h("span", { style: { display: "flex", fontSize: 9, color: DIM, letterSpacing: 4, fontWeight: 700 } }, "POWERED BY"),
          h("span", { style: { display: "flex", fontSize: 11, color: "#9ca3af", letterSpacing: 3 } }, "URAPEX.ES"),
        ),
        h("div", { style: flex({ fontSize: 9, color: "#374151", letterSpacing: 3, fontWeight: 600 }) }, "YOUR RACING JOURNEY, DOCUMENTED"),
      )
    : h("div", {
        style: flex({
          alignItems: "center", justifyContent: "center", height: s.footer,
          gap: 10, backgroundColor: "#0d0d0f", flexShrink: 0,
          borderTop: `1px solid ${BORDER}`,
        }),
      },
        h("span", { style: { display: "flex", fontSize: 9, color: DIM, letterSpacing: 4, fontWeight: 700 } }, "POWERED BY"),
        d.urApexLogoB64
          ? h("img", { src: d.urApexLogoB64, width: 28, height: 28, style: { objectFit: "contain" } })
          : null,
        h("div", { style: flex({ width: 4, height: 4, borderRadius: 2, backgroundColor: BORDER }) }),
        h("span", { style: { display: "flex", fontSize: 10, color: "#9ca3af", letterSpacing: 3 } }, "URAPEX.ES"),
      )

  return h("div", {
    style: col({ width: W, height: CERT_DIMS[format].h, backgroundColor: DARK, color: WHITE,
                 fontFamily: "Heebo", overflow: "hidden" }),
  },
    header, sessionInfo, hero, posRow, carRow, statsRow, footer,
  )
}
