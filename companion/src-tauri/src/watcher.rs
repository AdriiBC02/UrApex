use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::{path::Path, sync::mpsc, thread, time::Duration};
use tauri::{AppHandle, Emitter};

pub struct WatcherHandle {
    stop_tx: mpsc::Sender<()>,
}

impl WatcherHandle {
    pub fn stop(self) {
        let _ = self.stop_tx.send(());
    }
}

#[derive(Clone, Serialize)]
struct FileDetectedPayload {
    file: String,
}

pub fn start(
    folder: String,
    api_url: String,
    api_key: String,
    app: AppHandle,
) -> Result<WatcherHandle, Box<dyn std::error::Error + Send + Sync>> {
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let (event_tx, event_rx) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = RecommendedWatcher::new(event_tx, Config::default())?;
    watcher.watch(Path::new(&folder), RecursiveMode::NonRecursive)?;

    thread::spawn(move || {
        let _watcher = watcher;

        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }

            match event_rx.recv_timeout(Duration::from_millis(200)) {
                Ok(Ok(event)) => {
                    if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
                        for path in &event.paths {
                            let path_str = path.to_string_lossy().to_string();
                            if !path_str.to_lowercase().ends_with(".xml") {
                                continue;
                            }
                            // Small delay to ensure LMU has finished writing
                            thread::sleep(Duration::from_millis(500));

                            let _ = app.emit("file-detected", FileDetectedPayload { file: path_str.clone() });

                            let api_url = api_url.clone();
                            let api_key = api_key.clone();
                            let app_clone = app.clone();
                            let path_clone = path_str.clone();

                            tauri::async_runtime::spawn(async move {
                                match crate::uploader::upload(&path_clone, &api_url, &api_key).await {
                                    Ok(result) => {
                                        let status = result
                                            .get("imports")
                                            .and_then(|i| i.get(0))
                                            .and_then(|i| i.get("status"))
                                            .and_then(|s| s.as_str())
                                            .unwrap_or("UNKNOWN");

                                        let msg = match status {
                                            "IMPORTED"  => "Session imported successfully",
                                            "DUPLICATE" => "Session already exists",
                                            _           => "Import failed — check the companion app",
                                        };

                                        crate::send_notification(&app_clone, "UrApex", msg);
                                    }
                                    Err(e) => {
                                        log::error!("Upload error: {}", e);
                                        crate::send_notification(&app_clone, "UrApex", "Upload failed — check your connection");
                                    }
                                }
                            });
                        }
                    }
                }
                Ok(Err(e)) => log::error!("Watcher error: {}", e),
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    Ok(WatcherHandle { stop_tx })
}
