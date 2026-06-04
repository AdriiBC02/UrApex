import type { Track } from "@prisma/client"
import { db } from "@/lib/db"

/**
 * Converts a raw track name from a sim result file into a canonical Track entity.
 *
 * Lookup order:
 *  1. TrackAlias (rawName + simulatorId) — exact match, fastest path
 *  2. Track by slug — fuzzy match on normalized rawName
 *  3. Create new Track + TrackAlias
 */
export async function findOrCreateTrack(
  rawName: string,
  simulatorId: string
): Promise<Track> {
  // 1. Exact alias match
  const alias = await db.trackAlias.findUnique({
    where: { rawName_simulatorId: { rawName, simulatorId } },
    include: { track: true },
  })
  if (alias) return alias.track

  // 2. Slug match (in case the track exists from another sim)
  const slug = toSlug(rawName)
  const existing = await db.track.findUnique({ where: { slug } })

  if (existing) {
    // Create alias for faster future lookups
    await db.trackAlias.create({ data: { trackId: existing.id, rawName, simulatorId } })
    return existing
  }

  // 3. Create new track + alias
  return db.track.create({
    data: {
      slug,
      name: rawName,
      aliases: { create: { rawName, simulatorId } },
    },
  })
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "")
}
