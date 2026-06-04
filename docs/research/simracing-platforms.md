# UrApex — Sim Racing Ecosystem Overview

> Reference document for understanding the sim racing ecosystem.
> Helps make informed product decisions without relying on assumptions.

---

## Key Simulators

### Le Mans Ultimate (LMU)
- **Developer:** Studio 397 / Motorsport Games
- **Engine:** rFactor 2 (modified)
- **Licence:** FIA World Endurance Championship (WEC), Le Mans
- **Cars:** Hypercar, LMP2, GTE (as of 2024)
- **Tracks:** WEC calendar (Spa, Le Mans, Monza, Fuji, etc.)
- **Result files:** XML format (rFactor 2 compatible)
- **Telemetry:** Motion files (rFactor 2 format)
- **Phase 1 target** ← UrApex starts here

**Known XML fields (to be confirmed in Phase 0):**
- Session type, date, track name, layout
- Driver name, car name, car class
- Lap times per driver
- Sector times (if available)
- Final positions
- Pit stops (if recorded)

---

### Assetto Corsa Competizione (ACC)
- **Developer:** Kunos Simulazioni
- **Engine:** Unreal Engine 4
- **Licence:** GT World Challenge (GTWC), Intercontinental GT Challenge
- **Cars:** GT3, GT4 classes
- **Tracks:** GTWC calendar
- **Result files:** JSON format (`.json`)
- **Telemetry:** MoTeC format + Motion files
- **Phase 7 target**

**Result JSON structure:**
```json
{
  "sessionType": "R",
  "trackName": "spa",
  "sessionResult": {
    "leaderBoardLines": [
      {
        "car": { "carModel": 14, "teamName": "..." },
        "currentDriver": { "firstName": "...", "lastName": "..." },
        "timing": { "lastLap": 141742, "bestLap": 139500, "lapCount": 25 }
      }
    ]
  },
  "laps": [...]
}
```

---

### iRacing
- **Developer:** iRacing.com
- **Engine:** Proprietary
- **Licence:** Multiple (NASCAR, F1, IndyCar, GT, etc.)
- **Result files:** JSON via iRacing API, IBT telemetry files
- **Phase 7 target**

---

### rFactor 2
- **Developer:** Studio 397
- **Engine:** rFactor 2 (same as LMU)
- **Result files:** XML (same format as LMU)
- **Phase 7 target**
- **Note:** LMU parser will likely work for rF2 with minor modifications

---

### RaceRoom Racing Experience (R3E)
- **Developer:** KW Studios
- **Result files:** TBD
- **Phase 7+ target**

---

### Automobilista 2 (AMS2)
- **Developer:** Reiza Studios
- **Engine:** Madness Engine (Project CARS 2)
- **Result files:** TBD
- **Phase 7+ target**

---

### Assetto Corsa (AC)
- **Developer:** Kunos Simulazioni
- **Result files:** CSV + INI hybrid
- **Telemetry:** Motec + custom plugins
- **Phase 7+ target**

---

## Common Result File Formats

| Format | Used by | Notes |
|---|---|---|
| XML (rF2 style) | LMU, rF2 | Well-structured, predictable |
| JSON | ACC, iRacing | Compact, easy to parse |
| CSV + INI | AC | Simple but limited |
| IBT binary | iRacing | Requires binary parser, rich telemetry |
| MoTeC | ACC, various | Industry standard telemetry format |

---

## Typical XML Data Fields (rF2/LMU)

> To be validated in Phase 0 with real files.

**Session level:**
- `TrackName` / `Track` / `TrackCode`
- `Layout`
- `Date` / `Timestamp`
- `Session` (Practice/Qualifying/Race)
- `OnlineSession` (boolean)
- `ServerName`
- `AmbientTemp`, `TrackTemp`
- `Weather`, `SkyConditions`

**Driver / Car level:**
- `Driver` (name)
- `Team`
- `Vehicle` (car model)
- `CarClass`
- `FinishPos` / `Position`
- `Laps` (total)
- `BestLapTime`
- `DNF`, `DQ` flags

**Per-lap level:**
- `LapTime` (total)
- `Sector1`, `Sector2`, `Sector3`
- `Valid` / `InValid` flag
- `Fuel` (remaining)
- `TireCompound`

**Race grid:**
- All participants with positions, lap counts, best laps

---

## Session Types in Sims

| Sim | Practice | Qualifying | Race | Hotlap | Notes |
|---|---|---|---|---|---|
| LMU | ✓ | ✓ | ✓ | ✓ | |
| ACC | ✓ | ✓ | ✓ | - | No native hotlap mode |
| iRacing | ✓ | ✓ | ✓ | ✓ | Time trial mode |
| rF2 | ✓ | ✓ | ✓ | ✓ | Same as LMU |

---

## Common Track Naming Inconsistencies

Different sims may use different names for the same track. Examples:

| Track | LMU name | ACC name | rF2 name |
|---|---|---|---|
| Spa-Francorchamps | `Spa-Francorchamps` | `spa` | `Spa` |
| Circuit de la Sarthe | `Le Mans` | `lemans` | `Le Mans 24H` |
| Autodromo Nazionale Monza | `Monza` | `monza` | `Monza` |

This is why the TrackAlias table is essential.

---

## Sim Racing Community Platforms

| Platform | Focus | Size | Notes |
|---|---|---|---|
| Reddit r/simracing | General discussion | 500k+ | Good for user research |
| Discord (sim-specific) | Community hubs | Variable | Each sim has official Discord |
| RaceDepartment | Modding + content | Large | Also hosts leagues |
| iRacing forums | iRacing specific | Large | Official forum |
| SimGrid | Leagues and events | Medium | League management |
| Facebook Groups | Casual community | Large | Less technical |

---

## Hardware Context

Most sim racers use:
- **Wheel + pedals** (entry: Logitech G29/G923, mid: Fanatec CSL, high: Fanatec DD, Simagic, Moza)
- **Desktop PC** (Windows 10/11 dominant)
- **Single or triple monitors** or VR headset

**Implication:** UrApex is a desktop web app primarily, accessed on the same PC used for racing. Mobile is secondary.

---

## Telemetry Formats (Phase 4 research)

| Format | Used by | Notes |
|---|---|---|
| MoTeC i2 | ACC, others | Binary, needs specific parser |
| MotionFile (.veh) | rF2, LMU | CSV-like, per-channel files |
| IBT | iRacing | Binary, well-documented |
| CSV via plugin | AC, others | Easy to parse, limited channels |

**Phase 4 decision:** Start with LMU's native telemetry format (MotionFile or equivalent). Research exact format in Phase 4.

---

## Research TODOs

- [ ] Obtain and analyze 5+ LMU XML files (Phase 0)
- [ ] Document exact XML schema from real files
- [ ] Find LMU telemetry file format documentation
- [ ] Join LMU Discord to understand community needs
- [ ] Survey 10 real sim racers about their data habits
- [ ] Test what data is available in offline vs online sessions
- [ ] Test what fields vary between LMU versions
