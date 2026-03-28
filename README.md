# GnOllama

A GNOME Shell extension (GNOME 45 – 50) that monitors a local or remote
[Ollama](https://ollama.ai) server and lets you manage loaded models from the
top panel.

---

## Features

| Icon colour | Meaning |
|-------------|---------|
| 🔴 **Red**    | Server is offline or unreachable |
| 🟠 **Orange** | Server is running but no models are loaded |
| 🟢 **Green**  | One or more models are actively loaded in memory |

Clicking the panel icon opens a dropdown that:

- Shows the current status message.
- Lists every loaded model with an **Unload** action that evicts it from RAM
  (via `POST /api/generate` with `keep_alive: 0`).
- Provides **Refresh** (poll immediately) and **Settings** entries.

---

## Requirements

- GNOME Shell 45 – 50
- A running [Ollama](https://github.com/ollama/ollama) instance
  (default: `http://localhost:11434`)

---

## Installation

### Manual (recommended for development)

```bash
# 1. Clone the repo
git clone https://github.com/kerozoli/GnOllama.git
cd GnOllama

# 2. Install
make install

# 3. Restart GNOME Shell
#    X11:    Alt+F2 → type 'r' → Enter
#    Wayland: log out and log back in

# 4. Enable the extension
gnome-extensions enable gnollama@kerozoli.github.com
```

### From a zip (GNOME Extensions website style)

```bash
make pack          # creates gnollama@kerozoli.github.com.shell-extension.zip
gnome-extensions install gnollama@kerozoli.github.com.shell-extension.zip
```

---

## Configuration

Open **Settings** from the dropdown or run:

```bash
gnome-extensions prefs gnollama@kerozoli.github.com
```

| Setting | Default | Description |
|---------|---------|-------------|
| Server URL | `http://localhost:11434` | Base URL of the Ollama server |
| Poll Interval | `30` s | How often to query the server (5 – 300 s) |

---

## Development

```bash
# Re-compile GSettings schema after editing the XML
make compile-schemas

# Tail the GNOME Shell log for extension errors
journalctl -f -o cat GNOME_SHELL_EXTENSION_UUID=gnollama@kerozoli.github.com
# or
journalctl /usr/bin/gnome-shell -f | grep -i gnollama
```

---

## License

GNU General Public License v3.0 – see [LICENSE](LICENSE).
