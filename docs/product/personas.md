# UrApex — User Personas

> These personas represent real archetypes of sim racing users.
> They guide product decisions, UX priorities, and communication style.
> Every feature decision should ask: "How does this help one of these personas?"

---

## Persona 1 — The Improver

**Name:** Carlos, 28
**Location:** Spain
**Job:** Software engineer
**Sims used:** Le Mans Ultimate (primary), ACC (occasional)
**Experience:** 3 years of sim racing, league competitor

### Background
Carlos races 3–4 times per week. He is already decent — he finishes mid-pack in his league — but he knows he's not extracting everything from himself. He's tried analyzing his replays but it takes too long. He wishes he had objective data that told him "you're slower in sector 2" or "your pace drops after lap 10."

### Goals
- Reduce his best lap time by 0.5s at Spa
- Understand why his race pace is slower than in practice
- Stop losing positions to people he's faster than in qualifying

### Pain Points
- No single tool shows him his progression over months
- He knows he has race data but it's just sitting in XML files he never reads
- He does manual spreadsheets that take forever to update

### How He Uses UrApex
1. Finishes a session → drops XML on UrApex
2. Looks at consistency score and drop-off metric
3. Sets a goal for next week ("beat 2:00 at Spa")
4. Checks if he hit any new PBs
5. Reads his session note from last time to see what to focus on

### Key Metrics He Cares About
- Best lap (vs historical PB)
- Drop-off (does my pace fall apart in long stints?)
- Sector breakdown (where am I losing time?)

### Quote
> "I know I'm losing time somewhere. I just don't know where."

---

## Persona 2 — The League Racer

**Name:** Emma, 32
**Location:** Germany
**Job:** Graphic designer
**Sims used:** Le Mans Ultimate (serious), iRacing (leagues)
**Experience:** 5 years, competes in organized leagues

### Background
Emma races in two different leagues and takes it seriously enough to prepare for each round. She watches onboards, studies setup guides, and practices every week. She wants to be able to show her team data from her practice sessions to justify setup decisions.

### Goals
- Prepare systematically for each league round
- Share practice data with her team
- Track which setups worked at which tracks

### Pain Points
- Her setups are scattered in random folders
- She can't prove to herself (or her team) which setup was actually faster
- She has no record of what she practiced or learned

### How She Uses UrApex
1. Creates a setup entry for each setup she tests
2. Links setups to sessions to see which one produced better laps
3. Creates goals for each league round
4. Uses session notes to record setup feedback ("oversteer in T1, try softer front ARB")
5. Will eventually share sessions with her team (Phase 7)

### Key Metrics She Cares About
- Best lap by setup
- Sector breakdown
- Consistency across a long stint
- Setup performance comparison

### Quote
> "I need to remember what worked and what didn't. Right now I just forget."

---

## Persona 3 — The Casual Analyst

**Name:** James, 41
**Location:** UK
**Job:** Data analyst
**Sims used:** iRacing (occasional), ACC (weekend warrior)
**Experience:** 2 years, races for fun

### Background
James doesn't race competitively but loves the analytical side of sim racing. He reads lap time breakdowns on YouTube and wants to understand his own data. He races once or twice a week on weekends.

### Goals
- Understand whether he's actually improving
- See interesting stats about his driving
- Have fun exploring his data

### Pain Points
- Nothing currently shows him his progression over months
- He's tried spreadsheets but gives up after a few weeks
- He wants numbers to tell him something interesting, not just confirm what he already knows

### How He Uses UrApex
1. Imports sessions after every weekend
2. Looks at the dashboard to see his overall trends
3. Explores track analytics to see his improvement chart
4. Unlocks achievements as a side source of satisfaction
5. Will use AI coach to get interesting observations about his style (Phase 6)

### Key Metrics He Cares About
- Overall stats (total laps, hours driven)
- Improvement trend charts
- Achievements (gamification)
- Anything surprising ("Your best track is Monza, not Spa like you thought")

### Quote
> "I want to know: am I actually getting better or just feeling like I am?"

---

## Persona 4 — The Team Manager (Future)

**Name:** Marco, 35
**Location:** Italy
**Job:** Race engineer (real motorsport, part-time)
**Sims used:** LMU (team with 6 drivers)
**Experience:** Expert

### Background
Marco organizes a sim racing team. He has 6 drivers of varying skill. He wants to monitor all of their performance, identify who needs coaching in which area, and compare them objectively. He currently does this manually with Excel sheets shared over Discord.

### Goals
- Dashboard for all 6 drivers in one view
- Compare drivers' consistency and safety scores
- Know who to put in which car for endurance races
- Share training recommendations with each driver

### How He Would Use UrApex (Phase 7)
1. Create a team, invite all 6 drivers
2. View team dashboard with all scores
3. See who improved the most this month
4. Use AI coach to generate personalized training plans per driver
5. Set up Discord webhook to notify team when anyone sets a PB

### Key Metrics He Cares About
- Consistency Score per driver
- Safety Score per driver (who's the "cleaner" driver?)
- Racecraft score
- Improvement trend per driver

### Quote
> "I need to know who's ready for Le Mans and who needs more practice at Spa."

---

## Anti-Personas (Not Our User)

### The Casual Gamer
- Races once a month for fun
- Not interested in improvement
- Just wants to relax
- **UrApex is too detailed for them** — they won't import anything

### The e-Sports Pro
- Has dedicated tools, engineers, and data
- Uses professional telemetry (MoTeC, Bosch)
- UrApex's target is below this level in Phase 1–3

### The Purely Social Player
- Races for the community aspect
- Doesn't care about lap times
- Just wants to chat with friends
- **Not our primary user** — community is Phase 7

---

## Persona Priority for MVP

| Persona | Priority | Reason |
|---|---|---|
| The Improver (Carlos) | P0 | Core user. Every MVP feature is for him |
| The Casual Analyst (James) | P1 | Validates analytics value |
| The League Racer (Emma) | P2 | Setup manager is Phase 3 |
| The Team Manager (Marco) | P3 | Teams is Phase 7 |
