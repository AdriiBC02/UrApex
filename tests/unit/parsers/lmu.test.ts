import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { LMUParser } from "@/server/parsers/lmu/parser"

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "fixtures/lmu", name), "utf-8")

describe("LMUParser", () => {
  const parser = new LMUParser()

  it("canParse detects LMU XML", () => {
    expect(parser.canParse(fixture("race_minimal.xml"))).toBe(true)
    expect(parser.canParse("<SomeOtherFormat/>")).toBe(false)
  })

  describe("parse - race_minimal.xml", () => {
    let result: Awaited<ReturnType<typeof parser.parse>>

    beforeAll(async () => {
      result = await parser.parse(fixture("race_minimal.xml"))
    })

    it("extracts simulator slug and parser version", () => {
      expect(result.simulatorSlug).toBe("lmu")
      expect(result.parserVersion).toMatch(/^lmu-v/)
    })

    it("extracts session type as RACE", () => {
      expect(result.sessionType).toBe("RACE")
    })

    it("extracts track name", () => {
      expect(result.trackRawName).toBe("Spa-Francorchamps")
      expect(result.trackLayoutRawName).toBe("Grand Prix")
    })

    it("extracts car name", () => {
      expect(result.carRawName).toBe("Ferrari 499P")
      expect(result.carClassRawName).toBe("Hypercar")
    })

    it("extracts session date", () => {
      expect(result.sessionDate).toBeInstanceOf(Date)
      expect(result.sessionDate.getFullYear()).toBe(2026)
    })

    it("extracts conditions", () => {
      expect(result.tempAmbient).toBe(22.5)
      expect(result.tempTrack).toBe(34.1)
      expect(result.weather).toBe("Clear")
    })

    it("extracts correct number of laps", () => {
      expect(result.laps).toHaveLength(5)
      expect(result.totalLaps).toBe(5)
    })

    it("converts lap times to milliseconds correctly", () => {
      // 141.742s → 141742ms
      const bestLap = result.laps.find((l) => l.lapNumber === 3)
      expect(bestLap?.lapTimeMs).toBe(141742)
    })

    it("converts sector times to milliseconds", () => {
      const lap3 = result.laps.find((l) => l.lapNumber === 3)!
      expect(lap3.sector1Ms).toBe(37850)
      expect(lap3.sector2Ms).toBe(66891)
      expect(lap3.sector3Ms).toBe(37001)
    })

    it("marks invalid laps correctly", () => {
      const invalidLap = result.laps.find((l) => l.lapNumber === 5)
      expect(invalidLap?.isValid).toBe(false)
    })

    it("extracts participants", () => {
      expect(result.participants.length).toBeGreaterThan(0)
      expect(result.participants[0].driverName).toBeTruthy()
    })

    it("does not crash on missing optional fields", () => {
      expect(result.parseWarnings).toBeInstanceOf(Array)
      // Should parse without throwing even if some fields are absent
    })
  })

  it("handles malformed XML gracefully", async () => {
    await expect(parser.parse("<broken><xml")).rejects.toThrow()
  })

  it("handles XML with no laps gracefully", async () => {
    const xml = `<Standings>
      <Session>Practice</Session>
      <TrackName>Monza</TrackName>
      <VehicleName>LMP2</VehicleName>
    </Standings>`
    const result = await parser.parse(xml)
    expect(result.laps).toHaveLength(0)
    expect(result.parseWarnings.some((w) => w.includes("lap"))).toBe(true)
  })
})
