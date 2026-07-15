// The Axis-2 usage GET runs here in native Rust, not in the webview: the
// Anthropic org blocks browser-origin (CORS) requests outright, and a native
// reqwest call carries no Origin header so it is not treated as one. The token
// is passed in from the JS credentials reader; nothing is persisted here.

mod scan;

#[derive(serde::Serialize)]
struct UsageProbe {
  ok: bool,
  status: u16,
  body: String,
}

#[tauri::command]
async fn fetch_usage(token: String) -> Result<UsageProbe, String> {
  let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(5))
    .build()
    .map_err(|e| e.to_string())?;
  let res = client
    .get("https://api.anthropic.com/api/oauth/usage")
    .header("Authorization", format!("Bearer {token}"))
    .header("anthropic-beta", "oauth-2025-04-20")
    .header("User-Agent", "claude-code/2.1.81")
    .send()
    .await
    .map_err(|e| e.to_string())?;
  let status = res.status().as_u16();
  let body = res.text().await.unwrap_or_default();
  Ok(UsageProbe {
    ok: (200..300).contains(&status),
    status,
    body,
  })
}

// Axis-1's local scan. Discovering and parsing every transcript is too heavy to
// do across the JS bridge, so it runs natively — see `scan`. `spawn_blocking`
// keeps the fs + parse work off the async runtime so the UI stays responsive.
#[tauri::command]
async fn scan_events(
    root: String,
    cache_path: String,
    since_ms: i64,
) -> Result<Vec<scan::event::UsageEvent>, String> {
    tauri::async_runtime::spawn_blocking(move || scan::run(&root, &cache_path, since_ms))
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_decorum::init())
    .invoke_handler(tauri::generate_handler![fetch_usage, scan_events])
    .setup(|app| {
      #[cfg(desktop)]
      {
        app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
        app.handle().plugin(tauri_plugin_process::init())?;
      }

      // Inset the macOS traffic lights so they clear the rounded window corner.
      #[cfg(target_os = "macos")]
      {
        use tauri::Manager;
        use tauri_plugin_decorum::WebviewWindowExt;
        let main = app.get_webview_window("main").unwrap();
        main.set_traffic_lights_inset(16.0, 20.0).unwrap();
      }
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
