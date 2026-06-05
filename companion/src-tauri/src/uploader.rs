use reqwest::multipart;
use sha2::{Digest, Sha256};
use std::{fs, path::Path, time::Duration};

const MAX_RETRIES: u32 = 3;
const RETRY_DELAY_MS: u64 = 2000;

pub async fn upload(
    file_path: &str,
    api_url: &str,
    api_key: &str,
) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
    let path     = Path::new(file_path);
    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "session.xml".to_string());

    let bytes = fs::read(path)?;

    // CA-009: compute local hash — skip if already uploaded
    let hash = hex::encode(Sha256::digest(&bytes));
    if is_already_uploaded(&hash) {
        log::info!("Skipping already-uploaded file: {} ({})", filename, &hash[..8]);
        return Ok(serde_json::json!({
            "imports": [{ "status": "DUPLICATE", "originalName": filename }]
        }));
    }

    // CA-010: retry loop with exponential backoff
    let mut last_err: Box<dyn std::error::Error + Send + Sync> =
        Box::new(std::io::Error::new(std::io::ErrorKind::Other, "no attempt made"));

    for attempt in 1..=MAX_RETRIES {
        match try_upload(&bytes, &filename, api_url, api_key).await {
            Ok(result) => {
                // Mark as uploaded on success or server-side duplicate
                let status = result
                    .get("imports").and_then(|i| i.get(0))
                    .and_then(|i| i.get("status")).and_then(|s| s.as_str())
                    .unwrap_or("");
                if status == "IMPORTED" || status == "DUPLICATE" {
                    mark_uploaded(hash);
                }
                return Ok(result);
            }
            Err(e) => {
                log::warn!("Upload attempt {}/{} failed: {}", attempt, MAX_RETRIES, e);
                last_err = e;
                if attempt < MAX_RETRIES {
                    tokio::time::sleep(Duration::from_millis(RETRY_DELAY_MS * u64::from(attempt))).await;
                }
            }
        }
    }

    Err(last_err)
}

async fn try_upload(
    bytes: &[u8],
    filename: &str,
    api_url: &str,
    api_key: &str,
) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
    let part = multipart::Part::bytes(bytes.to_vec())
        .file_name(filename.to_string())
        .mime_str("text/xml")?;

    let form = multipart::Form::new().part("files", part);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()?;

    let response = client
        .post(format!("{}/api/upload", api_url.trim_end_matches('/')))
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;

    let json: serde_json::Value = response.json().await?;
    Ok(json)
}

// ── Local hash cache (persisted in app data dir) ──────────────────────────────
// Stored as a newline-delimited text file: uploaded_hashes.txt
// This is best-effort — if reading fails we upload anyway.

fn cache_path() -> Option<std::path::PathBuf> {
    dirs_next::data_local_dir().map(|d| d.join("UrApex").join("uploaded_hashes.txt"))
}

fn is_already_uploaded(hash: &str) -> bool {
    let Some(path) = cache_path() else { return false };
    fs::read_to_string(&path)
        .map(|s| s.lines().any(|l| l == hash))
        .unwrap_or(false)
}

fn mark_uploaded(hash: String) {
    let Some(path) = cache_path() else { return };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    use std::io::Write;
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(f, "{}", hash);
    }
}
