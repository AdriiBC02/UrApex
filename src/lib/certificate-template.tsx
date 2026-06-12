import type { ReactElement } from "react"

export interface CertificateData {
  // Session
  sessionType:   string   // "RACE" | "QUALIFYING" | "PRACTICE"
  sessionDate:   string   // formatted e.g. "12/06/2026"
  duration:      string   // formatted e.g. "01:24:37"
  isNewPB:       boolean
  isOnline:      boolean

  // Track
  trackName:     string
  trackLogoB64:  string | null
  trackBgB64:    string | null

  // Results
  finalPosition:     number | null
  totalParticipants: number
  bestLap:           string   // formatted e.g. "1:58.234"
  totalLaps:         number

  // Car
  carName:           string
  carClass:          string | null
  manufacturerB64:   string | null

  // Stats
  consistency:       number | null  // 0–100
  pitStops:          number
  incidents:         number
  finishStatus:      string   // "Finished Normally" | "DNF" | etc.

  // Logos
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
  if (s.includes("normally"))   return { main: "FINISHED",  sub: "NORMALLY" }
  if (s.includes("dnf") || s.includes("did not")) return { main: "DNF", sub: "DID NOT FINISH" }
  if (s.includes("dq"))         return { main: "DQ",        sub: "DISQUALIFIED" }
  if (s.includes("accident"))   return { main: "DNF",       sub: "ACCIDENT" }
  if (s.includes("mechanical")) return { main: "DNF",       sub: "MECHANICAL" }
  if (s === "" || s === "none") return { main: "FINISHED",  sub: "NORMALLY" }
  return { main: "FINISHED", sub: status.toUpperCase() }
}

// Cyan accent colour matching UrApex brand
const CYAN  = "#00b4d8"
const DARK  = "#0a0a0b"
const CARD  = "#111113"
const BORDER = "#1e1e22"
const TEXT_DIM = "#6b7280"

const W = 800
const H = 1420

export function buildCertificateJSX(d: CertificateData): ReactElement {
  const { main: finMain, sub: finSub } = finishStatusShort(d.finishStatus)
  const isRace = d.sessionType === "RACE"

  const statCells = [
    ...(d.consistency != null
      ? [{ label: "CONSISTENCY", value: `${Math.round(d.consistency)}%`, sub: consistencyLabel(d.consistency) }]
      : []),
    ...(isRace
      ? [{ label: "PIT STOPS",  value: String(d.pitStops), sub: null }]
      : []),
    { label: "INCIDENTS",    value: String(d.incidents),  sub: d.incidents === 0 ? "CLEAN" : null },
    { label: "FINISH",       value: finMain,              sub: finSub },
  ]

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: W,
        height: H,
        backgroundColor: DARK,
        color: "white",
        fontFamily: "Heebo",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Header bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          height: 80,
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: "#0d0d0f",
          flexShrink: 0,
        }}
      >
        {d.urApexLogoB64 ? (
          <img src={d.urApexLogoB64} width={64} height={64} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", fontSize: 28, fontWeight: 900, color: "white", letterSpacing: -1 }}>
            URAPEX
          </div>
        )}
        <div style={{ display: "flex", width: 1, height: 40, backgroundColor: BORDER, margin: "0 24px" }} />
        {d.lmuLogoB64 && (
          <img src={d.lmuLogoB64} height={36} style={{ objectFit: "contain" }} />
        )}
        {/* PB badge */}
        {d.isNewPB && (
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              backgroundColor: CYAN,
              color: DARK,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "5px 12px",
              borderRadius: 4,
            }}
          >
            NEW PB
          </div>
        )}
      </div>

      {/* ── Session info + track outline ── */}
      <div
        style={{
          display: "flex",
          padding: "28px 32px 20px",
          height: 210,
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: "#0d0d0f",
          flexShrink: 0,
        }}
      >
        {/* Left: title + meta */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: 13,
              letterSpacing: 8,
              color: TEXT_DIM,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            {d.sessionType === "QUALIFYING" ? "QUALIFYING" : d.sessionType === "PRACTICE" ? "PRACTICE" : "SESSION"}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Lexend",
              fontSize: 72,
              fontWeight: 900,
              color: "white",
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {d.sessionType === "QUALIFYING" ? "QUALI" : d.sessionType === "PRACTICE" ? "REPORT" : "SUMMARY"}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              gap: 12,
              fontSize: 14,
              color: TEXT_DIM,
              alignItems: "center",
            }}
          >
            <span>{d.sessionDate}</span>
            <div style={{ display: "flex", width: 4, height: 4, borderRadius: 2, backgroundColor: CYAN }} />
            <span>{d.duration}</span>
            {d.isOnline && (
              <>
                <div style={{ display: "flex", width: 4, height: 4, borderRadius: 2, backgroundColor: CYAN }} />
                <span style={{ color: CYAN, fontWeight: 600 }}>ONLINE</span>
              </>
            )}
          </div>
        </div>

        {/* Right: circuit info + SVG logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 10, color: CYAN, letterSpacing: 3, marginBottom: 4, fontWeight: 600 }}>
            CIRCUIT
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 700,
              color: "white",
              textAlign: "right",
              maxWidth: 200,
            }}
          >
            {d.trackName}
          </div>
          {d.trackLogoB64 && (
            <img
              src={d.trackLogoB64}
              width={160}
              height={80}
              style={{ objectFit: "contain", marginTop: 8, opacity: 0.9 }}
            />
          )}
        </div>
      </div>

      {/* ── Hero: track background ── */}
      <div style={{ display: "flex", position: "relative", height: 360, flexShrink: 0 }}>
        {d.trackBgB64 ? (
          <img
            src={d.trackBgB64}
            width={W}
            height={360}
            style={{ objectFit: "cover", position: "absolute", top: 0, left: 0 }}
          />
        ) : (
          <div style={{ display: "flex", position: "absolute", inset: 0, backgroundColor: "#0d0d10" }} />
        )}
        {/* gradient fade to dark at bottom */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
            background: `linear-gradient(to bottom, transparent, ${DARK})`,
          }}
        />
        {/* gradient fade at top */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            background: `linear-gradient(to bottom, #0d0d0f, transparent)`,
          }}
        />
      </div>

      {/* ── Position + Best Lap ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          height: 130,
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: CARD,
          flexShrink: 0,
        }}
      >
        {isRace && d.finalPosition != null ? (
          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Lexend",
                fontSize: 88,
                fontWeight: 900,
                color: "white",
                lineHeight: 1,
              }}
            >
              P{d.finalPosition}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", fontSize: 10, color: CYAN, letterSpacing: 3, fontWeight: 600 }}>
                POSITION
              </div>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>
                {d.finalPosition} / {d.totalParticipants}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 10, color: CYAN, letterSpacing: 3, fontWeight: 600 }}>
              {d.sessionType}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Lexend",
                fontSize: 36,
                fontWeight: 900,
                color: TEXT_DIM,
              }}
            >
              {d.totalLaps} LAPS
            </div>
          </div>
        )}

        <div style={{ display: "flex", width: 1, height: 70, backgroundColor: BORDER, margin: "0 32px" }} />

        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 10, color: CYAN, letterSpacing: 3, fontWeight: 600, marginBottom: 4 }}>
            BEST LAP
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Antonio",
              fontSize: 54,
              fontWeight: 600,
              color: "white",
              letterSpacing: 1,
            }}
          >
            {d.bestLap}
          </div>
        </div>
      </div>

      {/* ── Car section ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          height: 90,
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: DARK,
          gap: 20,
          flexShrink: 0,
        }}
      >
        {/* Manufacturer logo */}
        {d.manufacturerB64 && (
          <img
            src={d.manufacturerB64}
            width={50}
            height={50}
            style={{ objectFit: "contain", flexShrink: 0 }}
          />
        )}

        {/* Car name */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 10, color: TEXT_DIM, letterSpacing: 2, marginBottom: 2 }}>CAR</div>
          <div style={{ display: "flex", fontSize: 17, fontWeight: 600, color: "white" }}>{d.carName}</div>
        </div>

        {/* Class */}
        {d.carClass && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 10, color: TEXT_DIM, letterSpacing: 2 }}>CLASS</div>
            <div
              style={{
                display: "flex",
                fontSize: 12,
                fontWeight: 700,
                color: CYAN,
                border: `1px solid ${CYAN}`,
                padding: "3px 8px",
                borderRadius: 3,
                letterSpacing: 1,
              }}
            >
              {d.carClass.toUpperCase()}
            </div>
          </div>
        )}

        {/* Laps (for race) or separator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: 8 }}>
          <div style={{ display: "flex", fontSize: 10, color: TEXT_DIM, letterSpacing: 2 }}>LAPS</div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 900, fontFamily: "Lexend", color: "white" }}>
            {d.totalLaps}
          </div>
        </div>
      </div>

      {/* ── Bottom stats ── */}
      <div
        style={{
          display: "flex",
          height: 130,
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: CARD,
          flexShrink: 0,
        }}
      >
        {statCells.map((cell, i) => (
          <div
            key={cell.label}
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              borderRight: i < statCells.length - 1 ? `1px solid ${BORDER}` : "none",
              padding: "0 8px",
            }}
          >
            <div style={{ display: "flex", fontSize: 9, color: TEXT_DIM, letterSpacing: 2, fontWeight: 600 }}>
              {cell.label}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Antonio",
                fontSize: 36,
                fontWeight: 600,
                color: "white",
                lineHeight: 1,
              }}
            >
              {cell.value}
            </div>
            {cell.sub && (
              <div style={{ display: "flex", fontSize: 9, color: TEXT_DIM, letterSpacing: 1 }}>
                {cell.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 10,
          backgroundColor: "#0d0d0f",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <span style={{ display: "flex", fontSize: 10, color: TEXT_DIM, letterSpacing: 3, fontWeight: 600 }}>
          POWERED BY
        </span>
        {d.urApexLogoB64 && (
          <img src={d.urApexLogoB64} width={32} height={32} style={{ objectFit: "contain" }} />
        )}
        <div style={{ display: "flex", width: 4, height: 4, borderRadius: 2, backgroundColor: BORDER }} />
        <span style={{ display: "flex", fontSize: 11, color: TEXT_DIM, letterSpacing: 2 }}>
          URAPEX.GG
        </span>
      </div>
    </div>
  ) as ReactElement
}
