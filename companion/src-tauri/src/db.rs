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
    pub final_position: Option<i32>,
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
            CREATE INDEX IF NOT EXISTS idx_sessions_date   ON sessions(session_date DESC);
        ").map_err(|e| e.to_string())?;
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
            weather, temp_ambient, temp_track, humidity, track_length_m)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25)",
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
                is_new_pb, dnf, synced_to_server
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
    })).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_session_detail(conn: &Connection, id: &str) -> Result<Option<SessionDetail>, String> {
    let summary = conn.query_row(
        "SELECT id, track_name, car_name, session_type, session_date, total_laps, valid_laps,
                best_lap_ms, consistency_score, is_new_pb, dnf, synced_to_server,
                car_class, final_position, duration_sec, is_online, avg_lap_ms, ideal_lap_ms,
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
            },
            row.get::<_, Option<String>>(12)?,   // car_class
            row.get::<_, Option<i32>>(13)?,      // final_position
            row.get::<_, Option<i32>>(14)?,      // duration_sec
            row.get::<_, i32>(15)? != 0,         // is_online
            row.get::<_, Option<f64>>(16)?,      // avg_lap_ms
            row.get::<_, Option<i32>>(17)?,      // ideal_lap_ms
            row.get::<_, Option<String>>(18)?,   // weather
            row.get::<_, Option<f64>>(19)?,      // temp_ambient
            row.get::<_, Option<f64>>(20)?,      // temp_track
            row.get::<_, Option<f64>>(21)?,      // humidity
            row.get::<_, Option<f64>>(22)?,      // track_length_m
        )),
    );

    let Ok((summary, car_class, final_position, duration_sec, is_online,
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
        summary, car_class, final_position, duration_sec, is_online,
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
             laps_completed, best_lap_ms, finish_status, pit_stops_count, dnf)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            params![
                pid, session_id, p.driver_name, p.car_name, p.car_class,
                p.position, p.laps_completed, p.best_lap_ms,
                p.finish_status, p.pit_stops_count, p.dnf as i32,
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
                laps_completed, best_lap_ms, finish_status, pit_stops_count, dnf
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
