import { atom, computed } from 'nanostores';

export const selectedDistrict = atom<number | null>(null);
export const selectedRoute = atom<string | null>(null);
export const selectedCity = atom<string | null>(null);
export const searchQuery = atom<string>('');
export const viewMode = atom<'grid' | 'map'>('grid');
export const activeDataLayers = atom<Set<string>>(
  new Set(['cameras', 'incidents', 'chain-control', 'closures', 'weather'])
);
