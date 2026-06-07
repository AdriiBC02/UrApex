/// rF2 / LMU Shared Memory reader (native, no UDP)
///
/// Reads from $rFactor2SMMP_Telemetry$ and $rFactor2SMMP_Scoring$.
/// Structs use #pragma pack(4): doubles are 4-byte aligned.
/// Offsets from rF2SharedMemoryMap.hpp v2.10 / pyRFactor2SharedMemory ctypes.

#[derive(Debug, Default, Clone)]
pub struct WheelData {
    pub brake_temp: f32,   // Celsius
    pub pressure:   f32,   // kPa
    pub temp_l:     f32,   // inner Celsius
    pub temp_c:     f32,   // centre Celsius
    pub temp_r:     f32,   // outer Celsius
    pub wear_pct:   f32,   // 0=new … 100=worn
}

#[derive(Debug, Default, Clone)]
pub struct SharedMemFrame {
    pub connected: bool,

    // Scoring-base fields (embedded in rF2VehicleTelemetry)
    pub speed_ms:           f64,
    pub gear:               i32,
    pub total_laps:         i32,
    pub sector:             i32,
    pub place:              u8,
    pub in_pits:            bool,
    pub num_pitstops:       i32,
    pub time_behind_next:   f64,
    pub time_behind_leader: f64,
    pub best_sector1_s:     f64,
    pub best_sector2_s:     f64,
    pub best_lap_s:         f64,
    pub last_sector1_s:     f64,
    pub last_sector2_s:     f64,
    pub last_lap_s:         f64,
    pub cur_sector1_s:      f64,
    pub cur_sector2_s:      f64,
    pub time_into_lap_s:    f64,
    pub vehicle_flag:       u8,

    // Physics
    pub engine_rpm:         f64,
    pub max_rpm:            f64,
    pub engine_water_temp:  f64,
    pub engine_oil_temp:    f64,
    pub throttle:           f64,
    pub brake:              f64,
    pub steering:           f64,
    pub fuel_liters:        f64,
    pub fuel_capacity:      f64,
    pub pit_limiter:        bool,

    // Wheels: FL=0, FR=1, RL=2, RR=3
    pub wheels: [WheelData; 4],

    // Scoring info
    pub game_phase:        u8,
    pub yellow_flag_state: i8,
    pub sector_flags:      [i8; 3],
    pub ambient_temp:      f64,
    pub track_temp:        f64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe read helpers operating on a byte slice
// ─────────────────────────────────────────────────────────────────────────────

fn rf64(d: &[u8], o: usize) -> f64 {
    if o + 8 > d.len() { return 0.0; }
    f64::from_le_bytes(d[o..o+8].try_into().unwrap_or([0;8]))
}
fn ri32(d: &[u8], o: usize) -> i32 {
    if o + 4 > d.len() { return 0; }
    i32::from_le_bytes(d[o..o+4].try_into().unwrap_or([0;4]))
}
fn ri16(d: &[u8], o: usize) -> i16 {
    if o + 2 > d.len() { return 0; }
    i16::from_le_bytes(d[o..o+2].try_into().unwrap_or([0;2]))
}
fn ru8(d: &[u8], o: usize)  -> u8  { d.get(o).copied().unwrap_or(0) }
fn ri8(d: &[u8], o: usize)  -> i8  { d.get(o).copied().unwrap_or(0) as i8 }
fn rbool(d: &[u8], o: usize) -> bool { d.get(o).copied().unwrap_or(0) != 0 }

// ─────────────────────────────────────────────────────────────────────────────
// Windows implementation
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
pub use windows_impl::read_shared_memory;

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Memory::{
        MapViewOfFile, OpenFileMappingW, UnmapViewOfFile, FILE_MAP_READ,
    };
    use windows::core::PCWSTR;

    const MAP_TELEMETRY: &str = "$rFactor2SMMP_Telemetry$";
    const MAP_SCORING:   &str = "$rFactor2SMMP_Scoring$";

    const TEL_HEADER_SIZE:    usize = 16;
    const TEL_VEHICLE_STRIDE: usize = 6908;
    // Max region size: header + 128 vehicles
    const TEL_MAP_SIZE:       usize = TEL_HEADER_SIZE + 128 * TEL_VEHICLE_STRIDE;

    // Offsets within rF2VehicleTelemetry (scoring-base section, pack4):
    const O_TOTAL_LAPS:       usize = 116;
    const O_SECTOR:           usize = 120;
    const O_BEST_SECTOR1:     usize = 148;
    const O_BEST_SECTOR2:     usize = 156;
    const O_BEST_LAP:         usize = 164;
    const O_LAST_SECTOR1:     usize = 172;
    const O_LAST_SECTOR2:     usize = 180;
    const O_LAST_LAP:         usize = 188;
    const O_CUR_SECTOR1:      usize = 196;
    const O_CUR_SECTOR2:      usize = 204;
    const O_NUM_PITSTOPS:     usize = 212;
    const O_IS_PLAYER:        usize = 216;
    const O_IN_PITS:          usize = 218;
    const O_PLACE:            usize = 219;
    const O_TIME_BEHIND_NEXT: usize = 252;
    const O_TIME_BEHIND_LEAD: usize = 264;
    const O_SPEED:            usize = 476;
    const O_TIME_INTO_LAP:    usize = 500;
    const O_VEHICLE_FLAG:     usize = 540;

    // Physics section (starts at 584):
    const O_ENGINE_RPM:    usize = 584;
    const O_ENGINE_WATER:  usize = 592;
    const O_ENGINE_OIL:    usize = 600;
    const O_FILT_THROTTLE: usize = 648;
    const O_FILT_BRAKE:    usize = 656;
    const O_FILT_STEERING: usize = 664;
    const O_FUEL:          usize = 720;
    const O_MAX_RPM:       usize = 728;
    const O_SPEED_LIMITER: usize = 800;
    const O_FUEL_CAPACITY: usize = 804;
    // Wheel base offsets: FL=892, FR=1168, RL=1444, RR=1720 (each 276 bytes)
    const WHEEL_BASE: [usize; 4] = [892, 1168, 1444, 1720];
    const O_GEAR:          usize = 1996;

    // Within each rF2Wheel:
    const W_BRAKE_TEMP: usize = 24;
    const W_PRESSURE:   usize = 120;
    const W_TEMP_L:     usize = 128;
    const W_TEMP_C:     usize = 136;
    const W_TEMP_R:     usize = 144;
    const W_WEAR:       usize = 152;

    // Scoring info offsets (relative to si = sco_data[16..]):
    const SI_GAME_PHASE:   usize = 356;
    const SI_YELLOW_FLAG:  usize = 357;
    const SI_SECTOR_FLAGS: usize = 358;
    const SI_AMBIENT_TEMP: usize = 476;
    const SI_TRACK_TEMP:   usize = 484;

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    /// Map a named section into memory and copy into a Vec<u8>.
    /// Copies into an owned buffer so we don't hold the mapping open.
    fn read_map_to_vec(name: &str, max_bytes: usize) -> Option<Vec<u8>> {
        let wide = to_wide(name);
        // SAFETY: Windows API call with valid inputs
        let h = unsafe {
            OpenFileMappingW(FILE_MAP_READ.0, false, PCWSTR(wide.as_ptr())).ok()?
        };
        if h.is_invalid() { return None; }

        let view = unsafe { MapViewOfFile(h, FILE_MAP_READ, 0, 0, 0) };
        if view.Value.is_null() {
            unsafe { let _ = CloseHandle(h); }
            return None;
        }

        let ptr  = view.Value as *const u8;
        let size = max_bytes;
        let mut buf = vec![0u8; size];
        // SAFETY: ptr is valid and buf is sized to max_bytes
        unsafe { std::ptr::copy_nonoverlapping(ptr, buf.as_mut_ptr(), size); }

        unsafe {
            let _ = UnmapViewOfFile(view);
            let _ = CloseHandle(h);
        }
        Some(buf)
    }

    pub fn read_shared_memory() -> SharedMemFrame {
        // ── Telemetry region ──────────────────────────────────────────────────
        let Some(tel) = read_map_to_vec(MAP_TELEMETRY, TEL_MAP_SIZE) else {
            return SharedMemFrame::default();
        };

        let num_vehicles = ri32(&tel, 12);
        if !(1..=128).contains(&num_vehicles) {
            return SharedMemFrame::default();
        }

        // Find player vehicle
        let player_offset = (0..num_vehicles as usize).find_map(|i| {
            let off = TEL_HEADER_SIZE + i * TEL_VEHICLE_STRIDE;
            rbool(&tel, off + O_IS_PLAYER).then_some(off)
        });

        let Some(pb) = player_offset else {
            return SharedMemFrame { connected: true, ..Default::default() };
        };

        let v = &tel[pb..]; // vehicle slice

        // ── Scoring-base ──
        let speed_ms           = rf64(v, O_SPEED);
        let gear               = ri32(v, O_GEAR);
        let total_laps         = ri32(v, O_TOTAL_LAPS);
        let sector             = ri8(v, O_SECTOR) as i32;
        let place              = ru8(v, O_PLACE);
        let in_pits            = rbool(v, O_IN_PITS);
        let num_pitstops       = ri16(v, O_NUM_PITSTOPS) as i32;
        let time_behind_next   = rf64(v, O_TIME_BEHIND_NEXT);
        let time_behind_leader = rf64(v, O_TIME_BEHIND_LEAD);
        let best_sector1_s     = rf64(v, O_BEST_SECTOR1);
        let best_sector2_s     = rf64(v, O_BEST_SECTOR2);
        let best_lap_s         = rf64(v, O_BEST_LAP);
        let last_sector1_s     = rf64(v, O_LAST_SECTOR1);
        let last_sector2_s     = rf64(v, O_LAST_SECTOR2);
        let last_lap_s         = rf64(v, O_LAST_LAP);
        let cur_sector1_s      = rf64(v, O_CUR_SECTOR1);
        let cur_sector2_s      = rf64(v, O_CUR_SECTOR2);
        let time_into_lap_s    = rf64(v, O_TIME_INTO_LAP);
        let vehicle_flag       = ru8(v, O_VEHICLE_FLAG);

        // ── Physics ──
        let engine_rpm        = rf64(v, O_ENGINE_RPM);
        let max_rpm           = rf64(v, O_MAX_RPM);
        let engine_water_temp = rf64(v, O_ENGINE_WATER);
        let engine_oil_temp   = rf64(v, O_ENGINE_OIL);
        let throttle          = rf64(v, O_FILT_THROTTLE).clamp(0.0, 1.0);
        let brake             = rf64(v, O_FILT_BRAKE).clamp(0.0, 1.0);
        let steering          = rf64(v, O_FILT_STEERING).clamp(-1.0, 1.0);
        let fuel_liters       = rf64(v, O_FUEL);
        let fuel_capacity     = rf64(v, O_FUEL_CAPACITY);
        let pit_limiter       = ru8(v, O_SPEED_LIMITER) != 0;

        let wheels = std::array::from_fn(|i| {
            let wo = WHEEL_BASE[i];
            let raw_wear = rf64(v, wo + W_WEAR);
            WheelData {
                brake_temp: rf64(v, wo + W_BRAKE_TEMP) as f32,
                pressure:   rf64(v, wo + W_PRESSURE)   as f32,
                temp_l:     rf64(v, wo + W_TEMP_L)     as f32,
                temp_c:     rf64(v, wo + W_TEMP_C)     as f32,
                temp_r:     rf64(v, wo + W_TEMP_R)     as f32,
                wear_pct:   ((3.0_f64 - raw_wear.clamp(0.0, 3.0)) / 3.0 * 100.0) as f32,
            }
        });

        // ── Scoring region (game-wide state) ──────────────────────────────────
        const SCO_MAP_SIZE: usize = 16 + 800 + 128 * 600;
        let (game_phase, yellow_flag_state, sector_flags, ambient_temp, track_temp) =
            if let Some(sco) = read_map_to_vec(MAP_SCORING, SCO_MAP_SIZE) {
                let si = &sco[16..]; // rF2ScoringInfo starts at offset 16
                (
                    ru8(si, SI_GAME_PHASE),
                    ri8(si, SI_YELLOW_FLAG),
                    [ri8(si, SI_SECTOR_FLAGS), ri8(si, SI_SECTOR_FLAGS+1), ri8(si, SI_SECTOR_FLAGS+2)],
                    rf64(si, SI_AMBIENT_TEMP),
                    rf64(si, SI_TRACK_TEMP),
                )
            } else {
                (0u8, -1i8, [0i8; 3], 0.0, 0.0)
            };

        SharedMemFrame {
            connected: true,
            speed_ms, gear, total_laps, sector, place, in_pits, num_pitstops,
            time_behind_next, time_behind_leader,
            best_sector1_s, best_sector2_s, best_lap_s,
            last_sector1_s, last_sector2_s, last_lap_s,
            cur_sector1_s, cur_sector2_s, time_into_lap_s,
            vehicle_flag,
            engine_rpm, max_rpm, engine_water_temp, engine_oil_temp,
            throttle, brake, steering,
            fuel_liters, fuel_capacity, pit_limiter,
            wheels,
            game_phase, yellow_flag_state, sector_flags,
            ambient_temp, track_temp,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-Windows stub
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(not(target_os = "windows"))]
pub fn read_shared_memory() -> SharedMemFrame {
    SharedMemFrame::default()
}
