# UrApex — Development Backlog

> Prioritized list of development tasks.
> Each item is an actionable unit of work assigned to a phase and priority.
> Update status as work progresses.

---

## Status Legend

| Symbol | Status |
|---|---|
| 🔲 | To do |
| 🔄 | In progress |
| ✅ | Done |
| ⏸ | Blocked |
| ❌ | Cancelled |

---

## Phase 0 — Research

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| R-001 | Collect 5+ LMU XML result files (practice, qualifying, race) | P0 | 🔲 | Need real files before any parser work |
| R-002 | Document all XML fields found across file types | P0 | 🔲 | Create `docs/technical/lmu-xml-structure.md` |
| R-003 | Create anonymized test fixtures in `fixtures/lmu/` | P0 | 🔲 | Remove driver names, server names |
| R-004 | Define `NormalizedSession` TypeScript type | P0 | 🔲 | Based on real data only |
| R-005 | List all metrics calculable from XML alone | P0 | 🔲 | Document in `docs/technical/import-pipeline.md` |
| R-006 | List metrics requiring telemetry | P0 | 🔲 | Set correct phase expectations |
| R-007 | Write LMU parser skeleton with basic tests | P0 | 🔲 | Validate the approach |

---

## Phase 1 — MVP

### Infrastructure

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| I-001 | Create Next.js 16 project with TypeScript strict | P0 | ✅ | Next.js 16 + Turbopack |
| I-002 | Configure TailwindCSS v4 + shadcn/ui | P0 | ✅ | |
| I-003 | Set up Docker Compose (PostgreSQL + Redis) | P0 | ✅ | |
| I-004 | Configure Prisma 7 with PostgreSQL | P0 | ✅ | Required adapter pattern + prisma.config.ts |
| I-005 | Write MVP Prisma schema (21 models) | P0 | ✅ | |
| I-006 | Run first migration + seed | P0 | ✅ | 7 sims, 10 achievements seeded |
| I-007 | Create seed script | P1 | ✅ | |
| I-008 | Configure environment variables + `.env.example` | P0 | ✅ | |
| I-009 | Set up Vitest for unit tests | P1 | ✅ | |
| I-010 | Set up Playwright for E2E tests | P2 | 🔲 | Delay to Phase 3 |
| I-011 | Create folder structure | P0 | ✅ | As defined in ARCHITECTURE.md |

### Auth

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| A-001 | Configure Auth.js v5 with Credentials provider | P0 | ✅ | JWT strategy, edge-safe split config |
| A-002 | Register page + API route | P0 | ✅ | bcrypt cost 12, creates User + DriverProfile |
| A-003 | Login page | P0 | ✅ | |
| A-004 | Auth proxy (protect app routes) — Next.js 16 | P0 | ✅ | `proxy.ts` replaces `middleware.ts` |
| A-005 | Create DriverProfile on register | P0 | ✅ | Created in same transaction as User |
| A-006 | Logout action | P0 | ✅ | In sidebar via signOut() |
| A-007 | Password reset flow | P1 | 🔲 | Delay to Phase 2 |

### Storage

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| S-001 | StorageService abstraction (local / S3) | P0 | ✅ | |
| S-002 | Local storage implementation | P0 | ✅ | `./storage/raw/{userId}/{hash}.xml` |
| S-003 | SHA-256 hash utility | P0 | ✅ | `lib/hash.ts` |
| S-004 | S3-compatible storage implementation | P2 | 🔲 | Delay to Phase 2 |

### Import Pipeline

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| P-001 | Upload API route (`POST /api/upload`) | P0 | ✅ | |
| P-002 | File type + size validation | P0 | ✅ | |
| P-003 | Hash calculation + duplicate check | P0 | ✅ | |
| P-004 | ImportFile record creation | P0 | ✅ | |
| P-005 | LMU parser implementation | P0 | ✅ | Skeleton — adjustable with real XMLs |
| P-006 | Parser registry | P0 | ✅ | |
| P-007 | Track normalizer | P0 | ✅ | |
| P-008 | Car normalizer | P0 | ✅ | |
| P-009 | Import job (sync MVP) | P0 | ✅ | |
| P-010 | Metrics calculation on import | P0 | ✅ | |
| P-011 | Import status check endpoint | P1 | ✅ | GET/POST/DELETE /api/import/[id] |
| P-012 | Parser tests with fixtures | P0 | ✅ | 15 tests passing |

### Pages — MVP

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| PG-001 | App layout with sidebar | P0 | ✅ | Dark theme, responsive sidebar |
| PG-002 | Dashboard page | P0 | ✅ | Stats cards + recent sessions + empty state |
| PG-003 | Upload Center page | P0 | ✅ | Drag & drop + history |
| PG-004 | Session history page | P0 | ✅ | Table + type filters + pagination |
| PG-005 | Session detail page | P0 | ✅ | Metrics, laps, sectors, participants, chart |
| PG-006 | Track detail page (basic) | P1 | ✅ | PB evolution chart + best by car + sessions |
| PG-007 | Car detail page (basic) | P1 | ✅ | Best by circuit + sessions |
| PG-008 | Empty states for all pages | P1 | ✅ | `EmptyState` component done |
| PG-009 | Loading skeletons | P1 | ✅ | StatCard, SessionRow, Dashboard, Table |
| PG-010 | 404 page | P1 | ✅ | Branded not-found.tsx |
| PG-011 | Error boundaries | P1 | ✅ | app/(app)/error.tsx |

---

## Phase 2 — Analytics

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| AN-001 | Pace Score calculation | P1 | 🔲 | Requires historical PBs |
| AN-002 | Improvement Score calculation | P1 | 🔲 | |
| AN-003 | Full track analytics page | P1 | ✅ | PB evolution, improvement badge, session types, consistency trend, glass cards |
| AN-004 | Full car analytics page | P1 | ✅ | Same as AN-003 + best-by-circuit + circuits count stat |
| AN-005 | Session comparison view | P1 | 🔲 | Pick 2 sessions, compare |
| AN-006 | Lap comparison (sector delta) | P1 | 🔲 | |
| AN-007 | Goals page (list + progress + actions) | P1 | ✅ | List, create form, PATCH/DELETE API, GoalActions dropdown |
| AN-008 | Goal auto-progress on import | P1 | ✅ | goals.service.ts; all 8 types + auto-complete + track/car scoping |
| AN-009 | Achievement definitions (config) | P1 | ✅ | 10 achievements in seed.ts |
| AN-010 | Achievement unlock on import | P1 | ✅ | achievements.service.ts; 7/8 condition types; parallel with goal progress |
| AN-011 | Achievement page | P1 | 🔲 | |
| AN-012 | Session notes | P1 | ✅ | Notes + tags + video URL; GET/POST/DELETE API; SessionNotes client component |
| AN-013 | Auto insight generation (rule-based) | P1 | 🔲 | Post-import |
| AN-014 | Weekly evolution charts | P1 | 🔲 | |
| AN-015 | BullMQ + Redis for async jobs | P1 | 🔲 | Replace sync processing |
| AN-016 | Metric recalculation job | P1 | 🔲 | For parser updates |

---

## Phase 3 — Polish

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| PO-001 | Onboarding flow (3 steps) | P1 | 🔲 | |
| PO-002 | Setup manager | P1 | 🔲 | |
| PO-003 | Driver profile page | P1 | 🔲 | |
| PO-004 | Privacy controls | P1 | 🔲 | |
| PO-005 | Advanced session filters | P2 | 🔲 | |
| PO-006 | Data export (CSV) | P2 | 🔲 | GDPR requirement |
| PO-007 | Responsive design audit | P1 | 🔲 | |
| PO-008 | Cmd+K command palette | P2 | 🔲 | |
| PO-009 | Post-session ritual modal | P2 | 🔲 | |
| PO-010 | Racecraft Score | P2 | 🔲 | |
| PO-011 | Qualifying Score | P2 | 🔲 | |

---

## Unplanned / Ideas

> Items here are not committed to any phase. See IDEAS.md for full list.

| ID | Idea | Source |
|---|---|---|
| U-001 | Heatmap calendar (GitHub-style) | Internal idea |
| U-002 | Driver DNA radar chart | Internal idea |
| U-003 | Streak tracking | Internal idea |
| U-004 | Progress certificates (shareable image) | Internal idea |
| U-005 | Voice notes via Whisper API | Internal idea |
| U-006 | "Weak spot detector" without telemetry | Internal idea |
