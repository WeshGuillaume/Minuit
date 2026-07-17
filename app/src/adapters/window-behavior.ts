// Reactive window behaviour that must live in the webview: Escape-to-hide (a
// keyboard event) and hide-on-blur (a focus event). Both read the same
// `~/.minuit/config.json` the Rust side applies at launch, exposed via the
// `get_config` command. Size / always-on-top / Dock / traffic lights are
// applied natively at startup instead; see src-tauri/src/window.rs.

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface RuntimeConfig {
  closeOnEsc: boolean;
  closeOnClickOutside: boolean;
}

export const installWindowBehavior = async (): Promise<void> => {
  const cfg = await invoke<RuntimeConfig>("get_config");
  const win = getCurrentWindow();

  if (cfg.closeOnEsc) {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") void win.hide();
    });
  }

  if (cfg.closeOnClickOutside) {
    void win.onFocusChanged(({ payload: focused }) => {
      if (!focused) void win.hide();
    });
  }
};
