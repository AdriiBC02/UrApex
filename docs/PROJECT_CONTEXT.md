# UrApex — Project Context

> This document defines the vision, problem, users, and guiding principles of UrApex.
> It should be read before making any product or architecture decision.

---

## Vision

UrApex exists to help sim racers become better drivers — not just to show them data.

The long-term vision is a platform that feels like having a personal performance coach, a data engineer, and a training partner in one tool. The user finishes a session, imports it, and within seconds understands what went well, what went wrong, and what to practice next.

---

## Mission Statement

> Give sim racers the tools to understand how they drive, measure how they improve, and decide what to do next.

---

## Problem Statement

Sim racers generate enormous amounts of data every session — lap times, sector splits, positions, consistency metrics — but most of it lives in inaccessible result files or disappears entirely. The few tools that exist are either platform-specific, focused only on raw stats, or require significant technical setup.

The result: drivers race, have a vague feeling of whether they improved or not, and repeat. There is no systematic approach to progression.

**UrApex closes this gap.**

---

## Target User

### Primary (MVP)

A sim racer who:
- Races regularly (2–5 sessions per week)
- Uses Le Mans Ultimate (or ACC / iRacing in later phases)
- Wants to improve, not just compete
- Has some analytical mindset — they care about lap times and consistency
- Is not a developer but is comfortable with modern web apps
- Age: 20–40
- Spends money on peripherals and sims — not price-sensitive for a tool that genuinely helps

### Secondary (Phase 3+)

- Sim racing teams looking for shared analytics
- Coaches working with multiple drivers
- League organizers wanting performance tracking

### Not our user (MVP)

- Casual sim racers who race once a month
- Players who only care about online rankings
- Users who expect a mobile-first experience

---

## Value Proposition

| For | Who | UrApex is | That | Unlike |
|---|---|---|---|---|
| Sim racers | Who want to improve systematically | A driver development platform | Converts raw session data into actionable insights and measurable progress | Simple stat trackers or sim-specific tools |

**In one sentence:** UrApex tells you not just how fast you are, but why you're not faster and what to do about it.

---

## Why Users Come Back After Every Session

The core retention loop:

```
Race → Import → Understand → Improve → Race again
```

For this to work:
1. **Import must be instant and frictionless** — under 10 seconds from file to dashboard
2. **The insight must be surprising or useful** — something the user didn't know
3. **There must be something to do next** — a goal, a recommendation, a comparison

The "Post-Session Ritual" is the key product behavior we want to create: every time the user finishes a session, they open UrApex.

---

## Core Differentiators

| Differentiator | Description |
|---|---|
| **Driver development focus** | Not a stats dump. Every metric answers a question about how to improve |
| **Multi-sim architecture** | Designed from day 1 to support multiple simulators without hacks |
| **Progression over time** | First-class tracking of improvement across weeks and months |
| **Personal goals + training** | Structured practice planning and goal tracking |
| **Driver diary** | Session notes, feelings, setups — the context behind the numbers |
| **Setup manager** | Deep setup tracking integrated with performance data |
| **AI coach (future)** | Analysis grounded in real user data, not generic advice |
| **Privacy-first** | All data private by default, granular sharing controls |
| **Driver scores (proprietary)** | 8 custom metrics that paint a complete picture of the driver profile |

---

## The 8 Driver Scores

These are UrApex's proprietary metrics. They are not copied from any other platform.

| Score | Measures | Core Signal |
|---|---|---|
| **Pace Score** | Raw speed | Best lap vs personal historical ideal |
| **Consistency Score** | Repeatability | Coefficient of variation across valid laps |
| **Safety Score** | Cleanliness | Incidents, penalties, DNF/DQ rate |
| **Racecraft Score** | Race execution | Positions gained, traffic management |
| **Qualifying Score** | Single-lap performance | Gap to ideal lap, headroom utilization |
| **Endurance Score** | Long-run performance | Pace drop-off, late-stint accuracy |
| **Improvement Score** | Progression | PBs, score trends week over week |
| **Adaptability Score** | Versatility | Performance across different cars and tracks |

---

## Guiding Principles

### 1. Data is a means, not an end
Every piece of data must answer a driver question. Never show data for its own sake.

### 2. One user, one truth
Each user's data is theirs. Sessions are private by default. Sharing is opt-in.

### 3. Multi-sim from the start
No hardcoding for LMU. Every sim-specific logic lives in its own parser. The rest of the app speaks normalized data.

### 4. Keep raw files forever
Raw XML/telemetry files are stored as uploaded. If the parser improves, we can re-parse. Data is never lost.

### 5. Avoid duplicates at the source
A session is identified by the SHA-256 hash of its source file. Two uploads of the same file produce one session.

### 6. Metrics are cached, not computed on render
Heavy calculations happen in import jobs and are stored in the DB. Pages are fast.

### 7. Never show empty without direction
Every empty state has a clear next action. "No sessions yet" always has an upload button.

### 8. Ship phases, not features
The roadmap is phased. Phase 1 is small, shippable, and validatable. Features are not added until they belong to an open phase.

---

## Non-Goals (permanent)

- We do not integrate with game APIs or use game clients
- We do not scrape other platforms
- We do not copy the UI, naming, or branding of other sim racing tools
- We do not use logos, liveries, or brand assets from game publishers without permission
- We are not a social network — community features are secondary to personal development

---

## Non-Goals (MVP only)

- Telemetry analysis (Phase 4)
- AI coach (Phase 6)
- Community and teams (Phase 7)
- Billing (Phase 8)
- Mobile app
- iRacing or ACC support
- Desktop sync agent

---

## Success Metrics

### Phase 1 (MVP)
- A real LMU XML can be imported in under 10 seconds
- Session data is correct and complete
- Dashboard loads in under 1 second (after hydration)
- No duplicate sessions on repeated import of the same file

### Phase 2 (Analytics)
- Users can answer "am I improving?" with data from the app
- Consistency and safety scores are accurate and meaningful

### Phase 3 (Product)
- A new user can go from register to first imported session in under 3 minutes
- Bounce rate on the upload page is below 10%

### Long-term
- Users open UrApex after at least 50% of their sessions
- Retention at 30 days is above 40%

---

## Competitive Positioning

UrApex is not a copy of any existing tool. It is positioned as:

- More focused on **improvement** than raw stats
- More **multi-sim aware** from the start
- More **personal** (diary, goals, training) than community tools
- More **privacy-respecting** than social platforms
- Better **visual design** than most racing tools

See [research/competitors.md](research/competitors.md) for detailed analysis.
