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
            // Padding top calculation: 20px (month labels height) + 2px (spacing) + 12px (graph padding) = 34px
            style: "spacing: 2px; padding-top: 34px; width: 30px; margin-right: 5px;", // Fixed width and margin
         });
         this._graphSection.add_child(this._dayLabels);

         // Right column for graph and month labels
         this._graphRightCol = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style: "spacing: 5px;",
         });
         this._graphSection.add_child(this._graphRightCol);

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
         this._graphRightCol.add_child(this._graphScroll);

         // Container for scrollable content (Months + Grid)
         this._scrollContent = new St.BoxLayout({
            vertical: true,
            style: "spacing: 2px;",
         });
         this._graphScroll.add_child(this._scrollContent);

         // Month labels container - use a Widget with FixedLayout for precise positioning
         this._monthLabels = new St.Widget({
            layout_manager: new Clutter.FixedLayout(),
            x_expand: true,
            y_expand: false,
            height: 20, // Sufficient height for labels
         });
         this._scrollContent.add_child(this._monthLabels);

         // Use nested BoxLayouts for the grid (more reliable than GridLayout)
         this._graphArea = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: "stats-graph",
            style: "spacing: 2px;",
         });

         this._scrollContent.add_child(this._graphArea);

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
         // Clear day labels to prevent duplication
         this._dayLabels.destroy_all_children();

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
         // Calculate days needed for the view
         const msPerDay = 24 * 60 * 60 * 1000;
         const today = new Date();
         const end = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
         );
         // Start from Jan 1st of current year
         const startOfYear = new Date(today.getFullYear(), 0, 1);
         const startWeekday = startOfYear.getDay(); // 0 = Sunday
         // Align start to the Sunday of the week containing Jan 1st
         const start = new Date(startOfYear);
         start.setDate(startOfYear.getDate() - startWeekday);
         const daysNeeded = Math.ceil((end - start) / msPerDay) + 1;
         const stats = this._statsManager.getStats(daysNeeded);
         const bestDay = this._statsManager.getMaxDay(daysNeeded);

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
         const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
         days.forEach((day) => {
            this._dayLabels.add_child(
               new St.Label({
                  text: day,
                  // Use strict height and line-height to match the grid rows
                  style: "font-size: 9px; height: 10px; line-height: 10px; margin-bottom: 2px; padding: 0; text-align: right;", 
                  y_align: Clutter.ActorAlign.CENTER,
                  x_align: Clutter.ActorAlign.END, // Align text to right
               })
            );
         });
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
         // Calendar Year View (Jan 1st - Today)
         // Note: 'today', 'end', 'start' are already calculated above for stats fetching

         const weeks = [];
         let currentWeek = [];
         const cursor = new Date(start);
         while (cursor <= end) {
            // Use local date string for stats lookup
            // Format: YYYY-MM-DD in local time
            const year = cursor.getFullYear();
            const month = String(cursor.getMonth() + 1).padStart(2, '0');
            const day = String(cursor.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
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

         // Add month labels with fixed positioning
         this._monthLabels.destroy_all_children();
         const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
         ];
         
         let lastMonthYear = ""; // Track "YYYY-MM" to handle same month in different years
         let lastXPos = -100; // Track last label position to prevent overlap
         
         weeks.forEach((week, index) => {
             // Check the month of the first day of the week
             if (week.length > 0) {
                 // Parse date manually to avoid UTC conversion issues
                 const [y, m, d] = week[0].date.split('-').map(Number);
                 const date = new Date(y, m - 1, d);
                 const month = date.getMonth();
                 const monthYear = `${y}-${m}`; // Track year + month
                 
                 // Only show labels for the current year
                 if (y < today.getFullYear()) return;

                 if (monthYear !== lastMonthYear) {
                     // Calculate X position: index * (12px width + 2px spacing)
                     const xPos = index * 14;
                     
                     // Only add label if it doesn't overlap with previous one
                     // Increased threshold to 40px to prevent cramping
                     if (xPos - lastXPos > 40) {
                         const monthLabel = new St.Label({
                             text: monthNames[month],
                             style: "font-size: 10px; font-weight: bold;",
                         });
                         
                         this._monthLabels.add_child(monthLabel);
                         monthLabel.set_position(xPos, 0);
                         
                         lastMonthYear = monthYear;
                         lastXPos = xPos;
                     }
                 }
             }
         });


         // Build grid cells by adding days to their respective rows
         let boxCount = 0;
         weeks.forEach((week) => {
            week.forEach((day) => {
               // Normalize intensity based on 10 hours (36000 seconds) max
               const intensity = Math.min(day.time / 36000, 1);
               const color = this._getColorForIntensity(intensity);
               const dayBox = new St.Button({
                  style_class: "stats-day-box",
                  // Add transparent border to prevent layout shift on hover
                  // Width 10px + 2px border = 12px total width. Spacing is 2px. Total stride = 14px.
                  // Force strict sizing to prevent theme interference
                  style: `background-color: ${color}; min-width: 10px; min-height: 10px; width: 10px; height: 10px; padding: 0; margin: 0; border-radius: 2px; border: 1px solid transparent; box-shadow: none;`,
                  reactive: true,
                  can_focus: true,
               });
               
               // Add hover events
               dayBox.connect('enter-event', () => {
                   // Parse date manually to ensure correct local date display
                   const [y, m, d] = day.date.split('-').map(Number);
                   const dateObj = new Date(y, m - 1, d);
                   const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
                   const timeStr = Misc.formatTimeVerbose(day.time);
                   this._hoverDetails.set_text(`${dateStr}: ${timeStr}`);
                   // Maintain strict sizing on hover
                   dayBox.set_style(`background-color: ${color}; min-width: 10px; min-height: 10px; width: 10px; height: 10px; padding: 0; margin: 0; border-radius: 2px; border: 1px solid white; box-shadow: none;`);
               });

               dayBox.connect('leave-event', () => {
                   this._hoverDetails.set_text("Hover over a square to see details");
                   // Restore strict sizing on leave
                   dayBox.set_style(`background-color: ${color}; min-width: 10px; min-height: 10px; width: 10px; height: 10px; padding: 0; margin: 0; border-radius: 2px; border: 1px solid transparent; box-shadow: none;`);
               });

               // Parse date manually for correct day of week
               const [y, m, d] = day.date.split('-').map(Number);
               const rowIndex = new Date(y, m - 1, d).getDay(); // 0..6 Sun..Sat
               
               if (dayRows[rowIndex]) {
                   dayRows[rowIndex].add_child(dayBox);
                   boxCount++;
               }
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
         // Scale: 0-10 hours
         if (intensity === 0) return "rgba(63, 63, 70, 0.3)"; // Empty state - subtle gray
         
         // 5 levels of intensity
         if (intensity < 0.2) return "#ede9fe"; // Level 1: 0-2h (Very Light Purple)
         if (intensity < 0.4) return "#c4b5fd"; // Level 2: 2-4h (Light Purple)
         if (intensity < 0.6) return "#a78bfa"; // Level 3: 4-6h (Medium Purple)
         if (intensity < 0.8) return "#8b5cf6"; // Level 4: 6-8h (Dark Purple)
         return "#7c3aed";                      // Level 5: 8h+ (Deep Purple)
      }

      // No Cairo helpers needed with grid-based layout

      update() {
         this._updateStats();
      }
   }
);
