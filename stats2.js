import Gio from "gi://Gio";

const SETTINGS_SCHEMA = "org.gnome.shell.extensions.stopwatch";

function getExtensionSettings() {
    // Try to load schema from the extension's local schemas directory using this file's URL
    try {
        const thisFile = Gio.File.new_for_uri(import.meta.url);
        const extensionDir = thisFile.get_parent();
        const schemaDir = extensionDir.get_child("schemas");
        if (schemaDir && schemaDir.query_exists(null)) {
            const schemaSource = Gio.SettingsSchemaSource.newFromDirectory(
                schemaDir.get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false
            );
            const schemaObj = schemaSource.lookup(SETTINGS_SCHEMA, true);
            if (schemaObj) {
                return new Gio.Settings({ settings_schema: schemaObj });
            }
        }
    } catch (_e) {
        // fall through
    }

    // Fallback to global schema lookup if installed there
    return new Gio.Settings({ schema_id: SETTINGS_SCHEMA });
}

export class StatsManager {
    constructor() {
        try {
            this._settings = getExtensionSettings();
            this._stats = this._loadStats();
        } catch (e) {
            log(`StatsManager constructor error: ${e.message}\n${e.stack}`);
            this._stats = {};
        }
    }

    _loadStats() {
        const statsJson = this._settings.get_string("stats");
        try {
            return JSON.parse(statsJson) || {};
        } catch (e) {
            return {};
        }
    }

    _saveStats() {
        this._settings.set_string("stats", JSON.stringify(this._stats));
    }

    addSession(duration) {
        const today = new Date().toISOString().split("T")[0];
        if (!this._stats[today]) {
            this._stats[today] = 0;
        }
        this._stats[today] += duration;
        this._saveStats();
    }

    clear() {
        this._stats = {};
        this._saveStats();
    }

    getStats(days = 365) {
        const stats = {};
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            stats[dateStr] = this._stats[dateStr] || 0;
        }

        return stats;
    }

    getTotalTime() {
        return Object.values(this._stats).reduce((sum, time) => sum + time, 0);
    }

    getAverageTime(days = 7) {
        const stats = this.getStats(days);
        const nonZeroDays = Object.values(stats).filter((time) => time > 0).length;
        if (nonZeroDays === 0) return 0;
        return Object.values(stats).reduce((sum, time) => sum + time, 0) / nonZeroDays;
    }

    getMaxDay(days = 365) {
        const stats = this.getStats(days);
        let maxTime = 0;
        let maxDate = null;
        for (const [date, time] of Object.entries(stats)) {
            if (time > maxTime) {
                maxTime = time;
                maxDate = date;
            }
        }
        return { date: maxDate, time: maxTime };
    }
}
