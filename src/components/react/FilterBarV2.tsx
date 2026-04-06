import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { GridDensityControl } from './GridDensityControl';
import {
  feedType,
  filterFavorites,
  filterIncidents,
  playAllLive,
  hideUnavailable,
  selectedDistrict,
  selectedRoute,
  selectedCity,
  selectedCounty,
  searchQuery,
  viewMode,
  clearAllFilters,
} from '@/stores/filters';
import { DISTRICTS, getCountiesForDistrict } from '@/lib/constants';
import { RouteDropdown } from './RouteDropdown';
import { cn } from '@/lib/utils';

interface FilterBarV2Props {
  cameraCount: number;
  availableCities?: string[];
  availableRoutes?: string[];
  /** Camera data for search autocomplete suggestions */
  cameraNames?: Array<{ location: string; city: string; route: string; county: string }>;
  /** Count of cameras with nearby incidents for filter badge */
  incidentCameraCount?: number;
}

export function FilterBarV2({ cameraCount, availableCities = [], availableRoutes = [], cameraNames = [], incidentCameraCount = 0 }: FilterBarV2Props) {
  const district = useStore(selectedDistrict);
  const route = useStore(selectedRoute);
  const city = useStore(selectedCity);
  const county = useStore(selectedCounty);
  const search = useStore(searchQuery);
  const view = useStore(viewMode);
  const feed = useStore(feedType);
  const favorites = useStore(filterFavorites);
  const incidents = useStore(filterIncidents);
  const playing = useStore(playAllLive);
  const hideBroken = useStore(hideUnavailable);

  const [searchInput, setSearchInput] = useState(search);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const availableCounties = useMemo(() => getCountiesForDistrict(district), [district]);

  // Sync external search changes into local input
  useEffect(() => {
    if (search !== searchInput) setSearchInput(search);
  }, [search]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => searchQuery.set(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Search suggestions from camera data
  const suggestions = useMemo(() => {
    if (!searchInput || searchInput.length < 2 || !cameraNames.length) return [];
    const q = searchInput.toLowerCase();
    const seen = new Set<string>();
    const results: Array<{ label: string; type: 'location' | 'city' | 'route' | 'county' }> = [];

    for (const cam of cameraNames) {
      if (results.length >= 8) break;
      if (cam.location && cam.location.toLowerCase().includes(q) && !seen.has(cam.location)) {
        seen.add(cam.location);
        results.push({ label: cam.location, type: 'location' });
      }
    }
    for (const cam of cameraNames) {
      if (results.length >= 8) break;
      if (cam.city && cam.city.toLowerCase().includes(q) && !seen.has(cam.city)) {
        seen.add(cam.city);
        results.push({ label: cam.city, type: 'city' });
      }
    }
    for (const cam of cameraNames) {
      if (results.length >= 8) break;
      if (cam.route && cam.route.toLowerCase().includes(q) && !seen.has(cam.route)) {
        seen.add(cam.route);
        results.push({ label: cam.route, type: 'route' });
      }
    }
    return results;
  }, [searchInput, cameraNames]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSuggestionSelect = useCallback((label: string) => {
    setSearchInput(label);
    searchQuery.set(label);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || !suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[selectedSuggestion].label);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, selectedSuggestion, handleSuggestionSelect]);

  const hasAnyFilter = useMemo(() => {
    return feed !== 'live' || favorites || incidents || !!route || !!city || !!county || district !== null || search !== '';
  }, [feed, favorites, incidents, route, city, county, district, search]);

  const selectStyle = {
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 6px center',
  } as const;

  const selectClass = 'h-8 rounded-md border border-input bg-background px-2 pr-6 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring appearance-none';


  return (
    <div className="space-y-2">
      {/* Row 1: Play All, Search, Grid/Map toggle, Grid Density */}
      <div className="flex items-center gap-1.5">
        {/* Play All Live */}
        <button
          onClick={() => playAllLive.set(!playing)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors shrink-0 h-8',
            playing
              ? 'border-green-500/50 bg-green-500/15 text-green-400'
              : 'border-border text-muted-foreground hover:bg-green-500/10 hover:text-green-400'
          )}
          title="Start playing all visible live camera feeds"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={playing ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          {playing ? 'Stop All' : 'Play All'}
        </button>

        {/* Search with autocomplete */}
        <div ref={searchRef} className="relative min-w-[120px] max-w-[280px] flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search cameras..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); setSelectedSuggestion(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            title="Search by camera name, route, or city"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestionSelect(s.label)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors',
                    i === selectedSuggestion && 'bg-accent',
                  )}
                >
                  <span className="truncate flex-1">{s.label}</span>
                  <span className="text-[9px] text-muted-foreground/50 uppercase shrink-0">{s.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid density — only in tiles/grid view, hidden on mobile */}
        {view !== 'map' && (
          <div className="hidden md:block" title="Adjust grid columns">
            <GridDensityControl />
          </div>
        )}

        {/* View toggle (tiles/grid/map) */}
        <div className="flex rounded-md border border-input overflow-hidden shrink-0 h-8">
          <button
            onClick={() => viewMode.set('tiles')}
            className={cn('inline-flex items-center px-2.5 transition-colors', view === 'tiles' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            aria-label="Tiles view"
            title="Tiles — compact image grid"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            <span className="text-[10px] font-medium ml-1 hidden sm:inline">Tile</span>
          </button>
          <button
            onClick={() => viewMode.set('grid')}
            className={cn('inline-flex items-center px-2.5 transition-colors border-l border-input', view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            aria-label="Grid view"
            title="Grid — cards with details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="7" x="3" y="3" rx="1" /><rect width="18" height="7" x="3" y="14" rx="1" />
            </svg>
            <span className="text-[10px] font-medium ml-1 hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => viewMode.set('map')}
            className={cn('inline-flex items-center px-2.5 transition-colors border-l border-input', view === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            aria-label="Map view"
            title="Map — cameras on map"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>
            </svg>
            <span className="text-[10px] font-medium ml-1 hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* Row 2: Feed type segmented control, condition chips, dropdowns, clear */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          maskImage: 'linear-gradient(to right, transparent 0px, black 16px, black calc(100% - 24px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 16px, black calc(100% - 24px), transparent)',
        }}
      >
        {/* All / Live / Still segmented control */}
        <div className="flex rounded-md border border-input overflow-hidden shrink-0 h-7">
          {(['all', 'live', 'still'] as const).map((type) => (
            <button
              key={type}
              onClick={() => feedType.set(type)}
              className={cn(
                'px-2.5 text-[11px] font-medium transition-colors capitalize',
                type !== 'all' && 'border-l border-input',
                feed === type ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
              )}
            >
              {type === 'all' ? 'All' : type === 'live' ? 'Live' : 'Still'}
            </button>
          ))}
        </div>

        {/* Favorites filter — clear yellow star */}
        <button
          onClick={() => filterFavorites.set(!favorites)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-all whitespace-nowrap shrink-0',
            favorites
              ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
              : 'border-border text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-400'
          )}
          title="Show only your favorited cameras"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={favorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          My Favorites
          {favorites && (
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          )}
        </button>

        {/* Incidents filter */}
        {incidentCameraCount > 0 && (
          <button
            onClick={() => filterIncidents.set(!incidents)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-all whitespace-nowrap shrink-0',
              incidents
                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                : 'border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-400'
            )}
            title="Show only cameras with nearby traffic incidents"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
            </svg>
            Incidents
            <span className="rounded-full bg-red-500/20 px-1 min-w-[14px] text-[9px] font-bold">{incidentCameraCount}</span>
            {incidents && (
              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            )}
          </button>
        )}

        {/* Hide Unavailable toggle */}
        <button
          onClick={() => hideUnavailable.set(!hideBroken)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-all whitespace-nowrap shrink-0',
            hideBroken
              ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
              : 'border-border text-muted-foreground hover:bg-orange-500/10 hover:text-orange-400'
          )}
          title={hideBroken ? 'Show unavailable cameras' : 'Hide unavailable cameras'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          {hideBroken ? 'Hiding N/A' : 'Show N/A'}
        </button>

        {/* District selector */}
        <select
          value={district ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            selectedDistrict.set(val === '' ? null : parseInt(val, 10));
            selectedRoute.set(null);
            selectedCity.set(null);
            selectedCounty.set(null);
          }}
          className={cn(selectClass, 'shrink-0 w-[130px] sm:w-[160px] h-7 text-[11px]')}
          style={selectStyle}
          title="Filter by Caltrans district"
        >
          <option value="">All Districts</option>
          {Object.entries(DISTRICTS).map(([id, info]) => (
            <option key={id} value={id}>
              D{id} — {info.description}
            </option>
          ))}
        </select>

        {/* Route selector with shield icons */}
        <RouteDropdown
          routes={availableRoutes}
          value={route}
          onChange={(v) => selectedRoute.set(v)}
        />

        {/* County selector */}
        <select
          value={county ?? ''}
          onChange={(e) => selectedCounty.set(e.target.value || null)}
          className={cn(selectClass, 'shrink-0 w-[110px] sm:w-[130px] h-7 text-[11px]')}
          style={selectStyle}
          title="Filter by county"
        >
          <option value="">County</option>
          {availableCounties.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* City selector */}
        {availableCities.length > 0 && (
          <select
            value={city ?? ''}
            onChange={(e) => selectedCity.set(e.target.value || null)}
            className={cn(selectClass, 'shrink-0 w-[100px] sm:w-[130px] h-7 text-[11px]')}
            style={selectStyle}
            title="Filter by city"
          >
            <option value="">City</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {/* Clear all */}
        {hasAnyFilter && (
          <button
            onClick={() => { clearAllFilters(); setSearchInput(''); }}
            className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors whitespace-nowrap shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            Clear
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-[8px]" />

      </div>

      {/* Compact key */}
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground/60 px-1">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block"></span>
          Live
        </span>
        <span className="inline-flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
          Incident nearby
        </span>
        <span className="inline-flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg>
          Chain control
        </span>
      </div>
    </div>
  );
}
