# UrApex — Changelog

> All notable changes to UrApex are documented in this file.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

> Next up: deploy en Vercel, real LMU test on Windows (CA-016), CSV export Race Grid (AN-018), diag log cleanup, auto-update (CA-023), in-game overlay (CA-014).

---

## [0.30.0] — 2026-06-06

> Companion app — Windows runtime fixes + full visual redesign.

### Fixed
- **WebView2 x86 compatibility** — app crashed silently (no logs) because the installed WebView2 was 32-bit only (WOW6432Node registry); switched CI build target to `i686-pc-windows-msvc` so the binary finds and uses the x86 runtime
- **`plugins.store/dialog/notification: {}`** — `tauri-plugin-store` expects unit config, not an empty object; PluginInitialization panic on every launch; removed all empty plugin entries from `tauri.conf.json`
- **`plugins.fs.scope` / `plugins.shell.open`** — Tauri v1 syntax; in v2 these live in capabilities; removed stale config keys
- **`webviewInstallMode` in wrong schema level** — was inside `bundle.windows.nsis` (NsisConfig rejects unknown keys); moved to `bundle.windows`
- **Duplicate VERSION resource** — `winresource` + `tauri-build` both emitted a VERSION resource causing LNK1123; replaced with `tauri_build::WindowsAttributes::app_manifest()`; then removed the custom manifest entirely (Tauri's default already has asInvoker + Common Controls v6 + DPI)
- **TypeScript build errors** — `React.ComponentType<{size?: number}>` incompatible with `LucideProps.size: string | number`; replaced with `LucideIcon` type from lucide-react in App.tsx, Dashboard, SessionDetail, SyncLog
- **TaskDialogIndirect crash** — custom manifest had replaced Tauri's default and was missing the `Microsoft.Windows.Common-Controls v6` dependency; fixed by reverting to Tauri's default manifest
- Removed dead code: `extract_driver_names()` and `ParsedSession::all_driver_names` (compiler warnings)
- Removed stale `installer-hooks.nsh` (`$PROGRAMFILES32` is not a valid NSIS variable)
- NSIS `installMode` corrected to `perMachine` for Program Files installation

### Added
- **Tray right-click menu** — "Open UrApex" + separator + "Quit"; `app.exit(0)` on Quit; before this there was no way to close the app without Task Manager
- **Watcher auto-restart** — `watchActive` flag persisted to the plugin-store; on launch, if it was true and folder is configured, the watcher restarts automatically without user interaction
- **Watch error feedback** — inline red banner in the Sync card shows the Rust error string when `start_watching` fails (bad path, permissions, etc.)
- **Session detail error state** — when detail load fails silently, shows "Failed to load session" instead of empty panel

### Changed
- **Companion app full visual redesign** — sidebar navigation with lucide-react icons replaces 8 cramped header tabs; custom frameless titlebar with ⚡ wordmark, live WATCHING pill (animated), minimize/close window controls; window 760×580
- **Dashboard** — icon-per-stat grid using `.stat-tile`, consistency bar with color threshold, PB card with 22px lap time
- **Goals** — cards with progress %, section headers with count badges, icons for status (CheckCircle2, XCircle, CalendarDays), empty state
- **Setups** — colored tag chips (conditions/type), star pin button with fill, inline notes editor, Pinned / All sections
- **Achievements** — rarity glow/border system (Epic/Legendary box-shadow), lock overlay on locked icons, progress bars by rarity color, category filter pills, % unlocked badge
- **SyncLog** — Loader2 spinner (CSS animation) for uploading, lucide icons replace text symbols, CloudUpload empty state
- **SessionList** — session type badge (colored), cyan left border on selected row, lap time right-aligned
- **SessionDetail** — hero header with condition icons (Thermometer, Wind, Droplets, MapPin), pill sub-tabs with icon, best lap highlighted with left border, race grid with expandable per-driver laps
- **CompareView** — session A/B cards with colored left borders, metrics table with thead background, alternating lap rows
- **StatusDot** — simplified to CSS `.pulse` class, hidden when not watching
- **Settings** — grouped into LMU paths / Cloud sync / System cards, BrowseBtn component, Toggle component
- CSS design system: `--surface-2/3`, `--border-soft`, `.card`, `.btn`, `.badge`, `.stat-tile`, `.nav-item`, `.pulse`, `.spin`, select chevron, thin scrollbar
- Reduced `tauri-plugin-log` level from `Debug` to `Warn` (less noise in production log files)
- Build target changed to `i686-pc-windows-msvc`; MSI target removed (WiX doesn't support i686)
- `productName` renamed to "UrApex" throughout (was "UrApex Companion")

---

## [0.29.0] — 2026-06-05

> Achievements — 31 total (was 10), full parity web + companion.

### Added
- **31 achievements** — 21 new achievements across 6 categories: Volume, Pace, Consistency, Endurance, Race Craft, Exploration
- **Companion achievements system** — SQLite v5 migration + seed, evaluate_achievements() Rust engine, Windows notification per unlock, Achievements tab with category filter chips, rarity color coding (LEGENDARY=gold, EPIC=purple, RARE=blue), progress bars
- **New web app condition types** — `session_count`, `hours_driven`, `consistency_sessions_count`, `race_position_lte`, `race_wins_count`, `races_no_dnf_count`, `unique_tracks_count`, `unique_cars_count`, `triple_threat`
- **New achievements**: Lap Apprentice (10 laps), Committed (50 sessions), Sim Pro (200 sessions), Night Owl (10h), Time Lord (50h), Speed Chaser (5 PBs), Speed Demon (10 PBs), Rock Solid (consistency > 95), On Rails (5× consistency > 85), Marathon Man (50+ laps/session), Endurance Legend (100+ laps/session), Podium (top 3), Race Winner (P1), Hat Trick (3 wins), Iron Will (10 races no DNF), Track Explorer/Collector/World Traveler, Car Collector/Fleet Owner, Triple Threat

### Changed
- Rarity corrections: Century Driver COMMON→RARE, Road Warrior UNCOMMON→EPIC, Elite Driver RARE→LEGENDARY, Setting The Bar COMMON→UNCOMMON, Consistency King UNCOMMON→RARE, Sector Hunter RARE→EPIC
- `ImportContext` extended with `finalPosition`, `dnf`, `isOnline`, `trackId`, `durationSec`

---

## [0.28.0] — 2026-06-05

> Companion full offline parity — Compare, Setups, full Achievement groundwork.

### Added
- **Compare sessions** — ⇄ button in SessionDetail opens session picker; CompareView shows metrics side-by-side, lap-by-lap delta table (color-coded), best sector comparison
- **Setups manager** — CRUD setups with car/track/conditions/type filters, inline notes editor, favorite pin (★), sorted favorites first
- SQLite v4 migration: setups table
- 5 new Tauri commands: get_setups, create_setup, toggle_setup_favorite, update_setup_notes, delete_setup

---

## [0.27.0] — 2026-06-05

> AN-017/CA-017/CA-018 — Full race data, VCR watcher, companion Replays tab.

### Added
- **Full race data extraction (AN-017)** — LMU parser ahora extrae vueltas, sectores, combustible y compuesto de neumáticos de *todos* los pilotos de la parrilla, no solo del jugador; pit stops vinculados a cada participante desde `<Stream><PitStop>`; penalizaciones por piloto desde `<Stream><Penalty>`; condiciones: `SkyType`, `AmbientTemp`, `TrackTemp`, `Humidity`, `TrackLength`
- **`ParticipantLap` table** — nueva tabla en Prisma/PostgreSQL; una fila por vuelta por participante; mismo schema que `Lap` del jugador (sectores, combustible, compuesto); FK → `SessionParticipant` con cascade delete
- **Estrategia rival en session detail** — sección "Race Grid" con columnas Pos/Driver/Car+Class/Laps/Best lap/Pits/Strategy; stints calculados server-side (agrupados por cambio de compuesto o pit stop); badges de compuesto con código de colores (S=rojo, M=amarillo, H=gris, I=verde, W=azul); sección "Strategy detail" expandida para sesiones de carrera
- **Condiciones de sesión en hero** — weather, temp ambiente, temp pista, humedad, longitud de pista (km) en la cabecera de session detail
- **VCR file watcher (CA-017)** — companion watcher ahora acepta `replay_folder` opcional; detecta `.vcr` nuevos → `db::insert_replay`; emite evento `replay-detected` a la UI
- **Companion Replays tab (CA-018)** — nuevo tab en la companion app listando todos los `.vcr` rastreados con filename, tamaño, estado de link y botón de eliminar
- **Companion Settings: Replay folder** — nuevo campo + Browse button para configurar la carpeta de replays de LMU; se guarda en plugin-store y se pasa al watcher al arrancar

### Changed
- `SessionParticipant` ahora incluye `finishStatus String?` y `pitStopsCount Int?`
- `PitStop` ahora tiene `participantId String?` y `driverName String?` — permite vincular cada pit stop al piloto correspondiente
- `Session` ahora tiene `humidity Float?` y `trackLengthM Float?`
- `import.service.ts` crea participantes con `create()` individual (en lugar de `createMany`) para poder insertar sus vueltas y vincular pit stops con participantId
- Companion `start_watching` acepta `replay_folder: Option<String>` — vigila dos carpetas en el mismo hilo

### Migration
- `20260605130013_full_race_data` — add `ParticipantLap`, update `SessionParticipant`, `PitStop`, `Session`

---

## [0.26.0] — 2026-06-05

> Companion app standalone — funciona sin servidor.

### Added
- **LMU parser en Rust** (`parser.rs`) — port del TypeScript; maneja `rFactorXML/RaceResults`, identificación de conductor, extracción de vueltas y sectores
- **Métricas en Rust** (`metrics.rs`) — best/avg/ideal lap, std dev, consistency score
- **SQLite local** (`db.rs`) — `rusqlite` bundled; tablas `sessions` + `laps`; dedup por hash, detección de PB, `mark_synced`; WAL mode
- **date.rs** — formateador ISO 8601 con algoritmo de Howard Hinnant (sin `chrono`)
- **Tab Sessions** en la companion UI — lista con track/coche/tipo/mejor vuelta + detalle completo con tabla de vueltas y sectores
- **Settings reestructurado** — campo `Driver name`; URL + API key bajo sección "Cloud sync (optional)"
- **`file-result` Tauri event** — emitido tras cada procesamiento para actualizar el sync log (success/duplicate/error)

### Changed
- El watcher siempre guarda en SQLite local primero; sube al servidor solo si hay URL + API key configurados
- `import_all_files` usa el mismo flujo local + sync opcional
- `--orange` CSS variable añadida a `styles.css`

### Fixed
- `now_iso()` producía fechas incorrectas (algoritmo aproximado)
- `parse_date()` fallback devolvía `1970-01-01` hardcodeado
- Sync log se quedaba en "uploading" para siempre (faltaba el evento de resultado)

---

## [0.25.0] — 2026-06-05

> CA-011/012/013 — Companion app: historial persistente, import all, autostart.

### Added
- **CA-011 Persistent sync history** — logs guardados en `plugin-store` (`syncLogs`, máx. 100); se restauran al arrancar la app con timestamps correctos; botón "Clear history"
- **CA-012 Import all** — comando Rust `import_all_files` escanea la carpeta, emite `file-detected` por cada XML y sube con hash dedup (CA-009); botón "Import all" en la pestaña Sync
- **CA-013 Start with Windows** — `tauri-plugin-autostart` v2; toggle en Settings con estado leído al arranque; permisos añadidos a capabilities

---

## [0.24.0] — 2026-06-05

> PO-008 Cmd+K command palette + PO-009 post-session ritual modal.

### Added
- **Command palette** (PO-008) — `cmdk`; se abre con Cmd+K o Ctrl+K; 3 grupos: Navigation (11 páginas), Actions (importar + recalcular métricas), Recent sessions (últimas 8 con track/coche/tipo); búsqueda en tiempo real; hints de teclado en footer; botón Search en el sidebar para descubribilidad
- **Post-session modal** (PO-009) — se dispara automáticamente cuando `UploadZone.onImported` resuelve; carga resumen de sesión (track, coche, tipo, mejor vuelta, badge PB, consistencia); feeling picker (5 emojis); quick tags (7 etiquetas predefinidas); nota libre; "Save & view session" guarda un `SessionNote` y navega; "Skip" navega sin guardar; nuevo endpoint `GET /api/sessions/[id]/summary`

---

## [0.23.0] — 2026-06-05

> PO-004 privacy controls + PO-007 responsive design.

### Added
- **Privacy controls** (PO-004) — `PATCH /api/sessions/[id]` para toggle `isPublic`; `SessionPrivacyToggle` en session detail (lock/globe); sección Privacy en Settings con toggle de perfil y nota sobre sesiones individuales; `PATCH /api/profile` ahora acepta `isPublic`
- **Responsive design** (PO-007) — `AppShell` client wrapper con estado mobile sidebar; header mobile con hamburger + logo (solo en mobile); sidebar como drawer fijo con overlay negro; nav links cierran el sidebar al navegar; tablas con `overflow-x-auto` y ancho mínimo; padding reducido en mobile (`px-4 py-5` vs `px-8 py-7`)

---

## [0.22.0] — 2026-06-05

> AN-016 metric recalculation + A-007 password reset + CA-009/010 companion dedup + retry.

### Added
- **Metric recalculation job** (AN-016) — `RecalculateQueue` + `RecalculateWorker` (concurrency 1); re-lee el XML de storage, reparsea con el parser actual y actualiza todos los scores de `Session`; botón "Recalculate metrics" en Import History; `POST /api/import/recalculate`
- **Password reset** (A-007) — modelo `PasswordResetToken` (token único, TTL 1h, `usedAt`); `POST /api/auth/forgot-password` (siempre 200, evita enumeración); `POST /api/auth/reset-password` (valida, hashea, invalida token); páginas `/forgot-password` y `/reset-password`; enlace "Forgot password?" en login; email via **Resend** (`src/lib/email.ts`)
- **Companion hash dedup** (CA-009) — SHA-256 calculado antes de cada upload; hashes persistidos en `%LOCALAPPDATA%/UrApex/uploaded_hashes.txt` (`dirs-next` crate); archivos ya subidos devuelven DUPLICATE sin petición HTTP
- **Companion upload retry** (CA-010) — 3 intentos con backoff lineal (2s/4s/6s); `reqwest::Client` con timeout de 60s; cada fallo logeado individualmente

---

## [0.21.0] — 2026-06-05

> Gestión de replays .Vcr: subida, descarga, eliminación y gestor de capacidad.

### Added
- **Modelo `Replay`** — `userId`, `sessionId`, `storagePath`, `originalName`, `fileSizeBytes`, `fileHash` (dedup)
- **`POST /api/sessions/[id]/replays`** — sube un `.vcr`; dedup por hash SHA-256
- **`GET /api/sessions/[id]/replays`** — lista replays de una sesión
- **`DELETE /api/replays/[id]`** — elimina del storage y de la DB
- **`GET /api/replays/[id]/download`** — descarga el archivo como attachment
- **`GET /api/storage`** — estadísticas de uso + lista ordenada por tamaño
- **`ReplaySection`** en session detail — subida drag/browse + download + delete por sesión
- **`/storage` page** — barra de uso (referencia free tier 10 GB R2), aviso al 80%+, lista completa con enlace a sesión y acciones
- **Sidebar**: enlace Storage bajo la sección Progress

---

## [0.20.0] — 2026-06-05

> Stack listo para Vercel free tier (Neon + Upstash + Cloudflare R2).

### Added
- **S3StorageService** — `@aws-sdk/client-s3`, compatible con Cloudflare R2 (`forcePathStyle`, endpoint custom); seleccionado vía `STORAGE_PROVIDER=s3`
- **Vercel Cron** — `GET /api/cron/process-imports` cada minuto; fallback serverless del worker BullMQ; protegido con `CRON_SECRET`
- **`vercel.json`** — define el cron schedule (`* * * * *`)
- **GitHub Actions CI** — `ci.yml`: install → `prisma generate` → `prisma migrate deploy` (con `DIRECT_URL`) → `tsc` → lint → test
- **`.env.example`** — documentado con vars para Neon, Upstash, R2, `CRON_SECRET`
- **`prisma.config.ts`** — `directUrl` fallback via override de `DATABASE_URL` en CI

### Servicios a configurar (manual, una sola vez)
1. [Neon](https://neon.tech) — crear proyecto, añadir `DATABASE_URL` y `DIRECT_URL` en Vercel
2. [Upstash](https://upstash.com) — crear Redis, añadir `REDIS_URL`
3. [Cloudflare R2](https://cloudflare.com) — crear bucket, añadir `S3_*` vars + `STORAGE_PROVIDER=s3`
4. Conectar repo GitHub a Vercel — deploy automático en cada push a `main`
5. Build command en Vercel: `prisma migrate deploy && next build`

---

## [0.19.0] — 2026-06-05

> AN-015: async import pipeline with BullMQ + Redis.

### Added
- **BullMQ queue** (`src/server/queue/import.queue.ts`) — `IMPORT_QUEUE` with `attempts:1`, auto-cleanup of completed/failed jobs
- **Import worker** (`src/server/workers/import.worker.ts`) — concurrency 2, calls existing `processImport()`, logs failures
- **Redis connection** (`src/lib/redis.ts`) — `ioredis` `ConnectionOptions` parsed from `REDIS_URL`
- **`src/instrumentation.ts`** — registers worker on Next.js startup (Node.js runtime only)
- **UploadZone polling** — new `processing` status; polls `GET /api/import/:id` every 1.5 s (120 s timeout) until `IMPORTED` or `FAILED`

### Changed
- `POST /api/upload` — enqueues job + returns `PENDING` immediately (no longer blocks on parse/save)
- `POST /api/import/process` — same; driver-selection flow now async
- `POST /api/import/[id]` (retry) — enqueues job instead of re-running sync
- Redis installed via Homebrew (`brew services start redis`)

---

## [CI fix] — 2026-06-04

### Fixed
- **Companion CI workflow** — Node.js 24 action compatibility (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`)
- Removed broken npm cache step (no `package-lock.json` in CI context)
- Switched `npm ci` → `npm install`, `npx @tauri-apps/cli@latest` → local binary
- Replaced `npm run tauri build` with `npx @tauri-apps/cli build` (removes unsigned-key env hack)
- Added build output listing step for artifact path debugging
- Added `make_latest: false` + `fail_on_unmatched_files: false` to release step
- Fixed capabilities `$schema` URL: local `node_modules` path → `https://schema.tauri.app/config/2`

---

## [0.18.0] — 2026-06-04

> Dashboard achievements widget + PO-002 setup detail + PO-003 driver profile + PO-010/011 scores.

### Added
- **Recent achievements widget** on dashboard right column (last 3 unlocked, rarity icon + color, unlock date)
- **Setup detail page** (`/setups/[id]`) — PO-002 complete:
  - Header with name, favorite star, simulator, conditions, updated-at
  - 4 meta cards: car (linked), circuit (linked), version count, session count
  - Notes section
  - Version history with "Add version vN" inline form (`AddVersionForm` client component)
  - Sessions linked to this setup
  - `POST /api/setups/[id]/versions` — creates `SetupVersion`, bumps `updatedAt`
  - Setups list cards: title is now a link + "View →" arrow link
- **Driver profile page** (`/profile`) — PO-003:
  - Profile card: avatar initial, display name, country, in-game name, join date, bio
  - 5-stat strip: sessions, laps, drive time, circuits, cars
  - 6-score grade grid: Consistency/Safety/Pace/Improvement/Racecraft/Qualifying
  - Top 3 circuits + top 3 cars by session count with best lap times
  - Achievements progress bar with count and link
  - Recent sessions list
  - "Profile" link added to sidebar footer
- **Racecraft Score (0–100)** — PO-010 — RACE sessions only:
  - Formula: position_score×0.5 + safety×0.3 + consistency×0.2
  - position_score = (participants − finalPosition) / (participants − 1) × 100
  - Stored per session + rolling avg on DriverProfile
  - Shows as 5th ring on dashboard (when available), metric tile on session detail
- **Qualifying Score (0–100)** — PO-011 — QUALIFYING sessions only:
  - Formula: position_score×0.7 + consistency×0.3
  - Stored per session + rolling avg on DriverProfile
  - Shows as 6th ring on dashboard (when available), metric tile on session detail
- Schema migration `add_racecraft_qualifying_scores`

---

## [0.17.0] — 2026-06-04

> PO-001 onboarding + PO-005 advanced session filters + PO-006 CSV export.

### Added
- **Onboarding wizard** (`/onboarding`) — 3-step flow for new users:
  - Step 1: Welcome screen with feature grid (4 cards) + skip link
  - Step 2: Upload first XML (full UploadZone embedded — driver selection modal appears
    automatically); advances to Step 3 via `onImported(sessionId)` callback
  - Step 3: Done screen with what's-next checklist; "View my session" deep-links to the
    newly imported session; fires `PATCH /api/profile { onboardingDone: true }`
  - Own layout (`/onboarding/layout.tsx`) — no sidebar, full-screen centered
- **`DriverProfile.onboardingDone`** — Boolean flag (default false); migration marks
  existing users with sessions as done; register now redirects to `/onboarding`
- **App layout** — redirects to `/onboarding` when `!profile.onboardingDone`
- **`UploadZone.onImported`** — optional callback prop fires after first successful import
- **Advanced session filters** (`SessionFilters` client component):
  - Session type chips (All / Practice / Qualifying / Race / Hot lap)
  - PB-only toggle (shows only sessions where `isNewPB = true`)
  - Track dropdown (populated from user's driven tracks)
  - Car dropdown (populated from user's driven cars)
  - Date range picker (from / to)
  - Sort: newest first / oldest first / best lap ↑ / consistency ↓
  - All filters via URL searchParams → server-rendered, shareable, bookmark-friendly
  - "Clear (N)" button shows count of active filters
- **CSV export** — two endpoints, download links in Settings → Data export:
  - `GET /api/export/sessions` — all sessions: date, track, car, type, all metrics
  - `GET /api/export/laps` — all laps: session context, lap time, sectors, fuel, tyre

---

## [0.16.0] — 2026-06-04

> Phase 5 scaffold — companion app (Tauri) + API key auth.

### Added
- **Companion app** (`/companion/`) — complete Tauri v2 + React project scaffold:
  - Rust backend: `watcher.rs` (file watcher via `notify` crate, detects new XMLs in LMU results folder) + `uploader.rs` (HTTP multipart upload via `reqwest`)
  - React frontend: Settings tab (folder, URL, API key) + Sync tab (real-time log of uploads) + `StatusDot` (watching/idle indicator)
  - System tray icon — app minimizes to tray on close, shows/hides on click
  - Windows notifications via `tauri-plugin-notification` on each upload result
  - Targets: NSIS + MSI installers for Windows
  - Build: `npm run tauri:build` (requires Rust + `rustup`)
- **`User.apiKey`** — unique token field on User model (migration `add_api_key`); index on `apiKey`
- **`GET/POST/DELETE /api/auth/api-key`** — API key management: GET returns masked preview, POST generates `uapx_<64hex>` and returns full key once, DELETE revokes
- **`ApiKeyForm`** client component — generate/regenerate/revoke with show/hide and copy-to-clipboard
- Settings page "Companion app" section — shows active key status + `ApiKeyForm`
- **Bearer token auth on `/api/upload`** — `resolveUserId()` helper checks `Authorization: Bearer <key>` header before falling back to session cookie; companion app uses this to upload without a browser session

### Changed
- `/api/upload` — `resolveUserId()` replaces direct `auth()` call; supports both cookie sessions and API key bearer tokens

---

## [0.15.0] — 2026-06-04

> Driver name identification + import flow overhaul + AN-011 achievement page.

### Added
- **`DriverProfile.simDriverName`** — new optional field storing the user's exact in-game driver name (migration `add_sim_driver_name`)
- **`ParseContext`** type in `types.ts` — `{ driverName?: string }` passed to parsers so they can match by name
- **`IParser.extractDriverNames(content)`** — new method on the parser interface; lightweight name extraction without full parse
- **`LMUParser.extractDriverNames()`** — reads all `<Name>` elements from the first session key, returns unique sorted names
- **`LMUParser.findPlayer(drivers, driverName?)`** — updated: exact match → case-insensitive match → first driver with valid BestLapTime (LMU multiplayer files have `isPlayer=1` on all drivers, making name matching the only reliable identification method)
- **`extractDriverNames()` exported from `registry.ts`** — delegates to the detected parser
- **Driver selection modal in `UploadZone`** — appears after upload when no `simDriverName` is configured; shows all unique driver names found across uploaded files; on confirm: stores name + processes imports
- **Two-phase upload flow** — `POST /api/upload` checks user's `simDriverName`; if unset, saves files and returns `{ needsDriverSelection, driverNames, imports }`; if set, processes immediately
- **`POST /api/import/process`** — new endpoint: accepts `{ importFileIds, driverName }`, stores driver name in profile, processes all deferred imports
- **`ImportHistory`** client component — replaces static import history on upload page; adds delete (trash) and retry (refresh) buttons per FAILED import; optimistic list update
- Settings page "Simulator identity" section — `SimDriverForm` with current name, hint about exact match requirement
- Upload page driver name banner — shows "Importing as <name>" or amber warning when not configured
- **`runImport()`** — fetches `user.profile.simDriverName` from DB and passes to `parseFile()` as `ParseContext`; changing the name in settings automatically applies to all future imports without touching existing sessions

### Changed
- `parseFile(content, slug, context?)` — accepts optional `ParseContext` third argument
- `processImport()` — no API change; driver name resolved internally from user profile
- Upload page import history — replaced static server component with `ImportHistory` (client)

---

## [0.14.0] — 2026-06-05

> Fix real LMU XML parsing + _sum bug.

### Fixed
- **LMU parser v0.2.0** — complete rewrite based on actual file structure: root is `<rFactorXML><RaceResults>`, session type from child element name (Practice1/Qualify/Race1), lap times are text content in seconds (×1000→ms), sectors in attributes, player = first Driver with valid BestLapTime, date from `TimeString` "YYYY/MM/DD HH:MM:SS", penalties from `<Stream><Penalty>`, `canParse` now checks for `<rFactorXML` or `<RaceResults`
- **`updateProfileStats`** — replaced `db.lap.aggregate({ _sum: {} })` with `db.lap.count()` (Prisma 7 rejects empty `_sum`)

---

## [0.13.0] — 2026-06-05

> AN-013 auto insights + AN-006 sector delta + PO-002 setups manager MVP.

### Added
- `SessionInsight` model + migration (`add_session_insights`); `Session.insights` relation
- `insights.service.ts` — 8 rule-based insight types: new_pb, first_session_track, consistency_pb/high/low, clean_session, safety_warning, dnf/dq, dropoff_high/negative, near_ideal, long_stint
- Session detail page: "Insights" section with severity-coloured cards (positive=green, warning=orange, info=zinc); "Compare" button in back-nav row
- `GET/POST /api/setups`, `GET/PATCH/DELETE /api/setups/[id]` — full CRUD with ownership checks
- Setups list page — cards with track/car/conditions, version pill, session count, favourite star, `SetupActions` dropdown (favourite, archive, delete)
- `/setups/new` + `SetupForm` — simulator required, optional track/car/conditions/type/notes
- Setup schema relations: `Setup → Simulator/Car/Track` + reverse (`Simulator/Car/Track.setups`); migration `add_setup_relations`

### Changed
- Session comparison page — sector delta table (S1/S2/S3 + ideal lap row, winner column); removed unused icon imports

---

## [0.12.0] — 2026-06-05

> AN-014 weekly activity + AN-005 session comparison — training history and side-by-side analysis.

### Added
- `ActivityChart` — recharts bar chart for weekly session counts (12-week window, current week in cyan)
- `LapComparisonChart` — dual-line recharts chart overlaying two sessions' lap times (cyan vs orange dashed)
- `/sessions/compare` — session comparison page with slot UI, session picker, metrics diff grid, lap overlay chart, lap-by-lap delta table
- Dashboard "Training activity" section: sessions per week bar + consistency trend (last 12 weeks, only shown with data)
- Sessions list: `⇄` compare icon on row hover → `/sessions/compare?a=ID`

---

## [0.11.0] — 2026-06-05

> AN-001/002 — Pace Score + Improvement Score. All 4 driver scores now live.

### Added
- `paceScore(bestMs, idealMs)` in metrics.service — measures how well the driver extracts maximum pace; `(idealLap / bestLap) * 100`, requires sector data
- `calculateImprovementScore(userId)` — per track+car combo: `(firstBestMs - currentBestMs) / firstBestMs * 100`, averaged and scaled (20% avg → 100)
- `improvementScore Float?` field on `DriverProfile` (migration `20260604095811_add_improvement_score`)

### Changed
- `calculateMetrics()` now includes `paceScore` stored on every Session
- `updateProfileStats()` now calculates and persists all 4 profile scores (rolling avg of last 20 sessions for consistency/safety/pace; improvement via combo analysis)
- Dashboard Driver Rating card: 4 rings (Consistency, Safety, Pace, Improvement); rating composite uses all 4

---

## [0.10.0] — 2026-06-05

> AN-003/004 full track & car analytics — improvement badge, PB evolution, consistency trend, session type breakdown.

### Added
- `TrendChart` — generic recharts line chart for score/metric trends over time (color, domain, formatter configurable)

### Changed
- **Track detail** — running PB evolution (only plots new PBs), improvement badge (+Xs / X%), session type breakdown with bar, consistency trend chart, best-by-car with trophy for leader, glass Section wrapper, 6-stat strip with drive time, breadcrumb with back arrow
- **Car detail** — same structure: running PB chart, improvement badge, session type breakdown, best-by-circuit list with trophy, consistency trend, 6-stat strip with circuits count, glass cards throughout

---

## [0.9.0] — 2026-06-05

> AN-012 Session notes — debrief after every session with tags and video link.

### Added
- `GET /POST /api/sessions/[id]/notes` — list and create session notes (auth + ownership gated)
- `DELETE /api/sessions/[id]/notes/[noteId]` — delete note (session ownership check)
- `SessionNotes` client component — add form with textarea, tag pills (Enter/comma/Backspace), optional video URL, optimistic list; delete on hover with loader; empty hint copy
- Session detail page — "Notes & Debrief" section using `Section` wrapper, fetches notes server-side via `include`

---

## [0.8.0] — 2026-06-05

> Dashboard v3 + UI polish pass 3 — score rings, glass cards, UploadZone fix, GoalForm visual redesign.

### Changed
- **Dashboard** — Driver Rating banner (full-width, composite score + letter grade + 3 rings), SVG score rings with CSS drop-shadow glow (no box artifacts), glass cards (`bg-zinc-900/50 backdrop-blur-sm`), session rows with colored 3px left border + consistency mini-bar + position badge, week delta in stats, empty-state CTA aligned to sessions card height
- **UploadZone** — `useRef` programmatic click replaces `absolute inset-0 opacity-0` input (fixes browser tooltip), horizontal layout with Browse button, file size display
- **GoalForm** — 3×3 visual type-selector grid replacing dropdown, each type has icon + color, target value panel shows selected type's icon, plain `<button>` replaces shadcn deps
- **Settings page** — replaces Card/CardHeader with `rounded-2xl border` sections, consistent with rest of app
- **New Goal page** — `rounded-2xl` container, updated description mentioning auto-progress, `NonNullable` type guards on track/car queries
- **Sidebar** — `bg-zinc-950/90 backdrop-blur-md` subtle glass effect
- **globals.css** — grid opacity bumped to 4.5%, second blob as layout div, app-wide grid via `.app-bg::before/::after`

---

## [0.7.0] — 2026-06-05

> AN-009/010 achievements engine + landing redesign + auth split-screen + UploadZone v2.

### Added
- `achievements.service.ts` — `evaluateAchievements()` called after every import; handles 7 of 8 condition types (all_sector_pbs deferred); upserts `UserAchievement` with progress + auto-unlocks
- Both `updateGoalProgress` and `evaluateAchievements` now run in parallel after each import

### Changed
- **Landing page** — full redesign: sticky blur nav, gradient headline, dot-grid hero bg, stats strip, 6-feature grid with accent card, numbered "How it works", final CTA with glow, footer
- **Auth layout** — split-screen: left branded panel with grid bg, feature bullets, tagline; right panel with form; mobile fallback shows centered logo
- **Login / Register** — plain `<button>` replaces shadcn Button, `rounded-2xl` card with backdrop-blur, AlertCircle error state, removed all Card imports
- **UploadZone** — larger 2xl drop zone, Loader2 spinner during upload, file size display, "Clear done" button, `StatusPill` + `FileStatusIcon` components, cleaner queue layout

---

## [0.6.0] — 2026-06-05

> UI polish pass 2 — session detail hero, tracks/cars grid, achievements rarity, empty state.

### Changed
- **Session detail** — hero header with gradient top bar + type/PB badges, new `MetricTile` with score progress bar, `Section` wrapper replaces Card, back nav, lap table PB/SB badges, invalid lap opacity, removed all Card imports
- **Tracks page** — card redesign with country + length in meta row, session count pill, last-session stat, hover gradient, `orderBy lastSession`
- **Cars page** — same card pattern as tracks: class label, session count pill, last-session stat, hover gradient, `NonNullable` type guard
- **Achievements page** — rarity config table with per-rarity border/bg/glow/icon, legendary shimmer overlay, `SectionLabel` with icon, progress bar uses rarity color, locked state opacity, removed PageHeader dependency
- **EmptyState** — outer glow ring, cyan ghost-button style for action, removed shadcn Button dependency
- **globals.css** — no change (all styling via Tailwind)

---

## [0.5.0] — 2026-06-05

> AN-008 complete + full UI redesign — sidebar, dashboard, sessions, goals, upload.

### Added
- `goals.service.ts` — `updateGoalProgress()` called after every successful import; handles all 8 auto-trackable goal types (BEST_LAP_TIME, CONSISTENCY_SCORE, CLEAN_LAP_COUNT, SESSION_COUNT, HOURS_DRIVEN, REDUCE_INCIDENTS, IMPROVE_SAFETY, COMPLETE_STINTS); auto-completes goals when target is reached
- Track/car scoping: goals with `trackId`/`carId` only update for matching sessions

### Changed
- **Sidebar** — section labels (Overview / Analysis / Progress), left-edge active indicator, gradient logo shadow, avatar initials, inline sign-out button, `w-58`
- **StatCard** — icon in colored container, gradient hover overlay, bottom accent line, `sublabel` prop, removed Card dependency
- **Dashboard** — greeting with time-of-day, `Import session` CTA in header, active goals widget, recent PBs as section, dot color per session type, removed Card wrappers
- **Sessions page** — type filter chips with dot indicators and count, redesigned table header, color-coded type badges with dot, improved pagination with icons
- **Goals page** — section layout with counts, per-goal top accent bar, `LOWER_IS_BETTER` progress logic for lap times/incidents, deadline overdue state in red
- **Upload page** — icon-per-status in history list, border on status badges, `max-w-2xl` scoped to content
- **App layout** — `px-8 py-7` for better breathing room

---

## [0.4.0] — 2026-06-05

> Goals feature complete — create, list, mark complete/abandon/reactivate, delete.

### Added
- `POST /api/goals` — create goal with Zod validation (name, type, targetValue, optional trackId/carId/deadline)
- `GET /api/goals` — list all goals for the authenticated user
- `PATCH /api/goals/[id]` — update status (ACTIVE/COMPLETED/ABANDONED), name, targetValue, deadline
- `DELETE /api/goals/[id]` — hard delete goal (ownership-checked)
- `GoalActions` component — dropdown per card: mark complete, abandon, reactivate, delete with optimistic `router.refresh()`
- Abandoned goals section on goals list page (collapsible — only shown when there are abandoned goals)

### Fixed
- `GoalForm` Select `onValueChange` typed as `string | null` in BaseUI — coerced to `""` on null/deselect
- `GoalForm` did not handle null value from Select deselect for trackId/carId

---

## [0.3.0] — 2026-06-04

> Phase 1 complete — all MVP pages, UI component system, error handling.

### Added

**UI Component System**
- `StatCard` — reusable stat card with icon, optional delta and accent
- `ScoreBadge` / `ScoreRow` — 0–100 score with color coding (green/lime/yellow/orange/red)
- `PageHeader` — consistent page header with icon, description, action slot
- `Skeletons` — `StatCardSkeleton`, `SessionRowSkeleton`, `DashboardSkeleton`, `TableSkeleton`
- `PBEvolutionChart` — best lap evolution over time (Y-axis reversed, Recharts)

**Pages**
- `/tracks` — grid of circuits driven with best lap and session count
- `/tracks/[slug]` — stat cards + PB evolution chart + best lap by car + session table
- `/cars` — grid of cars used with best lap and session count
- `/cars/[slug]` — stat cards + best lap by circuit + session table
- `/goals` — active/completed goals with progress bars + rarity-colored cards
- `/achievements` — full grid: unlocked/in-progress/locked with rarity styles and progress bars
- `/setups` — placeholder (Phase 3)
- `/settings` — profile edit (displayName, country) + account info
- `/` (landing) + `/login` + `/register` — already done, mentioned for completeness

**API**
- `GET /api/profile` — return current user's driver profile
- `PATCH /api/profile` — update displayName, country, bio

**Error handling**
- `src/app/not-found.tsx` — branded 404 with UrApex logo and back to dashboard button
- `src/app/(app)/error.tsx` — error boundary with reset button

**Dashboard improvements**
- 2-column layout: sessions list + scores/PBs sidebar
- `ScoreBadge` on Consistency, Safety, Pace scores
- Recent PBs widget
- Quick actions for new users (empty state)

---

## [0.2.0] — 2026-06-04

> Phase 1 — Complete import pipeline: storage, parser, normalizers, metrics, upload UI, session pages.

### Added

**StorageService**
- `StorageService` interface with `save`, `read`, `delete`, `exists`
- `LocalStorageService` implementation (dev/single-instance prod)
- `rawFileKey(userId, fileHash)` helper for consistent paths

**Parser system**
- `IParser` interface + `NormalizedSession` type + `ParsedLap/Participant/Incident/Penalty/PitStop`
- `LMUParser` — rFactor 2/LMU XML parser with defensive field extraction
  - Handles multiple root elements: `<Standings>`, `<Race>`, `<Qualify>`, `<Practice>`
  - Converts rF2 time format (seconds float → milliseconds)
  - Auto-detects session type, extracts laps, sectors, participants, pit stops, penalties
  - Non-fatal warnings instead of crashes on missing optional fields
- `ParserRegistry` with `detectParser()` and `getParser()` + `parseFile()` helper
- `fixtures/lmu/race_minimal.xml` — test fixture with 5 laps, 3 participants
- `tests/unit/parsers/lmu.test.ts` — 15 unit tests, all passing

**Normalizers**
- `TrackNormalizer.findOrCreateTrack()` — rawName → Track with alias table
- `CarNormalizer.findOrCreateCar()` / `findOrCreateCarClass()` — rawName → Car/CarClass with alias

**Metrics service**
- `bestLap`, `avgLap`, `medianLap`, `idealLap` (sum of best sectors)
- `stdDev`, `cleanLapRatio`, `dropOff` (pace degradation)
- `consistencyScore` — 0–100 based on coefficient of variation
- `safetyScore` — 0–100 weighted by incidents, penalties, DNF/DQ, invalid laps

**Import service**
- `handleUpload()` — SHA-256 dedup check, raw file save, ImportFile record creation
- `processImport()` — full pipeline: parse → normalize → metrics → PB detection → DB transaction
- Bulk inserts for laps (100+), participants, incidents, penalties, pit stops
- PB detection against historical best at same track/car
- `updateProfileStats()` — recalculates and caches DriverProfile aggregates

**API routes**
- `POST /api/upload` — multipart file upload with type/size validation, sync import
- `GET /api/import/[id]` — import status check
- `POST /api/import/[id]` — retry failed import
- `DELETE /api/import/[id]` — soft-delete session + hard-delete ImportFile

**Pages**
- `/upload` — drag & drop zone + real-time status feedback + import history
- `/sessions` — table with type filter chips + pagination (20/page)
- `/sessions/[id]` — full session detail: metric cards, lap table, sector breakdown, participants, incidents/penalties

**Charts**
- `LapTimeChart` — Recharts line chart with PB highlighted in green, invalid laps muted

### Internal
- `vitest.config.ts` — Vitest configured with path alias `@/` → `src/`

---

## [0.1.0] — 2026-06-04

> Phase 1 — Project scaffold, database, auth, and dashboard shell.

### Added

**Infrastructure**
- Next.js 16.2.7 with App Router, TypeScript strict, Tailwind CSS v4, Turbopack
- Docker Compose for PostgreSQL 16 + Redis 7
- Prisma 7 with `@prisma/adapter-pg` and `prisma.config.ts` (breaking change from Prisma 5/6)
- Full project folder structure (`src/app`, `src/components`, `src/features`, `src/server`, `src/lib`, etc.)
- shadcn/ui initialized with components: card, badge, table, input, label, form, select, tabs, dropdown-menu, avatar, skeleton, sonner, dialog, separator, sheet, tooltip, sidebar
- Recharts, Zod, fast-xml-parser, date-fns, bcryptjs installed
- `.env.example` with all required environment variables
- `docker-compose.yml` for local development
- Vitest + Testing Library configured

**Database**
- Full Prisma schema with 21 models: User, Account, AuthSession, DriverProfile, Simulator, ImportFile, Session, Lap, Track, TrackAlias, TrackLayout, Car, CarAlias, CarClass, SessionParticipant, Incident, Penalty, PitStop, SessionNote, Setup, SetupVersion, SessionSetup, Goal, Achievement, UserAchievement
- Initial migration applied
- Seed: 7 simulators (lmu, acc, iracing, rf2, rr, ams2, ac), 10 initial achievements

**Authentication**
- Auth.js v5 with Credentials provider (email + password)
- JWT session strategy
- `auth.config.ts` (edge-safe, used by proxy) + `auth.ts` (full config with Prisma adapter)
- `proxy.ts` for route protection (Next.js 16 pattern replacing `middleware.ts`)
- `POST /api/auth/register` — creates User + DriverProfile in one transaction
- Password hashing with bcrypt (cost 12)

**Core library**
- `lib/db.ts` — Prisma singleton with `@prisma/adapter-pg`
- `lib/auth.ts` — Full Auth.js configuration
- `lib/hash.ts` — SHA-256 utilities
- `lib/time.ts` — `formatLapTime(ms)`, `formatDelta()`, `formatDuration()`, `formatDriveTime()`
- `lib/constants.ts` — upload limits, simulator labels, session type labels
- `hooks/use-mobile.ts` — responsive breakpoint hook

**Pages**
- `/` — Landing page with hero, feature cards, CTAs
- `/login` — Sign in form with error handling and auto-redirect
- `/register` — Registration form with auto-login after success
- `/dashboard` — Stats cards (sessions, laps, drive time, circuits, cars) + recent sessions list + empty state
- App layout with sidebar navigation (Dashboard, Upload, Sessions, Tracks, Cars, Goals, Achievements, Setups, Settings, Sign out)
- UrApex dark theme (zinc-950 base, cyan-500 accent) applied globally

**Design system**
- Dark-only CSS theme with UrApex color palette (cyan primary, orange accent)
- `EmptyState` shared component with icon, title, description, and optional CTA

**Documentation**
- Full `/docs` directory: README, PROJECT_CONTEXT, ROADMAP, CHANGELOG, FEATURES, BACKLOG, MVP_SCOPE, ARCHITECTURE, DATABASE_SCHEMA, API_SPEC, DECISIONS, BUGS, IDEAS, DESIGN_SYSTEM, USER_STORIES
- Subdirectories: `docs/research/`, `docs/product/`, `docs/technical/`
- 11 Architecture Decision Records in DECISIONS.md

### Internal
- Resolved Prisma 7 breaking changes: `datasource.url` moved to `prisma.config.ts`, `PrismaClient` now requires adapter
- Resolved Next.js 16 breaking change: `middleware.ts` renamed to `proxy.ts`
- Separated Auth.js config into edge-safe and full configs to avoid Node.js modules in proxy runtime

---

## [0.0.0] — 2026-06-04

> Project initialized. Documentation only, no code.

### Added
- Project concept and architecture defined
- Full documentation structure in `/docs`

---

<!--
TEMPLATE — copy this block when releasing a new version:

## [X.Y.Z] — YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-

### Internal
-

-->
