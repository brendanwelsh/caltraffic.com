import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import {
  selectedDistrict,
  selectedRoute,
  selectedCity,
  searchQuery,
  viewMode,
} from '@/stores/filters';
import { DISTRICTS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function FilterBar() {
  const district = useStore(selectedDistrict);
  const route = useStore(selectedRoute);
  const city = useStore(selectedCity);
  const search = useStore(searchQuery);
  const view = useStore(viewMode);
  const [searchInput, setSearchInput] = useState(search);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchQuery.set(searchInput);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearAllFilters = useCallback(() => {
    selectedDistrict.set(null);
    selectedRoute.set(null);
    selectedCity.set(null);
    searchQuery.set('');
    setSearchInput('');
  }, []);

  const hasFilters = district !== null || route !== null || city !== null || search !== '';

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search cameras, routes, cities..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-input">
          <button
            onClick={() => viewMode.set('grid')}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-l-lg px-3 text-sm transition-colors',
              view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
            aria-label="Grid view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => viewMode.set('map')}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-r-lg px-3 text-sm transition-colors border-l border-input',
              view === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
            aria-label="Map view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 3 7 7" /><path d="m14 21-7-7" /><path d="m3 21 18-18" />
              <path d="M21 14v7h-7" /><path d="M3 10V3h7" />
            </svg>
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {/* District selector */}
        <select
          value={district ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            selectedDistrict.set(val === '' ? null : parseInt(val, 10));
            // Reset route and city when district changes
            selectedRoute.set(null);
            selectedCity.set(null);
          }}
          className="h-8 rounded-full border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Districts</option>
          {Object.entries(DISTRICTS).map(([id, info]) => (
            <option key={id} value={id}>
              D{id.padStart(2, '0')} — {info.description}
            </option>
          ))}
        </select>

        {/* Active filter chips */}
        {route && (
          <button
            onClick={() => selectedRoute.set(null)}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 text-xs font-medium text-primary"
          >
            {route}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}

        {city && (
          <button
            onClick={() => selectedCity.set(null)}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 text-xs font-medium text-primary"
          >
            {city}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}

        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
