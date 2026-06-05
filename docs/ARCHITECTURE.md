# UrApex — Technical Architecture

> System design, data flows, and layer responsibilities.
> See [DECISIONS.md](DECISIONS.md) for the reasoning behind each major choice.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                            │
│  Next.js App Router — Server Components + selective use client       │
│  TailwindCSS v4 · shadcn/ui · Recharts                               │
└───────────────────────────────┬─────────────────────────────────────┘
                                 │ HTTPS
┌───────────────────────────────▼─────────────────────────────────────┐
│                         NEXT.JS SERVER                               │
│                                                                       │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────┐  ┌───────────┐  │
│  │  API Routes  │  │ instrumentation  │  │Auth.js │  │  proxy.ts │  │
│  └──────┬──────┘  │  (worker boot)   │  └────────┘  └───────────┘  │
│         │          └────────┬─────────┘                              │
│  ┌──────▼──────────────────▼──────────────────────────────────────┐ │
│  │                     SERVICE LAYER                               │ │
│  │  import · metrics · goals · achievements · insights · storage  │ │
│  └──────────────────────────┬──────────────────────────────────── ┘ │
│                              │                                        │
│  ┌───────────────────────────▼────────────────────────────────────┐ │
│  │                    PARSER LAYER                                 │ │
│  │  ParserRegistry → detect → LMUParser → NormalizedSession       │ │
│  └───────────────────────────┬────────────────────────────────────┘ │
│                              │                                        │
│  ┌───────────────────────────▼────────────────────────────────────┐ │
│  │                  NORMALIZER LAYER                               │ │
│  │  TrackNormalizer · CarNormalizer                                │ │
│  │  rawName → DB entity (find or create + alias)                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────┬──────────────────────┘
               │                               │
  ┌────────────▼──────────────┐  ┌────────────▼──────────────────────┐
  │   PostgreSQL + Prisma 7   │  │   Storage (local / Cloudflare R2)  │
  │   Neon in production      │  │   XML session files                │
  └────────────┬──────────────┘  │   .vcr replay files               │
               │                  └────────────────────────────────────┘
  ┌────────────▼──────────────┐
  │  BullMQ + Redis (Upstash) │
  │  import queue             │
  │  worker: concurrency 2    │
  │  Vercel Cron fallback     │
  └────────────────────────── ┘

Windows Companion App (separate process)
  Tauri v2 + React + Rust
  ├── XML watcher (notify) → parse locally (Rust LMU parser) → SQLite
  │   └── optional: POST /api/upload (Bearer token) if server configured
  └── VCR watcher (separate folder) → track .vcr paths in SQLite replays table
```

---

## Frontend Architecture

### Rendering Strategy

| Page | Rendering | Reason |
|---|---|---|
| Dashboard | Server Component + `use client` charts | Data server-side; charts need browser |
| Sessions list | Server Component | Static data, server-rendered |
| Session detail | Server Component + `use client` notes/replays | Static data + interactive sections |
| Upload Center | Server Component + `use client` UploadZone | Form state + drag and drop |
| Track / Car | Server Component | Static data |
| Goals / Achievements | Server Component | Static data |
| Profile | Server Component | Static data |
| Storage manager | Server Component + `use client` list | Data server-side; delete is interactive |
| Auth pages | `use client` | Form state |

**Rule:** Default to Server Components. Use `'use client'` only when:
- User interaction (click, input, drag and drop)
- Browser APIs (file reader, URL.createObjectURL)
- Real-time polling (import status, replay upload)
- Third-party chart libraries requiring a DOM

### Routing Structure

```
src/app/
├── (auth)/                       # No sidebar
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/                        # Protected — sidebar layout
│   ├── layout.tsx                # AppSidebar + overflow scroll wrapper
│   ├── dashboard/page.tsx
│   ├── upload/page.tsx           # XML import + replay upload
│   ├── sessions/
│   │   ├── page.tsx              # Filtered table with pagination
│   │   ├── compare/page.tsx      # Side-by-side session comparison
│   │   └── [id]/page.tsx         # Full session detail
│   ├── tracks/[slug]/page.tsx
│   ├── cars/[slug]/page.tsx
│   ├── goals/page.tsx
│   ├── achievements/page.tsx
│   ├── setups/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── profile/page.tsx
│   ├── storage/page.tsx          # Replay storage manager
│   └── settings/page.tsx
└── api/
    ├── auth/[...nextauth]/
    ├── upload/                   # POST — XML import (browser + companion Bearer)
    ├── import/
    │   ├── [id]/                 # GET status · POST retry · DELETE
    │   └── process/              # POST — complete deferred import after driver selection
    ├── sessions/[id]/
    │   └── replays/              # POST upload · GET list
    ├── replays/[id]/
    │   ├── route.ts              # DELETE
    │   └── download/             # GET — stream .vcr as attachment
    ├── storage/                  # GET — usage stats + file list
    ├── goals/                    # CRUD
    ├── setups/[id]/versions/     # POST
    ├── export/
    │   ├── sessions/             # GET — CSV export
    │   └── laps/                 # GET — CSV export
    └── cron/
        └── process-imports/      # GET — Vercel Cron fallback (every minute)
```

### Component Architecture

```
src/
├── components/
│   ├── ui/               # shadcn/ui primitives — never modify directly
│   ├── charts/           # Thin Recharts wrappers with consistent defaults
│   │   ├── LapTimeChart.tsx
│   │   ├── ActivityChart.tsx
│   │   └── TrendChart.tsx
│   ├── layout/
│   │   └── AppSidebar.tsx
│   └── shared/
│       ├── ScoreBadge.tsx
│       ├── EmptyState.tsx
│       └── LoadingSkeleton.tsx
└── features/             # Co-located UI per domain
    ├── import/
    │   ├── UploadZone.tsx       # Drag/drop XML, driver selection modal, status polling
    │   └── ImportHistory.tsx    # Past imports with retry/delete
    ├── sessions/
    │   ├── SessionNotes.tsx     # Notes + tags + video URL
    │   └── SessionFilters.tsx   # Type chips, date range, PB-only, sort
    └── replays/
        ├── ReplaySection.tsx        # Per-session upload/download/delete
        ├── ReplayUploadSection.tsx  # Upload .vcr from import page + session picker
        └── StorageFileList.tsx      # Sortable list with delete/download
```

---

## Backend Architecture

### Service Layer

Services are the business logic layer. They know about the database and domain rules. They do not know about HTTP.

```
src/server/services/
├── import.service.ts       # handleUpload, processImport, runImport
├── metrics.service.ts      # Pure functions: bestLap, consistencyScore, paceScore…
├── goals.service.ts        # updateGoalProgress — called after each import
├── achievements.service.ts # evaluateAchievements — called after each import
├── insights.service.ts     # generateInsights — rule-based session analysis
└── storage.service.ts      # LocalStorageService / S3StorageService — factory pattern
```

**Key invariant:** `processImport(importFileId)` is the single entry point for all import processing — called by the BullMQ worker, the Vercel Cron fallback, and the retry endpoint. Never duplicate this logic.

### Parser Layer

```typescript
// server/parsers/types.ts
interface ParseContext {
  driverName?: string   // Identifies the user in multiplayer files
}

interface IParser {
  simulatorSlug: string
  version:       string
  canParse(content: string): boolean
  extractDriverNames(content: string): string[]
  parse(content: string, ctx?: ParseContext): Promise<NormalizedSession>
}

// server/parsers/registry.ts
const PARSERS: IParser[] = [new LMUParser()]
export function detectParser(content: string): IParser | null
export async function parseFile(content, slug?, ctx?): Promise<ParseResult>
```

**Driver identification in LMU multiplayer files:** every driver has `isPlayer=1`. The parser's `findPlayer()` does exact → case-insensitive match on `context.driverName`, falling back to the first driver with a valid best lap when no name is configured.

### Normalizer Layer

```typescript
// Lookup order: TrackAlias exact → Track slug fuzzy → create new + alias
export async function findOrCreateTrack(rawName: string, simulatorId: string): Promise<Track>
export async function findOrCreateCar(rawName: string, simulatorId: string): Promise<Car>
```

### Queue & Worker Layer

```
src/server/
├── queue/import.queue.ts     # getImportQueue() singleton; attempts:1, auto-cleanup
└── workers/import.worker.ts  # startImportWorker(); concurrency 2; SIGTERM handler
src/instrumentation.ts        # register() → startImportWorker() on Next.js boot (Node runtime only)
src/lib/redis.ts              # ConnectionOptions parsed from REDIS_URL
```

**Local dev / Railway:** worker is persistent, jobs are processed immediately.
**Vercel (serverless):** `instrumentation.ts` runs but the worker doesn't survive between invocations. Fallback: `GET /api/cron/process-imports` runs every minute via Vercel Cron, queries `ImportFile WHERE status = PENDING`, and calls `processImport()` directly — up to 5 files per invocation, max 60s.

---

## Data Flow: Import Pipeline

```
1. User drops XML → POST /api/upload
2. Server: SHA-256 hash → dedup check → save raw file via StorageService
3. Create ImportFile { status: PENDING }
4. Enqueue job: importQueue.add('process', { importFileId })
5. Return PENDING to client immediately
6. Client polls GET /api/import/[id] every 1.5s

Worker (or Vercel Cron):
  a. ImportFile → PARSING
  b. Read raw file from StorageService
  c. Detect simulator → get parser
  d. parse() → NormalizedSession
  e. findOrCreateTrack / findOrCreateCar
  f. calculateMetrics() — pure functions
  g. detectPersonalBest() — compare with historical best
  h. DB transaction: Session + Laps + Participants + Incidents + Penalties + PitStops
  i. updateProfileStats() — cached counters + rolling averages
  j. In parallel: updateGoalProgress + evaluateAchievements + generateInsights
  k. ImportFile → IMPORTED

7. Client poll sees IMPORTED → shows success + link to session
```

---

## Storage Strategy

| Environment | Provider | Config |
|---|---|---|
| Local dev | Local filesystem | `STORAGE_PROVIDER=local` |
| Production | Cloudflare R2 | `STORAGE_PROVIDER=s3` + `S3_*` vars |

Both XML session files (`raw/{userId}/{hash}.xml`) and `.vcr` replay files (`replays/{userId}/{hash}.vcr`) go through the same `StorageService` interface:

```typescript
interface StorageService {
  save(buffer: Buffer, key: string): Promise<string>   // returns storagePath
  read(storagePath: string): Promise<Buffer>
  delete(storagePath: string): Promise<void>
  exists(storagePath: string): Promise<boolean>
}
```

`S3StorageService` uses `@aws-sdk/client-s3` with `forcePathStyle: true` for R2 compatibility.

Raw XML files are **never deleted** unless the user explicitly deletes a session. Replay files are deleted on user request via `DELETE /api/replays/[id]`.

---

## Database Strategy

- Prisma 7 + `@prisma/adapter-pg` — driver adapter pattern, no `url` in schema
- Connection string passed programmatically in `src/lib/db.ts`
- `prisma.config.ts` configures `directUrl` for migration bypass of PgBouncer (Neon)
- All migrations committed to git under `prisma/migrations/`
- Metrics computed on import and cached in `Session` columns — never recomputed at query time
- Profile stats (totalSessions, totalLaps, etc.) updated after each import
- Soft deletes on `Session` (`deletedAt`) — hard deletes on `ImportFile` and `Replay`
- `BigInt` for file sizes (`fileSizeBytes`) — safe for files up to ~9 exabytes

---

## Authentication Strategy

- **Browser:** Auth.js v5 Credentials provider, JWT stored in HTTP-only signed cookie
- **Companion app:** `Authorization: Bearer <apiKey>` header on `POST /api/upload`
- `resolveUserId()` in upload route checks Bearer first, falls back to session cookie
- `proxy.ts` (Next.js 16 pattern) guards all `/(app)/*` routes — replaces `middleware.ts`
- Passwords: bcrypt cost 12
- API keys: 64-byte random hex, prefixed `uapx_`, stored in `User.apiKey`

---

## Environment Variables

```bash
# Database
DATABASE_URL=""     # Pooled URL (PgBouncer) — used by the app
DIRECT_URL=""       # Direct URL — used by prisma migrate deploy in CI

# Auth
AUTH_SECRET=""      # openssl rand -base64 32
AUTH_URL=""         # https://your-domain.com in production

# Storage
STORAGE_PROVIDER="local"   # "local" | "s3"
STORAGE_LOCAL_PATH="./storage"
S3_BUCKET=""
S3_REGION="auto"           # "auto" for Cloudflare R2
S3_ENDPOINT=""             # https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=""
S3_SECRET_KEY=""

# Queue
REDIS_URL=""        # redis://localhost:6379 (local) | rediss://... (Upstash)

# Cron
CRON_SECRET=""      # openssl rand -hex 32 — protects /api/cron/process-imports

# App
NEXT_PUBLIC_APP_URL=""
```

---

## Companion App Architecture

The companion is a **fully standalone** Windows desktop app. It works without a server — sessions are always saved locally first. Server sync is optional.

```
companion/
├── src/
│   ├── App.tsx                  # 3 tabs: Sync, Sessions, Settings
│   ├── lib/time.ts              # formatLapTime, formatDelta
│   └── components/
│       ├── StatusDot.tsx
│       ├── SyncLog.tsx          # Upload activity log
│       ├── SessionList.tsx      # Sidebar list of imported sessions
│       └── SessionDetail.tsx    # Lap table + stats for selected session
└── src-tauri/
    ├── tauri.conf.json
    ├── capabilities/default.json
    └── src/
        ├── lib.rs               # Tauri setup, all commands, core process_file()
        ├── date.rs              # ISO 8601 date formatter (Hinnant algorithm, no chrono)
        ├── parser.rs            # LMU XML parser (roxmltree) — port of TypeScript parser
        ├── metrics.rs           # best/avg/ideal lap, std dev, consistency score
        ├── metrics_snapshot.rs  # computes MetricsSnapshot from ParsedSession
        ├── db.rs                # SQLite via rusqlite (bundled); sessions + laps tables
        ├── watcher.rs           # notify crate watcher; emits file-detected + file-result
        └── uploader.rs          # reqwest multipart upload with hash dedup + 3x retry
```

### Data flow (standalone mode)

```
LMU saves XML
    ↓ notify crate detects new file
watcher.rs emits 'file-detected' → React shows "uploading" in sync log
    ↓
lib.rs: process_file()
    ├── SHA-256 hash → check SQLite for duplicate
    ├── parser.rs: parse XML → ParsedSession
    ├── metrics.rs: calculate best/avg/ideal/consistency
    ├── db.rs: insert session + laps, detect PB
    ├── [if api_url set] uploader.rs: POST /api/upload → mark synced
    └── emit 'file-result' → React updates log, refreshes Sessions tab
```

### SQLite schema (local)

```sql
sessions  — id, track_name, car_name, car_class, session_type, session_date,
            total_laps, valid_laps, best_lap_ms, avg_lap_ms, ideal_lap_ms,
            consistency_score, is_new_pb, final_position, duration_sec,
            is_online, dnf, file_path, file_hash (UNIQUE), synced_to_server,
            imported_at
laps      — session_id (FK cascade), lap_number, lap_time_ms, is_valid,
            sector1_ms, sector2_ms, sector3_ms
```

**Dedup:** SHA-256 checked against `file_hash` in SQLite (always) and `%LOCALAPPDATA%/UrApex/uploaded_hashes.txt` (server upload fast-path).

**Auth:** Bearer token from Settings → Cloud sync → API key. Required only for server sync; unused in standalone mode.

**Build:** CI runs on every push via `.github/workflows/companion-build.yml` → `.exe` (NSIS) + `.msi` attached to `companion-latest` pre-release on GitHub.

**Planned:** in-game overlay window fed by LMU UDP telemetry on port 4444.

---

## Key Invariants

1. **Parser must not crash.** Missing optional fields → warn and continue. Never throw on missing data.
2. **Dedup before storage.** SHA-256 hash computed before saving. Duplicate hash = reject, no storage write.
3. **Metrics in DB, not in queries.** Scores and aggregates live in columns. No computed views.
4. **Every API route checks auth.** No exceptions. No public write endpoints.
5. **Raw files are immutable.** Once stored, `storagePath` never changes.
6. **Services are server-only.** Import `server/services/*` only from API routes and workers.
7. **No sim-specific logic outside parsers.** Everything downstream speaks `NormalizedSession`.
8. **`processImport` is the single entry point.** Worker, cron, and retry all call the same function.
