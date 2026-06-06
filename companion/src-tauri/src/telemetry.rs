use std::net::UdpSocket;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

/// Live telemetry frame — emitted as "telemetry" event to all windows.
#[derive(Debug, Clone, serde::Serialize)]
pub struct TelemetryFrame {
    pub speed_kph:   f32,
    pub rpm:         f32,
    pub max_rpm:     f32,
    pub gear:        i32,  // -1=R, 0=N, 1-8
    pub fuel_liters: f32,
    pub fuel_pct:    f32,  // 0-100
    pub lap_number:  i32,
    pub lap_time_ms: f32,
    pub last_lap_ms: f32,
    pub best_lap_ms: f32,
    pub position:    i32,
    pub throttle:    f32,  // 0-1
    pub brake:       f32,  // 0-1
}

pub struct TelemetryHandle {
    stop: Arc<AtomicBool>,
}

impl TelemetryHandle {
    pub fn stop(&self) {
        self.stop.store(true, Ordering::Relaxed);
    }
}

pub fn start(port: u16, app: AppHandle) -> Result<TelemetryHandle, String> {
    let stop  = Arc::new(AtomicBool::new(false));
    let stop2 = Arc::clone(&stop);

    let addr   = format!("0.0.0.0:{port}");
    let socket = UdpSocket::bind(&addr).map_err(|e| format!("UDP bind {addr}: {e}"))?;
    socket
        .set_read_timeout(Some(std::time::Duration::from_millis(500)))
        .map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        let mut buf = [0u8; 256];
        while !stop2.load(Ordering::Relaxed) {
            match socket.recv_from(&mut buf) {
                Ok((len, _)) => {
                    if let Some(frame) = parse_packet(&buf[..len]) {
                        let _ = app.emit("telemetry", &frame);
                    }
                }
                Err(ref e)
                    if e.kind() == std::io::ErrorKind::WouldBlock
                        || e.kind() == std::io::ErrorKind::TimedOut =>
                {
                    continue
                }
                Err(e) => {
                    log::warn!("UDP recv: {e}");
                    break;
                }
            }
        }
    });

    Ok(TelemetryHandle { stop })
}

// ── Packet parser ──────────────────────────────────────────────────────────────
//
// rFactor2 / LMU UDP packet layout (little-endian):
//
//   Offset  Size  Field
//     0      4    version / packet counter (u32)  — ignored
//     4      4    speed       f32  m/s
//     8      4    rpm         f32
//    12      4    fuel        f32  liters remaining
//    16      4    fuelCap     f32  total capacity
//    20      4    gear        i32  (-1=R, 0=N, 1-8)
//    24      4    lapTime     f32  seconds (< 0 if not started)
//    28      4    lastLap     f32  seconds
//    32      4    bestLap     f32  seconds
//    36      4    lapNumber   i32
//    40      4    position    i32  (1-based)
//    44      4    numCars     i32  — ignored
//    48      4    throttle    f32  0-1
//    52      4    brake       f32  0-1
//    56      4    maxRpm      f32
//
// ⚠ Validate against a real LMU session (CA-016) and adjust offsets if needed.
fn parse_packet(data: &[u8]) -> Option<TelemetryFrame> {
    if data.len() < 60 {
        return None;
    }

    let f32_at = |o: usize| f32::from_le_bytes(data[o..o + 4].try_into().unwrap_or([0; 4]));
    let i32_at = |o: usize| i32::from_le_bytes(data[o..o + 4].try_into().unwrap_or([0; 4]));

    let speed_ms  = f32_at(4);
    let rpm       = f32_at(8);
    let fuel      = f32_at(12);
    let fuel_cap  = f32_at(16);
    let gear      = i32_at(20);
    let lap_time  = f32_at(24);
    let last_lap  = f32_at(28);
    let best_lap  = f32_at(32);
    let lap_num   = i32_at(36);
    let position  = i32_at(40);
    let throttle  = f32_at(48);
    let brake     = f32_at(52);
    let max_rpm   = f32_at(56);

    Some(TelemetryFrame {
        speed_kph:   speed_ms * 3.6,
        rpm,
        max_rpm:     if max_rpm > 0.0 { max_rpm } else { 9000.0 },
        gear,
        fuel_liters: fuel,
        fuel_pct:    if fuel_cap > 0.0 { fuel / fuel_cap * 100.0 } else { 0.0 },
        lap_number:  lap_num,
        lap_time_ms: if lap_time >= 0.0 { lap_time * 1000.0 } else { 0.0 },
        last_lap_ms: last_lap * 1000.0,
        best_lap_ms: best_lap * 1000.0,
        position,
        throttle:    throttle.clamp(0.0, 1.0),
        brake:       brake.clamp(0.0, 1.0),
    })
}
