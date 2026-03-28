/**
 * GnOllama – preferences window
 *
 * Shown when the user clicks "Settings" in the dropdown or opens the extension
 * settings from GNOME Extensions.
 *
 * Requires GNOME Shell 45+ (libadwaita 1.4+).
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/shell/extensions/prefs.js';

export default class GnOllamaPreferences extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        window.set_default_size(640, 360);

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        // ── Server group ────────────────────────────────────────────────────
        const serverGroup = new Adw.PreferencesGroup({
            title: _('Server'),
            description: _('Configure the Ollama server connection.'),
        });
        page.add(serverGroup);

        // Server URL
        const urlRow = new Adw.EntryRow({title: _('Server URL')});
        settings.bind('server-url', urlRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        serverGroup.add(urlRow);

        // ── Polling group ───────────────────────────────────────────────────
        const pollingGroup = new Adw.PreferencesGroup({
            title: _('Polling'),
            description: _('How often the extension queries the server.'),
        });
        page.add(pollingGroup);

        // Poll interval (5 – 300 seconds)
        // Adw.SpinRow is available since libadwaita 1.4 (GNOME 45+).
        const intervalRow = new Adw.SpinRow({
            title: _('Poll Interval'),
            subtitle: _('Seconds between status checks (5 – 300)'),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 300,
                step_increment: 5,
                page_increment: 30,
                value: settings.get_int('poll-interval'),
            }),
        });
        settings.bind('poll-interval', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        pollingGroup.add(intervalRow);
    }
}
