# Watch Room Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Replace the Favorites page with a Watch Room — customizable multi-camera viewer with preset layouts, per-slot rotation timers, inline search, and shareable URLs.

**Architecture:** New WatchRoom component with two modes (setup/watch). Layout state managed by a custom hook with localStorage persistence and URL-based sharing. Reuses existing VideoPlayer, CameraDetailDialog, and useCameras hooks.

**Tech Stack:** React 18, Tailwind CSS, localStorage, base64 URL encoding

---

## Task 1: Layout definitions and watch room hook

**Files:**
- Create: `src/lib/watch-room-layouts.ts`
- Create: `src/hooks/use-watch-room.ts`

### watch-room-layouts.ts

Define preset layouts with CSS grid templates:

```typescript
export interface LayoutPreset {
  id: string;
  name: string;
  slots: number;
  gridTemplate: string; // CSS grid-template-areas
  gridCols: string; // CSS grid-template-columns
  gridRows: string; // CSS grid-template-rows
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: '1x1',
    name: 'Single',
    slots: 1,
    gridTemplate: '"a"',
    gridCols: '1fr',
    gridRows: '1fr',
  },
  {
    id: '2x2',
    name: 'Quad',
    slots: 4,
    gridTemplate: '"a b" "c d"',
    gridCols: '1fr 1fr',
    gridRows: '1fr 1fr',
  },
  {
    id: '1+3',
    name: '1 Big + 3',
    slots: 4,
    gridTemplate: '"a b" "a c" "a d"',
    gridCols: '2fr 1fr',
    gridRows: '1fr 1fr 1fr',
  },
  {
    id: '2x3',
    name: '2x3',
    slots: 6,
    gridTemplate: '"a b" "c d" "e f"',
    gridCols: '1fr 1fr',
    gridRows: '1fr 1fr 1fr',
  },
  {
    id: '3x3',
    name: '3x3',
    slots: 9,
    gridTemplate: '"a b c" "d e f" "g h i"',
    gridCols: '1fr 1fr 1fr',
    gridRows: '1fr 1fr 1fr',
  },
];

export const SLOT_NAMES = ['a','b','c','d','e','f','g','h','i'];
```

### use-watch-room.ts

Hook managing layout state, persistence, and URL sharing:

```typescript
export interface WatchSlotConfig {
  cameras: string[]; // camera IDs
  timer: number; // seconds, 0 = no rotation
}

export interface WatchRoomState {
  preset: string;
  slots: WatchSlotConfig[];
}

export function useWatchRoom() {
  // Load from URL param first, then localStorage
  // Returns: state, setPreset, setSlotCameras, setSlotTimer, addCameraToSlot,
  //          removeCameraFromSlot, clearLayout, getShareUrl, isSharedView
}
```

Key behaviors:
- On mount: check URL for `?layout=` base64 param → decode and use. Otherwise load from localStorage key `caltraffic-watch-room`.
- `getShareUrl()`: base64-encode current state, return full URL
- `saveLayout()`: persist to localStorage
- State changes auto-save to localStorage (debounced)

---

## Task 2: WatchSlot component

**Files:**
- Create: `src/components/react/WatchSlot.tsx`

Individual slot that shows a live camera feed with rotation support:

- Accepts: `cameras: Camera[]`, `timer: number`, `slotName: string`, `onConfig: () => void`
- Renders VideoPlayer for current camera
- If timer > 0 and multiple cameras: cycles through list using setInterval
- Shows rotation dots at bottom (current position indicator)
- Shows camera name + route overlay at bottom
- Click opens CameraDetailDialog
- Empty state: "+" button to add camera
- Hover: shows config gear icon

---

## Task 3: LayoutPicker component

**Files:**
- Create: `src/components/react/LayoutPicker.tsx`

Visual preset selector:
- Shows 5 layout thumbnails as clickable cards
- Each thumbnail is a mini CSS grid diagram showing the slot arrangement
- Selected preset highlighted
- Responsive: on mobile, hide 3x3 option

---

## Task 4: WatchRoom main component

**Files:**
- Create: `src/components/react/WatchRoom.tsx`

Main page component with two modes:

**Setup mode:**
- LayoutPicker at top
- Active slot selector (click a slot to configure it)
- Search bar: searches all cameras, results dropdown
- Favorited cameras grid below for quick-add
- Slot timer selector (off/10s/30s/60s/5m)
- "Start Watching" button → switches to watch mode

**Watch mode:**
- CSS Grid fills viewport using the preset's grid template
- WatchSlot in each grid area
- Top toolbar: preset name, "Edit" button, "Share" (copies URL), "Exit"
- Shared view banner: "Viewing shared layout — Save as mine?"

---

## Task 5: Wire up page and nav

**Files:**
- Modify: `src/pages/favorites.astro` — swap FavoritesPage for WatchRoom
- Modify: `src/components/astro/Header.astro` — rename Favorites → Watch Room
- Remove: `src/components/react/FavoritesPage.tsx`

---

## Task 6: Build, deploy, verify

Build, patch wrangler.json, deploy to caltraffic.com.
Verify: /favorites loads Watch Room, layout presets work, share URL works.
