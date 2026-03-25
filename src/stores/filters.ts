import { atom } from 'nanostores';

export const selectedDistrict = atom<number | null>(null);
export const selectedRoute = atom<string | null>(null);
export const selectedCity = atom<string | null>(null);
export const searchQuery = atom<string>('');
export const viewMode = atom<'grid' | 'map'>('grid');
export const activeDataLayers = atom<Set<string>>(
  new Set(['cameras', 'incidents', 'chain-control', 'closures', 'weather'])
);

// Camera filter toggles
export const showVideoOnly = atom<boolean>(false);
export const hideStale = atom<boolean>(false);
export const hideUnavailable = atom<boolean>(true); // Default: hide cameras with no recent images
export const hidePhotoOnly = atom<boolean>(false);
export const showWithIncidents = atom<boolean>(false);
export const showWithSigns = atom<boolean>(false);

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
