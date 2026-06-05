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
    app: AppHandle,
) -> Result<WatcherHandle, Box<dyn std::error::Error + Send + Sync>> {
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let (event_tx, event_rx) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = RecommendedWatcher::new(event_tx, Config::default())?;
    watcher.watch(Path::new(&folder), RecursiveMode::NonRecursive)?;

    thread::spawn(move || {
        let _watcher = watcher;

        loop {
            if stop_rx.try_recv().is_ok() { break; }

            match event_rx.recv_timeout(Duration::from_millis(200)) {
                Ok(Ok(event)) => {
                    if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
                        for path in &event.paths {
                            let path_str = path.to_string_lossy().to_string();
                            if !path_str.to_lowercase().ends_with(".xml") { continue; }

                            thread::sleep(Duration::from_millis(500));

                            let _ = app.emit("file-detected", serde_json::json!({ "file": path_str }));

                            let (au, ak, dn, ac) = (
                                api_url.clone(), api_key.clone(),
                                driver_name.clone(), app.clone(),
                            );
                            let path_c = path_str.clone();

                            // Get Arc<Mutex<Connection>> from app state
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
                                        let _ = ac.emit("file-result", serde_json::json!({
                                            "file": path_c, "status": log_status
                                        }));
                                        crate::send_notification(&ac, "UrApex", notif);
                                    }
                                    Err(e) => {
                                        log::error!("Watcher process error: {e}");
                                        let _ = ac.emit("file-result", serde_json::json!({
                                            "file": path_c, "status": "error", "message": e.to_string()
                                        }));
                                        crate::send_notification(&ac, "UrApex", "Import failed — check the app");
                                    }
                                }
                            });
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
