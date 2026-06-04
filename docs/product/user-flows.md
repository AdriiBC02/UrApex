# UrApex — User Flows

> Key user flows that define the core experience of UrApex.
> These flows should be used to guide UX decisions and identify edge cases.

---

## Flow 1 — First-Time Registration

```
Landing page
    │
    ▼
Click "Get started" CTA
    │
    ▼
Register page
  ├── Enter email + password + name
  ├── Validate: email format, password strength, unique email
  └── Submit
        │
        ▼
     [Phase 1] Skip onboarding → Dashboard (empty state)
     [Phase 3] → Onboarding flow
```

**Edge cases:**
- Email already registered → "Account exists. Sign in instead."
- Weak password → Show strength indicator
- Network error → "Could not create account. Try again."

---

## Flow 2 — Onboarding (Phase 3)

```
Register success
    │
    ▼
Step 1: "Which simulators do you use?"
  → Checkbox list: LMU, ACC, iRacing, RF2, etc.
  → "Just show all of them" option
    │
    ▼
Step 2: "Set up your profile"
  → Display name (required)
  → Country (optional)
  → Profile photo (optional)
    │
    ▼
Step 3: "Import your first session"
  → Mini upload zone
  → Skip option → "You can import anytime from the Upload Center"
    │
    ▼
Dashboard (with or without first session)
```

---

## Flow 3 — Import Session (Core Flow)

```
User opens Upload Center (or uses Quick Import)
    │
    ▼
Drag & drop XML file(s) onto drop zone
    │
    ▼
Client preview: file name, size, type check
    │
    ▼
Click "Import X file(s)"
    │
    ▼
POST /api/upload
    ├── Calculate SHA-256 hash
    ├── Check for duplicate
    │     ├── DUPLICATE → return { duplicate: true, sessionId }
    │     │     └── Show: "Already imported. [View session]"
    │     └── NEW → continue
    ├── Validate file type + size
    ├── Store raw file
    └── Create ImportFile { status: PENDING }
         │
         ▼
    Return importFileId to client
         │
         ▼
Client shows "Pending..." status
Client starts polling GET /api/import/[id]/status every 2s
         │
         ▼
Server (import job):
    ├── ImportFile → PARSING
    ├── Detect simulator
    ├── Run parser
    │     ├── Parse error → ImportFile(FAILED, errorMessage)
    │     └── Success → NormalizedSession
    ├── Normalize track and car
    ├── Calculate metrics
    ├── Detect PB
    ├── Save Session + Laps + Participants
    ├── Update DriverProfile stats
    ├── Check achievements
    └── ImportFile → IMPORTED, sessionId
         │
         ▼
Client poll detects IMPORTED
    │
    ├── [NEW PB] → Show notification: "New PB at Spa! 2:01.742"
    ├── [Phase 3] → Show post-session ritual modal
    └── Show "View session" link
```

**Edge cases:**
- File too large → Client-side validation before upload
- Wrong file type → "Only XML files are supported"
- Parser crash → FAILED with error message, retry button
- DB failure during save → FAILED, all data rolled back
- Duplicate detection race condition → UNIQUE constraint on fileHash catches it

---

## Flow 4 — View Session Detail

```
Sessions list or Dashboard "Recent sessions"
    │
    ▼
Click session row
    │
    ▼
Session detail page loads (Server Component)
    ├── Fetch session + laps + participants from DB
    ├── Check session.userId === currentUser.id
    │     └── If not → 404 (not 403, to avoid enumeration)
    └── Render:
          ├── Header: track, car, date, type, result
          ├── Metrics cards: best, avg, median, ideal, scores
          ├── Lap time chart (client component)
          ├── Lap table
          ├── Sector breakdown
          ├── Participants table
          ├── Incidents + Penalties (if any)
          ├── Notes section (editable)
          └── Actions: [Compare] [Add note] [Link setup] [Share]
```

---

## Flow 5 — Set a Goal

```
Goals page (or Dashboard widget "Add goal")
    │
    ▼
Click "New goal"
    │
    ▼
Goal creation form:
  Step 1: Choose type
    ├── Best lap time (sub X at [track] with [car])
    ├── Consistency score (reach X)
    ├── Clean races (X races with 0 incidents)
    ├── Hours driven (drive X hours)
    ├── Session count (race X sessions this month)
    └── Custom (free text metric)
  Step 2: Set target + optional scope
    ├── Target value
    ├── Track (optional)
    ├── Car (optional)
    └── Deadline (optional)
    │
    ▼
Goal saved → appears in Goals page + Dashboard widget
    │
    ▼
After each import:
    └── GoalService.evaluateGoals(userId)
          └── For each ACTIVE goal:
                ├── Calculate currentValue from sessions
                └── If currentValue >= targetValue:
                      └── Mark COMPLETED + notify
```

---

## Flow 6 — Compare Two Sessions

```
Session detail page
    │
    ▼
Click "Compare"
    │
    ▼
Compare picker:
  ├── Show recent sessions at same track
  ├── Or search all sessions
  └── Select session B
    │
    ▼
Compare page loads:
  ├── Session A (left): metadata, metrics
  ├── Session B (right): metadata, metrics
  ├── Delta column: +/- for each metric
  ├── Lap time overlay chart (both sessions on same chart)
  └── Sector breakdown comparison
```

---

## Flow 7 — Add Note to Session

```
Session detail page
    │
    ▼
"Notes" section (empty or existing)
    │
    ▼
Click "Add note" or click into editor
    │
    ▼
Rich text area (or simple textarea for MVP):
  ├── Write notes
  ├── Add tags (#setup #oversteer #wet)
  └── Optional: add video link
    │
    ▼
Auto-save on blur (or "Save" button)
    │
    ▼
Note appears in session detail
```

---

## Flow 8 — Setup Manager (Phase 3)

```
User opens Setup Manager
    │
    ▼
View setup library (filtered by sim/car/track)
    │
    ├── Click "New setup"
    │     ├── Name, sim, car, track, conditions
    │     ├── Notes
    │     └── Upload setup file (optional)
    │           └── Create Setup + SetupVersion 1
    │
    └── Click existing setup
          ├── View details
          ├── Edit → creates SetupVersion N+1
          ├── Link to session
          └── Mark favorite / obsolete
```

---

## Flow 9 — AI Coach Chat (Phase 6)

```
Coach page
    │
    ▼
New conversation (or continue existing)
    │
    ▼
User types: "Analyze my last race at Spa"
    │
    ▼
POST /api/coach/conversations/[id]/messages
    │
    ▼
Server:
  ├── Load user context:
  │     ├── Last N sessions (especially at Spa)
  │     ├── User's scores
  │     ├── Goals
  │     └── Recent notes
  ├── Build prompt (system + context + user message)
  ├── Call Claude API (streaming)
  └── Stream response to client
    │
    ▼
Response cites real data:
  "Your last race at Spa (Jun 4) had a best lap of 2:01.742.
   Your consistency score was 87/100, which is your best ever at
   this circuit. However, your drop-off was 620ms — you lost pace
   significantly after lap 20. Focus on tyre management in long stints."
    │
    ▼
User can ask follow-up questions
Response is saved to CoachMessage table
```

---

## Flow 10 — Privacy Control (Phase 3)

```
Session detail page
    │
    ▼
"Privacy" section or gear icon
    │
    ▼
Toggle: "Private" / "Public"
  ├── Private (default):
  │     ├── Only visible to me
  │     └── Not in community rankings
  └── Public:
        ├── Anyone with the link can view
        ├── Included in community leaderboards
        └── Can be shared via link
    │
    ▼
[Future: Phase 7]
Share button → generates shareable URL
  └── Optional: share without telemetry / without setup
```

---

## Flow 11 — Desktop Sync Agent (Phase 5)

```
User installs Tauri agent (Windows)
    │
    ▼
First launch → login with UrApex account
    │
    ▼
Setup wizard:
  ├── Select simulator: LMU, ACC, etc.
  ├── Select results folder (auto-suggested based on sim path)
  └── Select telemetry folder (optional)
    │
    ▼
Agent starts watching folders
    │
    ▼
User finishes a session in LMU
    │
    ▼
LMU writes result XML to results folder
    │
    ▼
Agent detects new file (file watcher fires)
    │
    ▼
Agent:
  ├── Calculate hash
  ├── Check local cache: already uploaded?
  │     └── If yes: skip
  ├── Add to upload queue
  └── Upload to POST /api/upload
        ├── Success → notify system tray "Session synced!"
        └── Failure → retry with backoff
    │
    ▼
User opens UrApex in browser → session already there
```

---

## Flow 12 — Metric Recalculation (Parser Update)

```
Developer updates LMU parser (bug fix or new field extraction)
    │
    ▼
New parser version: "lmu-v1.1.0"
    │
    ▼
Admin triggers: reparsing job
    │
    ▼
Find all ImportFiles where:
  - simulatorId = "lmu"
  - parserVersion != "lmu-v1.1.0"
  - status = "IMPORTED"
    │
    ▼
For each ImportFile:
  ├── Read raw file from storage
  ├── Run new parser version
  ├── Update Session + Laps (replace, not append)
  ├── Recalculate metrics
  └── Update ImportFile.parserVersion = "lmu-v1.1.0"
    │
    ▼
All historical data now has improved fidelity
```
