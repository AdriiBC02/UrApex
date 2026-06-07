use reqwest::multipart;
use sha2::{Digest, Sha256};
use std::{fs, path::Path, time::Duration};
use crate::telemetry_recorder::TelemetrySample;

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

// ── Telemetry upload ──────────────────────────────────────────────────────────

pub async fn upload_telemetry(
    samples:    &[TelemetrySample],
    session_id: &str,
    api_url:    &str,
    api_key:    &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if samples.is_empty() { return Ok(()); }

    let frames: Vec<serde_json::Value> = samples.iter().map(|s| serde_json::json!({
        "t_ms":         s.t_ms,
        "lap":          s.lap,
        "speed_kph":    s.speed_kph,
        "rpm":          s.rpm,
        "gear":         s.gear,
        "throttle":     s.throttle,
        "brake":        s.brake,
        "steering":     s.steering,
        "fuel_l":       s.fuel_l,
        "tire_fl_temp": s.tire_fl_temp, "tire_fr_temp": s.tire_fr_temp,
        "tire_rl_temp": s.tire_rl_temp, "tire_rr_temp": s.tire_rr_temp,
        "tire_fl_wear": s.tire_fl_wear, "tire_fr_wear": s.tire_fr_wear,
        "tire_rl_wear": s.tire_rl_wear, "tire_rr_wear": s.tire_rr_wear,
        "tire_fl_pres": s.tire_fl_pres, "tire_fr_pres": s.tire_fr_pres,
        "tire_rl_pres": s.tire_rl_pres, "tire_rr_pres": s.tire_rr_pres,
        "brk_fl_temp":  s.brk_fl_temp,  "brk_fr_temp":  s.brk_fr_temp,
        "brk_rl_temp":  s.brk_rl_temp,  "brk_rr_temp":  s.brk_rr_temp,
        "oil_temp":     s.oil_temp,
        "h2o_temp":     s.h2o_temp,
        "game_phase":   s.game_phase,
        "flag":         s.flag,
    })).collect();

    let body = serde_json::json!({ "frames": frames, "sampleHz": 10 });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()?;

    let resp = client
        .post(format!("{}/api/sessions/{}/telemetry", api_url.trim_end_matches('/'), session_id))
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(format!("telemetry upload failed: HTTP {}", resp.status()).into());
    }
    Ok(())
}

/// Poll GET /api/import/{id} (with Bearer) until status is IMPORTED or FAILED.
/// Returns the web session id on success.
pub async fn poll_import_session_id(
    import_file_id: &str,
    api_url:        &str,
    api_key:        &str,
) -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .ok()?;

    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(1500)).await;
        let Ok(resp) = client
            .get(format!("{}/api/import/{}", api_url.trim_end_matches('/'), import_file_id))
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
        else { continue };

        let Ok(json) = resp.json::<serde_json::Value>().await else { continue };
        let status = json.get("status").and_then(|s| s.as_str()).unwrap_or("");
        if status == "IMPORTED" {
            return json.get("sessionId").and_then(|v| v.as_str()).map(|s| s.to_string());
        }
        if status == "FAILED" { break; }
    }
    None
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
