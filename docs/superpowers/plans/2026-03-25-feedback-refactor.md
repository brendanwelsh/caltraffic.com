# Feedback Refactor Plan

Based on detailed user feedback. Organized by priority and grouped by area.

---

## Priority 1: Critical Bugs & Broken Things

### 1A. Fix NaN minutes on route timeline dots
- The green timeline dots show "NaNm" for ETA
- Root cause: `routeDuration` is 0 when OSRM hasn't loaded but cameras are shown
- Fix: guard all ETA calculations, show "—" when duration unknown

### 1B. Fix copy link / camera page links
- `/camera/[id]` links are broken or don't work
- Verify the camera detail page route works, test with actual camera IDs

### 1C. Fix district map selector not loading
- The SVG district map dropdown doesn't appear to render
- Check if DistrictMapSelector component is wired up and rendering

---

## Priority 2: Route Planner — Core UX

### 2A. Make route planner the homepage
- Route planner becomes the default landing page at `/`
- Camera browser moves to `/cameras` (or `/browse`)
- Default route pre-loaded: Folsom → Sacramento
- Header nav updated: "Route Planner" (active by default), "Camera Browser"

### 2B. Route summary → right side, above/below map
- Move "31 min · 23 mi · 60 cameras" summary to the right column
- Add more detail: turn-by-turn directions from OSRM steps
- Show which exits/interchanges cameras are near
- Make this a proper route info panel

### 2C. Card responsive breakpoint fix
- Feed + info should go side-by-side on wide, stacked on narrow
- **Feed should be a fixed predefined width** — not a percentage
- Card should be tall enough to fit the full feed (no crop)
- Info card drops below feed on mobile AND thin desktop windows

### 2D. Fix card sizing / feed dimensions
- Camera feed: fixed aspect ratio, predefined width (e.g., 320px on desktop)
- Card height matches feed height naturally — no blank space
- Consistent across all cards

### 2E. Enlarge route shields on cards
- Route shields (I-5, US-50, SR-99) should be larger/more prominent

### 2F. Fill the info card space
- Details grid, links, conditions, signs — all visible without expanding
- No dead/blank space in the info panel

### 2G. Add nearby grayed-out cameras on route map
- Show cameras near but not on the route as gray/faded markers
- Helps users see what else is around

### 2H. Add CMS signs to route map
- Route map currently missing sign markers (main map has them)

---

## Priority 3: Filter & UI Refinements

### 3A. Remove "Signs" filter toggle entirely
- Don't filter by signs — signs are just info embedded in camera cards
- Remove the signs icon badge from camera cards
- Keep signs showing in the detail dialog / route cards as "nearby highway signs"

### 3B. Filter bar UI cleanup
- Grid density buttons (1-6) are too small relative to other controls
- Make them consistent size with the view toggle
- Ensure "Clear all" button is always visible when filters active

### 3C. Replace "Updated just now" with a refresh button
- Remove DataFreshness auto-text
- Add a manual refresh button (circular arrow icon)
- Refreshes all camera data on click
- Maybe also individual camera refresh in detail view

### 3D. Map view consistency
- Main page map and route page map should look/behave similarly
- Route map should show CMS signs and incidents like the main map

---

## Priority 4: About Page & Donate

### 4A. Flush out the About page
- Explain data sources in detail with URLs:
  - CWWP2 (https://cwwp2.dot.ca.gov/) — camera feeds, CMS, chain control, closures, RWIS, travel times
  - CHP (https://media.chp.ca.gov/sa_xml/sa.xml) — traffic incidents
  - NWS (https://api.weather.gov/) — weather alerts
- Add "How it's made" section explaining the tech stack
- Reference the CCTV documentation page content
- Add the district map image
- Remove duplicate About links (top and bottom)

### 4B. Add donate/tip button
- "Buy Me a Coffee" style button
- PayPal link: paypal.me/BrendanWelsh (user to confirm when active)
- Put in About section and maybe a subtle one in the header/footer
- Consider GitHub Sponsors or Buy Me a Coffee as alternatives

---

## Priority 5: Polish & Tooltips

### 5A. Historical images: 3-wide instead of 4-wide, larger
- If there are always ~12 images, 3 per row = 4 rows, bigger thumbnails

### 5B. Add tooltips where useful
- Filter toggles: explain what each does on hover
- Camera card badges: explain what the indicators mean
- Map markers: explain marker colors

### 5C. Camera icon / favicon refresh
- Current camera icon doesn't represent the tool well
- Consider a road/highway lens icon instead

### 5D. Quick routes section centering
- Center the preset route buttons, especially on narrow screens

### 5E. Filter ordering review
- Most useful filters first
- District → County → Search → (view toggle + grid density)
- Live / Hide broken / Incidents below

---

## Not Doing (descoped)
- Turn-by-turn integrated into individual cards (stretch goal, complex)
- PeMS real-time speed data (requires separate API approval)
- "Most viewed" / hot spots section (no backend for view tracking)
