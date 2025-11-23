import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class StopwatchPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        // Create a preferences group for timer settings
        const timerGroup = new Adw.PreferencesGroup({
            title: 'Timer Settings',
            description: 'Configure how the stopwatch behaves',
        });
        page.add(timerGroup);

        // Add persistence toggle
        const persistRow = new Adw.SwitchRow({
            title: 'Persist Across Logouts/Restarts',
            subtitle: 'Save and restore the timer state when you log out or restart',
        });
        
        // Bind the switch to the settings
        this.getSettings().bind(
            'persist-timer',
            persistRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        timerGroup.add(persistRow);

        // Add informational group
        const infoGroup = new Adw.PreferencesGroup({
            title: 'About',
        });
        page.add(infoGroup);

        const infoRow = new Adw.ActionRow({
            title: 'Stopwatch Extension',
            subtitle: 'Track your focus time with a simple stopwatch',
        });
        infoGroup.add(infoRow);
    }
}
