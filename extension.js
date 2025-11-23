/** extension.js
 * MIT License
 * Copyright © 2023 Arvind Parekh
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * SPDX-License-Identifier: MIT
 */

/**
Debug with:
dbus-run-session -- gnome-shell --nested --wayland
*/

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Misc from './misc.js';
import * as Timer from './timer.js';
import { StatsManager } from './stats2.js';
import { StatsView } from './statsView.js';

// Timer persistence is now handled via GSettings (see persist-timer setting)

const Indicator = GObject.registerClass(class Indicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.0, 'Stopwatch Indicator', false); // Don't toggle menu on click

        this._settings = settings;
        this.timer = new Timer.Timer();
        this.statsManager = new StatsManager(this._settings);

        this._label = new St.Label({
            text: Misc.formatTime(this.timer.elapsedTime),
            y_align: Clutter.ActorAlign.CENTER, style_class: 'paused'
        });
        this.add_child(this._label);
        
        // Make label reactive to receive events
        this._label.reactive = true;


        // Create menu
        this.menu.box.add_child(new PopupMenu.PopupSeparatorMenuItem());
        this.statsView = new StatsView(this.statsManager);
        this.menu.box.add_child(this.statsView);

        // Action items
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const resetItem = new PopupMenu.PopupMenuItem('Reset stopwatch');
        resetItem.connect('activate', () => {
            this._reset();
        });
        this.menu.addMenuItem(resetItem);

        const clearStatsItem = new PopupMenu.PopupMenuItem('Clear stats');
        clearStatsItem.connect('activate', () => {
            if (this.statsManager && this.statsManager.clear) {
                this.statsManager.clear();
                if (this.statsView) this.statsView.update();
            }
        });
        this.menu.addMenuItem(clearStatsItem);

        // Refresh stats when menu opens
        this._menuHandlerId = this.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen && this.statsView) {
                this.statsView.update();
            }
        });

        
        // Connect to label's button events
        this._labelHandlerId = this._label.connect('button-press-event', (actor, event) => {
            const button = event.get_button();
            
            if (button === 1) { // Left click: toggle start/pause
                if (this.timer.isRunning()) {
                    this._pause();
                } else {
                    this._startResume();
                }
                return Clutter.EVENT_STOP;
            } else if (button === 3) { // Right click: open menu
                this.menu.toggle();
                return Clutter.EVENT_STOP;
            }
            
            return Clutter.EVENT_PROPAGATE;
        });

        // Restore timer state if persistence is enabled
        // IMPORTANT: This must be called AFTER all UI elements are created
        this._restoreTimerState();
    }

    _startResume() {
        if (this.timer.isPaused()) {
            this.timer.resume();
        } else { // stopped
            this.timer.start();
        }

        if (this.timeout) {
            GLib.source_remove(this.timeout);
            this.timeout = null;
        }

        this.timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,      // priority of the source
            1,                          // seconds to wait
            () => {                     // the callback to invoke
                if (!this._label || this._label._disposed) {
                    return false; // Stop the timeout
                }
                this.timer.updateElapsedTime();
                this._updateLabel();
                
                // Periodically save state while running (every 5 seconds)
                const now = Date.now();
                if (!this._lastSaveTime || (now - this._lastSaveTime) >= 5000) {
                    this._saveTimerState();
                    this._lastSaveTime = now;
                }

                return true;
            });

        this._label.set_style_class_name('normal');
    }

    _pause() {
        this.timer.pause();
        this._label.set_style_class_name('paused');
        
        // Save timer state when pausing
        this._saveTimerState();
    }

    _reset() {
        // Save the session time before resetting
        if (this.timer.elapsedTime > 0) {
            this.statsManager.addSession(this.timer.elapsedTime, this.timer.startTime);
            this.statsView.update();
        }

        this.timer.stop();
        this._updateLabel();
        this._label.set_style_class_name('paused');
        
        // Clear persisted timer state
        this._clearTimerState();
        this._lastSaveTime = null;

        if (this.timeout) {
            GLib.source_remove(this.timeout);
            this.timeout = null;
        }
    }

    // Updates the timer-label with the current time left.
    _updateLabel() {
        if (this._label && !this._label._disposed) {
            this._label.set_text(Misc.formatTime(this.timer.elapsedTime));
        }
    }

    _restoreTimerState() {
        // Debug: Check if we can read the persist-timer setting
        const persistEnabled = this._settings.get_boolean('persist-timer');
        console.log(`[Stopwatch] persist-timer setting: ${persistEnabled}`);
        
        // Only restore if persistence is enabled
        if (!persistEnabled) {
            console.log('[Stopwatch] Persistence disabled, skipping restore');
            return;
        }

        const savedElapsedTime = this._settings.get_double('elapsed-time');
        const wasRunning = this._settings.get_boolean('was-running');
        const startTimestamp = this._settings.get_int64('start-timestamp');
        
        console.log(`[Stopwatch] Restoring state: elapsed=${savedElapsedTime}s, wasRunning=${wasRunning}, startTime=${startTimestamp}`);

        if (savedElapsedTime > 0) {
            this.timer.setElapsedTime(savedElapsedTime);
            if (startTimestamp > 0) {
                this.timer.startTime = new Date(startTimestamp);
            }
            // Set lastUpdate to current time before pausing
            // This ensures the timer has a valid reference point
            this.timer.lastUpdate = this.timer.getTimeNow();
            this.timer.state = 'Paused';  // Set state directly instead of calling pause()
            this._updateLabel();

            if (wasRunning) {
                console.log('[Stopwatch] Timer was running, resuming...');
                this._startResume();
            }
        } else {
            console.log('[Stopwatch] No saved time to restore');
        }
    }

    _saveTimerState() {
        try {
            console.log('[Stopwatch] _saveTimerState() called');
            
            // Only save if persistence is enabled
            const persistEnabled = this._settings.get_boolean('persist-timer');
            console.log(`[Stopwatch] persist-timer = ${persistEnabled}`);
            
            if (!persistEnabled) {
                console.log('[Stopwatch] Persistence disabled, clearing state');
                this._clearTimerState();
                return;
            }

            console.log(`[Stopwatch] Saving state: elapsed=${this.timer.elapsedTime}s, running=${this.timer.isRunning()}, startTime=${this.timer.startTime?.getTime()}`);
            
            this._settings.set_double('elapsed-time', this.timer.elapsedTime);
            this._settings.set_boolean('was-running', this.timer.isRunning());
            
            if (this.timer.startTime) {
                this._settings.set_int64('start-timestamp', this.timer.startTime.getTime());
            }
            
            console.log('[Stopwatch] State saved successfully');
        } catch (error) {
            console.error(`[Stopwatch] Error saving timer state: ${error}`);
        }
    }

    _clearTimerState() {
        this._settings.set_double('elapsed-time', 0.0);
        this._settings.set_boolean('was-running', false);
        this._settings.set_int64('start-timestamp', 0);
    }

    destroy() {
        console.log('[Stopwatch] destroy() called');
        
        // Save timer state if persistence is enabled
        this._saveTimerState();

        if (this.timeout) {
            GLib.source_remove(this.timeout);
            this.timeout = null;
        }

        // Disconnect all signal connections
        if (this._labelHandlerId) {
            this._label.disconnect(this._labelHandlerId);
            this._labelHandlerId = null;
        }

        if (this._menuHandlerId) {
            this.menu.disconnect(this._menuHandlerId);
            this._menuHandlerId = null;
        }

        // Clean up stats view
        if (this.statsView) {
            this.statsView.destroy();
            this.statsView = null;
        }

        // Clean up stats manager
        if (this.statsManager) {
            this.statsManager = null;
        }

        // Clean up timer
        if (this.timer) {
            this.timer = null;
        }

        if (this._label) {
            this._label.destroy();
            this._label = null;
        }

        super.destroy();
    }
});

export default class Stopwatch extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new Indicator(this._settings);

        Main.panel.addToStatusArea(this.metadata.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }
}

