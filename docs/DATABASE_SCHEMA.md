# UrApex — Database Schema

> This document describes the data model for UrApex.
> The authoritative source is `prisma/schema.prisma`.
> This document explains the design decisions behind the schema.

---

## Entity Overview

```
User ─────────────────┐
  │                    │
  ├── DriverProfile    │
  ├── ImportFile ──────┼──── Session ─────────────────┐
  ├── Session          │        │                       │
  ├── Goal             │        ├── Lap                 │
  ├── Setup            │        ├── SessionParticipant  │
  ├── Achievement(via) │        ├── Incident            │
  └── CoachConvos      │        ├── Penalty             │
                        │        ├── PitStop             │
Simulator ─────────────┘        ├── SessionNote         │
  │                             └── SessionSetup ───── Setup
  ├── Track ──── TrackAlias
  │     └── TrackLayout
  ├── Car ──── CarAlias
  │     └── CarClass
  └── (ImportFile)

Achievement ── UserAchievement ── User
```

---

## Core Entities

### User
Central auth entity. One User = one account.

| Column | Type | Notes |
|---|---|---|
| id | cuid | Primary key |
| email | String unique | Login identifier |
| emailVerified | DateTime? | Set when email is confirmed |
| name | String? | Display name fallback |
| image | String? | OAuth avatar |
| deletedAt | DateTime? | Soft delete (GDPR) |

**Relations:** one DriverProfile, many ImportFiles, many Sessions, many Goals, many Setups, many UserAchievements, many CoachConversations.

---

### DriverProfile
Extended user profile with cached performance stats.

| Column | Type | Notes |
|---|---|---|
| userId | String unique | FK → User |
| displayName | String? | Shown in UI instead of email |
| country | String? | ISO 3166-1 alpha-2 (e.g., "ES") |
| bio | String? | Short text |
| isPublic | Boolean | false by default |
| simulatorSlugs | String[] | e.g., ["lmu", "acc"] |
| totalSessions | Int | Cached — incremented on import |
| totalLaps | Int | Cached |
| totalDriveTimeSec | Int | Cached |
| uniqueTracks | Int | Cached |
| uniqueCars | Int | Cached |
| paceScore | Float? | Global score, recalculated periodically |
| consistencyScore | Float? | Global score |
| safetyScore | Float? | Global score |

**Why cached stats?** Avoid expensive COUNT queries on every dashboard load. Updated atomically after each import.

---

### Simulator
Static list of supported simulators. Seeded, not user-created.

| Column | Type | Notes |
|---|---|---|
| slug | String unique | "lmu", "acc", "iracing", "rf2" |
| name | String | "Le Mans Ultimate" |
| isActive | Boolean | Hide unsupported sims from UI |

---

### ImportFile
Represents a file uploaded by a user, before and after parsing.

| Column | Type | Notes |
|---|---|---|
| userId | String | FK → User |
| simulatorId | String? | Detected or set by user |
| originalName | String | Original filename |
| storagePath | String | Path to raw file |
| fileHash | String unique | SHA-256 of file content |
| fileSizeBytes | Int | |
| mimeType | String | "text/xml" |
| status | ImportStatus | PENDING / PARSING / IMPORTED / FAILED / DUPLICATE |
| parserVersion | String? | e.g., "lmu-v1.0.0" |
| errorMessage | String? | Human-readable error |
| errorDetails | Json? | Stack trace, line number, raw error |
| importedAt | DateTime? | When IMPORTED status was set |

**Why store `fileHash` with UNIQUE constraint?** The dedup check is a single indexed lookup. No need to read the file or parse it.

**Why store `parserVersion`?** When the parser is updated and we want to re-parse old files, we can find all imports using an older parser version.

---

### Session
Core entity. One Session = one sim racing session imported from one file.

| Column | Type | Notes |
|---|---|---|
| userId | String | FK → User |
| importFileId | String? unique | FK → ImportFile |
| simulatorId | String | FK → Simulator |
| trackId | String | FK → Track |
| trackLayoutId | String? | FK → TrackLayout |
| carId | String | FK → Car |
| carClassId | String? | FK → CarClass |
| sessionType | SessionType | PRACTICE / QUALIFYING / RACE / HOTLAP / TIME_TRIAL / UNKNOWN |
| sessionName | String? | e.g., "Race 1" |
| serverName | String? | Online server name |
| isOnline | Boolean | true = multiplayer |
| sessionDate | DateTime | |
| durationSec | Int? | |
| finalPosition | Int? | |
| totalLaps | Int | |
| validLaps | Int | |
| invalidLaps | Int | |
| dnf | Boolean | |
| dq | Boolean | |
| weather | String? | "clear", "cloudy", "rain" |
| tempAmbient | Float? | Celsius |
| tempTrack | Float? | Celsius |
| tyreCompound | String? | |
| bestLapMs | Int? | Cached — best valid lap in ms |
| avgLapMs | Float? | Cached |
| medianLapMs | Float? | Cached |
| idealLapMs | Int? | Cached — sum of best sectors |
| stdDevMs | Float? | Cached |
| cleanLapRatio | Float? | validLaps / totalLaps |
| consistencyScore | Float? | 0–100 |
| safetyScore | Float? | 0–100 |
| paceScore | Float? | 0–100 (needs historical PBs) |
| dropOffMs | Float? | Avg last-third - avg first-third |
| isNewPB | Boolean | true if this session set a new PB |
| isPublic | Boolean | false by default |
| deletedAt | DateTime? | Soft delete |

**Indexes:** `(userId)`, `(trackId)`, `(carId)`, `(sessionDate)`, `(sessionType)`, `(userId, sessionDate)`, `(userId, trackId)`, `(userId, carId)`

---

### Lap
One row per lap in a session.

| Column | Type | Notes |
|---|---|---|
| sessionId | String | FK → Session (cascade delete) |
| lapNumber | Int | 1-indexed |
| lapTimeMs | Int? | null if incomplete lap |
| isValid | Boolean | Sim-reported validity |
| isPersonalBest | Boolean | Best ever for this user/track/car |
| isSessionBest | Boolean | Best in this session |
| sector1Ms | Int? | |
| sector2Ms | Int? | |
| sector3Ms | Int? | |
| fuelLoad | Float? | kg or liters depending on sim |
| tyreCompound | String? | If changed mid-stint |

**Unique constraint:** `(sessionId, lapNumber)` — no duplicate lap numbers per session.

---

### Track

| Column | Type | Notes |
|---|---|---|
| slug | String unique | "spa-francorchamps" (URL-safe) |
| name | String | "Circuit de Spa-Francorchamps" |
| country | String? | "BE" |
| lengthM | Float? | |
| timezone | String? | "Europe/Brussels" |

**Not per-simulator:** Tracks are global. Each simulator links to a Track via TrackAlias.

---

### TrackAlias
Maps a simulator's raw track name to a canonical Track.

| Column | Type | Notes |
|---|---|---|
| trackId | String | FK → Track |
| rawName | String | Exact string from XML |
| simulatorId | String | Which sim uses this name |

**Unique:** `(rawName, simulatorId)` — one canonical mapping per sim.

---

### TrackLayout
A configuration of a track (e.g., Grand Prix vs Endurance layout).

| Column | Type | Notes |
|---|---|---|
| trackId | String | FK → Track |
| name | String | "Grand Prix", "Endurance" |
| lengthM | Float? | |

**Unique:** `(trackId, name)`

---

### Car, CarAlias, CarClass
Same pattern as Track/TrackAlias. Car has a CarClass (LMP2, GT3, Hypercar, etc.).

---

### SessionParticipant
Other drivers in the session (from the results grid).

| Column | Type | Notes |
|---|---|---|
| sessionId | String | FK → Session |
| driverName | String | Raw name from XML |
| teamName | String? | |
| carName | String? | Raw car name |
| carClass | String? | Raw class name |
| position | Int? | |
| lapsCompleted | Int? | |
| bestLapMs | Int? | |
| totalTimeMs | BigInt? | Can exceed Int range |
| gapToLeaderMs | BigInt? | |
| dnf / dq | Boolean | |

---

### Goal

| Column | Type | Notes |
|---|---|---|
| userId | String | |
| name | String | |
| type | GoalType | BEST_LAP_TIME, CONSISTENCY_SCORE, CLEAN_LAP_COUNT, etc. |
| status | GoalStatus | ACTIVE, COMPLETED, ABANDONED |
| trackId / carId | String? | Optional scope |
| targetValue | Float | e.g., 108000 (ms) or 90 (score) |
| currentValue | Float | Updated on each import |
| unit | String? | "ms", "score", "count", "hours" |
| deadline | DateTime? | |
| completedAt | DateTime? | |

---

### Achievement + UserAchievement

Achievement is a static config entity (seeded, not user-created).

| Column | Type | Notes |
|---|---|---|
| slug | String unique | "first-import", "100-laps" |
| name | String | Display name |
| description | String | |
| category | String | "pace", "consistency", "endurance", "general" |
| rarity | AchievementRarity | COMMON → LEGENDARY |
| condition | Json | `{ type: "lap_count", threshold: 100 }` |
| maxProgress | Float | 100 for most |

UserAchievement tracks per-user progress and unlock.

---

### Setup + SetupVersion

Setup is the parent (name, car, track, conditions).
SetupVersion holds each historical version (versioned file attachment).

---

### CoachConversation + CoachMessage

For Phase 6 AI coach. `context` in CoachMessage stores a JSON snapshot of the data used to generate the response (for debugging and audit).

---

## Indexes Summary

```sql
-- High-traffic indexes
Session: userId, trackId, carId, sessionDate, sessionType
Session: (userId, sessionDate) composite
Session: (userId, trackId) composite
Session: (userId, carId) composite
ImportFile: userId, fileHash, status
Lap: sessionId, (sessionId, isValid)
UserAchievement: userId
Goal: userId, (userId, status)
TrackAlias: (rawName, simulatorId)
CarAlias: (rawName, simulatorId)
```

---

## Design Decisions

### Why soft delete on Session?
Deleting a session should be reversible. Hard delete would require re-importing the file.

### Why cache metrics in Session columns?
Dashboard and history queries need best lap, consistency score, etc. Computing these from the Lap table on every request would require aggregation over potentially thousands of rows per user.

### Why store BigInt for totalTimeMs / gapToLeaderMs?
Race total times in endurance races (24h Le Mans) can exceed Int32 range.

### Why is Track global (not per-simulator)?
Spa-Francorchamps is Spa-Francorchamps regardless of which sim you're in. Aliases handle the name variations per simulator.

### Why store parserVersion on ImportFile?
If the LMU parser is updated to extract more data, we can identify and re-parse all imports that used the old parser version. This is the "re-parse" feature.

### Why Json for achievement conditions?
Achievement conditions vary by type. A Json field is flexible enough to hold `{ type: "lap_count", threshold: 100 }`, `{ type: "best_lap_under", trackSlug: "spa", valueMs: 130000 }`, etc. Validated with Zod at runtime.
