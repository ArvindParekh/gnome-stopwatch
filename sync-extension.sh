#!/bin/bash
# Sync development files to installed extension directory

EXTENSION_UUID="stopwatch@arvind.github.com"
DEV_DIR="/home/arvind/Documents/Code/Play/Projects/stopwatch-gnome-extension"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "Syncing files from $DEV_DIR to $INSTALL_DIR..."

# Copy all necessary files
cp "$DEV_DIR/extension.js" "$INSTALL_DIR/"
cp "$DEV_DIR/prefs.js" "$INSTALL_DIR/"
cp "$DEV_DIR/timer.js" "$INSTALL_DIR/"
cp "$DEV_DIR/stats2.js" "$INSTALL_DIR/"
cp "$DEV_DIR/statsView.js" "$INSTALL_DIR/"
cp "$DEV_DIR/misc.js" "$INSTALL_DIR/"
cp "$DEV_DIR/stylesheet.css" "$INSTALL_DIR/"
cp "$DEV_DIR/metadata.json" "$INSTALL_DIR/"
cp "$DEV_DIR/schemas/org.gnome.shell.extensions.stopwatch.gschema.xml" "$INSTALL_DIR/schemas/"

# Recompile schema
echo "Compiling schema..."
glib-compile-schemas "$INSTALL_DIR/schemas/"

# Reload extension
echo "Reloading extension..."
gnome-extensions disable "$EXTENSION_UUID"
sleep 1
gnome-extensions enable "$EXTENSION_UUID"

echo "Done! Extension synced and reloaded."
echo ""
echo "IMPORTANT: You need to restart GNOME Shell for schema changes to take effect:"
echo "  - X11: Press Alt+F2, type 'r', press Enter"
echo "  - Wayland: Log out and log back in"
