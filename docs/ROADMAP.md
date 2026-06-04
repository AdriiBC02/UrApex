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

**Status:** ✅ Complete
**Goal:** Validate that LMU XML files contain the expected data before writing production code.

### Completed
- [x] Collected 8 real LMU XML files (practice, qualifying, race — Fuji + Sebring)
- [x] Documented XML structure: `<rFactorXML><RaceResults>` root, session type from child element name, lap times as float seconds in `#text`, sectors as attributes
- [x] Created `fixtures/lmu/race_minimal.xml` test fixture
- [x] Defined `NormalizedSession` TypeScript type
- [x] Parser tests: 15 unit tests passing
- [x] **Key finding:** all drivers have `isPlayer=1` in multiplayer → requires `simDriverName` for player identification

---

## Phase 1 — MVP: Core Import & Dashboard

**Status:** ✅ Complete
**Goal:** A working app where a user registers, uploads XML files, and sees their session data.

### Completed
- [x] Next.js 16 + Prisma 7 + Auth.js v5 + Tailwind v4 + shadcn/ui
- [x] Auth: register, login, session (JWT)
- [x] Upload Center: drag & drop, multi-file, status feedback, import history
- [x] SHA-256 deduplication
- [x] Local file storage
- [x] LMU XML parser (v0.2.0) with driver name identification
- [x] Import job (sync), retry, delete
- [x] Session, Lap, Participant, Incident, Penalty, PitStop storage
- [x] Track/Car normalization with alias tables
- [x] All metrics: best, avg, median, ideal, std dev, consistency, safety, pace, improvement
- [x] Dashboard: 5 stats + 4-score rings + recent sessions + activity chart + goals widget
- [x] Session history with type filters
- [x] Session detail: laps, sectors, participants, incidents, insights
- [x] Track + Car detail pages with analytics
- [x] Empty states + loading skeletons throughout

### Completion Criterion met
> ✅ A user can register, upload LMU XMLs, and see sessions with correct track/car/laps on the dashboard.

---

## Phase 2 — Analytics & Progression

**Status:** ✅ Complete (BullMQ pending)
**Goal:** Turn raw data into useful, actionable analytics.

### Completed
- [x] All 4 driver scores: Pace, Consistency, Safety, Improvement
- [x] Session comparison view (metrics diff, lap overlay, sector delta)
- [x] Track analytics: PB evolution, improvement badge, session types, consistency trend
- [x] Car analytics: same structure + best-by-circuit
- [x] Goals: CRUD + 8 auto-trackable goal types + track/car scoping + deadline + history
- [x] Achievements: 10 achievements + unlock logic + rarity cards + progress bars
- [x] Session notes: diary with tags, video URL
- [x] Auto-generated insights (8 rule-based types per session)
- [x] Weekly activity + consistency trend charts

### Pending
- [ ] BullMQ + Redis for async jobs (AN-015)

### Completion Criterion met
> ✅ A user can answer "am I improving?", "which track am I best at?", and "what is my weakest area?"

---

## Phase 3 — Product Polish

**Status:** 🔄 In progress
**Estimated duration:** 2–3 weeks
**Goal:** The app feels like a real product, not a prototype.

### Deliverables
- [ ] Guided onboarding flow (3 steps)
- [x] Setup manager (CRUD: create, edit, delete, favorite, archive)
- [ ] Setup versioning + session linking
- [ ] Driver profile page (public/private)
- [ ] Privacy controls (session visibility, profile visibility)
- [ ] Advanced session filters (date range, PB-only, clean-only)
- [ ] Data export (CSV of sessions and laps)
- [ ] Responsive design across all pages
- [ ] Keyboard shortcuts (Cmd+K command palette)
- [ ] Email notifications for achievements and PBs
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

**Status:** 🔄 In progress (scaffold complete, needs build + test on Windows)
**Estimated duration:** 3–4 weeks
**Goal:** Eliminate manual uploads by auto-detecting and syncing sessions.

### Deliverables
- [x] Tauri v2 project scaffold (`/companion/`)
- [x] API key auth on `/api/upload` (Bearer token)
- [x] API key generation in Settings
- [x] Settings UI (folder, URL, API key)
- [x] File watcher for new XML files (Rust `notify` crate)
- [x] Automatic upload on new file detected (`reqwest` multipart)
- [x] System tray icon with show/hide
- [x] Minimize to tray on close
- [x] Windows notifications on upload result
- [x] Sync log in UI (uploading / success / duplicate / error per file)
- [ ] Compile and test on Windows (requires `rustup` install)
- [ ] Duplicate prevention via local hash check (avoid redundant upload)
- [ ] Upload queue with retry logic
- [ ] Persistent sync history across restarts
- [ ] "Sync historical files" option
- [ ] Windows startup on boot option
- [ ] In-game overlay window (transparent always-on-top)
- [ ] UDP telemetry listener (LMU port 4444) for overlay data

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
