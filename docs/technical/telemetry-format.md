# UrApex — Telemetry File Formats

> Research document for Phase 4 — Telemetry.
> Documents known formats, channels, and storage strategy.
> Most content is placeholder — to be filled in during Phase 0/4 research.

---

## Status

**Phase:** 4 (not yet started)
**Current knowledge:** Preliminary — needs validation with real files

---

## Le Mans Ultimate — Telemetry Format

### Format Overview

LMU is based on rFactor 2. Its telemetry output format is based on rFactor 2's plugin system.

**Known output methods:**
1. **MotionFile plugin** — exports per-channel CSV/binary files
2. **Real-time UDP broadcast** — for live dashboards (not relevant for UrApex)
3. **Third-party plugins** — MoTeC, SimHub, etc.

> **TODO (Phase 4):** Identify which telemetry file format LMU creates natively and where it is saved.

### Potential File Locations

```
Windows:
C:\Users\{user}\Documents\Le Mans Ultimate\UserData\Log\{session}\

Possible files:
- *.veh (vehicle data)
- *.bin (binary telemetry)
- *.csv (channel data)
```

### Expected Channels

Based on rF2 telemetry documentation:

| Channel | Unit | Notes |
|---|---|---|
| Time | seconds | Elapsed session time |
| LapDist | meters | Distance into current lap |
| LapTime | seconds | Current lap time |
| Speed | m/s → km/h | Convert for display |
| Throttle | 0–1 | Throttle position |
| Brake | 0–1 | Brake pressure |
| Steering | -1 to +1 | Steering angle (normalized) |
| Gear | integer | Current gear |
| RPM | integer | Engine RPM |
| FuelLevel | liters | |
| TireTempFL/FR/RL/RR | Celsius | Tyre temperatures |
| BrakeTempFL/FR/RL/RR | Celsius | Brake temperatures |
| Lat / Long | degrees | GPS position (if available) |
| X / Y / Z | meters | 3D position on track |
| Yaw / Pitch / Roll | radians | Vehicle orientation |

---

## Assetto Corsa Competizione — Telemetry Format

ACC uses MoTeC i2 format (.ld files) by default, or custom formats via plugins.

**File location (Windows):**
```
C:\Users\{user}\Documents\Assetto Corsa Competizione\MoTeC\
```

**Format:** Binary .ld + .ldx files (MoTeC format)

**Parsing:** Requires MoTeC SDK or a third-party parser library.

> **TODO (Phase 4+):** Evaluate open-source Python/TypeScript parsers for .ld format.

---

## iRacing — IBT Format

iRacing uses its own binary telemetry format (.ibt files).

**File location:**
```
C:\Users\{user}\Documents\iRacing\telemetry\
```

**Format:** Binary with a known, documented header structure.

**Parsing:** Well-documented, many open-source parsers available in Python, C#.

---

## Telemetry Storage Strategy

### Challenge
A 24-hour endurance race at 100Hz sampling rate would produce:
- 86,400 seconds × 100 samples = 8.64M rows
- At ~10 bytes per row (10 channels) = ~86MB per session

This is too large to store as-is for a web app.

### Solution: Downsampling

Store telemetry at reduced sampling rates based on purpose:

| Use case | Sampling rate | Storage per 1h session |
|---|---|---|
| Full precision | 100Hz | ~36MB |
| Race overview | 10Hz | ~3.6MB |
| Quick preview | 1Hz | ~360KB |

**Strategy for UrApex Phase 4:**
- Import at source rate
- Downsample to **10Hz** for storage (sufficient for visual traces)
- Store **1Hz** summary for overview charts
- Keep **full rate** per-lap for best 5 laps (for detailed comparison)

### Database Approach

```prisma
model TelemetryFile {
  id          String @id
  sessionId   String
  lapNumber   Int?    // null = full session
  storagePath String  // path to binary/parquet file
  channels    String[] // ["speed", "throttle", "brake", ...]
  sampleRate  Int     // samples per second (stored)
  lapCount    Int
  duration    Float   // seconds
}
```

**Storage format options:**
- **Parquet** — columnar, compressed, excellent for analytics
- **CSV.gz** — simple, universal, less efficient
- **MessagePack** — binary, fast, smaller than JSON

**Recommendation:** Parquet via `@duckdb/node-api` for queries, or simple columnar arrays in JSON.gz for Phase 4 MVP.

---

## Telemetry Visualization Requirements

### Lap-by-Distance View

```
Y-axis: speed (km/h)       or throttle (%) or brake (%)
X-axis: lap distance (m)   normalized 0 → track length

Lap A: ─────────────── (cyan)
Lap B: · · · · · · · · (orange dashed)
Delta: ─ ─ ─ ─ ─ ─ ─ ─ (green/red, secondary Y)
```

### Delta Chart

```
Y-axis: time delta (seconds)
X-axis: lap distance

Positive = Lap A is ahead
Negative = Lap B is ahead

Color: green when A is faster, red when B is faster
```

### Track Map

```
2D projection of GPS/XYZ coordinates
Color-coded by:
  - Speed (blue=slow, red=fast)
  - Brake application
  - Throttle application
  - Gear
```

---

## Phase 4 Scope Decision

Based on complexity and storage costs, Phase 4 will:

**Include:**
- Upload telemetry file for a session
- Extract: speed, throttle, brake, steering, gear, RPM
- Store at 10Hz (downsampled)
- Lap-by-distance chart
- Two-lap comparison with delta overlay

**Defer to Phase 5+:**
- Track map with trazada
- Full tyre temperature channels
- Fuel burn analysis
- Automatic braking zone detection

---

## Research TODOs (Phase 4 prep)

- [ ] Identify exact telemetry file format for LMU (find documentation or community resources)
- [ ] Find file save location on Windows for LMU telemetry
- [ ] Build a minimal parser for the LMU telemetry format
- [ ] Evaluate Parquet vs JSON.gz for channel storage
- [ ] Estimate storage costs at scale (1000 users, 5 sessions/week each)
- [ ] Evaluate DuckDB for in-process telemetry queries
- [ ] Assess whether telemetry data fits within Vercel serverless limits
