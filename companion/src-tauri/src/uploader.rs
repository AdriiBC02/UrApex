use reqwest::multipart;
use std::{fs, path::Path};

pub async fn upload(
    file_path: &str,
    api_url: &str,
    api_key: &str,
) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
    let path = Path::new(file_path);
    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "session.xml".to_string());

    let bytes = fs::read(path)?;
    let part = multipart::Part::bytes(bytes)
        .file_name(filename)
        .mime_str("text/xml")?;

    let form = multipart::Form::new().part("files", part);

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/upload", api_url.trim_end_matches('/')))
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;

    let json: serde_json::Value = response.json().await?;
    Ok(json)
}
