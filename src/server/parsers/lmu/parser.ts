import { XMLParser } from "fast-xml-parser"
import type { IParser, NormalizedSession, ParsedLap, ParsedParticipant, ParsedPitStop, ParsedPenalty, NormalizedSessionType } from "../types"

export const LMU_PARSER_VERSION = "lmu-v0.1.0"

/**
 * Le Mans Ultimate result XML parser.
 *
 * LMU is built on rFactor 2's engine (Studio 397). Result files follow the
 * rF2 XML format. Field names and structure are validated against real files
 * once they become available (Phase 0). This implementation is defensive:
 * every field access has a fallback and missing data produces warnings, not crashes.
 *
 * Known XML root elements: <Standings>, <Race>, <Qualify>, <Practice>
 */
export class LMUParser implements IParser {
  readonly simulatorSlug = "lmu"
  readonly version = LMU_PARSER_VERSION

  private xml = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    allowBooleanAttributes: true,
    trimValues: true,
    isArray: (name) => ["Driver", "Lap", "Penalty", "PitStop"].includes(name),
  })

  canParse(content: string): boolean {
    // rF2/LMU result files always contain one of these root elements
    return (
      content.includes("<Standings") ||
      content.includes("<Race>") ||
      content.includes("<Qualify>") ||
      content.includes("<Practice>") ||
      content.includes("<TimeAttack>")
    )
  }

  async parse(content: string): Promise<NormalizedSession> {
    const warnings: string[] = []

    let raw: Record<string, unknown>
    try {
      raw = this.xml.parse(content) as Record<string, unknown>
    } catch (err) {
      throw new Error(
        `XML parse error: ${err instanceof Error ? err.message : "unknown"}`
      )
    }

    // Root can be several element names depending on session type
    const root = this.findRoot(raw)

    const sessionType = this.parseSessionType(root, warnings)
    const trackRawName = this.str(root, ["TrackName", "Track", "@_track", "Venue"], warnings) ?? "Unknown Track"
    const carRawName = this.str(root, ["VehicleName", "Vehicle", "Car", "@_vehicle"], warnings) ?? "Unknown Car"

    const laps = this.parseLaps(root, warnings)

    return {
      simulatorSlug: this.simulatorSlug,
      parserVersion: this.version,
      sessionDate: this.parseDate(root, warnings),
      sessionType,
      sessionName: this.str(root, ["EventName", "SessionName", "RaceName"], warnings),
      serverName: this.str(root, ["ServerName", "Server"], warnings),
      isOnline: this.bool(root, ["MultiPlayer", "Online", "IsOnline"], false),
      durationSec: this.num(root, ["SessionDuration", "Duration", "RaceTime"], warnings),
      trackRawName,
      trackLayoutRawName: this.str(root, ["TrackLayout", "Layout", "@_layout"], warnings),
      carRawName,
      carClassRawName: this.str(root, ["VehicleClass", "CarClass", "Class"], warnings),
      finalPosition: this.num(root, ["FinishPos", "Position", "FinalPos", "@_pos"], warnings),
      totalLaps: laps.length,
      dnf: this.bool(root, ["DNF", "Retired"], false),
      dq: this.bool(root, ["DQ", "Disqualified", "BlackFlag"], false),
      weather: this.str(root, ["SkyType", "Weather", "Conditions"], warnings),
      tempAmbient: this.float(root, ["AmbientTemperature", "AmbientTemp", "TempAmb"], warnings),
      tempTrack: this.float(root, ["TrackTemperature", "TrackTemp", "TempTrack"], warnings),
      laps,
      participants: this.parseParticipants(root, warnings),
      incidents: [],
      penalties: this.parsePenalties(root, warnings),
      pitStops: this.parsePitStops(root, warnings),
      parseWarnings: warnings,
    }
  }

  // ─── Section parsers ────────────────────────────────────────────────────────

  private findRoot(raw: Record<string, unknown>): Record<string, unknown> {
    // Try known root element names in priority order
    for (const key of ["Standings", "Race", "Qualify", "Practice", "TimeAttack", "Session"]) {
      if (raw[key] && typeof raw[key] === "object") {
        return raw[key] as Record<string, unknown>
      }
    }
    // Fallback: use the entire document as root
    return raw
  }

  private parseSessionType(root: Record<string, unknown>, warnings: string[]): NormalizedSessionType {
    const raw = (
      this.str(root, ["Session", "SessionType", "Type", "@_session", "StageType"], warnings) ?? ""
    ).toLowerCase()

    const map: Record<string, NormalizedSessionType> = {
      practice: "PRACTICE",
      p: "PRACTICE",
      qualifying: "QUALIFYING",
      qualify: "QUALIFYING",
      q: "QUALIFYING",
      race: "RACE",
      r: "RACE",
      hotlap: "HOTLAP",
      timeattack: "HOTLAP",
      "time attack": "HOTLAP",
    }

    return map[raw] ?? "UNKNOWN"
  }

  private parseLaps(root: Record<string, unknown>, warnings: string[]): ParsedLap[] {
    const lapData = root["Laps"] ?? root["LapData"] ?? root["Lap"]
    if (!lapData) {
      warnings.push("No lap data found in XML — laps array will be empty")
      return []
    }

    const lapsRaw = Array.isArray(lapData)
      ? lapData
      : Array.isArray((lapData as Record<string, unknown>)?.Lap)
        ? ((lapData as Record<string, unknown>).Lap as unknown[])
        : [lapData]

    return lapsRaw.map((lap, idx) => {
      const l = lap as Record<string, unknown>
      const lapTimeRaw = this.numRaw(l, ["LapTime", "Time", "@_time"])
      return {
        lapNumber: (this.numRaw(l, ["Lap", "LapNum", "@_num"]) as number | undefined) ?? idx + 1,
        lapTimeMs: lapTimeRaw != null ? this.timeToMs(lapTimeRaw) : null,
        isValid: !this.bool(l, ["Invalid", "Invalidated", "@_invalid"], false),
        sector1Ms: this.sectorMs(l, ["Sector1", "S1", "@_s1"]),
        sector2Ms: this.sectorMs(l, ["Sector2", "S2", "@_s2"]),
        sector3Ms: this.sectorMs(l, ["Sector3", "S3", "@_s3"]),
        fuelLoad: this.floatRaw(l, ["Fuel", "FuelLoad", "@_fuel"]),
        tyreCompound: this.strRaw(l, ["TireCompound", "TyreCompound", "@_tire"]),
      }
    })
  }

  private parseParticipants(root: Record<string, unknown>, warnings: string[]): ParsedParticipant[] {
    const driversRaw = root["Driver"] ?? root["Drivers"] ?? root["Participants"]
    if (!driversRaw) return []

    const drivers = Array.isArray(driversRaw)
      ? driversRaw
      : [driversRaw]

    return drivers.map((d) => {
      const dr = d as Record<string, unknown>
      return {
        driverName: this.strRaw(dr, ["Name", "DriverName", "@_name"]) ?? "Unknown",
        teamName: this.strRaw(dr, ["Team", "TeamName"]),
        carRawName: this.strRaw(dr, ["Vehicle", "Car", "VehicleName"]),
        carClassRawName: this.strRaw(dr, ["Class", "VehicleClass", "CarClass"]),
        position: this.numRaw(dr, ["Position", "FinishPos", "@_pos"]) as number | undefined,
        lapsCompleted: this.numRaw(dr, ["Laps", "LapCount", "@_laps"]) as number | undefined,
        bestLapMs: this.lapTimeMs(dr, ["BestLapTime", "FastestLap", "@_best"]),
        totalTimeMs: this.lapTimeMs(dr, ["TotalTime", "RaceTime", "@_total"]),
        dnf: this.bool(dr, ["DNF", "Retired"], false),
        dq: this.bool(dr, ["DQ", "Disqualified"], false),
      }
    })
  }

  private parsePenalties(root: Record<string, unknown>, _warnings: string[]): ParsedPenalty[] {
    const raw = root["Penalty"] ?? root["Penalties"]
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : [raw]
    return arr.map((p) => {
      const r = p as Record<string, unknown>
      return {
        lapNumber: this.numRaw(r, ["Lap", "LapNum"]) as number | undefined,
        type: this.strRaw(r, ["Type", "PenaltyType"]),
        description: this.strRaw(r, ["Description", "Reason"]),
        timeSec: this.floatRaw(r, ["Time", "Seconds"]),
      }
    })
  }

  private parsePitStops(root: Record<string, unknown>, _warnings: string[]): ParsedPitStop[] {
    const raw = root["PitStop"] ?? root["PitStops"]
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : [raw]
    return arr.map((p) => {
      const r = p as Record<string, unknown>
      return {
        lapNumber: this.numRaw(r, ["Lap", "InLap"]) as number | undefined,
        durationMs: this.lapTimeMs(r, ["Duration", "PitTime"]),
        fuelAdded: this.floatRaw(r, ["FuelAdded", "Fuel"]),
        tyreChange: this.bool(r, ["TireChange", "TyreChange"], false),
        tyreCompound: this.strRaw(r, ["TireCompound", "TyreCompound"]),
      }
    })
  }

  // ─── Defensive field helpers ────────────────────────────────────────────────

  private str(
    obj: Record<string, unknown>,
    keys: string[],
    warnings: string[],
    warnIfMissing?: string
  ): string | undefined {
    for (const key of keys) {
      const v = obj[key]
      if (typeof v === "string" && v.trim()) return v.trim()
      if (typeof v === "number") return String(v)
    }
    if (warnIfMissing) warnings.push(`Missing field: ${warnIfMissing}`)
    return undefined
  }

  private strRaw(obj: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const v = obj[key]
      if (typeof v === "string" && v.trim()) return v.trim()
      if (typeof v === "number") return String(v)
    }
    return undefined
  }

  private num(obj: Record<string, unknown>, keys: string[], _warnings: string[]): number | undefined {
    return this.numRaw(obj, keys) as number | undefined
  }

  private numRaw(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const v = Number(obj[key])
      if (!isNaN(v) && isFinite(v)) return v
    }
    return undefined
  }

  private float(obj: Record<string, unknown>, keys: string[], _warnings: string[]): number | undefined {
    return this.floatRaw(obj, keys)
  }

  private floatRaw(obj: Record<string, unknown>, keys: string[]): number | undefined {
    return this.numRaw(obj, keys)
  }

  private bool(obj: Record<string, unknown>, keys: string[], fallback: boolean): boolean {
    for (const key of keys) {
      const v = obj[key]
      if (v === true || v === 1 || v === "1" || v === "true" || v === "True") return true
      if (v === false || v === 0 || v === "0" || v === "false" || v === "False") return false
    }
    return fallback
  }

  /**
   * Converts a lap time value to milliseconds.
   * rF2/LMU stores times in seconds (float): 88.542 → 88542ms
   */
  private timeToMs(raw: number | string | undefined): number | null {
    if (raw === undefined || raw === null) return null
    const n = Number(raw)
    if (isNaN(n) || n <= 0) return null
    // If value > 3600, it might already be in ms — unlikely for laps
    return Math.round(n * 1000)
  }

  private sectorMs(obj: Record<string, unknown>, keys: string[]): number | null {
    const raw = this.numRaw(obj, keys)
    return raw !== undefined ? this.timeToMs(raw) : null
  }

  private lapTimeMs(obj: Record<string, unknown>, keys: string[]): number | undefined {
    const ms = this.sectorMs(obj, keys)
    return ms !== null ? ms : undefined
  }

  private parseDate(root: Record<string, unknown>, warnings: string[]): Date {
    const raw = this.str(root, ["Date", "SessionDate", "Timestamp", "EventDate"], warnings)
    if (raw) {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) return d
    }
    warnings.push("Could not parse session date — using current time")
    return new Date()
  }
}
