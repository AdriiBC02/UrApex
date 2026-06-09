mod date;
mod db;
mod metrics;
mod metrics_snapshot;
mod parser;
mod shared_memory;
mod telemetry;
mod telemetry_recorder;
mod uploader;
mod watcher;

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub const DIAG_LOG_PATH: &str = "C:\\Users\\Public\\urapex-diag.log";

pub fn diag(msg: &str) {
    #[cfg(target_os = "windows")]
    {
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true).append(true)
            .open(DIAG_LOG_PATH)
        {
            let ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let _ = writeln!(f, "[{ts}] {msg}");
        }
    }
    log::debug!("{msg}");
}

pub struct WatcherState(pub Mutex<Option<watcher::WatcherHandle>>);
pub struct TelemetryState(pub Mutex<Option<telemetry::TelemetryHandle>>);
pub struct DbState(pub Arc<Mutex<rusqlite::Connection>>);

// ─── Keybindings ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeybindingsConfig {
    pub toggle_overlay:     Option<String>,
    pub toggle_speed_gear:  Option<String>,
    pub toggle_rpm_bar:     Option<String>,
    pub toggle_input_trace: Option<String>,
    pub toggle_steering:    Option<String>,
    pub toggle_lap_time:    Option<String>,
    pub toggle_tyres:       Option<String>,
    pub toggle_fuel_gaps:   Option<String>,
}

impl Default for KeybindingsConfig {
    fn default() -> Self {
        Self {
            toggle_overlay:     Some("Alt+Shift+O".to_string()),
            toggle_speed_gear:  Some("F1".to_string()),
            toggle_rpm_bar:     Some("F2".to_string()),
            toggle_input_trace: Some("F3".to_string()),
            toggle_steering:    Some("F4".to_string()),
            toggle_lap_time:    Some("F5".to_string()),
            toggle_tyres:       Some("F6".to_string()),
            toggle_fuel_gaps:   Some("F7".to_string()),
        }
    }
}

/// Registered shortcuts → action names ("toggle_overlay" or a panel key like "showSpeedGear").
pub struct ShortcutActionMap(pub Arc<Mutex<Vec<(Shortcut, String)>>>);

fn dispatch_shortcut_action(app: &AppHandle, action: &str) {
    if action == "toggle_overlay" {
        if let Some(w) = app.get_webview_window("overlay") {
            match w.is_visible() {
                Ok(true) => {
                    let _ = w.hide();
                    // Notify main window so overlayVisible state stays in sync
                    let _ = app.emit("overlay-visibility-changed", false);
                }
                Ok(false) => {
                    position_overlay_top_right(&w);
                    let _ = w.show();
                    let _ = app.emit("overlay-visibility-changed", true);
                }
                Err(_) => {}
            }
        }
    } else {
        // Use eval() — bypasses event delivery issues entirely, executes JS directly in WebView2
        if let Some(w) = app.get_webview_window("overlay") {
            // Sanitize action (only alphanumeric) before interpolating into JS
            if action.chars().all(|c| c.is_alphanumeric()) {
                let _ = w.eval(&format!(
                    "if(typeof window.__togglePanel==='function')window.__togglePanel('{action}')"
                ));
            }
        }
    }
}

/// Position the overlay at the top-right corner of the primary monitor.
fn position_overlay_top_right(w: &tauri::WebviewWindow) {
    if let Ok(Some(monitor)) = w.primary_monitor() {
        let pos  = monitor.position();
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let overlay_w = (360.0 * scale) as i32;
        let margin    = (20.0  * scale) as i32;
        let x = pos.x + size.width  as i32 - overlay_w - margin;
        let y = pos.y + margin;
        let _ = w.set_position(tauri::PhysicalPosition::new(x, y));
    }
}

fn apply_keybindings(
    app:      &AppHandle,
    bindings: &KeybindingsConfig,
    map:      &Arc<Mutex<Vec<(Shortcut, String)>>>,
) {
    let _ = app.global_shortcut().unregister_all();

    let mut locked = match map.lock() { Ok(g) => g, Err(_) => return };
    locked.clear();

    let entries: &[(&Option<String>, &str)] = &[
        (&bindings.toggle_overlay,     "toggle_overlay"),
        (&bindings.toggle_speed_gear,  "showSpeedGear"),
        (&bindings.toggle_rpm_bar,     "showRpmBar"),
        (&bindings.toggle_input_trace, "showInputTrace"),
        (&bindings.toggle_steering,    "showSteering"),
        (&bindings.toggle_lap_time,    "showLapTime"),
        (&bindings.toggle_tyres,       "showTyres"),
        (&bindings.toggle_fuel_gaps,   "showFuelGaps"),
    ];

    for (opt, action) in entries {
        let Some(s) = opt.as_deref().filter(|s| !s.is_empty()) else { continue };
        match Shortcut::try_from(s) {
            Ok(shortcut) => {
                if app.global_shortcut().register(s).is_ok() {
                    locked.push((shortcut, action.to_string()));
                    diag(&format!("keybinding registered: '{s}' → {action}"));
                } else {
                    diag(&format!("keybinding FAILED to register: '{s}' → {action}"));
                    log::warn!("keybindings: failed to register OS shortcut '{s}'");
                }
            }
            Err(e) => {
                diag(&format!("keybinding invalid: '{s}' ({e})"));
                log::warn!("keybindings: invalid shortcut '{s}': {e}");
            }
        }
    }
}

/// Shared latest telemetry frame — written by the telemetry thread, read by the recorder.
pub struct LiveFrameState(pub Arc<Mutex<Option<telemetry::TelemetryFrame>>>);
/// Active telemetry recording handle.
pub struct RecorderState(pub Mutex<Option<telemetry_recorder::RecorderHandle>>);

// ── Watcher ───────────────────────────────────────────────────────────────────

#[tauri::command]
async fn start_watching(
    folder: String, api_url: String, api_key: String,
    driver_name: Option<String>,
    replay_folder: Option<String>,
    app: AppHandle, state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut g = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(h) = g.take() { h.stop(); }
    *g = Some(watcher::start(folder, api_url, api_key, driver_name, replay_folder, app).map_err(|e| e.to_string())?);
    Ok(())
}

#[tauri::command]
async fn stop_watching(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut g = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(h) = g.take() { h.stop(); }
    Ok(())
}

// ── Import ────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn import_file(
    file_path: String, api_url: String, api_key: String,
    driver_name: Option<String>,
    app: AppHandle, db_state: State<'_, DbState>,
) -> Result<String, String> {
    process_file(&file_path, &api_url, &api_key, driver_name.as_deref(), &app, &db_state.0).await
}

#[tauri::command]
async fn import_all_files(
    folder: String, api_url: String, api_key: String,
    driver_name: Option<String>,
    app: AppHandle, db_state: State<'_, DbState>,
) -> Result<usize, String> {
    let entries = std::fs::read_dir(&folder).map_err(|e| e.to_string())?;
    let xml_files: Vec<String> = entries.filter_map(|e| e.ok())
        .map(|e| e.path().to_string_lossy().to_string())
        .filter(|p| p.to_lowercase().ends_with(".xml"))
        .collect();

    let count = xml_files.len();
    for path in xml_files {
        let _ = app.emit("file-detected", serde_json::json!({ "file": path }));
        let (au, ak, dn, ac, db) = (
            api_url.clone(), api_key.clone(),
            driver_name.clone(), app.clone(),
            Arc::clone(&db_state.0),
        );
        tauri::async_runtime::spawn(async move {
            match process_file(&path, &au, &ak, dn.as_deref(), &ac, &db).await {
                Ok(status) => {
                    let log_status = match status.as_str() {
                        "DUPLICATE" => "duplicate",
                        _           => "success",
                    };
                    let _ = ac.emit("file-result", serde_json::json!({ "file": path, "status": log_status }));
                }
                Err(e) => {
                    log::error!("import_all: {e}");
                    let _ = ac.emit("file-result", serde_json::json!({ "file": path, "status": "error", "message": e }));
                }
            }
        });
    }
    Ok(count)
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

/// Read the last `max_lines` lines from the diagnostic log file.
#[tauri::command]
fn get_diag_log(max_lines: Option<usize>) -> Vec<String> {
    let n = max_lines.unwrap_or(60);
    #[cfg(target_os = "windows")]
    {
        use std::io::{BufRead, BufReader};
        if let Ok(f) = std::fs::File::open(DIAG_LOG_PATH) {
            let lines: Vec<String> = BufReader::new(f)
                .lines()
                .filter_map(|l| l.ok())
                .collect();
            let skip = lines.len().saturating_sub(n);
            return lines[skip..].to_vec();
        }
    }
    vec![]
}

/// Delete the diagnostic log file (start fresh).
#[tauri::command]
fn clear_diag_log() {
    #[cfg(target_os = "windows")]
    { let _ = std::fs::remove_file(DIAG_LOG_PATH); }
}

#[tauri::command]
async fn start_telemetry(
    app:         AppHandle,
    state:       State<'_, TelemetryState>,
    frame_state: State<'_, LiveFrameState>,
) -> Result<(), String> {
    diag("start_telemetry: starting SHM reader");
    let mut g = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(h) = g.take() { h.stop(); }
    *g = Some(telemetry::start(app, Arc::clone(&frame_state.0)).map_err(|e| e.to_string())?);
    diag("start_telemetry: thread spawned");
    Ok(())
}

#[tauri::command]
async fn stop_telemetry(state: State<'_, TelemetryState>) -> Result<(), String> {
    let mut g = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(h) = g.take() { h.stop(); }
    Ok(())
}

// ── Telemetry recorder ────────────────────────────────────────────────────────

#[tauri::command]
async fn start_recording(
    track_name:   String,
    session_type: String,
    db_state:     State<'_, DbState>,
    rec_state:    State<'_, RecorderState>,
    frame_state:  State<'_, LiveFrameState>,
) -> Result<String, String> {
    let mut g = rec_state.0.lock().map_err(|e| e.to_string())?;
    if let Some(h) = g.take() { h.stop(); }
    let handle = telemetry_recorder::begin_recording(
        Arc::clone(&db_state.0),
        track_name,
        session_type,
        Arc::clone(&frame_state.0),
    )?;
    let id = handle.recording_id().to_string();
    *g = Some(handle);
    Ok(id)
}

#[tauri::command]
async fn stop_recording(rec_state: State<'_, RecorderState>) -> Result<(), String> {
    let mut g = rec_state.0.lock().map_err(|e| e.to_string())?;
    if let Some(h) = g.take() { h.stop(); }
    Ok(())
}

#[tauri::command]
fn list_recordings(db_state: State<'_, DbState>) -> Result<Vec<telemetry_recorder::RecordingSummary>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    telemetry_recorder::list_recordings(&conn)
}

#[tauri::command]
fn get_recording_samples(recording_id: String, db_state: State<'_, DbState>) -> Result<Vec<telemetry_recorder::TelemetrySample>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    telemetry_recorder::get_samples(&conn, &recording_id)
}

#[tauri::command]
fn associate_recording(recording_id: String, session_id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    telemetry_recorder::associate_recording(&conn, &recording_id, &session_id)
}

#[tauri::command]
fn delete_recording(recording_id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    telemetry_recorder::delete_recording(&conn, &recording_id)
}

// ── Overlay ───────────────────────────────────────────────────────────────────

/// Move overlay to the centre of the primary monitor — useful when it's off-screen.
#[tauri::command]
fn locate_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("overlay") {
        if let Ok(Some(monitor)) = w.primary_monitor() {
            let pos   = monitor.position();
            let size  = monitor.size();
            let scale = monitor.scale_factor();
            let ow = (360.0 * scale) as i32;
            let oh = (180.0 * scale) as i32;
            let x  = pos.x + (size.width  as i32 - ow) / 2;
            let y  = pos.y + (size.height as i32 - oh) / 2;
            let _ = w.set_position(tauri::PhysicalPosition::new(x, y));
            diag(&format!("locate_overlay: moved to ({x},{y}) on monitor {}×{}", size.width, size.height));
        } else {
            diag("locate_overlay: primary_monitor() returned None");
        }
        if !w.is_visible().unwrap_or(false) { let _ = w.show(); }
    } else {
        diag("locate_overlay: overlay window not found!");
    }
    Ok(())
}

/// Push overlay config from main window to the overlay WebView via eval().
/// The frontend emit() API only reaches Rust, not other windows.
#[tauri::command]
fn push_overlay_config(config: serde_json::Value, app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("overlay") {
        if let Ok(json) = serde_json::to_string(&config) {
            let _ = w.eval(&format!(
                "if(typeof window.__setOverlayConfig==='function')window.__setOverlayConfig({json})"
            ));
        }
    }
    Ok(())
}

#[tauri::command]
fn show_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("overlay") {
        let was_visible = w.is_visible().unwrap_or(false);
        if !was_visible {
            position_overlay_top_right(&w);
        }
        w.show().map_err(|e| e.to_string())?;
        diag(&format!("show_overlay: shown (was_visible={was_visible})"));
        // Do NOT call set_focus() — steals focus from the game
    } else {
        diag("show_overlay: overlay window not found!");
    }
    Ok(())
}

#[tauri::command]
fn register_shortcuts(
    bindings: KeybindingsConfig,
    app:      AppHandle,
    state:    State<'_, ShortcutActionMap>,
) -> Result<(), String> {
    apply_keybindings(&app, &bindings, &state.0);
    Ok(())
}

#[tauri::command]
fn hide_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("overlay") {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Session queries ───────────────────────────────────────────────────────────

#[tauri::command]
fn get_sessions(db_state: State<'_, DbState>) -> Result<Vec<db::SessionSummary>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let result = db::get_sessions(&conn);
    if let Err(ref e) = result { diag(&format!("get_sessions error: {e}")); }
    result
}

#[tauri::command]
fn get_session_detail(id: String, db_state: State<'_, DbState>) -> Result<Option<db::SessionDetail>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_session_detail(&conn, &id)
}

#[tauri::command]
fn delete_session(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::delete_session(&conn, &id)
}

// ── Participants ──────────────────────────────────────────────────────────────

#[tauri::command]
fn get_participants(session_id: String, db_state: State<'_, DbState>) -> Result<Vec<db::Participant>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_participants(&conn, &session_id)
}

#[tauri::command]
fn get_participant_laps(participant_id: String, db_state: State<'_, DbState>) -> Result<Vec<db::ParticipantLap>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_participant_laps(&conn, &participant_id)
}

// ── Goals ─────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_goals(db_state: State<'_, DbState>) -> Result<Vec<db::Goal>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_goals(&conn)
}

#[tauri::command]
fn create_goal(input: db::CreateGoalInput, db_state: State<'_, DbState>) -> Result<String, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::create_goal(&conn, &input)
}

#[tauri::command]
fn delete_goal(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::delete_goal(&conn, &id)
}

#[tauri::command]
fn update_goal_status(id: String, status: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::update_goal_status(&conn, &id, &status)
}

// ── Notes ─────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_notes(session_id: String, db_state: State<'_, DbState>) -> Result<Vec<db::Note>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_notes(&conn, &session_id)
}

#[tauri::command]
fn create_note(
    session_id: String,
    content:    String,
    tags:       String,
    video_url:  Option<String>,
    db_state:   State<'_, DbState>,
) -> Result<String, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::create_note(&conn, &session_id, &content, &tags, video_url.as_deref())
}

#[tauri::command]
fn delete_note(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::delete_note(&conn, &id)
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_dashboard_stats(db_state: State<'_, DbState>) -> Result<db::DashboardStats, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_dashboard_stats(&conn)
}

// ── Achievements ─────────────────────────────────────────────────────────────

#[tauri::command]
fn get_achievements(db_state: State<'_, DbState>) -> Result<Vec<db::Achievement>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_achievements(&conn)
}

// ── Setups ────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_setups(db_state: State<'_, DbState>) -> Result<Vec<db::Setup>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_setups(&conn)
}

#[tauri::command]
fn create_setup(input: db::CreateSetupInput, db_state: State<'_, DbState>) -> Result<String, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::create_setup(&conn, &input)
}

#[tauri::command]
fn toggle_setup_favorite(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::toggle_setup_favorite(&conn, &id)
}

#[tauri::command]
fn update_setup_notes(id: String, notes: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::update_setup_notes(&conn, &id, &notes)
}

#[tauri::command]
fn delete_setup(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::delete_setup(&conn, &id)
}

// ── Replay commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn get_replays(db_state: State<'_, DbState>) -> Result<Vec<db::ReplaySummary>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_replays(&conn)
}

#[tauri::command]
fn add_replay(
    file_path:  String,
    session_id: Option<String>,
    db_state:   State<'_, DbState>,
) -> Result<String, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    if db::replay_path_exists(&conn, &file_path) {
        return Ok("DUPLICATE".to_string());
    }
    let filename = std::path::Path::new(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.clone());
    let file_size = std::fs::metadata(&file_path).ok().map(|m| m.len() as i64);
    db::insert_replay(&conn, &file_path, &filename, file_size, session_id.as_deref())
}

#[tauri::command]
fn match_replay(
    replay_id:  String,
    session_id: String,
    db_state:   State<'_, DbState>,
) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::match_replay_to_session(&conn, &replay_id, &session_id)
}

#[tauri::command]
fn delete_replay(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::delete_replay(&conn, &id)
}

// ── Tracks & Cars ─────────────────────────────────────────────────────────────

#[tauri::command]
fn get_tracks(db_state: State<'_, DbState>) -> Result<Vec<db::TrackStat>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_tracks(&conn)
}

#[tauri::command]
fn get_cars(db_state: State<'_, DbState>) -> Result<Vec<db::CarStat>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_cars(&conn)
}

#[tauri::command]
fn get_track_detail(track_name: String, db_state: State<'_, DbState>) -> Result<Option<db::TrackDetail>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_track_detail(&conn, &track_name)
}

#[tauri::command]
fn get_car_detail(car_name: String, db_state: State<'_, DbState>) -> Result<Option<db::CarDetail>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_car_detail(&conn, &car_name)
}

#[tauri::command]
fn get_driver_dna(db_state: State<'_, DbState>) -> Result<db::DriverDna, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_driver_dna(&conn)
}

#[tauri::command]
fn get_pb_session_id_for(
    track_name: String,
    car_name:   String,
    exclude_id: String,
    db_state:   State<'_, DbState>,
) -> Result<Option<String>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_pb_session_id_for(&conn, &track_name, &car_name, &exclude_id)
}

#[tauri::command]
async fn import_all_replays(folder: String, db_state: State<'_, DbState>) -> Result<usize, String> {
    let entries = std::fs::read_dir(&folder).map_err(|e| e.to_string())?;
    let vcr_files: Vec<String> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path().to_string_lossy().to_string())
        .filter(|p| p.to_lowercase().ends_with(".vcr"))
        .collect();
    let mut added = 0usize;
    for path in vcr_files {
        let filename = std::path::Path::new(&path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        let file_size = std::fs::metadata(&path).ok().map(|m| m.len() as i64);
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        if !db::replay_path_exists(&conn, &path) {
            let _ = db::insert_replay(&conn, &path, &filename, file_size, None);
            added += 1;
        }
    }
    Ok(added)
}

#[tauri::command]
async fn reassign_player(
    session_id: String,
    driver_name: String,
    db_state: State<'_, DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let file_path = {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT file_path FROM sessions WHERE id=?1",
            rusqlite::params![session_id],
            |row| row.get::<_, String>(0),
        ).map_err(|e| e.to_string())?
    };
    {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        db::delete_session(&conn, &session_id)?;
    }
    let new_id = process_file(&file_path, "", "", Some(&driver_name), &app, &db_state.0).await?;
    // Emit file-result so App.tsx calls loadSessions() and the list refreshes
    let filename = std::path::Path::new(&file_path)
        .file_name().map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.clone());
    let _ = app.emit("file-result", serde_json::json!({ "file": filename, "status": "success" }));
    Ok(new_id)
}

// ── Quit ──────────────────────────────────────────────────────────────────────

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

// ── Core processing ───────────────────────────────────────────────────────────

pub async fn process_file(
    file_path: &str, api_url: &str, api_key: &str,
    driver_name: Option<&str>,
    app: &AppHandle, conn: &Arc<Mutex<rusqlite::Connection>>,
) -> Result<String, String> {
    use sha2::Digest;

    let bytes   = std::fs::read(file_path).map_err(|e| e.to_string())?;
    let content = String::from_utf8_lossy(&bytes);
    let hash    = hex::encode(sha2::Sha256::digest(&bytes));

    {
        let c = conn.lock().map_err(|e| e.to_string())?;
        if db::hash_exists(&c, &hash) {
            return Ok("DUPLICATE".to_string());
        }
    }

    if !parser::can_parse(&content) {
        return Err("Not an LMU result file".to_string());
    }

    let session = parser::parse(&content, driver_name)
        .map_err(|e| { diag(&format!("parse error [{file_path}]: {e}")); e })?;
    let snap    = metrics_snapshot::MetricsSnapshot::from_session(&session);

    let is_pb = {
        let c = conn.lock().map_err(|e| e.to_string())?;
        db::detect_pb(&c, &session.track_name, &session.car_name, snap.best_lap_ms)
    };

    let sess_id = {
        let c = conn.lock().map_err(|e| e.to_string())?;
        db::insert_session(&c, &session, &snap, file_path, &hash, is_pb)?
    };

    if !session.participants.is_empty() {
        if let Ok(c) = conn.lock() {
            let _ = db::insert_participants(&c, &sess_id, &session.participants);
        }
    }

    if let Ok(c) = conn.lock() {
        let _ = db::update_goals_for_session(
            &c, &session.track_name, &session.car_name,
            snap.best_lap_ms, snap.consistency_score, session.duration_sec,
        );
    }

    {
        let ctx = db::SessionContext {
            session_id:        sess_id.clone(),
            valid_laps:        session.valid_laps,
            session_type:      session.session_type.clone(),
            final_position:    session.final_position,
            dnf:               session.dnf,
            is_new_pb:         is_pb,
            is_online:         session.is_online,
            track_name:        session.track_name.clone(),
            car_name:          session.car_name.clone(),
            consistency_score: snap.consistency_score,
        };
        if let Ok(c) = conn.lock() {
            match db::evaluate_achievements(&c, &ctx) {
                Ok(unlocked) => {
                    for slug in &unlocked {
                        let name = db::get_achievements(&c)
                            .ok()
                            .and_then(|a| a.into_iter().find(|x| &x.slug == slug))
                            .map(|a| a.name)
                            .unwrap_or_else(|| slug.clone());
                        send_notification(app, "Achievement unlocked!", &format!("🏆 {name}"));
                    }
                }
                Err(e) => log::warn!("Achievement eval error: {e}"),
            }
        }
    }

    if !api_url.is_empty() && !api_key.is_empty() {
        match uploader::upload(file_path, api_url, api_key).await {
            Ok(resp) => {
                if let Ok(c) = conn.lock() {
                    let _ = db::mark_synced(&c, &sess_id);
                }
                // Auto-associate + upload telemetry if a recent recording exists
                let import_file_id = resp
                    .get("imports").and_then(|i| i.get(0))
                    .and_then(|i| i.get("importFileId"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                if let Some(iid) = import_file_id {
                    let au2 = api_url.to_string();
                    let ak2 = api_key.to_string();
                    let conn2 = Arc::clone(conn);
                    tauri::async_runtime::spawn(async move {
                        if let Some(web_session_id) =
                            uploader::poll_import_session_id(&iid, &au2, &ak2).await
                        {
                            // Look for a recently completed unlinked recording (within 15 min)
                            let recording_id = conn2.lock().ok().and_then(|c| {
                                telemetry_recorder::get_latest_completed_unlinked(&c, 900).ok().flatten()
                            });
                            if let Some(rid) = recording_id {
                                let samples = conn2.lock().ok().and_then(|c| {
                                    telemetry_recorder::get_samples(&c, &rid).ok()
                                });
                                if let Some(samples) = samples {
                                    match uploader::upload_telemetry(&samples, &web_session_id, &au2, &ak2).await {
                                        Ok(()) => {
                                            log::info!("Telemetry uploaded for session {web_session_id}");
                                            if let Ok(c) = conn2.lock() {
                                                let _ = telemetry_recorder::associate_recording(&c, &rid, &web_session_id);
                                            }
                                        }
                                        Err(e) => log::warn!("Telemetry upload failed: {e}"),
                                    }
                                }
                            }
                        }
                    });
                }
            }
            Err(e) => log::warn!("Server sync failed (saved locally): {e}"),
        }
    }

    if is_pb {
        send_notification(app, "UrApex", &format!("New PB at {}! 🏆", session.track_name));
    }

    Ok(sess_id)
}

// ── Notification ──────────────────────────────────────────────────────────────

pub fn send_notification(app: &AppHandle, title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder().title(title).body(body).show();
}

// ── App entry ─────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Arc shared between the global-shortcut handler (before setup) and the managed state.
    let shortcut_map: Arc<Mutex<Vec<(Shortcut, String)>>> = Arc::new(Mutex::new(Vec::new()));
    let handler_map  = Arc::clone(&shortcut_map);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed { return; }
                    // Clone the action string while holding the lock, then release before dispatch.
                    let action = handler_map.lock().ok()
                        .and_then(|map| map.iter().find(|(s, _)| s == shortcut).map(|(_, a)| a.clone()));
                    if let Some(action) = action {
                        dispatch_shortcut_action(app, &action);
                    }
                })
                .build()
        )
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("urapex".to_string()),
                }))
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(WatcherState(Mutex::new(None)))
        .manage(TelemetryState(Mutex::new(None)))
        .manage(LiveFrameState(Arc::new(Mutex::new(None))))
        .manage(RecorderState(Mutex::new(None)))
        .manage(ShortcutActionMap(shortcut_map))
        .setup(|app| {
            diag(&format!("=== UrApex companion v{} started ===", env!("CARGO_PKG_VERSION")));
            diag(&format!("log path: {DIAG_LOG_PATH}"));
            diag("setup: started");

            // Create the main window here (not in tauri.conf.json) so we can
            // pass WebView2-specific flags to tame its GPU process and memory.
            tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("UrApex")
            .inner_size(960.0, 680.0)
            .min_inner_size(720.0, 520.0)
            .resizable(true)
            .decorations(false)
            .center()
            .additional_browser_args(
                "--disable-extensions \
                 --disable-background-networking \
                 --js-flags=--max-old-space-size=128"
            )
            .build()
            .map_err(|e| { diag(&format!("window build failed: {e}")); e })?;

            let db_path = app.path().app_data_dir()
                .map_err(|e| { diag(&format!("app_data_dir failed: {e}")); e })?
                .join("urapex.db");

            diag(&format!("setup: db_path = {}", db_path.display()));

            let conn = db::open(&db_path)
                .map_err(|e| { diag(&format!("db::open failed: {e}")); e })?;

            app.manage(DbState(Arc::new(Mutex::new(conn))));
            diag("setup: db open ok");

            // Overlay window — transparent, always-on-top, hidden until user enables it
            tauri::WebviewWindowBuilder::new(
                app,
                "overlay",
                tauri::WebviewUrl::App("index.html#overlay".into()),
            )
            .title("UrApex Overlay")
            .inner_size(360.0, 180.0)
            .min_inner_size(280.0, 140.0)
            .resizable(true)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .shadow(false)
            .visible(false)
            // Keep GPU enabled for transparent compositing; no extra flags that could break WebView2 IPC
            .additional_browser_args("--disable-extensions")
            .build()
            .map_err(|e| { diag(&format!("overlay build failed: {e}")); e })?;

            let icon = tauri::image::Image::from_bytes(
                include_bytes!("../icons/32x32.png")
            ).map_err(|e| { diag(&format!("icon load failed: {e}")); e })?;

            use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};

            let open_i = MenuItem::with_id(app, "open", "Open UrApex", true, None::<&str>)
                .map_err(|e| { diag(&format!("menu item failed: {e}")); e })?;
            let sep = PredefinedMenuItem::separator(app)
                .map_err(|e| { diag(&format!("separator failed: {e}")); e })?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)
                .map_err(|e| { diag(&format!("menu item failed: {e}")); e })?;
            let menu = Menu::with_items(app, &[&open_i, &sep, &quit_i])
                .map_err(|e| { diag(&format!("menu build failed: {e}")); e })?;

            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("UrApex")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show(); let _ = w.set_focus();
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        if let Some(w) = tray.app_handle().get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                })
                .build(app)
                .map_err(|e| { diag(&format!("tray build failed: {e}")); e })?;

            // Register default keybindings — JS will override with saved values on startup
            {
                let map_state = app.state::<ShortcutActionMap>();
                apply_keybindings(app.handle(), &KeybindingsConfig::default(), &map_state.0);
            }

            // Listen for the overlay-ready event emitted by OverlayApp on mount
            let ah = app.handle().clone();
            app.listen("overlay-ready", move |e| {
                diag(&format!("overlay-ready received: {:?}", e.payload()));
                // Re-apply keybindings so shortcuts are fresh
                if let Some(w) = ah.get_webview_window("overlay") {
                    diag(&format!(
                        "overlay window exists: visible={:?} always_on_top={:?}",
                        w.is_visible(), w.is_always_on_top()
                    ));
                }
            });

            diag("setup: complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_watching, stop_watching,
            import_file, import_all_files,
            get_sessions, get_session_detail, delete_session,
            get_participants, get_participant_laps,
            get_goals, create_goal, delete_goal, update_goal_status,
            get_notes, create_note, delete_note,
            get_dashboard_stats,
            get_achievements,
            get_setups, create_setup, toggle_setup_favorite, update_setup_notes, delete_setup,
            get_replays, add_replay, match_replay, delete_replay,
            get_tracks, get_cars, get_track_detail, get_car_detail, get_driver_dna, get_pb_session_id_for,
            get_diag_log, clear_diag_log,
            import_all_replays, reassign_player,
            start_telemetry, stop_telemetry,
            start_recording, stop_recording,
            list_recordings, get_recording_samples,
            associate_recording, delete_recording,
            show_overlay, hide_overlay, push_overlay_config, locate_overlay,
            register_shortcuts,
            quit_app,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap_or_default();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
