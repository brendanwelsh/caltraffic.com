import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { GridDensityControl } from './GridDensityControl';
import { DistrictMapSelector } from './DistrictMapSelector';
import {
  selectedDistrict,
  selectedRoute,
  selectedCity,
  selectedCounty,
  searchQuery,
  viewMode,
  showVideoOnly,
  hideStale,
  hideUnavailable,
  showWithIncidents,
  showWithSigns,
} from '@/stores/filters';
import { DISTRICTS, getCountiesForDistrict } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  stats?: {
    total: number;
    video: number;
    incidents: number;
    signs: number;
    favorites: number;
  };
  showFavoritesOnly?: boolean;
  onToggleFavoritesOnly?: (v: boolean) => void;
}

/** Small toggle chip with icon */
function IconToggle({
  icon,
  label,
  active,
  onChange,
  color = 'default',
  count,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onChange: (v: boolean) => void;
  color?: 'default' | 'green' | 'red' | 'amber' | 'yellow' | 'blue';
  count?: number;
}) {
  const styles = {
    default: { on: 'bg-primary/15 border-primary/40 text-primary', off: 'border-border text-muted-foreground hover:bg-accent' },
    green: { on: 'bg-green-500/15 border-green-500/40 text-green-400', off: 'border-border text-muted-foreground hover:bg-green-500/10' },
    red: { on: 'bg-red-500/15 border-red-500/40 text-red-400', off: 'border-border text-muted-foreground hover:bg-red-500/10' },
    amber: { on: 'bg-amber-500/15 border-amber-500/40 text-amber-400', off: 'border-border text-muted-foreground hover:bg-amber-500/10' },
    yellow: { on: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400', off: 'border-border text-muted-foreground hover:bg-yellow-500/10' },
    blue: { on: 'bg-blue-500/15 border-blue-500/40 text-blue-400', off: 'border-border text-muted-foreground hover:bg-blue-500/10' },
  };
  const s = styles[color];

  return (
    <button
      onClick={() => onChange(!active)}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-all active:scale-95 whitespace-nowrap',
        active ? s.on : s.off,
      )}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn('rounded-full px-1 min-w-[14px] text-[9px] font-bold', active ? 'bg-white/15' : 'bg-muted')}>
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterBar({ stats, showFavoritesOnly = false, onToggleFavoritesOnly }: FilterBarProps) {
  const district = useStore(selectedDistrict);
  const route = useStore(selectedRoute);
  const city = useStore(selectedCity);
  const county = useStore(selectedCounty);
  const availableCounties = useMemo(() => getCountiesForDistrict(district), [district]);
  const search = useStore(searchQuery);
  const view = useStore(viewMode);
  const videoOnly = useStore(showVideoOnly);
  const noStale = useStore(hideStale);
  const noUnavailable = useStore(hideUnavailable);
  const withIncidents = useStore(showWithIncidents);
  const withSigns = useStore(showWithSigns);
  const [searchInput, setSearchInput] = useState(search);
  const [showDistrictMap, setShowDistrictMap] = useState(false);

  useEffect(() => {
    if (search !== searchInput) setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => searchQuery.set(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearAllFilters = useCallback(() => {
    selectedDistrict.set(null);
    selectedRoute.set(null);
    selectedCity.set(null);
    selectedCounty.set(null);
    searchQuery.set('');
    setSearchInput('');
    showVideoOnly.set(false);
    hideStale.set(false);
    hideUnavailable.set(true);
    showWithIncidents.set(false);
    showWithSigns.set(false);
    onToggleFavoritesOnly?.(false);
  }, [onToggleFavoritesOnly]);

  const hasAnyFilter = useMemo(() => {
    return videoOnly || noStale || !noUnavailable || withIncidents || withSigns || showFavoritesOnly || !!route || !!city || !!county || district !== null || search !== '';
  }, [videoOnly, noStale, noUnavailable, withIncidents, withSigns, showFavoritesOnly, route, city, county, district, search]);

  return (
    <div className="space-y-2">
      {/* Row 1: District + Search + View toggle — all inline */}
      <div className="flex gap-1.5">
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
          className="h-9 rounded-lg border border-input bg-background px-2 pr-6 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring appearance-none shrink-0 max-w-[140px] sm:max-w-[200px]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
        >
          <option value="">All Districts</option>
          {Object.entries(DISTRICTS).map(([id, info]) => (
            <option key={id} value={id}>
              D{id} — {info.description}
            </option>
          ))}
        </select>

        {/* District map toggle */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowDistrictMap((v) => !v)}
            className={cn(
              'inline-flex h-9 items-center px-2 rounded-lg border transition-colors',
              showDistrictMap ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent text-muted-foreground'
            )}
            title="District map"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 3 7 7" /><path d="m14 21-7-7" /><path d="m3 21 18-18" /><path d="M21 14v7h-7" /><path d="M3 10V3h7" />
            </svg>
          </button>
          {showDistrictMap && <DistrictMapSelector onClose={() => setShowDistrictMap(false)} />}
        </div>

        {/* County selector */}
        <select
          value={county ?? ''}
          onChange={(e) => selectedCounty.set(e.target.value || null)}
          className="h-9 rounded-lg border border-input bg-background px-2 pr-6 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring appearance-none shrink-0 max-w-[140px] sm:max-w-[160px]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
        >
          <option value="">All Counties</option>
          {availableCounties.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-input overflow-hidden shrink-0">
          <button
            onClick={() => viewMode.set('grid')}
            className={cn('inline-flex h-9 items-center px-2.5 transition-colors', view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            aria-label="Grid view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => viewMode.set('map')}
            className={cn('inline-flex h-9 items-center px-2.5 transition-colors border-l border-input', view === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            aria-label="Map view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 3 7 7" /><path d="m14 21-7-7" /><path d="m3 21 18-18" /><path d="M21 14v7h-7" /><path d="M3 10V3h7" />
            </svg>
          </button>
        </div>

        <GridDensityControl />
      </div>

      {/* Row 2: Filter toggles — always visible, scrollable on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <IconToggle
          icon={<span className="h-1.5 w-1.5 rounded-full bg-green-400" />}
          label="Live"
          active={videoOnly}
          onChange={(v) => showVideoOnly.set(v)}
          color="green"
          count={stats?.video}
        />
        <IconToggle
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>}
          label="Hide broken"
          active={noUnavailable}
          onChange={(v) => hideUnavailable.set(v)}
          color="default"
        />
        {(stats?.incidents ?? 0) > 0 && (
          <IconToggle
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
            label="Incidents"
            active={withIncidents}
            onChange={(v) => showWithIncidents.set(v)}
            color="red"
            count={stats?.incidents}
          />
        )}
        {onToggleFavoritesOnly && (stats?.favorites ?? 0) > 0 && (
          <IconToggle
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill={showFavoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            label="Favorites"
            active={showFavoritesOnly}
            onChange={(v) => onToggleFavoritesOnly(v)}
            color="yellow"
            count={stats?.favorites}
          />
        )}

        {/* Active route/city chips */}
        {route && (
          <button onClick={() => selectedRoute.set(null)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-1 text-[10px] font-medium text-primary whitespace-nowrap">
            {route}
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
        {city && (
          <button onClick={() => selectedCity.set(null)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-1 text-[10px] font-medium text-primary whitespace-nowrap">
            {city}
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
        {county && (
          <button onClick={() => selectedCounty.set(null)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-1 text-[10px] font-medium text-primary whitespace-nowrap">
            {county} Co.
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}

        {hasAnyFilter && (
          <button onClick={clearAllFilters} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors whitespace-nowrap shrink-0">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
