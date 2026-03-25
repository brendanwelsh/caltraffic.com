# California Traffic Lens Feature Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add adjustable camera grid density, enhanced filtering (county, road conditions), a visual district map selector, surface chain control/closures/travel times data already being fetched, and build a "Route Camera Planner" feature that shows cameras along a travel path in order with traffic conditions.

**Architecture:** Six independent feature areas that build on the existing Astro + React + Nanostores stack. Each feature extends existing components rather than replacing them. The Route Planner is the most complex — it introduces a new page, a new API endpoint for route geometry (using OSRM free routing API), and client-side logic to match cameras along a polyline. PeMS data is descoped for now (requires separate account/API key approval) but the architecture is designed so it can slot in later.

**Tech Stack:** Astro 6, React 19, Nanostores, Leaflet, Tailwind CSS 4, SWR, Zod, Cloudflare Workers, OSRM (free routing API)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/stores/grid.ts` | Grid density preference store (columns count) |
| `src/components/react/GridDensityControl.tsx` | Slider/button UI for grid column count |
| `src/components/react/DistrictMapSelector.tsx` | Clickable SVG district map for district selection |
| `src/components/react/CountyFilter.tsx` | County dropdown filter derived from selected district |
| `src/components/react/ConditionBadges.tsx` | Chain control, closure, and travel time badges for camera cards |
| `src/components/react/RoutePlanner.tsx` | Main route planner component (origin/destination inputs, route display) |
| `src/components/react/RouteCameraList.tsx` | Ordered list of cameras along a route with conditions |
| `src/components/react/RouteMapView.tsx` | Map showing route polyline with camera markers |
| `src/hooks/use-chain-control.ts` | SWR hook for chain control data |
| `src/hooks/use-closures.ts` | SWR hook for lane closure data |
| `src/hooks/use-travel-times.ts` | SWR hook for travel time data |
| `src/hooks/use-route-planner.ts` | Hook orchestrating route geometry fetch + camera matching |
| `src/lib/route-matching.ts` | Logic to find cameras along a polyline (point-to-line distance) |
| `src/pages/route.astro` | Route planner page |
| `functions/api/route.ts` | Cloudflare Worker that proxies OSRM route request |

### Modified Files
| File | Changes |
|------|---------|
| `src/stores/filters.ts` | Add `selectedCounty` atom |
| `src/lib/constants.ts` | Add `COUNTY_TO_DISTRICT` reverse lookup |
| `src/components/react/FilterBar.tsx` | Add county filter, grid density control, district map toggle |
| `src/components/react/CameraGrid.tsx` | Use dynamic grid columns from store, add county filtering, add condition badges |
| `src/components/react/CameraCard.tsx` | Show condition badges (chain control, closures, travel time) |
| `src/components/react/CameraDetailDialog.tsx` | Show chain control, closures, travel time sections |
| `src/hooks/use-enriched-cameras.ts` | Enrich with chain control, closures, travel times |
| `src/lib/matching.ts` | (Already has matching functions — no changes needed) |
| `src/lib/schemas.ts` | (Already has all schemas — no changes needed) |
| `src/components/react/MainContent.tsx` | Wire up new data hooks, pass to children |
| `src/components/react/MapViewInner.tsx` | Add chain control and closure markers, route polyline layer |
| `src/components/astro/Header.astro` | Add nav link to Route Planner page |
| `src/hooks/use-url-state.ts` | Add county param |

---

## Task 1: Grid Density Control

**Files:**
- Create: `src/stores/grid.ts`
- Create: `src/components/react/GridDensityControl.tsx`
- Modify: `src/components/react/CameraGrid.tsx:212`
- Modify: `src/components/react/FilterBar.tsx:155-174`

- [ ] **Step 1: Create grid density store**

```typescript
// src/stores/grid.ts
import { atom } from 'nanostores';

export type GridDensity = 1 | 2 | 3 | 4 | 5 | 6;

const STORAGE_KEY = 'california-traffic-lens-grid-density';

function loadDensity(): GridDensity {
  if (typeof window === 'undefined') return 3;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const n = parseInt(saved, 10);
    if (n >= 1 && n <= 6) return n as GridDensity;
  }
  return 3;
}

export const gridDensity = atom<GridDensity>(loadDensity());

gridDensity.subscribe((value) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(value));
  }
});
```

- [ ] **Step 2: Create GridDensityControl component**

```tsx
// src/components/react/GridDensityControl.tsx
import { useStore } from '@nanostores/react';
import { gridDensity, type GridDensity } from '@/stores/grid';

const DENSITY_OPTIONS: { value: GridDensity; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
];

export function GridDensityControl() {
  const density = useStore(gridDensity);

  return (
    <div className="flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
      <div className="flex rounded-md border border-input overflow-hidden">
        {DENSITY_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => gridDensity.set(value)}
            className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              density === value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground'
            }`}
            title={`${value} column${value > 1 ? 's' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire grid density into CameraGrid**

In `src/components/react/CameraGrid.tsx`, add the import and replace the hardcoded grid classes:

```tsx
// Add import at top:
import { useStore as useStoreGrid } from '@nanostores/react';
import { gridDensity } from '@/stores/grid';

// Inside the CameraGrid function, add:
const columns = useStoreGrid(gridDensity);

// Replace the grid className (line ~212):
// OLD:
// <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
// NEW:
const gridColsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
};

// Then in the JSX:
<div className={`grid gap-3 ${gridColsClass[columns]}`}>
```

- [ ] **Step 4: Add GridDensityControl to FilterBar**

In `src/components/react/FilterBar.tsx`, add the control next to the view toggle:

```tsx
// Add import:
import { GridDensityControl } from './GridDensityControl';

// After the view toggle div (line ~174), before the closing </div> of Row 1:
<GridDensityControl />
```

- [ ] **Step 5: Test and commit**

Run: `npm run dev` and verify:
- Grid density buttons appear next to view toggle
- Clicking 1-6 changes grid columns immediately
- Preference persists on page reload (localStorage)
- Responsive breakpoints still work per density level

```bash
git add src/stores/grid.ts src/components/react/GridDensityControl.tsx src/components/react/CameraGrid.tsx src/components/react/FilterBar.tsx
git commit -m "feat: add adjustable grid density control (1-6 columns)"
```

---

## Task 2: County Filter

**Files:**
- Modify: `src/stores/filters.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/components/react/FilterBar.tsx`
- Modify: `src/components/react/CameraGrid.tsx`
- Modify: `src/hooks/use-url-state.ts`

- [ ] **Step 1: Add selectedCounty atom to filter store**

In `src/stores/filters.ts`, add after line 7:

```typescript
export const selectedCounty = atom<string | null>(null);
```

- [ ] **Step 2: Add COUNTY_TO_DISTRICT reverse lookup**

In `src/lib/constants.ts`, add at the end:

```typescript
// Reverse lookup: county name → district number
export const COUNTY_TO_DISTRICT: Record<string, number> = Object.entries(DISTRICT_COUNTIES)
  .flatMap(([district, counties]) =>
    counties.map((county) => [county, parseInt(district, 10)] as const)
  )
  .reduce((acc, [county, district]) => {
    acc[county] = district;
    return acc;
  }, {} as Record<string, number>);

// All counties sorted alphabetically for a given district (or all if null)
export function getCountiesForDistrict(district: number | null): string[] {
  if (district === null) {
    return Object.values(DISTRICT_COUNTIES).flat().sort();
  }
  return (DISTRICT_COUNTIES[district] ?? []).sort();
}
```

- [ ] **Step 3: Add county dropdown to FilterBar**

In `src/components/react/FilterBar.tsx`:

```tsx
// Add imports:
import { selectedCounty } from '@/stores/filters';
import { getCountiesForDistrict } from '@/lib/constants';

// Inside FilterBar function, add:
const county = useStore(selectedCounty);
const availableCounties = useMemo(() => getCountiesForDistrict(district), [district]);

// After the district <select> (line ~138), add:
<select
  value={county ?? ''}
  onChange={(e) => selectedCounty.set(e.target.value || null)}
  className="h-9 rounded-lg border border-input bg-background px-2 pr-6 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring appearance-none shrink-0 max-w-[140px] sm:max-w-[160px]"
  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
>
  <option value="">All Counties</option>
  {availableCounties.map((c) => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>

// In clearAllFilters, add:
selectedCounty.set(null);

// In hasAnyFilter, add !!county to the conditions

// Add county chip after the city chip:
{county && (
  <button onClick={() => selectedCounty.set(null)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-1 text-[10px] font-medium text-primary whitespace-nowrap">
    {county} Co.
    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  </button>
)}
```

- [ ] **Step 4: Add county filter to CameraGrid**

In `src/components/react/CameraGrid.tsx`:

```tsx
// Add import:
import { selectedCounty } from '@/stores/filters';

// Inside CameraGrid, add:
const countyFilter = useStore(selectedCounty);

// In the filter chain (line ~57), add after the cityFilter check:
if (countyFilter && cam.county !== countyFilter) return false;

// Add countyFilter to the useMemo dependency array
```

- [ ] **Step 5: Add county to URL state**

In `src/hooks/use-url-state.ts`:

```tsx
// Add import:
import { selectedCounty } from '@/stores/filters';

// In the hook, add:
const county = useStore(selectedCounty);

// In the URL-read effect:
const countyParam = params.get('county');
if (countyParam) selectedCounty.set(countyParam);

// In the URL-write effect:
if (county) params.set('county', county);

// Add county to the sync effect dependency array
```

- [ ] **Step 6: Test and commit**

Verify:
- County dropdown appears after district dropdown
- Changes counties list when district changes
- Filtering by county works
- County persists in URL
- Clear button resets county

```bash
git add src/stores/filters.ts src/lib/constants.ts src/components/react/FilterBar.tsx src/components/react/CameraGrid.tsx src/hooks/use-url-state.ts
git commit -m "feat: add county filter with URL state persistence"
```

---

## Task 3: District Map Selector

**Files:**
- Create: `src/components/react/DistrictMapSelector.tsx`
- Modify: `src/components/react/FilterBar.tsx`

- [ ] **Step 1: Create DistrictMapSelector component**

This renders a simplified SVG map of California's 12 Caltrans districts as clickable regions. Each region is an approximate polygon positioned by district center coordinates, rendered as a Leaflet overlay in a small inline map.

```tsx
// src/components/react/DistrictMapSelector.tsx
import { useStore } from '@nanostores/react';
import { selectedDistrict } from '@/stores/filters';
import { selectedCounty } from '@/stores/filters';
import { selectedRoute, selectedCity } from '@/stores/filters';
import { DISTRICTS, DISTRICT_CENTERS } from '@/lib/constants';

const DISTRICT_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#6366f1', 3: '#3b82f6',
  4: '#06b6d4', 5: '#14b8a6', 6: '#22c55e',
  7: '#eab308', 8: '#f97316', 9: '#ef4444',
  10: '#ec4899', 11: '#a855f7', 12: '#f59e0b',
};

// Simplified district boundary polygons (SVG viewBox: 0 0 400 500)
// Mapped from lat/lon to approximate pixel positions
function latLonToSvg(lat: number, lon: number): { x: number; y: number } {
  // California bounds: lat 32.5-42, lon -124.5 to -114
  const x = ((lon - (-124.5)) / ((-114) - (-124.5))) * 400;
  const y = ((42 - lat) / (42 - 32.5)) * 500;
  return { x, y };
}

export function DistrictMapSelector({ onClose }: { onClose: () => void }) {
  const current = useStore(selectedDistrict);

  const handleSelect = (d: number) => {
    selectedDistrict.set(d === current ? null : d);
    selectedCounty.set(null);
    selectedRoute.set(null);
    selectedCity.set(null);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl p-3" style={{ width: 280 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">Select District</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <svg viewBox="0 0 400 500" className="w-full h-auto">
        {/* Background */}
        <rect width="400" height="500" fill="transparent" />

        {/* District regions as circles positioned by center coordinates */}
        {Object.entries(DISTRICT_CENTERS).map(([id, center]) => {
          const d = parseInt(id, 10);
          const { x, y } = latLonToSvg(center.lat, center.lon);
          const isSelected = current === d;
          const color = DISTRICT_COLORS[d] ?? '#666';

          return (
            <g key={d} onClick={() => handleSelect(d)} className="cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 28 : 22}
                fill={color}
                fillOpacity={isSelected ? 0.5 : 0.2}
                stroke={color}
                strokeWidth={isSelected ? 3 : 1.5}
                className="transition-all hover:fill-opacity-40"
              />
              <text
                x={x}
                y={y - 4}
                textAnchor="middle"
                fill={isSelected ? 'white' : color}
                fontSize="11"
                fontWeight="bold"
              >
                D{d}
              </text>
              <text
                x={x}
                y={y + 9}
                textAnchor="middle"
                fill={isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)'}
                fontSize="7"
              >
                {DISTRICTS[d].description.split('(')[0].trim().split('/')[0].trim()}
              </text>
            </g>
          );
        })}
      </svg>
      {current && (
        <button
          onClick={() => { selectedDistrict.set(null); onClose(); }}
          className="mt-2 w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          Clear district selection
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add map toggle button to FilterBar**

In `src/components/react/FilterBar.tsx`:

```tsx
// Add import:
import { DistrictMapSelector } from './DistrictMapSelector';

// Inside FilterBar, add state:
const [showDistrictMap, setShowDistrictMap] = useState(false);

// After the district <select>, add a map button:
<div className="relative shrink-0">
  <button
    onClick={() => setShowDistrictMap((v) => !v)}
    className={cn(
      'inline-flex h-9 items-center px-2 rounded-lg border transition-colors',
      showDistrictMap ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent text-muted-foreground'
    )}
    title="District map"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 3 7 7" /><path d="m14 21-7-7" /><path d="m3 21 18-18" /><path d="M21 14v7h-7" /><path d="M3 10V3h7" />
    </svg>
  </button>
  {showDistrictMap && <DistrictMapSelector onClose={() => setShowDistrictMap(false)} />}
</div>
```

- [ ] **Step 3: Test and commit**

Verify:
- Map button appears next to district dropdown
- Clicking opens a floating map panel with all 12 districts
- Clicking a district selects it (updates dropdown, filters cameras)
- Clicking the same district deselects it
- Close button and "Clear" button work

```bash
git add src/components/react/DistrictMapSelector.tsx src/components/react/FilterBar.tsx
git commit -m "feat: add visual district map selector"
```

---

## Task 4: Surface Chain Control, Closures, and Travel Times

**Files:**
- Create: `src/hooks/use-chain-control.ts`
- Create: `src/hooks/use-closures.ts`
- Create: `src/hooks/use-travel-times.ts`
- Create: `src/components/react/ConditionBadges.tsx`
- Modify: `src/hooks/use-enriched-cameras.ts`
- Modify: `src/components/react/CameraCard.tsx`
- Modify: `src/components/react/CameraDetailDialog.tsx`

- [ ] **Step 1: Create the three new data hooks**

```typescript
// src/hooks/use-chain-control.ts
import useSWR from 'swr';
import type { ChainControl } from '@/lib/schemas';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useChainControl(district: number | null) {
  const key = district ? `/api/chain-control/${district}` : null;
  return useSWR<ChainControl[]>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
```

```typescript
// src/hooks/use-closures.ts
import useSWR from 'swr';
import type { LaneClosure } from '@/lib/schemas';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useClosures(district: number | null) {
  const key = district ? `/api/closures/${district}` : null;
  return useSWR<LaneClosure[]>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
```

```typescript
// src/hooks/use-travel-times.ts
import useSWR from 'swr';
import type { TravelTime } from '@/lib/schemas';
import { TRAVEL_TIME_DISTRICTS } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTravelTimes(district: number | null) {
  const hasData = district !== null && TRAVEL_TIME_DISTRICTS.has(district);
  const key = hasData ? `/api/travel-times/${district}` : null;
  return useSWR<TravelTime[]>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
```

- [ ] **Step 2: Extend EnrichedCamera and use-enriched-cameras hook**

Replace `src/hooks/use-enriched-cameras.ts`:

```typescript
import { useMemo } from 'react';
import { useCameras } from './use-cameras';
import { useCMS } from './use-cms';
import { useIncidents } from './use-incidents';
import { useWeatherAlerts } from './use-weather';
import { useChainControl } from './use-chain-control';
import { useClosures } from './use-closures';
import { useTravelTimes } from './use-travel-times';
import {
  matchCMSToCamera,
  matchIncidentsToCamera,
  matchClosuresToCamera,
  matchChainControlToCamera,
  matchTravelTimeToCamera,
} from '@/lib/matching';
import type { Camera, CMS, Incident, WeatherAlert, ChainControl, LaneClosure, TravelTime } from '@/lib/schemas';

export interface EnrichedCamera extends Camera {
  nearbyCMS: CMS[];
  nearbyIncidents: Incident[];
  weatherAlerts: WeatherAlert[];
  chainControls: ChainControl[];
  nearbyClosures: LaneClosure[];
  travelTime: TravelTime | null;
}

export function useEnrichedCameras(district: number | null) {
  const { data: cameras = [], error: camerasError, isLoading: camerasLoading } = useCameras(district);
  const { data: cmsList = [] } = useCMS(district);
  const { data: incidents = [] } = useIncidents();
  const { data: weatherAlerts = [] } = useWeatherAlerts();
  const { data: chainControls = [] } = useChainControl(district);
  const { data: closures = [] } = useClosures(district);
  const { data: travelTimes = [] } = useTravelTimes(district);

  const enrichedCameras = useMemo(() => {
    if (!cameras.length) return [];

    return cameras
      .filter((c) => c.inService)
      .map((camera): EnrichedCamera => ({
        ...camera,
        nearbyCMS: matchCMSToCamera(camera, cmsList),
        nearbyIncidents: matchIncidentsToCamera(camera, incidents),
        weatherAlerts: weatherAlerts,
        chainControls: matchChainControlToCamera(camera, chainControls),
        nearbyClosures: matchClosuresToCamera(camera, closures),
        travelTime: matchTravelTimeToCamera(camera, travelTimes),
      }));
  }, [cameras, cmsList, incidents, weatherAlerts, chainControls, closures, travelTimes]);

  return {
    cameras: enrichedCameras,
    isLoading: camerasLoading,
    error: camerasError,
    totalCount: cameras.length,
  };
}
```

- [ ] **Step 3: Create ConditionBadges component**

```tsx
// src/components/react/ConditionBadges.tsx
import type { ChainControl, LaneClosure, TravelTime } from '@/lib/schemas';

interface ConditionBadgesProps {
  chainControls: ChainControl[];
  closures: LaneClosure[];
  travelTime: TravelTime | null;
  compact?: boolean;
}

export function ConditionBadges({ chainControls, closures, travelTime, compact = true }: ConditionBadgesProps) {
  if (chainControls.length === 0 && closures.length === 0 && !travelTime) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chainControls.length > 0 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {compact ? chainControls[0].level : `Chains: ${chainControls[0].level}`}
        </span>
      )}
      {closures.length > 0 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-orange-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          {compact ? `${closures.length} closure${closures.length > 1 ? 's' : ''}` : `${closures.length} lane closure${closures.length > 1 ? 's' : ''}`}
        </span>
      )}
      {travelTime && (
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${
          travelTime.delay > 10
            ? 'bg-red-500/15 border-red-500/30 text-red-400'
            : travelTime.delay > 5
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              : 'bg-green-500/15 border-green-500/30 text-green-400'
        }`}>
          {compact
            ? `${travelTime.delay > 0 ? '+' : ''}${Math.round(travelTime.delay)}m`
            : `${travelTime.corridor}: ${Math.round(travelTime.currentTime)}m (typical ${Math.round(travelTime.typicalTime)}m)`
          }
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add badges to CameraCard**

Read `CameraCard.tsx` first, then add the badges. In the card's metadata area (after direction/city info), add:

```tsx
// Add import:
import { ConditionBadges } from './ConditionBadges';

// In the card JSX, after the location/status indicators, add:
<ConditionBadges
  chainControls={camera.chainControls}
  closures={camera.nearbyClosures}
  travelTime={camera.travelTime}
/>
```

- [ ] **Step 5: Add detailed conditions to CameraDetailDialog**

In `src/components/react/CameraDetailDialog.tsx`, add new sections after the Nearby Incidents section:

```tsx
// Add import:
import { ConditionBadges } from './ConditionBadges';

// After the nearby incidents section, add:

{/* Chain Control */}
{camera.chainControls.length > 0 && (
  <div>
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">Chain Control</h4>
    <div className="space-y-1.5">
      {camera.chainControls.map((cc) => (
        <div key={cc.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-400">{cc.level}</span>
            <span className="text-muted-foreground">{cc.location}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{cc.status}</p>
        </div>
      ))}
    </div>
  </div>
)}

{/* Lane Closures */}
{camera.nearbyClosures.length > 0 && (
  <div>
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">Lane Closures</h4>
    <div className="space-y-1.5">
      {camera.nearbyClosures.map((cl) => (
        <div key={cl.id} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5 text-sm">
          <div className="font-medium">{cl.location}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {cl.closureType} — {cl.lanesAffected}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {cl.startTime} to {cl.endTime}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{/* Travel Time */}
{camera.travelTime && (
  <div>
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">Travel Time</h4>
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-sm">
      <div className="font-medium">{camera.travelTime.corridor}</div>
      <div className="mt-1 flex gap-4 text-xs">
        <span>Current: <strong>{Math.round(camera.travelTime.currentTime)} min</strong></span>
        <span className="text-muted-foreground">Typical: {Math.round(camera.travelTime.typicalTime)} min</span>
        {camera.travelTime.delay > 0 && (
          <span className="text-red-400">+{Math.round(camera.travelTime.delay)} min delay</span>
        )}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Test and commit**

Verify:
- Condition badges appear on camera cards when data exists
- Detail dialog shows chain control, closures, travel times
- Districts without certain data (e.g., no RWIS for D7) don't error
- Travel time districts (3, 8, 11, 12) show delay info

```bash
git add src/hooks/use-chain-control.ts src/hooks/use-closures.ts src/hooks/use-travel-times.ts src/components/react/ConditionBadges.tsx src/hooks/use-enriched-cameras.ts src/components/react/CameraCard.tsx src/components/react/CameraDetailDialog.tsx
git commit -m "feat: surface chain control, lane closures, and travel times on camera cards and detail view"
```

---

## Task 5: Enhanced Map Layers (Chain Control + Closures)

**Files:**
- Modify: `src/components/react/MapViewInner.tsx`
- Modify: `src/components/react/CameraGrid.tsx`

- [ ] **Step 1: Pass chain control and closures to MapView**

In `src/components/react/CameraGrid.tsx`, the MapView already receives cameras, cmsSigns, incidents. Add chain control and closures:

```tsx
// Add imports for hooks:
import { useChainControl } from '@/hooks/use-chain-control';
import { useClosures } from '@/hooks/use-closures';

// Inside CameraGrid, add after existing hook calls:
const { data: chainControls = [] } = useChainControl(district);
const { data: closures = [] } = useClosures(district);

// Update MapView JSX:
<MapView
  cameras={filteredCameras}
  cmsSigns={filteredCMS}
  incidents={filteredIncidents}
  chainControls={chainControls}
  closures={closures}
  onCameraClick={handleCameraClick}
/>
```

- [ ] **Step 2: Update MapView wrapper to pass through new props**

In `src/components/react/MapView.tsx`, add chainControls and closures to the props interface and pass them through to MapViewInner.

- [ ] **Step 3: Add chain control and closure markers to MapViewInner**

In `src/components/react/MapViewInner.tsx`:

```tsx
// Update the MapViewProps interface:
import type { ChainControl, LaneClosure } from '@/lib/schemas';

interface MapViewProps {
  cameras: EnrichedCamera[];
  cmsSigns?: CMS[];
  incidents?: Incident[];
  chainControls?: ChainControl[];
  closures?: LaneClosure[];
  onCameraClick?: (camera: EnrichedCamera) => void;
}

// Add new layer refs:
const chainControlLayerRef = useRef<L.LayerGroup | null>(null);
const closureLayerRef = useRef<L.LayerGroup | null>(null);

// In the map init useEffect, add:
chainControlLayerRef.current = L.layerGroup().addTo(map);
closureLayerRef.current = L.layerGroup().addTo(map);

// Add new icon creators:
function createChainControlIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-chain-marker',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 3px;
      background: #1e40af; border: 1.5px solid #3b82f6;
      box-shadow: 0 0 6px rgba(59,130,246,0.5);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: white; font-weight: bold;
    ">C</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function createClosureIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-closure-marker',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 3px;
      background: #c2410c; border: 1.5px solid #f97316;
      box-shadow: 0 0 6px rgba(249,115,22,0.5);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: white; font-weight: bold;
    ">X</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Add useEffect for chain controls:
useEffect(() => {
  if (!mapInstance.current || !chainControlLayerRef.current) return;
  chainControlLayerRef.current.clearLayers();

  (chainControls ?? []).forEach((cc) => {
    if (cc.latitude === 0 && cc.longitude === 0) return;
    const marker = L.marker([cc.latitude, cc.longitude], {
      icon: createChainControlIcon(),
      title: `Chain Control: ${cc.location}`,
    });
    marker.bindPopup(`
      <div style="min-width: 180px; font-family: system-ui, sans-serif;">
        <div style="color: #3b82f6; font-weight: bold; font-size: 13px;">${cc.level} Chain Control</div>
        <div style="font-size: 12px; margin-top: 4px;">${cc.location}</div>
        <div style="color: #888; font-size: 11px; margin-top: 2px;">${cc.status}</div>
      </div>
    `, { maxWidth: 250 });
    chainControlLayerRef.current!.addLayer(marker);
  });
}, [chainControls]);

// Add useEffect for closures:
useEffect(() => {
  if (!mapInstance.current || !closureLayerRef.current) return;
  closureLayerRef.current.clearLayers();

  (closures ?? []).forEach((cl) => {
    if (cl.latitude === 0 && cl.longitude === 0) return;
    const marker = L.marker([cl.latitude, cl.longitude], {
      icon: createClosureIcon(),
      title: `Closure: ${cl.location}`,
    });
    marker.bindPopup(`
      <div style="min-width: 180px; font-family: system-ui, sans-serif;">
        <div style="color: #f97316; font-weight: bold; font-size: 13px;">Lane Closure</div>
        <div style="font-size: 12px; margin-top: 4px;">${cl.location}</div>
        <div style="color: #888; font-size: 11px; margin-top: 2px;">${cl.closureType} — ${cl.lanesAffected}</div>
        <div style="color: #888; font-size: 11px;">${cl.startTime} to ${cl.endTime}</div>
      </div>
    `, { maxWidth: 280 });
    closureLayerRef.current!.addLayer(marker);
  });
}, [closures]);
```

- [ ] **Step 4: Test and commit**

Verify:
- Blue "C" markers appear for chain controls on the map
- Orange "X" markers appear for lane closures
- Popups show relevant details
- No errors when switching between districts with/without data

```bash
git add src/components/react/MapViewInner.tsx src/components/react/MapView.tsx src/components/react/CameraGrid.tsx
git commit -m "feat: add chain control and lane closure markers to map view"
```

---

## Task 6: Route Camera Planner — API Endpoint

**Files:**
- Create: `functions/api/route.ts`

- [ ] **Step 1: Create the route proxy endpoint**

This endpoint proxies requests to OSRM (Open Source Routing Machine), which is free and requires no API key. It returns the route geometry as a GeoJSON polyline.

```typescript
// functions/api/route.ts
interface Env {
  ASSETS: Fetcher;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const from = url.searchParams.get('from'); // "lat,lon"
  const to = url.searchParams.get('to');     // "lat,lon"

  if (!from || !to) {
    return new Response(JSON.stringify({ error: 'Missing from and to parameters (lat,lon)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate coordinates
  const [fromLat, fromLon] = from.split(',').map(Number);
  const [toLat, toLon] = to.split(',').map(Number);

  if ([fromLat, fromLon, toLat, toLon].some(isNaN)) {
    return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate California bounds (roughly)
  const inCA = (lat: number, lon: number) =>
    lat >= 32 && lat <= 42.1 && lon >= -124.5 && lon <= -114;

  if (!inCA(fromLat, fromLon) || !inCA(toLat, toLon)) {
    return new Response(JSON.stringify({ error: 'Coordinates must be within California' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // OSRM uses lon,lat order
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true&annotations=duration,distance`;

  try {
    const resp = await fetch(osrmUrl, {
      headers: { 'User-Agent': 'CaliforniaTrafficLens/1.0' },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Routing service unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json() as any;

    if (data.code !== 'Ok' || !data.routes?.length) {
      return new Response(JSON.stringify({ error: 'No route found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const route = data.routes[0];

    return new Response(JSON.stringify({
      geometry: route.geometry, // GeoJSON LineString
      distance: route.distance, // meters
      duration: route.duration, // seconds
      steps: route.legs[0]?.steps?.map((s: any) => ({
        name: s.name,
        distance: s.distance,
        duration: s.duration,
        maneuver: s.maneuver,
      })) ?? [],
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch route' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 2: Test and commit**

Test locally via dev server:
```
curl "http://localhost:4321/api/route?from=34.05,-118.24&to=37.78,-122.42"
```

Expected: JSON with geometry, distance, duration.

```bash
git add functions/api/route.ts
git commit -m "feat: add route proxy API endpoint using OSRM"
```

---

## Task 7: Route Camera Planner — Route Matching Logic

**Files:**
- Create: `src/lib/route-matching.ts`

- [ ] **Step 1: Create point-to-polyline distance matching**

```typescript
// src/lib/route-matching.ts
import { haversineDistance } from './utils';
import type { Camera } from './schemas';

interface RouteCoordinate {
  lat: number;
  lon: number;
}

export interface RouteCameraMatch {
  camera: Camera;
  distanceFromRoute: number; // km from nearest point on route
  progressAlongRoute: number; // 0-1 fraction of how far along the route
  nearestRoutePoint: RouteCoordinate;
}

const MAX_DISTANCE_FROM_ROUTE_KM = 1.5; // cameras within 1.5km of route

/**
 * Find the nearest point on a polyline segment to a given point.
 * Returns the fraction along the segment (0-1) and the projected point.
 */
function nearestPointOnSegment(
  point: RouteCoordinate,
  segStart: RouteCoordinate,
  segEnd: RouteCoordinate,
): { fraction: number; nearest: RouteCoordinate } {
  const dx = segEnd.lon - segStart.lon;
  const dy = segEnd.lat - segStart.lat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { fraction: 0, nearest: segStart };
  }

  let t = ((point.lon - segStart.lon) * dx + (point.lat - segStart.lat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    fraction: t,
    nearest: {
      lat: segStart.lat + t * dy,
      lon: segStart.lon + t * dx,
    },
  };
}

/**
 * Given a GeoJSON LineString coordinate array and a list of cameras,
 * find cameras near the route, sorted by their position along the route.
 */
export function matchCamerasToRoute(
  routeCoords: [number, number][], // GeoJSON [lon, lat] pairs
  cameras: Camera[],
  maxDistanceKm: number = MAX_DISTANCE_FROM_ROUTE_KM,
): RouteCameraMatch[] {
  if (routeCoords.length < 2 || cameras.length === 0) return [];

  // Pre-compute cumulative distances along the route for progress calculation
  const segmentDistances: number[] = [0];
  let totalDistance = 0;
  for (let i = 1; i < routeCoords.length; i++) {
    const d = haversineDistance(
      routeCoords[i - 1][1], routeCoords[i - 1][0],
      routeCoords[i][1], routeCoords[i][0],
    );
    totalDistance += d;
    segmentDistances.push(totalDistance);
  }

  const matches: RouteCameraMatch[] = [];

  for (const camera of cameras) {
    if (camera.latitude === 0 && camera.longitude === 0) continue;

    let bestDistance = Infinity;
    let bestProgress = 0;
    let bestNearest: RouteCoordinate = { lat: 0, lon: 0 };

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segStart: RouteCoordinate = { lat: routeCoords[i][1], lon: routeCoords[i][0] };
      const segEnd: RouteCoordinate = { lat: routeCoords[i + 1][1], lon: routeCoords[i + 1][0] };

      const { fraction, nearest } = nearestPointOnSegment(
        { lat: camera.latitude, lon: camera.longitude },
        segStart,
        segEnd,
      );

      const dist = haversineDistance(camera.latitude, camera.longitude, nearest.lat, nearest.lon);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestNearest = nearest;
        const segDist = segmentDistances[i] + fraction * (segmentDistances[i + 1] - segmentDistances[i]);
        bestProgress = totalDistance > 0 ? segDist / totalDistance : 0;
      }
    }

    if (bestDistance <= maxDistanceKm) {
      matches.push({
        camera,
        distanceFromRoute: bestDistance,
        progressAlongRoute: bestProgress,
        nearestRoutePoint: bestNearest,
      });
    }
  }

  // Sort by position along the route
  matches.sort((a, b) => a.progressAlongRoute - b.progressAlongRoute);

  return matches;
}
```

- [ ] **Step 2: Test and commit**

```bash
git add src/lib/route-matching.ts
git commit -m "feat: add route-camera polyline matching algorithm"
```

---

## Task 8: Route Camera Planner — Hook

**Files:**
- Create: `src/hooks/use-route-planner.ts`

- [ ] **Step 1: Create the route planner hook**

```typescript
// src/hooks/use-route-planner.ts
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useCameras } from './use-cameras';
import { useCMS } from './use-cms';
import { useIncidents } from './use-incidents';
import { useChainControl } from './use-chain-control';
import { useClosures } from './use-closures';
import { useTravelTimes } from './use-travel-times';
import { matchCamerasToRoute, type RouteCameraMatch } from '@/lib/route-matching';
import {
  matchCMSToCamera,
  matchIncidentsToCamera,
  matchClosuresToCamera,
  matchChainControlToCamera,
  matchTravelTimeToCamera,
} from '@/lib/matching';
import type { EnrichedCamera } from './use-enriched-cameras';

interface RouteGeometry {
  geometry: { type: string; coordinates: [number, number][] };
  distance: number;
  duration: number;
}

export interface RouteCamera extends EnrichedCamera {
  distanceFromRoute: number;
  progressAlongRoute: number;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Route fetch failed');
  return r.json();
});

export function useRoutePlanner() {
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lon: number; label: string } | null>(null);

  const routeKey = origin && destination
    ? `/api/route?from=${origin.lat},${origin.lon}&to=${destination.lat},${destination.lon}`
    : null;

  const { data: routeData, error: routeError, isLoading: routeLoading } = useSWR<RouteGeometry>(
    routeKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  // Fetch all cameras statewide for route matching
  const { data: allCameras = [] } = useCameras(null);
  const { data: allCMS = [] } = useCMS(null);
  const { data: allIncidents = [] } = useIncidents();
  const { data: allChainControls = [] } = useChainControl(null);
  const { data: allClosures = [] } = useClosures(null);
  const { data: allTravelTimes = [] } = useTravelTimes(null);

  // Match cameras to route
  const routeCameras: RouteCamera[] = routeData?.geometry?.coordinates
    ? matchCamerasToRoute(routeData.geometry.coordinates, allCameras)
        .map((match): RouteCamera => ({
          ...match.camera,
          nearbyCMS: matchCMSToCamera(match.camera, allCMS),
          nearbyIncidents: matchIncidentsToCamera(match.camera, allIncidents),
          weatherAlerts: [],
          chainControls: matchChainControlToCamera(match.camera, allChainControls),
          nearbyClosures: matchClosuresToCamera(match.camera, allClosures),
          travelTime: matchTravelTimeToCamera(match.camera, allTravelTimes),
          distanceFromRoute: match.distanceFromRoute,
          progressAlongRoute: match.progressAlongRoute,
        }))
    : [];

  const clearRoute = useCallback(() => {
    setOrigin(null);
    setDestination(null);
  }, []);

  return {
    origin,
    destination,
    setOrigin,
    setDestination,
    clearRoute,
    routeData,
    routeCameras,
    routeError,
    routeLoading,
    routeDistance: routeData?.distance ?? 0,
    routeDuration: routeData?.duration ?? 0,
  };
}
```

- [ ] **Step 2: Test and commit**

```bash
git add src/hooks/use-route-planner.ts
git commit -m "feat: add route planner hook with camera-to-route matching"
```

---

## Task 9: Route Camera Planner — UI Components

**Files:**
- Create: `src/components/react/RoutePlanner.tsx`
- Create: `src/components/react/RouteCameraList.tsx`
- Create: `src/components/react/RouteMapView.tsx`

- [ ] **Step 1: Create RouteCameraList**

```tsx
// src/components/react/RouteCameraList.tsx
import { useState } from 'react';
import { CameraDetailDialog } from './CameraDetailDialog';
import { ConditionBadges } from './ConditionBadges';
import { RouteShield } from './RouteShield';
import { useFavorites } from '@/hooks/use-favorites';
import type { RouteCamera } from '@/hooks/use-route-planner';

interface RouteCameraListProps {
  cameras: RouteCamera[];
  routeDuration: number;
}

export function RouteCameraList({ cameras, routeDuration }: RouteCameraListProps) {
  const [selectedCamera, setSelectedCamera] = useState<RouteCamera | null>(null);
  const { toggle: toggleFavorite, isFavorite } = useFavorites();

  if (cameras.length === 0) return null;

  return (
    <div className="space-y-0">
      {cameras.map((camera, i) => {
        const etaMinutes = Math.round(camera.progressAlongRoute * (routeDuration / 60));
        const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;

        return (
          <div key={camera.id} className="relative">
            {/* Connecting line */}
            {i < cameras.length - 1 && (
              <div className="absolute left-[19px] top-[48px] bottom-0 w-0.5 bg-border" />
            )}

            <button
              onClick={() => setSelectedCamera(camera)}
              className={`relative flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-accent/50 ${
                hasIssues ? 'bg-red-500/5' : ''
              }`}
            >
              {/* Progress indicator */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className={`w-3 h-3 rounded-full border-2 ${
                  hasIssues ? 'border-red-500 bg-red-500/30' : 'border-primary bg-primary/30'
                }`} />
                <span className="mt-1 text-[9px] text-muted-foreground">
                  {etaMinutes}m
                </span>
              </div>

              {/* Camera thumbnail */}
              <img
                src={camera.imageUrl}
                alt={camera.location}
                className="w-24 h-16 rounded-md object-cover shrink-0"
                loading="lazy"
              />

              {/* Camera info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <RouteShield route={camera.route} />
                  <span className="text-xs font-medium truncate">{camera.direction}</span>
                  {camera.hasVideo && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {camera.location || camera.city}
                </p>
                <div className="mt-1">
                  <ConditionBadges
                    chainControls={camera.chainControls}
                    closures={camera.nearbyClosures}
                    travelTime={camera.travelTime}
                  />
                </div>
                {camera.nearbyIncidents.length > 0 && (
                  <p className="mt-1 text-[10px] text-red-400">
                    {camera.nearbyIncidents.map((inc) => inc.type).join(', ')}
                  </p>
                )}
              </div>
            </button>
          </div>
        );
      })}

      {selectedCamera && (
        <CameraDetailDialog
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
          isFavorite={isFavorite(selectedCamera.id)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create RouteMapView**

```tsx
// src/components/react/RouteMapView.tsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteCamera } from '@/hooks/use-route-planner';

interface RouteMapViewProps {
  routeCoords: [number, number][]; // GeoJSON [lon, lat]
  cameras: RouteCamera[];
  onCameraClick?: (camera: RouteCamera) => void;
}

export function RouteMapView({ routeCoords, cameras, onCameraClick }: RouteMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [37.5, -119.5],
      zoom: 6,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Draw route polyline
  useEffect(() => {
    if (!mapInstance.current || routeCoords.length < 2) return;

    const latLngs: [number, number][] = routeCoords.map(([lon, lat]) => [lat, lon]);

    const polyline = L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
    }).addTo(mapInstance.current);

    // Fit map to route
    mapInstance.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Add start/end markers
    const startIcon = L.divIcon({
      className: 'route-start',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const endIcon = L.divIcon({
      className: 'route-end',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    L.marker(latLngs[0], { icon: startIcon }).addTo(mapInstance.current);
    L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(mapInstance.current);

    return () => {
      polyline.remove();
    };
  }, [routeCoords]);

  // Camera markers along route
  useEffect(() => {
    if (!mapInstance.current) return;

    const markers: L.Marker[] = [];

    cameras.forEach((camera, i) => {
      if (camera.latitude === 0 && camera.longitude === 0) return;

      const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0;
      const color = hasIssues ? '#ef4444' : camera.hasVideo ? '#22c55e' : '#6b7280';

      const icon = L.divIcon({
        className: 'route-camera-marker',
        html: `<div style="
          width:20px;height:20px;border-radius:50%;background:${color};
          border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:9px;color:white;font-weight:bold;
        ">${i + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([camera.latitude, camera.longitude], { icon });

      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif;">
          <img src="${camera.imageUrl}" style="width:100%;border-radius:4px;margin-bottom:6px;" loading="lazy" />
          <strong>${camera.route} ${camera.direction}</strong><br/>
          <span style="color:#888;font-size:12px;">${camera.location || camera.city}</span>
        </div>
      `, { maxWidth: 250 });

      if (onCameraClick) {
        marker.on('click', () => setTimeout(() => onCameraClick(camera), 100));
      }

      marker.addTo(mapInstance.current!);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [cameras, onCameraClick]);

  return (
    <div
      ref={mapRef}
      className="h-[50vh] w-full rounded-lg border border-border"
      style={{ zIndex: 0 }}
    />
  );
}
```

- [ ] **Step 3: Create RoutePlanner main component**

```tsx
// src/components/react/RoutePlanner.tsx
import { useState, useCallback, lazy, Suspense } from 'react';
import { useRoutePlanner, type RouteCamera } from '@/hooks/use-route-planner';
import { RouteCameraList } from './RouteCameraList';
import { ErrorBoundary } from './ErrorBoundary';

const RouteMapView = lazy(() => import('./RouteMapView').then((m) => ({ default: m.RouteMapView })));

// Simple geocoder using Nominatim (free, no API key)
async function geocode(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const encoded = encodeURIComponent(`${query}, California`);
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=us&viewbox=-124.5,42,-114,32.5&bounded=1`,
    { headers: { 'User-Agent': 'CaliforniaTrafficLens/1.0' } },
  );
  const results = await resp.json();
  if (results.length === 0) return null;
  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    label: results[0].display_name.split(',').slice(0, 2).join(','),
  };
}

export function RoutePlanner() {
  const {
    origin, destination, setOrigin, setDestination, clearRoute,
    routeData, routeCameras, routeError, routeLoading,
    routeDistance, routeDuration,
  } = useRoutePlanner();

  const [originInput, setOriginInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handlePlanRoute = useCallback(async () => {
    if (!originInput.trim() || !destInput.trim()) return;
    setGeocoding(true);
    setGeocodeError(null);

    try {
      const [orig, dest] = await Promise.all([
        geocode(originInput),
        geocode(destInput),
      ]);

      if (!orig) {
        setGeocodeError(`Could not find "${originInput}" in California`);
        return;
      }
      if (!dest) {
        setGeocodeError(`Could not find "${destInput}" in California`);
        return;
      }

      setOrigin(orig);
      setDestination(dest);
    } catch {
      setGeocodeError('Geocoding failed. Please try again.');
    } finally {
      setGeocoding(false);
    }
  }, [originInput, destInput, setOrigin, setDestination]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePlanRoute();
  }, [handlePlanRoute]);

  const handleClear = useCallback(() => {
    clearRoute();
    setOriginInput('');
    setDestInput('');
    setGeocodeError(null);
  }, [clearRoute]);

  const totalIncidents = routeCameras.reduce((sum, c) => sum + c.nearbyIncidents.length, 0);
  const totalClosures = routeCameras.reduce((sum, c) => sum + c.nearbyClosures.length, 0);
  const totalChainControls = routeCameras.reduce((sum, c) => sum + c.chainControls.length, 0);

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {/* Route input form */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Plan Your Route</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" />
              <input
                type="text"
                placeholder="From (city or address)"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative flex-1">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
              <input
                type="text"
                placeholder="To (city or address)"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handlePlanRoute}
              disabled={geocoding || routeLoading || !originInput.trim() || !destInput.trim()}
              className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {geocoding || routeLoading ? 'Loading...' : 'Plan Route'}
            </button>
            {(origin || originInput) && (
              <button
                onClick={handleClear}
                className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-accent transition-colors shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          {geocodeError && <p className="mt-2 text-xs text-red-400">{geocodeError}</p>}
          {routeError && <p className="mt-2 text-xs text-red-400">Failed to calculate route. Try different locations.</p>}
        </div>

        {/* Route summary */}
        {routeData && (
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-border px-2.5 py-1">
              {(routeDistance / 1609.34).toFixed(0)} miles
            </span>
            <span className="rounded-full border border-border px-2.5 py-1">
              ~{Math.round(routeDuration / 60)} min drive
            </span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
              {routeCameras.length} cameras on route
            </span>
            {totalIncidents > 0 && (
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-400">
                {totalIncidents} incident{totalIncidents > 1 ? 's' : ''}
              </span>
            )}
            {totalClosures > 0 && (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-orange-400">
                {totalClosures} closure{totalClosures > 1 ? 's' : ''}
              </span>
            )}
            {totalChainControls > 0 && (
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-400">
                {totalChainControls} chain control{totalChainControls > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Route map + camera list */}
        {routeData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<div className="h-[50vh] animate-pulse rounded-lg bg-muted" />}>
              <RouteMapView
                routeCoords={routeData.geometry.coordinates}
                cameras={routeCameras}
              />
            </Suspense>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-card">
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-3 py-2">
                <h3 className="text-xs font-semibold">
                  Cameras Along Route ({routeCameras.length})
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {origin?.label} → {destination?.label}
                </p>
              </div>
              <RouteCameraList cameras={routeCameras} routeDuration={routeDuration} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!routeData && !routeLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30 mb-4">
              <path d="m3 3 7 7" /><path d="m14 21-7-7" /><path d="m3 21 18-18" /><path d="M21 14v7h-7" /><path d="M3 10V3h7" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Enter an origin and destination to see cameras along your route
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Example: "Sacramento" to "Los Angeles"
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 4: Test and commit**

```bash
git add src/components/react/RoutePlanner.tsx src/components/react/RouteCameraList.tsx src/components/react/RouteMapView.tsx
git commit -m "feat: add route planner UI components"
```

---

## Task 10: Route Camera Planner — Page and Navigation

**Files:**
- Create: `src/pages/route.astro`
- Modify: `src/components/astro/Header.astro`

- [ ] **Step 1: Create the route planner page**

```astro
---
// src/pages/route.astro
export const prerender = false;
import Base from '@/layouts/Base.astro';
import Header from '@/components/astro/Header.astro';
import Footer from '@/components/astro/Footer.astro';
import { RoutePlanner } from '@/components/react/RoutePlanner';
---

<Base title="Route Planner — California Traffic Lens">
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <Header />
    <main class="flex-1 px-4 py-4 md:px-6">
      <RoutePlanner client:load />
    </main>
    <Footer />
  </div>
</Base>
```

- [ ] **Step 2: Add nav link in Header**

In `src/components/astro/Header.astro`, add a link to the route planner. Find the nav area and add:

```html
<a href="/route" class="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
  Route Planner
</a>
```

- [ ] **Step 3: Test and commit**

Verify:
- Navigate to `/route`
- Enter "Sacramento" → "Los Angeles"
- Click "Plan Route"
- Route appears on map with blue polyline
- Cameras listed in order with ETA, condition badges
- Clicking a camera opens the detail dialog
- Header nav link works from both pages

```bash
git add src/pages/route.astro src/components/astro/Header.astro
git commit -m "feat: add route planner page with navigation"
```

---

## Task 11: RouteMapView Export Fix + Final Polish

**Files:**
- Modify: `src/components/react/RouteMapView.tsx` (ensure named export for lazy loading)
- Modify: `src/hooks/use-chain-control.ts` (handle null district for all-districts fetch)
- Modify: `src/hooks/use-closures.ts` (handle null district for all-districts fetch)

- [ ] **Step 1: Fix hooks to support statewide fetch (needed by route planner)**

The route planner passes `district: null` to chain control and closures hooks, but currently they return null key for null district. Update them to fetch all districts:

```typescript
// src/hooks/use-chain-control.ts — update key:
const key = district !== null ? `/api/chain-control/${district}` : null;
// Note: For route planner, cameras already have district info, so we match per-camera.
// The route planner fetches cameras with district=null which gets /api/cameras/all.
// Chain control/closures don't have an "all" endpoint, so we skip them for route planner
// and rely on per-camera enrichment when district-specific data isn't available.
```

Actually, the simpler approach: the route planner already gets all cameras statewide. Chain control and closures are district-specific and don't have an `/all` endpoint. For the route planner, skip these enrichments (they'll show as empty) since cameras span multiple districts. This is acceptable for v1.

In `src/hooks/use-route-planner.ts`, update the chain control/closures/travel time hook calls:

```typescript
// These will return [] when district is null — that's fine for route planner v1
// The camera-level enrichment will show empty for these fields
const { data: allChainControls = [] } = useChainControl(null);
const { data: allClosures = [] } = useClosures(null);
const { data: allTravelTimes = [] } = useTravelTimes(null);
```

- [ ] **Step 2: Ensure RouteMapView can be lazy loaded**

In `src/components/react/RouteMapView.tsx`, make sure it has a named export and the lazy import in RoutePlanner matches:

```tsx
// In RoutePlanner.tsx, the lazy import should be:
const RouteMapView = lazy(() =>
  import('./RouteMapView').then((m) => ({ default: m.RouteMapView }))
);
```

This already matches what we wrote. Verify it works by testing lazy loading.

- [ ] **Step 3: Build and deploy**

```bash
cd /Users/welsh-macmini/Projects/california-traffic-lens
npm run build
```

If build succeeds, patch wrangler.json and deploy:

```bash
# The build regenerates dist/server/wrangler.json — re-patch it
node -e "
const fs = require('fs');
const p = 'dist/server/wrangler.json';
let j = JSON.parse(fs.readFileSync(p, 'utf8'));
delete j.pages_build_output_dir;
j.no_bundle = false;
j.kv_namespaces = j.kv_namespaces.map(ns =>
  ns.binding === 'SESSION' ? { ...ns, id: '0bc102b2847d40b395bbb966de1d1b10' } : ns
);
fs.writeFileSync(p, JSON.stringify(j));
"
npx wrangler deploy --config dist/server/wrangler.json
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: route planner polish and deployment"
```

---

## Summary

| Task | Feature | Key Files |
|------|---------|-----------|
| 1 | Grid density control (1-6 columns) | `stores/grid.ts`, `GridDensityControl.tsx` |
| 2 | County filter | `filters.ts`, `FilterBar.tsx`, `constants.ts` |
| 3 | District map selector | `DistrictMapSelector.tsx` |
| 4 | Surface chain control/closures/travel times | 3 new hooks, `ConditionBadges.tsx`, enriched cameras |
| 5 | Map layers for chain control + closures | `MapViewInner.tsx` |
| 6 | Route API endpoint (OSRM proxy) | `functions/api/route.ts` |
| 7 | Route-camera matching algorithm | `route-matching.ts` |
| 8 | Route planner hook | `use-route-planner.ts` |
| 9 | Route planner UI components | `RoutePlanner.tsx`, `RouteCameraList.tsx`, `RouteMapView.tsx` |
| 10 | Route planner page + navigation | `route.astro`, `Header.astro` |
| 11 | Polish + deploy | Build fixes, deployment |
