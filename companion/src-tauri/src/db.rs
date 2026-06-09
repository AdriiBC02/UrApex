use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ── Shared structs ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub id:                String,
    pub track_name:        String,
    pub car_name:          String,
    pub session_type:      String,
    pub session_date:      String,
    pub total_laps:        i32,
    pub valid_laps:        i32,
    pub best_lap_ms:       Option<i32>,
    pub consistency_score: Option<f64>,
    pub is_new_pb:         bool,
    pub dnf:               bool,
    pub synced_to_server:  bool,
    pub final_position:    Option<i32>,
    pub server_name:       Option<String>,
    pub is_online:         bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LapRow {
    pub lap_number:    i32,
    pub lap_time_ms:   Option<i32>,
    pub is_valid:      bool,
    pub sector1_ms:    Option<i32>,
    pub sector2_ms:    Option<i32>,
    pub sector3_ms:    Option<i32>,
    pub fuel_load:     Option<f64>,
    pub tyre_compound: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDetail {
    #[serde(flatten)]
    pub summary:        SessionSummary,
    pub car_class:      Option<String>,
    pub grid_position:  Option<i32>,
    pub duration_sec:   Option<i32>,
    pub is_online:      bool,
    pub avg_lap_ms:     Option<f64>,
    pub ideal_lap_ms:   Option<i32>,
    pub weather:        Option<String>,
    pub temp_ambient:   Option<f64>,
    pub temp_track:     Option<f64>,
    pub humidity:       Option<f64>,
    pub track_length_m: Option<f64>,
    pub laps:           Vec<LapRow>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Participant {
    pub id:              String,
    pub session_id:      String,
    pub driver_name:     String,
    pub car_name:        Option<String>,
    pub car_class:       Option<String>,
    pub position:        Option<i32>,
    pub laps_completed:  i32,
    pub best_lap_ms:     Option<i32>,
    pub finish_status:   Option<String>,
    pub pit_stops_count: i32,
    pub dnf:             bool,
    pub grid_position:   Option<i32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ParticipantLap {
    pub lap_number:    i32,
    pub lap_time_ms:   Option<i32>,
    pub is_valid:      bool,
    pub sector1_ms:    Option<i32>,
    pub sector2_ms:    Option<i32>,
    pub sector3_ms:    Option<i32>,
    pub fuel_load:     Option<f64>,
    pub tyre_compound: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id:            String,
    pub name:          String,
    pub goal_type:     String,
    pub target_value:  f64,
    pub current_value: f64,
    pub unit:          Option<String>,
    pub track_name:    Option<String>,
    pub car_name:      Option<String>,
    pub status:        String,
    pub deadline:      Option<String>,
    pub completed_at:  Option<String>,
    pub created_at:    String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGoalInput {
    pub name:         String,
    pub goal_type:    String,
    pub target_value: f64,
    pub unit:         Option<String>,
    pub track_name:   Option<String>,
    pub car_name:     Option<String>,
    pub deadline:     Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id:         String,
    pub session_id: String,
    pub content:    String,
    pub tags:       String,
    pub video_url:  Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_sessions:     i32,
    pub total_laps:         i32,
    pub total_hours:        f64,
    pub unique_tracks:      i32,
    pub unique_cars:        i32,
    pub avg_consistency:    Option<f64>,
    pub pb_count:           i32,
    pub recent_pb:          Option<RecentPb>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentPb {
    pub session_id:  String,
    pub track_name:  String,
    pub car_name:    String,
    pub best_lap_ms: i32,
    pub session_date: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackStat {
    pub track_name:  String,
    pub sessions:    i32,
    pub best_lap_ms: Option<i32>,
    pub last_driven: String,
    pub total_laps:  i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CarStat {
    pub car_name:    String,
    pub car_class:   Option<String>,
    pub sessions:    i32,
    pub best_lap_ms: Option<i32>,
    pub last_driven: String,
    pub total_laps:  i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Achievement {
    pub slug:        String,
    pub name:        String,
    pub description: String,
    pub category:    String,
    pub rarity:      String,
    pub icon:        String,
    pub target:      f64,
    pub progress:    f64,
    pub unlocked_at: Option<String>,
}

pub struct SessionContext {
    pub session_id:        String,
    pub valid_laps:        i32,
    pub session_type:      String,
    pub final_position:    Option<i32>,
    pub dnf:               bool,
    pub is_new_pb:         bool,
    pub is_online:         bool,
    pub track_name:        String,
    pub car_name:          String,
    pub consistency_score: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Setup {
    pub id:          String,
    pub name:        String,
    pub car_name:    Option<String>,
    pub track_name:  Option<String>,
    pub conditions:  Option<String>,
    pub setup_type:  Option<String>,
    pub notes:       Option<String>,
    pub is_favorite: bool,
    pub created_at:  String,
    pub updated_at:  String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSetupInput {
    pub name:       String,
    pub car_name:   Option<String>,
    pub track_name: Option<String>,
    pub conditions: Option<String>,
    pub setup_type: Option<String>,
    pub notes:      Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplaySummary {
    pub id:          String,
    pub session_id:  Option<String>,
    pub file_path:   String,
    pub filename:    String,
    pub file_size:   Option<i64>,
    pub matched_at:  Option<String>,
    pub imported_at: String,
}

// ── Connection ────────────────────────────────────────────────────────────────

pub fn open(db_path: &PathBuf) -> Result<Connection, String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| e.to_string())?;
    migrate(&conn)?;
    Ok(conn)
}

// ── Versioned migration ───────────────────────────────────────────────────────

fn schema_version(conn: &Connection) -> i32 {
    conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap_or(0)
}

fn set_schema_version(conn: &Connection, v: i32) {
    let _ = conn.execute_batch(&format!("PRAGMA user_version = {v}"));
}

fn migrate(conn: &Connection) -> Result<(), String> {
    let v = schema_version(conn);

    // v1 — initial schema
    if v < 1 {
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS sessions (
                id                TEXT PRIMARY KEY,
                track_name        TEXT NOT NULL,
                car_name          TEXT NOT NULL,
                car_class         TEXT,
                session_type      TEXT NOT NULL,
                session_date      TEXT NOT NULL,
                total_laps        INTEGER NOT NULL DEFAULT 0,
                valid_laps        INTEGER NOT NULL DEFAULT 0,
                best_lap_ms       INTEGER,
                avg_lap_ms        REAL,
                ideal_lap_ms      INTEGER,
                consistency_score REAL,
                is_new_pb         INTEGER NOT NULL DEFAULT 0,
                final_position    INTEGER,
                duration_sec      INTEGER,
                is_online         INTEGER NOT NULL DEFAULT 0,
                dnf               INTEGER NOT NULL DEFAULT 0,
                file_path         TEXT NOT NULL,
                file_hash         TEXT NOT NULL UNIQUE,
                synced_to_server  INTEGER NOT NULL DEFAULT 0,
                imported_at       TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_date   ON sessions(session_date DESC);
            CREATE TABLE IF NOT EXISTS laps (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                lap_number  INTEGER NOT NULL,
                lap_time_ms INTEGER,
                is_valid    INTEGER NOT NULL DEFAULT 1,
                sector1_ms  INTEGER,
                sector2_ms  INTEGER,
                sector3_ms  INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_laps_session    ON laps(session_id);
            CREATE TABLE IF NOT EXISTS replays (
                id          TEXT PRIMARY KEY,
                session_id  TEXT REFERENCES sessions(id) ON DELETE SET NULL,
                file_path   TEXT NOT NULL UNIQUE,
                filename    TEXT NOT NULL,
                file_size   INTEGER,
                matched_at  TEXT,
                imported_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_replays_session ON replays(session_id);
        ").map_err(|e| e.to_string())?;
        // Add synced_to_server to any pre-existing sessions table that predates this column
        let _ = conn.execute_batch("ALTER TABLE sessions ADD COLUMN synced_to_server INTEGER NOT NULL DEFAULT 0");
        set_schema_version(conn, 1);
    }

    // v2 — full race data: conditions on sessions, participants, participant_laps, lap fuel/compound
    if v < 2 {
        for (col, typ) in &[
            ("weather",       "TEXT"),
            ("temp_ambient",  "REAL"),
            ("temp_track",    "REAL"),
            ("humidity",      "REAL"),
            ("track_length_m","REAL"),
        ] {
            let _ = conn.execute_batch(&format!("ALTER TABLE sessions ADD COLUMN {col} {typ}"));
        }
        for (col, typ) in &[
            ("fuel_load",      "REAL"),
            ("tyre_compound",  "TEXT"),
        ] {
            let _ = conn.execute_batch(&format!("ALTER TABLE laps ADD COLUMN {col} {typ}"));
        }
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS participants (
                id               TEXT PRIMARY KEY,
                session_id       TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                driver_name      TEXT NOT NULL,
                car_name         TEXT,
                car_class        TEXT,
                position         INTEGER,
                laps_completed   INTEGER NOT NULL DEFAULT 0,
                best_lap_ms      INTEGER,
                finish_status    TEXT,
                pit_stops_count  INTEGER NOT NULL DEFAULT 0,
                dnf              INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);

            CREATE TABLE IF NOT EXISTS participant_laps (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
                lap_number     INTEGER NOT NULL,
                lap_time_ms    INTEGER,
                is_valid       INTEGER NOT NULL DEFAULT 1,
                sector1_ms     INTEGER,
                sector2_ms     INTEGER,
                sector3_ms     INTEGER,
                fuel_load      REAL,
                tyre_compound  TEXT,
                UNIQUE(participant_id, lap_number)
            );
            CREATE INDEX IF NOT EXISTS idx_participant_laps ON participant_laps(participant_id);
        ").map_err(|e| e.to_string())?;
        set_schema_version(conn, 2);
    }

    // v3 — goals + notes
    if v < 3 {
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS goals (
                id            TEXT PRIMARY KEY,
                name          TEXT NOT NULL,
                goal_type     TEXT NOT NULL,
                target_value  REAL NOT NULL,
                current_value REAL NOT NULL DEFAULT 0,
                unit          TEXT,
                track_name    TEXT,
                car_name      TEXT,
                status        TEXT NOT NULL DEFAULT 'ACTIVE',
                deadline      TEXT,
                completed_at  TEXT,
                created_at    TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notes (
                id         TEXT PRIMARY KEY,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                content    TEXT NOT NULL,
                tags       TEXT NOT NULL DEFAULT '[]',
                video_url  TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_notes_session ON notes(session_id);
        ").map_err(|e| e.to_string())?;
        set_schema_version(conn, 3);
    }

    // v4 — setups
    if v < 4 {
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS setups (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                car_name    TEXT,
                track_name  TEXT,
                conditions  TEXT,
                setup_type  TEXT,
                notes       TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_setups_car   ON setups(car_name);
            CREATE INDEX IF NOT EXISTS idx_setups_track ON setups(track_name);
        ").map_err(|e| e.to_string())?;
        set_schema_version(conn, 4);
    }

    // v5 — achievements
    if v < 5 {
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS achievements (
                slug        TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                description TEXT NOT NULL,
                category    TEXT NOT NULL,
                rarity      TEXT NOT NULL,
                icon        TEXT NOT NULL DEFAULT '🏆',
                target      REAL NOT NULL DEFAULT 1,
                progress    REAL NOT NULL DEFAULT 0,
                unlocked_at TEXT
            );
        ").map_err(|e| e.to_string())?;
        seed_achievements(conn)?;
        set_schema_version(conn, 5);
    }

    // v6 — grid position + server name
    if v < 6 {
        let _ = conn.execute_batch("ALTER TABLE sessions ADD COLUMN grid_position INTEGER");
        let _ = conn.execute_batch("ALTER TABLE sessions ADD COLUMN server_name TEXT");
        let _ = conn.execute_batch("ALTER TABLE participants ADD COLUMN grid_position INTEGER");
        set_schema_version(conn, 6);
    }

    // v7 — telemetry recordings (Shared Memory data recorded at 10 Hz)
    if v < 7 {
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS telemetry_recordings (
                id           TEXT PRIMARY KEY,
                session_id   TEXT REFERENCES sessions(id) ON DELETE SET NULL,
                track_name   TEXT NOT NULL DEFAULT '',
                session_type TEXT NOT NULL DEFAULT '',
                started_at   TEXT NOT NULL,
                ended_at     TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_tel_rec_session ON telemetry_recordings(session_id);
            CREATE INDEX IF NOT EXISTS idx_tel_rec_started ON telemetry_recordings(started_at DESC);

            CREATE TABLE IF NOT EXISTS telemetry_samples (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                recording_id TEXT NOT NULL REFERENCES telemetry_recordings(id) ON DELETE CASCADE,
                t_ms         INTEGER NOT NULL,
                lap          INTEGER NOT NULL DEFAULT 0,
                speed_kph    REAL, rpm REAL, gear INTEGER,
                throttle REAL, brake REAL, steering REAL, fuel_l REAL,
                tire_fl_temp REAL, tire_fr_temp REAL, tire_rl_temp REAL, tire_rr_temp REAL,
                tire_fl_wear REAL, tire_fr_wear REAL, tire_rl_wear REAL, tire_rr_wear REAL,
                tire_fl_pres REAL, tire_fr_pres REAL, tire_rl_pres REAL, tire_rr_pres REAL,
                brk_fl_temp  REAL, brk_fr_temp  REAL, brk_rl_temp  REAL, brk_rr_temp  REAL,
                oil_temp REAL, h2o_temp REAL,
                game_phase INTEGER DEFAULT 0,
                flag       INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_tel_samples_rec ON telemetry_samples(recording_id, t_ms);
        ").map_err(|e| e.to_string())?;
        set_schema_version(conn, 7);
    }

    Ok(())
}

// ── Sessions ──────────────────────────────────────────────────────────────────

pub fn hash_exists(conn: &Connection, hash: &str) -> bool {
    conn.query_row(
        "SELECT 1 FROM sessions WHERE file_hash = ?1",
        params![hash],
        |_| Ok(()),
    ).is_ok()
}

pub fn insert_session(
    conn:      &Connection,
    session:   &crate::parser::ParsedSession,
    metrics:   &crate::metrics_snapshot::MetricsSnapshot,
    file_path: &str,
    file_hash: &str,
    is_new_pb: bool,
) -> Result<String, String> {
    let id  = uuid::Uuid::new_v4().to_string();
    let now = now_iso();

    conn.execute(
        "INSERT INTO sessions (
            id, track_name, car_name, car_class, session_type, session_date,
            total_laps, valid_laps, best_lap_ms, avg_lap_ms, ideal_lap_ms,
            consistency_score, is_new_pb, final_position, duration_sec,
            is_online, dnf, file_path, file_hash, imported_at,
            weather, temp_ambient, temp_track, humidity, track_length_m,
            grid_position, server_name)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27)",
        params![
            id, session.track_name, session.car_name, session.car_class,
            session.session_type, session.session_date,
            session.total_laps, session.valid_laps,
            metrics.best_lap_ms, metrics.avg_lap_ms, metrics.ideal_lap_ms, metrics.consistency_score,
            is_new_pb as i32,
            session.final_position, session.duration_sec,
            session.is_online as i32, session.dnf as i32,
            file_path, file_hash, now,
            session.weather, session.temp_ambient, session.temp_track,
            session.humidity, session.track_length_m,
            session.grid_position, session.server_name,
        ],
    ).map_err(|e| e.to_string())?;

    for lap in &session.laps {
        conn.execute(
            "INSERT INTO laps (session_id, lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms, fuel_load, tyre_compound)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![
                id, lap.lap_number, lap.lap_time_ms, lap.is_valid as i32,
                lap.sector1_ms, lap.sector2_ms, lap.sector3_ms,
                lap.fuel_load, lap.tyre_compound,
            ],
        ).map_err(|e| e.to_string())?;
    }

    Ok(id)
}

pub fn detect_pb(conn: &Connection, track: &str, car: &str, best_ms: Option<i32>) -> bool {
    let Some(best) = best_ms else { return false };
    let prev: Option<i32> = conn.query_row(
        "SELECT best_lap_ms FROM sessions WHERE track_name=?1 AND car_name=?2 AND best_lap_ms IS NOT NULL ORDER BY best_lap_ms ASC LIMIT 1",
        params![track, car],
        |row| row.get(0),
    ).ok();
    prev.map(|p| best < p).unwrap_or(true)
}

pub fn mark_synced(conn: &Connection, session_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE sessions SET synced_to_server=1 WHERE id=?1",
        params![session_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_sessions(conn: &Connection) -> Result<Vec<SessionSummary>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, track_name, car_name, session_type, session_date,
                total_laps, valid_laps, best_lap_ms, consistency_score,
                is_new_pb, dnf, synced_to_server,
                final_position, server_name, is_online
         FROM sessions ORDER BY session_date DESC LIMIT 200"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| Ok(SessionSummary {
        id:                row.get(0)?,
        track_name:        row.get(1)?,
        car_name:          row.get(2)?,
        session_type:      row.get(3)?,
        session_date:      row.get(4)?,
        total_laps:        row.get(5)?,
        valid_laps:        row.get(6)?,
        best_lap_ms:       row.get(7)?,
        consistency_score: row.get(8)?,
        is_new_pb:         row.get::<_, i32>(9)? != 0,
        dnf:               row.get::<_, i32>(10)? != 0,
        synced_to_server:  row.get::<_, i32>(11)? != 0,
        final_position:    row.get(12)?,
        server_name:       row.get(13)?,
        is_online:         row.get::<_, i32>(14)? != 0,
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_session_detail(conn: &Connection, id: &str) -> Result<Option<SessionDetail>, String> {
    let summary = conn.query_row(
        "SELECT id, track_name, car_name, session_type, session_date, total_laps, valid_laps,
                best_lap_ms, consistency_score, is_new_pb, dnf, synced_to_server,
                final_position, server_name,
                car_class, grid_position, duration_sec, is_online, avg_lap_ms, ideal_lap_ms,
                weather, temp_ambient, temp_track, humidity, track_length_m
         FROM sessions WHERE id=?1",
        params![id],
        |row| Ok((
            SessionSummary {
                id:                row.get(0)?,
                track_name:        row.get(1)?,
                car_name:          row.get(2)?,
                session_type:      row.get(3)?,
                session_date:      row.get(4)?,
                total_laps:        row.get(5)?,
                valid_laps:        row.get(6)?,
                best_lap_ms:       row.get(7)?,
                consistency_score: row.get(8)?,
                is_new_pb:         row.get::<_, i32>(9)? != 0,
                dnf:               row.get::<_, i32>(10)? != 0,
                synced_to_server:  row.get::<_, i32>(11)? != 0,
                final_position:    row.get(12)?,
                server_name:       row.get(13)?,
                is_online:         row.get::<_, i32>(17)? != 0,
            },
            row.get::<_, Option<String>>(14)?,   // car_class
            row.get::<_, Option<i32>>(15)?,      // grid_position
            row.get::<_, Option<i32>>(16)?,      // duration_sec
            row.get::<_, Option<f64>>(18)?,      // avg_lap_ms
            row.get::<_, Option<i32>>(19)?,      // ideal_lap_ms
            row.get::<_, Option<String>>(20)?,   // weather
            row.get::<_, Option<f64>>(21)?,      // temp_ambient
            row.get::<_, Option<f64>>(22)?,      // temp_track
            row.get::<_, Option<f64>>(23)?,      // humidity
            row.get::<_, Option<f64>>(24)?,      // track_length_m
        )),
    );

    let Ok((summary, car_class, grid_position, duration_sec, is_online,
            avg_lap_ms, ideal_lap_ms, weather, temp_ambient, temp_track, humidity, track_length_m)) = summary else {
        return Ok(None);
    };

    let mut stmt = conn.prepare(
        "SELECT lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms, fuel_load, tyre_compound
         FROM laps WHERE session_id=?1 ORDER BY lap_number ASC"
    ).map_err(|e| e.to_string())?;

    let laps = stmt.query_map(params![id], |row| Ok(LapRow {
        lap_number:    row.get(0)?,
        lap_time_ms:   row.get(1)?,
        is_valid:      row.get::<_, i32>(2)? != 0,
        sector1_ms:    row.get(3)?,
        sector2_ms:    row.get(4)?,
        sector3_ms:    row.get(5)?,
        fuel_load:     row.get(6)?,
        tyre_compound: row.get(7)?,
    })).map_err(|e| e.to_string())?
       .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(Some(SessionDetail {
        summary, car_class, grid_position, duration_sec, is_online,
        avg_lap_ms, ideal_lap_ms, weather, temp_ambient, temp_track, humidity, track_length_m,
        laps,
    }))
}

pub fn delete_session(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM sessions WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Participants ──────────────────────────────────────────────────────────────

pub fn insert_participants(
    conn:       &Connection,
    session_id: &str,
    participants: &[crate::parser::ParsedParticipant],
) -> Result<(), String> {
    for p in participants {
        let pid = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO participants (id, session_id, driver_name, car_name, car_class, position,
             laps_completed, best_lap_ms, finish_status, pit_stops_count, dnf, grid_position)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![
                pid, session_id, p.driver_name, p.car_name, p.car_class,
                p.position, p.laps_completed, p.best_lap_ms,
                p.finish_status, p.pit_stops_count, p.dnf as i32,
                p.grid_position,
            ],
        ).map_err(|e| e.to_string())?;

        if !p.laps.is_empty() {
            let mut stmt = conn.prepare(
                "INSERT OR IGNORE INTO participant_laps
                 (participant_id, lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms, fuel_load, tyre_compound)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)"
            ).map_err(|e| e.to_string())?;

            for lap in &p.laps {
                stmt.execute(params![
                    pid, lap.lap_number, lap.lap_time_ms, lap.is_valid as i32,
                    lap.sector1_ms, lap.sector2_ms, lap.sector3_ms,
                    lap.fuel_load, lap.tyre_compound,
                ]).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

pub fn get_participants(conn: &Connection, session_id: &str) -> Result<Vec<Participant>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, driver_name, car_name, car_class, position,
                laps_completed, best_lap_ms, finish_status, pit_stops_count, dnf,
                grid_position
         FROM participants WHERE session_id=?1 ORDER BY position ASC NULLS LAST"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![session_id], |row| Ok(Participant {
        id:              row.get(0)?,
        session_id:      row.get(1)?,
        driver_name:     row.get(2)?,
        car_name:        row.get(3)?,
        car_class:       row.get(4)?,
        position:        row.get(5)?,
        laps_completed:  row.get(6)?,
        best_lap_ms:     row.get(7)?,
        finish_status:   row.get(8)?,
        pit_stops_count: row.get(9)?,
        dnf:             row.get::<_, i32>(10)? != 0,
        grid_position:   row.get(11)?,
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_participant_laps(conn: &Connection, participant_id: &str) -> Result<Vec<ParticipantLap>, String> {
    let mut stmt = conn.prepare(
        "SELECT lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms, fuel_load, tyre_compound
         FROM participant_laps WHERE participant_id=?1 ORDER BY lap_number ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![participant_id], |row| Ok(ParticipantLap {
        lap_number:    row.get(0)?,
        lap_time_ms:   row.get(1)?,
        is_valid:      row.get::<_, i32>(2)? != 0,
        sector1_ms:    row.get(3)?,
        sector2_ms:    row.get(4)?,
        sector3_ms:    row.get(5)?,
        fuel_load:     row.get(6)?,
        tyre_compound: row.get(7)?,
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ── Goals ─────────────────────────────────────────────────────────────────────

pub fn create_goal(conn: &Connection, input: &CreateGoalInput) -> Result<String, String> {
    let id  = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    conn.execute(
        "INSERT INTO goals (id, name, goal_type, target_value, current_value, unit, track_name, car_name, status, deadline, created_at)
         VALUES (?1,?2,?3,?4,0,?5,?6,?7,'ACTIVE',?8,?9)",
        params![
            id, input.name, input.goal_type, input.target_value,
            input.unit, input.track_name, input.car_name, input.deadline, now,
        ],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn get_goals(conn: &Connection) -> Result<Vec<Goal>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, name, goal_type, target_value, current_value, unit, track_name, car_name,
                status, deadline, completed_at, created_at
         FROM goals ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| Ok(Goal {
        id:            row.get(0)?,
        name:          row.get(1)?,
        goal_type:     row.get(2)?,
        target_value:  row.get(3)?,
        current_value: row.get(4)?,
        unit:          row.get(5)?,
        track_name:    row.get(6)?,
        car_name:      row.get(7)?,
        status:        row.get(8)?,
        deadline:      row.get(9)?,
        completed_at:  row.get(10)?,
        created_at:    row.get(11)?,
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn delete_goal(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM goals WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_goal_status(conn: &Connection, id: &str, status: &str) -> Result<(), String> {
    let completed_at = if status == "COMPLETED" { Some(now_iso()) } else { None };
    conn.execute(
        "UPDATE goals SET status=?1, completed_at=?2 WHERE id=?3",
        params![status, completed_at, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Called after each session import to auto-update goal progress.
pub fn update_goals_for_session(
    conn:              &Connection,
    track_name:        &str,
    car_name:          &str,
    best_lap_ms:       Option<i32>,
    consistency_score: Option<f64>,
    duration_sec:      Option<i32>,
) -> Result<(), String> {
    let now = now_iso();

    // SESSION_COUNT — increment all active session-count goals that match filter
    let goals = get_goals(conn)?;
    for g in &goals {
        if g.status != "ACTIVE" { continue; }

        let matches_filter = matches_track_car_filter(g, track_name, car_name);

        let new_value = match g.goal_type.as_str() {
            "SESSION_COUNT" if matches_filter => Some(g.current_value + 1.0),
            "HOURS_DRIVEN" if matches_filter => {
                duration_sec.map(|d| g.current_value + d as f64 / 3600.0)
            }
            "BEST_LAP_TIME" if matches_filter => {
                best_lap_ms.map(|ms| {
                    // current_value = best ms seen so far (0 = unset)
                    if g.current_value == 0.0 || (ms as f64) < g.current_value {
                        ms as f64
                    } else {
                        g.current_value
                    }
                })
            }
            "CONSISTENCY_SCORE" if matches_filter => {
                consistency_score.map(|s| if s > g.current_value { s } else { g.current_value })
            }
            _ => None,
        };

        if let Some(v) = new_value {
            conn.execute(
                "UPDATE goals SET current_value=?1 WHERE id=?2",
                params![v, g.id],
            ).map_err(|e| e.to_string())?;

            // Check completion
            let completed = match g.goal_type.as_str() {
                "BEST_LAP_TIME"   => v > 0.0 && v <= g.target_value,
                _                 => v >= g.target_value,
            };
            if completed {
                conn.execute(
                    "UPDATE goals SET status='COMPLETED', completed_at=?1 WHERE id=?2",
                    params![now, g.id],
                ).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}

fn matches_track_car_filter(goal: &Goal, track_name: &str, car_name: &str) -> bool {
    let track_ok = goal.track_name.as_deref().map(|t| t == track_name).unwrap_or(true);
    let car_ok   = goal.car_name.as_deref().map(|c| c == car_name).unwrap_or(true);
    track_ok && car_ok
}

// ── Notes ─────────────────────────────────────────────────────────────────────

pub fn create_note(
    conn:       &Connection,
    session_id: &str,
    content:    &str,
    tags:       &str,
    video_url:  Option<&str>,
) -> Result<String, String> {
    let id  = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    conn.execute(
        "INSERT INTO notes (id, session_id, content, tags, video_url, created_at)
         VALUES (?1,?2,?3,?4,?5,?6)",
        params![id, session_id, content, tags, video_url, now],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn get_notes(conn: &Connection, session_id: &str) -> Result<Vec<Note>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, content, tags, video_url, created_at
         FROM notes WHERE session_id=?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![session_id], |row| Ok(Note {
        id:         row.get(0)?,
        session_id: row.get(1)?,
        content:    row.get(2)?,
        tags:       row.get(3)?,
        video_url:  row.get(4)?,
        created_at: row.get(5)?,
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn delete_note(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM notes WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

pub fn get_dashboard_stats(conn: &Connection) -> Result<DashboardStats, String> {
    let total_sessions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions", [], |r| r.get(0),
    ).unwrap_or(0);

    let total_laps: i32 = conn.query_row(
        "SELECT COUNT(*) FROM laps WHERE is_valid=1", [], |r| r.get(0),
    ).unwrap_or(0);

    let total_hours: f64 = conn.query_row(
        "SELECT COALESCE(SUM(duration_sec),0) FROM sessions WHERE duration_sec IS NOT NULL",
        [], |r| r.get::<_, f64>(0),
    ).unwrap_or(0.0) / 3600.0;

    let unique_tracks: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT track_name) FROM sessions", [], |r| r.get(0),
    ).unwrap_or(0);

    let unique_cars: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT car_name) FROM sessions", [], |r| r.get(0),
    ).unwrap_or(0);

    let avg_consistency: Option<f64> = conn.query_row(
        "SELECT AVG(consistency_score) FROM sessions WHERE consistency_score IS NOT NULL",
        [], |r| r.get(0),
    ).ok().flatten();

    let pb_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE is_new_pb=1", [], |r| r.get(0),
    ).unwrap_or(0);

    let recent_pb: Option<RecentPb> = conn.query_row(
        "SELECT id, track_name, car_name, best_lap_ms, session_date
         FROM sessions WHERE is_new_pb=1 AND best_lap_ms IS NOT NULL
         ORDER BY session_date DESC LIMIT 1",
        [],
        |row| Ok(RecentPb {
            session_id:  row.get(0)?,
            track_name:  row.get(1)?,
            car_name:    row.get(2)?,
            best_lap_ms: row.get(3)?,
            session_date: row.get(4)?,
        }),
    ).ok();

    Ok(DashboardStats {
        total_sessions,
        total_laps,
        total_hours,
        unique_tracks,
        unique_cars,
        avg_consistency,
        pb_count,
        recent_pb,
    })
}

pub fn get_tracks(conn: &Connection) -> Result<Vec<TrackStat>, String> {
    let mut stmt = conn.prepare(
        "SELECT track_name, COUNT(*) as sessions,
                MIN(CASE WHEN best_lap_ms > 0 THEN best_lap_ms END) as best_lap_ms,
                MAX(session_date) as last_driven,
                SUM(valid_laps) as total_laps
         FROM sessions GROUP BY track_name ORDER BY sessions DESC, last_driven DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(TrackStat {
        track_name:  row.get(0)?,
        sessions:    row.get(1)?,
        best_lap_ms: row.get(2)?,
        last_driven: row.get(3)?,
        total_laps:  row.get(4)?,
    })).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_cars(conn: &Connection) -> Result<Vec<CarStat>, String> {
    let mut stmt = conn.prepare(
        "SELECT car_name, car_class, COUNT(*) as sessions,
                MIN(CASE WHEN best_lap_ms > 0 THEN best_lap_ms END) as best_lap_ms,
                MAX(session_date) as last_driven,
                SUM(valid_laps) as total_laps
         FROM sessions GROUP BY car_name ORDER BY sessions DESC, last_driven DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(CarStat {
        car_name:    row.get(0)?,
        car_class:   row.get(1)?,
        sessions:    row.get(2)?,
        best_lap_ms: row.get(3)?,
        last_driven: row.get(4)?,
        total_laps:  row.get(5)?,
    })).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ── Track / Car detail ───────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PbPoint {
    pub date:        String,
    pub best_lap_ms: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendPoint {
    pub date:  String,
    pub value: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeCount {
    pub session_type: String,
    pub count:        i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackBest {
    pub track_name:  String,
    pub best_lap_ms: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRowForTrack {
    pub id:                String,
    pub session_date:      String,
    pub car_name:          String,
    pub session_type:      String,
    pub total_laps:        i32,
    pub best_lap_ms:       Option<i32>,
    pub consistency_score: Option<f64>,
    pub is_new_pb:         bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackDetail {
    pub track_name:          String,
    pub total_sessions:      i32,
    pub total_laps:          i32,
    pub best_lap_ms:         Option<i32>,
    pub avg_consistency:     Option<f64>,
    pub best_s1_ms:          Option<i32>,
    pub best_s2_ms:          Option<i32>,
    pub best_s3_ms:          Option<i32>,
    pub ideal_lap_ms:        Option<i32>,
    pub pb_history:          Vec<PbPoint>,
    pub consistency_trend:   Vec<TrendPoint>,
    pub session_type_counts: Vec<TypeCount>,
    pub lap_times_ms:        Vec<i32>,
    pub sessions:            Vec<SessionRowForTrack>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRowForCar {
    pub id:                String,
    pub session_date:      String,
    pub track_name:        String,
    pub session_type:      String,
    pub total_laps:        i32,
    pub best_lap_ms:       Option<i32>,
    pub consistency_score: Option<f64>,
    pub is_new_pb:         bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CarDetail {
    pub car_name:            String,
    pub car_class:           Option<String>,
    pub total_sessions:      i32,
    pub total_laps:          i32,
    pub best_lap_ms:         Option<i32>,
    pub avg_consistency:     Option<f64>,
    pub track_bests:         Vec<TrackBest>,
    pub pb_history:          Vec<PbPoint>,
    pub consistency_trend:   Vec<TrendPoint>,
    pub session_type_counts: Vec<TypeCount>,
    pub sessions:            Vec<SessionRowForCar>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverDna {
    pub consistency: Option<f64>,  // avg consistency_score
    pub pace:        Option<f64>,  // avg (ideal_lap/best_lap)*100 where both available
    pub safety:      Option<f64>,  // avg (valid_laps/total_laps)*100
    pub improvement: Option<f64>,  // (first_best - current_best)/first_best*100 across combos
    pub streak:      i32,          // consecutive days with sessions up to today
}

pub fn get_track_detail(conn: &Connection, track_name: &str) -> Result<Option<TrackDetail>, String> {
    let total_sessions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE track_name=?1",
        params![track_name], |r| r.get(0),
    ).unwrap_or(0);
    if total_sessions == 0 { return Ok(None); }

    let total_laps: i32 = conn.query_row(
        "SELECT COALESCE(SUM(valid_laps),0) FROM sessions WHERE track_name=?1",
        params![track_name], |r| r.get(0),
    ).unwrap_or(0);

    let best_lap_ms: Option<i32> = conn.query_row(
        "SELECT MIN(best_lap_ms) FROM sessions WHERE track_name=?1 AND best_lap_ms>0",
        params![track_name], |r| r.get(0),
    ).ok().flatten();

    let avg_consistency: Option<f64> = conn.query_row(
        "SELECT AVG(consistency_score) FROM sessions WHERE track_name=?1 AND consistency_score IS NOT NULL",
        params![track_name], |r| r.get(0),
    ).ok().flatten();

    let best_s1_ms: Option<i32> = conn.query_row(
        "SELECT MIN(sector1_ms) FROM laps \
         WHERE session_id IN (SELECT id FROM sessions WHERE track_name=?1) \
           AND is_valid=1 AND sector1_ms>0",
        params![track_name], |r| r.get(0),
    ).ok().flatten();

    let best_s2_ms: Option<i32> = conn.query_row(
        "SELECT MIN(sector2_ms) FROM laps \
         WHERE session_id IN (SELECT id FROM sessions WHERE track_name=?1) \
           AND is_valid=1 AND sector2_ms>0",
        params![track_name], |r| r.get(0),
    ).ok().flatten();

    let best_s3_ms: Option<i32> = conn.query_row(
        "SELECT MIN(sector3_ms) FROM laps \
         WHERE session_id IN (SELECT id FROM sessions WHERE track_name=?1) \
           AND is_valid=1 AND sector3_ms>0",
        params![track_name], |r| r.get(0),
    ).ok().flatten();

    let ideal_lap_ms = match (best_s1_ms, best_s2_ms, best_s3_ms) {
        (Some(s1), Some(s2), Some(s3)) => Some(s1 + s2 + s3),
        _ => None,
    };

    let mut stmt = conn.prepare(
        "SELECT lap_time_ms FROM laps \
         WHERE session_id IN (SELECT id FROM sessions WHERE track_name=?1) \
           AND is_valid=1 AND lap_time_ms>0 ORDER BY lap_time_ms ASC",
    ).map_err(|e| e.to_string())?;
    let lap_times_ms: Vec<i32> = stmt.query_map(params![track_name], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Sessions asc for history/trend computation
    let mut stmt = conn.prepare(
        "SELECT id, session_date, car_name, session_type, valid_laps, best_lap_ms, consistency_score, is_new_pb \
         FROM sessions WHERE track_name=?1 ORDER BY session_date ASC",
    ).map_err(|e| e.to_string())?;
    let session_rows_asc: Vec<SessionRowForTrack> = stmt.query_map(params![track_name], |r| {
        Ok(SessionRowForTrack {
            id:                r.get(0)?,
            session_date:      r.get(1)?,
            car_name:          r.get(2)?,
            session_type:      r.get(3)?,
            total_laps:        r.get(4)?,
            best_lap_ms:       r.get(5)?,
            consistency_score: r.get(6)?,
            is_new_pb:         r.get::<_, i32>(7)? == 1,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    // PB history (running minimum)
    let mut running_best = i32::MAX;
    let pb_history: Vec<PbPoint> = session_rows_asc.iter()
        .filter_map(|s| {
            let ms = s.best_lap_ms.filter(|&m| m > 0)?;
            if ms < running_best { running_best = ms; Some(PbPoint { date: s.session_date.clone(), best_lap_ms: ms }) }
            else { None }
        })
        .collect();

    let consistency_trend: Vec<TrendPoint> = session_rows_asc.iter()
        .filter_map(|s| s.consistency_score.map(|v| TrendPoint { date: s.session_date.clone(), value: v }))
        .collect();

    let mut type_map: std::collections::HashMap<String, i32> = std::collections::HashMap::new();
    for s in &session_rows_asc { *type_map.entry(s.session_type.clone()).or_insert(0) += 1; }
    let session_type_counts: Vec<TypeCount> = type_map.into_iter()
        .map(|(session_type, count)| TypeCount { session_type, count })
        .collect();

    let sessions: Vec<SessionRowForTrack> = session_rows_asc.into_iter().rev().collect();

    Ok(Some(TrackDetail {
        track_name: track_name.to_string(),
        total_sessions, total_laps, best_lap_ms, avg_consistency,
        best_s1_ms, best_s2_ms, best_s3_ms, ideal_lap_ms,
        pb_history, consistency_trend, session_type_counts, lap_times_ms, sessions,
    }))
}

pub fn get_car_detail(conn: &Connection, car_name: &str) -> Result<Option<CarDetail>, String> {
    let total_sessions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE car_name=?1",
        params![car_name], |r| r.get(0),
    ).unwrap_or(0);
    if total_sessions == 0 { return Ok(None); }

    let car_class: Option<String> = conn.query_row(
        "SELECT car_class FROM sessions WHERE car_name=?1 AND car_class IS NOT NULL LIMIT 1",
        params![car_name], |r| r.get(0),
    ).ok().flatten();

    let total_laps: i32 = conn.query_row(
        "SELECT COALESCE(SUM(valid_laps),0) FROM sessions WHERE car_name=?1",
        params![car_name], |r| r.get(0),
    ).unwrap_or(0);

    let best_lap_ms: Option<i32> = conn.query_row(
        "SELECT MIN(best_lap_ms) FROM sessions WHERE car_name=?1 AND best_lap_ms>0",
        params![car_name], |r| r.get(0),
    ).ok().flatten();

    let avg_consistency: Option<f64> = conn.query_row(
        "SELECT AVG(consistency_score) FROM sessions WHERE car_name=?1 AND consistency_score IS NOT NULL",
        params![car_name], |r| r.get(0),
    ).ok().flatten();

    // Best lap per track
    let mut stmt = conn.prepare(
        "SELECT track_name, MIN(best_lap_ms) as best FROM sessions \
         WHERE car_name=?1 AND best_lap_ms>0 \
         GROUP BY track_name ORDER BY best ASC",
    ).map_err(|e| e.to_string())?;
    let track_bests: Vec<TrackBest> = stmt.query_map(params![car_name], |r| {
        Ok(TrackBest { track_name: r.get(0)?, best_lap_ms: r.get(1)? })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    // Sessions asc for trends
    let mut stmt = conn.prepare(
        "SELECT id, session_date, track_name, session_type, valid_laps, best_lap_ms, consistency_score, is_new_pb \
         FROM sessions WHERE car_name=?1 ORDER BY session_date ASC",
    ).map_err(|e| e.to_string())?;
    let session_rows_asc: Vec<SessionRowForCar> = stmt.query_map(params![car_name], |r| {
        Ok(SessionRowForCar {
            id:                r.get(0)?,
            session_date:      r.get(1)?,
            track_name:        r.get(2)?,
            session_type:      r.get(3)?,
            total_laps:        r.get(4)?,
            best_lap_ms:       r.get(5)?,
            consistency_score: r.get(6)?,
            is_new_pb:         r.get::<_, i32>(7)? == 1,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    let mut running_best = i32::MAX;
    let pb_history: Vec<PbPoint> = session_rows_asc.iter()
        .filter_map(|s| {
            let ms = s.best_lap_ms.filter(|&m| m > 0)?;
            if ms < running_best { running_best = ms; Some(PbPoint { date: s.session_date.clone(), best_lap_ms: ms }) }
            else { None }
        })
        .collect();

    let consistency_trend: Vec<TrendPoint> = session_rows_asc.iter()
        .filter_map(|s| s.consistency_score.map(|v| TrendPoint { date: s.session_date.clone(), value: v }))
        .collect();

    let mut type_map: std::collections::HashMap<String, i32> = std::collections::HashMap::new();
    for s in &session_rows_asc { *type_map.entry(s.session_type.clone()).or_insert(0) += 1; }
    let session_type_counts: Vec<TypeCount> = type_map.into_iter()
        .map(|(session_type, count)| TypeCount { session_type, count })
        .collect();

    let sessions: Vec<SessionRowForCar> = session_rows_asc.into_iter().rev().collect();

    Ok(Some(CarDetail {
        car_name: car_name.to_string(), car_class,
        total_sessions, total_laps, best_lap_ms, avg_consistency,
        track_bests, pb_history, consistency_trend, session_type_counts, sessions,
    }))
}

/// Returns the id of the best-lap session at the given track+car, excluding `exclude_id`.
pub fn get_pb_session_id_for(
    conn:       &Connection,
    track_name: &str,
    car_name:   &str,
    exclude_id: &str,
) -> Result<Option<String>, String> {
    match conn.query_row(
        "SELECT id FROM sessions \
         WHERE track_name=?1 AND car_name=?2 AND id!=?3 AND best_lap_ms>0 \
         ORDER BY best_lap_ms ASC LIMIT 1",
        params![track_name, car_name, exclude_id],
        |r| r.get::<_, String>(0),
    ) {
        Ok(id)                                    => Ok(Some(id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e)                                    => Err(e.to_string()),
    }
}

pub fn get_driver_dna(conn: &Connection) -> Result<DriverDna, String> {
    // Consistency: avg of all sessions
    let consistency: Option<f64> = conn.query_row(
        "SELECT AVG(consistency_score) FROM sessions WHERE consistency_score IS NOT NULL",
        [], |r| r.get(0),
    ).ok().flatten();

    // Pace: avg of (ideal_lap_ms/best_lap_ms)*100 where both >0
    let pace: Option<f64> = conn.query_row(
        "SELECT AVG(CAST(ideal_lap_ms AS REAL)/best_lap_ms*100) \
         FROM sessions WHERE ideal_lap_ms>0 AND best_lap_ms>0",
        [], |r| r.get(0),
    ).ok().flatten();

    // Safety: avg of (valid_laps/total_laps)*100 where total_laps>0
    let safety: Option<f64> = conn.query_row(
        "SELECT AVG(CAST(valid_laps AS REAL)/total_laps*100) \
         FROM sessions WHERE total_laps>0",
        [], |r| r.get(0),
    ).ok().flatten();

    // Improvement: average per-combo improvement % (first_best - min_best) / first_best * 100
    let mut stmt = conn.prepare(
        "SELECT MIN(session_date), MIN(best_lap_ms), MAX(session_date), \
                (SELECT best_lap_ms FROM sessions s2 WHERE s2.track_name=s.track_name AND s2.car_name=s.car_name AND best_lap_ms>0 ORDER BY session_date ASC LIMIT 1) as first_best \
         FROM sessions s WHERE best_lap_ms>0 GROUP BY track_name, car_name HAVING COUNT(*)>1",
    ).map_err(|e| e.to_string())?;
    let combo_improvements: Vec<f64> = stmt.query_map([], |r| {
        let first_best: Option<i32> = r.get(3)?;
        let best: Option<i32>       = r.get(1)?;
        Ok((first_best, best))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .filter_map(|(first, best)| {
        let f = first? as f64;
        let b = best?  as f64;
        if f > 0.0 && b < f { Some((f - b) / f * 100.0) } else { None }
    })
    .collect();
    let improvement = if combo_improvements.is_empty() { None }
    else { Some(combo_improvements.iter().sum::<f64>() / combo_improvements.len() as f64 * 5.0) }; // scale ×5 so ~2% avg → ~10

    // Streak: consecutive days with sessions ending today or yesterday
    let mut stmt = conn.prepare(
        "SELECT DISTINCT date(session_date) as day FROM sessions ORDER BY day DESC",
    ).map_err(|e| e.to_string())?;
    let days: Vec<String> = stmt.query_map([], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let streak = compute_streak(&days);

    Ok(DriverDna { consistency, pace, safety, improvement, streak })
}

fn compute_streak(days_desc: &[String]) -> i32 {
    if days_desc.is_empty() { return 0; }
    let today = crate::date::today_date_str();
    let yesterday = crate::date::yesterday_date_str();
    if days_desc[0] != today && days_desc[0] != yesterday { return 0; }
    let mut streak = 1i32;
    for w in days_desc.windows(2) {
        if days_are_consecutive(&w[1], &w[0]) { streak += 1; } else { break; }
    }
    streak
}

fn days_are_consecutive(older: &str, newer: &str) -> bool {
    // Parse YYYY-MM-DD and check newer = older + 1 day
    let parse = |s: &str| -> Option<(i32, u32, u32)> {
        let mut p = s.split('-');
        let y: i32 = p.next()?.parse().ok()?;
        let m: u32 = p.next()?.parse().ok()?;
        let d: u32 = p.next()?.parse().ok()?;
        Some((y, m, d))
    };
    let (oy, om, od) = match parse(older) { Some(v) => v, None => return false };
    let (ny, nm, nd) = match parse(newer) { Some(v) => v, None => return false };
    // Compute older + 1 day
    let days_in_month = |y: i32, m: u32| match m {
        1|3|5|7|8|10|12 => 31,
        4|6|9|11 => 30,
        2 => if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) { 29 } else { 28 },
        _ => 30,
    };
    let (ey, em, ed) = if od < days_in_month(oy, om) {
        (oy, om, od + 1)
    } else if om < 12 {
        (oy, om + 1, 1)
    } else {
        (oy + 1, 1, 1)
    };
    ny == ey && nm == em && nd == ed
}

// ── Achievements ─────────────────────────────────────────────────────────────

// (slug, name, description, category, rarity, icon, target)
const ACHIEVEMENT_DEFS: &[(&str, &str, &str, &str, &str, &str, f64)] = &[
    // ── Volume ──────────────────────────────────────────────────────────────
    ("first_session",    "First Session",       "Complete your first session",                            "VOLUME",      "COMMON",     "🚥", 1.0),
    ("lap_apprentice",   "Lap Apprentice",      "Complete 10 valid laps",                                "VOLUME",      "COMMON",     "🏁", 10.0),
    ("century_driver",   "Century Driver",      "Complete 100 valid laps",                               "VOLUME",      "RARE",       "💯", 100.0),
    ("road_warrior",     "Road Warrior",        "Complete 500 valid laps",                               "VOLUME",      "EPIC",       "🛣️", 500.0),
    ("elite_driver",     "Elite Driver",        "Complete 1000 valid laps",                              "VOLUME",      "LEGENDARY",  "👑", 1000.0),
    ("dedicated",        "Dedicated",           "Complete 10 sessions",                                  "VOLUME",      "UNCOMMON",   "📅", 10.0),
    ("committed",        "Committed",           "Complete 50 sessions",                                  "VOLUME",      "RARE",       "🔒", 50.0),
    ("sim_pro",          "Sim Pro",             "Complete 200 sessions",                                 "VOLUME",      "EPIC",       "🏆", 200.0),
    ("night_owl",        "Night Owl",           "Accumulate 10 hours of driving",                        "VOLUME",      "UNCOMMON",   "🦉", 10.0),
    ("time_lord",        "Time Lord",           "Accumulate 50 hours of driving",                        "VOLUME",      "EPIC",       "⌛", 50.0),
    // ── Pace ────────────────────────────────────────────────────────────────
    ("first_pb",         "Setting The Bar",     "Set your first personal best lap time",                 "PACE",        "UNCOMMON",   "⚡", 1.0),
    ("speed_chaser",     "Speed Chaser",        "Set 5 personal bests across all circuits",              "PACE",        "RARE",       "🎯", 5.0),
    ("speed_demon",      "Speed Demon",         "Set 10 personal bests across all circuits",             "PACE",        "EPIC",       "🔥", 10.0),
    ("sector_hunter",    "Sector Hunter",       "Set personal bests in all 3 sectors in one session",   "PACE",        "EPIC",       "🔍", 1.0),
    // ── Consistency ─────────────────────────────────────────────────────────
    ("consistency_king", "Consistency King",    "Score above 90 consistency in a session",               "CONSISTENCY", "RARE",       "📊", 1.0),
    ("rock_solid",       "Rock Solid",          "Score above 95 consistency in a session",               "CONSISTENCY", "EPIC",       "💎", 1.0),
    ("on_rails",         "On Rails",            "Complete 5 sessions with consistency above 85",         "CONSISTENCY", "RARE",       "⚙️", 5.0),
    // ── Endurance ───────────────────────────────────────────────────────────
    ("endurance_pilot",  "Endurance Pilot",     "Complete 20 or more laps in one session",               "ENDURANCE",   "UNCOMMON",   "⏱️", 1.0),
    ("marathon_man",     "Marathon Man",        "Complete 50 or more laps in one session",               "ENDURANCE",   "RARE",       "🏃", 1.0),
    ("endurance_legend", "Endurance Legend",    "Complete 100 or more laps in one session",              "ENDURANCE",   "LEGENDARY",  "🌟", 1.0),
    // ── Race craft ──────────────────────────────────────────────────────────
    ("glass_clean",      "Glass Clean",         "Finish a race without DNF",                             "RACE_CRAFT",  "UNCOMMON",   "🧹", 1.0),
    ("podium",           "Podium",              "Finish in the top 3 in an online race",                 "RACE_CRAFT",  "UNCOMMON",   "🥉", 1.0),
    ("race_winner",      "Race Winner",         "Finish P1 in an online race",                           "RACE_CRAFT",  "RARE",       "🥇", 1.0),
    ("hat_trick",        "Hat Trick",           "Win 3 online races",                                    "RACE_CRAFT",  "EPIC",       "🎩", 3.0),
    ("iron_will",        "Iron Will",           "Complete 10 races without DNF",                         "RACE_CRAFT",  "RARE",       "🛡️", 10.0),
    // ── Exploration ─────────────────────────────────────────────────────────
    ("track_explorer",   "Track Explorer",      "Race at 3 different tracks",                            "EXPLORATION", "COMMON",     "🗺️", 3.0),
    ("track_collector",  "Track Collector",     "Race at 5 different tracks",                            "EXPLORATION", "UNCOMMON",   "📍", 5.0),
    ("world_traveler",   "World Traveler",      "Race at 10 different tracks",                           "EXPLORATION", "RARE",       "🌍", 10.0),
    ("car_collector",    "Car Collector",       "Drive 5 different cars",                                "EXPLORATION", "UNCOMMON",   "🚗", 5.0),
    ("fleet_owner",      "Fleet Owner",         "Drive 10 different cars",                               "EXPLORATION", "RARE",       "🏎️", 10.0),
    ("triple_threat",    "Triple Threat",       "Complete practice, qualifying and race at the same track", "EXPLORATION", "RARE",    "🔱", 1.0),
];

fn seed_achievements(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn.prepare(
        "INSERT OR IGNORE INTO achievements (slug, name, description, category, rarity, icon, target)
         VALUES (?1,?2,?3,?4,?5,?6,?7)"
    ).map_err(|e| e.to_string())?;

    for (slug, name, desc, cat, rarity, icon, target) in ACHIEVEMENT_DEFS {
        stmt.execute(params![slug, name, desc, cat, rarity, icon, target])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_achievements(conn: &Connection) -> Result<Vec<Achievement>, String> {
    let mut stmt = conn.prepare(
        "SELECT slug, name, description, category, rarity, icon, target, progress, unlocked_at
         FROM achievements
         ORDER BY
           CASE rarity
             WHEN 'LEGENDARY' THEN 1 WHEN 'EPIC' THEN 2 WHEN 'RARE' THEN 3
             WHEN 'UNCOMMON' THEN 4 ELSE 5 END,
           unlocked_at DESC NULLS LAST,
           name ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| Ok(Achievement {
        slug:        row.get(0)?,
        name:        row.get(1)?,
        description: row.get(2)?,
        category:    row.get(3)?,
        rarity:      row.get(4)?,
        icon:        row.get(5)?,
        target:      row.get(6)?,
        progress:    row.get(7)?,
        unlocked_at: row.get(8)?,
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Evaluates all achievements after a session import.
/// Returns slugs of achievements newly unlocked in this call.
pub fn evaluate_achievements(conn: &Connection, ctx: &SessionContext) -> Result<Vec<String>, String> {
    let now = now_iso();
    let mut newly_unlocked: Vec<String> = Vec::new();

    // ── Pre-compute aggregates ─────────────────────────────────────────────
    let total_sessions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions", [], |r| r.get(0),
    ).unwrap_or(0);

    let total_valid_laps: i32 = conn.query_row(
        "SELECT COUNT(*) FROM laps WHERE is_valid=1", [], |r| r.get(0),
    ).unwrap_or(0);

    let total_pbs: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE is_new_pb=1", [], |r| r.get(0),
    ).unwrap_or(0);

    let total_hours: f64 = conn.query_row(
        "SELECT COALESCE(SUM(duration_sec), 0) FROM sessions WHERE duration_sec IS NOT NULL",
        [], |r| r.get::<_, f64>(0),
    ).unwrap_or(0.0) / 3600.0;

    let unique_tracks: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT track_name) FROM sessions", [], |r| r.get(0),
    ).unwrap_or(0);

    let unique_cars: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT car_name) FROM sessions", [], |r| r.get(0),
    ).unwrap_or(0);

    let consistency_above_85: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE consistency_score > 85", [], |r| r.get(0),
    ).unwrap_or(0);

    let race_wins: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE session_type='RACE' AND final_position=1 AND is_online=1",
        [], |r| r.get(0),
    ).unwrap_or(0);

    let races_no_dnf: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE session_type='RACE' AND dnf=0",
        [], |r| r.get(0),
    ).unwrap_or(0);

    // Triple threat: same track has PRACTICE + QUALIFYING + RACE
    let triple_threat_met: bool = conn.query_row(
        "SELECT COUNT(DISTINCT session_type) FROM sessions
         WHERE track_name=?1 AND session_type IN ('PRACTICE','QUALIFYING','RACE')",
        params![ctx.track_name],
        |r| r.get::<_, i32>(0),
    ).unwrap_or(0) >= 3;

    // Sector PBs: current session best S1/S2/S3 vs historical at same track+car
    let sector_pbs_met = check_sector_pbs(conn, &ctx.session_id, &ctx.track_name, &ctx.car_name);

    // ── Per-achievement update ─────────────────────────────────────────────
    let achievements = get_achievements(conn)?;

    for ach in &achievements {
        if ach.unlocked_at.is_some() { continue; } // already unlocked

        let (new_progress, unlocked) = compute_progress(
            ach, ctx,
            total_sessions, total_valid_laps, total_pbs, total_hours,
            unique_tracks, unique_cars, consistency_above_85,
            race_wins, races_no_dnf, triple_threat_met, sector_pbs_met,
        );

        // Only write if changed
        if (new_progress - ach.progress).abs() < f64::EPSILON && !unlocked { continue; }

        let unlock_ts = if unlocked { Some(now.as_str()) } else { None };
        conn.execute(
            "UPDATE achievements SET progress=?1, unlocked_at=COALESCE(?2, unlocked_at) WHERE slug=?3",
            params![new_progress, unlock_ts, ach.slug],
        ).map_err(|e| e.to_string())?;

        if unlocked {
            newly_unlocked.push(ach.slug.clone());
        }
    }

    Ok(newly_unlocked)
}

fn compute_progress(
    ach: &Achievement,
    ctx: &SessionContext,
    total_sessions:      i32,
    total_valid_laps:    i32,
    total_pbs:           i32,
    total_hours:         f64,
    unique_tracks:       i32,
    unique_cars:         i32,
    consistency_above_85: i32,
    race_wins:           i32,
    races_no_dnf:        i32,
    triple_threat_met:   bool,
    sector_pbs_met:      bool,
) -> (f64, bool) {
    let t = ach.target;

    let (raw, unlocked) = match ach.slug.as_str() {
        // Volume
        "first_session"   => (total_sessions as f64,     total_sessions >= 1),
        "lap_apprentice"  => (total_valid_laps as f64,   total_valid_laps >= 10),
        "century_driver"  => (total_valid_laps as f64,   total_valid_laps >= 100),
        "road_warrior"    => (total_valid_laps as f64,   total_valid_laps >= 500),
        "elite_driver"    => (total_valid_laps as f64,   total_valid_laps >= 1000),
        "dedicated"       => (total_sessions as f64,     total_sessions >= 10),
        "committed"       => (total_sessions as f64,     total_sessions >= 50),
        "sim_pro"         => (total_sessions as f64,     total_sessions >= 200),
        "night_owl"       => (total_hours,               total_hours >= 10.0),
        "time_lord"       => (total_hours,               total_hours >= 50.0),
        // Pace
        "first_pb"        => (total_pbs as f64,          total_pbs >= 1),
        "speed_chaser"    => (total_pbs as f64,          total_pbs >= 5),
        "speed_demon"     => (total_pbs as f64,          total_pbs >= 10),
        "sector_hunter"   => (if sector_pbs_met { 1.0 } else { ach.progress }, sector_pbs_met),
        // Consistency
        "consistency_king" => {
            let hit = ctx.consistency_score.map(|s| s > 90.0).unwrap_or(false);
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        "rock_solid" => {
            let hit = ctx.consistency_score.map(|s| s > 95.0).unwrap_or(false);
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        "on_rails" => (consistency_above_85 as f64, consistency_above_85 >= 5),
        // Endurance
        "endurance_pilot"  => {
            let hit = ctx.valid_laps >= 20;
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        "marathon_man" => {
            let hit = ctx.valid_laps >= 50;
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        "endurance_legend" => {
            let hit = ctx.valid_laps >= 100;
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        // Race craft
        "glass_clean" => {
            let hit = ctx.session_type == "RACE" && !ctx.dnf;
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        "podium" => {
            let hit = ctx.session_type == "RACE"
                && ctx.is_online
                && ctx.final_position.map(|p| p <= 3).unwrap_or(false);
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        "race_winner" => {
            let hit = ctx.session_type == "RACE"
                && ctx.is_online
                && ctx.final_position == Some(1);
            (if hit { 1.0 } else { ach.progress }, hit)
        }
        "hat_trick"  => (race_wins as f64, race_wins >= 3),
        "iron_will"  => (races_no_dnf as f64, races_no_dnf >= 10),
        // Exploration
        "track_explorer"  => (unique_tracks as f64, unique_tracks >= 3),
        "track_collector" => (unique_tracks as f64, unique_tracks >= 5),
        "world_traveler"  => (unique_tracks as f64, unique_tracks >= 10),
        "car_collector"   => (unique_cars as f64,   unique_cars >= 5),
        "fleet_owner"     => (unique_cars as f64,   unique_cars >= 10),
        "triple_threat"   => (if triple_threat_met { 1.0 } else { ach.progress }, triple_threat_met),
        _ => return (ach.progress, false),
    };

    let capped = raw.min(t);
    (capped, unlocked)
}

fn check_sector_pbs(conn: &Connection, session_id: &str, track_name: &str, car_name: &str) -> bool {
    // Best sectors in THIS session
    let cur = conn.query_row(
        "SELECT MIN(sector1_ms), MIN(sector2_ms), MIN(sector3_ms)
         FROM laps WHERE session_id=?1 AND is_valid=1",
        params![session_id],
        |r| Ok((r.get::<_, Option<i32>>(0)?, r.get::<_, Option<i32>>(1)?, r.get::<_, Option<i32>>(2)?)),
    );

    let Ok((Some(s1), Some(s2), Some(s3))) = cur else { return false };

    // Best sectors from ALL OTHER sessions at same track+car
    let prev = conn.query_row(
        "SELECT MIN(l.sector1_ms), MIN(l.sector2_ms), MIN(l.sector3_ms)
         FROM laps l
         JOIN sessions s ON l.session_id = s.id
         WHERE s.track_name=?1 AND s.car_name=?2 AND s.id != ?3 AND l.is_valid=1",
        params![track_name, car_name, session_id],
        |r| Ok((r.get::<_, Option<i32>>(0)?, r.get::<_, Option<i32>>(1)?, r.get::<_, Option<i32>>(2)?)),
    );

    match prev {
        Ok((Some(ps1), Some(ps2), Some(ps3))) => s1 < ps1 && s2 < ps2 && s3 < ps3,
        Ok((None, _, _)) | Ok((_, None, _)) | Ok((_, _, None)) => true, // first session with sectors = PB
        Err(_) => true,
    }
}

// ── Setups ────────────────────────────────────────────────────────────────────

pub fn create_setup(conn: &Connection, input: &CreateSetupInput) -> Result<String, String> {
    let id  = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    conn.execute(
        "INSERT INTO setups (id, name, car_name, track_name, conditions, setup_type, notes, is_favorite, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,0,?8,?9)",
        params![id, input.name, input.car_name, input.track_name, input.conditions, input.setup_type, input.notes, now, now],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn get_setups(conn: &Connection) -> Result<Vec<Setup>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, name, car_name, track_name, conditions, setup_type, notes, is_favorite, created_at, updated_at
         FROM setups ORDER BY is_favorite DESC, updated_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(Setup {
        id:          row.get(0)?,
        name:        row.get(1)?,
        car_name:    row.get(2)?,
        track_name:  row.get(3)?,
        conditions:  row.get(4)?,
        setup_type:  row.get(5)?,
        notes:       row.get(6)?,
        is_favorite: row.get::<_, i32>(7)? != 0,
        created_at:  row.get(8)?,
        updated_at:  row.get(9)?,
    })).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn toggle_setup_favorite(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE setups SET is_favorite = 1 - is_favorite, updated_at=?1 WHERE id=?2",
        params![now_iso(), id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_setup_notes(conn: &Connection, id: &str, notes: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE setups SET notes=?1, updated_at=?2 WHERE id=?3",
        params![notes, now_iso(), id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_setup(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM setups WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Replays ───────────────────────────────────────────────────────────────────

pub fn replay_path_exists(conn: &Connection, file_path: &str) -> bool {
    conn.query_row(
        "SELECT 1 FROM replays WHERE file_path = ?1",
        params![file_path],
        |_| Ok(()),
    ).is_ok()
}

pub fn insert_replay(
    conn:       &Connection,
    file_path:  &str,
    filename:   &str,
    file_size:  Option<i64>,
    session_id: Option<&str>,
) -> Result<String, String> {
    let id  = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    let matched_at: Option<String> = session_id.map(|_| now.clone());
    conn.execute(
        "INSERT INTO replays (id, session_id, file_path, filename, file_size, matched_at, imported_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![id, session_id, file_path, filename, file_size, matched_at, now],
    ).map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn get_replays(conn: &Connection) -> Result<Vec<ReplaySummary>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, file_path, filename, file_size, matched_at, imported_at
         FROM replays ORDER BY imported_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| Ok(ReplaySummary {
        id:          row.get(0)?,
        session_id:  row.get(1)?,
        file_path:   row.get(2)?,
        filename:    row.get(3)?,
        file_size:   row.get(4)?,
        matched_at:  row.get(5)?,
        imported_at: row.get(6)?,
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn match_replay_to_session(conn: &Connection, replay_id: &str, session_id: &str) -> Result<(), String> {
    let now = now_iso();
    conn.execute(
        "UPDATE replays SET session_id=?1, matched_at=?2 WHERE id=?3",
        params![session_id, now, replay_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_replay(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM replays WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn now_iso() -> String {
    crate::date::now_iso()
}
