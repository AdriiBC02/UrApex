use roxmltree::Node;

#[derive(Debug, Clone)]
pub struct ParsedLap {
    pub lap_number: i32,
    pub lap_time_ms: Option<i32>,
    pub is_valid: bool,
    pub sector1_ms: Option<i32>,
    pub sector2_ms: Option<i32>,
    pub sector3_ms: Option<i32>,
}

#[derive(Debug)]
pub struct ParsedSession {
    pub track_name: String,
    pub car_name: String,
    pub car_class: Option<String>,
    pub session_type: String, // "PRACTICE" | "QUALIFYING" | "RACE"
    pub session_date: String, // ISO 8601
    pub total_laps: i32,
    pub valid_laps: i32,
    pub final_position: Option<i32>,
    pub duration_sec: Option<i32>,
    pub is_online: bool,
    pub dnf: bool,
    pub laps: Vec<ParsedLap>,
    pub all_driver_names: Vec<String>,
}

pub fn can_parse(content: &str) -> bool {
    content.contains("<rFactorXML") || content.contains("<RaceResults")
}

/// Lightweight name extraction — no full DOM needed
pub fn extract_driver_names(content: &str) -> Vec<String> {
    let mut names = Vec::new();
    let mut rest = content;
    while let Some(start) = rest.find("<Name>") {
        rest = &rest[start + 6..];
        if let Some(end) = rest.find("</Name>") {
            let name = rest[..end].trim().to_string();
            if !name.is_empty() && !names.contains(&name) {
                names.push(name);
            }
            rest = &rest[end + 7..];
        } else {
            break;
        }
    }
    names
}

pub fn parse(content: &str, driver_name: Option<&str>) -> Result<ParsedSession, String> {
    let doc = roxmltree::Document::parse(content)
        .map_err(|e| format!("XML parse error: {e}"))?;

    let race_results = find_race_results(doc.root_element())
        .ok_or_else(|| "Could not find <RaceResults>".to_string())?;

    let (session_key, session_node) = find_session(race_results)
        .ok_or_else(|| "No session element found (Practice1/Qualify/Race1…)".to_string())?;

    let track_name = child_text(race_results, "TrackVenue")
        .or_else(|| child_text(race_results, "TrackCourse"))
        .unwrap_or("Unknown Track")
        .to_string();

    let is_online = child_text(race_results, "Setting")
        .map(|s| s == "Multiplayer")
        .unwrap_or(false);

    let duration_sec = child_text(session_node, "Minutes")
        .and_then(|s| s.parse::<f64>().ok())
        .or_else(|| child_text(race_results, "RaceTime").and_then(|s| s.parse().ok()))
        .map(|m| (m * 60.0) as i32);

    let session_date = parse_date(session_node, race_results);

    let drivers: Vec<Node> = session_node.children()
        .filter(|n| n.is_element() && n.tag_name().name() == "Driver")
        .collect();

    if drivers.is_empty() {
        return Err("No driver data found".to_string());
    }

    let all_driver_names: Vec<String> = drivers.iter()
        .filter_map(|d| child_text(*d, "Name").map(str::to_string))
        .collect();

    let player = find_player(&drivers, driver_name)
        .ok_or_else(|| "Could not identify player driver".to_string())?;

    let car_name = child_text(player, "CarType")
        .or_else(|| child_text(player, "VehName"))
        .unwrap_or("Unknown Car")
        .to_string();

    let car_class = child_text(player, "CarClass").map(str::to_string);
    let final_position = child_text(player, "Position").and_then(|s| s.parse().ok());

    let finish_status = child_text(player, "FinishStatus").unwrap_or("");
    let dnf = !finish_status.is_empty()
        && finish_status != "Finished Normally"
        && finish_status != "None";

    let laps = parse_laps(player);
    let total_laps = laps.len() as i32;
    let valid_laps = laps.iter().filter(|l| l.is_valid).count() as i32;

    Ok(ParsedSession {
        track_name,
        car_name,
        car_class,
        session_type: normalize_session_type(&session_key),
        session_date,
        total_laps,
        valid_laps,
        final_position,
        duration_sec,
        is_online,
        dnf,
        laps,
        all_driver_names,
    })
}

// ── Navigation helpers ────────────────────────────────────────────────────────

fn find_race_results<'a>(root: Node<'a, 'a>) -> Option<Node<'a, 'a>> {
    // Try rFactorXML/RaceResults
    if let Some(rf) = root.children().find(|n| n.has_tag_name("rFactorXML")) {
        if let Some(rr) = rf.children().find(|n| n.has_tag_name("RaceResults")) {
            return Some(rr);
        }
    }
    // Try direct RaceResults
    root.children().find(|n| n.has_tag_name("RaceResults"))
}

const SESSION_KEYS: &[&str] = &[
    "Practice1", "Practice2", "Practice3", "Practice4",
    "Qualify", "Qualify1", "Qualify2",
    "Race", "Race1", "Race2",
    "WarmUp", "TimedLap",
];

fn find_session<'a>(root: Node<'a, 'a>) -> Option<(String, Node<'a, 'a>)> {
    for key in SESSION_KEYS {
        if let Some(node) = root.children().find(|n| n.has_tag_name(*key)) {
            return Some(((*key).to_string(), node));
        }
    }
    None
}

fn find_player<'a>(drivers: &[Node<'a, 'a>], driver_name: Option<&str>) -> Option<Node<'a, 'a>> {
    if let Some(name) = driver_name {
        // Exact match
        if let Some(d) = drivers.iter().find(|d| child_text(**d, "Name") == Some(name)) {
            return Some(*d);
        }
        // Case-insensitive
        let lower = name.to_lowercase();
        if let Some(d) = drivers.iter().find(|d| {
            child_text(**d, "Name").map(|n| n.to_lowercase()) == Some(lower.clone())
        }) {
            return Some(*d);
        }
    }
    // Fallback: first driver with a valid best lap time
    let with_laps = drivers.iter().find(|d| {
        child_text(**d, "BestLapTime")
            .and_then(|s| s.parse::<f64>().ok())
            .map(|t| t > 0.0)
            .unwrap_or(false)
    });
    with_laps.copied().or_else(|| drivers.first().copied())
}

fn child_text<'a>(node: Node<'a, 'a>, tag: &str) -> Option<&'a str> {
    node.children()
        .find(|n| n.is_element() && n.tag_name().name() == tag)
        .and_then(|n| n.text())
        .map(str::trim)
        .filter(|s| !s.is_empty())
}

fn parse_laps(player: Node) -> Vec<ParsedLap> {
    player.children()
        .filter(|n| n.is_element() && n.tag_name().name() == "Lap")
        .map(|lap| {
            let lap_number = lap.attribute("num")
                .and_then(|s| s.parse().ok())
                .unwrap_or(0);

            let time_str = lap.text().map(str::trim).unwrap_or("");
            let time_sec = time_str.parse::<f64>().ok();
            let is_valid = time_sec.map(|t| t > 0.0 && !time_str.contains('-')).unwrap_or(false);

            ParsedLap {
                lap_number,
                lap_time_ms: if is_valid { time_sec.map(|t| (t * 1000.0) as i32) } else { None },
                is_valid,
                sector1_ms: sec_attr_ms(&lap, "s1"),
                sector2_ms: sec_attr_ms(&lap, "s2"),
                sector3_ms: sec_attr_ms(&lap, "s3"),
            }
        })
        .collect()
}

fn sec_attr_ms(node: &Node, attr: &str) -> Option<i32> {
    node.attribute(attr)
        .and_then(|s| s.parse::<f64>().ok())
        .filter(|&t| t > 0.0)
        .map(|t| (t * 1000.0) as i32)
}

fn normalize_session_type(key: &str) -> String {
    let k = key.trim_end_matches(char::is_numeric).to_lowercase();
    match k.as_str() {
        "qualify" => "QUALIFYING",
        "race"    => "RACE",
        _         => "PRACTICE",
    }.to_string()
}

fn parse_date(session: Node, root: Node) -> String {
    for node in [session, root] {
        if let Some(ts) = child_text(node, "TimeString") {
            // "2026/06/03 02:50:21" → "2026-06-03T02:50:21"
            let normalized = ts.replace('/', "-").replace(' ', "T");
            if normalized.len() >= 10 {
                return normalized;
            }
        }
    }
    // Fallback: use current time
    crate::date::now_iso()
}
