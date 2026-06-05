// Prevents console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    early_diag("main: process started");

    #[cfg(windows)]
    std::panic::set_hook(Box::new(|info| {
        early_diag(&format!("PANIC: {info}"));
    }));

    urapex_lib::run()
}

#[cfg(windows)]
fn early_diag(msg: &str) {
    use std::io::Write;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let line = format!("[{ts}] {msg}\n");

    // Try three paths in order — at least one should be writable
    let candidates: &[&str] = &[
        "C:\\Users\\Public\\urapex-diag.log",
    ];
    for path in candidates {
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
            let _ = f.write_all(line.as_bytes());
            return;
        }
    }
    // Fallback: %LOCALAPPDATA%
    if let Ok(base) = std::env::var("LOCALAPPDATA") {
        let path = format!("{base}\\urapex-diag.log");
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
            let _ = f.write_all(line.as_bytes());
            return;
        }
    }
    // Fallback: %TEMP%
    if let Ok(base) = std::env::var("TEMP") {
        let path = format!("{base}\\urapex-diag.log");
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
            let _ = f.write_all(line.as_bytes());
        }
    }
}
