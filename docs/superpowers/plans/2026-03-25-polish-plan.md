# Cal Traffic Polish Plan

## Priority 1: Critical UX Fixes (Route Planner)

### 1A. Fix card blank space + consistent heights
- Feed width wrapper: `aspect-video` on BOTH video and static image containers
- Remove any flex-grow that creates dead space in info panel
- Test with mix of video + static cameras

### 1B. Route summary needs labels + context
- Change "23 mi · ~31 min · 26 cameras" to labeled cards:
  "Distance: 23 mi", "Drive Time: ~31 min", "Cameras: 26", "Incidents: 3"
- Move from badges to a proper "Route Overview" card

### 1C. Clickable directions → scroll to camera + highlight
- Click direction step → scroll feed panel to nearest camera (scrollIntoView)
- Already focuses map — add the scroll behavior
- Add camera ref IDs to feed cards for scrolling

### 1D. Weather + chain control in route planner
- Show weather alerts ONLY when they affect the route area
- Match alert affected counties against camera counties on route
- Show chain control ONLY when cameras on route have chain control data
- Display as banners above the feed (not on every card)

### 1E. Camera page enrichment
- Currently bare bones: just image + metadata
- Add: VideoPlayer (with controls), nearby incidents, CMS signs,
  chain control, historical images, Google Maps link
- Make it a proper standalone page worth sharing

## Priority 2: Reports + Stats Improvements

### 2A. Incidents need WHERE context
- Add a map to the reports page showing incident locations
- Group incidents by region/area (not just dispatch center)
- Show incident density — "Sacramento area: 43 incidents, LA area: 31"
- Make incident list items clickable → show on map

### 2B. Track down cameras
- Detect cameras that are offline/unavailable (isStale, broken images)
- Show "X cameras currently down" stat
- List which cameras are down by district
- Show uptime percentage per district

### 2C. Stats page storytelling
- Lead with "what's happening right now" not just counts
- "3,430 cameras monitoring 346,530 sq mi of California"
- "Right now: 144 active incidents, 784 live video feeds"
- Add a "busiest routes" section based on incident density
- Add "cameras per mile" for major highways
- Show district health: cameras up vs down per district

## Priority 3: Mobile + Polish

### 3A. Mobile responsive testing
- Test route planner on narrow viewport
- Test camera browser on narrow viewport
- Test reports/stats on narrow viewport
- Fix any overflow, text truncation, touch targets

### 3B. Favicon update
- Replace camera icon with something traffic-related
- Road/highway or map pin icon

### 3C. Grid view camera click → camera page
- Currently opens detail dialog
- Should navigate to /camera/[id] page instead
