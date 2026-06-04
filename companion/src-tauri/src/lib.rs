mod watcher;
mod uploader;

use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

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

    // Stop any existing watcher
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .manage(WatcherState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_watching,
            stop_watching,
            upload_file,
        ])
        .setup(|app| {
            // System tray
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            use tauri::image::Image;

            let _tray = TrayIconBuilder::new()
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
            // Minimize to tray instead of closing
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap_or_default();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
