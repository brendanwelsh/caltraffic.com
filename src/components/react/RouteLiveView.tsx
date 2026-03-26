import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
import { useFavorites } from '@/hooks/use-favorites';
import type { RouteCamera } from '@/hooks/use-route-planner';

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
function StableFeed({ camera }: { camera: RouteCamera }) {
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
    <div ref={ref}>
      {hasBeenSeen && camera.streamUrl ? (
        <VideoPlayer streamUrl={camera.streamUrl} imageUrl={camera.imageUrl} cameraName={camera.location} hideControls />
      ) : (
        <img src={camera.imageUrl} alt={camera.location} className="w-full aspect-video object-cover" loading="lazy" />
      )}
    </div>
  );
}

function FeedCard({ camera, routeDuration, isExpanded, onToggle, onMarkPassed }: {
  camera: RouteCamera;
  routeDuration: number;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkPassed?: () => void;
}) {
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const etaMinutes = routeDuration > 0 && !isNaN(routeDuration) ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : null;
  const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;
  const favorite = isFavorite(camera.id);

  return (
    <div className={`flex-1 rounded-xl border overflow-hidden bg-card cursor-pointer transition-shadow ${
      isExpanded ? 'shadow-lg' : 'hover:shadow-md'
    } ${hasIssues ? 'border-red-500/30' : 'border-border/60'}`} onClick={onToggle}>

      {/* Mobile: stacked. Desktop: side by side */}
      <div className="flex flex-col md:flex-row">
        {/* Feed */}
        <div className="md:w-[45%] shrink-0">
          <StableFeed camera={camera} />
        </div>

        {/* Info panel — clean, modern layout */}
        <div className="flex-1 p-2.5 flex flex-col min-w-0">
          {/* Top: Location name + ETA badge */}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight truncate">{camera.location || camera.city}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <RouteShield route={camera.route} size="sm" />
                <span className="text-[11px] text-muted-foreground">{camera.direction}</span>
                <span className="text-[10px] text-muted-foreground">· {camera.city}</span>
              </div>
            </div>
            {/* ETA + live badge */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {etaMinutes != null && (
                <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {etaMinutes}m
                </span>
              )}
              {camera.hasVideo && camera.streamUrl && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  live
                </span>
              )}
            </div>
          </div>

          {/* Middle: Conditions — fills the space */}
          <div className="mt-2 flex-1 space-y-1.5">
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
          <div className="mt-2 pt-1.5 border-t border-border/30 flex items-center gap-1">
            <a href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              Maps
            </a>
            <a href={`/camera/${camera.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              Details
            </a>
            <span className="text-[9px] text-muted-foreground/40 ml-auto">D{String(camera.district).padStart(2, '0')} · PM {camera.postmile.toFixed(1)}</span>
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

      {/* Expanded: full incident logs, all signs, closures */}
      {isExpanded && (
        <div className="border-t border-border p-3 space-y-3">
          {camera.nearbyCMS.length > 2 && (
            <div>
              <h4 className="mb-1.5 text-[11px] font-semibold text-amber-400">All Signs ({camera.nearbyCMS.length})</h4>
              <div className="space-y-1.5">{camera.nearbyCMS.slice(2).map((cms) => <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />)}</div>
            </div>
          )}
          {camera.nearbyIncidents.map((inc) => (
            <div key={inc.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
              <p className="text-xs font-medium">{inc.type} — {inc.location}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{inc.description}</p>
              {inc.logEntries.length > 0 && (
                <div className="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
                  {inc.logEntries.slice(0, 5).map((entry, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground"><span className="font-medium">{entry.time}</span> — {entry.text}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {camera.chainControls.map((cc) => (
            <div key={cc.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs">
              <span className="font-semibold text-blue-400">{cc.level}</span> — {cc.location}
            </div>
          ))}
          {camera.nearbyClosures.map((cl) => (
            <div key={cl.id} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5 text-xs">
              <div className="font-medium">{cl.location}</div>
              <div className="text-[11px] text-muted-foreground">{cl.closureType} — {cl.lanesAffected}</div>
            </div>
          ))}
        </div>
      )}
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
      <span className="ml-auto text-[9px] text-muted-foreground shrink-0">{etaMinutes != null ? `${etaMinutes}m` : '\u2014'}</span>
      <span className="text-[8px] text-muted-foreground/40 italic">unavailable</span>
    </div>
  );
}

export function RouteLiveView({ cameras, routeDuration, onCameraFocus, onUserLocationChange }: RouteLiveViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
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
        {/* Track My Location toggle */}
        <button
          onClick={tracking ? stopTracking : startTracking}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            tracking
              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/>
          </svg>
          {tracking ? 'Stop Tracking' : 'Track My Location'}
        </button>

        {tracking && userLocation && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            Tracking your location...
          </span>
        )}

        {trackingError && (
          <span className="text-[10px] text-red-400">{trackingError}</span>
        )}

        <div className="flex-1" />

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
      </div>

      <div className="space-y-0">
        {sorted.map((camera, i) => {
          const isUnavailable = !camera.imageUrl || camera.isStale;
          const isPassed = passedIds.has(camera.id);
          const showUserDotBefore = tracking && userLocation && userDotInsertIndex === i;

          const userDotElement = showUserDotBefore ? (
            <div className="relative" key={`user-dot-${i}`}>
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
              <div className="relative flex gap-3 py-1.5">
                <div className="flex items-center shrink-0 z-10">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-blue-400 font-medium">
                  <span>You are here</span>
                </div>
              </div>
            </div>
          ) : null;

          // Unavailable: always show collapsed
          if (isUnavailable) {
            return (
              <div key={camera.id}>
                {userDotElement}
                <div className="relative">
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                  <div className="relative flex gap-3 py-0.5">
                    <div className="flex items-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                    </div>
                    <MiniCard camera={camera} routeDuration={routeDuration} />
                  </div>
                </div>
              </div>
            );
          }

          // Passed: show as collapsed mini-row
          if (isPassed) {
            const etaMinutes = routeDuration > 0 && !isNaN(routeDuration) ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : null;
            return (
              <div key={camera.id}>
                {userDotElement}
                <div className="relative">
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                  <div className="relative flex gap-3 py-0.5">
                    <div className="flex items-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-green-500/30" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-1 opacity-50 flex-1">
                      <RouteShield route={camera.route} size="sm" />
                      <span className="text-[10px] text-muted-foreground truncate">{camera.direction} — {camera.location || camera.city}</span>
                      <span className="ml-auto text-[9px] text-muted-foreground shrink-0">{etaMinutes != null ? `${etaMinutes}m` : '\u2014'}</span>
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
                </div>
              </div>
            );
          }

          return (
            <div key={camera.id}>
              {userDotElement}
              <div className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                <div className="relative flex gap-3 py-2">
                  <div className="flex flex-col items-center shrink-0 z-10 pt-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      camera.nearbyIncidents.length > 0 ? 'border-red-500 bg-red-500/30' :
                      camera.hasVideo ? 'border-green-500 bg-green-500/30' :
                      'border-muted-foreground bg-muted'
                    }`} />
                    <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {routeDuration > 0 && !isNaN(routeDuration) ? `${Math.round(camera.progressAlongRoute * (routeDuration / 60))}m` : '\u2014'}
                    </span>
                  </div>
                  <FeedCard
                    camera={camera}
                    routeDuration={routeDuration}
                    isExpanded={expandedId === camera.id}
                    onToggle={() => {
                      setExpandedId(expandedId === camera.id ? null : camera.id);
                      onCameraFocus?.(camera.id);
                    }}
                    onMarkPassed={() => setPassedIds((prev) => new Set(prev).add(camera.id))}
                  />
                </div>
              </div>

              {/* Distance to next available camera */}
              {camera.distanceToNext != null && i < sorted.length - 1 && (
                <div className="relative flex items-center py-0.5 pl-[15px]">
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                  <div className="ml-6 text-[9px] text-muted-foreground/40">
                    {camera.distanceToNext < 1 ? `${Math.round(camera.distanceToNext * 1000)}m` : `${camera.distanceToNext.toFixed(1)}km`}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* User dot after all cameras (when past the last one) */}
        {tracking && userLocation && userDotInsertIndex === sorted.length && (
          <div className="relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
            <div className="relative flex gap-3 py-1.5">
              <div className="flex items-center shrink-0 z-10">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md animate-pulse" />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-blue-400 font-medium">
                <span>You are here</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {available.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No cameras found along this route</p>
        </div>
      )}
    </div>
  );
}
