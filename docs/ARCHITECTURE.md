# UrApex — Technical Architecture

> This document describes the technical architecture of UrApex.
> Read DECISIONS.md for the reasoning behind each major choice.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                           │
│                                                                    │
│   Next.js App Router — Server Components + Client Components      │
│   TailwindCSS · shadcn/ui · Recharts                              │
└────────────────────────────┬─────────────────────────────────────┘
                              │ HTTPS
┌────────────────────────────▼─────────────────────────────────────┐
│                      NEXT.JS SERVER                               │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┐  ┌───────────┐   │
│  │  API Routes  │  │Server Actions│  │Auth.js │  │Middleware │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┘  └───────────┘   │
│         │                │                                         │
│  ┌──────▼────────────────▼────────────────────────────────────┐  │
│  │                    SERVICE LAYER                            │  │
│  │  ImportService · SessionService · MetricsService           │  │
│  │  StorageService · AchievementService · GoalService         │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │                   PARSER LAYER                             │  │
│  │  ParserRegistry → detect → LMUParser → NormalizedSession  │  │
│  │  (future: ACCParser, iRacingParser, RF2Parser...)         │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │                NORMALIZER LAYER                            │  │
│  │  TrackNormalizer · CarNormalizer                          │  │
│  │  rawName → DB entity (find or create + alias)            │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────────────────┬───────────────────┘
                │                              │
   ┌────────────▼────────────┐   ┌────────────▼─────────────┐
   │    PostgreSQL + Prisma   │   │   File Storage           │
   │                          │   │                          │
   │   Normalized data        │   │  /storage/raw/           │
   │   Metrics cached         │   │  raw XML files           │
   │   Raw file paths         │   │  (→ S3 in prod)          │
   └──────────────────────────┘   └──────────────────────────┘
                │
   ┌────────────▼────────────┐
   │   Job Queue (Phase 2+)   │
   │   BullMQ + Redis         │
   │   - import.job           │
   │   - metrics.job          │
   │   - achievements.job     │
   └──────────────────────────┘
```

---

## Frontend Architecture

### Rendering Strategy

| Page | Rendering | Reason |
|---|---|---|
| Dashboard | Server Component + `use client` charts | Data fetched server-side, charts need client |
| Session History | Server Component (table) | Static data, server-rendered |
| Session Detail | Server Component + `use client` charts | Same |
| Upload Center | Client Component | Drag & drop, polling, real-time state |
| Track/Car Detail | Server Component | Static data |
| Goals/Achievements | Server Component | Static data |
| Auth pages | Client Component | Form state |

**Rule:** Default to Server Components. Use `'use client'` only when:
- User interaction is needed (click, hover, input)
- Browser APIs are used (drag & drop, file reader)
- Real-time updates are needed (import status polling)
- Third-party chart libraries that don't support SSR

### Routing Structure

```
app/
├── (marketing)/              # No auth required
│   └── page.tsx              # Landing page
├── (auth)/                   # Auth layout (no sidebar)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx
├── (app)/                    # Protected layout (with sidebar)
│   ├── layout.tsx            # Sidebar + header
│   ├── dashboard/page.tsx
│   ├── upload/page.tsx
│   ├── sessions/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── tracks/[slug]/page.tsx
│   ├── cars/[slug]/page.tsx
│   ├── goals/page.tsx
│   ├── achievements/page.tsx
│   ├── setups/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── compare/page.tsx
│   ├── coach/page.tsx        # Phase 6
│   └── settings/
│       ├── page.tsx
│       ├── profile/page.tsx
│       └── privacy/page.tsx
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── upload/route.ts
    ├── import/[id]/status/route.ts
    └── sessions/route.ts
```

### Component Architecture

```
components/
├── ui/                    # shadcn/ui primitives (never modify directly)
├── charts/                # Recharts wrappers with consistent defaults
│   ├── LapTimeChart.tsx   # Line chart for lap times per session
│   ├── ConsistencyChart.tsx
│   ├── SectorChart.tsx    # Bar chart for sector comparison
│   ├── WeeklyChart.tsx    # Bar chart for sessions per week
│   └── ProgressChart.tsx  # Area chart for score evolution
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── AppShell.tsx
└── shared/
    ├── LapTimeDisplay.tsx  # Formats ms → "1:48.321"
    ├── ScoreBadge.tsx      # 0-100 score with color
    ├── SimulatorBadge.tsx
    ├── SessionTypeBadge.tsx
    ├── EmptyState.tsx      # Always requires an action prop
    └── LoadingSkeleton.tsx
```

---

## Backend Architecture

### Service Layer

Services are the business logic layer. They know about the database and domain rules. They do not know about HTTP.

```typescript
// Pattern: each service is a collection of async functions
// No classes unless state is needed

// server/services/import.service.ts
export async function createImportJob(userId: string, file: File): Promise<ImportFile>
export async function processImport(importFileId: string): Promise<Session>
export async function retryImport(importFileId: string): Promise<void>
export async function deleteImport(importFileId: string, userId: string): Promise<void>
```

### Parser Layer

Parsers are sim-specific. They receive raw file content and return a normalized session.

```typescript
// server/parsers/types.ts
interface ParseContext {
  driverName?: string  // User's in-game name — used to identify their laps in multiplayer files
}

interface IParser {
  simulatorSlug: string
  version: string
  canParse(content: string): boolean
  extractDriverNames(content: string): string[]  // Lightweight — no full parse, returns unique driver names
  parse(content: string, context?: ParseContext): Promise<NormalizedSession>
}

// server/parsers/registry.ts
const PARSERS: IParser[] = [new LMUParser()]
export function detectParser(content: string): IParser | null
export function getParser(slug: string): IParser | null
export function extractDriverNames(content: string, simulatorSlug?: string): string[]
export async function parseFile(content: string, slug?: string, context?: ParseContext): Promise<ParseResult>
```

**Driver identification:** LMU multiplayer files set `isPlayer=1` on all drivers. The parser's `findPlayer()` uses `context.driverName` for exact → case-insensitive matching, falling back to the first driver with a valid best lap time when no name is provided.

### Normalizer Layer

Normalizers resolve raw names from XML into canonical DB entities.

```typescript
// server/normalizers/track.normalizer.ts
export async function findOrCreateTrack(
  rawName: string,
  simulatorId: string
): Promise<Track>

// Lookup order:
// 1. TrackAlias (rawName + simulatorId) → exact match
// 2. Track (by slug) → fuzzy match
// 3. Create new Track + TrackAlias
```

### Job Layer (Phase 2+)

Jobs are async tasks that run outside the request cycle.

```typescript
// server/jobs/processImport.ts
// Called by BullMQ worker
export async function processImportJob(data: { importFileId: string }): Promise<void>

// MVP: called directly from API route (sync)
// Phase 2: registered as BullMQ job, triggered from API route
```

---

## Data Flow: Import Pipeline

```
1. User drops XML file on Upload Center
2. Client: reads file, sends to POST /api/upload
3. Server:
   a. Validate file type and size
   b. Calculate SHA-256 hash
   c. Check ImportFile table for duplicate hash
      → If duplicate: return { duplicate: true, existingSessionId }
   d. Store raw file via StorageService
   e. Create ImportFile { status: PENDING }
   f. Return importFileId to client
4. Client: starts polling GET /api/import/[id]/status
5. Server (import job):
   a. ImportFile → PARSING
   b. Detect simulator (from content or metadata)
   c. Get parser from registry
   d. Parse raw content → NormalizedSession
   e. Normalize track (rawName → Track entity)
   f. Normalize car (rawName → Car entity)
   g. Calculate metrics from laps
   h. Detect PB (compare with user's historical best)
   i. Save Session + Laps + Participants + Incidents + Penalties + PitStops
   j. Update DriverProfile cached stats
   k. Evaluate achievements
   l. Update goals progress
   m. ImportFile → IMPORTED
6. Client: polling detects IMPORTED, shows success + link to session
```

---

## Storage Strategy

| Environment | Provider | Path |
|---|---|---|
| Development | Local filesystem | `./storage/raw/{userId}/{hash}.xml` |
| Production (MVP) | Local filesystem | Same (single-instance Vercel not suitable) |
| Production (Phase 2) | Cloudflare R2 or MinIO | S3-compatible |

StorageService interface:
```typescript
interface StorageService {
  save(buffer: Buffer, key: string): Promise<string>  // returns storage path
  get(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}
```

Raw files are **never deleted** unless the user explicitly deletes a session.

---

## Database Strategy

- Prisma ORM for all queries
- Singleton client in `lib/db.ts`
- Migrations are committed to git
- No raw SQL unless absolutely necessary
- Metrics are computed on import and cached in `Session` columns
- Profile stats (totalSessions, totalLaps) are incremented/decremented in place
- Soft deletes on Session (deletedAt field)
- Never expose raw DB errors to the client

---

## Authentication Strategy

- Auth.js v5 with Credentials provider
- Passwords hashed with bcrypt (cost 12)
- Sessions use **JWT** (not database sessions) — stored in signed HTTP-only cookie
- `proxy.ts` (Next.js 16 pattern) protects all `/app/*` routes — replaces `middleware.ts`
- API routes call `auth()` from Auth.js at the top of every handler
- **API key auth (companion app):** `POST /api/upload` also accepts `Authorization: Bearer uapx_<key>`. The `resolveUserId()` helper checks for a Bearer token first, then falls back to session cookie. Keys are stored hashed in `User.apiKey` as a random 64-byte hex string prefixed with `uapx_`.
- User ID is always the source of truth — never trust user-supplied IDs

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"

# Storage
STORAGE_PROVIDER="local"          # "local" | "s3"
STORAGE_LOCAL_PATH="./storage"

# S3 (when STORAGE_PROVIDER=s3)
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_ENDPOINT=""                     # For R2 or MinIO

# Redis (Phase 2+)
REDIS_URL=""

# AI (Phase 6+)
ANTHROPIC_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Companion App Architecture

The `/companion/` directory contains a separate Tauri v2 project — a Windows desktop app that watches the LMU results folder and auto-uploads new session files.

```
companion/
├── src/              React + TypeScript UI (Vite)
│   ├── App.tsx       Settings tab + Sync log tab
│   └── components/   StatusDot, SyncLog
└── src-tauri/
    └── src/
        ├── lib.rs    Tauri commands + setup (tray, window events)
        ├── watcher.rs  notify crate — file watcher in its own thread
        └── uploader.rs reqwest — multipart HTTP upload
```

**Flow:**
1. User configures folder path + API URL + API key in Settings tab
2. Rust thread watches folder for new `.xml` files (using `notify` crate)
3. On new file: emits `file-detected` event to frontend + spawns async upload task
4. Upload sends `POST /api/upload` with `Authorization: Bearer <apiKey>`
5. Windows notification shown with result (imported / duplicate / failed)
6. Sync log updated in UI

**Build:** requires Rust (`rustup`). `npm run tauri:build` → `.msi`/`.exe` installer in `src-tauri/target/release/bundle/`.

**Future overlays:** Tauri supports transparent always-on-top windows on Windows. A second window can display real-time sector times via LMU's UDP telemetry (port 4444) without modifying the game.

---

## Key Technical Constraints

1. **Parser must not crash.** If a field is missing, log a warning and continue. Never throw on missing optional data.
2. **Dedup before storage.** Calculate hash before saving any file. Never store a duplicate.
3. **Metrics in DB, not in queries.** Scores and aggregates are in columns, not computed views.
4. **Every API route checks auth.** No exceptions. No public write endpoints.
5. **Raw files are immutable.** Once stored, the raw file path never changes.
6. **Services are server-only.** Import `server/services/*` only from API routes, Server Actions, and jobs.
7. **No sim-specific logic outside parsers.** The rest of the app speaks `NormalizedSession`.
