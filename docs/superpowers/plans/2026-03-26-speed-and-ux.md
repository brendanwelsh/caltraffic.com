# Speed & UX Plan

## Priority 1: Speed (users are leaving)

### 1A. Better loading feedback
- Show phases: "Calculating route..." → "Route found! Loading cameras..." → cameras appear
- Show camera count as they load
- Show estimated wait time based on route distance

### 1B. Progressive camera loading
- Render first 5-8 cameras immediately
- Load rest as user scrolls (virtual list)
- Don't render 99 VideoPlayers at once

### 1C. OSRM caching
- Cache for 5 min instead of 2 min
- Consider using a faster routing service for common routes

## Priority 2: Destination Picker

### 2A. City grid with pick-two UX
- Grid of ~20 major CA cities
- Click first city → highlights as FROM
- Click second city → highlights as TO
- Flip button swaps them
- Click "View Route" or auto-triggers
- Cities: Sacramento, San Francisco, Los Angeles, San Diego, Fresno,
  Bakersfield, San Jose, Oakland, Stockton, Modesto, Redding, Eureka,
  Santa Barbara, Palm Springs, Lake Tahoe, Folsom, Irvine, Long Beach,
  Riverside, Santa Cruz

## Priority 3: Mobile + Filters

### 3A. Mobile bottom tabs for route viewer
- On mobile, add tabs at bottom: "Cameras" | "Map" | "Info"
- So user can switch between camera feed, map view, and directions/overview
- Currently map and directions are hidden on mobile (below lg breakpoint)

### 3B. Camera browser filter overhaul
- Cleaner layout
- Better filter chips
- Search should be more prominent
