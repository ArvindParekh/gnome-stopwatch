import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Misc from "./misc.js";

export const StatsView = GObject.registerClass(
   class StatsView extends PopupMenu.PopupBaseMenuItem {
      _init(statsManager) {
         super._init({
            reactive: false,
            style_class: "stats-view",
         });

         this._statsManager = statsManager;
         this._createLayout();
         this._updateStats();
      }

      _createLayout() {
         // Create main container
         this._container = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: "stats-container",
         });
         this.add_child(this._container);

         // Create header
         this._header = new St.Label({
            text: "Productivity Stats",
            style_class: "stats-header",
         });
         this._container.add_child(this._header);

         // Create summary section
         this._summary = new St.BoxLayout({
            vertical: true,
            style_class: "stats-summary",
         });
         this._container.add_child(this._summary);

         // Add section title for heatmap
         this._graphTitle = new St.Label({
            text: "Activity Over Time",
            style_class: "stats-section-title",
         });
         this._container.add_child(this._graphTitle);

         // Create contributions graph container with horizontal scroll
         this._graphScroll = new St.ScrollView({
            x_expand: true,
            y_expand: false,
            overlay_scrollbars: true,
            style_class: "stats-graph-scroll",
         });
         // Enable horizontal scroll only (h, v)
         this._graphScroll.set_policy(
            St.PolicyType.AUTOMATIC,
            St.PolicyType.NEVER
         );

         // Use nested BoxLayouts for the grid (more reliable than GridLayout)
         this._graphArea = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: "stats-graph",
            style: "spacing: 2px;",
         });

         this._graphScroll.add_child(this._graphArea);
         this._container.add_child(this._graphScroll);
      }

      _updateStats() {
         // Clear existing content
         this._summary.destroy_all_children();
         // Clear any existing graph children
         this._graphArea.destroy_all_children();

         // Create 7 row containers for the heatmap (one for each day of week)
         const dayRows = [];
         for (let i = 0; i < 7; i++) {
            const row = new St.BoxLayout({
               vertical: false,
               style: "spacing: 2px;",
            });
            dayRows.push(row);
         }

         // Add summary stats with modern card design
         const totalTime = this._statsManager.getTotalTime();
         const avgTime = this._statsManager.getAverageTime();
         const bestDay = this._statsManager.getMaxDay(365);

         // Total time card
         const totalCard = new St.BoxLayout({
            vertical: true,
            style_class: "stats-card",
         });
         totalCard.add_child(
            new St.Label({
               text: "Total Focus Time",
               style_class: "stats-card-label",
            })
         );
         totalCard.add_child(
            new St.Label({
               text: Misc.formatTime(totalTime),
               style_class: "stats-card-value",
            })
         );
         this._summary.add_child(totalCard);

         // 7-day average card
         const avgCard = new St.BoxLayout({
            vertical: true,
            style_class: "stats-card",
         });
         avgCard.add_child(
            new St.Label({
               text: "7-Day Average",
               style_class: "stats-card-label",
            })
         );
         avgCard.add_child(
            new St.Label({
               text: Misc.formatTime(avgTime),
               style_class: "stats-card-value",
            })
         );
         this._summary.add_child(avgCard);

         // Best day card
         const bestText =
            bestDay && bestDay.time > 0 ? Misc.formatTime(bestDay.time) : "—";
         const bestDate = bestDay && bestDay.time > 0 ? bestDay.date : "";
         const bestCard = new St.BoxLayout({
            vertical: true,
            style_class: "stats-card",
         });
         bestCard.add_child(
            new St.Label({
               text: "Best Day",
               style_class: "stats-card-label",
            })
         );
         bestCard.add_child(
            new St.Label({
               text: bestText,
               style_class: "stats-card-value",
            })
         );
         if (bestDate) {
            bestCard.add_child(
               new St.Label({
                  text: bestDate,
                  style_class: "stats-card-label",
                  style: "margin-top: 2px; text-transform: none;",
               })
            );
         }
         this._summary.add_child(bestCard);

         // Create contributions graph
         const stats = this._statsManager.getStats(365);

         // Align to Sunday as the first row like GitHub
         const today = new Date();
         const end = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
         );
         const endWeekday = end.getDay(); // 0 = Sunday
         const totalDays = 365;
         const start = new Date(end);
         start.setDate(end.getDate() - (totalDays - 1 + endWeekday));

         const weeks = [];
         let currentWeek = [];
         const cursor = new Date(start);
         while (cursor <= end) {
            const dateStr = cursor.toISOString().split("T")[0];
            currentWeek.push({ date: dateStr, time: stats[dateStr] || 0 });
            if (currentWeek.length === 7) {
               weeks.push(currentWeek);
               currentWeek = [];
            }
            cursor.setDate(cursor.getDate() + 1);
         }
         if (currentWeek.length > 0) {
            weeks.push(currentWeek);
         }

         // Build grid cells by adding days to their respective rows
         let boxCount = 0;
         weeks.forEach((week) => {
            week.forEach((day) => {
               const intensity = Math.min(day.time / 3600, 1);
               const color = this._getColorForIntensity(intensity);
               const dayBox = new St.Bin({
                  style_class: "stats-day-box",
                  style: `background-color: ${color}; width: 12px; height: 12px;`,
               });
               const rowIndex = new Date(day.date).getDay(); // 0..6 Sun..Sat
               dayRows[rowIndex].add_child(dayBox);
               boxCount++;
            });
         });

         // Add all rows to the graph area
         dayRows.forEach((row) => {
            this._graphArea.add_child(row);
         });

         log(
            `Stopwatch: Created ${boxCount} heatmap boxes in ${weeks.length} weeks`
         );
      }

      _getColorForIntensity(intensity) {
         // Modern shadcn-inspired color scheme with better visibility
         if (intensity === 0) return "rgba(63, 63, 70, 0.3)"; // Empty state - subtle gray
         if (intensity < 0.25) return "#a78bfa"; // Light purple
         if (intensity < 0.5) return "#8b5cf6"; // Medium purple
         if (intensity < 0.75) return "#7c3aed"; // Darker purple
         return "#6d28d9"; // Deep purple
      }

      // No Cairo helpers needed with grid-based layout

      update() {
         this._updateStats();
      }
   }
);
