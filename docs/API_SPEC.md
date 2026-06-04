# UrApex — API Specification

> Internal API reference for UrApex.
> All endpoints require authentication unless marked as public.
> Base URL: `/api`

---

## Authentication

All protected routes require a valid session cookie set by Auth.js.
The session is validated in middleware for page routes and at the top of each API handler.

```
Authorization: (cookie-based, set by Auth.js)
```

Unauthenticated requests return:
```json
{ "error": "Unauthorized" }
// HTTP 401
```

---

## Error Format

All API errors follow this format:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}  // optional
}
```

Common error codes:
| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Session valid but no permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid input |
| `DUPLICATE_FILE` | 409 | File already imported |
| `IMPORT_FAILED` | 500 | Parser or storage error |

---

## Auth Endpoints

### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "driver@example.com",
  "password": "min-8-chars",
  "name": "Adrian"
}
```

**Response 201:**
```json
{
  "userId": "clxxx",
  "email": "driver@example.com"
}
```

**Errors:** `VALIDATION_ERROR` (invalid email, weak password), `409` (email taken)

---

### POST /api/auth/[...nextauth]
Auth.js handler. Handles login, logout, session, CSRF.

Handled automatically by Auth.js — do not write custom logic here.

---

## Upload & Import Endpoints

### POST /api/upload
Upload one or more XML files for import.

**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| files | File[] | Yes | XML files, max 50MB each |
| simulatorSlug | string | No | If known. Auto-detected if omitted |

**Response 200:**
```json
{
  "imports": [
    {
      "importFileId": "clxxx",
      "originalName": "spa_race.xml",
      "status": "PENDING",
      "isDuplicate": false
    },
    {
      "importFileId": null,
      "originalName": "old_race.xml",
      "status": "DUPLICATE",
      "isDuplicate": true,
      "existingSessionId": "clyyy"
    }
  ]
}
```

**Errors:** `VALIDATION_ERROR` (wrong file type), `413` (file too large)

---

### GET /api/import/[id]/status
Poll the status of an import job.

**Response 200:**
```json
{
  "importFileId": "clxxx",
  "status": "IMPORTED",
  "sessionId": "clyyy",
  "parserVersion": "lmu-v1.0.0",
  "errorMessage": null,
  "importedAt": "2025-06-04T10:30:00Z"
}
```

**Status values:** `PENDING` | `PARSING` | `IMPORTED` | `FAILED` | `DUPLICATE`

---

### GET /api/import
List all import files for the current user.

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| status | string | all | Filter by status |
| page | number | 1 | |
| limit | number | 20 | Max 100 |

**Response 200:**
```json
{
  "imports": [
    {
      "id": "clxxx",
      "originalName": "spa_race.xml",
      "status": "IMPORTED",
      "sessionId": "clyyy",
      "createdAt": "2025-06-04T10:00:00Z"
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

---

### DELETE /api/import/[id]
Delete an import and its associated session.

**Response 200:**
```json
{ "deleted": true }
```

**Errors:** `NOT_FOUND`, `FORBIDDEN` (not the owner)

---

### POST /api/import/[id]/retry
Retry a failed import using the stored raw file.

**Response 200:**
```json
{
  "importFileId": "clxxx",
  "status": "PENDING"
}
```

---

## Session Endpoints

### GET /api/sessions
List sessions for the current user.

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| page | number | 1 | |
| limit | number | 20 | Max 100 |
| type | string | all | PRACTICE, QUALIFYING, RACE, etc. |
| trackSlug | string | | Filter by track |
| carSlug | string | | Filter by car |
| simulatorSlug | string | | Filter by sim |
| from | ISO date | | Start date |
| to | ISO date | | End date |
| pbOnly | boolean | false | Only sessions with new PB |
| sort | string | date_desc | date_asc, date_desc, best_lap_asc |

**Response 200:**
```json
{
  "sessions": [
    {
      "id": "clxxx",
      "sessionDate": "2025-06-04T10:00:00Z",
      "simulator": { "slug": "lmu", "name": "Le Mans Ultimate" },
      "track": { "slug": "spa-francorchamps", "name": "Spa-Francorchamps" },
      "car": { "slug": "ferrari-499p", "name": "Ferrari 499P" },
      "sessionType": "RACE",
      "finalPosition": 3,
      "totalLaps": 34,
      "bestLapMs": 121742,
      "consistencyScore": 87.3,
      "safetyScore": 95.0,
      "isNewPB": false
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/sessions/[id]
Get full session detail.

**Response 200:**
```json
{
  "id": "clxxx",
  "sessionDate": "2025-06-04T10:00:00Z",
  "simulator": { "slug": "lmu", "name": "Le Mans Ultimate" },
  "track": { "slug": "spa-francorchamps", "name": "Spa-Francorchamps" },
  "trackLayout": { "name": "Grand Prix" },
  "car": { "slug": "ferrari-499p", "name": "Ferrari 499P" },
  "carClass": { "slug": "hypercar", "name": "Hypercar" },
  "sessionType": "RACE",
  "isOnline": true,
  "serverName": "URX Pro League",
  "finalPosition": 3,
  "totalLaps": 34,
  "validLaps": 34,
  "bestLapMs": 121742,
  "avgLapMs": 123100.5,
  "medianLapMs": 122980,
  "idealLapMs": 121400,
  "stdDevMs": 890.2,
  "consistencyScore": 87.3,
  "safetyScore": 95.0,
  "dropOffMs": 620,
  "isNewPB": false,
  "weather": "clear",
  "laps": [
    {
      "lapNumber": 1,
      "lapTimeMs": 124500,
      "isValid": true,
      "isPersonalBest": false,
      "sector1Ms": 38500,
      "sector2Ms": 48200,
      "sector3Ms": 37800
    }
  ],
  "participants": [...],
  "incidents": [...],
  "penalties": [...],
  "pitStops": [...],
  "notes": [...]
}
```

**Errors:** `NOT_FOUND`, `FORBIDDEN`

---

### DELETE /api/sessions/[id]
Soft-delete a session.

---

### PATCH /api/sessions/[id]
Update mutable session fields.

**Request:**
```json
{
  "isPublic": true
}
```

---

## Track Endpoints

### GET /api/tracks
List all tracks the user has driven at.

**Response 200:**
```json
{
  "tracks": [
    {
      "slug": "spa-francorchamps",
      "name": "Spa-Francorchamps",
      "country": "BE",
      "sessionCount": 12,
      "bestLapMs": 121742,
      "lastSessionDate": "2025-06-04T10:00:00Z"
    }
  ]
}
```

---

### GET /api/tracks/[slug]
Full analytics for a specific track.

**Response 200:**
```json
{
  "track": { "slug": "...", "name": "...", "country": "...", "lengthM": 7004 },
  "stats": {
    "totalSessions": 12,
    "totalLaps": 204,
    "bestLapMs": 121742,
    "bestLapCar": { "slug": "ferrari-499p", "name": "Ferrari 499P" },
    "avgConsistency": 84.2,
    "avgSafety": 91.0,
    "idealLapMs": 121400
  },
  "pbBycar": [
    { "car": { "slug": "...", "name": "..." }, "bestLapMs": 121742 }
  ],
  "sessions": [...],
  "pbHistory": [
    { "date": "2025-05-01", "bestLapMs": 123500 },
    { "date": "2025-06-04", "bestLapMs": 121742 }
  ]
}
```

---

## Car Endpoints

### GET /api/cars
### GET /api/cars/[slug]

Same pattern as tracks.

---

## Session Notes Endpoints

### POST /api/sessions/[id]/notes
```json
{ "content": "Struggled with oversteer in sector 2", "tags": ["oversteer", "setup"] }
```

### GET /api/sessions/[id]/notes
### PATCH /api/sessions/[id]/notes/[noteId]
### DELETE /api/sessions/[id]/notes/[noteId]

---

## Goals Endpoints

### GET /api/goals
### POST /api/goals
### PATCH /api/goals/[id]
### DELETE /api/goals/[id]

---

## Achievements Endpoints

### GET /api/achievements
Returns all achievements with user progress.

**Response 200:**
```json
{
  "achievements": [
    {
      "slug": "first-import",
      "name": "First Import",
      "description": "Import your first session",
      "category": "general",
      "rarity": "COMMON",
      "progress": 100,
      "unlockedAt": "2025-06-04T10:00:00Z"
    }
  ]
}
```

---

## Profile Endpoints

### GET /api/profile
Returns the current user's driver profile with cached stats.

### PATCH /api/profile
Update profile fields (displayName, country, bio, simulatorSlugs, isPublic).

---

## Setup Endpoints

### GET /api/setups
### POST /api/setups
### GET /api/setups/[id]
### PATCH /api/setups/[id]
### DELETE /api/setups/[id]
### POST /api/setups/[id]/versions
### POST /api/sessions/[id]/setups (link setup to session)

---

## Dashboard Endpoint

### GET /api/dashboard
Returns all data needed for the dashboard in one request.

**Response 200:**
```json
{
  "profile": {
    "totalSessions": 47,
    "totalLaps": 1203,
    "totalDriveTimeSec": 295200,
    "uniqueTracks": 12,
    "uniqueCars": 5
  },
  "scores": {
    "consistency": 84.2,
    "safety": 91.0,
    "pace": 72.5
  },
  "recentSessions": [...],
  "weeklyActivity": [
    { "week": "2025-W22", "sessionCount": 3 },
    { "week": "2025-W23", "sessionCount": 5 }
  ],
  "recentPBs": [...],
  "activeGoals": [...],
  "recentAchievements": [...],
  "insights": [
    "Your consistency improved 8 points this month",
    "Spa-Francorchamps is your most-driven circuit"
  ]
}
```

---

## Future Endpoints (Phase 6+)

```
POST   /api/coach/conversations          Create new conversation
GET    /api/coach/conversations          List conversations
GET    /api/coach/conversations/[id]     Get conversation with messages
POST   /api/coach/conversations/[id]/messages   Send message

GET    /api/rankings/track/[slug]        Community leaderboard
GET    /api/teams                        User's teams
POST   /api/teams                        Create team
POST   /api/teams/[id]/members/invite    Invite member

POST   /api/webhooks/discord/[id]/test   Test Discord webhook
```
