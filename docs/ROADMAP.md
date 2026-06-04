# UrApex — Roadmap

> This is the authoritative development roadmap. Each phase has a clear objective,
> defined deliverables, risks, and a completion criterion.
> Phases are sequential. Do not start Phase N+1 until Phase N is complete.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete |
| 🔄 | In progress |
| 🔲 | Not started |
| ⏸ | Blocked |
| ❌ | Cancelled / out of scope |

---

## Phase 0 — Research & Validation

**Status:** 🔲 Not started
**Estimated duration:** 1 week
**Goal:** Validate that LMU XML files contain the expected data before writing production code.

### Objectives
- Understand the real structure of LMU result XML files
- Define the normalized data model based on what actually exists
- Determine which metrics are calculable from XML alone (vs requiring telemetry)
- Create parser fixtures for testing

### Deliverables
- [ ] Collect 5+ real LMU XML files (practice, qualifying, race)
- [ ] Document every XML field found across all files
- [ ] Create `fixtures/lmu/` with anonymized test files
- [ ] Define `NormalizedSession` TypeScript type based on real data
- [ ] List metrics calculable from XML
- [ ] List metrics that require telemetry
- [ ] Write first parser skeleton with tests
- [ ] Document any unexpected XML variations or quirks

### Risks
- XML may contain fewer fields than expected → reduce metric scope
- XML structure may vary between session types → add variant handling
- Track/car names may be inconsistent → design mapping layer early
- Some fields may only exist in certain LMU versions

### Completion Criterion
> I can parse 5 different LMU XMLs and produce a coherent, type-safe JSON output for each.

---

## Phase 1 — MVP: Core Import & Dashboard

**Status:** 🔲 Not started
**Estimated duration:** 4–6 weeks
**Goal:** A working app where a user registers, uploads XML files, and sees their session data.

### Objectives
- Functional auth (register, login, session)
- File upload with deduplication
- LMU XML parser
- Session storage in PostgreSQL
- Basic dashboard and session views

### Deliverables
- [ ] Next.js project with full stack configured
- [ ] Docker Compose for local dev
- [ ] Prisma schema with MVP entities
- [ ] Auth (email + password)
- [ ] Upload Center: drag & drop, multiple files
- [ ] SHA-256 deduplication before processing
- [ ] Raw file storage (local dev → S3-compatible prod)
- [ ] LMU parser with error handling
- [ ] Import job (sync in MVP, async in Phase 2)
- [ ] Session, Lap, Participant storage
- [ ] Track/Car normalization layer
- [ ] Metrics calculation: best, avg, median, ideal, std dev, consistency, safety
- [ ] Dashboard: 5 stat cards + recent sessions + weekly chart
- [ ] Session history: table with basic filters
- [ ] Session detail: lap table, sector breakdown, charts
- [ ] Track detail page (basic)
- [ ] Car detail page (basic)
- [ ] Import status polling (pending → parsing → imported/failed)
- [ ] Empty states for all pages
- [ ] Loading skeletons

### Out of scope for Phase 1
- BullMQ / Redis queues (use sync processing)
- Achievements
- Goals
- Notes
- Setup manager
- Comparison views
- Community features
- Telemetry

### Risks
- Parser brittle if XML structure varies → make it defensive by design
- Track/car name normalization is more complex than expected → do minimal MVP version
- File storage setup takes too long → start with local filesystem, migrate later

### Completion Criterion
> A user can register, upload an LMU XML, and see their sessions, lap times, and basic metrics on the dashboard.

---

## Phase 2 — Analytics & Progression

**Status:** 🔲 Not started
**Estimated duration:** 3–4 weeks
**Goal:** Turn raw data into useful, actionable analytics.

### Deliverables
- [ ] Full driver scores: Pace, Consistency, Safety (Racecraft, Qualifying in Phase 3)
- [ ] Session comparison view
- [ ] Lap comparison view
- [ ] Track analytics: full breakdown, PB history, car breakdown
- [ ] Car analytics: circuit matrix, consistency trends
- [ ] Goals system: CRUD + auto-progress tracking
- [ ] Achievements system: 10+ achievements + unlock logic
- [ ] Session notes (diary)
- [ ] Auto-generated session insight (rule-based, no AI)
- [ ] PB detection and notifications
- [ ] Weekly/monthly evolution charts
- [ ] BullMQ + Redis for async import jobs

### Completion Criterion
> A user can answer "am I improving?", "which track am I best at?", and "what is my weakest area?" using data from the app.

---

## Phase 3 — Product Polish

**Status:** 🔲 Not started
**Estimated duration:** 2–3 weeks
**Goal:** The app feels like a real product, not a prototype.

### Deliverables
- [ ] Guided onboarding flow (3 steps)
- [ ] Setup manager (CRUD, versions, session linking)
- [ ] Driver profile page (public/private)
- [ ] Privacy controls (session visibility, profile visibility)
- [ ] Training planner (basic: weekly practice plan)
- [ ] Advanced session filters (date range, PB-only, clean-only)
- [ ] Data export (CSV of sessions and laps)
- [ ] Responsive design across all pages
- [ ] Keyboard shortcuts (Cmd+K command palette)
- [ ] Email notifications for achievements and PBs
- [ ] Improved error messages with recovery actions
- [ ] Racecraft Score and Qualifying Score added
- [ ] Post-session ritual modal

### Completion Criterion
> A new user can go from registration to first session imported in under 3 minutes, without needing documentation.

---

## Phase 4 — Telemetry

**Status:** 🔲 Not started
**Estimated duration:** 4–6 weeks
**Goal:** Add deep lap analysis via telemetry files.

### Deliverables
- [ ] Telemetry file upload (format TBD based on LMU)
- [ ] Telemetry file association with sessions
- [ ] Channel extraction: speed, throttle, brake, steering, gear, RPM
- [ ] Telemetry visualizer: chart by lap distance
- [ ] Two-lap comparison with delta overlay
- [ ] GPS/track position mini-map
- [ ] Fuel and tyre data channels (if available)
- [ ] Optimized storage: downsampling for long stints
- [ ] Telemetry-enhanced metrics: braking zones, throttle application
- [ ] Endurance Score and Focus Score added

### Risks
- Telemetry files can be very large (100MB+ per stint)
- Storage costs can escalate quickly
- Format may require proprietary tools to read

### Completion Criterion
> A user can compare two laps using speed, throttle, and brake traces, with a delta chart.

---

## Phase 5 — Desktop Sync Agent

**Status:** 🔲 Not started
**Estimated duration:** 3–4 weeks
**Goal:** Eliminate manual uploads by auto-detecting and syncing sessions.

### Deliverables
- [ ] Tauri desktop app (Windows first)
- [ ] Simulator folder selection
- [ ] File watcher for new XML files
- [ ] Automatic upload on new file detected
- [ ] Duplicate prevention (local hash check before upload)
- [ ] Upload queue with retry logic
- [ ] System tray icon with status
- [ ] Local encrypted token storage
- [ ] Sync history / logs
- [ ] "Sync historical files" option
- [ ] Windows startup on boot option

### Completion Criterion
> A user finishes a session, and within 10 seconds it appears in their UrApex dashboard — without any manual action.

---

## Phase 6 — AI Coach

**Status:** 🔲 Not started
**Estimated duration:** 3–4 weeks
**Goal:** Provide personalized, data-grounded coaching through a chat interface.

### Deliverables
- [ ] Chat interface with conversation history
- [ ] Claude API integration
- [ ] Context builder: assembles user's sessions, scores, goals into prompt context
- [ ] Response types: quick analysis, deep analysis, training plan, comparison
- [ ] Prompt templates for common queries
- [ ] Post-session auto-analysis (triggered on import)
- [ ] AI credit system (X per month on free tier)
- [ ] Usage tracking
- [ ] Feedback on AI responses (thumbs up/down)

### Risks
- Claude API costs can be high with large data contexts
- Generic responses if context is not carefully constructed
- Users may ask questions outside of sim racing scope

### Completion Criterion
> A user can ask "analyze my last race" and receive a response that cites specific lap times, sector data, and actionable recommendations.

---

## Phase 7 — Community

**Status:** 🔲 Not started
**Estimated duration:** 4–6 weeks
**Goal:** Make UrApex a platform, not just a personal tool.

### Deliverables
- [ ] Public driver profiles
- [ ] Public sessions (opt-in)
- [ ] Track leaderboards (by car class, simulator)
- [ ] Teams: create, invite, roles
- [ ] Team dashboard with driver comparison
- [ ] Discord webhook integration
- [ ] Shareable session cards (OG images)
- [ ] "Share PB" feature
- [ ] Community reference times (percentile distribution)
- [ ] Weekly community challenge

### Completion Criterion
> Users can compare their performance against others and share their progress with their team or Discord server.

---

## Phase 8 — Monetization

**Status:** 🔲 Not started
**Estimated duration:** 2–3 weeks
**Goal:** Sustainable product that can cover infrastructure, storage, and AI costs.

### Plans

| Plan | Price | Limits |
|---|---|---|
| Free | €0/mo | 10 imports/mo, 3-month history, basic metrics |
| Pro | €8/mo | Unlimited imports, full history, all scores, setup manager, AI credits |
| Team | €25/mo (5 seats) | Everything in Pro + team dashboard + Discord + shared setups |

### Deliverables
- [ ] Stripe integration
- [ ] Plan selection and upgrade flow
- [ ] Usage tracking per user per plan
- [ ] Import limits enforced
- [ ] AI credit system tied to plan
- [ ] Billing portal (manage subscription, invoices)
- [ ] Graceful degradation when limits are hit
- [ ] Free trial for Pro (14 days)

### Completion Criterion
> A user can sign up for Pro, be charged correctly, and access Pro features. Infrastructure costs are covered at 100 paying users.

---

## Future Phases (Unscheduled)

These are ideas that may become phases after Phase 8, or may be folded into existing phases.

| Idea | Notes |
|---|---|
| Mobile app | React Native or PWA. Session view and quick stats. |
| Self-hosted version | Docker image for privacy-conscious users or teams |
| League management | Multi-round championships, points, standings |
| Live timing integration | Pull data during sessions via UDP or API |
| Simulator-native integrations | In-sim overlays, real-time dashboards |
| AC / ACC / iRacing telemetry | Sim-specific telemetry parsers |
| Coach marketplace | Connect with human coaches via UrApex data |

---

## Roadmap Timeline (Rough Estimates)

```
2025
├── Phase 0 — Research (1 week)
├── Phase 1 — MVP (4-6 weeks)
├── Phase 2 — Analytics (3-4 weeks)
└── Phase 3 — Polish (2-3 weeks)

2026
├── Phase 4 — Telemetry (4-6 weeks)
├── Phase 5 — Sync Agent (3-4 weeks)
├── Phase 6 — AI Coach (3-4 weeks)
├── Phase 7 — Community (4-6 weeks)
└── Phase 8 — Monetization (2-3 weeks)
```

> Note: These are estimates for a single developer working part-time. Adjust based on actual velocity.
