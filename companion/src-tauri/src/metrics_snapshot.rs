use crate::{metrics, parser::ParsedSession};

pub struct MetricsSnapshot {
    pub best_lap_ms:       Option<i32>,
    pub avg_lap_ms:        Option<f64>,
    pub ideal_lap_ms:      Option<i32>,
    pub consistency_score: Option<f64>,
}

impl MetricsSnapshot {
    pub fn from_session(session: &ParsedSession) -> Self {
        Self {
            best_lap_ms:       metrics::best_lap(&session.laps),
            avg_lap_ms:        metrics::avg_lap(&session.laps),
            ideal_lap_ms:      metrics::ideal_lap(&session.laps),
            consistency_score: metrics::consistency_score(&session.laps),
        }
    }
}
