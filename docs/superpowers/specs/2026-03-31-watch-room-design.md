# Watch Room — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Replace Favorites page with Watch Room — layout builder with preset grids, per-slot camera rotation with timers, inline search to add cameras, shareable via URL

---

## 1. Overview

The `/favorites` page becomes a **Watch Room** — a customizable multi-camera live viewer. Users pick a layout preset (2x2, 3x3, 1+3, etc.), assign cameras to slots, configure per-slot rotation timers, and watch multiple live feeds simultaneously. Layouts are shareable via URL.

Favorites (starred cameras) remain as the quick-add mechanism. The Watch Room is the viewing experience for those favorites.

---

## 2. Page Structure

### Two Modes

**Setup mode** (default when no layout exists):
- Layout preset picker at the top (visual thumbnails)
- Below: search bar + favorited cameras grid for adding to slots
- Click a preset → empty slots appear → click a slot → search/pick cameras for it

**Watch mode** (when layout is configured):
- Layout fills the viewport (full-width, near-full-height)
- Each slot shows a live feed with camera name overlay
- Rotation indicator (dots) at bottom of rotating slots
- Toolbar at top: "Edit" button, "Share" button, preset name
- "Edit" returns to setup mode

### Layout Presets

| Preset | Grid | Slots |
|--------|------|-------|
| `1x1` | Single full-width | 1 |
| `2x2` | 2 columns, 2 rows | 4 |
| `1+3` | 1 large (left 2/3), 3 small stacked (right 1/3) | 4 |
| `2x3` | 2 columns, 3 rows | 6 |
| `3x3` | 3 columns, 3 rows | 9 |

### Slot Configuration

Each slot has:
- **Primary camera** (required) — the default camera shown
- **Rotation list** (optional) — additional camera IDs that cycle
- **Timer** (optional) — rotation interval: off, 10s, 30s, 60s, 5m. Default: off (stays on primary)

When timer is active, slot cycles through its camera list. Current position shown as small dots at bottom of the slot.

---

## 3. Adding Cameras to Slots

**Flow:**
1. User picks a preset → empty slots render with "+" button
2. Click a slot's "+" → slot highlights, search bar focuses
3. Type in search bar → dropdown shows matching cameras (from all districts)
4. Click a camera → it's assigned to that slot as primary
5. To add rotation cameras: click the slot again → "Add to rotation" option
6. To set timer: click slot → timer selector appears

**Alternative quick-add:** If you've already starred cameras, they appear below the search bar as a grid. Click any to add to the active slot.

---

## 4. Data Persistence

### localStorage

Key: `caltraffic-watch-room`

```json
{
  "preset": "2x2",
  "slots": [
    { "cameras": ["D03-77", "D03-79"], "timer": 30 },
    { "cameras": ["D04-123"], "timer": 0 },
    { "cameras": ["D07-456"], "timer": 60 },
    { "cameras": ["D03-143"], "timer": 0 }
  ]
}
```

### Shareable URL

"Copy Watch Room Link" button encodes layout as base64 in URL:
```
caltraffic.com/favorites?layout=eyJwcmVzZXQiOiIyeDIiLC...
```

When someone opens a shared link:
- Layout renders immediately from URL params
- Banner: "Viewing shared layout — Save as mine?"
- Click "Save as mine" → persists to their localStorage
- Their existing layout is not overwritten until they explicitly save

---

## 5. Shared Components

Watch Room reuses:
- `VideoPlayer` — for live feeds in each slot
- `CameraDetailDialog` — click a slot to see full camera detail
- `useFavorites` hook — starred cameras shown as quick-add options
- `useCameras` hook — search across all districts
- `RouteShield` — camera route badge in slot overlay
- `ConditionIcons` — show conditions on slot hover

---

## 6. Nav Update

Rename "Favorites" → "Watch Room" in Header.astro (both desktop and mobile nav).
URL stays `/favorites` for backward compatibility.

---

## 7. New Files

- `src/components/react/WatchRoom.tsx` — main page component (setup + watch modes)
- `src/components/react/WatchSlot.tsx` — individual slot component (feed, rotation, timer, config)
- `src/components/react/LayoutPicker.tsx` — preset layout thumbnails
- `src/hooks/use-watch-room.ts` — hook for layout state, localStorage persistence, URL sharing
- `src/lib/watch-room-layouts.ts` — layout preset definitions (CSS grid templates)

### Modified Files
- `src/pages/favorites.astro` — swap FavoritesPage for WatchRoom
- `src/components/astro/Header.astro` — rename Favorites → Watch Room

### Removed Files
- `src/components/react/FavoritesPage.tsx` — replaced by WatchRoom

---

## 8. Mobile Behavior

On mobile:
- Layout presets limited to 1x1 and 2x2 (3x3 is too small on phone)
- Slots stack vertically in setup mode
- Watch mode uses the selected preset but slots may be smaller
- Swipe between slots on 1x1 preset
