# GNOME Stopwatch Extension

A minimalist productivity-focused stopwatch extension for GNOME Shell that helps you track your focus time with visual statistics and a beautiful activity heatmap.

## Features

### Core Functionality
- **One-Click Timer Control**: Left-click to start/pause, right-click to open menu
- **Persistent Statistics**: Automatically tracks daily focus time across sessions
- **Activity Heatmap**: GitHub-style contribution graph showing your productivity over the year
- **Optional Persistence**: Choose whether to preserve timer state across logouts and restarts

### Visual Design
- **Modern UI**: Clean, dark-themed interface with smooth animations
- **Color-Coded Intensity**: 16-level gradient showing study duration (< 1 hour to 16+ hours)
- **Hover Details**: See exact date and duration for any day in the heatmap
- **Responsive Layout**: Horizontal scrolling for the full year view

### Statistics Dashboard
- **Total Focus Time**: Cumulative time across all sessions
- **7-Day Average**: Average daily focus time over the past week
- **Best Day**: Highlights your most productive day with date and duration

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/ArvindParekh/gnome-stopwatch.git
   cd gnome-stopwatch
   ```

2. Compile the GSettings schema:
   ```bash
   glib-compile-schemas schemas/
   ```

3. Copy to GNOME extensions directory:
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/stopwatch@arvind.github.com
   cp -r * ~/.local/share/gnome-shell/extensions/stopwatch@arvind.github.com/
   ```

4. Enable the extension:
   ```bash
   gnome-extensions enable stopwatch@arvind.github.com
   ```

5. Restart GNOME Shell:
   - **X11**: Press `Alt+F2`, type `r`, press Enter
   - **Wayland**: Log out and log back in

## Usage

### Basic Operations

**Start/Pause Timer**
- Left-click the timer in the top panel

**View Statistics**
- Right-click the timer to open the menu
- View your activity heatmap and statistics

**Reset Timer**
- Right-click → "Reset stopwatch"
- This saves the current session to your statistics before resetting

**Clear Statistics**
- Right-click → "Clear stats"
- Permanently removes all historical data

### Settings

Access settings via the Extensions app:

1. Open **Extensions** (or **Extension Manager**)
2. Find "Stopwatch-Arvind"
3. Click the settings gear icon ⚙️

**Available Settings:**
- **Persist Across Logouts/Restarts**: When enabled, the timer state (time, running/paused status) is preserved across system restarts

## Architecture

### File Structure

```
stopwatch-gnome-extension/
├── extension.js          # Main extension logic and UI
├── prefs.js             # Preferences dialog
├── timer.js             # Timer state management
├── stats2.js            # Statistics manager (GSettings persistence)
├── statsView.js         # Heatmap and statistics UI
├── misc.js              # Utility functions (time formatting)
├── stylesheet.css       # Custom styles
├── metadata.json        # Extension metadata
└── schemas/
    └── org.gnome.shell.extensions.stopwatch.gschema.xml
```

### Data Storage

All data is stored using GSettings (GNOME's configuration system):

- **Statistics**: Daily focus time stored as JSON (`stats` key)
- **Timer State**: Elapsed time, running status, start timestamp (when persistence is enabled)

Data location: `~/.config/dconf/user` (binary format, use `dconf-editor` to inspect)

### Heatmap Color Scale

The activity heatmap uses a 16-level gradient to represent study intensity:

| Duration | Color | Description |
|----------|-------|-------------|
| 0 min | Gray (transparent) | No activity |
| < 1 hour | Light Purple | Micro-sessions |
| 1-2 hours | Very Light Purple | Light study |
| 2-3 hours | Light Purple | Moderate study |
| ... | Gradient | Progressive darkening |
| 15-16 hours | Very Dark Purple | Intense study |
| 16+ hours | Absolute Dark Purple | Maximum intensity |

The color calculation uses HSL color space with a lightness range from 75% (light) to 20% (dark).

## Development

### Prerequisites

- GNOME Shell 45, 46, 47, or 48
- GLib 2.0
- GSettings schema compiler

### Building

Compile the GSettings schema:
```bash
glib-compile-schemas schemas/
```

### Debugging

Enable debug logging:
```bash
# Watch extension logs
journalctl -f -o cat /usr/bin/gnome-shell
```

Run in nested GNOME session:
```bash
dbus-run-session -- gnome-shell --nested --wayland
```

### Code Style

- **Language**: JavaScript (ES6+)
- **Framework**: GJS (GNOME JavaScript bindings)
- **UI**: St (Shell Toolkit), Clutter
- **Settings UI**: Adwaita (Adw)

## Technical Details

### Timer Persistence

When enabled, the extension saves three pieces of state:
1. **Elapsed Time**: Current timer value in seconds (double)
2. **Running Status**: Whether the timer was active (boolean)
3. **Start Timestamp**: Unix timestamp of session start (int64)

On restore, if the timer was running, it automatically resumes. If paused, it displays the saved time.

### Statistics Tracking

- Sessions are recorded when you click "Reset stopwatch"
- Data is aggregated by date (YYYY-MM-DD format)
- Multiple sessions on the same day are summed
- The heatmap displays the full calendar year (Jan 1 - Today)

### Heatmap Rendering

The heatmap is built using:
- **Grid Layout**: 7 rows (days of week) × N columns (weeks)
- **Fixed Positioning**: Month labels use `Clutter.FixedLayout` for precise alignment
- **Scrollable**: Horizontal scroll for viewing the entire year
- **Interactive**: Hover to see details, white border on hover

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Roadmap & Areas for Contribution

We're looking for contributors to help implement these features! Each would significantly enhance the user experience:

#### ⌨️ Keyboard Shortcuts
**Status**: Help Wanted  
**Priority**: High

Add global hotkeys for friction-free timer control:
- `Super+Shift+S` to start/pause
- `Super+Shift+R` to reset  
- Configurable shortcuts in preferences
- Works even when extension menu is closed

**Why it matters**: Power users can track time without breaking their flow. No need to reach for the mouse or find the panel icon.

#### 🔥 Focus Streaks
**Status**: Help Wanted  
**Priority**: Medium

Track consecutive days of focus to build lasting habits:
- "You've focused X days in a row!" notification
- Current streak displayed in tooltip/badge
- Streak counter in stats view
- Visual celebration when reaching milestones (7, 30, 100 days)

**Why it matters**: Gamification builds habits through "don't break the chain" psychology. Makes productivity tracking more engaging and motivating.

#### 🎨 Ambient Mode Indicators
**Status**: Help Wanted  
**Priority**: Medium

Color-coded panel icon based on session duration:
- **0-15 min**: Cool blue (just started)
- **15-45 min**: Green (in the zone!)
- **45-90 min**: Yellow (impressive focus!)
- **90+ min**: Red (time for a break!)

**Why it matters**: Passive awareness of your focus state without checking. Gentle visual reminder to take breaks for health and productivity.

#### 📦 Data Export & Import
**Status**: Help Wanted  
**Priority**: High

Give users full ownership of their productivity data:
- Export statistics to CSV/JSON formats
- Import/restore from backup files
- Backup before clearing stats
- API documentation for custom integrations

**Why it matters**: Data ownership and portability. Advanced users can analyze trends in Excel, integrate with other tools, or build custom dashboards.

#### Other Contribution Ideas

- **Themes**: Alternative color schemes for the heatmap (e.g., green like GitHub, blue, warm tones)
- **Notifications**: Desktop notifications for milestones (every 25 min for Pomodoro compatibility)
- **Localization**: Translations for international users
- **Performance**: Optimize heatmap rendering for multi-year data

## License

MIT License

Copyright © 2023 Arvind Parekh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Acknowledgments

- Original concept inspired by productivity tracking tools
- Heatmap design inspired by GitHub's contribution graph
- Built with the GNOME Shell extension framework

## Support

- **Issues**: [GitHub Issues](https://github.com/ArvindParekh/gnome-stopwatch/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ArvindParekh/gnome-stopwatch/discussions)

## Changelog

### Version 12 (Current)
- Added preferences UI with persistence toggle
- Implemented timer state persistence across logouts/restarts
- Enhanced heatmap with 16-level color gradient
- Improved hover text formatting ("X hr Y min")
- Fixed day label alignment in heatmap
- Added HSL to RGB conversion for better color compatibility

### Earlier Versions
- Activity heatmap visualization
- Statistics tracking and persistence
- Basic timer functionality
