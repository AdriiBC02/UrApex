# UrApex — Ideas Bank

> A collection of feature ideas, UX improvements, and product concepts.
> Nothing here is committed to any phase. Ideas move to BACKLOG.md when accepted.
> Rate each idea: 🔥 high potential, 💡 interesting, ❄️ low priority / risky.

---

## Product / Feature Ideas

### 🔥 Post-Session Ritual Modal
After every successful import, show a 3-step modal:
1. "How was the session?" (5-star / emoji rating)
2. "What are you taking into the next session?" (quick note field)
3. "Set a micro-goal for next time?" (quick goal creation)

**Why:** Creates the habit loop. If users open UrApex every time they finish a session, retention is solved. The ritual doesn't feel like admin — it feels like reflection.

---

### 🔥 Driver DNA Radar Chart
A spider/radar chart showing all 8 driver scores simultaneously. This is the "fingerprint" of a driver. It answers "what kind of driver am I?" at a glance.

Labels: Pace · Consistency · Safety · Racecraft · Qualifying · Endurance · Improvement · Adaptability

**Where:** Driver profile page, dashboard summary card.
**Visual impact:** Very high. Shareable. Unique to UrApex.

---

### 🔥 GitHub-Style Session Heatmap Calendar
A full-year calendar grid where each day is colored by session activity. More sessions = darker color. Shows driving streaks and gaps.

**Why:** Proven retention mechanic (see GitHub contributions, Duolingo streaks). Gamifies consistency.
**Phase:** 2 or 3.

---

### 🔥 Streak System
Track consecutive weeks with at least one session. Show streak counter on dashboard.
Milestones: 4 weeks, 8 weeks, 3 months, 6 months.

**Why:** Simple, proven engagement mechanic. Creates loss aversion ("I don't want to break my streak").

---

### 🔥 "Weak Spot Detector" (without telemetry)
Using sector times alone, identify patterns like:
- "Your sector 2 consistently loses 0.4s vs ideal"
- "Your last lap of every stint is 1.2s slower than your average"
- "In RACE sessions, your pace is 0.8s slower than in PRACTICE at the same track"

**Why:** Actionable insight without requiring telemetry. High value for Phase 2.

---

### 💡 Lap Quality Score (per lap)
A per-lap score (0–100) based on how close the lap is to the session's ideal. Color-coded in the lap table.

Formula: `LQS = 100 * (1 - (lapTime - idealLap) / (worstValidLap - idealLap))`

**Why:** Makes the lap table more interesting than just raw times.

---

### 💡 "Before / After" Visualization for Goals
When a goal is completed, show an animated before/after card:
- "3 months ago your best at Spa was **2:04.2**. Today it's **2:01.9**."
- Mini chart showing the progression

**Where:** Goal completion notification, goal history.

---

### 💡 Progress Certificates
When the user achieves a significant milestone (first sub-2min lap, 1000 laps, 6-week streak), generate a shareable image card with:
- Driver name
- Achievement
- Key stat
- UrApex branding

**Why:** Organic social sharing = free marketing.

---

### 💡 "Session Mood" Metadata
Optional field: how did you feel during the session? (focused / tired / distracted / motivated)

Over time, correlate with performance:
- "When you rate yourself as 'tired', your consistency drops 12 points on average"

**Phase:** 3+

---

### 💡 Reference Lap Library
A community database of reference laps (sector times only, no telemetry required) for each track/car combo.
Users can "publish" a PB lap's sector times. Others see the community distribution.

**Enables:** Percentile ranking without full telemetry.
**Phase:** 7

---

### 💡 Voice Notes (Transcribed)
Allow the user to record a voice note after a session (via browser mic). Transcribe with Whisper API.

**Why:** Faster than typing. Drivers often have immediate verbal feedback after a session.
**Cost:** Whisper API is very cheap for short clips.

---

### 💡 Command Palette (Cmd+K)
Global keyboard shortcut opens a search/command palette. Users can:
- Search for sessions by track, car, date
- Navigate to any page
- Quickly start an import
- Ask the AI coach

**Why:** Power user feature. Very easy to implement with cmdk library.
**Phase:** 3

---

### 💡 "Traffic Effect" Metric
For race sessions with participant data: compare the user's lap times on laps where they were being held up (based on position changes) vs clean laps.

**Why:** Answers "does traffic affect my pace?" — common question for racers.
**Data needed:** Participant position data per lap (may not be in XML).

---

### 💡 "Warm-Up Speed" Metric
How many laps does it take to reach optimal pace? Track the average time to reach within 1% of session best.

---

### 💡 Sim-Specific Color Accents
Subtle UI color shifts based on the simulator of the current session:
- LMU → blue
- ACC → orange
- iRacing → teal

**Why:** Instant visual context. Feels like the UI "adapts" to the sim. Small detail, big polish.

---

### 💡 Weekly Digest Email
Auto-generated weekly summary sent on Mondays:
- Sessions this week
- Best improvement
- New PBs
- Goals progress
- Suggested focus for next week

**Phase:** 3+

---

### ❄️ Live Timing Integration
Pull session data in real-time via UDP broadcast from the sim.
**Risk:** Requires keeping a local server running during the session. Complex. Desktop Agent is the right path.

---

### ❄️ In-Sim Overlay
Show UrApex stats in an overlay inside the simulator.
**Risk:** Requires sim-specific integration (Content Manager for AC, SimHub for others). Very complex.

---

### ❄️ Coach Marketplace
Connect users with human coaches who can analyze UrApex data.
**Risk:** Marketplace is a different product. Out of scope until strong user base.

---

## UX Improvements

### 🔥 Quick Import Button
Always visible in the sidebar (small paperclip or upload icon). Click → modal opens with drag & drop zone. User never has to navigate away to import.

### 🔥 Inline Note Editing
Edit session notes directly in the session detail page, without opening a modal. Click → textarea appears → auto-save.

### 💡 Contextual "Compare" Memory
From any session, clicking "Compare" adds it to a temporary "compare context". Then from any other session, "Compare with [session from X]" option is available. No need to navigate to a compare page first.

### 💡 Keyboard Shortcuts
- `U` → Upload Center
- `D` → Dashboard
- `S` → Sessions
- `Cmd+K` → Command palette
- `Esc` → Close modal

### 💡 Smart Filters Memory
Remember the last filter state per page (stored in localStorage). If I always filter sessions by RACE type, don't reset the filter on navigation.

### 💡 Import Drag Zone Everywhere
Accept file drops anywhere in the app, not just on the Upload Center page.

---

## Monetization Ideas

### Freemium Model (Recommended)

**Free tier:**
- 10 imports per month
- 90 days of session history
- Basic metrics (best lap, average, consistency, safety)
- 5 active goals
- 10 setups

**Pro (€8/month or €72/year):**
- Unlimited imports
- Unlimited history
- All driver scores
- AI coach credits (20/month)
- Full setup manager with versions
- Data export
- Shareable sessions
- Priority support

**Team (€25/month for 5 seats):**
- All Pro features
- Team dashboard
- Discord webhooks
- Team setup sharing
- Bulk import

### Alternative: Credit-Based AI
Sell AI coach credits separately (€5 for 50 credits).
Free users get 5 credits/month. Pro users get 30/month.
This monetizes power users without blocking casual ones.

### Alternative: Lifetime Deal
Early access lifetime deal at €149 — get all Pro features forever.
Use for early validation and cash flow. Cap at 200 seats.

---

## Branding Ideas

### Visual Identity
- **Primary color:** Deep space black `#0A0A0F`
- **Accent 1:** Electric cyan `#00D4FF` (speed, data)
- **Accent 2:** Racing orange `#FF6B2B` (performance, fire)
- **Neutral:** Slate greys for UI chrome

### Logo Concept
- Stylized "A" that forms a circuit apex (the geometric point of a corner)
- Works at all sizes — from favicon to desktop icon
- Single color + outline versions

### Typographic Hierarchy
- UI text: Inter (clean, professional)
- Numbers/times: Roboto Mono or JetBrains Mono (technical feel)
- Headers: Inter Bold

### Iconography
- Phosphor Icons or Lucide — consistent, clean
- No emoji in core UI
- Custom icons for simulators

---

## Landing Page Ideas

### Hero Section
- Headline: "Your apex starts here."
- Subheadline: "Import your sessions. Understand your data. Drive faster."
- CTA: "Start for free — no credit card"
- Visual: animated dashboard preview or racing data visualization

### Social Proof Section
- X total sessions analyzed
- X total laps tracked
- X drivers improving

### Feature Sections
1. "Import in seconds" — drag & drop + instant analysis
2. "Know your weaknesses" — driver scores + weak spot detection
3. "Track real progress" — PB history + evolution charts
4. "Built for sim racers" — multi-sim, driver-first

### FAQ
- What sims are supported?
- Is my data private?
- Do I need to install anything?
- Can I delete my data?

---

## Ideas to Validate Early

Before building, validate these assumptions:

| Assumption | How to validate |
|---|---|
| Users will import sessions manually | Build MVP, see if they actually do it |
| Users want to see consistency score | Ask 10 sim racers if they care about lap variance |
| Weekly digest email improves retention | A/B test after Phase 3 |
| AI coach needs real data to be useful | Run a fake session through a prompt and rate the quality |
| Sync agent is needed | Track what % of users import within 24h of racing |
