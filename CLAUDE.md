# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GnOllama is a GNOME Shell extension (GNOME 45–50) that monitors a local or remote Ollama server from the top panel. The icon color indicates server status: red (offline), orange (online, no models), green (models loaded).

## Build & Development Commands

```bash
# Compile GSettings schema (required before install/pack)
make compile-schemas

# Install extension to user directory
make install

# Uninstall extension
make uninstall

# Create distributable zip
make pack

# Clean build artifacts
make clean
```

## Testing & Debugging

```bash
# Watch extension logs (X11)
journalctl -f -o cat GNOME_SHELL_EXTENSION_UUID=gnollama@kerozoli.github.com

# Watch extension logs (Wayland/alternative)
journalctl /usr/bin/gnome-shell -f | grep -i gnollama

# Restart GNOME Shell
# X11: Alt+F2 → 'r' → Enter
# Wayland: log out and back in

# Enable extension after install
gnome-extensions enable gnollama@kerozoli.github.com

# Open preferences
gnome-extensions prefs gnollama@kerozoli.github.com
```

## Architecture

- **extension.js** – Main extension logic using `PanelMenu.Button` for the status icon. Polls Ollama's `/api/tags` and `/api/ps` endpoints to determine server state. Manages a popup menu with model unload actions.
- **prefs.js** – Preferences UI using libadwaita (`Adw.PreferencesWindow`). Binds settings to UI controls via `Gio.Settings.bind()`.
- **schemas/*.gschema.xml** – GSettings schema defining `server-url` (string) and `poll-interval` (int, 5–300s).

### Key Patterns

- State machine tracks `Status.OFFLINE`, `Status.IDLE`, `Status.ACTIVE` based on API responses.
- Model unloading uses `POST /api/generate` with `keep_alive: 0` to evict models.
- HTTP requests use `Soup.Session` with 5-second timeout; cancellable via `Gio.Cancellable`.
- Settings changes trigger `_restartPolling()` to apply new interval/url immediately.

### Extension Entry Points

- `enable()` – Creates indicator, adds to panel status area.
- `disable()` – Destroys indicator and cleans up resources.
- `fillPreferencesWindow()` – Populates the settings window (prefs.js).
