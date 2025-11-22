export class StatsManager {
    constructor(settings) {
        try {
            if (!settings) {
                throw new Error("StatsManager requires a Gio.Settings instance");
            }
            this._settings = settings;
            this._stats = this._loadStats();
        } catch (e) {
            console.error(`StatsManager constructor error: ${e.message}\n${e.stack}`);
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

    addSession(duration, date = null) {
        const sessionDate = date || new Date();
        const dateStr = sessionDate.toISOString().split("T")[0];
        if (!this._stats[dateStr]) {
            this._stats[dateStr] = 0;
        }
        this._stats[dateStr] += duration;
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
