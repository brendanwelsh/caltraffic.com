import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'california-traffic-lens-favorites';

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {}
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, toggle, isFavorite };
}
