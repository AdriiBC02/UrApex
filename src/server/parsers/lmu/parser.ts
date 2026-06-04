import { XMLParser } from "fast-xml-parser"
import type {
  IParser, NormalizedSession, ParsedLap, ParsedParticipant, ParsedPitStop, ParsedPenalty, NormalizedSessionType,
} from "../types"

export const LMU_PARSER_VERSION = "lmu-v0.2.0"

// rFactor 2 / LMU result XML.
// Real file structure (observed from live LMU session files):
//
//   <rFactorXML version="1.0">
//     <RaceResults>
//       <TrackVenue>Fuji Speedway</TrackVenue>
//       <TrackCourse>Fuji Speedway Classic</TrackCourse>
//       <TrackLength>4502.0</TrackLength>
//       <RaceTime>60</RaceTime>   ← minutes at root
//       <Setting>Multiplayer</Setting>
//
//       <Practice1>              ← or Qualify / Race1 / etc.
//         <TimeString>2026/06/03 02:50:21</TimeString>
//         <Minutes>60</Minutes>
//         <Stream>...</Stream>   ← live events (penalties etc.)
//
//         <Driver>
//           <Name>Driver Name</Name>
//           <VehName>Car Livery Name</VehName>
//           <CarType>Ford Mustang LMGT3</CarType>
//           <CarClass>GT3</CarClass>
//           <isPlayer>1</isPlayer>   ← 1 = human, not AI
//           <Position>1</Position>
//           <Laps>6</Laps>
//           <Pitstops>0</Pitstops>
//           <FinishStatus>Finished Normally</FinishStatus>
//           <BestLapTime>98.9557</BestLapTime>   ← seconds
//           <Lap num="1" et="--.---" ...>--.----</Lap>  ← invalid
//           <Lap num="2" et="819.28" s1="37.49" s2="24.02" s3="37.43" ...>98.9557</Lap>  ← valid, seconds
//         </Driver>
//         ...
//       </Practice1>
//     </RaceResults>
//   </rFactorXML>
//
// The first Driver element in the file is the player who saved the result.
// Lap time is the TEXT CONTENT of <Lap> in seconds. Sectors are attributes in seconds.

export class LMUParser implements IParser {
  readonly simulatorSlug = "lmu"
  readonly version = LMU_PARSER_VERSION

  private xml = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    allowBooleanAttributes: true,
    trimValues: true,
    isArray: (name) => ["Driver", "Lap", "Penalty", "PitStop", "TrackLimits"].includes(name),
  })

  canParse(content: string): boolean {
    return content.includes("<rFactorXML") || content.includes("<RaceResults")
  }

  async parse(content: string): Promise<NormalizedSession> {
    const warnings: string[] = []

    let raw: Record<string, unknown>
    try {
      raw = this.xml.parse(content) as Record<string, unknown>
    } catch (err) {
      throw new Error(`XML parse error: ${err instanceof Error ? err.message : "unknown"}`)
    }

    // Navigate to <RaceResults>
    const root = this.getRaceResults(raw)
    if (!root) throw new Error("Could not find <RaceResults> element in file.")

    // Find the session sub-element (Practice1, Qualify, Race1, etc.)
    const { key: sessionKey, data: sessionData } = this.findSession(root)
    if (!sessionData) throw new Error("No session data found (expected Practice1/Qualify/Race1 etc.).")

    // Find the player driver (first human driver with lap data)
    const allDrivers = this.getDrivers(sessionData)
    if (allDrivers.length === 0) throw new Error("No driver data found in session.")

    const player = this.findPlayer(allDrivers)
    if (!player) throw new Error("Could not identify player driver in session.")

    const sessionType = this.parseSessionType(sessionKey)
    const trackRawName  = this.s(root, "TrackVenue") ?? this.s(root, "TrackCourse") ?? "Unknown Track"
    const trackLayout   = this.s(root, "TrackCourse")
    const carRawName    = this.s(player, "CarType") ?? this.s(player, "VehName") ?? "Unknown Car"
    const carClass      = this.s(player, "CarClass")

    const laps = this.parseLaps(player, warnings)
    const isOnline = this.s(root, "Setting") === "Multiplayer"

    // Duration: Minutes in session or RaceTime (minutes) in root
    const durationMin = this.n(sessionData, "Minutes") ?? this.n(root, "RaceTime")
    const durationSec = durationMin != null ? durationMin * 60 : null

    const finishStatus = this.s(player, "FinishStatus") ?? ""
    const dnf = finishStatus !== "" && finishStatus !== "Finished Normally" && finishStatus !== "None"
    const finalPosition = this.n(player, "Position")

    // Server name
    const serverName = this.s(root, "ServerName") || null

    // Weather (not typically in rF2 result XML, but check)
    const weather = this.s(sessionData, "SkyType") ?? this.s(root, "SkyType") ?? null

    return {
      simulatorSlug: this.simulatorSlug,
      parserVersion: this.version,
      sessionDate: this.parseDate(sessionData, root, warnings),
      sessionType,
      sessionName: undefined,
      serverName: serverName ?? undefined,
      isOnline,
      durationSec: durationSec ?? undefined,
      trackRawName,
      trackLayoutRawName: trackLayout ?? undefined,
      carRawName,
      carClassRawName: carClass ?? undefined,
      finalPosition: finalPosition ?? undefined,
      totalLaps: laps.length,
      dnf,
      dq: false,
      weather: weather ?? undefined,
      tempAmbient: undefined,
      tempTrack: undefined,
      laps,
      participants: this.parseParticipants(allDrivers, player),
      incidents: [],
      penalties: this.parsePenalties(sessionData, player, warnings),
      pitStops: [],
      parseWarnings: warnings,
    }
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  private getRaceResults(raw: Record<string, unknown>): Record<string, unknown> | null {
    const rf = raw["rFactorXML"]
    if (rf && typeof rf === "object") {
      const rr = (rf as Record<string, unknown>)["RaceResults"]
      if (rr && typeof rr === "object") return rr as Record<string, unknown>
    }
    if (raw["RaceResults"] && typeof raw["RaceResults"] === "object") {
      return raw["RaceResults"] as Record<string, unknown>
    }
    return null
  }

  private findSession(root: Record<string, unknown>): { key: string; data: Record<string, unknown> | null } {
    const SESSION_KEYS = [
      "Practice1", "Practice2", "Practice3", "Practice4",
      "Qualify", "Qualify1", "Qualify2",
      "Race", "Race1", "Race2",
      "WarmUp", "TimedLap",
    ]
    for (const key of SESSION_KEYS) {
      if (root[key] && typeof root[key] === "object") {
        return { key, data: root[key] as Record<string, unknown> }
      }
    }
    return { key: "Unknown", data: null }
  }

  private getDrivers(sessionData: Record<string, unknown>): Record<string, unknown>[] {
    const raw = sessionData["Driver"]
    if (!raw) return []
    return (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[]
  }

  private findPlayer(drivers: Record<string, unknown>[]): Record<string, unknown> | null {
    // First human driver with actual lap data
    const withLaps = drivers.filter(d => {
      const best = this.s(d, "BestLapTime")
      return best && best !== "--.----" && best !== "0.0000" && parseFloat(best) > 0
    })
    if (withLaps.length > 0) return withLaps[0]
    // Fallback: first driver
    return drivers[0] ?? null
  }

  // ─── Parsers ────────────────────────────────────────────────────────────────

  private parseSessionType(key: string): NormalizedSessionType {
    const k = key.replace(/\d+$/, "").toLowerCase()
    if (k === "practice" || k === "warmup" || k === "timedlap") return "PRACTICE"
    if (k === "qualify")  return "QUALIFYING"
    if (k === "race")     return "RACE"
    return "PRACTICE"
  }

  private parseLaps(player: Record<string, unknown>, warnings: string[]): ParsedLap[] {
    const raw = player["Lap"]
    if (!raw) {
      warnings.push("No lap elements found on player Driver element.")
      return []
    }
    const lapsRaw = (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[]

    return lapsRaw.map((lap): ParsedLap => {
      const l = lap as Record<string, unknown>

      // fast-xml-parser stores text content as "#text" when element also has attributes
      const timeRaw = l["#text"] ?? l["__text"]
      const timeStr = String(timeRaw ?? "").trim()

      const lapNum = this.attr(l, "num") ?? this.attr(l, "@_num")
      const lapNumber = typeof lapNum === "number" ? lapNum : parseInt(String(lapNum ?? "0"), 10)

      const lapTimeSec = parseFloat(timeStr)
      const isValid = !isNaN(lapTimeSec) && lapTimeSec > 0 && !timeStr.includes("-")

      return {
        lapNumber,
        lapTimeMs: isValid ? Math.round(lapTimeSec * 1000) : null,
        isValid,
        sector1Ms: this.secAttrMs(l, "s1"),
        sector2Ms: this.secAttrMs(l, "s2"),
        sector3Ms: this.secAttrMs(l, "s3"),
        fuelLoad:  this.attrFloat(l, "fuel") ?? undefined,
        tyreCompound: this.attrStr(l, "fcompound") ?? undefined,
      }
    })
  }

  private parseParticipants(
    allDrivers: Record<string, unknown>[],
    player: Record<string, unknown>,
  ): ParsedParticipant[] {
    return allDrivers.map((d) => {
      const bestStr = this.s(d, "BestLapTime") ?? ""
      const bestSec = parseFloat(bestStr)
      const bestMs = !isNaN(bestSec) && bestSec > 0 ? Math.round(bestSec * 1000) : undefined

      const finishStatus = this.s(d, "FinishStatus") ?? ""
      const dnf = finishStatus !== "" && finishStatus !== "Finished Normally" && finishStatus !== "None"

      return {
        driverName:    this.s(d, "Name") ?? "Unknown",
        teamName:        this.s(d, "TeamName") ?? undefined,
        carRawName:      this.s(d, "CarType") ?? this.s(d, "VehName") ?? undefined,
        carClassRawName: this.s(d, "CarClass") ?? undefined,
        position:      this.n(d, "Position"),
        lapsCompleted: this.n(d, "Laps"),
        bestLapMs:     bestMs,
        totalTimeMs:   undefined,
        dnf,
        dq: false,
      }
    })
  }

  private parsePenalties(
    sessionData: Record<string, unknown>,
    player: Record<string, unknown>,
    _warnings: string[],
  ): ParsedPenalty[] {
    const stream = sessionData["Stream"]
    if (!stream || typeof stream !== "object") return []

    const penalties = (stream as Record<string, unknown>)["Penalty"]
    if (!penalties) return []

    const playerName = this.s(player, "Name")
    const arr = (Array.isArray(penalties) ? penalties : [penalties]) as Record<string, unknown>[]

    return arr
      .filter(p => {
        if (!playerName) return true
        const driver = this.attrStr(p, "Driver")
        return !driver || driver === playerName
      })
      .map(p => ({
        lapNumber: this.attrNum(p, "Laps") ?? undefined,
        type:      this.attrStr(p, "Penalty") ?? undefined,
        description: this.attrStr(p, "Reason") ?? undefined,
        timeSec:   this.attrFloat(p, "Time") ?? undefined,
      }))
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private s(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key]
    if (typeof v === "string" && v.trim()) return v.trim()
    if (typeof v === "number") return String(v)
    return null
  }

  private n(obj: Record<string, unknown>, key: string): number | undefined {
    const v = Number(obj[key])
    return isNaN(v) ? undefined : v
  }

  private attr(obj: Record<string, unknown>, key: string): number | string | undefined {
    const prefixed = obj[`@_${key}`]
    if (prefixed !== undefined) return prefixed as number | string
    return obj[key] as number | string | undefined
  }

  private attrFloat(obj: Record<string, unknown>, key: string): number | null {
    const v = this.attr(obj, key)
    if (v === undefined) return null
    const n = parseFloat(String(v))
    return isNaN(n) ? null : n
  }

  private attrNum(obj: Record<string, unknown>, key: string): number | null {
    const v = this.attr(obj, key)
    if (v === undefined) return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }

  private attrStr(obj: Record<string, unknown>, key: string): string | null {
    const v = this.attr(obj, key)
    if (v === undefined || v === null) return null
    return String(v)
  }

  private secAttrMs(obj: Record<string, unknown>, key: string): number | null {
    const sec = this.attrFloat(obj, key)
    if (sec === null || sec <= 0) return null
    return Math.round(sec * 1000)
  }

  private parseDate(
    sessionData: Record<string, unknown>,
    root: Record<string, unknown>,
    warnings: string[],
  ): Date {
    // Try TimeString: "YYYY/MM/DD HH:MM:SS"
    for (const src of [sessionData, root]) {
      const ts = this.s(src, "TimeString")
      if (ts) {
        // "2026/06/03 02:50:21" → replace slashes with dashes
        const normalized = ts.replace(/\//g, "-").replace(" ", "T")
        const d = new Date(normalized)
        if (!isNaN(d.getTime())) return d
      }
      // Try Unix timestamp
      const dt = this.n(src, "DateTime")
      if (dt) {
        const d = new Date(dt * 1000)
        if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d
      }
    }
    warnings.push("Could not parse session date — using current time")
    return new Date()
  }
}
