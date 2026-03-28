/**
 * GnOllama – preferences window
 *
 * Shown when the user clicks "Settings" in the dropdown or opens the extension
 * settings from GNOME Extensions.
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.gnollama';

// resource:///org/gnome/shell/extensions/prefs.js was introduced in GNOME Shell
// 45.  On GNOME Shell 44 the resource doesn't exist yet, which would cause a
// fatal ImportError if we used a static import.  Use a dynamic import with a
// minimal fallback so the preferences window still opens on GNOME Shell 44.
let ExtensionPreferences, _ = s => s;
try {
    ({ExtensionPreferences, gettext: _} =
        await import('resource:///org/gnome/shell/extensions/prefs.js'));
} catch (_e) {
    ExtensionPreferences = class {
        getSettings() {
            return Gio.Settings.new(SETTINGS_SCHEMA);
        }
    };
}

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
        // Use ActionRow + SpinButton instead of SpinRow: Adw.SpinRow requires
        // libadwaita 1.4 (GNOME 45+) and is not available on GNOME 44.
        const intervalRow = new Adw.ActionRow({
            title: _('Poll Interval'),
            subtitle: _('Seconds between status checks (5 – 300)'),
        });
        const spinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 300,
                step_increment: 5,
                page_increment: 30,
                value: settings.get_int('poll-interval'),
            }),
            valign: Gtk.Align.CENTER,
        });
        settings.bind(
            'poll-interval',
            spinButton,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        intervalRow.add_suffix(spinButton);
        intervalRow.activatable_widget = spinButton;
        pollingGroup.add(intervalRow);
    }
}
