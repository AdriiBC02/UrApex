# UrApex — Changelog

> All notable changes to UrApex are documented in this file.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

> Next up: Session notes, goals create form, setups manager, loading states wired per-page.

---

## [0.3.0] — 2026-06-04

> Phase 1 complete — all MVP pages, UI component system, error handling.

### Added

**UI Component System**
- `StatCard` — reusable stat card with icon, optional delta and accent
- `ScoreBadge` / `ScoreRow` — 0–100 score with color coding (green/lime/yellow/orange/red)
- `PageHeader` — consistent page header with icon, description, action slot
- `Skeletons` — `StatCardSkeleton`, `SessionRowSkeleton`, `DashboardSkeleton`, `TableSkeleton`
- `PBEvolutionChart` — best lap evolution over time (Y-axis reversed, Recharts)

**Pages**
- `/tracks` — grid of circuits driven with best lap and session count
- `/tracks/[slug]` — stat cards + PB evolution chart + best lap by car + session table
- `/cars` — grid of cars used with best lap and session count
- `/cars/[slug]` — stat cards + best lap by circuit + session table
- `/goals` — active/completed goals with progress bars + rarity-colored cards
- `/achievements` — full grid: unlocked/in-progress/locked with rarity styles and progress bars
- `/setups` — placeholder (Phase 3)
- `/settings` — profile edit (displayName, country) + account info
- `/` (landing) + `/login` + `/register` — already done, mentioned for completeness

**API**
- `GET /api/profile` — return current user's driver profile
- `PATCH /api/profile` — update displayName, country, bio

**Error handling**
- `src/app/not-found.tsx` — branded 404 with UrApex logo and back to dashboard button
- `src/app/(app)/error.tsx` — error boundary with reset button

**Dashboard improvements**
- 2-column layout: sessions list + scores/PBs sidebar
- `ScoreBadge` on Consistency, Safety, Pace scores
- Recent PBs widget
- Quick actions for new users (empty state)

---

## [0.2.0] — 2026-06-04

> Phase 1 — Complete import pipeline: storage, parser, normalizers, metrics, upload UI, session pages.

### Added

**StorageService**
- `StorageService` interface with `save`, `read`, `delete`, `exists`
- `LocalStorageService` implementation (dev/single-instance prod)
- `rawFileKey(userId, fileHash)` helper for consistent paths

**Parser system**
- `IParser` interface + `NormalizedSession` type + `ParsedLap/Participant/Incident/Penalty/PitStop`
- `LMUParser` — rFactor 2/LMU XML parser with defensive field extraction
  - Handles multiple root elements: `<Standings>`, `<Race>`, `<Qualify>`, `<Practice>`
  - Converts rF2 time format (seconds float → milliseconds)
  - Auto-detects session type, extracts laps, sectors, participants, pit stops, penalties
  - Non-fatal warnings instead of crashes on missing optional fields
- `ParserRegistry` with `detectParser()` and `getParser()` + `parseFile()` helper
- `fixtures/lmu/race_minimal.xml` — test fixture with 5 laps, 3 participants
- `tests/unit/parsers/lmu.test.ts` — 15 unit tests, all passing

**Normalizers**
- `TrackNormalizer.findOrCreateTrack()` — rawName → Track with alias table
- `CarNormalizer.findOrCreateCar()` / `findOrCreateCarClass()` — rawName → Car/CarClass with alias

**Metrics service**
- `bestLap`, `avgLap`, `medianLap`, `idealLap` (sum of best sectors)
- `stdDev`, `cleanLapRatio`, `dropOff` (pace degradation)
- `consistencyScore` — 0–100 based on coefficient of variation
- `safetyScore` — 0–100 weighted by incidents, penalties, DNF/DQ, invalid laps

**Import service**
- `handleUpload()` — SHA-256 dedup check, raw file save, ImportFile record creation
- `processImport()` — full pipeline: parse → normalize → metrics → PB detection → DB transaction
- Bulk inserts for laps (100+), participants, incidents, penalties, pit stops
- PB detection against historical best at same track/car
- `updateProfileStats()` — recalculates and caches DriverProfile aggregates

**API routes**
- `POST /api/upload` — multipart file upload with type/size validation, sync import
- `GET /api/import/[id]` — import status check
- `POST /api/import/[id]` — retry failed import
- `DELETE /api/import/[id]` — soft-delete session + hard-delete ImportFile

**Pages**
- `/upload` — drag & drop zone + real-time status feedback + import history
- `/sessions` — table with type filter chips + pagination (20/page)
- `/sessions/[id]` — full session detail: metric cards, lap table, sector breakdown, participants, incidents/penalties

**Charts**
- `LapTimeChart` — Recharts line chart with PB highlighted in green, invalid laps muted

### Internal
- `vitest.config.ts` — Vitest configured with path alias `@/` → `src/`

---

## [0.1.0] — 2026-06-04

> Phase 1 — Project scaffold, database, auth, and dashboard shell.

### Added

**Infrastructure**
- Next.js 16.2.7 with App Router, TypeScript strict, Tailwind CSS v4, Turbopack
- Docker Compose for PostgreSQL 16 + Redis 7
- Prisma 7 with `@prisma/adapter-pg` and `prisma.config.ts` (breaking change from Prisma 5/6)
- Full project folder structure (`src/app`, `src/components`, `src/features`, `src/server`, `src/lib`, etc.)
- shadcn/ui initialized with components: card, badge, table, input, label, form, select, tabs, dropdown-menu, avatar, skeleton, sonner, dialog, separator, sheet, tooltip, sidebar
- Recharts, Zod, fast-xml-parser, date-fns, bcryptjs installed
- `.env.example` with all required environment variables
- `docker-compose.yml` for local development
- Vitest + Testing Library configured

**Database**
- Full Prisma schema with 21 models: User, Account, AuthSession, DriverProfile, Simulator, ImportFile, Session, Lap, Track, TrackAlias, TrackLayout, Car, CarAlias, CarClass, SessionParticipant, Incident, Penalty, PitStop, SessionNote, Setup, SetupVersion, SessionSetup, Goal, Achievement, UserAchievement
- Initial migration applied
- Seed: 7 simulators (lmu, acc, iracing, rf2, rr, ams2, ac), 10 initial achievements

**Authentication**
- Auth.js v5 with Credentials provider (email + password)
- JWT session strategy
- `auth.config.ts` (edge-safe, used by proxy) + `auth.ts` (full config with Prisma adapter)
- `proxy.ts` for route protection (Next.js 16 pattern replacing `middleware.ts`)
- `POST /api/auth/register` — creates User + DriverProfile in one transaction
- Password hashing with bcrypt (cost 12)

**Core library**
- `lib/db.ts` — Prisma singleton with `@prisma/adapter-pg`
- `lib/auth.ts` — Full Auth.js configuration
- `lib/hash.ts` — SHA-256 utilities
- `lib/time.ts` — `formatLapTime(ms)`, `formatDelta()`, `formatDuration()`, `formatDriveTime()`
- `lib/constants.ts` — upload limits, simulator labels, session type labels
- `hooks/use-mobile.ts` — responsive breakpoint hook

**Pages**
- `/` — Landing page with hero, feature cards, CTAs
- `/login` — Sign in form with error handling and auto-redirect
- `/register` — Registration form with auto-login after success
- `/dashboard` — Stats cards (sessions, laps, drive time, circuits, cars) + recent sessions list + empty state
- App layout with sidebar navigation (Dashboard, Upload, Sessions, Tracks, Cars, Goals, Achievements, Setups, Settings, Sign out)
- UrApex dark theme (zinc-950 base, cyan-500 accent) applied globally

**Design system**
- Dark-only CSS theme with UrApex color palette (cyan primary, orange accent)
- `EmptyState` shared component with icon, title, description, and optional CTA

**Documentation**
- Full `/docs` directory: README, PROJECT_CONTEXT, ROADMAP, CHANGELOG, FEATURES, BACKLOG, MVP_SCOPE, ARCHITECTURE, DATABASE_SCHEMA, API_SPEC, DECISIONS, BUGS, IDEAS, DESIGN_SYSTEM, USER_STORIES
- Subdirectories: `docs/research/`, `docs/product/`, `docs/technical/`
- 11 Architecture Decision Records in DECISIONS.md

### Internal
- Resolved Prisma 7 breaking changes: `datasource.url` moved to `prisma.config.ts`, `PrismaClient` now requires adapter
- Resolved Next.js 16 breaking change: `middleware.ts` renamed to `proxy.ts`
- Separated Auth.js config into edge-safe and full configs to avoid Node.js modules in proxy runtime

---

## [0.0.0] — 2026-06-04

> Project initialized. Documentation only, no code.

### Added
- Project concept and architecture defined
- Full documentation structure in `/docs`

---

<!--
TEMPLATE — copy this block when releasing a new version:

## [X.Y.Z] — YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-

### Internal
-

-->
