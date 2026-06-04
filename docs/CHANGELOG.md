# UrApex — Changelog

> All notable changes to UrApex are documented in this file.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

> Next up: Storage service, upload API, LMU XML parser, import job.

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
