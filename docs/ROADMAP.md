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

**Status:** ✅ Complete
**Goal:** Turn raw data into useful, actionable analytics.

### Completed
- [x] All 4 driver scores: Pace, Consistency, Safety, Improvement
- [x] Racecraft Score (RACE only) + Qualifying Score (QUALIFYING only)
- [x] Session comparison view (metrics diff, lap overlay, sector delta)
- [x] Track analytics: PB evolution, improvement badge, session types, consistency trend
- [x] Car analytics: same structure + best-by-circuit
- [x] Goals: CRUD + 8 auto-trackable goal types + track/car scoping + deadline + history
- [x] Achievements: 10 achievements + unlock logic + rarity cards + progress bars
- [x] Session notes: diary with tags, video URL
- [x] Auto-generated insights (8 rule-based types per session)
- [x] Weekly activity + consistency trend charts
- [x] BullMQ + Redis async import pipeline (worker via `instrumentation.ts`, Vercel Cron fallback)

### Completion Criterion met
> ✅ A user can answer "am I improving?", "which track am I best at?", and "what is my weakest area?"

---

## Phase 3 — Product Polish

**Status:** ✅ Complete
**Goal:** The app feels like a real product, not a prototype.

### Completed
- [x] Guided onboarding flow (3-step wizard)
- [x] Setup manager (CRUD: create, edit, delete, favorite, archive, version history, session linking)
- [x] Driver profile page with stats, scores, top circuits/cars, achievements bar
- [x] Advanced session filters (date range, PB-only, track/car dropdowns, sort)
- [x] Data export (CSV — sessions and laps via `/api/export/`)
- [x] Racecraft Score + Qualifying Score
- [x] Replay upload (.vcr) per session + storage manager
- [x] S3-compatible storage (Cloudflare R2) for production
- [x] Async import pipeline (BullMQ + Redis + Vercel Cron fallback)
- [x] GitHub Actions CI (type-check → lint → test → migrate)
- [x] Vercel production setup (Neon + Upstash + R2)
- [x] Privacy controls (session visibility, profile visibility)
- [x] Responsive design audit
- [x] Cmd+K command palette
- [x] Post-session ritual modal
- [x] Password reset flow

### Completion Criterion met
> ✅ A new user can go from registration to first session imported in under 3 minutes, without needing documentation.

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

**Status:** 🔄 In progress (overlay + telemetry complete; pending: Windows test on real hardware)
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
- [x] GitHub Actions CI build (`.exe` + `.msi` artifacts on every push to `main`)
- [x] Real app icon (1254×1254 UA logo)
- [x] In-game overlay window (transparent always-on-top, draggable)
- [x] Native SHM telemetry — rF2 Shared Memory API (`windows` crate); replaces UDP
- [x] Overlay: speed/gear/position, RPM bar, throttle/brake trace, steering, lap time/sectors, tyres, fuel/gaps/engine
- [x] Telemetry recorder (10 Hz, SQLite `telemetry_recordings` + `telemetry_samples`)
- [x] Overlay panel configuration (7 toggles + opacity slider, persisted + live-emitted)
- [x] Overlay settings panel in web app Settings page
- [x] Dashboard: active goals widget + recent achievements widget
- [x] Session Detail: best S1/S2/S3 sector mini-stats
- [x] Global keybindings (F1–F7 for panels, Alt+Shift+O for toggle; configurable in Settings)
- [x] Overlay focus-steal fix + WebView2 GPU compositing fix
- [x] Panel toggle via `w.eval()` — bypasses Tauri cross-window event delivery issues
- [x] `push_overlay_config` via eval — config correctly reaches overlay from main window
- [x] Overlay-ready event + locate button — diagnostics confirm React mount + centre-screen
- [x] Game detection indicator — ShmStatus events, contextual help, diagnostic log
- [x] Session filter bar in companion — type chips + AI/MP chips
- [x] AI vs Multiplayer badge on all session lists
- [ ] Test on real Windows machine with LMU running (verify SHM offsets + overlay)
- [ ] Associate telemetry recording with session in web app
- [ ] Upload telemetry recording to web app

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
├── Phase 0 — Research         ✅ Complete
├── Phase 1 — MVP              ✅ Complete
└── Phase 2 — Analytics        ✅ Complete

2026
├── Phase 3 — Polish           ✅ Complete
├── Phase 5 — Sync Agent       🔄 In progress (overlay + keybindings done; pending: Windows test)
├── Phase 4 — Telemetry        🔲 ~4-6 weeks
├── Phase 6 — AI Coach         🔲 ~3-4 weeks
├── Phase 7 — Community        🔲 ~4-6 weeks
└── Phase 8 — Monetization     🔲 ~2-3 weeks
```

> Note: These are estimates for a single developer working part-time. Adjust based on actual velocity.
