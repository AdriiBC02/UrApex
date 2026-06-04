import type { IParser, NormalizedSession, ParseContext, ParseResult } from "./types"
import { LMUParser } from "./lmu/parser"

// Register all available parsers here. Order matters for auto-detection.
const PARSERS: IParser[] = [new LMUParser()]

export function getParser(simulatorSlug: string): IParser | null {
  return PARSERS.find((p) => p.simulatorSlug === simulatorSlug) ?? null
}

export function detectParser(content: string): IParser | null {
  return PARSERS.find((p) => p.canParse(content)) ?? null
}

export function extractDriverNames(content: string, simulatorSlug?: string): string[] {
  const parser = simulatorSlug ? getParser(simulatorSlug) : detectParser(content)
  return parser?.extractDriverNames(content) ?? []
}

export async function parseFile(
  content: string,
  simulatorSlug?: string,
  context?: ParseContext
): Promise<ParseResult> {
  const parser = simulatorSlug ? getParser(simulatorSlug) : detectParser(content)

  if (!parser) {
    return {
      success: false,
      error: simulatorSlug
        ? `No parser found for simulator "${simulatorSlug}"`
        : "Could not detect simulator from file content. Is this a supported result file?",
    }
  }

  try {
    const session: NormalizedSession = await parser.parse(content, context)
    return { success: true, session }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown parser error",
      details: err,
    }
  }
}
