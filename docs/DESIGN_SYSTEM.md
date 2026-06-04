# UrApex — Design System

> This document defines the visual language of UrApex.
> All UI decisions should be consistent with these guidelines.
> The implementation uses TailwindCSS + shadcn/ui.

---

## Design Principles

1. **Data first.** Numbers and metrics are the hero. Design should make data legible, not decorate it.
2. **Dark by default.** Sim racing happens in dark rooms. Dark UI is natural and reduces eye strain.
3. **Technical but not cold.** Data-heavy but approachable. Professional but not corporate.
4. **Speed implies performance.** Visual language should evoke precision and speed — not game aesthetics.
5. **Density without clutter.** Show a lot of information without overwhelming. Use hierarchy.

---

## Color Palette

### Base Colors

```
Background (darkest)     #09090B    zinc-950
Surface (cards, panels)  #18181B    zinc-900
Border                   #27272A    zinc-800
Muted text               #71717A    zinc-500
Body text                #A1A1AA    zinc-400
Primary text             #FAFAFA    zinc-50
```

### Accent Colors

```
Primary (cyan/speed)     #06B6D4    cyan-500
Primary hover            #0891B2    cyan-600
Primary muted            #164E63    cyan-950   (for badges, backgrounds)

Orange (performance)     #F97316    orange-500
Orange hover             #EA580C    orange-600
Orange muted             #431407    orange-950
```

### Semantic Colors

```
Success (green)          #22C55E    green-500
Warning (yellow)         #EAB308    yellow-500
Danger (red)             #EF4444    red-500
Info (blue)              #3B82F6    blue-500
```

### Score Colors (0–100)

| Range | Color | Meaning |
|---|---|---|
| 90–100 | `#22C55E` green-500 | Excellent |
| 75–89 | `#84CC16` lime-500 | Good |
| 60–74 | `#EAB308` yellow-500 | Average |
| 40–59 | `#F97316` orange-500 | Below average |
| 0–39 | `#EF4444` red-500 | Poor |

---

## Typography

### Font Families

```css
/* UI Text */
font-family: 'Inter', system-ui, sans-serif;

/* Monospace (times, telemetry, code) */
font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
```

### Type Scale (Tailwind)

| Name | Class | Size | Weight | Use |
|---|---|---|---|---|
| Display | `text-3xl font-bold` | 30px | 700 | Page titles |
| Heading 1 | `text-2xl font-semibold` | 24px | 600 | Section headings |
| Heading 2 | `text-xl font-semibold` | 20px | 600 | Card headers |
| Heading 3 | `text-lg font-medium` | 18px | 500 | Sub-sections |
| Body | `text-sm` | 14px | 400 | Default text |
| Small | `text-xs` | 12px | 400 | Labels, captions |
| Mono | `font-mono text-sm` | 14px | 400 | Times, IDs |
| Mono Large | `font-mono text-2xl font-bold` | 24px | 700 | Lap times, hero metrics |

### Lap Time Display
Lap times are always displayed in `MM:SS.mmm` format using monospace font.

```
1:48.321    ← race-pace times
2:04.127    ← sector or short-circuit times

Component: <LapTimeDisplay ms={108321} />
Output: "1:48.321"
```

---

## Spacing

Follow Tailwind's spacing scale. Key values:

| Value | px | Use |
|---|---|---|
| `p-2` | 8px | Tight padding (badges, small elements) |
| `p-4` | 16px | Default card padding |
| `p-6` | 24px | Loose card padding |
| `gap-4` | 16px | Default grid/flex gap |
| `gap-6` | 24px | Section gap |
| `mb-8` | 32px | Section separator |

---

## Borders & Radius

```
Default border:   border border-zinc-800
Card border:      border border-zinc-800/60
Radius — small:   rounded-md  (6px)   — buttons, badges
Radius — card:    rounded-lg  (8px)   — cards, panels
Radius — large:   rounded-xl  (12px)  — modals, large surfaces
```

---

## Shadows

Dark UI uses subtle shadows. Prefer border-based elevation over box-shadow.

```
Card:     shadow-sm  +  border border-zinc-800
Modal:    shadow-xl
Dropdown: shadow-lg
```

---

## Components

### Stat Card

```
╔════════════════════════════╗
║  Icon  Label               ║
║                            ║
║  [large number / metric]   ║
║  [sub-label or delta]      ║
╚════════════════════════════╝
```

Props: icon, label, value, delta (optional), deltaLabel (optional)

Delta colors:
- Positive (improvement) → green
- Negative (regression) → red
- Neutral → muted

---

### Session Card (list view)

```
╔══════════════════════════════════════╗
║  [SimBadge]  Track Name  [TypeBadge] ║
║  Car Name · Date                     ║
║  ─────────────────────────────────   ║
║  P3  ·  34 laps  ·  1:48.321  ·  ◉87║
╚══════════════════════════════════════╝
```

---

### Score Badge

Circular badge or pill showing a 0–100 score with color.

```
Consistency   [87]   ← cyan if good
Safety        [95]   ← green if excellent
Pace          [62]   ← yellow if average
```

---

### Session Type Badge

```
[RACE]         bg-orange-950 text-orange-400
[QUALIFYING]   bg-cyan-950 text-cyan-400
[PRACTICE]     bg-zinc-800 text-zinc-400
[HOTLAP]       bg-purple-950 text-purple-400
```

---

### Simulator Badge

```
[LMU]     blue
[ACC]     orange
[iRacing] teal
```

---

### Import Status Badge

```
[PENDING]   yellow, spinner icon
[PARSING]   blue, spinner icon
[IMPORTED]  green, checkmark
[FAILED]    red, x icon
[DUPLICATE] muted, copy icon
```

---

## Charts

All charts use Recharts. Design rules:

| Setting | Value |
|---|---|
| Background | transparent |
| Grid lines | `#27272A` (zinc-800) dashed |
| Tooltip background | `#18181B` (zinc-900) with border |
| Axis labels | `#71717A` (zinc-500), size 12 |
| Primary line | `#06B6D4` (cyan-500) |
| Secondary line | `#F97316` (orange-500) |
| PB marker | `#22C55E` (green-500) star/dot |
| Invalid lap | `#EF4444` (red-500) hollow dot |
| Stroke width | 2px lines, 1px axes |

### Chart Types Used

| Chart | Used for | Component |
|---|---|---|
| Line | Lap times per session | `LapTimeChart` |
| Line | PB evolution over time | `ProgressChart` |
| Bar | Sessions per week | `WeeklyChart` |
| Bar | Sector comparison | `SectorChart` |
| Area | Score evolution over time | `ScoreChart` |
| Radar | Driver DNA (scores) | `DriverDNAChart` |
| Custom | Telemetry traces | `TelemetryChart` (Phase 4) |

---

## Layout

### App Layout

```
╔══════════════════════════════════════════════╗
║  [Logo]   UrApex          [Search] [Avatar]  ║  ← Header (64px)
╠════════╦═════════════════════════════════════╣
║        ║                                     ║
║  NAV   ║         MAIN CONTENT                ║
║        ║                                     ║
║  Dash  ║   Page title                        ║
║  Upload║   ─────────────────                 ║
║  Sess  ║   Content                           ║
║  Tracks║                                     ║
║  Cars  ║                                     ║
║  Goals ║                                     ║
║  Achiev║                                     ║
║  Setups║                                     ║
║        ║                                     ║
║  ───── ║                                     ║
║  Settin║                                     ║
╚════════╩═════════════════════════════════════╝
     ↑
  240px sidebar
```

### Grid

Most content uses a 12-column grid.

- Dashboard stats: 4 cols × 3 cards (or 5 cards with 2+3 layout)
- Session detail: 8-col main + 4-col sidebar
- Full-width tables: 12 cols

---

## Empty States

Every empty state must:
1. Explain what would be shown here
2. Explain why it's empty
3. Provide a clear action

```
╔═══════════════════════════════╗
║                               ║
║   [icon]                      ║
║                               ║
║   No sessions yet             ║
║   Import your first XML file  ║
║   to start tracking progress. ║
║                               ║
║   [  Upload your first file  ]║
║                               ║
╚═══════════════════════════════╝
```

---

## Loading States

Use skeleton components for loading, not spinners (except for inline actions).

Rules:
- Match the shape of the content (card skeleton, table row skeleton)
- Use `animate-pulse` from Tailwind
- Show for a maximum of 3 seconds — if data takes longer, something is wrong

---

## Responsive Design

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Sidebar hidden, hamburger menu |
| Tablet | 768–1024px | Compact sidebar (icons only) |
| Desktop | > 1024px | Full sidebar with labels |

Priority: Desktop first (sim racers race at a desktop PC). Mobile is functional but not the primary experience.

---

## Accessibility

- All interactive elements must be keyboard navigable
- Color is not the only indicator (use icons + color for status)
- Minimum contrast ratio: 4.5:1 for text
- All images have alt text
- Form inputs have labels
- Error messages are descriptive

---

## Motion

- Transitions: `duration-150 ease-out` for most
- Page transitions: `duration-200`
- No animations that cannot be disabled (respect `prefers-reduced-motion`)
- Avoid bouncy/playful animations — this is a professional tool

---

## Naming Conventions (CSS Classes)

Follow Tailwind conventions. Custom components:

```
// Feature-specific class patterns
.session-card
.lap-time-display
.score-badge
.sim-badge
.session-type-badge
.import-status

// Use CSS variables for dynamic values (scores, delta colors)
style={{ '--score-color': scoreToColor(score) }}
```
