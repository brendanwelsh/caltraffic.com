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
