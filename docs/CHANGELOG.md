# UrApex — Changelog

> All notable changes to UrApex are documented in this file.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

> Next up: AN-013 auto insights, AN-006 lap comparison (sector delta), setups manager.

---

## [0.12.0] — 2026-06-05

> AN-014 weekly activity + AN-005 session comparison — training history and side-by-side analysis.

### Added
- `ActivityChart` — recharts bar chart for weekly session counts (12-week window, current week in cyan)
- `LapComparisonChart` — dual-line recharts chart overlaying two sessions' lap times (cyan vs orange dashed)
- `/sessions/compare` — session comparison page with slot UI, session picker, metrics diff grid, lap overlay chart, lap-by-lap delta table
- Dashboard "Training activity" section: sessions per week bar + consistency trend (last 12 weeks, only shown with data)
- Sessions list: `⇄` compare icon on row hover → `/sessions/compare?a=ID`

---

## [0.11.0] — 2026-06-05

> AN-001/002 — Pace Score + Improvement Score. All 4 driver scores now live.

### Added
- `paceScore(bestMs, idealMs)` in metrics.service — measures how well the driver extracts maximum pace; `(idealLap / bestLap) * 100`, requires sector data
- `calculateImprovementScore(userId)` — per track+car combo: `(firstBestMs - currentBestMs) / firstBestMs * 100`, averaged and scaled (20% avg → 100)
- `improvementScore Float?` field on `DriverProfile` (migration `20260604095811_add_improvement_score`)

### Changed
- `calculateMetrics()` now includes `paceScore` stored on every Session
- `updateProfileStats()` now calculates and persists all 4 profile scores (rolling avg of last 20 sessions for consistency/safety/pace; improvement via combo analysis)
- Dashboard Driver Rating card: 4 rings (Consistency, Safety, Pace, Improvement); rating composite uses all 4

---

## [0.10.0] — 2026-06-05

> AN-003/004 full track & car analytics — improvement badge, PB evolution, consistency trend, session type breakdown.

### Added
- `TrendChart` — generic recharts line chart for score/metric trends over time (color, domain, formatter configurable)

### Changed
- **Track detail** — running PB evolution (only plots new PBs), improvement badge (+Xs / X%), session type breakdown with bar, consistency trend chart, best-by-car with trophy for leader, glass Section wrapper, 6-stat strip with drive time, breadcrumb with back arrow
- **Car detail** — same structure: running PB chart, improvement badge, session type breakdown, best-by-circuit list with trophy, consistency trend, 6-stat strip with circuits count, glass cards throughout

---

## [0.9.0] — 2026-06-05

> AN-012 Session notes — debrief after every session with tags and video link.

### Added
- `GET /POST /api/sessions/[id]/notes` — list and create session notes (auth + ownership gated)
- `DELETE /api/sessions/[id]/notes/[noteId]` — delete note (session ownership check)
- `SessionNotes` client component — add form with textarea, tag pills (Enter/comma/Backspace), optional video URL, optimistic list; delete on hover with loader; empty hint copy
- Session detail page — "Notes & Debrief" section using `Section` wrapper, fetches notes server-side via `include`

---

## [0.8.0] — 2026-06-05

> Dashboard v3 + UI polish pass 3 — score rings, glass cards, UploadZone fix, GoalForm visual redesign.

### Changed
- **Dashboard** — Driver Rating banner (full-width, composite score + letter grade + 3 rings), SVG score rings with CSS drop-shadow glow (no box artifacts), glass cards (`bg-zinc-900/50 backdrop-blur-sm`), session rows with colored 3px left border + consistency mini-bar + position badge, week delta in stats, empty-state CTA aligned to sessions card height
- **UploadZone** — `useRef` programmatic click replaces `absolute inset-0 opacity-0` input (fixes browser tooltip), horizontal layout with Browse button, file size display
- **GoalForm** — 3×3 visual type-selector grid replacing dropdown, each type has icon + color, target value panel shows selected type's icon, plain `<button>` replaces shadcn deps
- **Settings page** — replaces Card/CardHeader with `rounded-2xl border` sections, consistent with rest of app
- **New Goal page** — `rounded-2xl` container, updated description mentioning auto-progress, `NonNullable` type guards on track/car queries
- **Sidebar** — `bg-zinc-950/90 backdrop-blur-md` subtle glass effect
- **globals.css** — grid opacity bumped to 4.5%, second blob as layout div, app-wide grid via `.app-bg::before/::after`

---

## [0.7.0] — 2026-06-05

> AN-009/010 achievements engine + landing redesign + auth split-screen + UploadZone v2.

### Added
- `achievements.service.ts` — `evaluateAchievements()` called after every import; handles 7 of 8 condition types (all_sector_pbs deferred); upserts `UserAchievement` with progress + auto-unlocks
- Both `updateGoalProgress` and `evaluateAchievements` now run in parallel after each import

### Changed
- **Landing page** — full redesign: sticky blur nav, gradient headline, dot-grid hero bg, stats strip, 6-feature grid with accent card, numbered "How it works", final CTA with glow, footer
- **Auth layout** — split-screen: left branded panel with grid bg, feature bullets, tagline; right panel with form; mobile fallback shows centered logo
- **Login / Register** — plain `<button>` replaces shadcn Button, `rounded-2xl` card with backdrop-blur, AlertCircle error state, removed all Card imports
- **UploadZone** — larger 2xl drop zone, Loader2 spinner during upload, file size display, "Clear done" button, `StatusPill` + `FileStatusIcon` components, cleaner queue layout

---

## [0.6.0] — 2026-06-05

> UI polish pass 2 — session detail hero, tracks/cars grid, achievements rarity, empty state.

### Changed
- **Session detail** — hero header with gradient top bar + type/PB badges, new `MetricTile` with score progress bar, `Section` wrapper replaces Card, back nav, lap table PB/SB badges, invalid lap opacity, removed all Card imports
- **Tracks page** — card redesign with country + length in meta row, session count pill, last-session stat, hover gradient, `orderBy lastSession`
- **Cars page** — same card pattern as tracks: class label, session count pill, last-session stat, hover gradient, `NonNullable` type guard
- **Achievements page** — rarity config table with per-rarity border/bg/glow/icon, legendary shimmer overlay, `SectionLabel` with icon, progress bar uses rarity color, locked state opacity, removed PageHeader dependency
- **EmptyState** — outer glow ring, cyan ghost-button style for action, removed shadcn Button dependency
- **globals.css** — no change (all styling via Tailwind)

---

## [0.5.0] — 2026-06-05

> AN-008 complete + full UI redesign — sidebar, dashboard, sessions, goals, upload.

### Added
- `goals.service.ts` — `updateGoalProgress()` called after every successful import; handles all 8 auto-trackable goal types (BEST_LAP_TIME, CONSISTENCY_SCORE, CLEAN_LAP_COUNT, SESSION_COUNT, HOURS_DRIVEN, REDUCE_INCIDENTS, IMPROVE_SAFETY, COMPLETE_STINTS); auto-completes goals when target is reached
- Track/car scoping: goals with `trackId`/`carId` only update for matching sessions

### Changed
- **Sidebar** — section labels (Overview / Analysis / Progress), left-edge active indicator, gradient logo shadow, avatar initials, inline sign-out button, `w-58`
- **StatCard** — icon in colored container, gradient hover overlay, bottom accent line, `sublabel` prop, removed Card dependency
- **Dashboard** — greeting with time-of-day, `Import session` CTA in header, active goals widget, recent PBs as section, dot color per session type, removed Card wrappers
- **Sessions page** — type filter chips with dot indicators and count, redesigned table header, color-coded type badges with dot, improved pagination with icons
- **Goals page** — section layout with counts, per-goal top accent bar, `LOWER_IS_BETTER` progress logic for lap times/incidents, deadline overdue state in red
- **Upload page** — icon-per-status in history list, border on status badges, `max-w-2xl` scoped to content
- **App layout** — `px-8 py-7` for better breathing room

---

## [0.4.0] — 2026-06-05

> Goals feature complete — create, list, mark complete/abandon/reactivate, delete.

### Added
- `POST /api/goals` — create goal with Zod validation (name, type, targetValue, optional trackId/carId/deadline)
- `GET /api/goals` — list all goals for the authenticated user
- `PATCH /api/goals/[id]` — update status (ACTIVE/COMPLETED/ABANDONED), name, targetValue, deadline
- `DELETE /api/goals/[id]` — hard delete goal (ownership-checked)
- `GoalActions` component — dropdown per card: mark complete, abandon, reactivate, delete with optimistic `router.refresh()`
- Abandoned goals section on goals list page (collapsible — only shown when there are abandoned goals)

### Fixed
- `GoalForm` Select `onValueChange` typed as `string | null` in BaseUI — coerced to `""` on null/deselect
- `GoalForm` did not handle null value from Select deselect for trackId/carId

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
