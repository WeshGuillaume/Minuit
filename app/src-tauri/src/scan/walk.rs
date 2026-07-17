//! Discover Claude transcripts under `~/.claude/projects/**`.
//!
//! We only need each file's path and two stats: the mtime (so the cache can skip
//! files that haven't changed, and the caller can ignore files untouched since
//! the lookback horizon) and the size (a cheap second signal that content moved).

use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

/// A discovered transcript and the two stats the cache keys on.
pub struct FileMeta {
    pub path: PathBuf,
    pub mtime_ms: i64,
    pub size: u64,
}

/// Recursively collect every `.jsonl` file under `root`. Any unreadable entry
/// (permissions, a race with a delete) is silently skipped: discovery must
/// never fail the whole scan over one bad directory.
pub fn list_transcripts(root: &Path) -> Vec<FileMeta> {
    let mut out = Vec::new();
    collect(root, &mut out);
    out
}

fn collect(dir: &Path, out: &mut Vec<FileMeta>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if file_type.is_dir() {
            collect(&path, out);
        } else if is_jsonl(&path) {
            if let Some(meta) = read_meta(path) {
                out.push(meta);
            }
        }
    }
}

fn is_jsonl(path: &Path) -> bool {
    path.extension().is_some_and(|ext| ext == "jsonl")
}

fn read_meta(path: PathBuf) -> Option<FileMeta> {
    let meta = fs::metadata(&path).ok()?;
    let mtime_ms = meta
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_millis() as i64;
    Some(FileMeta {
        path,
        mtime_ms,
        size: meta.len(),
    })
}
