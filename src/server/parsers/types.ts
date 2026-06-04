// ─── Raw parsed data from a simulator result file ────────────────────────────

export interface ParsedLap {
  lapNumber: number
  lapTimeMs: number | null
  isValid: boolean
  sector1Ms: number | null
  sector2Ms: number | null
  sector3Ms: number | null
  fuelLoad?: number
  tyreCompound?: string
}

export interface ParsedParticipant {
  driverName: string
  teamName?: string
  carRawName?: string
  carClassRawName?: string
  position?: number
  lapsCompleted?: number
  bestLapMs?: number
  totalTimeMs?: number
  gapToLeaderMs?: number
  dnf?: boolean
  dq?: boolean
}

export interface ParsedIncident {
  lapNumber?: number
  type?: string
  description?: string
  severity?: number
}

export interface ParsedPenalty {
  lapNumber?: number
  type?: string
  description?: string
  timeSec?: number
}

export interface ParsedPitStop {
  lapNumber?: number
  durationMs?: number
  fuelAdded?: number
  tyreChange?: boolean
  tyreCompound?: string
}

// ─── Normalized output (simulator-agnostic) ───────────────────────────────────

export type NormalizedSessionType =
  | "PRACTICE"
  | "QUALIFYING"
  | "RACE"
  | "HOTLAP"
  | "TIME_TRIAL"
  | "UNKNOWN"

export interface NormalizedSession {
  // Parser metadata
  simulatorSlug: string
  parserVersion: string

  // Session metadata
  sessionDate: Date
  sessionType: NormalizedSessionType
  sessionName?: string
  serverName?: string
  isOnline: boolean
  durationSec?: number

  // Track (raw — normalized by TrackNormalizer)
  trackRawName: string
  trackLayoutRawName?: string

  // Car (raw — normalized by CarNormalizer)
  carRawName: string
  carClassRawName?: string

  // Driver result
  finalPosition?: number
  totalLaps: number
  dnf: boolean
  dq: boolean

  // Conditions
  weather?: string
  tempAmbient?: number
  tempTrack?: number

  // Data
  laps: ParsedLap[]
  participants: ParsedParticipant[]
  incidents: ParsedIncident[]
  penalties: ParsedPenalty[]
  pitStops: ParsedPitStop[]

  // Non-fatal warnings from the parser
  parseWarnings: string[]
}

// ─── Parser context (optional per-user hints) ────────────────────────────────

export interface ParseContext {
  /** The user's in-game driver name, used to identify their laps in multiplayer files. */
  driverName?: string
}

// ─── Parser interface ─────────────────────────────────────────────────────────

export interface IParser {
  readonly simulatorSlug: string
  readonly version: string
  /** Returns true if this parser can handle the given file content. */
  canParse(content: string): boolean
  /** Extracts all unique driver names found in the file (lightweight, no full parse). */
  extractDriverNames(content: string): string[]
  /** Parses raw file content into a NormalizedSession. May throw on fatal errors. */
  parse(content: string, context?: ParseContext): Promise<NormalizedSession>
}

export type ParseResult =
  | { success: true; session: NormalizedSession }
  | { success: false; error: string; details?: unknown }
