import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useRoutePlanner } from '@/hooks/use-route-planner';
import { RouteLiveView } from './RouteLiveView';
import { CameraDetailDialog } from './CameraDetailDialog';
import { VideoPlayer } from './VideoPlayer';
import { RouteShield } from './RouteShield';
import { ErrorBoundary } from './ErrorBoundary';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

const RouteMapView = lazy(() => import('./RouteMapView').then((m) => ({ default: m.RouteMapView })));

interface GeocodeSuggestion {
  lat: number;
  lon: number;
  label: string;
}

function useGeocodeAutocomplete(initial?: GeocodeSuggestion | null) {
  const [query, setQuery] = useState(initial?.label ?? '');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GeocodeSuggestion | null>(initial ?? null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (selected) return;
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
    setSelected(null);
  }, []);

  return { query, setQuery: updateQuery, suggestions, isOpen, setIsOpen, loading, selected, select, clear };
}

function AutocompleteInput({ ac, label, placeholder, onKeyDown }: {
  ac: ReturnType<typeof useGeocodeAutocomplete>;
  label: string;
  placeholder: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div className="relative flex-1">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground z-10">{label}</span>
      <input
        type="search"
        role="combobox"
        placeholder={placeholder}
        value={ac.query}
        onChange={(e) => ac.setQuery(e.target.value)}
        onFocus={() => ac.suggestions.length > 0 && ac.setIsOpen(true)}
        onBlur={() => setTimeout(() => ac.setIsOpen(false), 200)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        className={`h-9 w-full rounded-lg border bg-background pl-12 pr-8 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
          ac.selected ? 'border-green-500/50' : 'border-input'
        }`}
      />
      {ac.loading && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
      {ac.selected && !ac.loading && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
      )}
      {ac.isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
          {ac.suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => ac.select(s)}
              className="w-full px-3 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border last:border-0 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const PRESET_ROUTES = [
  { label: 'Sacramento → SF', from: { lat: 38.581, lon: -121.494, label: 'Sacramento' }, to: { lat: 37.775, lon: -122.419, label: 'San Francisco' } },
  { label: 'Sacramento → LA', from: { lat: 38.581, lon: -121.494, label: 'Sacramento' }, to: { lat: 34.054, lon: -118.243, label: 'Los Angeles' } },
  { label: 'SF → LA', from: { lat: 37.775, lon: -122.419, label: 'San Francisco' }, to: { lat: 34.054, lon: -118.243, label: 'Los Angeles' } },
  { label: 'LA → San Diego', from: { lat: 34.054, lon: -118.243, label: 'Los Angeles' }, to: { lat: 32.716, lon: -117.161, label: 'San Diego' } },
  { label: 'Folsom → Sacramento', from: { lat: 38.678, lon: -121.176, label: 'Folsom' }, to: { lat: 38.581, lon: -121.494, label: 'Sacramento' } },
  { label: 'SF → San Jose', from: { lat: 37.775, lon: -122.419, label: 'San Francisco' }, to: { lat: 37.339, lon: -121.895, label: 'San Jose' } },
  { label: 'LA → Bakersfield', from: { lat: 34.054, lon: -118.243, label: 'Los Angeles' }, to: { lat: 35.373, lon: -119.019, label: 'Bakersfield' } },
  { label: 'Sacramento → Tahoe', from: { lat: 38.581, lon: -121.494, label: 'Sacramento' }, to: { lat: 39.097, lon: -120.032, label: 'South Lake Tahoe' } },
  { label: 'LA → Palm Springs', from: { lat: 34.054, lon: -118.243, label: 'Los Angeles' }, to: { lat: 33.830, lon: -116.545, label: 'Palm Springs' } },
  { label: 'Fresno → SF', from: { lat: 36.738, lon: -119.784, label: 'Fresno' }, to: { lat: 37.775, lon: -122.419, label: 'San Francisco' } },
];

const DEFAULT_PRESET = PRESET_ROUTES.find((r) => r.label === 'Folsom → Sacramento')!;

export function RoutePlanner() {
  const {
    origin, destination, setOrigin, setDestination, clearRoute,
    routeLineCoords, routeLineLoading, hasRoute,
    routeCameras, routeLoading,
    routeDistance, routeDuration, routeSteps,
  } = useRoutePlanner(DEFAULT_PRESET.from, DEFAULT_PRESET.to);
  const originAC = useGeocodeAutocomplete(DEFAULT_PRESET.from);
  const destAC = useGeocodeAutocomplete(DEFAULT_PRESET.to);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [routeView, setRouteView] = useState<'list' | 'grid'>('list');
  const [showMap, setShowMap] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<EnrichedCamera | null>(null);
  const [focusedCameraId, setFocusedCameraId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const handlePlanRoute = useCallback(() => {
    setGeocodeError(null);
    if (!originAC.selected) {
      setGeocodeError('Select an origin from the suggestions');
      return;
    }
    if (!destAC.selected) {
      setGeocodeError('Select a destination from the suggestions');
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

  const [dismissSampleBanner, setDismissSampleBanner] = useState(false);
  const isDefaultRoute = origin?.label === 'Folsom' && destination?.label === 'Sacramento';

  const totalIncidents = routeCameras.reduce((sum, c) => sum + c.nearbyIncidents.length, 0);
  const totalClosures = routeCameras.reduce((sum, c) => sum + c.nearbyClosures.length, 0);
  const totalChainControls = routeCameras.reduce((sum, c) => sum + c.chainControls.length, 0);
  const routeHasChainControl = routeCameras.some(c => c.chainControls.length > 0);
  const routeHasWeatherAlert = routeCameras.some(c => c.weatherAlerts.length > 0);

  // Collect unique weather alert headlines and chain control details for banners
  const weatherAlertHeadlines = routeHasWeatherAlert
    ? [...new Set(routeCameras.flatMap(c => c.weatherAlerts.map((a: any) => a.headline || a.event || 'Weather Alert')))]
    : [];
  const chainControlDetails = routeHasChainControl
    ? (() => {
        const seen = new Set<string>();
        return routeCameras
          .filter(c => c.chainControls.length > 0)
          .flatMap(c => c.chainControls.map((cc: any) => ({ level: cc.level || 'R1', route: cc.route || c.route, location: cc.location || c.location || c.city })))
          .filter(cc => { const key = `${cc.level}-${cc.route}`; if (seen.has(key)) return false; seen.add(key); return true; })
          .slice(0, 3);
      })()
    : [];

  return (
    <ErrorBoundary>
      <div className="space-y-2">
        {/* Route input form — compact single row when route is active */}
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <AutocompleteInput ac={originAC} label="FROM" placeholder="City, address, or landmark" onKeyDown={handleKeyDown} />
            <AutocompleteInput ac={destAC} label="TO" placeholder="City, address, or landmark" onKeyDown={handleKeyDown} />
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={handlePlanRoute}
                disabled={routeLoading || !originAC.selected || !destAC.selected}
                className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {routeLoading ? 'Loading...' : 'Plan Route'}
              </button>
              {(origin || originAC.query) && (
                <button onClick={handleClear} className="h-9 rounded-lg border border-red-500/40 bg-red-500/10 px-4 text-xs font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
                  Clear Route
                </button>
              )}
            </div>
          </div>
          {geocodeError && <p className="mt-1.5 text-xs text-red-400">{geocodeError}</p>}

          {/* Preset routes */}
          {!hasRoute && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2 pt-2 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground mr-1 self-center">Quick:</span>
              {PRESET_ROUTES.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    originAC.select(preset.from);
                    destAC.select(preset.to);
                    setOrigin(preset.from);
                    setDestination(preset.to);
                  }}
                  className="rounded-full border border-border px-2.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sample route banner */}
        {hasRoute && isDefaultRoute && !dismissSampleBanner && (
          <div className="flex items-center gap-1.5 rounded border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">
            <span>Sample route: Folsom → Sacramento · Enter your own above</span>
            <button
              onClick={() => setDismissSampleBanner(true)}
              className="shrink-0 rounded p-0.5 hover:bg-accent transition-colors"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}

        {/* Controls bar */}
        {hasRoute && routeCameras.length > 0 && (
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground">
              {routeCameras.length} cameras · {routeCameras.filter(c => c.hasVideo && c.streamUrl).length} live
            </p>

            <div className="flex-1" />

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setRouteView('list')}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  routeView === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setRouteView('grid')}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  routeView === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                Grid
              </button>
            </div>

            <button
              onClick={() => setShowMap((v) => !v)}
              className="hidden lg:inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent transition-colors"
            >
              {showMap ? 'Hide map' : 'Show map'}
            </button>
          </div>
        )}

        {/* Loading state — show spinner immediately when route is set but cameras haven't loaded yet */}
        {hasRoute && routeCameras.length === 0 && (routeLoading || routeLineLoading) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent mb-4" />
            <p className="text-sm font-medium">Finding route and cameras...</p>
            <p className="mt-1 text-xs text-muted-foreground">Calculating the best path and locating cameras along it</p>
          </div>
        )}

        {/* Main content: Feed/Grid (left) + Map (right) */}
        {hasRoute && !routeLoading && routeCameras.length > 0 && (
          <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
            {/* Left: scrollable feed timeline or camera grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* Route alert banners */}
              {routeHasWeatherAlert && (
                <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  <span className="shrink-0 mt-0.5">&#x26A0;&#xFE0F;</span>
                  <div>
                    <span className="font-semibold">Weather Alert:</span>{' '}
                    {weatherAlertHeadlines.join('; ')} affecting your route
                  </div>
                </div>
              )}
              {routeHasChainControl && (
                <div className="mb-2 flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
                  <span className="shrink-0 mt-0.5">&#x1F517;</span>
                  <div>
                    <span className="font-semibold">Chain Control:</span>{' '}
                    {chainControlDetails.map((cc, i) => (
                      <span key={i}>{i > 0 && ' · '}{cc.level} active on {cc.route} near {cc.location}</span>
                    ))}
                  </div>
                </div>
              )}

              {routeView === 'list' ? (
                <RouteLiveView cameras={routeCameras} routeDuration={routeDuration} onCameraFocus={setFocusedCameraId} onUserLocationChange={setUserLocation} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                  {routeCameras.map((camera) => {
                    const isUnavailable = !camera.imageUrl || camera.isStale;
                    if (isUnavailable) {
                      return (
                        <div key={camera.id} className="rounded-xl border border-border/30 overflow-hidden bg-card/40 opacity-50">
                          <div className="aspect-video bg-muted flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground italic">Unavailable</span>
                          </div>
                          <div className="px-2.5 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <RouteShield route={camera.route} size="sm" />
                              <span className="text-xs font-medium truncate">{camera.direction}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{camera.location || camera.city}</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                    <div
                      key={camera.id}
                      className="rounded-xl border border-border/60 overflow-hidden bg-card cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedCamera(camera)}
                    >
                      <VideoPlayer streamUrl={camera.streamUrl} imageUrl={camera.imageUrl} cameraName={camera.location} hideControls />
                      <div className="px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <RouteShield route={camera.route} size="sm" />
                          <span className="text-xs font-medium truncate">{camera.direction}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{camera.location || camera.city}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: map + route info (hideable) */}
            {showMap && (
              <div className="hidden lg:flex lg:flex-col w-[45%] shrink-0 gap-3 overflow-y-auto">
                <Suspense fallback={<div className="h-[50vh] animate-pulse rounded-lg bg-muted" />}>
                  <div style={{ minHeight: '350px', height: '45vh' }}>
                    <RouteMapView
                      routeCoords={routeLineCoords}
                      routeLineLoading={routeLineLoading}
                      cameras={routeCameras}
                      origin={origin}
                      destination={destination}
                      focusedCameraId={focusedCameraId}
                      userLocation={userLocation}
                    />
                  </div>
                </Suspense>

                {/* Route summary */}
                <div className="rounded-lg border border-border bg-card p-3">
                  <h3 className="text-xs font-semibold mb-2">Route Overview</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Distance</span>
                      <span className="font-medium">{(routeDistance / 1609.34).toFixed(0)} mi</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Drive Time</span>
                      <span className="font-medium">~{routeDuration > 0 ? Math.round(routeDuration / 60) : '—'} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cameras</span>
                      <span className="font-medium text-primary">{routeCameras.length}</span>
                    </div>
                    {totalIncidents > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Incidents</span>
                        <span className="font-medium text-red-400">{totalIncidents}</span>
                      </div>
                    )}
                    {totalClosures > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Closures</span>
                        <span className="font-medium text-orange-400">{totalClosures}</span>
                      </div>
                    )}
                    {totalChainControls > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Chain Control</span>
                        <span className="font-medium text-blue-400">{totalChainControls}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Turn-by-turn directions */}
                {routeSteps.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <h3 className="text-xs font-semibold mb-2">Directions</h3>
                    <div className="space-y-0">
                      {routeSteps.map((step: any, i: number) => {
                        // Find a camera on this road segment to focus when clicked
                        const matchingCamera = routeCameras.find((c) =>
                          c.route && step.name && (
                            c.location?.toLowerCase().includes(step.name.toLowerCase()) ||
                            step.name.toLowerCase().includes(c.route.toLowerCase())
                          )
                        );
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0 ${matchingCamera ? 'cursor-pointer hover:bg-accent/50 rounded-md -mx-1 px-1' : ''} transition-colors`}
                            onClick={() => {
                              if (matchingCamera) {
                                setFocusedCameraId(matchingCamera.id);
                                document.getElementById(`feed-${matchingCamera.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                          >
                            <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground mt-0.5">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs">
                                <span className="text-muted-foreground capitalize">{step.type === 'depart' ? 'Start on' : step.type === 'arrive' ? 'Arrive at' : step.modifier || step.type}</span>
                                {' '}<span className="font-medium">{step.name}</span>
                                {matchingCamera && <span className="text-[9px] text-primary ml-1">({routeCameras.filter(c => c.location?.toLowerCase().includes(step.name.toLowerCase()) || step.name.toLowerCase().includes(c.route.toLowerCase())).length} cam)</span>}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(step.distance / 1609.34).toFixed(1)} mi · ~{Math.max(1, Math.round(step.duration / 60))} min
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Camera detail dialog for grid view */}
        {selectedCamera && (
          <CameraDetailDialog
            camera={selectedCamera}
            onClose={() => setSelectedCamera(null)}
          />
        )}

        {/* Empty / no cameras state — only after loading is fully done */}
        {hasRoute && routeCameras.length === 0 && !routeLoading && !routeLineLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No cameras found along this route</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Try a longer distance or different cities</p>
          </div>
        )}

        {/* Initial empty state */}
        {!hasRoute && !routeLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30 mb-4">
              <path d="m3 3 7 7" /><path d="m14 21-7-7" /><path d="m3 21 18-18" /><path d="M21 14v7h-7" /><path d="M3 10V3h7" />
            </svg>
            <p className="text-sm text-muted-foreground">
              See what's ahead — enter your origin and destination to view live traffic cameras along your route
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/60">
              Or try a popular route above
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
