// Runtime settings read from `~/.minuit/config.json` at launch. Absent or
// malformed file → defaults (the one legit fallback: an external, user-edited
// file). Everything here is applied once in `setup`; there is no live reload.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

/// Work schedule, read by the frontend (not the native side) to anchor the
/// sustainable-rate projection on active hours rather than the wall clock.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WorkConfig {
  /// Hours per day you actually work. 24 = round-the-clock (the neutral default,
  /// identical to the old behaviour); lower means the headroom is spread over
  /// your working hours, so the maxxing rate reflects real sessions.
  pub hours_per_day: f64,
}

impl Default for WorkConfig {
  fn default() -> Self {
    Self { hours_per_day: 24.0 }
  }
}

/// Dial-axis display, read by the frontend. "broken" = the fixed pace track
/// (maxxing reads big and central); "linear" = a straight, true-proportion axis.
/// Kept as strings so a typo can't break the whole (native-side) config parse.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DisplayConfig {
  /// Pace dial: "broken" or "linear".
  pub pace_axis: String,
  /// tok/h dial: "broken" or "linear".
  pub token_axis: String,
}

impl Default for DisplayConfig {
  fn default() -> Self {
    Self {
      pace_axis: "broken".into(),
      token_axis: "linear".into(),
    }
  }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
  /// Logical window size at launch.
  pub width: f64,
  pub height: f64,
  /// macOS red/yellow/green window buttons.
  pub traffic_lights: bool,
  pub always_on_top: bool,
  /// Hide the window on Escape.
  pub close_on_esc: bool,
  /// Hide the window when it loses focus.
  pub close_on_click_outside: bool,
  /// Global hotkey that toggles the window, e.g. "Cmd+Shift+M". None → unbound.
  pub appear_shortcut: Option<String>,
  /// Show in the Dock and the Cmd+Tab switcher (Regular vs. Accessory app).
  pub show_in_dock: bool,
  /// Frontend-only work schedule (see WorkConfig); carried here so the
  /// auto-written template documents it. The native side never reads it.
  pub work: WorkConfig,
  /// Frontend-only dial-axis display (see DisplayConfig).
  pub display: DisplayConfig,
}

impl Default for Config {
  fn default() -> Self {
    Self {
      width: 330.0,
      height: 467.0,
      traffic_lights: true,
      always_on_top: false,
      close_on_esc: true,
      close_on_click_outside: false,
      appear_shortcut: None,
      show_in_dock: true,
      work: WorkConfig::default(),
      display: DisplayConfig::default(),
    }
  }
}

/// Reads `~/.minuit/config.json`, writing a default file the first time it is
/// absent so the user has a template to edit. A malformed file is left untouched
/// (we never clobber hand-edits) and we fall back to defaults in memory.
pub fn load<R: Runtime>(app: &AppHandle<R>) -> Config {
  let Ok(home) = app.path().home_dir() else {
    return Config::default();
  };
  let path = home.join(".minuit/config.json");

  match std::fs::read_to_string(&path) {
    Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
    Err(_) => {
      let cfg = Config::default();
      let _ = std::fs::create_dir_all(home.join(".minuit"));
      if let Ok(json) = serde_json::to_string_pretty(&cfg) {
        let _ = std::fs::write(&path, json + "\n");
      }
      cfg
    }
  }
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> Config {
  load(&app)
}
