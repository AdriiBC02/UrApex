# UrApex — Architecture Decision Records (ADRs)

> This document records significant technical decisions made during the development of UrApex.
> Each ADR explains the context, the options considered, the chosen approach, and the reasoning.
> Once recorded, decisions are not changed — they are superseded by new ADRs.

---

## ADR Format

```
## ADR-XXX — Title
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-YYY | Deprecated

### Context
Why does this decision need to be made?

### Options Considered
What alternatives were evaluated?

### Decision
What was chosen?

### Reasoning
Why was this chosen over the alternatives?

### Consequences
What does this decision mean for the project going forward?
```

---

## ADR-001 — Next.js App Router

**Date:** 2025-06-04
**Status:** Accepted

### Context
Need to choose a React framework. Options are Next.js Pages Router, Next.js App Router, Remix, or SvelteKit.

### Options Considered
1. Next.js Pages Router — mature, well-documented, predictable
2. **Next.js App Router** — modern, React Server Components, streaming
3. Remix — good for data loading, less ecosystem support
4. SvelteKit — smaller ecosystem, different mental model

### Decision
Next.js 14 with App Router.

### Reasoning
- App Router's Server Components eliminate unnecessary client bundles for data-heavy pages
- Tight integration with Vercel (deployment target)
- Largest ecosystem and community
- shadcn/ui is built for Next.js App Router
- Auth.js v5 is designed for App Router

### Consequences
- Must be careful about `'use client'` boundaries
- Some libraries don't support Server Components yet
- Learning curve for App Router patterns

---

## ADR-002 — Auth.js v5 (formerly NextAuth)

**Date:** 2025-06-04
**Status:** Accepted

### Context
Need authentication. Options: Auth.js, Clerk, Supabase Auth, custom JWT.

### Options Considered
1. **Auth.js v5** — open source, zero vendor lock-in, built for Next.js
2. Clerk — excellent DX, UI components included, but costs money at scale
3. Supabase Auth — tied to Supabase ecosystem
4. Custom JWT — full control, significant work

### Decision
Auth.js v5 with Credentials provider.

### Reasoning
- No vendor lock-in
- Free forever
- Handles sessions, CSRF, cookie management
- Prisma adapter available
- Database sessions (not JWT) — easier to invalidate
- Can add OAuth providers later without changing auth system

### Consequences
- Must implement password reset manually
- Must implement email verification manually
- Auth.js v5 API is slightly different from v4 — documentation can be sparse

---

## ADR-003 — PostgreSQL + Prisma

**Date:** 2025-06-04
**Status:** Accepted

### Context
Database selection. Options: PostgreSQL, MySQL, SQLite, MongoDB.

### Options Considered
1. **PostgreSQL + Prisma** — relational, type-safe ORM
2. SQLite — simple, no server, but not suitable for production
3. MySQL — similar to PostgreSQL but less features
4. MongoDB — flexible schema, but metrics aggregations are complex

### Decision
PostgreSQL with Prisma ORM.

### Reasoning
- Relational data (sessions → laps → sectors) fits perfectly
- Prisma provides type safety end-to-end
- PostgreSQL advanced features (JSONB, arrays) used for achievements and simulator slugs
- Neon and Railway offer free hosted PostgreSQL
- Easy to run locally via Docker

### Consequences
- Migrations must be managed carefully
- Schema changes require `prisma migrate dev`
- No raw SQL — all queries through Prisma client

---

## ADR-004 — SHA-256 Deduplication Before Storage

**Date:** 2025-06-04
**Status:** Accepted

### Context
How to prevent the same session from being imported twice.

### Options Considered
1. **Hash the file content (SHA-256) before storing** — check DB first
2. Parse the file and check for session date + track + car combination
3. Hash after storing — requires cleanup on duplicate
4. User-provided filename deduplication — unreliable

### Decision
Calculate SHA-256 of file content before any processing. Check against `ImportFile.fileHash` (indexed, unique). Reject if found.

### Reasoning
- The hash check is a single indexed DB lookup — extremely fast
- No false duplicates possible (collision risk is negligible)
- No false negatives — even if the user renames the file, the content matches
- Does not require parsing — the file might be invalid, but we still dedup correctly

### Consequences
- `fileHash` must have a UNIQUE database constraint
- The hash is calculated server-side, not client-side (more reliable)
- If a user re-exports the same session from the sim, the file content may differ slightly (timestamps, ordering) — this would create a false negative. Acceptable for MVP.

---

## ADR-005 — Parser Interface Pattern

**Date:** 2025-06-04
**Status:** Accepted

### Context
Need to support multiple simulators with different file formats. How to structure parser code.

### Options Considered
1. **Interface + registry pattern** — `IParser` + `ParserRegistry`
2. Single parser with switch/case per simulator — simple but becomes unmaintainable
3. Plugin system with dynamic loading — over-engineered for current scale
4. Separate npm packages per parser — too complex for one developer

### Decision
`IParser` interface + `ParserRegistry` (array of parser instances, queried by `canParse()` or slug).

### Reasoning
- Clean separation: each sim's parser is fully isolated
- Adding a new sim = adding a new file + registering it
- No sim-specific logic leaks into services or UI
- Easy to test: each parser has its own unit tests
- `canParse()` allows auto-detection without requiring user to specify the sim

### Consequences
- All parsers must return `NormalizedSession` — the contract
- If LMU changes its format, only `lmu/parser.ts` changes
- Parser versions must be tracked to support re-parsing

---

## ADR-006 — Metrics Cached in Session Columns

**Date:** 2025-06-04
**Status:** Accepted

### Context
Dashboard and history pages need best lap, consistency score, safety score, etc. per session. How to make this fast.

### Options Considered
1. **Pre-compute and cache in Session columns** — fast reads, extra work on write
2. Compute from Lap table on each request — flexible but slow with many laps
3. Database views or materialized views — complex, PostgreSQL-specific
4. Client-side computation — requires fetching all laps

### Decision
Calculate metrics during the import job and store them in dedicated columns on the `Session` model.

### Reasoning
- Dashboard and history need to display these values for many sessions at once — aggregation would require JOINs over thousands of laps
- Writes happen once (import); reads happen constantly
- Column values are updated if session is re-parsed
- Simple to implement, simple to understand

### Consequences
- If the metric formula changes, existing sessions have stale values — need re-calculation job
- Session model has many columns — acceptable for now
- Must ensure metrics are always recalculated when the import pipeline runs

---

## ADR-007 — Sync Import in MVP (No BullMQ)

**Date:** 2025-06-04
**Status:** Accepted

### Context
Import processing can take several seconds. Should we use a job queue (BullMQ + Redis) from day 1?

### Options Considered
1. **Synchronous processing in API route** — simple, no extra dependencies
2. BullMQ + Redis from day 1 — correct long-term but complex setup
3. Vercel background functions — tied to Vercel, limited
4. Separate worker process — too complex for MVP

### Decision
Process imports synchronously in the API route for MVP. Add BullMQ in Phase 2.

### Reasoning
- LMU XML files are small (typically under 1MB) and parse quickly (< 2 seconds)
- Eliminates Redis dependency from MVP setup
- Import service is decoupled from the API route — adding BullMQ later means moving one function call
- Vercel's 30-second timeout is more than sufficient for MVP imports

### Consequences
- If parsing takes > 30 seconds (large files, complex XML), the request will time out
- No retry logic for infrastructure failures (DB down during import)
- Acceptable risk for MVP — real production needs BullMQ

---

## ADR-008 — Local Storage in Dev, S3-Compatible in Production

**Date:** 2025-06-04
**Status:** Accepted

### Context
Where to store raw XML files and future telemetry files.

### Options Considered
1. **Local filesystem (dev) → S3-compatible (prod)**
2. S3 from day 1 — consistent but adds config complexity
3. Store files in PostgreSQL (BYTEA) — simple but DB becomes huge
4. Store only metadata, delete raw files — loses ability to re-parse

### Decision
StorageService abstraction with local and S3 implementations. Local for dev, S3-compatible (Cloudflare R2 or MinIO) for production.

### Reasoning
- Local storage requires zero configuration in development
- StorageService interface means swapping providers requires changing one config value
- Raw files must be kept forever (re-parsing capability)
- Storing in PostgreSQL would bloat the DB and make backups impractical
- Cloudflare R2 has free egress, lower cost than AWS S3

### Consequences
- Local development and production are not identical — possible edge cases in file paths
- Must implement the S3 storage provider before production deployment
- Must configure storage before deploying

---

## ADR-009 — Track and Car Normalization via Alias Tables

**Date:** 2025-06-04
**Status:** Accepted

### Context
Different simulators (and even different versions of the same sim) may use different names for the same track or car. How to handle this.

### Options Considered
1. **Canonical entities + Alias table** — single truth, many names
2. Per-simulator track tables — simple but can't show cross-sim stats
3. Store raw names only, normalize in queries — complex queries, no index
4. User-defined mapping — requires user effort

### Decision
`Track` (canonical entity with slug) + `TrackAlias` (rawName + simulatorId → trackId). Same for Car.

### Reasoning
- Future cross-sim stats (e.g., "your lap at Monza across all sims") become a simple join
- Normalization is automatic — the alias is created on first import of that raw name
- New aliases can be added via admin panel without touching application code
- Users can compare their ACC time at Spa with their LMU time at Spa

### Consequences
- Initial import of an unknown track/car creates a new entity — manual review may be needed
- Admin panel (Phase 6) needs a mapping editor to correct misidentified tracks
- Track slug must be unique globally — naming conflicts must be resolved

---

## ADR-010 — TailwindCSS + shadcn/ui for UI

**Date:** 2025-06-04
**Status:** Accepted

### Context
UI component library selection.

### Options Considered
1. **TailwindCSS + shadcn/ui** — utility CSS + copy-paste components
2. Chakra UI — opinionated, harder to customize
3. MUI — heavy, React 18 issues
4. Radix UI alone — unstyled, more work
5. Custom CSS — maximum flexibility, maximum work

### Decision
TailwindCSS v3 + shadcn/ui.

### Reasoning
- shadcn/ui components are copied into the project — full ownership, easy to customize
- Built on Radix UI primitives — accessible by default
- TailwindCSS gives complete visual control
- Well-suited for data-dense dashboards
- Active community, many examples

### Consequences
- Components are local files — must be updated manually from shadcn releases
- No automatic dependency updates for component internals
- CSS-in-JS patterns don't apply — all styling via className

---

## ADR-011 — Recharts for Data Visualization

**Date:** 2025-06-04
**Status:** Accepted

### Context
Which charting library to use for lap time charts, consistency charts, etc.

### Options Considered
1. **Recharts** — React-native, composable, good ecosystem
2. ECharts — feature-rich but heavy, complex API
3. Victory — good but less maintained
4. Chart.js — canvas-based, less React integration
5. D3 — maximum control, maximum complexity

### Decision
Recharts.

### Reasoning
- Pure React components — works naturally with App Router client components
- Composable API fits well with the design system
- Good documentation and examples
- Sufficient for dashboard charts (line, bar, area)
- Can add ECharts for specific complex charts if needed

### Consequences
- Must wrap Recharts in client components (not Server Components)
- Complex charts (telemetry viewer) may eventually require ECharts or D3

---

## ADR-012 — Prisma 7 Requires Explicit Database Adapter

**Date:** 2026-06-04
**Status:** Accepted

### Context
Prisma 7 introduced breaking changes from Prisma 5/6. The `datasource.url` in `schema.prisma` is no longer supported, and `PrismaClient` now requires an explicit adapter instead of managing the connection internally.

### Options Considered
1. **`@prisma/adapter-pg` + `prisma.config.ts`** — Prisma 7's intended approach
2. Downgrade to Prisma 5 — avoid migration, but miss v7 improvements
3. Use a different ORM (Drizzle) — significant rewrite

### Decision
Adopt Prisma 7 fully: `prisma.config.ts` for CLI config, `@prisma/adapter-pg` for `PrismaClient`.

### Reasoning
- Prisma 7 is the current stable release and we're starting fresh
- The adapter pattern gives more control over connection pooling in the future
- Staying on latest avoids a future mandatory upgrade

### Consequences
- `prisma.config.ts` must load `.env` files manually (via `dotenv`) — Prisma CLI no longer auto-loads them
- Every `PrismaClient` instantiation needs `new PrismaPg({ connectionString })` passed as `adapter`
- `seed.ts` also requires explicit adapter

---

## ADR-013 — Next.js 16 `proxy.ts` Replaces `middleware.ts`

**Date:** 2026-06-04
**Status:** Accepted

### Context
Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`. Additionally, Auth.js imports (`bcryptjs`, `@auth/prisma-adapter`) use Node.js-only modules (`node:util/types`) that cannot run in Edge Runtime — which is what the old middleware used.

### Options Considered
1. **Split auth config + rename to `proxy.ts`** — edge-safe config for proxy, full config for API routes
2. Use Node.js runtime for middleware — not supported in Next.js 16 proxy
3. Switch to JWT only — removes database session management
4. Use Clerk or similar — vendor lock-in

### Decision
- Create `auth.config.ts` with only edge-safe config (no bcrypt, no Prisma)
- Create `auth.ts` with full config (Prisma adapter + bcrypt)
- `proxy.ts` imports from `auth.config.ts` only
- API routes and Server Components import from `auth.ts`

### Reasoning
- Cleanest separation of edge and Node.js code
- Auth.js recommends this exact split pattern
- JWT sessions work well for single-instance MVP

### Consequences
- Two auth config files must stay in sync manually
- Session strategy must be consistent (`jwt` in both configs)
- Future addition of OAuth providers requires updating both files

---

## Template — Future ADR

Use this template for future decisions:

```markdown
## ADR-XXX — Title

**Date:** YYYY-MM-DD
**Status:** Accepted

### Context

### Options Considered
1. Option A
2. Option B

### Decision

### Reasoning

### Consequences
```
