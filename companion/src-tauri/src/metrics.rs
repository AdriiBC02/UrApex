use crate::parser::ParsedLap;

pub fn best_lap(laps: &[ParsedLap]) -> Option<i32> {
    laps.iter().filter(|l| l.is_valid).filter_map(|l| l.lap_time_ms).min()
}

pub fn avg_lap(laps: &[ParsedLap]) -> Option<f64> {
    let valid: Vec<i32> = laps.iter().filter(|l| l.is_valid).filter_map(|l| l.lap_time_ms).collect();
    if valid.is_empty() { return None; }
    Some(valid.iter().sum::<i32>() as f64 / valid.len() as f64)
}

pub fn ideal_lap(laps: &[ParsedLap]) -> Option<i32> {
    let valid: Vec<&ParsedLap> = laps.iter().filter(|l| l.is_valid).collect();
    let s1 = valid.iter().filter_map(|l| l.sector1_ms).min()?;
    let s2 = valid.iter().filter_map(|l| l.sector2_ms).min()?;
    let s3 = valid.iter().filter_map(|l| l.sector3_ms).min()?;
    Some(s1 + s2 + s3)
}

pub fn std_dev(laps: &[ParsedLap]) -> Option<f64> {
    let valid: Vec<f64> = laps.iter().filter(|l| l.is_valid)
        .filter_map(|l| l.lap_time_ms.map(|t| t as f64))
        .collect();
    if valid.len() < 2 { return None; }
    let mean = valid.iter().sum::<f64>() / valid.len() as f64;
    let var  = valid.iter().map(|t| (t - mean).powi(2)).sum::<f64>() / valid.len() as f64;
    Some(var.sqrt())
}

pub fn consistency_score(laps: &[ParsedLap]) -> Option<f64> {
    let best = best_lap(laps)? as f64;
    if best <= 0.0 { return None; }
    let dev = std_dev(laps)?;
    Some((100.0 - (dev / best) * 1000.0).clamp(0.0, 100.0))
}
