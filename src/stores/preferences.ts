import { atom } from 'nanostores';

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
