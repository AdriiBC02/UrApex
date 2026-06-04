# UrApex — Import Pipeline

> Technical deep dive into the file import pipeline.
> From file drop to session visible on dashboard.

---

## Overview

```
Browser                    API Server              Database / Storage
───────                    ──────────              ──────────────────
Drop file       ──────►  POST /api/upload
                              │
                         Validate file
                              │
                         Hash (SHA-256)
                              │
                         Check duplicate  ──────► SELECT FROM ImportFile
                              │                   WHERE fileHash = ?
                         Save raw file    ──────► StorageService.save()
                              │
                         Create ImportFile ──────► INSERT ImportFile
                         (PENDING)                 { status: PENDING }
                              │
                         Return importFileId ◄──────
                              │
                         ◄──── importFileId
                              │
Poll status    ──────►   GET /api/import/[id]/status
                              │
                         [Sync in Phase 1: processImport() runs here]
                         [Async in Phase 2: job was queued on upload]
                              │
                         ImportFile → PARSING ──► UPDATE ImportFile
                              │
                         detectParser()
                              │
                         parser.parse(rawContent)
                              │
                         normalizeTrack() ──────► findOrCreate Track
                         normalizeCar()   ──────► findOrCreate Car
                              │
                         calculateMetrics()
                         detectPB()
                              │
                         saveSession()    ──────► INSERT Session
                         saveLaps()       ──────► INSERT Laps (bulk)
                         saveParticipants() ────► INSERT Participants
                              │
                         updateProfile()  ──────► UPDATE DriverProfile
                         checkAchievements() ───► Evaluate conditions
                              │
                         ImportFile → IMPORTED ──► UPDATE ImportFile
                              │
Poll detects   ◄──────   { status: "IMPORTED", sessionId }
IMPORTED
```

---

## Step 1 — File Validation (Client + Server)

### Client-side (before upload)
```typescript
const ALLOWED_TYPES = ['text/xml', 'application/xml']
const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.xml')) {
    return 'Only XML files are supported'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'File exceeds 50MB limit'
  }
  return null
}
```

### Server-side (in API route)
```typescript
// Never trust client-side validation
const contentType = file.type
const contentSample = await file.text().then(t => t.slice(0, 1000))
if (!contentSample.includes('<?xml') && !contentSample.includes('<')) {
  return Response.json({ error: 'File does not appear to be valid XML' }, { status: 422 })
}
```

---

## Step 2 — SHA-256 Deduplication

```typescript
// lib/hash.ts
import crypto from 'crypto'

export function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}
```

```typescript
// In import service
const fileBuffer = Buffer.from(await file.arrayBuffer())
const fileHash = sha256(fileBuffer)

const existing = await db.importFile.findUnique({
  where: { fileHash },
  include: { session: { select: { id: true } } }
})

if (existing) {
  return {
    duplicate: true,
    existingImportId: existing.id,
    existingSessionId: existing.session?.id
  }
}
```

---

## Step 3 — Raw File Storage

```typescript
// server/services/storage.service.ts
interface StorageService {
  save(buffer: Buffer, key: string): Promise<string>  // returns storage path
  read(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
}

// Local implementation
class LocalStorageService implements StorageService {
  private basePath = process.env.STORAGE_LOCAL_PATH ?? './storage'
  
  async save(buffer: Buffer, key: string): Promise<string> {
    const fullPath = path.join(this.basePath, key)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, buffer)
    return fullPath
  }
  
  async read(path: string): Promise<Buffer> {
    return fs.readFile(path)
  }
}

// Key format: raw/{userId}/{fileHash}.xml
function storageKey(userId: string, fileHash: string): string {
  return `raw/${userId}/${fileHash}.xml`
}
```

---

## Step 4 — Parser Detection & Execution

```typescript
// server/parsers/registry.ts
const parsers: IParser[] = [
  new LMUParser(),
  // new ACCParser(),  — future
]

export function detectParser(content: string): IParser | null {
  return parsers.find(p => p.canParse(content)) ?? null
}

export function getParser(slug: string): IParser | null {
  return parsers.find(p => p.simulatorSlug === slug) ?? null
}
```

```typescript
// In processImport job
const rawBuffer = await storageService.read(importFile.storagePath)
const rawContent = rawBuffer.toString('utf-8')

const parser = importFile.simulatorId
  ? getParser(simulatorSlugFromId(importFile.simulatorId))
  : detectParser(rawContent)

if (!parser) {
  throw new ParseError('No parser found for this file. Is it a supported simulator result file?')
}

let normalizedSession: NormalizedSession
try {
  normalizedSession = await parser.parse(rawContent)
} catch (err) {
  throw new ParseError(`Parser failed: ${err instanceof Error ? err.message : 'unknown error'}`)
}
```

---

## Step 5 — Track/Car Normalization

```typescript
// server/normalizers/track.normalizer.ts

export async function findOrCreateTrack(
  rawName: string,
  simulatorId: string
): Promise<Track> {
  // 1. Look up alias
  const alias = await db.trackAlias.findUnique({
    where: { rawName_simulatorId: { rawName, simulatorId } },
    include: { track: true }
  })
  
  if (alias) return alias.track
  
  // 2. Try fuzzy slug match (normalize rawName to slug)
  const slug = toSlug(rawName)  // "Spa-Francorchamps" → "spa-francorchamps"
  const existing = await db.track.findUnique({ where: { slug } })
  
  if (existing) {
    // Create alias for future lookups
    await db.trackAlias.create({
      data: { trackId: existing.id, rawName, simulatorId }
    })
    return existing
  }
  
  // 3. Create new track + alias
  const track = await db.track.create({
    data: {
      slug,
      name: rawName,  // Use rawName as initial display name
      aliases: {
        create: { rawName, simulatorId }
      }
    },
    include: { aliases: true }
  })
  
  return track
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}
```

---

## Step 6 — Metrics Calculation

```typescript
// In processImport, after parsing
function getValidLapTimes(laps: ParsedLap[]): number[] {
  return laps
    .filter(l => l.isValid && l.lapTimeMs !== null)
    .map(l => l.lapTimeMs!)
}

const validTimes = getValidLapTimes(normalizedSession.laps)

const metrics = {
  bestLapMs:        bestLap(validTimes),
  avgLapMs:         avgLap(validTimes),
  medianLapMs:      medianLap(validTimes),
  idealLapMs:       idealLap(normalizedSession.laps),
  stdDevMs:         stdDev(validTimes),
  cleanLapRatio:    validTimes.length / normalizedSession.laps.length,
  consistencyScore: consistencyScore(validTimes),
  safetyScore:      safetyScore({
    incidents: normalizedSession.incidents.length,
    penalties: normalizedSession.penalties.length,
    dnf: normalizedSession.dnf,
    dq: normalizedSession.dq,
    validLaps: normalizedSession.laps.filter(l => l.isValid).length,
    totalLaps: normalizedSession.laps.length
  }),
  dropOffMs: dropOff(validTimes),
}
```

---

## Step 7 — PB Detection

```typescript
async function detectPersonalBest(
  userId: string,
  trackId: string,
  carId: string,
  currentBestMs: number | null
): Promise<boolean> {
  if (!currentBestMs) return false
  
  const previousBest = await db.session.findFirst({
    where: {
      userId,
      trackId,
      carId,
      bestLapMs: { not: null },
      deletedAt: null,
    },
    orderBy: { bestLapMs: 'asc' },
    select: { bestLapMs: true }
  })
  
  if (!previousBest?.bestLapMs) return true  // First session = first PB
  return currentBestMs < previousBest.bestLapMs
}
```

---

## Step 8 — Session Save (Transaction)

Everything saves in a single Prisma transaction to ensure consistency:

```typescript
const savedSession = await db.$transaction(async (tx) => {
  const session = await tx.session.create({
    data: {
      userId,
      importFileId: importFile.id,
      simulatorId: simulator.id,
      trackId: track.id,
      carId: car.id,
      ...sessionMetadata,
      ...metrics,
      isNewPB: isPB,
    }
  })
  
  // Bulk insert laps
  await tx.lap.createMany({
    data: normalizedSession.laps.map((lap, idx) => ({
      sessionId: session.id,
      lapNumber: lap.lapNumber,
      lapTimeMs: lap.lapTimeMs,
      isValid: lap.isValid,
      isPersonalBest: isPB && lap.lapTimeMs === metrics.bestLapMs,
      sector1Ms: lap.sector1Ms,
      sector2Ms: lap.sector2Ms,
      sector3Ms: lap.sector3Ms,
    }))
  })
  
  // Bulk insert participants
  if (normalizedSession.participants.length > 0) {
    await tx.sessionParticipant.createMany({
      data: normalizedSession.participants.map(p => ({
        sessionId: session.id,
        ...p
      }))
    })
  }
  
  // Incidents, penalties, pit stops
  // ...
  
  return session
})
```

---

## Step 9 — Profile Stats Update

```typescript
await db.driverProfile.update({
  where: { userId },
  data: {
    totalSessions:    { increment: 1 },
    totalLaps:        { increment: normalizedSession.laps.length },
    totalDriveTimeSec: { increment: normalizedSession.durationSec ?? 0 },
  }
})

// Unique tracks and cars require a more careful approach
// Recalculate as COUNT DISTINCT
const [uniqueTracks, uniqueCars] = await Promise.all([
  db.session.groupBy({ by: ['trackId'], where: { userId }, _count: true })
    .then(r => r.length),
  db.session.groupBy({ by: ['carId'], where: { userId }, _count: true })
    .then(r => r.length),
])

await db.driverProfile.update({
  where: { userId },
  data: { uniqueTracks, uniqueCars }
})
```

---

## Error Handling Matrix

| Error | Type | Behavior | User sees |
|---|---|---|---|
| Wrong file type | Validation | Reject before upload | "Only XML files supported" |
| File too large | Validation | Reject before upload | "File exceeds 50MB" |
| File already imported | Dedup | Skip, return existing | "Already imported. View session →" |
| XML parse error | Parser | FAILED status | "Could not read this file. [Retry]" |
| Unknown simulator | Parser | FAILED status | "Simulator not recognized. Is this an LMU result file?" |
| Missing required fields | Parser | Partial save with warnings | Session saved, some fields may be empty |
| DB transaction failure | Infrastructure | FAILED status, rollback | "Import failed. [Retry]" |
| Storage failure | Infrastructure | FAILED status | "Could not save file. [Retry]" |

---

## Performance Considerations

| Operation | Approach |
|---|---|
| Bulk lap insert | `createMany()` in one query |
| Hash check | Indexed lookup, < 1ms |
| Metrics calculation | In-memory, no DB reads needed |
| PB check | Single indexed query |
| Profile update | Increment (no full recalculation) |
| Unique track/car count | `groupBy` instead of COUNT DISTINCT on full table |

**Expected import time for typical LMU race (30 laps):** < 2 seconds.
**Expected import time for endurance race (200 laps):** < 5 seconds.

---

## Phase 2 — BullMQ Migration

In Phase 2, the import job moves from inline (sync) to BullMQ:

```typescript
// Phase 1 (inline in API route)
await processImport(importFileId)
return Response.json({ importFileId, status: 'IMPORTED' })

// Phase 2 (queued job)
await importQueue.add('process-import', { importFileId }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
})
return Response.json({ importFileId, status: 'PENDING' })
// Client polls for status update
```

The `processImport` function itself does not change. Only the invocation changes.
