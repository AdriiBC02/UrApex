# UrApex

> **Drive. Analyze. Improve.**

A full-stack driver development platform for sim racers. Import your Le Mans Ultimate session files, track every metric that matters, and build a data-driven picture of your progress over time.

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

---

## Features

### Import & Analysis
- **Drag-and-drop XML import** — drop Le Mans Ultimate result files directly into the app
- **Async processing** — BullMQ + Redis queue; import returns instantly and polling resolves the result
- **Hash-based deduplication** — the same file can never be imported twice
- **Driver selection** — handles multiplayer files by asking who you are among the participants
- **Companion app** — Windows desktop app (Tauri v2 + Rust) that watches your LMU results folder, auto-uploads sessions, and drives an in-game HUD overlay fed by native Shared Memory telemetry

### Session Data
- Lap times, sectors, consistency score, safety score, pace score
- Racecraft score (RACE only) and qualifying score (QUALIFYING only)
- Incident, penalty, and pit stop tracking
- Personal best detection per track + car combination
- Session participants with final positions

### Dashboards & Analytics
- **Dashboard** — weekly activity chart, consistency trend, score rings, recent sessions, achievement feed
- **Session detail** — full lap table, sector analysis, participant grid, auto-generated insights
- **Session comparison** — side-by-side metric diff and lap overlay chart for any two sessions
- **Track analytics** — PB evolution, improvement badge, consistency trend, session type breakdown
- **Car analytics** — best-by-circuit matrix, session history
- **Driver profile** — aggregate stats, 6-score grade grid, top circuits and cars, achievement progress

### Progression
- **Goals** — 8 target types (best lap, consistency, session count, hours driven, etc.) with auto-progress on import
- **Achievements** — 10 rarity-tiered achievements that unlock automatically based on activity
- **Improvement score** — per track+car improvement percentage vs. first session baseline
- **Session notes** — free-text debrief with tags and video URL

### Setup Management
- Setup library with version history
- Link setups to sessions
- Notes per version

### In-game HUD Overlay (Companion)
- **7 configurable panels** — Speed/Gear/Position, RPM bar, Throttle/Brake trace, Steering, Lap Time & Sectors, Tyre grid, Fuel/Gaps/Engine
- **Native Shared Memory telemetry** — rF2 SHM API via `windows` crate; zero packet loss, ~1 ms latency
- **Telemetry recorder** — captures live data at 10 Hz into SQLite for post-session review
- **Overlay settings** — toggle any panel on/off and adjust opacity from the companion app or the web Settings page; config is persisted and synced live to the running overlay

### Replay Management
- Upload `.vcr` replay files and associate them with sessions
- Storage manager showing total disk usage vs free tier (10 GB R2 reference)
- File list sorted by size with session links, download and delete

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components by default, `use client` only when necessary |
| Language | TypeScript 5 (strict) | |
| Styling | TailwindCSS v4 + shadcn/ui | Dark theme, zinc palette |
| Database | PostgreSQL 16 + Prisma 7 | `@prisma/adapter-pg` driver adapter |
| Auth | Auth.js v5 | JWT strategy, Credentials provider, bcrypt cost 12 |
| Queue | BullMQ 5 + Redis | Async import pipeline, worker via `instrumentation.ts` |
| Charts | Recharts | Thin wrappers in `components/charts/` |
| Validation | Zod | API boundaries only |
| Storage | Local / Cloudflare R2 | `STORAGE_PROVIDER=local\|s3` via `@aws-sdk/client-s3` |
| Companion | Tauri v2 + React + Rust | Windows only; `notify` crate + `reqwest` |
| CI | GitHub Actions | Type-check → lint → test → `prisma migrate deploy` |
| Hosting | Vercel (free tier) | Serverless + Vercel Cron fallback for the BullMQ worker |

---

## Quick Start

**Requirements:** Node.js 22+, PostgreSQL 16, Redis

```bash
# 1. Clone and install
git clone https://github.com/AdriiBC02/UrApex.git
cd UrApex
npm install

# 2. Environment
cp .env.example .env
# Edit .env — set DATABASE_URL and AUTH_SECRET at minimum

# 3. Start services (Docker)
docker compose up -d          # PostgreSQL + Redis
# or via Homebrew on macOS:
brew services start postgresql@16
brew services start redis

# 4. Database
npx prisma migrate dev        # Create schema
npx prisma db seed            # Seed simulators + achievements

# 5. Run
npm run dev
```

App at `http://localhost:3000`

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/               # Login, register — no sidebar
│   ├── (app)/                # Protected — sidebar layout
│   │   ├── dashboard/
│   │   ├── sessions/[id]/
│   │   ├── tracks/[slug]/
│   │   ├── cars/[slug]/
│   │   ├── goals/
│   │   ├── achievements/
│   │   ├── setups/[id]/
│   │   ├── profile/
│   │   ├── storage/          # Replay storage manager
│   │   ├── upload/
│   │   └── settings/
│   └── api/
│       ├── upload/
│       ├── import/
│       ├── sessions/[id]/replays/
│       ├── replays/[id]/
│       ├── storage/
│       └── cron/process-imports/   # Vercel Cron fallback
├── server/
│   ├── services/             # Business logic (import, metrics, goals, achievements…)
│   ├── parsers/              # Simulator-specific XML parsers
│   ├── normalizers/          # rawName → DB entity resolvers
│   ├── queue/                # BullMQ queue definition
│   └── workers/              # BullMQ worker (started via instrumentation.ts)
├── features/                 # Co-located UI components per domain
│   ├── import/               # UploadZone, ImportHistory
│   ├── sessions/             # SessionNotes, SessionFilters
│   ├── replays/              # ReplaySection, ReplayUploadSection, StorageFileList
│   └── overlay/              # OverlaySettingsPanel (web-side HUD config)
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── charts/               # Recharts wrappers
│   ├── layout/               # AppSidebar
│   └── shared/               # ScoreBadge, EmptyState, LoadingSkeleton…
└── lib/
    ├── db.ts                 # Prisma singleton
    ├── auth.ts               # Auth.js config
    ├── redis.ts              # ioredis ConnectionOptions
    ├── hash.ts               # SHA-256
    └── constants.ts

companion/                    # Tauri v2 Windows desktop app
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
docs/                         # Full documentation
```

---

## Scripts

```bash
npm run dev           # Dev server (Next.js + Turbopack)
npm run build         # Production build
npm run test          # Unit tests (Vitest)
npm run lint          # ESLint

npm run db:migrate    # Run pending migrations (dev)
npm run db:seed       # Seed simulators + achievements
npm run db:studio     # Prisma Studio GUI
```

---

## Documentation

Full docs in [`/docs`](./docs):

| File | Contents |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flows, layer responsibilities |
| [CHANGELOG.md](docs/CHANGELOG.md) | What changed and when |
| [BACKLOG.md](docs/BACKLOG.md) | Prioritized task list |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | All models and relations explained |
| [API_SPEC.md](docs/API_SPEC.md) | API endpoint reference |
| [DECISIONS.md](docs/DECISIONS.md) | Why each major technical choice was made |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Color palette, typography, component patterns |
| [ROADMAP.md](docs/ROADMAP.md) | Phase roadmap |

---

## License

MIT
