# UrApex — MVP Scope

> This document defines exactly what is and is not included in the MVP (Phase 1).
> The MVP scope is intentionally small. When in doubt, leave it out.

---

## MVP Goal

**One sentence:** A user can register, upload LMU XML session files, and see their lap times, session history, and basic performance metrics on a clean dashboard.

**Success criteria:**
1. Registration and login work
2. An LMU XML file can be uploaded and imported in under 10 seconds
3. Duplicate files are detected and rejected
4. The raw file is stored and retrievable
5. Session data (laps, sectors, participants) is saved correctly
6. Dashboard shows accurate stats
7. Session history shows all sessions with filters
8. Session detail shows lap table, sector breakdown, and charts
9. Track and car pages show basic stats

---

## In Scope (MVP — Phase 1)

### Auth
- [x] Email + password registration
- [x] Email + password login
- [x] Protected routes
- [x] Basic profile creation (name, simulator selection)

### Import
- [x] Drag & drop XML upload
- [x] Multiple file upload
- [x] File type and size validation (XML, max 50MB)
- [x] SHA-256 deduplication (before processing)
- [x] Raw file storage (local in dev)
- [x] Import status tracking (pending → parsing → imported / failed)
- [x] Error message on failed import
- [x] Retry failed import
- [x] Import history list in Upload Center

### Parser — LMU Only
- [x] LMU XML parser
- [x] Parser registry (extensible for future sims)
- [x] Defensive parsing (non-crashing on missing fields)
- [x] Parse warnings (logged, not fatal)
- [x] Parser version stored on import
- [x] Unit tests with fixtures

### Data Model
- [x] Session saved with all available metadata
- [x] Laps saved (time, validity, sectors)
- [x] Participants saved (other drivers in session)
- [x] Incidents saved
- [x] Penalties saved
- [x] Pit stops saved

### Normalization
- [x] Track normalization (rawName → Track entity + alias)
- [x] Car normalization (rawName → Car entity + alias)
- [x] Car class normalization

### Metrics (calculated on import, cached in DB)
- [x] Best lap time
- [x] Average lap time
- [x] Median lap time
- [x] Ideal lap (best sector sum)
- [x] Standard deviation of lap times
- [x] Clean lap ratio
- [x] Consistency Score (0–100)
- [x] Safety Score (0–100)
- [x] PB detection (per track/car combo)

### Pages
- [x] Dashboard: 5 stat cards + recent sessions + weekly activity chart
- [x] Upload Center: drag & drop + import queue with status
- [x] Session History: table + filters (type, track, car)
- [x] Session Detail: metadata + lap table + sector breakdown + lap time chart
- [x] Track Detail: sessions at track + PBs + cars used
- [x] Car Detail: sessions with car + PBs + tracks
- [x] Empty states for all pages (with CTA)
- [x] Loading skeletons

### UI / UX
- [x] App layout with sidebar navigation
- [x] Responsive design (desktop focus, mobile functional)
- [x] Error boundaries
- [x] 404 page

---

## Explicitly Out of Scope (MVP)

These items must not be added to Phase 1, no matter how tempting. They belong to later phases.

### Features
- ❌ Achievements system (Phase 2)
- ❌ Goals / personal objectives (Phase 2)
- ❌ Session notes / diary (Phase 2)
- ❌ Session comparison (Phase 2)
- ❌ Driver scores beyond Consistency + Safety (Phase 2+)
- ❌ Onboarding flow (Phase 3)
- ❌ Setup manager (Phase 3)
- ❌ Training planner (Phase 3)
- ❌ Public profiles / privacy controls (Phase 3)
- ❌ Data export (Phase 3)
- ❌ Telemetry (Phase 4)
- ❌ Desktop Sync Agent (Phase 5)
- ❌ AI coach (Phase 6)
- ❌ Community features, teams, rankings (Phase 7)
- ❌ Billing / subscription plans (Phase 8)
- ❌ Discord webhooks (Phase 7)
- ❌ Mobile app
- ❌ Self-hosted version

### Simulators
- ❌ ACC parser (Phase 7)
- ❌ iRacing parser (Phase 7)
- ❌ rFactor 2 parser (Phase 7)
- ❌ Any other sim

### Infrastructure
- ❌ BullMQ / Redis queues (inline sync processing in MVP)
- ❌ S3 storage (local filesystem in MVP)
- ❌ Email notifications
- ❌ Admin panel

---

## Deferred But Designed For

These are out of MVP scope, but the architecture must not prevent them:

| Future feature | Design consideration |
|---|---|
| Multi-sim support | Parser registry pattern, no LMU-specific hardcoding in services |
| Telemetry | TelemetryFile + TelemetryChannel tables exist in schema, even if empty |
| Async jobs | Import service is decoupled from API route (easy to add BullMQ later) |
| S3 storage | StorageService abstraction — swap local for S3 by changing one config |
| Community | Session has `isPublic` field from day 1 |
| AI coach | CoachConversation + CoachMessage tables exist in schema |
| Billing | User model has no plan field yet, but DriverProfile is easily extendable |

---

## MVP Definition of Done

The MVP is complete when:

1. **Functional**: All in-scope features work end-to-end
2. **Correct**: Imported sessions have accurate metrics (validated manually with known data)
3. **Stable**: No crashes during normal upload/import flow
4. **Tested**: Parser has unit tests covering practice, qualifying, and race XMLs
5. **Documented**: README has working setup instructions
6. **Deployable**: App can be deployed to Vercel + Neon (or Railway) without manual steps

---

## MVP Non-functional Requirements

| Requirement | Target |
|---|---|
| Dashboard load time | < 1s (after hydration) |
| Import end-to-end time | < 10s for a typical XML |
| Max supported file size | 50MB |
| Session history page load | < 2s with 100 sessions |
| API route auth check | < 50ms |
| Database | PostgreSQL on Neon or Railway |
| Hosting | Vercel |

---

## Known Limitations of MVP

These are acceptable limitations, not bugs:

1. **Sync import**: Import happens synchronously in the API route. If parsing takes >10s the request will time out. This will be fixed in Phase 2 with BullMQ.
2. **Local storage only**: Files are stored on the server filesystem. This works for development and single-instance deployment but not for multi-instance hosting.
3. **LMU only**: No other simulators. The architecture is ready but the parsers are not written.
4. **No normalization editor**: If a track or car name is wrong, it must be fixed in the database directly.
5. **No telemetry**: Metrics are calculated from result files only. No lap-level speed or brake data.
6. **No notifications**: No emails sent on import completion.
