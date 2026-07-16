//! The persistent scan cache: `~/.minuit/scan-cache.json`.
//!
//! Each entry is one transcript's parsed events, stamped with the mtime + size
//! they were parsed at. On the next scan, a file whose mtime and size still match
//! is reused verbatim — no disk read, no re-parse. This is what makes a refresh
//! touch only the single transcript Claude is actively appending to, and a cold
//! start re-read just the handful of files changed since last run.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::scan::event::UsageEvent;
use crate::scan::parse::parse_jsonl;
use crate::scan::walk::FileMeta;

/// One transcript's cached parse, plus the stats it is valid for.
#[derive(Clone, Serialize, Deserialize)]
pub struct CacheEntry {
    pub mtime_ms: i64,
    pub size: u64,
    pub events: Vec<UsageEvent>,
}

impl CacheEntry {
    /// Read and parse a transcript from scratch. An unreadable file yields an
    /// empty (but valid) entry so one bad file can't sink the whole scan.
    pub fn parse(file: &FileMeta) -> Self {
        let content = fs::read_to_string(&file.path).unwrap_or_default();
        CacheEntry {
            mtime_ms: file.mtime_ms,
            size: file.size,
            events: parse_jsonl(&content),
        }
    }
}

#[derive(Default, Serialize, Deserialize)]
pub struct ScanCache {
    /// Absolute path -> that file's cached parse.
    files: HashMap<String, CacheEntry>,
}

impl ScanCache {
    /// Load the cache, treating any failure (missing, corrupt, schema drift) as
    /// an empty cache — the scan then simply re-parses everything this run.
    pub fn load(path: &Path) -> Self {
        fs::read_to_string(path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    /// The cached entry for `key` iff it is still current (same mtime and size).
    pub fn unchanged(&self, key: &str, file: &FileMeta) -> Option<&CacheEntry> {
        self.files
            .get(key)
            .filter(|e| e.mtime_ms == file.mtime_ms && e.size == file.size)
    }

    /// Rebuild a cache from the current file set. Only listed files survive, so
    /// deleted or expired transcripts are pruned automatically.
    pub fn from_entries(entries: Vec<(String, CacheEntry)>) -> Self {
        ScanCache {
            files: entries.into_iter().collect(),
        }
    }

    /// Every cached event, flattened and deduped by uuid (a turn is counted once
    /// even if it appears in two files).
    pub fn events_deduped(&self) -> Vec<UsageEvent> {
        let mut seen = HashSet::new();
        let mut out = Vec::new();
        for entry in self.files.values() {
            for event in &entry.events {
                if seen.insert(event.uuid.clone()) {
                    out.push(event.clone());
                }
            }
        }
        out
    }

    /// Persist atomically: write a sibling temp file then rename it into place,
    /// so a crash mid-write can never leave a half-written cache behind.
    pub fn save(&self, path: &Path) {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let Ok(json) = serde_json::to_string(self) else {
            return;
        };
        let tmp = path.with_extension("json.tmp");
        if fs::write(&tmp, json).is_ok() {
            let _ = fs::rename(&tmp, path);
        }
    }
}
