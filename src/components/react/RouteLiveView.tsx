import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { CameraDetailDialog } from './CameraDetailDialog';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
import { useFavorites } from '@/hooks/use-favorites';
import type { RouteCamera } from '@/hooks/use-route-planner';

/** Format minutes as "2h 31m" when > 60, otherwise "31m" */
function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hrs > 0 ? `${hrs}h ${remainder}m` : `${minutes}m`;
}

/** Haversine distance in km between two lat/lon points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RouteLiveViewProps {
  cameras: RouteCamera[];
  routeDuration: number;
  onCameraFocus?: (id: string) => void;
  onUserLocationChange?: (loc: { lat: number; lon: number } | null) => void;
}

/** Mount video once seen, keep mounted. Static images always show. */
function StableFeed({ camera, onClick }: { camera: RouteCamera; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  useEffect(() => {
    if (!ref.current || !camera.streamUrl || hasBeenSeen) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHasBeenSeen(true); observer.disconnect(); } },
      { rootMargin: '300px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [camera.streamUrl, hasBeenSeen]);

  return (
    <div ref={ref} onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }} className={onClick ? 'cursor-pointer' : undefined}>
      {hasBeenSeen && camera.streamUrl ? (
        <div className="aspect-video overflow-hidden bg-black">
          <VideoPlayer streamUrl={camera.streamUrl} imageUrl={camera.imageUrl} cameraName={camera.location} hideControls />
        </div>
      ) : (
        <div className="aspect-video overflow-hidden bg-black">
          <img src={camera.imageUrl} alt={camera.location} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
    </div>
  );
}

function FeedCard({ camera, routeDuration, onCameraFocus, onMarkPassed, onOpenDetail }: {
  camera: RouteCamera;
  routeDuration: number;
  onCameraFocus?: () => void;
  onMarkPassed?: () => void;
  onOpenDetail?: () => void;
}) {
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const etaMinutes = routeDuration > 0 && !isNaN(routeDuration) ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : null;
  const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;
  const favorite = isFavorite(camera.id);

  return (
    <div id={`feed-${camera.id}`} className={`rounded-xl border overflow-hidden bg-card transition-shadow flex-1 min-w-0 hover:shadow-md ${hasIssues ? 'border-red-500/30' : 'border-border/60'}`}>

      {/* Mobile: stacked. Desktop: side by side */}
      <div className="flex flex-col md:flex-row">
        {/* Feed — 35% on desktop so info panel has room to fill */}
        <div className="md:w-[35%] shrink-0">
          <StableFeed camera={camera} onClick={onOpenDetail} />
        </div>

        {/* Info panel — clean, modern layout */}
        <div className="flex-1 p-1.5 md:p-2.5 min-w-0 cursor-pointer" onClick={onCameraFocus}>
          {/* Top: Location name + ETA badge */}
          <div className="flex items-start gap-1.5 md:gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-bold leading-tight truncate">{camera.location || camera.city}</p>
              <div className="flex items-center gap-1 md:gap-1.5 mt-0.5">
                <RouteShield route={camera.route} size="md" />
                <span className="text-[10px] md:text-[11px] text-muted-foreground">{camera.direction}</span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground">· {camera.city}</span>
              </div>
            </div>
            {/* ETA badge */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {etaMinutes != null && (
                <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {formatDuration(etaMinutes)}
                </span>
              )}
            </div>
          </div>

          {/* Details row */}
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            {camera.county} County · District {camera.district} · PM {camera.postmile.toFixed(1)}
          </div>

          {/* Conditions */}
          <div className="mt-1 md:mt-1.5 space-y-1 md:space-y-1.5">
            <ConditionBadges chainControls={camera.chainControls} closures={camera.nearbyClosures} travelTime={camera.travelTime} />

            {camera.nearbyIncidents.length > 0 && (
              <div className="flex items-start gap-1.5 rounded-md bg-red-500/5 border border-red-500/20 p-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
                <div>
                  <span className="text-xs text-red-400 font-semibold">{camera.nearbyIncidents.map((inc) => inc.type).join(', ')}</span>
                  {camera.nearbyIncidents[0]?.description && (
                    <p className="text-[10px] text-red-400/70 mt-0.5">{camera.nearbyIncidents[0].description}</p>
                  )}
                </div>
              </div>
            )}

            {/* CMS signs always shown */}
            {camera.nearbyCMS.slice(0, 2).map((cms) => (
              <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />
            ))}
          </div>

          {/* Bottom: Actions bar */}
          <div className="mt-1.5 md:mt-2 pt-1 md:pt-1.5 border-t border-border/30 flex items-center gap-1">
            <a href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              Google Maps
            </a>
            <a href={`/camera/${camera.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              Details
            </a>
            {onCameraFocus && (
              <button onClick={(e) => { e.stopPropagation(); onCameraFocus(); }} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                Show on Map
              </button>
            )}
            <span className="flex-1" />
            <div className="flex items-center gap-0">
              {onMarkPassed && (
                <button onClick={(e) => { e.stopPropagation(); onMarkPassed(); }} className="p-1 rounded-md text-muted-foreground/30 hover:text-green-400 transition-colors" title="Mark as passed">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }} className={`p-1 rounded-md transition-colors ${favorite ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-muted-foreground'}`} title="Favorite">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/** Collapsed mini row for unavailable cameras */
function MiniCard({ camera, routeDuration }: { camera: RouteCamera; routeDuration: number }) {
  const etaMinutes = routeDuration > 0 && !isNaN(routeDuration) ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-1 opacity-50">
      <RouteShield route={camera.route} size="sm" />
      <span className="text-[10px] text-muted-foreground truncate">{camera.direction} — {camera.location || camera.city}</span>
      <span className="ml-auto text-[9px] text-muted-foreground shrink-0">{etaMinutes != null ? formatDuration(etaMinutes) : '\u2014'}</span>
      <span className="text-[8px] text-muted-foreground/40 italic">unavailable</span>
    </div>
  );
}

export function RouteLiveView({ cameras, routeDuration, onCameraFocus, onUserLocationChange }: RouteLiveViewProps) {
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<RouteCamera | null>(null);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const sorted = [...cameras].sort((a, b) => a.progressAlongRoute - b.progressAlongRoute);
  const available = sorted.filter(c => c.imageUrl && !c.isStale);
  const unavailable = sorted.filter(c => !c.imageUrl || c.isStale);
  const liveCount = available.filter(c => c.hasVideo && c.streamUrl).length;

  // Compute user's progress along route (0-1) based on nearest camera
  const userProgress = useMemo(() => {
    if (!userLocation || sorted.length === 0) return null;
    let bestDist = Infinity;
    let bestProgress = 0;
    for (const cam of sorted) {
      const d = haversineKm(userLocation.lat, userLocation.lon, cam.latitude, cam.longitude);
      if (d < bestDist) {
        bestDist = d;
        bestProgress = cam.progressAlongRoute;
      }
    }
    return bestProgress;
  }, [userLocation, sorted]);

  // Auto-mark cameras as passed when tracking
  useEffect(() => {
    if (!tracking || !userLocation || !userProgress) return;
    const newPassed = new Set(passedIds);
    let changed = false;
    for (const cam of sorted) {
      if (passedIds.has(cam.id)) continue;
      const dist = haversineKm(userLocation.lat, userLocation.lon, cam.latitude, cam.longitude);
      // Within 500m AND the camera is behind us (lower progress)
      if (dist <= 0.5 && cam.progressAlongRoute < userProgress) {
        newPassed.add(cam.id);
        changed = true;
      }
    }
    if (changed) setPassedIds(newPassed);
  }, [userLocation, userProgress, tracking, sorted]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported by your browser');
      return;
    }
    setTrackingError(null);
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        onUserLocationChange?.(loc);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setTrackingError('Location permission denied');
        } else {
          setTrackingError('Unable to get your location');
        }
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, [onUserLocationChange]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setUserLocation(null);
    onUserLocationChange?.(null);
  }, [onUserLocationChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Find where user dot goes in the timeline (between which camera indices)
  const userDotInsertIndex = useMemo(() => {
    if (userProgress === null) return null;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].progressAlongRoute > userProgress) return i;
    }
    return sorted.length;
  }, [userProgress, sorted]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        {passedIds.size > 0 && (
          <p className="text-[10px] text-muted-foreground">{passedIds.size} passed</p>
        )}
        {passedIds.size > 0 && (
          <button
            onClick={() => setPassedIds(new Set())}
            className="text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Reset
          </button>
        )}

        <div className="flex-1" />

        {trackingError && (
          <span className="text-[10px] text-red-400">{trackingError}</span>
        )}

        {tracking && userLocation && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            Tracking
          </span>
        )}

        {/* Hide unavailable cameras toggle */}
        <button
          onClick={() => setHideUnavailable((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors ${
            hideUnavailable
              ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          {hideUnavailable ? 'Show All' : 'Hide N/A'}
        </button>

        {/* Track My Location toggle */}
        <button
          onClick={tracking ? stopTracking : startTracking}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors ${
            tracking
              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/>
          </svg>
          {tracking ? 'Stop' : 'Track'}
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((camera, i) => {
          const isUnavailable = !camera.imageUrl || camera.isStale;
          const isPassed = passedIds.has(camera.id);
          const showUserDotBefore = tracking && userLocation && userDotInsertIndex === i;

          const userDotElement = showUserDotBefore ? (
            <div className="flex items-center gap-2 py-1" key={`user-dot-${i}`}>
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse shrink-0" />
              <span className="text-[10px] text-blue-400 font-medium">You are here</span>
            </div>
          ) : null;

          // Unavailable: show collapsed or hide entirely
          if (isUnavailable) {
            if (hideUnavailable) {
              return userDotElement ? <div key={camera.id}>{userDotElement}</div> : null;
            }
            return (
              <div key={camera.id}>
                {userDotElement}
                <MiniCard camera={camera} routeDuration={routeDuration} />
              </div>
            );
          }

          // Passed: show as collapsed mini-row
          if (isPassed) {
            const etaMinutes = routeDuration > 0 && !isNaN(routeDuration) ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : null;
            return (
              <div key={camera.id}>
                {userDotElement}
                <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-1 opacity-50">
                  <RouteShield route={camera.route} size="sm" />
                  <span className="text-[10px] text-muted-foreground truncate">{camera.direction} — {camera.location || camera.city}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground shrink-0">{etaMinutes != null ? formatDuration(etaMinutes) : '\u2014'}</span>
                  <span className="text-[8px] text-green-500/60 italic shrink-0">passed</span>
                  <button
                    onClick={() => setPassedIds((prev) => { const next = new Set(prev); next.delete(camera.id); return next; })}
                    className="text-[9px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Undo passed"
                  >
                    undo
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={camera.id}>
              {userDotElement}
              <FeedCard
                camera={camera}
                routeDuration={routeDuration}
                onCameraFocus={() => onCameraFocus?.(camera.id)}
                onMarkPassed={() => setPassedIds((prev) => new Set(prev).add(camera.id))}
                onOpenDetail={() => setSelectedCamera(camera)}
              />

              {/* Distance to next available camera */}
              {camera.distanceToNext != null && i < sorted.length - 1 && (
                <div className="flex items-center justify-center py-0.5">
                  <span className="text-[9px] text-muted-foreground/40">
                    {camera.distanceToNext < 1 ? `${Math.round(camera.distanceToNext * 1000)}m` : `${camera.distanceToNext.toFixed(1)}km`}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* User dot after all cameras (when past the last one) */}
        {tracking && userLocation && userDotInsertIndex === sorted.length && (
          <div className="flex items-center gap-2 py-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse shrink-0" />
            <span className="text-[10px] text-blue-400 font-medium">You are here</span>
          </div>
        )}
      </div>

      {available.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No cameras found along this route</p>
        </div>
      )}

      {selectedCamera && (
        <CameraDetailDialog
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </div>
  );
}
