/**
 * GnOllama – GNOME Shell extension
 *
 * Monitors an Ollama server and shows a coloured llama icon in the panel:
 *   🔴 red    – server offline / unreachable
 *   🟠 orange – server online but no models loaded
 *   🟢 green  – one or more models actively loaded
 *
 * Clicking the icon opens a dropdown that lists loaded models (each with an
 * "Unload" action), plus Refresh and Settings entries.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Soup from 'gi://Soup';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

/** Possible server-state values used internally. */
const Status = Object.freeze({
    OFFLINE: 'offline',
    IDLE: 'idle',
    ACTIVE: 'active',
});

// ---------------------------------------------------------------------------

const OllamaIndicator = GObject.registerClass(
class OllamaIndicator extends PanelMenu.Button {

    _init(extension) {
        super._init(0.0, _('GnOllama'));

        this._extension = extension;
        this._settings = extension.getSettings();
        this._status = null;          // force first _setStatus() to update UI
        this._runningModels = [];
        this._timeoutId = null;

        // HTTP session with a short connect/read timeout so offline polls fail fast
        this._httpSession = new Soup.Session();
        this._httpSession.timeout = 5;

        // Cancellable shared by all in-flight requests; cancelled on destroy()
        this._cancellable = new Gio.Cancellable();

        // Panel icon – starts with the "offline" (red) llama
        this._icon = new St.Icon({
            gicon: this._iconForStatus(Status.OFFLINE),
            icon_size: 16,
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        // Initial poll + start the repeating timer
        this._startPolling();

        // React to settings changes
        this._settingsChangedId = this._settings.connect('changed', (_s, key) => {
            if (key === 'server-url' || key === 'poll-interval')
                this._restartPolling();
        });
    }

    // ── Polling ─────────────────────────────────────────────────────────────

    _startPolling() {
        this._poll();
        const interval = this._settings.get_int('poll-interval');
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            interval,
            () => {
                this._poll();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _restartPolling() {
        if (this._timeoutId !== null) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        this._startPolling();
    }

    _poll() {
        const url = this._settings.get_string('server-url');
        this._fetchStatus(url).catch(e => {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                console.error(`[GnOllama] poll error: ${e.message}`);
        });
    }

    async _fetchStatus(url) {
        try {
            // A successful GET /api/tags proves the server is reachable
            await this._httpGet(`${url}/api/tags`);

            // GET /api/ps lists currently-loaded models
            const psData = await this._httpGet(`${url}/api/ps`);
            const models = psData.models ?? [];

            this._runningModels = models;
            this._setStatus(models.length > 0 ? Status.ACTIVE : Status.IDLE);
        } catch (_e) {
            this._runningModels = [];
            this._setStatus(Status.OFFLINE);
        }
    }

    // ── HTTP helpers ─────────────────────────────────────────────────────────

    _httpGet(url) {
        return new Promise((resolve, reject) => {
            const message = Soup.Message.new('GET', url);
            if (!message) {
                reject(new Error(`Invalid URL: ${url}`));
                return;
            }

            this._httpSession.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                this._cancellable,
                (session, result) => {
                    try {
                        const bytes = session.send_and_read_finish(result);
                        const httpStatus = message.get_status();
                        if (httpStatus < 200 || httpStatus >= 300) {
                            reject(new Error(`HTTP ${httpStatus}`));
                            return;
                        }
                        const data = bytes.get_data();
                        resolve(data ? JSON.parse(new TextDecoder().decode(data)) : {});
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });
    }

    _httpPost(url, payload) {
        return new Promise((resolve, reject) => {
            const message = Soup.Message.new('POST', url);
            if (!message) {
                reject(new Error(`Invalid URL: ${url}`));
                return;
            }

            const encoded = new TextEncoder().encode(JSON.stringify(payload));
            message.set_request_body_from_bytes(
                'application/json',
                new GLib.Bytes(encoded)
            );

            this._httpSession.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                this._cancellable,
                (session, result) => {
                    try {
                        resolve(session.send_and_read_finish(result));
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });
    }

    // ── Status / icon ────────────────────────────────────────────────────────

    _iconForStatus(status) {
        return Gio.icon_new_for_string(
            `${this._extension.path}/icons/gnollama-${status}.svg`
        );
    }

    _setStatus(status) {
        if (this._status === status)
            return;

        this._status = status;
        this._icon.gicon = this._iconForStatus(status);
        this._updateMenu();
    }

    // ── Popup menu ───────────────────────────────────────────────────────────

    _updateMenu() {
        this.menu.removeAll();

        switch (this._status) {
        case Status.OFFLINE: {
            const item = new PopupMenu.PopupMenuItem(_('Ollama server is offline'));
            item.sensitive = false;
            this.menu.addMenuItem(item);
            break;
        }

        case Status.IDLE: {
            const item = new PopupMenu.PopupMenuItem(_('Server online — no models loaded'));
            item.sensitive = false;
            this.menu.addMenuItem(item);
            break;
        }

        case Status.ACTIVE:
            if (this._runningModels.length > 0) {
                const header = new PopupMenu.PopupMenuItem(_('Loaded models'));
                header.sensitive = false;
                this.menu.addMenuItem(header);

                for (const model of this._runningModels) {
                    const item = new PopupMenu.PopupMenuItem(
                        `${_('Unload')}: ${model.name}`
                    );
                    item.connect('activate', () => this._unloadModel(model.name));
                    this.menu.addMenuItem(item);
                }
            }
            break;
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh'));
        refreshItem.connect('activate', () => this._poll());
        this.menu.addMenuItem(refreshItem);

        const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
        settingsItem.connect('activate', () => this._extension.openPreferences());
        this.menu.addMenuItem(settingsItem);
    }

    // ── Model management ─────────────────────────────────────────────────────

    async _unloadModel(modelName) {
        const url = this._settings.get_string('server-url');
        try {
            // Sending keep_alive: 0 tells Ollama to immediately evict the model
            await this._httpPost(`${url}/api/generate`, {
                model: modelName,
                keep_alive: 0,
                stream: false,
                prompt: '',
            });
        } catch (e) {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                console.error(`[GnOllama] failed to unload "${modelName}": ${e.message}`);
        }
        this._poll();
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    destroy() {
        this._cancellable.cancel();

        if (this._timeoutId !== null) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        super.destroy();
    }
});

// ---------------------------------------------------------------------------

export default class GnOllamaExtension extends Extension {
    enable() {
        this._indicator = new OllamaIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
