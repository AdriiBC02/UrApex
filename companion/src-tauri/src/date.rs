/// Returns the current UTC time as an ISO 8601 string ("YYYY-MM-DDTHH:MM:SS").
pub fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    unix_to_iso(secs)
}

/// Converts a Unix timestamp (seconds) to "YYYY-MM-DDTHH:MM:SS".
pub fn unix_to_iso(secs: u64) -> String {
    let h = (secs / 3600) % 24;
    let m = (secs / 60) % 60;
    let s = secs % 60;
    let (y, mo, d) = civil_from_days(secs / 86400);
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{m:02}:{s:02}")
}

/// Howard Hinnant's Gregorian calendar algorithm.
/// <https://howardhinnant.github.io/date_algorithms.html>
fn civil_from_days(days: u64) -> (i64, u64, u64) {
    let z   = days as i64 + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y   = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp  = (5 * doy + 2) / 153;
    let d   = doy - (153 * mp + 2) / 5 + 1;
    let m   = if mp < 10 { mp + 3 } else { mp - 9 };
    let y   = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}
