//! The one datum both gauge axes consume: a single priced assistant turn.
//!
//! This mirrors the TypeScript `UsageEvent` shape field-for-field so the JS core
//! stays untouched. `serde(rename_all = "camelCase")` lines the names up across
//! the Tauri bridge: Rust `cache_write_5m` becomes JS `cacheWrite5m`, etc.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageEvent {
    /// Message id, used to dedup a turn that shows up in more than one file.
    pub uuid: String,
    /// Epoch milliseconds, matching JS `Date.parse`.
    pub timestamp: i64,
    pub model: String,
    pub input: u64,
    pub output: u64,
    pub cache_read: u64,
    pub cache_write_5m: u64,
    pub cache_write_1h: u64,
}
