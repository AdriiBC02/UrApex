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
| A-007 | Password reset flow | P1 | ✅ | Resend email; PasswordResetToken model; /forgot-password + /reset-password pages |

### Storage

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| S-001 | StorageService abstraction (local / S3) | P0 | ✅ | |
| S-002 | Local storage implementation | P0 | ✅ | `./storage/raw/{userId}/{hash}.xml` |
| S-003 | SHA-256 hash utility | P0 | ✅ | `lib/hash.ts` |
| S-004 | S3-compatible storage implementation | P2 | ✅ | @aws-sdk/client-s3, R2-compatible (forcePathStyle + endpoint) |

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
| AN-001 | Pace Score calculation | P1 | ✅ | paceScore = idealLap/bestLap*100; stored per session + profile rolling avg |
| AN-002 | Improvement Score calculation | P1 | ✅ | Per track+car combo improvement; schema migration; 4th ring in dashboard |
| AN-003 | Full track analytics page | P1 | ✅ | PB evolution, improvement badge, session types, consistency trend, glass cards |
| AN-004 | Full car analytics page | P1 | ✅ | Same as AN-003 + best-by-circuit + circuits count stat |
| AN-005 | Session comparison view | P1 | ✅ | /sessions/compare with slot UI, metrics diff, lap overlay chart, delta table |
| AN-006 | Lap comparison (sector delta) | P1 | ✅ | Sector delta table in compare page + ideal lap row |
| AN-007 | Goals page (list + progress + actions) | P1 | ✅ | List, create form, PATCH/DELETE API, GoalActions dropdown |
| AN-008 | Goal auto-progress on import | P1 | ✅ | goals.service.ts; all 8 types + auto-complete + track/car scoping |
| AN-009 | Achievement definitions (config) | P1 | ✅ | 10 achievements in seed.ts |
| AN-010 | Achievement unlock on import | P1 | ✅ | achievements.service.ts; 7/8 condition types; parallel with goal progress |
| AN-011 | Achievement page | P1 | ✅ | Rarity cards, progress bars, unlocked/in-progress/locked sections |
| AN-012 | Session notes | P1 | ✅ | Notes + tags + video URL; GET/POST/DELETE API; SessionNotes client component |
| AN-013 | Auto insight generation (rule-based) | P1 | ✅ | 8 rule types; insights.service.ts + session detail section |
| AN-014 | Weekly evolution charts | P1 | ✅ | ActivityChart (12-week bar) + consistency TrendChart on dashboard |
| AN-015 | BullMQ + Redis for async jobs | P1 | ✅ | Queue + worker via instrumentation.ts; UploadZone polls status |
| AN-016 | Metric recalculation job | P1 | ✅ | RecalculateQueue+Worker; POST /api/import/recalculate; button in ImportHistory |

---

## Phase 3 — Polish

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| PO-001 | Onboarding flow (3 steps) | P1 | ✅ | 3-step wizard: welcome, upload+driver selection, done screen | |
| PO-002 | Setup manager | P1 | ✅ | List + CRUD API + create form + detail page + version history + sessions linked |
| PO-003 | Driver profile page | P1 | ✅ | /profile — stats, scores, top circuits/cars, achievements bar, recent sessions |
| PO-004 | Privacy controls | P1 | ✅ | Profile isPublic toggle in Settings; session toggle in detail header; PATCH /api/sessions/[id] |
| PO-005 | Advanced session filters | P2 | ✅ | type chips, PB-only, track/car dropdowns, date range, sort — all via URL searchParams |
| PO-006 | Data export (CSV) | P2 | ✅ | GET /api/export/sessions + /api/export/laps; download links in Settings |
| PO-007 | Responsive design audit | P1 | ✅ | AppShell client wrapper; mobile sidebar drawer; hamburger header; table overflow-x-auto |
| PO-008 | Cmd+K command palette | P2 | ✅ | cmdk; navigation + actions + recent sessions; sidebar search button |
| PO-009 | Post-session ritual modal | P2 | ✅ | Fires on import; feeling picker + quick tags + note; saves SessionNote |
| PO-010 | Racecraft Score | P2 | ✅ | position(50%)+safety(30%)+consistency(20%) on RACE sessions; ring on dashboard |
| PO-011 | Qualifying Score | P2 | ✅ | grid-position(70%)+consistency(30%) on QUALIFYING sessions; ring on dashboard |

---

## Phase 5 — Desktop Sync Agent

| ID | Task | Priority | Status | Notes |
|---|---|---|---|---|
| CA-001 | Tauri v2 project scaffold | P1 | ✅ | `/companion/` — Rust + React |
| CA-002 | API key auth on `/api/upload` | P1 | ✅ | Bearer token; `resolveUserId()` helper |
| CA-003 | API key generation in Settings UI | P1 | ✅ | `ApiKeyForm`, `GET/POST/DELETE /api/auth/api-key` |
| CA-004 | File watcher (Rust notify crate) | P1 | ✅ | Watches folder for new `.xml`, 500ms debounce |
| CA-005 | HTTP upload from companion | P1 | ✅ | `reqwest` multipart, bearer token |
| CA-006 | System tray + minimize-to-tray | P1 | ✅ | Shows/hides on tray icon click |
| CA-007 | Windows notifications | P1 | ✅ | `tauri-plugin-notification` on upload result |
| CA-008 | GitHub Actions companion build CI | P1 | ✅ | Node 24 compat, schema URL fix, npx cli binary, artifact listing |
| CA-016 | Compile and test on Windows | P0 | 🔲 | CI build automated; needs real Windows test with LMU (standalone + optional sync) |
| CA-009 | Local hash dedup before upload | P1 | ✅ | SHA-256 cache in %LOCALAPPDATA%/UrApex/uploaded_hashes.txt (dirs-next crate) |
| CA-010 | Upload queue with retry | P1 | ✅ | 3 attempts, linear backoff 2/4/6s, 60s reqwest timeout |
| CA-011 | Persistent sync history | P2 | ✅ | plugin-store key syncLogs; max 100 entries; clear button |
| CA-012 | Sync historical files ("import all") | P2 | ✅ | Rust command scans folder + uploads with hash dedup; button in sync tab |
| CA-013 | Windows startup on boot | P2 | ✅ | tauri-plugin-autostart; toggle in Settings |
| CA-014 | In-game overlay window | P2 | 🔲 | Transparent always-on-top Tauri window |
| CA-015 | UDP telemetry listener (LMU port 4444) | P2 | 🔲 | Feed data to overlay in real time |

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
