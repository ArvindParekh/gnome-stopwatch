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

         // Create main horizontal container for the graph section
         this._graphSection = new St.BoxLayout({
            vertical: false,
            style_class: "stats-graph-section",
            style: "spacing: 10px;",
         });
         this._container.add_child(this._graphSection);

         // Left column for day labels
         this._dayLabels = new St.BoxLayout({
            vertical: true,
            style_class: "stats-day-labels",
            style: "spacing: 2px; padding-top: 20px;", // Align with grid (month labels height approx)
         });
         this._graphSection.add_child(this._dayLabels);

         // Right column for graph and month labels
         this._graphRightCol = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style: "spacing: 5px;",
         });
         this._graphSection.add_child(this._graphRightCol);

         // Month labels container
         this._monthLabels = new St.BoxLayout({
            vertical: false,
            style_class: "stats-month-labels",
            style: "spacing: 0px;", // Spacing handled by empty labels or margins
         });
         this._graphRightCol.add_child(this._monthLabels);

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
         this._graphRightCol.add_child(this._graphScroll);

         // Hover details label
         this._hoverDetails = new St.Label({
            text: "Hover over a square to see details",
            style_class: "stats-hover-details",
            style: "font-size: 0.9em; color: #888; margin-top: 5px;",
         });
         this._graphRightCol.add_child(this._hoverDetails);
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

         // Add month labels
         this._monthLabels.destroy_all_children();
         const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
         ];
         
         let lastMonth = -1;
         weeks.forEach((week, index) => {
             // Check the month of the first day of the week
             if (week.length > 0) {
                 const date = new Date(week[0].date);
                 const month = date.getMonth();
                 if (month !== lastMonth) {
                     const monthLabel = new St.Label({
                         text: monthNames[month],
                         style: "font-size: 10px; font-weight: bold;",
                     });
                     // Calculate approximate width based on weeks since last label
                     // This is a simplification; exact pixel alignment is hard in St without fixed widths
                     // We'll just add the label. For better spacing, we might need empty labels or margins.
                     this._monthLabels.add_child(monthLabel);
                     lastMonth = month;
                 } else {
                     // Add empty spacer for weeks within the same month
                     // To prevent clutter, we only add the label once. 
                     // A spacer might be needed if we want strict alignment, but St.BoxLayout flows naturally.
                     // Let's try adding a small spacer label to push things apart if needed, 
                     // but standard flow might be enough if we just drop labels in.
                     // Actually, for a heatmap, we usually want the label above the *start* of the month.
                     // Since we can't easily control pixel width of text vs boxes, we'll just add the label.
                     // A better approach for alignment:
                     // Add a container for each week in the month row, matching the week width (12px + 2px).
                     // But that's complex. Let's stick to just adding the label when it changes.
                     // To ensure some spacing, we can add a margin to the label.
                     const spacer = new St.Widget({ width: 14, height: 1 }); // Match week width
                     this._monthLabels.add_child(spacer);
                 }
             }
         });


         // Build grid cells by adding days to their respective rows
         let boxCount = 0;
         weeks.forEach((week) => {
            week.forEach((day) => {
               const intensity = Math.min(day.time / 3600, 1);
               const color = this._getColorForIntensity(intensity);
               const dayBox = new St.Button({
                  style_class: "stats-day-box",
                  style: `background-color: ${color}; width: 12px; height: 12px; border-radius: 2px;`,
                  reactive: true,
                  can_focus: true,
               });
               
               // Add hover events
               dayBox.connect('enter-event', () => {
                   const dateObj = new Date(day.date);
                   const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
                   const timeStr = Misc.formatTime(day.time);
                   this._hoverDetails.set_text(`${dateStr}: ${timeStr}`);
                   dayBox.set_style(`background-color: ${color}; width: 12px; height: 12px; border-radius: 2px; border: 1px solid white;`);
               });

               dayBox.connect('leave-event', () => {
                   this._hoverDetails.set_text("Hover over a square to see details");
                   dayBox.set_style(`background-color: ${color}; width: 12px; height: 12px; border-radius: 2px;`);
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

         console.debug(
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
