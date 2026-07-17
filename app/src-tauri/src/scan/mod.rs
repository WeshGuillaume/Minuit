//! Axis-1's data source, in native Rust.
//!
//! Walking `~/.claude/projects/**` and parsing every transcript is far too much
//! work to do across the JS bridge on every load (~1000 files, hundreds of MB).
//! Here it runs natively, in parallel, and, via the on-disk cache, re-reads
//! only the files that actually changed since last time. The webview receives
//! just the compact event list.
//!
//! The pipeline is deliberately linear; each step lives in its own module:
//!   walk  -> discover transcripts + mtimes
//!   cache -> reuse unchanged files, persist the rebuilt set
//!   parse -> turn a changed file's text into events

pub mod cache;
pub mod event;
pub mod parse;
pub mod walk;

use std::path::Path;

use rayon::prelude::*;

use cache::{CacheEntry, ScanCache};
use event::UsageEvent;
use walk::FileMeta;

/// Scan all transcripts and return every event, deduped, from files touched
/// since the lookback horizon.
///
/// - `root`       absolute path to `~/.claude/projects`
/// - `cache_path` absolute path to `~/.minuit/scan-cache.json`
/// - `since_ms`   epoch-ms lookback floor; files untouched since then are ignored
///                (their events all predate the window, so they can't matter)
pub fn run(root: &str, cache_path: &str, since_ms: i64) -> Vec<UsageEvent> {
    let files: Vec<FileMeta> = walk::list_transcripts(Path::new(root))
        .into_iter()
        .filter(|f| f.mtime_ms >= since_ms)
        .collect();

    let previous = ScanCache::load(Path::new(cache_path));

    // Reuse unchanged files straight from the cache; re-parse only the changed
    // ones, and do that parsing in parallel across cores.
    let entries: Vec<(String, CacheEntry)> = files
        .par_iter()
        .map(|file| {
            let key = file.path.to_string_lossy().into_owned();
            let entry = match previous.unchanged(&key, file) {
                Some(cached) => cached.clone(),
                None => CacheEntry::parse(file),
            };
            (key, entry)
        })
        .collect();

    let next = ScanCache::from_entries(entries);
    next.save(Path::new(cache_path));
    next.events_deduped()
}
