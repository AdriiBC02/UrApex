# UrApex

> **Your apex starts here.**

A driver development platform for sim racers. Import your sessions, track your progress, drive faster.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **Styling:** TailwindCSS v4 + shadcn/ui
- **Database:** PostgreSQL + Prisma 7
- **Auth:** Auth.js v5 (JWT, Credentials provider)
- **Charts:** Recharts
- **Validation:** Zod

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local
# Fill in DATABASE_URL and AUTH_SECRET

# 3. Start PostgreSQL (Docker, or Homebrew on macOS)
docker compose up -d
# or: brew services start postgresql@14

# 4. Create DB and run migrations
createdb urapex
npx prisma migrate dev

# 5. Seed initial data (simulators, achievements)
npx prisma db seed

# 6. Start dev server
npm run dev
```

App at `http://localhost:3000`

## Documentation

Full project documentation lives in [`/docs`](./docs):

- [`docs/README.md`](docs/README.md) — Full doc index
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Phase roadmap
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical architecture
- [`docs/MVP_SCOPE.md`](docs/MVP_SCOPE.md) — What's in/out of MVP

## Current Status

Phase 1 — MVP in progress. See [`docs/CHANGELOG.md`](docs/CHANGELOG.md) for what's been built.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run test         # Run unit tests (Vitest)
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed the database
npm run db:studio    # Open Prisma Studio
```
