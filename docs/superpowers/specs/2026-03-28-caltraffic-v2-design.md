# CalTraffic.com V2 — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Scope:** Infrastructure fix, camera card redesign, filter overhaul, route viewer polish, featured cameras, content improvements

---

## 1. Infrastructure: Fix Worker CPU Limits

### Problem
`/api/cameras/all` fetches and transforms 3,400+ cameras from 12 Caltrans districts in a single Cloudflare Worker invocation. This exceeds the CPU time limit, returning 503 errors. The Route Viewer depends on this endpoint, so routes show "no cameras found."

### Solution
- **Remove the `all` case** from `/api/cameras/[district].ts`. The endpoint only serves individual districts (1-12).
- **Client-side parallel fetch**: `useCameras(null)` fetches all 12 districts in parallel from the browser using `Promise.allSettled`, merging results client-side. No single worker call is heavy.
- **Route Planner optimization**: Instead of fetching all 3,400 cameras, compute which districts the route corridor passes through (using origin/destination lat/lon mapped to district boundaries) and only fetch those districts. A Sacramento-to-Folsom route only needs District 3.

### Files
- `src/pages/api/cameras/[district].ts` — remove the `district === 'all'` branch
- `src/hooks/use-cameras.ts` — change `useCameras(null)` to fetch districts 1-12 in parallel and merge
- `src/hooks/use-route-planner.ts` — add district-corridor detection, only fetch needed districts

---

## 2. Camera Card Redesign

### Problem
Current cards have jargon badges (R1, 0m delay), red borders, cryptic incident text, and a "More/Less" button that shifts card height. Users don't understand what any of it means.

### Solution
Clean fixed-height card with condition icons on the right side of the info area.

### Layout (applies to both Camera Viewer CameraCard and Route Viewer FeedCard)

```
+------------------+--------------------------------------+
|                  |  [US 50]  Ski Run              ⚠ ℹ ⏱ |
|   Camera Feed    |  East · South Lake Tahoe             |
|                  |                                      |
|  [LIVE]    [#3]  |                                      |
|                  |  Maps · Details · Zoom on Map   ✓ ★  |
+------------------+--------------------------------------+
```

- **Feed area** (left 38%): Camera image/video. Red "LIVE" dot top-left (small, not blocking). Camera index number bottom-left.
- **Info area** (right 62%): Camera name (large, `text-sm md:text-lg`), route shield, direction/city below.
- **Condition icons** (top-right of info area, side by side):
  - Red triangle with count = nearby incidents. Tooltip: "X crash/construction/hazard nearby"
  - Blue info circle with R1/R2/R3 = chain control. Tooltip explains level.
  - Amber clock with +Xm = travel delay. Tooltip shows current vs typical time.
  - Icons only appear when the condition exists. No icons = all clear.
- **Action bar** (bottom): Maps, Details, Zoom on Map (left). Check + Star (right, same size as condition icons).
- **No red border**. No jargon badges. No "More/Less" button. No inline incident text.
- **Fixed height**. Card never changes size regardless of conditions.

### Condition Icon Details
| Icon | Color | Label | Tooltip |
|------|-------|-------|---------|
| Triangle (!) | `#ef4444` red | Count (1, 2, 3) | "X incident(s) nearby — crash, construction, or hazard" |
| Info circle (i) | `#3b82f6` blue | R1/R2/R3 | "Chain control: R1 = snow tires or chains. R2 = chains on ALL vehicles. R3 = road closed." |
| Clock | `#f59e0b` amber | +Xm | "Travel time: currently X min vs typical Y min (Z min delay)" |

### Video Status
- Live cameras: small red dot + "LIVE" text, top-left of feed, semi-transparent background. Does not block the camera image.
- Failed video: show "Feed unavailable" text overlay instead of black screen.
- Static cameras: no indicator (absence of LIVE dot implies static).

---

## 3. Filter System Overhaul

### Problem
Current filters are confusing. "Live", "Hide Stale", "Hide N/A" overlap. Hard to tell what's active. Play All and Live Grid are mixed in with filters. No hierarchy.

### Solution
Two-row filter bar with clear grouping and consistent visual language.

### Row 1: Actions + Search + View
| Element | Behavior |
|---------|----------|
| **Play All Live** (green button) | Starts all visible live camera feeds playing. Toggles to "Pause All" when active. Separate from filters — this is an action, not a filter. |
| **Search** (text input, no icon) | Filters cameras by name, route, city, county. Always visible. |
| **Grid / Map** toggle | Switches view mode. |
| **Density selector** (3/4/5/6) | Grid column count. Default: 5. |

### Row 2: Filters
| Element | Behavior |
|---------|----------|
| **All / Live / Still** (segmented control) | Mutually exclusive. One always active. Replaces "Live", "Hide Stale", "Hide N/A" toggles. Default: "Live" (hides unavailable and static-only cameras by default). |
| **Incidents** chip (red triangle icon) | Toggle. When active: shows only cameras with nearby incidents. Highlights red. Click again or X to dismiss. |
| **Chains** chip (blue info icon) | Toggle. When active: shows only cameras with chain control. Highlights blue. |
| **Delays** chip (amber clock icon) | Toggle. When active: shows only cameras with travel delay. Highlights amber. |
| **District** dropdown | Location filter. |
| **Route** dropdown | Location filter. |
| **City** dropdown | Location filter. |
| **Clear all** link | Resets all filters to default. |

### Mobile
- Row 1 compresses: "Play All" shortens, search shrinks, Grid/Map stays.
- Row 2 becomes a horizontally scrollable strip with subtle fade edges hinting at more content.
- Camera count shown below: "217 cameras".

### Removed
- District SVG map selector — removed entirely. District dropdown is sufficient.
- "Hide Stale", "Hide N/A", "Hide Broken" toggles — replaced by All/Live/Still segment.
- Favorites filter chip — Favorites is a separate page now.

---

## 4. Route Viewer Polish

### Changes
- **Route shield**: slightly larger size in feed cards.
- **"Show on Map" renamed to "Zoom on Map"**: clicking zooms the map to that camera's location.
- **Remove "More/Less" button**: incident/condition info just fits naturally. If multiple incidents, show count + first one's type. Details on click.
- **Distance between cameras**: higher contrast text color (not faint gray). White/light text in dark mode.
- **City picker**: clicking an already-selected city deselects it (toggles). No need to scroll to "Start over".
- **CMS signs**: more LED-like styling — darker black background, slightly glowing amber text, tighter letter spacing. Remove "PM X.X" postmile (users don't understand it).
- **Play All Live button**: same as Camera Viewer, in the route viewer controls bar.
- **Video failed state**: "Feed unavailable" overlay instead of black screen.
- **Map clicks**: clicking a camera marker on the map scrolls to that camera in the feed (already wired up).
- **Map legend**: small collapsible legend showing what green/red/gray markers mean, and what A/B markers are.

---

## 5. Featured Cameras

### Always Playing
All featured cameras auto-play their live video feeds. "Pause All / Resume All" toggle available. Static-only cameras hidden by default (with toggle to show).

### Curation Strategy
Research and add cameras that are:
- **Famous / iconic**: Golden Gate Bridge, Bay Bridge, Hollywood area, Coronado Bridge
- **Notorious bottlenecks**: I-405 Sepulveda, I-10/I-110 downtown LA, Altamont Pass, MacArthur Maze
- **Scenic / beautiful**: Big Sur, Lake Tahoe, Mt. Shasta, Conway Summit, ocean views
- **Unique / interesting**: single-lane bridges, mountain passes, remote desert roads
- **High-quality feeds**: cameras with the clearest, most detailed video
- **Frequently active**: spots with regular incidents, heavy traffic, or weather events

Target: 60+ featured cameras across all categories.

### Incident Spotlight (New)
Cameras with active incidents automatically get a "Happening Now" badge on the Featured page. This is data-driven — when an incident clears, the badge disappears. No manual curation needed.

Implementation: cross-reference `nearbyIncidents` from the enriched camera data with featured camera IDs. If incidents exist, show badge.

---

## 6. Content & Context Improvements

### Reports Page
Add introductory paragraph explaining what each report type is, where the data comes from (CHP TIMS, Caltrans CWWP2), and what the fields mean. Each report section gets a brief explainer.

### About Page
Add:
- Camera refresh rates (varies by district, typically 1-5 minutes for stills, real-time for video)
- Data sources with links (Caltrans CWWP2, CHP, NWS)
- What "stale" means and why some feeds fail
- Camera quality notes (varies widely by age and district)

### Chain Control Explanation
Everywhere R1/R2/R3 appears, tooltip explains:
- **R1**: Chains or snow tires required on drive wheels
- **R2**: Chains required on all vehicles, no exceptions
- **R3**: Highway closed to all traffic

### Travel Time Explanation
Tooltip on delay badge: "Travel time on [corridor]: currently X min vs typical Y min. Delay: Z min."

---

## 7. Deferred / Removed

| Item | Status | Reason |
|------|--------|--------|
| District SVG map selector | **Removed** | Unreliable, low value. District dropdown replaces it. |
| Admin/history page | **Deferred** | Separate project. Needs auth system design. |
| Drag-and-drop custom grid viewer | **Deferred** | Complex interaction design. Separate cycle. |
| Buy Me a Coffee link | **Deferred** | Not critical for v2. |
| Export camera list | **Deferred** | Low priority. |

---

## 8. Design Principles

- **No jargon**: if a user doesn't know what R1 means, explain it in a tooltip. If PM 18.6 means nothing, don't show it.
- **Icons = filters**: every icon on a card can be filtered by. Visual consistency between cards and filter bar.
- **Fixed layouts**: cards never change height. No "More/Less", no expanding sections.
- **Mobile-first**: every feature must work on phone. Horizontal scroll for overflow.
- **Actions separate from filters**: "Play All" is a button, not a toggle chip. Clear hierarchy.
- **Tooltips everywhere**: when something isn't self-explanatory, a hover/tap tooltip explains it.
