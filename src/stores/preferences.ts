import { atom } from 'nanostores';

// ─── Theme ───

export const theme = atom<'dark' | 'light'>('dark');

export function toggleTheme(): void {
  const current = theme.get();
  const next = current === 'dark' ? 'light' : 'dark';
  theme.set(next);

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  }
}

export function initTheme(): void {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
  const preferred = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  theme.set(preferred);
  document.documentElement.classList.toggle('dark', preferred === 'dark');
}

// ─── Grid Density ───

export type GridDensity = 1 | 2 | 3 | 4 | 5 | 6;

const GRID_DENSITY_KEY = 'california-traffic-lens-grid-density';

function loadDensity(): GridDensity {
  if (typeof window === 'undefined') return 3;
  const saved = localStorage.getItem(GRID_DENSITY_KEY);
  if (saved) {
    const n = parseInt(saved, 10);
    if (n >= 1 && n <= 6) return n as GridDensity;
  }
  return 3;
}

export const gridDensity = atom<GridDensity>(loadDensity());

gridDensity.subscribe((value) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GRID_DENSITY_KEY, String(value));
  }
});
