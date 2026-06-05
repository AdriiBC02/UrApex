mod watcher;
mod uploader;

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

pub struct WatcherState(pub Mutex<Option<watcher::WatcherHandle>>);

#[tauri::command]
async fn start_watching(
    folder: String,
    api_url: String,
    api_key: String,
    app: AppHandle,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = guard.take() {
        handle.stop();
    }
    let handle = watcher::start(folder, api_url, api_key, app)
        .map_err(|e| e.to_string())?;
    *guard = Some(handle);
    Ok(())
}

#[tauri::command]
async fn stop_watching(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = guard.take() {
        handle.stop();
    }
    Ok(())
}

#[tauri::command]
async fn upload_file(
    file_path: String,
    api_url: String,
    api_key: String,
) -> Result<serde_json::Value, String> {
    uploader::upload(&file_path, &api_url, &api_key)
        .await
        .map_err(|e| e.to_string())
}

// CA-012: scan folder and upload all XML files not yet in hash cache
#[tauri::command]
async fn import_all_files(
    folder: String,
    api_url: String,
    api_key: String,
    app: AppHandle,
) -> Result<usize, String> {
    let entries = std::fs::read_dir(&folder).map_err(|e| e.to_string())?;

    let xml_files: Vec<String> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path().to_string_lossy().to_string())
        .filter(|p| p.to_lowercase().ends_with(".xml"))
        .collect();

    let count = xml_files.len();

    for path in xml_files {
        let api_url_c   = api_url.clone();
        let api_key_c   = api_key.clone();
        let app_c       = app.clone();
        let path_c      = path.clone();

        tauri::async_runtime::spawn(async move {
            let _ = app_c.emit("file-detected", serde_json::json!({ "file": path_c }));

            match uploader::upload(&path_c, &api_url_c, &api_key_c).await {
                Ok(result) => {
                    let status = result
                        .get("imports").and_then(|i| i.get(0))
                        .and_then(|i| i.get("status")).and_then(|s| s.as_str())
                        .unwrap_or("UNKNOWN");
                    let msg = match status {
                        "IMPORTED"  => "Session imported",
                        "DUPLICATE" => "Already imported",
                        _           => "Import failed",
                    };
                    send_notification(&app_c, "UrApex", msg);
                }
                Err(e) => log::error!("import_all_files error: {}", e),
            }
        });
    }

    Ok(count)
}

pub fn send_notification(app: &AppHandle, title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .manage(WatcherState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_watching,
            stop_watching,
            upload_file,
            import_all_files,
        ])
        .setup(|app| {
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            let _tray = TrayIconBuilder::with_id("main")
                .tooltip("UrApex Companion")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap_or_default();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
