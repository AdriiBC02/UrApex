# UrApex

> **Your apex starts here.**

UrApex is a driver development platform for sim racers. It imports session data from sim racing titles, calculates performance metrics, tracks progression over time, and helps drivers understand exactly where they lose time and what to practice next.

---

## What is UrApex?

UrApex is not just a stats viewer. It is a complete **driver development platform** that answers questions like:

- Am I actually improving?
- Which track am I fastest at?
- Where am I losing the most time?
- Is my race pace consistent or does it fall apart?
- What should I practice this week?

It does this by combining session imports, performance metrics, personal goals, a driver diary, setup management, and an AI coach — all in one place.

---

## Current Status

| Phase | Name | Status |
|---|---|---|
| Phase 0 | Research & Validation | ✅ Complete |
| Phase 1 | MVP — Core Import & Dashboard | ✅ Complete |
| Phase 2 | Analytics & Progression | ✅ Complete |
| Phase 3 | Product Polish | 🔄 In progress |
| Phase 4 | Telemetry | 🔲 Not started |
| Phase 5 | Desktop Sync Agent | 🔄 In progress |
| Phase 6 | AI Coach | 🔲 Not started |
| Phase 7 | Community | 🔲 Not started |
| Phase 8 | Monetization | 🔲 Not started |

**Current version:** `0.21.0`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | TailwindCSS v4 + shadcn/ui |
| Database | PostgreSQL 16 + Prisma 7 |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Auth.js v5 (JWT, Credentials) |
| Charts | Recharts |
| Validation | Zod |
| File storage | Local filesystem (dev) → Cloudflare R2 (prod) |
| Background jobs | BullMQ 5 + Redis (worker via `instrumentation.ts`) |
| Testing | Vitest |
| Dev environment | Docker Compose |
| Desktop agent | Tauri v2 + Rust (Phase 5 — in progress) |
| CI | GitHub Actions |
| Hosting | Vercel free tier (Neon + Upstash + R2) |

---

## Quick Start (Development)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/urapex.git
cd urapex

# 2. Install dependencies
npm install

# 3. Start PostgreSQL + Redis (via Docker)
docker compose up -d
# or via Homebrew on macOS:
# brew services start postgresql@16 && brew services start redis

# 4. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and AUTH_SECRET at minimum

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed initial data
npx prisma db seed

# 7. Start development server
npm run dev
```

App runs at `http://localhost:3000`

---

## Project Structure

```
urapex/
├── docs/                   # This folder — project documentation
├── fixtures/               # Real XML files for parser testing (anonymized)
├── prisma/                 # Schema, migrations, seed
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # Reusable UI components
│   ├── features/           # Feature-scoped components
│   ├── server/             # Server-only code (parsers, services, jobs)
│   ├── lib/                # Utilities and singletons
│   ├── schemas/            # Zod schemas
│   ├── types/              # TypeScript types
│   └── config/             # Static configuration
├── tests/                  # Unit and E2E tests
└── docker-compose.yml
```

---

## Documentation Index

| File | Description |
|---|---|
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Vision, problem, target user, differentiators |
| [ROADMAP.md](ROADMAP.md) | Full development roadmap by phase |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [FEATURES.md](FEATURES.md) | Complete feature catalog with status |
| [BACKLOG.md](BACKLOG.md) | Prioritized development backlog |
| [MVP_SCOPE.md](MVP_SCOPE.md) | MVP definition — what's in and what's out |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture decisions |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Database design and entity relationships |
| [API_SPEC.md](API_SPEC.md) | API endpoints reference |
| [DECISIONS.md](DECISIONS.md) | Architecture Decision Records (ADRs) |
| [BUGS.md](BUGS.md) | Known bugs and issues tracker |
| [IDEAS.md](IDEAS.md) | Feature ideas and future improvements |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Design language, tokens, and components |
| [USER_STORIES.md](USER_STORIES.md) | User stories with acceptance criteria |

### Research
| File | Description |
|---|---|
| [research/competitors.md](research/competitors.md) | Competitor analysis |
| [research/simracing-platforms.md](research/simracing-platforms.md) | Sim racing ecosystem overview |

### Product
| File | Description |
|---|---|
| [product/personas.md](product/personas.md) | User personas |
| [product/user-flows.md](product/user-flows.md) | Key user flows and journeys |
| [product/monetization.md](product/monetization.md) | Monetization strategy |

### Technical Deep Dives
| File | Description |
|---|---|
| [technical/import-pipeline.md](technical/import-pipeline.md) | Full import pipeline design |
| [technical/telemetry-format.md](technical/telemetry-format.md) | Telemetry file formats and processing |
| [technical/ai-coach.md](technical/ai-coach.md) | AI coach architecture and prompting |

---

## Supported Simulators

| Simulator | Status | Import Format |
|---|---|---|
| Le Mans Ultimate (LMU) | Phase 1 | XML results |
| Assetto Corsa Competizione (ACC) | Planned | JSON results |
| iRacing | Planned | ibt / JSON |
| rFactor 2 | Planned | XML results |
| RaceRoom Racing Experience | Planned | TBD |
| Automobilista 2 | Planned | TBD |
| Assetto Corsa | Planned | TBD |

---

## Taglines

- *Your apex starts here.*
- *Turn your race data into faster laps.*
- *Every lap. Every stint. Every improvement.*
- *Train smarter. Drive faster.*
- *From raw laps to real progress.*

---

## License

Private — All rights reserved. UrApex is a personal project and not yet open source.
