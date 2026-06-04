# UrApex — Feature Catalog

> Complete list of all planned features organized by module.
> Each feature has a phase, priority, and current status.

---

## Status Legend

| Symbol | Status |
|---|---|
| ✅ | Done |
| 🔄 | In progress |
| 🔲 | Planned |
| 💡 | Idea — not yet committed |
| ❌ | Removed from scope |

## Priority Legend

| Label | Meaning |
|---|---|
| P0 | Must-have — MVP blocker |
| P1 | Should-have — Phase 1/2 |
| P2 | Nice-to-have — Phase 3+ |
| P3 | Future — no timeline |

---

## Module 1 — Authentication & Account

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Email + password registration | P0 | 1 | 🔲 |
| Email + password login | P0 | 1 | 🔲 |
| Session management | P0 | 1 | 🔲 |
| Password reset via email | P1 | 1 | 🔲 |
| OAuth login (Google) | P2 | 3 | 🔲 |
| Account deletion (GDPR) | P1 | 3 | 🔲 |
| Data export (GDPR) | P1 | 3 | 🔲 |
| Email verification | P1 | 1 | 🔲 |

---

## Module 2 — Driver Profile

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Profile creation on register | P0 | 1 | 🔲 |
| Display name | P1 | 1 | 🔲 |
| Country (optional) | P2 | 2 | 🔲 |
| Short bio | P2 | 3 | 🔲 |
| Avatar upload | P2 | 3 | 🔲 |
| Simulators used selection | P1 | 1 | 🔲 |
| Public profile toggle | P1 | 3 | 🔲 |
| Global stats summary (cached) | P1 | 2 | 🔲 |
| Driver DNA radar chart | P2 | 2 | 🔲 |
| Streak tracking (sessions/week) | P2 | 2 | 🔲 |
| Driver specialties inference | P3 | 4+ | 💡 |

---

## Module 3 — File Import

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Drag & drop upload | P0 | 1 | 🔲 |
| Multi-file upload | P0 | 1 | 🔲 |
| File type validation | P0 | 1 | 🔲 |
| File size limit (50MB) | P0 | 1 | 🔲 |
| SHA-256 deduplication | P0 | 1 | 🔲 |
| Raw file storage | P0 | 1 | 🔲 |
| Import status tracking (pending/parsing/imported/failed) | P0 | 1 | 🔲 |
| Error message on failed import | P0 | 1 | 🔲 |
| Retry failed import | P1 | 1 | 🔲 |
| Delete import + session | P1 | 2 | 🔲 |
| Re-parse with updated parser | P1 | 2 | 🔲 |
| Import history list | P1 | 1 | 🔲 |
| Parser version tracking | P1 | 1 | 🔲 |
| Auto-detect simulator from file | P1 | 2 | 🔲 |
| Upload progress indicator | P1 | 1 | 🔲 |

---

## Module 4 — Parser System

| Feature | Priority | Phase | Status |
|---|---|---|---|
| IParser interface | P0 | 0 | 🔲 |
| NormalizedSession type | P0 | 0 | 🔲 |
| LMU XML parser | P0 | 1 | 🔲 |
| Parser registry (slug → parser) | P0 | 1 | 🔲 |
| Parser auto-detection from content | P1 | 1 | 🔲 |
| Parser versioning | P1 | 1 | 🔲 |
| Parser warnings (non-fatal) | P1 | 1 | 🔲 |
| Test fixtures for LMU | P0 | 0 | 🔲 |
| Parser unit tests | P0 | 0 | 🔲 |
| ACC parser | P3 | 7+ | 🔲 |
| iRacing parser | P3 | 7+ | 🔲 |
| rFactor 2 parser | P3 | 7+ | 🔲 |

---

## Module 5 — Track & Car Normalization

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Track normalization (rawName → slug) | P0 | 1 | 🔲 |
| Track alias table (per sim) | P0 | 1 | 🔲 |
| Car normalization (rawName → slug) | P0 | 1 | 🔲 |
| Car alias table (per sim) | P0 | 1 | 🔲 |
| Car class normalization | P1 | 1 | 🔲 |
| Track layout variants | P1 | 1 | 🔲 |
| Admin panel to manage mappings | P2 | 6+ | 🔲 |

---

## Module 6 — Sessions

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Session list (history) | P0 | 1 | 🔲 |
| Session detail page | P0 | 1 | 🔲 |
| Lap table per session | P0 | 1 | 🔲 |
| Sector breakdown per session | P1 | 1 | 🔲 |
| Participant list (other drivers) | P1 | 1 | 🔲 |
| Incident list | P1 | 1 | 🔲 |
| Penalty list | P1 | 1 | 🔲 |
| Pit stop list | P1 | 1 | 🔲 |
| Session soft delete | P1 | 2 | 🔲 |
| Session privacy toggle | P1 | 3 | 🔲 |
| Session filters (type, track, car, date) | P1 | 1 | 🔲 |
| Session sorting | P1 | 1 | 🔲 |
| Session search | P2 | 3 | 🔲 |
| Session export (CSV) | P2 | 3 | 🔲 |
| Share session (public link) | P2 | 7 | 🔲 |

---

## Module 7 — Metrics

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Best lap time | P0 | 1 | 🔲 |
| Average lap time | P0 | 1 | 🔲 |
| Median lap time | P1 | 1 | 🔲 |
| Ideal lap (best sector sum) | P1 | 1 | 🔲 |
| Standard deviation | P1 | 1 | 🔲 |
| Clean lap ratio | P1 | 1 | 🔲 |
| Drop-off (pace degradation) | P1 | 2 | 🔲 |
| PB detection per track/car | P0 | 1 | 🔲 |
| Consistency Score (0–100) | P0 | 1 | 🔲 |
| Safety Score (0–100) | P0 | 1 | 🔲 |
| Pace Score (0–100) | P1 | 2 | 🔲 |
| Racecraft Score | P2 | 3 | 🔲 |
| Qualifying Score | P2 | 3 | 🔲 |
| Endurance Score | P2 | 4 | 🔲 |
| Improvement Score | P2 | 2 | 🔲 |
| Focus Score | P2 | 4 | 🔲 |
| Adaptability Score | P3 | 4+ | 🔲 |
| Metrics caching in DB | P0 | 1 | 🔲 |
| Metric recalculation job | P1 | 2 | 🔲 |

---

## Module 8 — Dashboard

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Stats cards (sessions, laps, hours, tracks, cars) | P0 | 1 | 🔲 |
| Recent sessions list | P0 | 1 | 🔲 |
| Weekly activity chart | P1 | 1 | 🔲 |
| Driver scores overview | P1 | 2 | 🔲 |
| Active goals widget | P1 | 2 | 🔲 |
| Recent achievements | P1 | 2 | 🔲 |
| Quick insight (rule-based) | P1 | 2 | 🔲 |
| PB highlights | P1 | 2 | 🔲 |
| Streak widget | P2 | 2 | 🔲 |
| Heatmap calendar | P2 | 3 | 💡 |

---

## Module 9 — Track Analytics

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Track detail page | P1 | 1 | 🔲 |
| Sessions at track | P1 | 1 | 🔲 |
| PB per car at track | P1 | 1 | 🔲 |
| Best sectors at track | P1 | 2 | 🔲 |
| Ideal lap at track | P1 | 2 | 🔲 |
| PB evolution chart | P1 | 2 | 🔲 |
| Lap time distribution chart | P2 | 2 | 🔲 |
| Consistency over time at track | P2 | 2 | 🔲 |
| Cars used at track | P1 | 1 | 🔲 |

---

## Module 10 — Car Analytics

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Car detail page | P1 | 1 | 🔲 |
| Sessions with car | P1 | 1 | 🔲 |
| PB per track with car | P1 | 1 | 🔲 |
| Best track / worst track | P2 | 2 | 🔲 |
| Average consistency with car | P2 | 2 | 🔲 |
| Pace evolution with car | P2 | 2 | 🔲 |
| Car class comparison | P3 | 3+ | 🔲 |

---

## Module 11 — Session Comparison

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Compare two sessions | P1 | 2 | 🔲 |
| Side-by-side metrics | P1 | 2 | 🔲 |
| Lap time delta between sessions | P1 | 2 | 🔲 |
| Compare two laps (sector delta) | P1 | 2 | 🔲 |
| Telemetry overlay comparison | P2 | 4 | 🔲 |
| Compare vs personal best | P1 | 2 | 🔲 |

---

## Module 12 — Goals

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Create goal | P1 | 2 | 🔲 |
| Goal types (PB, consistency, laps, hours, etc.) | P1 | 2 | 🔲 |
| Goal progress tracking (auto-updated on import) | P1 | 2 | 🔲 |
| Goal deadline | P2 | 2 | 🔲 |
| Goal linked to track/car | P2 | 2 | 🔲 |
| Goal completion notification | P2 | 2 | 🔲 |
| Goal history (completed / abandoned) | P2 | 2 | 🔲 |
| Suggested goals (based on data) | P3 | 6 | 💡 |

---

## Module 13 — Achievements

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Achievement definitions (config-driven) | P1 | 2 | 🔲 |
| Achievement unlock logic (triggered on import) | P1 | 2 | 🔲 |
| Achievement progress tracking | P1 | 2 | 🔲 |
| Achievement rarity (common → legendary) | P2 | 2 | 🔲 |
| Achievement notification | P2 | 2 | 🔲 |
| Achievement grid page | P2 | 2 | 🔲 |
| Achievement categories | P2 | 2 | 🔲 |
| Achievement sharing | P3 | 7 | 💡 |

**Initial achievements (Phase 2):**
- First Import
- First Clean Race (0 incidents)
- 100 Laps Completed
- 500 Laps Completed
- 1000 Laps Completed
- First Personal Best
- 10 Sessions in a Month
- Consistency King (score > 90 in a session)
- Endurance Stint (20+ valid laps in one session)
- Sector Hunter (beat all 3 sector PBs in one session)

---

## Module 14 — Session Notes & Diary

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Add note to session | P1 | 2 | 🔲 |
| Tags on notes | P2 | 2 | 🔲 |
| Video link attachment | P2 | 3 | 🔲 |
| Note visibility (private/public) | P2 | 3 | 🔲 |
| Weekly diary summary view | P3 | 3+ | 💡 |
| Session mood / feeling rating | P3 | 3+ | 💡 |

---

## Module 15 — Setup Manager

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Create setup (name, sim, car, track, conditions) | P1 | 3 | 🔲 |
| Edit setup | P1 | 3 | 🔲 |
| Setup versioning | P2 | 3 | 🔲 |
| Upload setup file (attachment) | P2 | 3 | 🔲 |
| Link setup to session | P1 | 3 | 🔲 |
| Mark setup as favorite | P2 | 3 | 🔲 |
| Mark setup as obsolete | P2 | 3 | 🔲 |
| Setup performance stats (sessions using it) | P2 | 3 | 🔲 |
| Compare two setups | P3 | 3+ | 🔲 |
| Share setup (public) | P3 | 7 | 🔲 |

---

## Module 16 — Telemetry

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Telemetry file upload | P1 | 4 | 🔲 |
| Session-telemetry association | P1 | 4 | 🔲 |
| Channel extraction (speed, throttle, brake) | P1 | 4 | 🔲 |
| Steering, gear, RPM channels | P1 | 4 | 🔲 |
| Fuel and tyre channels | P2 | 4 | 🔲 |
| Lap-distance chart | P1 | 4 | 🔲 |
| Two-lap telemetry comparison | P1 | 4 | 🔲 |
| Delta overlay chart | P1 | 4 | 🔲 |
| Track map with trazada | P2 | 4 | 🔲 |
| Data downsampling for storage | P1 | 4 | 🔲 |
| Automatic braking zone detection | P3 | 5+ | 💡 |
| Throttle application analysis | P3 | 5+ | 💡 |

---

## Module 17 — AI Coach

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Chat interface | P1 | 6 | 🔲 |
| Claude API integration | P1 | 6 | 🔲 |
| Context builder (sessions, scores, goals) | P1 | 6 | 🔲 |
| Post-session auto-analysis | P1 | 6 | 🔲 |
| Prompt templates | P1 | 6 | 🔲 |
| Conversation history | P1 | 6 | 🔲 |
| AI credit system | P1 | 6 | 🔲 |
| Response feedback (thumbs up/down) | P2 | 6 | 🔲 |
| Training plan generation | P2 | 6 | 🔲 |
| Telemetry-aware analysis | P3 | 7+ | 🔲 |

---

## Module 18 — Community

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Public driver profile | P1 | 7 | 🔲 |
| Public sessions (opt-in) | P1 | 7 | 🔲 |
| Track leaderboards | P1 | 7 | 🔲 |
| Teams: create and invite | P1 | 7 | 🔲 |
| Team dashboard | P1 | 7 | 🔲 |
| Team rankings | P2 | 7 | 🔲 |
| Discord webhook | P2 | 7 | 🔲 |
| Shareable session cards | P2 | 7 | 🔲 |
| Community reference times | P2 | 7 | 🔲 |
| Weekly community challenge | P3 | 8+ | 💡 |
| Comments on public sessions | P3 | 8+ | 💡 |

---

## Module 19 — Desktop Sync Agent

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Tauri app (Windows) | P1 | 5 | 🔲 |
| Login with UrApex account | P1 | 5 | 🔲 |
| Simulator folder selection | P1 | 5 | 🔲 |
| File watcher | P1 | 5 | 🔲 |
| Auto upload on new file | P1 | 5 | 🔲 |
| Upload queue with retry | P1 | 5 | 🔲 |
| System tray icon | P1 | 5 | 🔲 |
| Sync historical files | P2 | 5 | 🔲 |
| Sync logs | P2 | 5 | 🔲 |
| Auto-start with Windows | P2 | 5 | 🔲 |
| macOS support | P3 | 6+ | 🔲 |

---

## Module 20 — Admin & Internal

| Feature | Priority | Phase | Status |
|---|---|---|---|
| Admin panel | P2 | 6+ | 🔲 |
| Failed imports monitor | P2 | 6+ | 🔲 |
| User management | P2 | 6+ | 🔲 |
| Track/car mapping editor | P2 | 6+ | 🔲 |
| Achievement editor | P3 | 6+ | 🔲 |
| Usage metrics dashboard | P2 | 6+ | 🔲 |
