mod date;
mod db;
mod metrics;
mod metrics_snapshot;
mod parser;
mod uploader;
mod watcher;

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct WatcherState(pub Mutex<Option<watcher::WatcherHandle>>);
pub struct DbState(pub Arc<Mutex<rusqlite::Connection>>);

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
            if let Err(e) = process_file(&path, &au, &ak, dn.as_deref(), &ac, &db).await {
                log::error!("import_all: {e}");
            }
        });
    }
    Ok(count)
}

// ── Session queries ───────────────────────────────────────────────────────────

#[tauri::command]
fn get_sessions(db_state: State<'_, DbState>) -> Result<Vec<db::SessionSummary>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    db::get_sessions(&conn)
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

    let session = parser::parse(&content, driver_name)?;
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
            Ok(_) => {
                if let Ok(c) = conn.lock() {
                    let _ = db::mark_synced(&c, &sess_id);
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
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("urapex-companion".to_string()),
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
        .manage(WatcherState(Mutex::new(None)))
        .setup(|app| {
            let db_path = app.path().app_data_dir()
                .map_err(|e| { log::error!("app_data_dir failed: {e}"); e })?
                .join("urapex.db");

            let conn = db::open(&db_path)
                .map_err(|e| { log::error!("db::open failed: {e}"); e })?;

            app.manage(DbState(Arc::new(Mutex::new(conn))));

            let icon = tauri::image::Image::from_bytes(
                include_bytes!("../icons/32x32.png")
            ).map_err(|e| { log::error!("icon load failed: {e}"); e })?;

            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("UrApex Companion")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(w) = tray.app_handle().get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                })
                .build(app)
                .map_err(|e| { log::error!("tray build failed: {e}"); e })?;

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
