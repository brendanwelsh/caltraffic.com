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
