use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use crate::shared_memory::{read_shared_memory, SharedMemFrame};

/// Full telemetry frame emitted as "telemetry" Tauri event every ~16 ms.
/// Wheels order: FL=0, FR=1, RL=2, RR=3.
#[derive(Debug, Clone, serde::Serialize)]
pub struct TelemetryFrame {
    // ── Driving ──────────────────────────────────────────────────────────────
    pub speed_kph:   f32,
    pub rpm:         f32,
    pub max_rpm:     f32,
    pub gear:        i32,     // -1=R, 0=N, 1-8
    pub throttle:    f32,     // 0-1
    pub brake:       f32,     // 0-1
    pub steering:    f32,     // -1 … +1

    // ── Fuel & engine ────────────────────────────────────────────────────────
    pub fuel_liters: f32,
    pub fuel_pct:    f32,     // 0-100
    pub water_temp:  f32,     // Celsius
    pub oil_temp:    f32,     // Celsius

    // ── Race position ────────────────────────────────────────────────────────
    pub lap_number:  i32,
    pub position:    i32,     // 1-based
    pub in_pits:     bool,
    pub pit_limiter: bool,
    pub num_pitstops: i32,

    // ── Timing (ms; 0 = not available) ───────────────────────────────────────
    pub lap_time_ms:      f32,
    pub last_lap_ms:      f32,
    pub best_lap_ms:      f32,
    pub cur_sector1_ms:   f32,   // < 0 → not completed yet
    pub cur_sector2_ms:   f32,
    pub best_sector1_ms:  f32,
    pub best_sector2_ms:  f32,
    pub last_sector1_ms:  f32,
    pub last_sector2_ms:  f32,

    // ── Gaps (ms; 0 = n/a, negative = player is ahead/leader) ───────────────
    pub gap_ahead_ms:  f32,
    pub gap_leader_ms: f32,

    // ── Flags ────────────────────────────────────────────────────────────────
    pub vehicle_flag:      u8,   // 0=none, 1=blue, 2=yellow, 3=black, 4=checkered
    pub game_phase:        u8,   // 5=green, 6=FCY, 7=stopped, 9=paused
    pub yellow_flag_state: i8,

    // ── Tyres [FL, FR, RL, RR] ───────────────────────────────────────────────
    pub tire_temp_l: [f32; 4],   // inner Celsius
    pub tire_temp_c: [f32; 4],   // centre Celsius
    pub tire_temp_r: [f32; 4],   // outer Celsius
    pub tire_wear:   [f32; 4],   // % remaining (100=new, 0=worn)
    pub tire_pres:   [f32; 4],   // kPa
    pub brake_temp:  [f32; 4],   // Celsius

    // ── Connection ───────────────────────────────────────────────────────────
    pub connected: bool,
}

impl Default for TelemetryFrame {
    fn default() -> Self {
        Self {
            speed_kph: 0.0, rpm: 0.0, max_rpm: 9000.0, gear: 0,
            throttle: 0.0, brake: 0.0, steering: 0.0,
            fuel_liters: 0.0, fuel_pct: 0.0,
            water_temp: 0.0, oil_temp: 0.0,
            lap_number: 0, position: 0, in_pits: false, pit_limiter: false, num_pitstops: 0,
            lap_time_ms: 0.0, last_lap_ms: 0.0, best_lap_ms: 0.0,
            cur_sector1_ms: -1.0, cur_sector2_ms: -1.0,
            best_sector1_ms: 0.0, best_sector2_ms: 0.0,
            last_sector1_ms: 0.0, last_sector2_ms: 0.0,
            gap_ahead_ms: 0.0, gap_leader_ms: 0.0,
            vehicle_flag: 0, game_phase: 0, yellow_flag_state: -1,
            tire_temp_l: [0.0; 4], tire_temp_c: [0.0; 4], tire_temp_r: [0.0; 4],
            tire_wear: [100.0; 4], tire_pres: [0.0; 4], brake_temp: [0.0; 4],
            connected: false,
        }
    }
}

fn s_to_ms(s: f64) -> f32 {
    (s * 1000.0) as f32
}

impl TelemetryFrame {
    fn from_shared(sm: &SharedMemFrame) -> Self {
        let max_rpm = if sm.max_rpm > 100.0 { sm.max_rpm as f32 } else { 9000.0 };
        let fuel_pct = if sm.fuel_capacity > 0.0 {
            (sm.fuel_liters / sm.fuel_capacity * 100.0).clamp(0.0, 100.0) as f32
        } else {
            0.0
        };

        let gap_ahead_ms  = if sm.time_behind_next  > 0.0 { s_to_ms(sm.time_behind_next)  } else { 0.0 };
        let gap_leader_ms = if sm.time_behind_leader > 0.0 { s_to_ms(sm.time_behind_leader) } else { 0.0 };

        Self {
            speed_kph:   (sm.speed_ms * 3.6) as f32,
            rpm:         sm.engine_rpm as f32,
            max_rpm,
            gear:        sm.gear,
            throttle:    sm.throttle as f32,
            brake:       sm.brake as f32,
            steering:    sm.steering as f32,
            fuel_liters: sm.fuel_liters as f32,
            fuel_pct,
            water_temp:  sm.engine_water_temp as f32,
            oil_temp:    sm.engine_oil_temp as f32,
            lap_number:  sm.total_laps,
            position:    sm.place as i32,
            in_pits:     sm.in_pits,
            pit_limiter: sm.pit_limiter,
            num_pitstops: sm.num_pitstops,
            lap_time_ms:      if sm.time_into_lap_s > 0.0 { s_to_ms(sm.time_into_lap_s) } else { 0.0 },
            last_lap_ms:      if sm.last_lap_s > 0.0 { s_to_ms(sm.last_lap_s) } else { 0.0 },
            best_lap_ms:      if sm.best_lap_s > 0.0 { s_to_ms(sm.best_lap_s) } else { 0.0 },
            cur_sector1_ms:   s_to_ms(sm.cur_sector1_s),   // negative if not completed
            cur_sector2_ms:   s_to_ms(sm.cur_sector2_s),
            best_sector1_ms:  if sm.best_sector1_s > 0.0 { s_to_ms(sm.best_sector1_s) } else { 0.0 },
            best_sector2_ms:  if sm.best_sector2_s > 0.0 { s_to_ms(sm.best_sector2_s) } else { 0.0 },
            last_sector1_ms:  if sm.last_sector1_s > 0.0 { s_to_ms(sm.last_sector1_s) } else { 0.0 },
            last_sector2_ms:  if sm.last_sector2_s > 0.0 { s_to_ms(sm.last_sector2_s) } else { 0.0 },
            gap_ahead_ms,
            gap_leader_ms,
            vehicle_flag:      sm.vehicle_flag,
            game_phase:        sm.game_phase,
            yellow_flag_state: sm.yellow_flag_state,
            tire_temp_l: [sm.wheels[0].temp_l, sm.wheels[1].temp_l, sm.wheels[2].temp_l, sm.wheels[3].temp_l],
            tire_temp_c: [sm.wheels[0].temp_c, sm.wheels[1].temp_c, sm.wheels[2].temp_c, sm.wheels[3].temp_c],
            tire_temp_r: [sm.wheels[0].temp_r, sm.wheels[1].temp_r, sm.wheels[2].temp_r, sm.wheels[3].temp_r],
            tire_wear:   [sm.wheels[0].wear_pct, sm.wheels[1].wear_pct, sm.wheels[2].wear_pct, sm.wheels[3].wear_pct],
            tire_pres:   [sm.wheels[0].pressure, sm.wheels[1].pressure, sm.wheels[2].pressure, sm.wheels[3].pressure],
            brake_temp:  [sm.wheels[0].brake_temp, sm.wheels[1].brake_temp, sm.wheels[2].brake_temp, sm.wheels[3].brake_temp],
            connected: true,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────

pub struct TelemetryHandle {
    stop: Arc<AtomicBool>,
}

impl TelemetryHandle {
    pub fn stop(&self) {
        self.stop.store(true, Ordering::Relaxed);
    }
}

pub fn start(
    app:        AppHandle,
    live_frame: Arc<Mutex<Option<TelemetryFrame>>>,
) -> Result<TelemetryHandle, String> {
    let stop  = Arc::new(AtomicBool::new(false));
    let stop2 = Arc::clone(&stop);

    std::thread::spawn(move || {
        // SHM is read at 30 Hz — enough for smooth overlay display and ~3× less IPC
        // than 60 Hz; the recorder decimates independently to 10 Hz.
        const EMIT_MS: u64 = 33;

        while !stop2.load(Ordering::Relaxed) {
            std::thread::sleep(std::time::Duration::from_millis(EMIT_MS));

            let sm    = read_shared_memory();
            let frame = if sm.connected {
                TelemetryFrame::from_shared(&sm)
            } else {
                TelemetryFrame::default()
            };

            if let Ok(mut g) = live_frame.lock() {
                *g = Some(frame.clone());
            }

            let _ = app.emit("telemetry", &frame);
        }
    });

    Ok(TelemetryHandle { stop })
}
