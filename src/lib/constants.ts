export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
export const ALLOWED_MIME_TYPES = ["text/xml", "application/xml"]
export const SESSIONS_PER_PAGE = 20
export const PARSER_REGISTRY_VERSION = "1.0.0"

export const SIMULATOR_LABELS: Record<string, string> = {
  lmu: "Le Mans Ultimate",
  acc: "Assetto Corsa Competizione",
  iracing: "iRacing",
  rf2: "rFactor 2",
  rr: "RaceRoom",
  ams2: "Automobilista 2",
  ac: "Assetto Corsa",
}

export const SESSION_TYPE_LABELS: Record<string, string> = {
  PRACTICE: "Practice",
  QUALIFYING: "Qualifying",
  RACE: "Race",
  HOTLAP: "Hotlap",
  TIME_TRIAL: "Time Trial",
  UNKNOWN: "Unknown",
}
