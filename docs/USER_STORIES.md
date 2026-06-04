# UrApex — User Stories

> User stories are written from the perspective of the driver using UrApex.
> Format: "As a [role], I want to [action], so that [outcome]."
> Each story has acceptance criteria that define "done."

---

## Epics Overview

| Epic | Stories | Phase |
|---|---|---|
| E-01 Auth & Account | US-001 to US-006 | 1 |
| E-02 Import | US-010 to US-019 | 1 |
| E-03 Dashboard | US-020 to US-025 | 1 |
| E-04 Sessions | US-030 to US-040 | 1 |
| E-05 Track Analytics | US-050 to US-055 | 1-2 |
| E-06 Car Analytics | US-060 to US-065 | 1-2 |
| E-07 Metrics | US-070 to US-080 | 1-2 |
| E-08 Goals | US-090 to US-098 | 2 |
| E-09 Achievements | US-100 to US-108 | 2 |
| E-10 Session Notes | US-110 to US-115 | 2 |
| E-11 Comparison | US-120 to US-127 | 2 |
| E-12 Setup Manager | US-130 to US-140 | 3 |
| E-13 Onboarding | US-150 to US-154 | 3 |
| E-14 Privacy | US-160 to US-166 | 3 |
| E-15 Telemetry | US-200 to US-215 | 4 |
| E-16 AI Coach | US-300 to US-310 | 6 |
| E-17 Community | US-400 to US-420 | 7 |

---

## E-01 — Auth & Account

### US-001 — Register
**As a sim racer, I want to create an account, so that my data is saved and private.**

Acceptance criteria:
- [ ] I can enter email, password (min 8 chars), and name
- [ ] My password is validated for minimum strength
- [ ] If the email is already registered, I see a clear error
- [ ] After successful registration, I am logged in automatically
- [ ] A DriverProfile is created for me with default values
- [ ] I am redirected to the onboarding flow (Phase 3) or dashboard (Phase 1)

---

### US-002 — Login
**As a returning user, I want to log in with email and password, so that I can access my data.**

Acceptance criteria:
- [ ] I can enter email and password
- [ ] Wrong credentials show a clear error (not which field is wrong)
- [ ] After login, I am redirected to the dashboard
- [ ] My session persists across browser restarts

---

### US-003 — Logout
**As a logged-in user, I want to log out, so that my account is secure on shared machines.**

Acceptance criteria:
- [ ] Logout option is accessible from the avatar menu
- [ ] After logout, I am redirected to the login page
- [ ] My session cookie is invalidated
- [ ] Navigating back does not show my data

---

### US-004 — Password Reset
**As a user who forgot their password, I want to reset it via email, so that I can regain access.**

Acceptance criteria:
- [ ] I can request a password reset by entering my email
- [ ] I receive an email with a reset link (valid for 1 hour)
- [ ] The link allows me to set a new password
- [ ] Old sessions are not invalidated by a password reset

---

### US-005 — Edit Profile
**As a user, I want to update my display name and country, so that my profile reflects who I am.**

Acceptance criteria:
- [ ] I can update display name, country, and bio from Settings
- [ ] Changes are saved immediately
- [ ] The sidebar reflects my new display name without a page reload

---

### US-006 — Delete Account
**As a user, I want to delete my account and all my data, so that I can exercise my right to be forgotten.**

Acceptance criteria:
- [ ] Account deletion requires password confirmation
- [ ] All sessions, laps, goals, notes, setups, and achievements are deleted
- [ ] Raw files are deleted from storage
- [ ] I receive a confirmation email after deletion
- [ ] After deletion, my email can be used to register a new account

---

## E-02 — Import

### US-010 — Upload XML File
**As a sim racer, I want to drag and drop my LMU result XML onto the upload page, so that my session is imported automatically.**

Acceptance criteria:
- [ ] I can drag & drop one or multiple XML files onto the upload zone
- [ ] I can also click to browse and select files
- [ ] Each file shows a preview (name, size) before upload
- [ ] I can remove files from the queue before uploading
- [ ] Upload starts when I click "Import" (or immediately after drop, TBD)

---

### US-011 — See Import Progress
**As a user who uploaded a file, I want to see the import status in real time, so that I know when it's ready.**

Acceptance criteria:
- [ ] Each file shows its status: Pending → Parsing → Imported / Failed
- [ ] A spinner or progress indicator shows while parsing
- [ ] When imported, a "View session" link appears
- [ ] When failed, an error message is shown

---

### US-012 — Duplicate Detection
**As a user, I want the app to detect if I upload the same file twice, so that I don't end up with duplicate sessions.**

Acceptance criteria:
- [ ] If I upload a file I've already imported, I see a "Duplicate" status
- [ ] A link to the existing session is shown
- [ ] The file is not re-imported
- [ ] This detection is based on file content, not filename

---

### US-013 — Handle Import Error
**As a user whose import failed, I want to see a clear error and be able to retry, so that I'm not stuck.**

Acceptance criteria:
- [ ] Failed imports show a human-readable error message
- [ ] A "Retry" button re-runs the import without re-uploading the file
- [ ] If the parser has been updated, retry picks up the new parser automatically
- [ ] I can also delete the failed import

---

### US-014 — View Import History
**As a user, I want to see all my previous uploads and their status, so that I know what has been imported.**

Acceptance criteria:
- [ ] Upload Center shows all imports (paginated)
- [ ] I can filter by status (all, imported, failed, pending)
- [ ] Each import shows: filename, date, status, sim, session link (if imported)
- [ ] I can delete imports from this list

---

### US-015 — Multi-File Upload
**As a user with many sessions to import, I want to upload multiple files at once, so that I can catch up quickly.**

Acceptance criteria:
- [ ] I can select or drop multiple files simultaneously
- [ ] Each file is processed independently
- [ ] If one fails, others are not affected
- [ ] I see the status for each file individually

---

## E-03 — Dashboard

### US-020 — View Personal Stats
**As a logged-in user, I want to see my overall statistics on the dashboard, so that I have a quick overview of my activity.**

Acceptance criteria:
- [ ] Dashboard shows: total sessions, total laps, total drive time, unique tracks, unique cars
- [ ] Values update after each import
- [ ] Values are accurate (validated against session history)

---

### US-021 — See Recent Sessions
**As a user, I want to see my 5 most recent sessions on the dashboard, so that I can quickly get back to recent work.**

Acceptance criteria:
- [ ] Shows track, car, type, date, best lap for each session
- [ ] Clicking a session navigates to its detail page
- [ ] New PBs are highlighted

---

### US-022 — See Weekly Activity
**As a user, I want to see how many sessions I've had each week, so that I can see if I'm being consistent.**

Acceptance criteria:
- [ ] Bar chart shows session count per week for the last 8 weeks
- [ ] X-axis shows week labels (W22, W23, etc.)
- [ ] Weeks with no sessions show a bar of height 0

---

### US-023 — Empty Dashboard State
**As a new user with no sessions, I want to see a helpful empty state, so that I know what to do next.**

Acceptance criteria:
- [ ] Empty state shows a clear message ("No sessions yet")
- [ ] Provides a direct link or button to the Upload Center
- [ ] Does not show broken charts or zero-state cards that look like bugs

---

### US-024 — Driver Scores on Dashboard
**As a user, I want to see my current driver scores (Consistency, Safety, Pace), so that I can quickly assess my performance level.**

*Phase 2*

Acceptance criteria:
- [ ] Shows at least 3 scores as colored badges
- [ ] Scores are from the last 30 days of data (not all time)
- [ ] Clicking a score navigates to an explanation or detail view

---

## E-04 — Sessions

### US-030 — View Session History
**As a user, I want to see a table of all my sessions, so that I can review my history.**

Acceptance criteria:
- [ ] Table shows: date, sim, track, car, type, position, laps, best lap, consistency, safety
- [ ] Table is paginated (20 per page)
- [ ] Clicking a row navigates to session detail
- [ ] Default sort: most recent first

---

### US-031 — Filter Sessions
**As a user, I want to filter sessions by type, track, and car, so that I can find specific sessions.**

Acceptance criteria:
- [ ] Filters: session type (race, qualifying, practice), track, car
- [ ] Filters can be combined
- [ ] Active filters are visible (chips or badges)
- [ ] Filter state is reflected in the URL (shareable/bookmarkable)
- [ ] "Clear filters" button resets all filters

---

### US-032 — View Session Detail
**As a user, I want to see the full detail of a session, so that I can understand exactly what happened.**

Acceptance criteria:
- [ ] Shows all session metadata (track, car, date, type, conditions)
- [ ] Shows key metrics (best, avg, median, ideal, consistency, safety)
- [ ] Shows a lap table with all lap times and sectors
- [ ] PB laps are highlighted in the table
- [ ] Invalid laps are marked distinctly
- [ ] Lap time chart shows progression through the session

---

### US-033 — View Sector Breakdown
**As a user viewing a session, I want to see sector times, so that I know where I gained or lost time.**

Acceptance criteria:
- [ ] Shows best S1, S2, S3 for the session
- [ ] Shows ideal lap (S1+S2+S3 best)
- [ ] Shows gap from actual best lap to ideal lap
- [ ] Indicates which sectors are new personal bests

---

### US-034 — View Other Drivers in Session
**As a user, I want to see the other drivers in a race session, so that I can understand the context of my result.**

Acceptance criteria:
- [ ] Shows all participants with: position, name, car, laps, best lap
- [ ] My entry is highlighted
- [ ] Gap to leader shown if available

---

### US-035 — Delete Session
**As a user, I want to delete a session, so that I can remove test imports or erroneous data.**

Acceptance criteria:
- [ ] Delete requires confirmation ("Are you sure? This cannot be undone.")
- [ ] Session is soft-deleted (not permanently removed from DB)
- [ ] Raw file is NOT deleted (in case I want to re-import)
- [ ] Dashboard stats update after deletion

---

## E-05 — Track Analytics

### US-050 — View Track Summary
**As a user, I want to see all my stats at a specific circuit, so that I can understand my performance there.**

Acceptance criteria:
- [ ] Track page shows: total sessions, total laps, best lap, avg consistency, best car
- [ ] List of sessions at this track
- [ ] Cars used at this track

---

### US-051 — View PB Evolution at Track
**As a user, I want to see how my best lap has evolved at a track over time, so that I can see if I'm improving.**

Acceptance criteria:
- [ ] Line chart shows best lap per session over time
- [ ] X-axis is date, Y-axis is lap time
- [ ] PB improvements are highlighted

---

### US-052 — View Best Lap by Car at Track
**As a user, I want to see my fastest lap for each car I've used at a track, so that I can compare.**

Acceptance criteria:
- [ ] Table or card list per car: car name, best lap, number of sessions

---

## E-06 — Car Analytics

### US-060 — View Car Summary
**As a user, I want to see all my stats with a specific car, so that I can understand how well I drive it.**

Acceptance criteria:
- [ ] Car page shows: total sessions, total laps, circuits driven, avg consistency
- [ ] List of sessions with this car
- [ ] Best lap at each circuit

---

## E-07 — Metrics

### US-070 — Understand Consistency Score
**As a user, I want to understand what the Consistency Score means, so that I can use it to improve.**

Acceptance criteria:
- [ ] Consistency Score (0–100) is shown on session cards and session detail
- [ ] A tooltip or help text explains: "Higher = more consistent lap times"
- [ ] Score is color-coded (green = good, red = poor)

---

### US-071 — See My Personal Best
**As a user, I want to see when I set a personal best, so that I know I'm improving.**

Acceptance criteria:
- [ ] PB laps are highlighted in the lap table
- [ ] Session cards show a "New PB" badge when applicable
- [ ] Dashboard has a "Recent PBs" section (Phase 2)

---

## E-08 — Goals

### US-090 — Create a Goal
**As a user, I want to set a personal goal, so that I have something specific to work toward.**

Acceptance criteria:
- [ ] I can choose a goal type (best lap, consistency, clean race, hours driven, etc.)
- [ ] I can set a target value and optional deadline
- [ ] I can link the goal to a specific track and/or car
- [ ] Goal appears in the Goals page and dashboard widget

---

### US-091 — See Goal Progress
**As a user, I want to see how close I am to completing a goal, so that I stay motivated.**

Acceptance criteria:
- [ ] Progress bar shows current vs target value
- [ ] Progress updates automatically after each import
- [ ] Completed goals are moved to a "Completed" section

---

### US-092 — Complete a Goal
**As a user, I want to be notified when I achieve a goal, so that I get a sense of accomplishment.**

Acceptance criteria:
- [ ] Goal automatically marks as completed when target is reached
- [ ] A completion notification appears ("Goal completed: Sub 2:00 at Spa!")
- [ ] Completed goals show the date they were achieved

---

## E-09 — Achievements

### US-100 — Unlock First Achievement
**As a new user, I want to unlock my first achievement on my first import, so that I feel rewarded immediately.**

Acceptance criteria:
- [ ] "First Import" achievement is unlocked automatically
- [ ] A notification appears after the import
- [ ] Achievement appears in the Achievements page

---

### US-101 — Browse Achievements
**As a user, I want to see all available achievements and my progress on each, so that I know what to work toward.**

Acceptance criteria:
- [ ] Grid shows all achievements (unlocked + locked)
- [ ] Unlocked achievements are highlighted
- [ ] Locked achievements show progress bar if applicable
- [ ] Rarity is shown (common, rare, epic, legendary)

---

## E-10 — Session Notes

### US-110 — Add a Note to a Session
**As a user, I want to add notes to a session, so that I remember what I learned and felt.**

Acceptance criteria:
- [ ] Note editor appears on session detail page
- [ ] I can write free text
- [ ] I can add tags
- [ ] Note is saved automatically (auto-save or on blur)
- [ ] Notes are private by default

---

## E-11 — Comparison

### US-120 — Compare Two Sessions
**As a user, I want to compare two sessions at the same track, so that I can see what changed between them.**

Acceptance criteria:
- [ ] I can select two sessions from the same track
- [ ] Side-by-side comparison shows: best lap, avg, ideal, consistency, safety
- [ ] Delta values show improvement or regression
- [ ] Both sessions are visually labeled (Session A / Session B)

---

### US-121 — Compare Two Laps (Sector Delta)
**As a user, I want to compare the sector times of two laps, so that I can see exactly where I gained or lost time.**

Acceptance criteria:
- [ ] Select any two valid laps (from the same or different sessions)
- [ ] Shows S1, S2, S3 for each lap
- [ ] Delta per sector shown with +/- colors
- [ ] Total time delta shown

---

## E-12 — Setup Manager

### US-130 — Save a Setup
**As a user, I want to save a setup configuration for a track and car, so that I can reference it later.**

Acceptance criteria:
- [ ] I can create a setup with: name, sim, car, track, conditions, notes
- [ ] Setup is saved to my library
- [ ] I can attach a setup file (e.g., `.json` from the sim)

---

### US-131 — Link Setup to Session
**As a user, I want to associate a setup with a session, so that I remember which setup I used.**

Acceptance criteria:
- [ ] From session detail, I can link an existing setup
- [ ] From setup view, I can see which sessions used it
- [ ] Linking does not modify the session data

---

## E-13 — Onboarding

### US-150 — Complete Onboarding
**As a new user, I want to be guided through setup on first login, so that I know how to use the app.**

Acceptance criteria:
- [ ] Onboarding has 3 steps: (1) choose simulators, (2) complete profile, (3) import first file
- [ ] I can skip steps
- [ ] Onboarding is not shown to users who have already imported sessions
- [ ] After onboarding, I land on the dashboard

---

## E-14 — Privacy

### US-160 — Sessions Are Private by Default
**As a user, I want my sessions to be private unless I choose to share them, so that my data is protected.**

Acceptance criteria:
- [ ] All imported sessions default to `isPublic = false`
- [ ] Private sessions are not visible in community rankings or public profiles
- [ ] No data is shared with other users without explicit action

---

### US-161 — Make a Session Public
**As a user, I want to optionally share a session, so that I can discuss it with my team or community.**

Acceptance criteria:
- [ ] Toggle on session detail: "Make this session public"
- [ ] Public sessions can be viewed by anyone with the link
- [ ] I can make a session private again at any time

---

## E-15 — Telemetry (Phase 4)

### US-200 — Upload Telemetry File
**As a user, I want to upload a telemetry file alongside a session, so that I can analyze my driving in detail.**

Acceptance criteria:
- [ ] I can upload a telemetry file from the session detail page
- [ ] File is associated with the correct session
- [ ] Processing status is shown (same as import status)

---

### US-201 — View Speed Trace
**As a user, I want to see my speed across a lap by distance, so that I can spot where I'm losing speed.**

Acceptance criteria:
- [ ] Chart shows speed (km/h) on Y-axis, lap distance on X-axis
- [ ] Can select any valid lap from the session
- [ ] Zoom and pan supported

---

### US-202 — Compare Two Lap Telemetry Traces
**As a user, I want to overlay the telemetry of two laps, so that I can see exactly where one was faster.**

Acceptance criteria:
- [ ] Select lap A and lap B (same session or different sessions at same track)
- [ ] Speed traces shown in two colors
- [ ] Delta chart shows time gained/lost by distance
- [ ] Can toggle channels: speed, throttle, brake, steering

---

## E-16 — AI Coach (Phase 6)

### US-300 — Ask Coach to Analyze Last Race
**As a user, I want to ask the AI coach to analyze my last race, so that I get objective feedback.**

Acceptance criteria:
- [ ] Chat interface with message input
- [ ] Coach responds with: best lap, avg, consistency, safety, notable laps, incidents
- [ ] Response cites actual numbers from my data
- [ ] Response is specific, not generic

---

### US-301 — Ask Coach for Training Plan
**As a user, I want the coach to give me a training plan for next week, so that I practice productively.**

Acceptance criteria:
- [ ] Plan is based on my weakest areas (from scores and goals)
- [ ] Suggests specific: circuits, cars, session types, objectives
- [ ] Plan is achievable (realistic session count)

---

## E-17 — Community (Phase 7)

### US-400 — View Public Leaderboard at Track
**As a user, I want to see how my best lap compares to other UrApex users at the same track, so that I know my level.**

Acceptance criteria:
- [ ] Leaderboard shows top times at a track (opt-in only)
- [ ] My position is highlighted
- [ ] Filter by car class

---

### US-401 — Create a Team
**As a user, I want to create a team and invite my friends, so that we can compare our progress.**

Acceptance criteria:
- [ ] I can create a team with a name
- [ ] I can invite members by email
- [ ] Team dashboard shows all members' scores and recent sessions
- [ ] Team ranking shows members sorted by a chosen metric
