# CalTraffic.com V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken infrastructure (503s), redesign camera cards with condition icons, overhaul filter system, polish route viewer, curate featured cameras, and improve content/context across the site.

**Architecture:** Client-side parallel district fetching replaces the monolithic `/api/cameras/all` endpoint. A shared `ConditionIcons` component provides visual consistency between camera cards and filter chips. The filter bar is rebuilt from scratch with a two-row layout and segmented controls. All changes are backward-compatible — no data model changes needed.

**Tech Stack:** Astro 6, React 18, Tailwind CSS, Cloudflare Workers, Leaflet, SWR, nanostores

---

## File Structure

### New Files
- `src/components/react/ConditionIcons.tsx` — shared condition icon component (incidents/chains/delays) used by CameraCard, FeedCard, and FilterBar
- `src/components/react/FilterBarV2.tsx` — new two-row filter bar replacing FilterBar.tsx
- `src/lib/district-lookup.ts` — utility to map lat/lon to Caltrans district numbers

### Modified Files
- `src/hooks/use-cameras.ts` — parallel multi-district fetch
- `src/pages/api/cameras/[district].ts` — remove `all` case
- `src/stores/filters.ts` — replace toggle atoms with `feedType` segmented atom
- `src/components/react/CameraCard.tsx` — new card layout with ConditionIcons
- `src/components/react/RouteLiveView.tsx` — FeedCard redesign, route viewer polish
- `src/components/react/CameraGrid.tsx` — wire up new FilterBarV2, play-all state
- `src/components/react/MainContent.tsx` — swap FilterBar for FilterBarV2
- `src/components/react/CMSSign.tsx` — LED-like styling, remove postmile
- `src/components/react/VideoPlayer.tsx` — "Feed unavailable" state
- `src/components/react/RoutePlanner.tsx` — city picker toggle, route shield size, distance contrast
- `src/components/react/RouteMapView.tsx` — map legend
- `src/components/react/FeaturedCameras.tsx` — incident spotlight badge
- `src/lib/featured-cameras.ts` — add cameras to 60+
- `src/pages/reports.astro` or `src/components/react/TrafficReports.tsx` — context paragraphs
- `src/pages/about.astro` — data source info, refresh rates

### Removed Files
- `src/components/react/DistrictMapSelector.tsx` — replaced by dropdown
- `src/components/react/FilterBar.tsx` — replaced by FilterBarV2.tsx

---

## Task 1: Fix Infrastructure — Client-Side Parallel Fetch

**Files:**
- Modify: `src/hooks/use-cameras.ts`
- Modify: `src/pages/api/cameras/[district].ts`
- Create: `src/lib/district-lookup.ts`
- Modify: `src/hooks/use-route-planner.ts`

- [ ] **Step 1: Create district lookup utility**

Create `src/lib/district-lookup.ts`:

```typescript
import { DISTRICT_CENTERS } from './constants';

/** Find the closest districts to a lat/lon point, returns up to `count` district numbers */
export function findNearbyDistricts(lat: number, lon: number, count = 3): number[] {
  const distances = Object.entries(DISTRICT_CENTERS).map(([id, center]) => ({
    district: parseInt(id, 10),
    dist: Math.sqrt((lat - center.lat) ** 2 + (lon - center.lon) ** 2),
  }));
  distances.sort((a, b) => a.dist - b.dist);
  return distances.slice(0, count).map((d) => d.district);
}

/** Find all districts that a route corridor passes through */
export function findRouteDistricts(
  originLat: number, originLon: number,
  destLat: number, destLon: number,
): number[] {
  const originDistricts = findNearbyDistricts(originLat, originLon, 2);
  const destDistricts = findNearbyDistricts(destLat, destLon, 2);
  // Also check midpoint for long routes
  const midLat = (originLat + destLat) / 2;
  const midLon = (originLon + destLon) / 2;
  const midDistricts = findNearbyDistricts(midLat, midLon, 2);

  const all = new Set([...originDistricts, ...destDistricts, ...midDistricts]);
  return [...all].sort((a, b) => a - b);
}
```

- [ ] **Step 2: Rewrite useCameras to fetch districts in parallel**

Replace `src/hooks/use-cameras.ts`:

```typescript
import useSWR from 'swr';
import type { Camera } from '@/lib/schemas';

const districtFetcher = (url: string): Promise<Camera[]> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<Camera[]>;
  });

const ALL_DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

async function fetchAllDistricts(): Promise<Camera[]> {
  const results = await Promise.allSettled(
    ALL_DISTRICTS.map((d) =>
      fetch(`/api/cameras/${d}`).then((r) => {
        if (!r.ok) throw new Error(`D${d}: HTTP ${r.status}`);
        return r.json() as Promise<Camera[]>;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Camera[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

async function fetchDistricts(districts: number[]): Promise<Camera[]> {
  const results = await Promise.allSettled(
    districts.map((d) =>
      fetch(`/api/cameras/${d}`).then((r) => {
        if (!r.ok) throw new Error(`D${d}: HTTP ${r.status}`);
        return r.json() as Promise<Camera[]>;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Camera[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

/**
 * Fetch cameras. Pass a district number for a single district,
 * null for all districts, or an array for specific districts.
 */
export function useCameras(district: number | null | number[]) {
  const key = district === null
    ? 'cameras:all'
    : Array.isArray(district)
      ? `cameras:${district.join(',')}`
      : `/api/cameras/${district}`;

  const fetcher = () => {
    if (district === null) return fetchAllDistricts();
    if (Array.isArray(district)) return fetchDistricts(district);
    return districtFetcher(`/api/cameras/${district}`);
  };

  return useSWR<Camera[]>(key, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    fallbackData: [],
  });
}
```

- [ ] **Step 3: Remove the `all` case from the API endpoint**

In `src/pages/api/cameras/[district].ts`, find the handler section where `district === 'all'` is checked and remove it. The endpoint should only accept numeric district values 1-12. If `district` is not a valid number, return 400.

Find the GET handler and ensure it starts with:

```typescript
const districtParam = params.district;
const district = parseInt(districtParam!, 10);
if (isNaN(district) || district < 1 || district > 12) {
  return new Response(JSON.stringify({ error: 'District must be 1-12' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Remove any `if (districtParam === 'all')` branch and the `Promise.allSettled` across all districts.

- [ ] **Step 4: Update use-route-planner to fetch only corridor districts**

In `src/hooks/use-route-planner.ts`, import `findRouteDistricts` and change the camera fetch to only load districts along the route corridor:

```typescript
import { findRouteDistricts } from '@/lib/district-lookup';

// Inside the hook, replace useCameras(null) with:
const corridorDistricts = origin && destination
  ? findRouteDistricts(origin.lat, origin.lon, destination.lat, destination.lon)
  : null;

const { data: allCameras = [], isLoading: camerasLoading } = useCameras(corridorDistricts);
```

- [ ] **Step 5: Build and verify route viewer works**

Run: `npx astro build`
Expected: Clean build, no errors.

Then deploy and test: Folsom to Sacramento should now find cameras (only fetching District 3 instead of all 12).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-cameras.ts src/pages/api/cameras/[district].ts src/lib/district-lookup.ts src/hooks/use-route-planner.ts
git commit -m "fix: client-side parallel district fetch, removes /api/cameras/all

Fixes 503 Worker CPU limit errors. Cameras now fetched per-district
in parallel from the browser. Route planner only fetches corridor
districts for faster loading."
```

---

## Task 2: Create Shared ConditionIcons Component

**Files:**
- Create: `src/components/react/ConditionIcons.tsx`

- [ ] **Step 1: Create the ConditionIcons component**

```typescript
import type { ChainControl, LaneClosure, TravelTime, Incident } from '@/lib/schemas';

const CHAIN_TOOLTIP: Record<string, string> = {
  R1: 'Chain control R1 — Chains or snow tires required on drive wheels',
  R2: 'Chain control R2 — Chains required on ALL vehicles, no exceptions',
  R3: 'Chain control R3 — Highway closed to all traffic',
};

interface ConditionIconsProps {
  incidents?: { length: number }[];
  chainControls?: ChainControl[];
  travelTime?: TravelTime | null;
}

export function ConditionIcons({ incidents = [], chainControls = [], travelTime }: ConditionIconsProps) {
  const hasIncidents = incidents.length > 0;
  const hasChains = chainControls.length > 0;
  const hasDelay = travelTime && travelTime.delay > 2;

  if (!hasIncidents && !hasChains && !hasDelay) return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {hasIncidents && (
        <div
          className="flex flex-col items-center gap-0.5 cursor-help"
          title={`${incidents.length} incident${incidents.length > 1 ? 's' : ''} nearby — crash, construction, or hazard`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-[8px] font-bold text-red-400">{incidents.length}</span>
        </div>
      )}
      {hasChains && (
        <div
          className="flex flex-col items-center gap-0.5 cursor-help"
          title={CHAIN_TOOLTIP[chainControls[0].level] || `Chain control: ${chainControls[0].level}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
          </svg>
          <span className="text-[8px] font-bold text-blue-400">{chainControls[0].level}</span>
        </div>
      )}
      {hasDelay && (
        <div
          className="flex flex-col items-center gap-0.5 cursor-help"
          title={`Travel time on ${travelTime!.corridor}: currently ${Math.round(travelTime!.currentTime)} min vs typical ${Math.round(travelTime!.typicalTime)} min. Delay: ${Math.round(travelTime!.delay)} min.`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span className="text-[8px] font-bold text-amber-400">+{Math.round(travelTime!.delay)}m</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/react/ConditionIcons.tsx
git commit -m "feat: shared ConditionIcons component for cards and filters"
```

---

## Task 3: Redesign CameraCard (Camera Viewer)

**Files:**
- Modify: `src/components/react/CameraCard.tsx`

- [ ] **Step 1: Rewrite CameraCard with new layout**

Replace the entire `CameraCard` component. Key changes:
- Remove `ConditionBadges` import, add `ConditionIcons` import
- Remove red border logic
- Remove status indicators (green live dot, red incident triangle from the image overlay)
- Add ConditionIcons to top-right of info area
- Add red LIVE dot (small, non-blocking) on feed
- Camera name large, route shield next to it
- Fixed height card
- No `detectPlaceholder` change needed — keep the existing placeholder detection

The card structure becomes:

```
[Feed 38%]  | [Route] [Name]  ....  [ConditionIcons]
[LIVE] [#]  | [Direction · City]
            |
            | [Maps · Details · Zoom on Map]   [✓] [★]
```

The implementation should:
- Replace `ConditionBadges` usage with `ConditionIcons` positioned top-right
- Remove `hasIncidents` red border: just use `border-border/60` always
- Add `camera.hasVideo` red LIVE indicator on the image (position: absolute, top-left)
- Keep favorite star, keep `detectPlaceholder`, keep lazy loading
- Make camera name `text-sm font-semibold` (larger than current)

- [ ] **Step 2: Build and verify**

Run: `npx astro build`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/react/CameraCard.tsx
git commit -m "feat: redesign CameraCard — condition icons top-right, no jargon badges"
```

---

## Task 4: Redesign FeedCard (Route Viewer)

**Files:**
- Modify: `src/components/react/RouteLiveView.tsx`

- [ ] **Step 1: Update FeedCard to use ConditionIcons**

In `RouteLiveView.tsx`, update the `FeedCard` component:
- Import `ConditionIcons`
- Remove `ConditionBadges` import and usage
- Remove the `showMore`/`setShowMore` state and the More/Less button
- Remove the `hasIssues` conditional conditions section entirely
- Add `ConditionIcons` to the top-right of the info area, next to the camera name
- Make camera name `text-sm md:text-lg font-bold`
- Rename "Show on Map" to "Zoom on Map"
- Make check and star icons same size as condition icons (18px)
- Remove the `md:h-[200px]` fixed height — use natural aspect ratio with consistent padding
- Add red LIVE dot on feed area

- [ ] **Step 2: Update distance-between-cameras contrast**

Change the distance text from `text-muted-foreground/50` to `text-muted-foreground` for higher contrast in both dark and light mode.

- [ ] **Step 3: Build and verify**

Run: `npx astro build`

- [ ] **Step 4: Commit**

```bash
git add src/components/react/RouteLiveView.tsx
git commit -m "feat: redesign FeedCard — condition icons, no More/Less, higher contrast"
```

---

## Task 5: Rebuild Filter System

**Files:**
- Modify: `src/stores/filters.ts`
- Create: `src/components/react/FilterBarV2.tsx`
- Modify: `src/components/react/MainContent.tsx`
- Modify: `src/components/react/CameraGrid.tsx`
- Remove: `src/components/react/DistrictMapSelector.tsx` (stop importing)

- [ ] **Step 1: Update filter store**

Replace the toggle atoms in `src/stores/filters.ts`:

```typescript
import { atom } from 'nanostores';

export const selectedDistrict = atom<number | null>(null);
export const selectedRoute = atom<string | null>(null);
export const selectedCity = atom<string | null>(null);
export const selectedCounty = atom<string | null>(null);
export const searchQuery = atom<string>('');
export const viewMode = atom<'grid' | 'map'>('grid');

// Feed type: 'all' | 'live' | 'still' — replaces multiple toggle atoms
export const feedType = atom<'all' | 'live' | 'still'>('live');

// Condition filters — these match the ConditionIcons on cards
export const filterIncidents = atom<boolean>(false);
export const filterChains = atom<boolean>(false);
export const filterDelays = atom<boolean>(false);

// Play all state — action, not a filter
export const playAllLive = atom<boolean>(false);

// Track cameras with broken/unavailable images (detected client-side)
export const unavailableCameras = atom<Set<string>>(new Set());
export function markUnavailable(id: string) {
  const current = unavailableCameras.get();
  if (!current.has(id)) {
    const next = new Set(current);
    next.add(id);
    unavailableCameras.set(next);
  }
}

export function clearAllFilters() {
  selectedDistrict.set(null);
  selectedRoute.set(null);
  selectedCity.set(null);
  selectedCounty.set(null);
  searchQuery.set('');
  feedType.set('live');
  filterIncidents.set(false);
  filterChains.set(false);
  filterDelays.set(false);
}
```

- [ ] **Step 2: Create FilterBarV2 component**

Create `src/components/react/FilterBarV2.tsx` implementing the two-row design:
- Row 1: Play All Live button (green), search input (no icon), Grid/Map toggle, density selector
- Row 2: All/Live/Still segmented control, Incidents/Chains/Delays chips (with matching icons from ConditionIcons), District/Route/City dropdowns, Clear all
- Mobile: Row 2 becomes horizontally scrollable with fade edges
- Active condition chips highlight in their icon color with X to dismiss
- Camera count below on mobile

The component reads from the new store atoms (`feedType`, `filterIncidents`, `filterChains`, `filterDelays`) and writes back on click.

- [ ] **Step 3: Update CameraGrid to use new filter atoms**

In `src/components/react/CameraGrid.tsx`, update the filter logic:
- Import new atoms: `feedType`, `filterIncidents`, `filterChains`, `filterDelays`, `playAllLive`
- Replace `videoOnly`, `noStale`, `noUnavailable`, `withIncidents`, `withSigns` with:

```typescript
const feed = useStore(feedType);
const incidents = useStore(filterIncidents);
const chains = useStore(filterChains);
const delays = useStore(filterDelays);
const isPlayAll = useStore(playAllLive);

// In filter logic:
if (feed === 'live' && (!cam.hasVideo || cam.isStale || !cam.inService)) return false;
if (feed === 'still' && cam.hasVideo) return false;
if (incidents && cam.nearbyIncidents.length === 0) return false;
if (chains && cam.chainControls.length === 0) return false;
if (delays && (!cam.travelTime || cam.travelTime.delay <= 2)) return false;
```

- Remove `liveGridCameras` state and Live Grid UI (it's been moved to a separate feature)
- Pass `isPlayAll` to camera cards/video players

- [ ] **Step 4: Update MainContent to use FilterBarV2**

In `src/components/react/MainContent.tsx`:
- Replace `FilterBar` import with `FilterBarV2`
- Remove `showFavoritesOnly` state (Favorites is a separate page now)
- Remove `onToggleFavoritesOnly` prop

- [ ] **Step 5: Remove DistrictMapSelector import from FilterBar**

The old FilterBar.tsx is no longer imported anywhere. `DistrictMapSelector.tsx` is no longer needed. Remove the import references but don't delete the files yet (they'll be cleaned up after verification).

- [ ] **Step 6: Build and verify**

Run: `npx astro build`

- [ ] **Step 7: Commit**

```bash
git add src/stores/filters.ts src/components/react/FilterBarV2.tsx src/components/react/CameraGrid.tsx src/components/react/MainContent.tsx
git commit -m "feat: filter system overhaul — two-row bar, segmented controls, condition chips"
```

---

## Task 6: Route Viewer Polish

**Files:**
- Modify: `src/components/react/RoutePlanner.tsx`
- Modify: `src/components/react/CMSSign.tsx`
- Modify: `src/components/react/VideoPlayer.tsx`
- Modify: `src/components/react/RouteMapView.tsx`

- [ ] **Step 1: City picker toggle behavior**

In `RoutePlanner.tsx`, update the city button click handler so clicking an already-picked "from" city deselects it:

```typescript
if (pickStep === 'from') {
  setPickedFrom(city);
  setPickStep('to');
} else if (pickStep === 'to' && isPickedFrom) {
  // Toggle: clicking the from city again deselects it
  setPickedFrom(null);
  setPickStep('from');
} else if (pickStep === 'to' && !isPickedFrom) {
  // ... existing route logic
}
```

- [ ] **Step 2: Route shield size increase**

In the FeedCard (RouteLiveView.tsx), change `<RouteShield route={camera.route} size="md" />` to `size="lg"` for the route viewer cards.

- [ ] **Step 3: CMS sign LED-like styling**

Update `src/components/react/CMSSign.tsx`:
- Darker black background: `bg-[#0a0a0a]`
- Amber glow effect: `text-shadow: 0 0 6px rgba(245, 158, 11, 0.4)`
- Tighter letter spacing: `tracking-[0.15em]` instead of `tracking-widest`
- Remove `PM X.X` postmile from both compact and full modes

- [ ] **Step 4: Video failed state**

In `src/components/react/VideoPlayer.tsx`, when the HLS stream fails to load, show a "Feed unavailable" overlay instead of a black screen:

```tsx
{videoError && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
    <span className="text-xs text-muted-foreground">Feed unavailable</span>
  </div>
)}
```

- [ ] **Step 5: Map legend**

In `src/components/react/RouteMapView.tsx`, add a small collapsible legend in the bottom-right corner:

```tsx
<div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-card/95 backdrop-blur-sm border border-border px-3 py-2 text-[10px]">
  <div className="flex items-center gap-2 mb-1">
    <span className="w-3 h-3 rounded-full bg-green-500 border border-white"></span>
    <span>Camera (live)</span>
  </div>
  <div className="flex items-center gap-2 mb-1">
    <span className="w-3 h-3 rounded-full bg-gray-500 border border-white"></span>
    <span>Camera (still)</span>
  </div>
  <div className="flex items-center gap-2 mb-1">
    <span className="w-3 h-3 rounded-full bg-red-500 border border-white"></span>
    <span>Camera (incident)</span>
  </div>
  <div className="flex items-center gap-2 mb-1">
    <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-white text-[8px] text-white font-bold flex items-center justify-center">A</span>
    <span>Start</span>
  </div>
  <div className="flex items-center gap-2">
    <span className="w-4 h-4 rounded-full bg-red-500 border-2 border-white text-[8px] text-white font-bold flex items-center justify-center">B</span>
    <span>End</span>
  </div>
</div>
```

- [ ] **Step 6: Build and verify**

Run: `npx astro build`

- [ ] **Step 7: Commit**

```bash
git add src/components/react/RoutePlanner.tsx src/components/react/CMSSign.tsx src/components/react/VideoPlayer.tsx src/components/react/RouteMapView.tsx
git commit -m "feat: route viewer polish — city toggle, LED signs, map legend, video fallback"
```

---

## Task 7: Featured Cameras — Curation & Incident Spotlight

**Files:**
- Modify: `src/lib/featured-cameras.ts`
- Modify: `src/components/react/FeaturedCameras.tsx`

- [ ] **Step 1: Research and add cameras to reach 60+**

Web search for famous California traffic cameras, notorious bottleneck spots, scenic views. Add entries to `FEATURED_CAMERAS` array targeting:
- San Francisco iconic spots (Upper Deck Trust Tower, Pier 48, Crystal Springs, Junction 80/50)
- LA notorious bottlenecks (I-10/I-110, I-405/I-10, I-5/SR-134)
- Scenic ocean views
- Rio Vista Bridge, Truckee Bypass
- High-quality video feeds
- Cameras that frequently have incidents

Each entry needs: `name`, `description` (with context — why it's notable), `category`, `route`, `district`, `matchTerms`.

- [ ] **Step 2: Add Incident Spotlight badge**

In `src/components/react/FeaturedCameras.tsx`, cross-reference matched featured cameras with their enriched data. If a camera has `nearbyIncidents.length > 0`, show a "Happening Now" badge:

```tsx
{featured.camera.nearbyIncidents?.length > 0 && (
  <span className="absolute top-2 right-2 z-10 rounded-full bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 animate-pulse">
    Happening Now
  </span>
)}
```

This requires changing the data flow: `FeaturedCameras` currently uses `useCameras(null)` which returns basic `Camera` objects. It needs `useEnrichedCameras(null)` to get incident data. Update the import and data source.

- [ ] **Step 3: Build and verify**

Run: `npx astro build`

- [ ] **Step 4: Commit**

```bash
git add src/lib/featured-cameras.ts src/components/react/FeaturedCameras.tsx
git commit -m "feat: 60+ featured cameras with incident spotlight badges"
```

---

## Task 8: Content & Context Improvements

**Files:**
- Modify: `src/components/react/TrafficReports.tsx`
- Modify: `src/pages/about.astro`

- [ ] **Step 1: Add report context paragraphs**

In `src/components/react/TrafficReports.tsx`, add introductory text before each report section explaining what the report type is, where the data comes from, and what the fields mean. Example for incidents:

```tsx
<div className="mb-4">
  <p className="text-sm text-muted-foreground">
    Real-time incident reports from the California Highway Patrol (CHP) Traffic Incident Management System (TIMS).
    Includes collisions, hazards, construction, and road closures across all California state highways.
  </p>
</div>
```

- [ ] **Step 2: Expand About page**

In `src/pages/about.astro`, add sections covering:
- **Data sources**: Caltrans CWWP2 (cameras, CMS signs, chain control, lane closures), CHP TIMS (incidents), NWS (weather alerts)
- **Camera refresh rates**: Static images update every 1-5 minutes depending on district. Live video streams in real-time where available.
- **What "stale" means**: A camera is marked stale if its image hasn't updated in 15+ minutes. This can mean the camera is offline, under maintenance, or experiencing network issues.
- **Camera quality**: Varies widely by age and district. Some cameras are HD, others are low-resolution legacy units.
- **Chain control levels**: R1 (chains/snow tires on drive wheels), R2 (chains on all vehicles), R3 (road closed)
- **Data lag**: Camera images are near-real-time but can be 1-5 minutes behind. Incident reports are updated as CHP dispatchers log events.

- [ ] **Step 3: Build and verify**

Run: `npx astro build`

- [ ] **Step 4: Commit**

```bash
git add src/components/react/TrafficReports.tsx src/pages/about.astro
git commit -m "feat: add context to reports, expand about page with data source info"
```

---

## Task 9: Deploy & Verify

**Files:**
- No new files — deploy pipeline

- [ ] **Step 1: Full build**

```bash
npx astro build
```

- [ ] **Step 2: Patch wrangler.json and deploy**

```bash
python3 -c "
import json
with open('dist/server/wrangler.json') as f:
    d = json.load(f)
d.pop('pages_build_output_dir', None)
for ns in d.get('kv_namespaces', []):
    if ns.get('binding') == 'SESSION' and 'id' not in ns:
        ns['id'] = '0bc102b2847d40b395bbb966de1d1b10'
with open('dist/server/wrangler.json', 'w') as f:
    json.dump(d, f, indent=2)
"
cd dist/server && npx wrangler deploy --config wrangler.json
```

- [ ] **Step 3: Verify all pages**

Test each page returns HTTP 200:
- `https://caltraffic.com/` (Route Viewer)
- `https://caltraffic.com/cameras` (Camera Viewer)
- `https://caltraffic.com/favorites`
- `https://caltraffic.com/featured`
- `https://caltraffic.com/reports`
- `https://caltraffic.com/stats`

- [ ] **Step 4: Verify Route Viewer works**

Test Folsom to Sacramento — should find cameras (no more "no cameras found").
Test San Francisco to Bakersfield — should load cameras across multiple districts.

- [ ] **Step 5: Verify no 503 errors**

Hit `/api/cameras/3` and `/api/cameras/7` individually — both should return 200.
Confirm `/api/cameras/all` returns 400 (removed).

- [ ] **Step 6: Commit deploy state**

```bash
git add -A
git commit -m "chore: caltraffic v2 deployed — infrastructure fix, card redesign, filter overhaul"
```
