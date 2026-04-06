import { atom } from 'nanostores';

export const selectedDistrict = atom<number | null>(null);
export const selectedRoute = atom<string | null>(null);
export const selectedCity = atom<string | null>(null);
export const selectedCounty = atom<string | null>(null);
export const searchQuery = atom<string>('');
export const viewMode = atom<'tiles' | 'grid' | 'map'>('tiles');

// Feed type: 'all' | 'live' | 'still' — replaces multiple toggle atoms
export const feedType = atom<'all' | 'live' | 'still'>('live');

// Favorites filter
export const filterFavorites = atom<boolean>(false);

// Show only cameras with nearby incidents
export const filterIncidents = atom<boolean>(false);

// Play all state — on by default
export const playAllLive = atom<boolean>(true);

// Featured cameras page state
export const featuredCategory = atom<string>('all');
export const showDisabledFeatured = atom<boolean>(false);

// Track cameras with broken/unavailable images (detected client-side, persisted to localStorage)
const UNAVAILABLE_KEY = 'caltraffic-unavailable-cameras';
const UNAVAILABLE_TTL = 1000 * 60 * 30; // 30 min — re-check after this

function loadUnavailable(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UNAVAILABLE_KEY);
    if (!raw) return new Set();
    const { ids, ts } = JSON.parse(raw);
    if (Date.now() - ts > UNAVAILABLE_TTL) {
      localStorage.removeItem(UNAVAILABLE_KEY);
      return new Set();
    }
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function persistUnavailable(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UNAVAILABLE_KEY, JSON.stringify({ ids: [...ids], ts: Date.now() }));
  } catch { /* quota */ }
}

export const unavailableCameras = atom<Set<string>>(loadUnavailable());

export function markUnavailable(id: string) {
  const current = unavailableCameras.get();
  if (!current.has(id)) {
    const next = new Set(current);
    next.add(id);
    unavailableCameras.set(next);
    persistUnavailable(next);
  }
}

// Hide unavailable by default
export const hideUnavailable = atom<boolean>(true);

export function clearAllFilters() {
  selectedDistrict.set(null);
  selectedRoute.set(null);
  selectedCity.set(null);
  selectedCounty.set(null);
  searchQuery.set('');
  feedType.set('live');
  filterFavorites.set(false);
  filterIncidents.set(false);
  featuredCategory.set('all');
  showDisabledFeatured.set(false);
}
