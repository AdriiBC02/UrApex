use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::{path::Path, sync::mpsc, thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager};

pub struct WatcherHandle {
    stop_tx: mpsc::Sender<()>,
}

impl WatcherHandle {
    pub fn stop(self) {
        let _ = self.stop_tx.send(());
    }
}

pub fn start(
    folder: String, api_url: String, api_key: String,
    driver_name: Option<String>,
    replay_folder: Option<String>,
    app: AppHandle,
) -> Result<WatcherHandle, Box<dyn std::error::Error + Send + Sync>> {
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let (event_tx, event_rx) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = RecommendedWatcher::new(event_tx, Config::default())?;
    watcher.watch(Path::new(&folder), RecursiveMode::NonRecursive)?;

    // Optionally watch a separate replay folder for .vcr files
    if let Some(ref rf) = replay_folder {
        if !rf.is_empty() && rf != &folder {
            let _ = watcher.watch(Path::new(rf), RecursiveMode::NonRecursive);
        }
    }

    thread::spawn(move || {
        let _watcher = watcher;

        loop {
            if stop_rx.try_recv().is_ok() { break; }

            match event_rx.recv_timeout(Duration::from_millis(200)) {
                Ok(Ok(event)) => {
                    if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
                        for path in &event.paths {
                            let path_str = path.to_string_lossy().to_string();
                            let lower = path_str.to_lowercase();

                            thread::sleep(Duration::from_millis(500));

                            if lower.ends_with(".xml") {
                                handle_xml(&path_str, &api_url, &api_key, &driver_name, &app);
                            } else if lower.ends_with(".vcr") {
                                handle_vcr(&path_str, &app);
                            }
                        }
                    }
                }
                Ok(Err(e)) => log::error!("Watcher error: {e}"),
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    Ok(WatcherHandle { stop_tx })
}

fn handle_xml(path_str: &str, api_url: &str, api_key: &str, driver_name: &Option<String>, app: &AppHandle) {
    let _ = app.emit("file-detected", serde_json::json!({ "file": path_str }));
    let (au, ak, dn, ac) = (
        api_url.to_string(), api_key.to_string(),
        driver_name.clone(), app.clone(),
    );
    let path_c = path_str.to_string();
    let db_arc = {
        let db = ac.state::<crate::DbState>();
        std::sync::Arc::clone(&db.0)
    };
    tauri::async_runtime::spawn(async move {
        match crate::process_file(&path_c, &au, &ak, dn.as_deref(), &ac, &db_arc).await {
            Ok(status) => {
                let (log_status, notif) = match status.as_str() {
                    "DUPLICATE" => ("duplicate", "Already imported"),
                    _           => ("success",   "Session saved ✓"),
                };
                let _ = ac.emit("file-result", serde_json::json!({ "file": path_c, "status": log_status }));
                crate::send_notification(&ac, "UrApex", notif);
            }
            Err(e) => {
                log::error!("Watcher process error: {e}");
                let _ = ac.emit("file-result", serde_json::json!({ "file": path_c, "status": "error", "message": e.to_string() }));
                crate::send_notification(&ac, "UrApex", "Import failed — check the app");
            }
        }
    });
}

fn handle_vcr(path_str: &str, app: &AppHandle) {
    let db_arc = {
        let db = app.state::<crate::DbState>();
        std::sync::Arc::clone(&db.0)
    };
    let path_c  = path_str.to_string();
    let app_c   = app.clone();

    tauri::async_runtime::spawn(async move {
        let conn = match db_arc.lock() {
            Ok(c)  => c,
            Err(e) => { log::error!("VCR db lock error: {e}"); return; }
        };
        if crate::db::replay_path_exists(&conn, &path_c) { return; }
        let filename  = std::path::Path::new(&path_c)
            .file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| path_c.clone());
        let file_size = std::fs::metadata(&path_c).ok().map(|m| m.len() as i64);
        match crate::db::insert_replay(&conn, &path_c, &filename, file_size, None) {
            Ok(_)  => {
                let _ = app_c.emit("replay-detected", serde_json::json!({ "file": path_c }));
                crate::send_notification(&app_c, "UrApex", &format!("Replay saved: {filename}"));
            }
            Err(e) => log::error!("VCR insert error: {e}"),
        }
    });
}
