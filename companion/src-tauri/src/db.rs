use rusqlite::{Connection, params};
use serde::Serialize;
use std::path::PathBuf;

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
    pub lap_number:  i32,
    pub lap_time_ms: Option<i32>,
    pub is_valid:    bool,
    pub sector1_ms:  Option<i32>,
    pub sector2_ms:  Option<i32>,
    pub sector3_ms:  Option<i32>,
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
    pub laps:           Vec<LapRow>,
}

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

fn migrate(conn: &Connection) -> Result<(), String> {
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
        CREATE INDEX IF NOT EXISTS idx_laps_session ON laps(session_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date DESC);
    ").map_err(|e| e.to_string())
}

pub fn hash_exists(conn: &Connection, hash: &str) -> bool {
    conn.query_row(
        "SELECT 1 FROM sessions WHERE file_hash = ?1",
        params![hash],
        |_| Ok(()),
    ).is_ok()
}

pub fn insert_session(
    conn:    &Connection,
    session: &crate::parser::ParsedSession,
    metrics: &crate::metrics_snapshot::MetricsSnapshot,
    file_path: &str,
    file_hash: &str,
    is_new_pb: bool,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();

    conn.execute(
        "INSERT INTO sessions (id, track_name, car_name, car_class, session_type, session_date,
            total_laps, valid_laps, best_lap_ms, avg_lap_ms, ideal_lap_ms, consistency_score,
            is_new_pb, final_position, duration_sec, is_online, dnf, file_path, file_hash, imported_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)",
        params![
            id, session.track_name, session.car_name, session.car_class,
            session.session_type, session.session_date,
            session.total_laps, session.valid_laps,
            metrics.best_lap_ms, metrics.avg_lap_ms, metrics.ideal_lap_ms, metrics.consistency_score,
            is_new_pb as i32,
            session.final_position, session.duration_sec,
            session.is_online as i32, session.dnf as i32,
            file_path, file_hash, now,
        ],
    ).map_err(|e| e.to_string())?;

    // Insert laps
    for lap in &session.laps {
        conn.execute(
            "INSERT INTO laps (session_id, lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                id, lap.lap_number, lap.lap_time_ms, lap.is_valid as i32,
                lap.sector1_ms, lap.sector2_ms, lap.sector3_ms,
            ],
        ).map_err(|e| e.to_string())?;
    }

    Ok(id)
}

pub fn detect_pb(conn: &Connection, track: &str, car: &str, best_ms: Option<i32>) -> bool {
    let Some(best) = best_ms else { return false };
    // No previous session at this track+car → it's a PB
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
                car_class, final_position, duration_sec, is_online, avg_lap_ms, ideal_lap_ms
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
        )),
    );

    let Ok((summary, car_class, final_position, duration_sec, is_online, avg_lap_ms, ideal_lap_ms)) = summary else {
        return Ok(None);
    };

    let mut stmt = conn.prepare(
        "SELECT lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms
         FROM laps WHERE session_id=?1 ORDER BY lap_number ASC"
    ).map_err(|e| e.to_string())?;

    let laps = stmt.query_map(params![id], |row| Ok(LapRow {
        lap_number:  row.get(0)?,
        lap_time_ms: row.get(1)?,
        is_valid:    row.get::<_, i32>(2)? != 0,
        sector1_ms:  row.get(3)?,
        sector2_ms:  row.get(4)?,
        sector3_ms:  row.get(5)?,
    })).map_err(|e| e.to_string())?
       .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(Some(SessionDetail { summary, car_class, final_position, duration_sec, is_online, avg_lap_ms, ideal_lap_ms, laps }))
}

pub fn delete_session(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM sessions WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn now_iso() -> String {
    crate::date::now_iso()
}
