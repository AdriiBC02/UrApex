/// Records live telemetry samples to the local SQLite database.
///
/// The recorder starts when `begin_recording` is called (after the game
/// enters an active session), samples at ~10 Hz, and stops on `end_recording`.
/// After the race XML is imported the companion can associate the recording
/// with a session by calling `associate_recording`.

use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use rusqlite::Connection;
use uuid::Uuid;
use crate::telemetry::TelemetryFrame;

pub struct RecorderHandle {
    stop:         Arc<AtomicBool>,
    recording_id: String,
}

impl RecorderHandle {
    pub fn stop(&self) { self.stop.store(true, Ordering::Relaxed); }
    pub fn recording_id(&self) -> &str { &self.recording_id }
}

/// Start recording. Returns a handle; call `handle.stop()` to end.
pub fn begin_recording(
    conn:       Arc<Mutex<Connection>>,
    track_name: String,
    session_type: String,
    frame_rx:   Arc<Mutex<Option<TelemetryFrame>>>,
) -> Result<RecorderHandle, String> {
    let recording_id = Uuid::new_v4().to_string();
    let rid          = recording_id.clone();

    // Insert recording header
    {
        let c = conn.lock().map_err(|e| e.to_string())?;
        c.execute(
            "INSERT INTO telemetry_recordings(id, track_name, session_type, started_at) \
             VALUES (?1, ?2, ?3, datetime('now'))",
            rusqlite::params![&recording_id, &track_name, &session_type],
        ).map_err(|e| e.to_string())?;
    }

    let stop  = Arc::new(AtomicBool::new(false));
    let stop2 = Arc::clone(&stop);
    let rid2  = rid.clone();

    std::thread::spawn(move || {
        let interval = std::time::Duration::from_millis(100); // 10 Hz
        let mut t_ms: i64 = 0;

        while !stop2.load(Ordering::Relaxed) {
            std::thread::sleep(interval);
            t_ms += 100;

            let frame = {
                let guard = frame_rx.lock().unwrap_or_else(|e| e.into_inner());
                guard.clone()
            };

            let Some(f) = frame else { continue };
            if !f.connected { continue; }

            // Sample the frame into the DB
            if let Ok(c) = conn.lock() {
                let _ = c.execute(
                    "INSERT INTO telemetry_samples(recording_id, t_ms, lap, \
                       speed_kph, rpm, gear, throttle, brake, steering, fuel_l, \
                       tire_fl_temp, tire_fr_temp, tire_rl_temp, tire_rr_temp, \
                       tire_fl_wear, tire_fr_wear, tire_rl_wear, tire_rr_wear, \
                       tire_fl_pres, tire_fr_pres, tire_rl_pres, tire_rr_pres, \
                       brk_fl_temp, brk_fr_temp, brk_rl_temp, brk_rr_temp, \
                       oil_temp, h2o_temp, game_phase, flag) \
                     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,\
                             ?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29,?30)",
                    rusqlite::params![
                        rid2, t_ms, f.lap_number,
                        f.speed_kph, f.rpm, f.gear,
                        f.throttle, f.brake, f.steering, f.fuel_liters,
                        f.tire_temp_c[0], f.tire_temp_c[1], f.tire_temp_c[2], f.tire_temp_c[3],
                        f.tire_wear[0],   f.tire_wear[1],   f.tire_wear[2],   f.tire_wear[3],
                        f.tire_pres[0],   f.tire_pres[1],   f.tire_pres[2],   f.tire_pres[3],
                        f.brake_temp[0],  f.brake_temp[1],  f.brake_temp[2],  f.brake_temp[3],
                        f.oil_temp, f.water_temp,
                        f.game_phase as i32, f.vehicle_flag as i32,
                    ],
                );
            }
        }

        // Mark as ended
        if let Ok(c) = conn.lock() {
            let _ = c.execute(
                "UPDATE telemetry_recordings SET ended_at = datetime('now') WHERE id = ?1",
                rusqlite::params![rid2],
            );
        }
    });

    Ok(RecorderHandle { stop, recording_id: rid })
}

// ─── Queries ─────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingSummary {
    pub id:           String,
    pub session_id:   Option<String>,
    pub track_name:   String,
    pub session_type: String,
    pub started_at:   String,
    pub ended_at:     Option<String>,
    pub sample_count: i64,
}

pub fn list_recordings(conn: &Connection) -> Result<Vec<RecordingSummary>, String> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.session_id, r.track_name, r.session_type, r.started_at, r.ended_at, \
                COUNT(s.id) as sample_count \
         FROM telemetry_recordings r \
         LEFT JOIN telemetry_samples s ON s.recording_id = r.id \
         GROUP BY r.id \
         ORDER BY r.started_at DESC LIMIT 50",
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(RecordingSummary {
            id:           row.get(0)?,
            session_id:   row.get(1)?,
            track_name:   row.get(2)?,
            session_type: row.get(3)?,
            started_at:   row.get(4)?,
            ended_at:     row.get(5)?,
            sample_count: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetrySample {
    pub t_ms:      i64,
    pub lap:       i32,
    pub speed_kph: f64,
    pub rpm:       f64,
    pub gear:      i32,
    pub throttle:  f64,
    pub brake:     f64,
    pub steering:  f64,
    pub fuel_l:    f64,
    pub tire_fl_temp: f64, pub tire_fr_temp: f64,
    pub tire_rl_temp: f64, pub tire_rr_temp: f64,
    pub tire_fl_wear: f64, pub tire_fr_wear: f64,
    pub tire_rl_wear: f64, pub tire_rr_wear: f64,
    pub tire_fl_pres: f64, pub tire_fr_pres: f64,
    pub tire_rl_pres: f64, pub tire_rr_pres: f64,
    pub brk_fl_temp: f64, pub brk_fr_temp: f64,
    pub brk_rl_temp: f64, pub brk_rr_temp: f64,
    pub oil_temp:  f64,
    pub h2o_temp:  f64,
    pub game_phase: i32,
    pub flag:       i32,
}

pub fn get_samples(conn: &Connection, recording_id: &str) -> Result<Vec<TelemetrySample>, String> {
    let mut stmt = conn.prepare(
        "SELECT t_ms, lap, speed_kph, rpm, gear, throttle, brake, steering, fuel_l, \
                tire_fl_temp, tire_fr_temp, tire_rl_temp, tire_rr_temp, \
                tire_fl_wear, tire_fr_wear, tire_rl_wear, tire_rr_wear, \
                tire_fl_pres, tire_fr_pres, tire_rl_pres, tire_rr_pres, \
                brk_fl_temp, brk_fr_temp, brk_rl_temp, brk_rr_temp, \
                oil_temp, h2o_temp, game_phase, flag \
         FROM telemetry_samples WHERE recording_id = ?1 ORDER BY t_ms",
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![recording_id], |r| {
        Ok(TelemetrySample {
            t_ms: r.get(0)?, lap: r.get(1)?,
            speed_kph: r.get(2)?, rpm: r.get(3)?, gear: r.get(4)?,
            throttle: r.get(5)?, brake: r.get(6)?, steering: r.get(7)?, fuel_l: r.get(8)?,
            tire_fl_temp: r.get(9)?,  tire_fr_temp: r.get(10)?,
            tire_rl_temp: r.get(11)?, tire_rr_temp: r.get(12)?,
            tire_fl_wear: r.get(13)?, tire_fr_wear: r.get(14)?,
            tire_rl_wear: r.get(15)?, tire_rr_wear: r.get(16)?,
            tire_fl_pres: r.get(17)?, tire_fr_pres: r.get(18)?,
            tire_rl_pres: r.get(19)?, tire_rr_pres: r.get(20)?,
            brk_fl_temp: r.get(21)?,  brk_fr_temp: r.get(22)?,
            brk_rl_temp: r.get(23)?,  brk_rr_temp: r.get(24)?,
            oil_temp: r.get(25)?, h2o_temp: r.get(26)?,
            game_phase: r.get(27)?, flag: r.get(28)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn associate_recording(conn: &Connection, recording_id: &str, session_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE telemetry_recordings SET session_id = ?1 WHERE id = ?2",
        rusqlite::params![session_id, recording_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_recording(conn: &Connection, recording_id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM telemetry_recordings WHERE id = ?1", rusqlite::params![recording_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
