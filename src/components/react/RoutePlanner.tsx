import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useRoutePlanner } from '@/hooks/use-route-planner';
import { RouteCameraList } from './RouteCameraList';
import { ErrorBoundary } from './ErrorBoundary';

const RouteMapView = lazy(() => import('./RouteMapView').then((m) => ({ default: m.RouteMapView })));

interface GeocodeSuggestion {
  lat: number;
  lon: number;
  label: string;
}

function useGeocodeAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GeocodeSuggestion | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (selected) return; // Don't re-fetch after selecting
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data: GeocodeSuggestion[] = await resp.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query, selected]);

  const select = useCallback((suggestion: GeocodeSuggestion) => {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setSelected(null);
    setSuggestions([]);
    setIsOpen(false);
  }, []);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setSelected(null); // Reset selection when typing
  }, []);

  return { query, setQuery: updateQuery, suggestions, isOpen, setIsOpen, loading, selected, select, clear };
}

export function RoutePlanner() {
  const {
    origin, destination, setOrigin, setDestination, clearRoute,
    routeData, routeCameras, routeError, routeLoading,
    routeDistance, routeDuration,
  } = useRoutePlanner();

  const originAC = useGeocodeAutocomplete();
  const destAC = useGeocodeAutocomplete();
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handlePlanRoute = useCallback(() => {
    setGeocodeError(null);

    if (!originAC.selected) {
      setGeocodeError('Please select an origin from the dropdown suggestions');
      return;
    }
    if (!destAC.selected) {
      setGeocodeError('Please select a destination from the dropdown suggestions');
      return;
    }

    setOrigin(originAC.selected);
    setDestination(destAC.selected);
  }, [originAC.selected, destAC.selected, setOrigin, setDestination]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePlanRoute();
  }, [handlePlanRoute]);

  const handleClear = useCallback(() => {
    clearRoute();
    originAC.clear();
    destAC.clear();
    setGeocodeError(null);
  }, [clearRoute, originAC.clear, destAC.clear]);

  const totalIncidents = routeCameras.reduce((sum, c) => sum + c.nearbyIncidents.length, 0);
  const totalClosures = routeCameras.reduce((sum, c) => sum + c.nearbyClosures.length, 0);
  const totalChainControls = routeCameras.reduce((sum, c) => sum + c.chainControls.length, 0);

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {/* Route input form */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Plan Your Route</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Origin input with autocomplete */}
            <div className="relative flex-1">
              <div className="absolute left-2.5 top-[18px] -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 z-10" />
              <input
                type="text"
                placeholder="From (city or address)"
                value={originAC.query}
                onChange={(e) => originAC.setQuery(e.target.value)}
                onFocus={() => originAC.suggestions.length > 0 && originAC.setIsOpen(true)}
                onKeyDown={handleKeyDown}
                className="h-9 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {originAC.loading && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
              {originAC.isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                  {originAC.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => originAC.select(s)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border last:border-0"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination input with autocomplete */}
            <div className="relative flex-1">
              <div className="absolute left-2.5 top-[18px] -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 z-10" />
              <input
                type="text"
                placeholder="To (city or address)"
                value={destAC.query}
                onChange={(e) => destAC.setQuery(e.target.value)}
                onFocus={() => destAC.suggestions.length > 0 && destAC.setIsOpen(true)}
                onKeyDown={handleKeyDown}
                className="h-9 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {destAC.loading && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
              {destAC.isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                  {destAC.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => destAC.select(s)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border last:border-0"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handlePlanRoute}
              disabled={routeLoading || !originAC.selected || !destAC.selected}
              className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {routeLoading ? 'Loading...' : 'Plan Route'}
            </button>
            {(origin || originAC.query) && (
              <button
                onClick={handleClear}
                className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-accent transition-colors shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          {geocodeError && <p className="mt-2 text-xs text-red-400">{geocodeError}</p>}
          {routeError && <p className="mt-2 text-xs text-red-400">Failed to calculate route. Try different locations.</p>}
        </div>

        {/* Route summary */}
        {routeData && (
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-border px-2.5 py-1">
              {(routeDistance / 1609.34).toFixed(0)} miles
            </span>
            <span className="rounded-full border border-border px-2.5 py-1">
              ~{Math.round(routeDuration / 60)} min drive
            </span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
              {routeCameras.length} cameras on route
            </span>
            {totalIncidents > 0 && (
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-400">
                {totalIncidents} incident{totalIncidents > 1 ? 's' : ''}
              </span>
            )}
            {totalClosures > 0 && (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-orange-400">
                {totalClosures} closure{totalClosures > 1 ? 's' : ''}
              </span>
            )}
            {totalChainControls > 0 && (
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-400">
                {totalChainControls} chain control{totalChainControls > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Route map + camera list */}
        {routeData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<div className="h-[50vh] animate-pulse rounded-lg bg-muted" />}>
              <RouteMapView
                routeCoords={routeData.geometry.coordinates}
                cameras={routeCameras}
              />
            </Suspense>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-card">
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-3 py-2">
                <h3 className="text-xs font-semibold">
                  Cameras Along Route ({routeCameras.length})
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {origin?.label} → {destination?.label}
                </p>
              </div>
              <RouteCameraList cameras={routeCameras} routeDuration={routeDuration} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!routeData && !routeLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30 mb-4">
              <path d="m3 3 7 7" /><path d="m14 21-7-7" /><path d="m3 21 18-18" /><path d="M21 14v7h-7" /><path d="M3 10V3h7" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Enter an origin and destination to see cameras along your route
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Start typing a city name and select from the dropdown
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
