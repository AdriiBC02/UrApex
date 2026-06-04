# UrApex — AI Coach Architecture

> Design document for the AI Coach feature (Phase 6).
> Covers context building, prompting strategy, response types, and cost management.

---

## Status

**Phase:** 6 (not yet started)
**Dependencies:** Phases 1–5 must be complete — the coach needs real data to be useful.

---

## Philosophy

The AI Coach is only valuable if it cites real data. A generic response like "improve your braking consistency" is useless. A good response says:

> "In your last 4 races at Spa, your sector 2 time varies between 47.1s and 48.3s — a spread of 1.2 seconds. This inconsistency in sector 2 is your biggest opportunity. Focus your next 3 practice sessions on the Raidillon complex specifically."

This means:
1. The context builder must send precise, relevant data
2. The prompt must instruct the model to always cite numbers
3. The response format must be structured and readable

---

## Model Selection

| Model | Use case | Cost (input/output per 1M tokens) |
|---|---|---|
| claude-haiku-4-5 | Quick analysis, simple questions | ~€0.25 / €1.25 |
| claude-sonnet-4-6 | Deep analysis, training plans | ~€3 / €15 |
| claude-opus-4-8 | Complex coaching, edge cases | ~€15 / €75 |

**Strategy:** Use Haiku for quick analyses and follow-ups, Sonnet for deep analyses and training plans. Never use Opus in real-time — reserve for batch analysis if needed.

---

## Context Builder

The context builder assembles a structured snapshot of the user's data, passed as the system prompt:

```typescript
interface CoachContext {
  driver: {
    displayName: string
    totalSessions: number
    totalLaps: number
    driveTimeSec: number
  }
  scores: {
    consistency: number | null
    safety: number | null
    pace: number | null
    racecraft: number | null
  }
  activeGoals: Goal[]
  recentSessions: SessionSummary[]  // Last 10
  trackHighlights: TrackHighlight[] // Top 5 most-driven
  carHighlights: CarHighlight[]     // Top 5 most-driven
  recentPBs: PBRecord[]
  weakSpots: WeakSpot[]             // Tracks/areas with worst performance
}

interface SessionSummary {
  date: string
  track: string
  car: string
  type: string
  position: number | null
  laps: number
  bestLapMs: number | null
  avgLapMs: number | null
  consistencyScore: number | null
  safetyScore: number | null
  isNewPB: boolean
  incidents: number
  dropOffMs: number | null
}
```

### Context Size Management

Claude's context window is large, but sending too much data increases cost. Strategy:

| Data type | Amount to include |
|---|---|
| Recent sessions | Last 10 (summary only, not all laps) |
| Track stats | Top 5 circuits by session count |
| Car stats | Top 5 cars by session count |
| Specific track (if asked) | Full session list + lap stats |
| Telemetry (Phase 4+) | Best lap channel summary (not all samples) |
| Notes | Last 3 session notes |

Use prompt caching for the user context (static portion that doesn't change per message within a conversation).

---

## Prompt Architecture

### System Prompt (cached)

```
You are the UrApex AI Coach, a specialized sim racing performance analyst.
You help drivers understand their data, identify areas for improvement, 
and create actionable training plans.

Rules:
1. ALWAYS cite specific numbers from the driver's data. Never give generic advice.
2. Be concise but specific. One paragraph per key point.
3. Use racing terminology correctly.
4. When data is insufficient, say so and ask for more sessions.
5. Never compare the driver negatively to others unless asked.
6. Prioritize actionable recommendations over analysis.

Driver Context:
{context_json}
```

### User Turn Examples

```
"Analyze my last race at Spa"
→ Fetch last RACE session at Spa-Francorchamps
→ Add to context: full lap breakdown, sector times, incidents

"What should I practice this week?"
→ Fetch weak spots, active goals, last 7 days of sessions
→ Generate specific training plan

"Am I improving?"
→ Fetch last 30 days vs previous 30 days, score trends, PB count

"Compare my two last sessions at Monza"
→ Fetch those 2 sessions with full detail
→ Compare metrics side by side
```

---

## Response Templates

### Quick Analysis
```
Session: [Track] · [Date] · [Type]
Best lap: [time] (personal [best/worst/average] at this track)
Avg lap: [time] · Consistency: [score]

Key observation: [specific data-backed insight]
Recommendation: [actionable next step]
```

### Deep Analysis
```
## [Track] Race Analysis — [Date]

### Performance Summary
[3-4 sentences with specific numbers]

### Strengths
- [Specific positive backed by data]
- [Another positive]

### Areas for Improvement
- [Specific weakness backed by data]
- [Another weakness]

### Recommendations
1. [Specific, actionable recommendation]
2. [Another recommendation]
3. [Another recommendation]

### Next Session Goals
- Target best lap: [time] (improvement of [Xms] from current PB)
- Focus area: [specific corner/sector]
```

### Training Plan
```
## Weekly Training Plan — [Date range]

Based on your data, your current weak areas are:
- [Weakness 1 with data]
- [Weakness 2 with data]

### Monday
- Circuit: [Track]
- Car: [Car]
- Session type: [Practice / Hotlap / Race]
- Focus: [Specific objective]
- Target: [Measurable outcome]

### Wednesday
...

### Notes
[Specific advice based on their patterns]
```

---

## Credit System

Each request costs credits based on the response type:

| Request type | Credits | Model used |
|---|---|---|
| Quick question (< 200 token response) | 1 | Haiku |
| Session analysis | 2 | Haiku |
| Deep analysis | 3 | Sonnet |
| Training plan | 5 | Sonnet |
| Telemetry analysis | 5 | Sonnet |

### Credit Allocation by Plan

| Plan | Monthly credits | Rollover |
|---|---|---|
| Free | 5 | No |
| Pro | 30 | No |
| Team | 100 (shared) | No |

### Credit Tracking

```prisma
model CoachUsage {
  id        String   @id @default(cuid())
  userId    String
  messageId String   // FK → CoachMessage
  credits   Int
  model     String   // "claude-haiku-4-5" | "claude-sonnet-4-6"
  tokens    Int      // actual tokens used (for cost monitoring)
  createdAt DateTime @default(now())
}
```

---

## Conversation History

Conversations are persisted and can be resumed:

```
CoachConversation
  ├── id
  ├── userId
  ├── title (auto-generated from first message)
  └── messages:
        ├── CoachMessage { role: "user", content: "Analyze my last race..." }
        ├── CoachMessage { role: "assistant", content: "...", context: {...} }
        └── CoachMessage { role: "user", content: "What about sector 2?" }
```

The `context` field on assistant messages stores a snapshot of the data used. This enables:
- Debugging why a response said something
- Understanding if the context was stale
- User ability to see "what data was the coach looking at?"

---

## Streaming Implementation

Use Claude's streaming API to start showing the response immediately:

```typescript
// server action or route handler
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: buildSystemPrompt(context),
  messages: conversationHistory,
})

// Stream to client via Server-Sent Events or ReadableStream
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    yield chunk.delta.text
  }
}
```

---

## Privacy Considerations

- User data sent to Claude API is subject to Anthropic's privacy policy
- Users must consent to AI data processing (onboarding or settings)
- Data sent to Claude: performance stats and lap times (not PII beyond name)
- No session notes are sent without explicit user consent
- Anonymize or remove personal data before sending to API
- Allow users to opt out of AI features entirely

---

## Post-Session Auto-Analysis

When enabled, the coach automatically generates a short analysis after each session import:

```typescript
async function generateAutoInsight(sessionId: string): Promise<string> {
  const session = await fetchSessionDetail(sessionId)
  const context = await buildMinimalContext(session.userId, sessionId)
  
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',  // Cheap, fast
    max_tokens: 300,
    system: AUTO_INSIGHT_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Generate a 2-3 sentence insight about this session. Be specific and cite numbers.`
    }],
  })
  
  return response.content[0].text
}
```

This is shown as the "Quick insight" card on the dashboard and session detail.

---

## Implementation Checklist (Phase 6)

- [ ] Anthropic SDK integration
- [ ] Context builder service
- [ ] System prompt templates
- [ ] Streaming API route
- [ ] Chat UI (streaming display)
- [ ] Conversation persistence
- [ ] Credit tracking + enforcement
- [ ] Post-session auto-analysis
- [ ] Response templates for each request type
- [ ] User consent UI (settings)
- [ ] Prompt caching for context
- [ ] Rate limiting (prevent abuse)
- [ ] Cost monitoring dashboard (admin)
