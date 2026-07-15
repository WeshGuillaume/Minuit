//! JSONL transcript -> `UsageEvent`s.
//!
//! One Claude session is one `.jsonl` file of newline-delimited JSON. Only
//! `assistant` rows carrying a `message.usage` block cost tokens, so those are
//! the only rows we keep. Parsing is deliberately tolerant: Claude appends live,
//! so the last line can be half-written — a row that fails to parse is skipped,
//! never fatal. This is the Rust port of the old `adapters/jsonl.ts`.

use serde::Deserialize;

use crate::scan::event::UsageEvent;

// The raw transcript row, reduced to the handful of fields we trust. Everything
// is optional: we read what we need and ignore the rest of the (large) row.
#[derive(Deserialize)]
struct RawRow {
    #[serde(rename = "type")]
    kind: Option<String>,
    uuid: Option<String>,
    timestamp: Option<String>,
    message: Option<RawMessage>,
}

#[derive(Deserialize)]
struct RawMessage {
    model: Option<String>,
    usage: Option<RawUsage>,
}

#[derive(Deserialize)]
struct RawUsage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    cache_read_input_tokens: Option<u64>,
    cache_creation_input_tokens: Option<u64>,
    cache_creation: Option<RawCacheCreation>,
}

#[derive(Deserialize)]
struct RawCacheCreation {
    ephemeral_5m_input_tokens: Option<u64>,
    ephemeral_1h_input_tokens: Option<u64>,
}

/// The 5m/1h split lives in `cache_creation`; older transcripts only expose the
/// aggregate `cache_creation_input_tokens`, which we attribute to the 5m tier.
fn cache_write_5m(usage: &RawUsage) -> u64 {
    match usage
        .cache_creation
        .as_ref()
        .and_then(|c| c.ephemeral_5m_input_tokens)
    {
        Some(v) => v,
        None => usage.cache_creation_input_tokens.unwrap_or(0),
    }
}

/// ISO-8601 timestamp -> epoch millis, `0` when absent or unparseable (matching
/// the JS `Date.parse` fallback).
fn parse_millis(ts: &Option<String>) -> i64 {
    ts.as_deref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(0)
}

/// Keep only priced assistant turns; drop user rows, summaries, tool results,
/// and any row without a usage block.
fn to_event(row: RawRow) -> Option<UsageEvent> {
    if row.kind.as_deref() != Some("assistant") {
        return None;
    }
    let uuid = row.uuid?;
    let message = row.message?;
    let usage = message.usage?;
    Some(UsageEvent {
        uuid,
        timestamp: parse_millis(&row.timestamp),
        model: message.model.unwrap_or_else(|| "unknown".to_string()),
        input: usage.input_tokens.unwrap_or(0),
        output: usage.output_tokens.unwrap_or(0),
        cache_read: usage.cache_read_input_tokens.unwrap_or(0),
        cache_write_5m: cache_write_5m(&usage),
        cache_write_1h: usage
            .cache_creation
            .as_ref()
            .and_then(|c| c.ephemeral_1h_input_tokens)
            .unwrap_or(0),
    })
}

/// Parse a whole transcript. Blank and corrupt lines are skipped.
pub fn parse_jsonl(content: &str) -> Vec<UsageEvent> {
    content
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() {
                return None;
            }
            serde_json::from_str::<RawRow>(line).ok().and_then(to_event)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_only_assistant_usage_rows_and_splits_cache_tiers() {
        let jsonl = concat!(
            r#"{"type":"user","uuid":"u1","message":{}}"#,
            "\n",
            r#"{"type":"assistant","uuid":"a1","timestamp":"2026-07-15T10:00:00.000Z","message":{"model":"claude-opus-4-8","usage":{"input_tokens":10,"output_tokens":20,"cache_read_input_tokens":5,"cache_creation":{"ephemeral_5m_input_tokens":3,"ephemeral_1h_input_tokens":7}}}}"#,
            "\n",
            // half-written final line: skipped, not fatal
            r#"{"type":"assistant","uuid":"a2","mess"#,
        );
        let events = parse_jsonl(jsonl);
        assert_eq!(events.len(), 1);
        let e = &events[0];
        assert_eq!(e.uuid, "a1");
        assert_eq!(e.cache_read, 5);
        assert_eq!(e.cache_write_5m, 3);
        assert_eq!(e.cache_write_1h, 7);
    }

    #[test]
    fn falls_back_to_aggregate_cache_creation_for_5m_tier() {
        let jsonl = r#"{"type":"assistant","uuid":"a1","timestamp":"2026-07-15T10:00:00.000Z","message":{"usage":{"cache_creation_input_tokens":42}}}"#;
        let events = parse_jsonl(jsonl);
        assert_eq!(events[0].cache_write_5m, 42);
        assert_eq!(events[0].cache_write_1h, 0);
    }
}
