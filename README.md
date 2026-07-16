<div align="center">

<img src="assets/logo.png" alt="Minuit" width="120" height="120" />

# Minuit

**A speedometer for your Claude Code usage. Find your token-maxxing sweet spot at a glance.**

[![Download](https://img.shields.io/github/downloads/WeshGuillaume/minuit/total?style=for-the-badge&label=downloads&color=22c55e)](https://github.com/WeshGuillaume/minuit/releases)
[![Latest release](https://img.shields.io/github/v/release/WeshGuillaume/minuit?style=for-the-badge&color=3b82f6)](https://github.com/WeshGuillaume/minuit/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-orange.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/WeshGuillaume/minuit/releases/latest)

</div>

Minuit reads your real Claude Code usage and answers one question fast: at what
speed are you spending, compared to the speed that empties your cap right at
reset?

It shows a `pace` value instead of a level. `pace = your rate ÷ the sustainable
rate`, so `1.0×` is the sweet spot where you extract the most value without
slamming into the wall. Under `1.0×` you are underfarming, leaving compute you
paid for on the table. Over it you are redlining, and you will cap out before
the window resets.

You pay a flat monthly cap. Every hour spent below the sustainable rate is
capacity you bought and never touched. Every hour above it brings the wall
closer. Minuit draws that line and helps you ride it.

<div align="center">

<img src="assets/weekly-maxxing.png" alt="Minuit weekly view at maxxing" width="340" />

</div>

## Features

- **Pace speedometer.** A live needle showing your burn rate against the rate
  that grazes the cap at reset. `1.0×` is the target.
- **Named zones.** `Underfarming`, `Coasting`, `Maxxing`, `Redlining`,
  `Way Too Fast`, `Capped`. Where you stand, no spreadsheet math.
- **Habit ghost.** A marker for where your habitual rhythm would land, so you
  can see when the current session deviates from your usual pace.
- **Raw usage bar.** The exact percentage that `/usage` reports, sitting under
  the dial as a reality anchor.
- **Two windows.** Flip between the weekly cap and the 5-hour rolling window.
- **Reactive.** Pace recomputes every 15 seconds off a local incremental scan
  of your Claude Code logs. The needle climbs the moment you sprint.
- **Fully local.** Reads your usage read-only from disk. No account, no
  telemetry, nothing leaves your machine.

<div align="center">

<img src="assets/way-too-fast.png" alt="Minuit in the Way Too Fast zone" width="640" />

<em>Over the sustainable rate: you will slam the cap with hours still on the clock.</em>

</div>

<table>
<tr>
<td width="50%" align="center">
<img src="assets/compact.png" alt="Minuit compact window" width="260" /><br/>
<em>Compact window</em>
</td>
<td width="50%" align="center">
<img src="assets/mini.png" alt="Minuit mini dial" width="180" /><br/>
<em>Mini dial, shrunk to a menubar glance</em>
</td>
</tr>
</table>

## Install

Grab the latest signed build from the
**[releases page](https://github.com/WeshGuillaume/minuit/releases/latest)**.

1. Download the `.dmg` for macOS.
2. Open it and drag **Minuit** into `Applications`.
3. Launch it. Minuit picks up your existing Claude Code usage automatically,
   with no sign-in and no setup.

Minuit ships with an over-the-air updater, so once installed it keeps itself
current.

Currently macOS only. The app is a lightweight [Tauri](https://tauri.app) build
(Rust plus web), so Windows and Linux support is feasible and contributions are
welcome.

## Install from source

**Prerequisites:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org),
[pnpm](https://pnpm.io), and the
[Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
# 1. Clone
git clone https://github.com/WeshGuillaume/minuit.git
cd minuit/app

# 2. Install dependencies
pnpm install

# 3. Run in dev mode with hot reload
pnpm tauri dev

# 4. Or build a release bundle (.dmg / .app)
pnpm tauri build
```

The bundled app lands in `app/src-tauri/target/release/bundle/`.

### Handy scripts

| Command          | What it does                        |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Run the web frontend only (browser) |
| `pnpm tauri dev` | Run the full native app             |
| `pnpm build`     | Build the frontend                  |
| `pnpm typecheck` | TypeScript project check            |
| `pnpm test`      | Run the unit tests (Vitest)         |
| `pnpm lint`      | Lint and format check (Biome)       |

## Configuration

Window size and behavior are read from `~/.minuit/config.json` at launch.
Minuit writes a default file the first time it runs, so you can just edit it.
Settings apply on the next start (there is no live reload).

```json
{
  "width": 80,
  "height": 80,
  "trafficLights": false,
  "alwaysOnTop": true,
  "closeOnEsc": false,
  "closeOnClickOutside": false,
  "appearShortcut": "Cmd+Shift+8",
  "showInDock": false
}
```

| Field                  | What it does                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `width` / `height`     | Logical window size at launch. Small values give you the mini dial.                 |
| `trafficLights`        | Show the macOS red/yellow/green window buttons.                                     |
| `alwaysOnTop`          | Keep the window floating above other windows.                                       |
| `closeOnEsc`           | Hide the window when you press Escape.                                               |
| `closeOnClickOutside`  | Hide the window when it loses focus.                                                 |
| `appearShortcut`       | Global hotkey that toggles the window, for example `Cmd+Shift+8`. Omit to unbind.   |
| `showInDock`           | Show Minuit in the Dock and Cmd+Tab switcher. Set to `false` for a background app.  |

The config above is a menubar-style setup: a tiny always-on-top dial, no Dock
icon, no traffic lights, summoned with `Cmd+Shift+8`.

## Contributing

Issues and PRs are welcome, especially Windows and Linux support. The codebase
is strictly typed, split into small files, and test-covered. See
[`CLAUDE.md`](CLAUDE.md) for the architecture and conventions.

## License

[GPL-3.0](LICENSE) © Guillaume Badi
