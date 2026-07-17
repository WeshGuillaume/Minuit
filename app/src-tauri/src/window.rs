// Applies `Config` to the main window at launch, and the toggle used by the
// global shortcut. macOS-specific bits (traffic lights, Dock/Cmd+Tab presence)
// are guarded; other platforms just skip them. Concrete (default-runtime) types
// throughout, since decorum's extension trait is only implemented for those.

use crate::config::Config;
use tauri::{AppHandle, LogicalSize, Manager, WebviewWindow};

pub fn apply(app: &AppHandle, win: &WebviewWindow, cfg: &Config) {
  let _ = win.set_size(LogicalSize::new(cfg.width, cfg.height));
  let _ = win.set_always_on_top(cfg.always_on_top);
  set_dock_visible(app, cfg.show_in_dock);
  set_traffic_lights(win, cfg.traffic_lights);
}

/// Show/hide via the app activation policy: Accessory removes the app from both
/// the Dock and the Cmd+Tab switcher; Regular restores it.
#[cfg(target_os = "macos")]
fn set_dock_visible(app: &AppHandle, visible: bool) {
  use tauri::ActivationPolicy::{Accessory, Regular};
  let _ = app.set_activation_policy(if visible { Regular } else { Accessory });
}

#[cfg(not(target_os = "macos"))]
fn set_dock_visible(_app: &AppHandle, _visible: bool) {}

#[cfg(target_os = "macos")]
fn set_traffic_lights(win: &WebviewWindow, visible: bool) {
  use tauri_plugin_decorum::WebviewWindowExt;
  if visible {
    let _ = win.set_traffic_lights_inset(16.0, 20.0);
    return;
  }
  use cocoa::appkit::{NSWindow, NSWindowButton};
  use objc::{msg_send, sel, sel_impl};
  let Ok(handle) = win.ns_window() else { return };
  let ns_window = handle as cocoa::base::id;
  let buttons = [
    NSWindowButton::NSWindowCloseButton,
    NSWindowButton::NSWindowMiniaturizeButton,
    NSWindowButton::NSWindowZoomButton,
  ];
  unsafe {
    for kind in buttons {
      let button = ns_window.standardWindowButton_(kind);
      let _: () = msg_send![button, setHidden: true];
    }
  }
}

#[cfg(not(target_os = "macos"))]
fn set_traffic_lights(_win: &WebviewWindow, _visible: bool) {}

/// Global-shortcut behaviour: hide when already frontmost, otherwise surface and
/// focus. `unminimize` covers the case where it was minimised rather than hidden.
pub fn toggle(app: &AppHandle) {
  let Some(win) = app.get_webview_window("main") else { return };
  let frontmost = win.is_visible().unwrap_or(false) && win.is_focused().unwrap_or(false);
  if frontmost {
    let _ = win.hide();
  } else {
    let _ = win.unminimize();
    let _ = win.show();
    let _ = win.set_focus();
  }
}
