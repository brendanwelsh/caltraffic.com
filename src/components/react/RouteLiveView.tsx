import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { playAllLive } from '@/stores/filters';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { CameraDetailDialog } from './CameraDetailDialog';
import { RouteShield } from './RouteShield';
import { ConditionIcons } from './ConditionIcons';
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

interface PemsStation {
  latitude: number;
  longitude: number;
  speed: number | null;
  name: string;
  freewayId: string;
  freewayDir: string;
  flow: number;
}

interface RouteLiveViewProps {
  cameras: RouteCamera[];
  routeDuration: number;
  onCameraFocus?: (id: string) => void;
  onUserLocationChange?: (loc: { lat: number; lon: number } | null) => void;
  pemsStations?: PemsStation[];
}

/** Max concurrent HLS streams — prevents bandwidth competition */
const MAX_STREAMS = 4;
const activeStreamIds = new Set<string>();

/** Show static image immediately, mount video only when in viewport, unmount when scrolled away. */
function StableFeed({ camera, onClick, forcePlay }: { camera: RouteCamera; onClick?: () => void; forcePlay?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inViewport, setInViewport] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Viewport enter/exit observer
  useEffect(() => {
    if (!forcePlay || !camera.streamUrl) return;
    if (!ref.current) return;

    const enterObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !activeStreamIds.has(camera.id) && activeStreamIds.size < MAX_STREAMS) {
          activeStreamIds.add(camera.id);
          setInViewport(true);
        }
      },
      { rootMargin: '400px' },
    );

    const exitObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && activeStreamIds.has(camera.id)) {
          activeStreamIds.delete(camera.id);
          setInViewport(false);
          setVideoPlaying(false);
        }
      },
      { rootMargin: '600px' },
    );

    enterObserver.observe(ref.current);
    exitObserver.observe(ref.current);

    return () => {
      enterObserver.disconnect();
      exitObserver.disconnect();
      activeStreamIds.delete(camera.id);
    };
  }, [forcePlay, camera.streamUrl, camera.id]);

  // When Play All is off but camera has a stream, still use viewport observer for on-demand play
  useEffect(() => {
    if (forcePlay || !camera.streamUrl) return;
    // Play All turned off — release stream slot, show static image
    activeStreamIds.delete(camera.id);
    setInViewport(false);
    setVideoPlaying(false);
  }, [forcePlay, camera.streamUrl, camera.id]);

  const showVideo = forcePlay && inViewport && camera.streamUrl;

  return (
    <div ref={ref} onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }} className={`h-full relative ${onClick ? 'cursor-pointer' : ''}`}>
      {/* Base layer: static snapshot — always rendered */}
      <img
        src={camera.imageUrl}
        alt={camera.location}
        className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
      />
      {/* Shimmer while image loads */}
      {!imgLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/30" />
      )}
      {/* Video layer: mounted/unmounted based on viewport */}
      {showVideo && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${videoPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <VideoPlayer
            streamUrl={camera.streamUrl}
            imageUrl={camera.imageUrl}
            cameraName={camera.location}
            hideControls
            onPlaying={() => setVideoPlaying(true)}
          />
        </div>
      )}
    </div>
  );
}

/** Full-width CMS sign card — displayed as its own entity in the feed */
function CMSFeedCard({ cms, camera }: { cms: any; camera: RouteCamera }) {
  const allBlank = cms.phase1Lines.every((l: string) => !l.trim()) && (!cms.phase2Lines || cms.phase2Lines.every((l: string) => !l.trim()));
  if (allBlank) return null;

  return (
    <div className="rounded-lg border border-amber-600/30 overflow-hidden bg-card hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:h-[200px]">
        {/* Sign display — fills the entire left area */}
        <div className="md:w-[35%] shrink-0 bg-black flex items-center justify-center rounded-md border-2 border-amber-700/40 overflow-hidden">
          <div className="w-full h-full flex flex-col items-center justify-center px-3 py-4">
            {cms.phase1Lines.map((line: string, i: number) => (
              <div key={i} className="text-center text-base md:text-lg font-[sv170singlestroke,monospace] font-bold tracking-widest text-yellow-400 leading-relaxed uppercase">
                {line || '\u00A0'}
              </div>
            ))}
            {cms.phase2Lines && cms.phase2Lines.length > 0 && cms.phase2Lines.some((l: string) => l.trim()) && (
              <>
                <div className="my-2 w-3/4 border-t border-amber-700/30" />
                {cms.phase2Lines.map((line: string, i: number) => (
                  <div key={i} className="text-center text-base md:text-lg font-[sv170singlestroke,monospace] font-bold tracking-widest text-yellow-400 leading-relaxed uppercase">
                    {line || '\u00A0'}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="flex-1 min-w-0 flex flex-col p-2.5 md:p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-400 shrink-0">
              Highway Sign
            </span>
            <RouteShield route={cms.route || camera.route} size="md" />
          </div>

          <p className="text-sm md:text-base font-bold mt-1.5">{cms.location}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{cms.direction || camera.direction} · {camera.city}</p>

          <div className="flex-1" />

          <div className="mt-auto pt-1.5 border-t border-border/30 flex items-center gap-1">
            <a href={`https://www.google.com/maps?q=${cms.latitude},${cms.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedCard({ camera, routeDuration, cameraIndex, forcePlay, onCameraFocus, onMarkPassed, onOpenDetail, nearestSpeed }: {
  camera: RouteCamera;
  routeDuration: number;
  cameraIndex?: number;
  forcePlay?: boolean;
  onCameraFocus?: () => void;
  onMarkPassed?: () => void;
  onOpenDetail?: () => void;
  nearestSpeed?: number | null;
}) {
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const etaMinutes = routeDuration > 0 && !isNaN(routeDuration) ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : null;
  const favorite = isFavorite(camera.id);

  return (
    <div id={`feed-${camera.id}`} className="rounded-lg border border-border/60 overflow-hidden bg-card transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        {/* Feed — 35% on desktop, fixed aspect ratio */}
        <div className="md:w-[35%] shrink-0 overflow-hidden relative">
          <div className="aspect-video md:aspect-auto md:h-[180px]">
            <StableFeed camera={camera} onClick={onOpenDetail} forcePlay={forcePlay} />
          </div>
          {camera.hasVideo && camera.streamUrl && (
            <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-bold text-white uppercase">Live</span>
            </span>
          )}
          {cameraIndex != null && (
            <span className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
              {cameraIndex}
            </span>
          )}
        </div>

        {/* Info panel — click opens detail popup */}
        <div className="flex-1 min-w-0 flex flex-col p-2.5 md:p-3 cursor-pointer" onClick={onOpenDetail}>
          {/* Top: route shield + camera name + condition icons */}
          <div className="flex items-start gap-2">
            <RouteShield route={camera.route} size="md" />
            <h3 className="text-sm md:text-lg font-bold leading-tight truncate flex-1">{camera.location || camera.city}</h3>
            <ConditionIcons
              incidents={camera.nearbyIncidents}
              chainControls={camera.chainControls}
              travelTime={camera.travelTime}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{camera.direction} · {camera.city}, {camera.county} Co.</p>

          {/* ETA + speed + distance side by side */}
          <div className="flex items-center gap-2 mt-1.5">
            {etaMinutes != null && (
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                {formatDuration(etaMinutes)} away
              </span>
            )}
            {nearestSpeed != null && (
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold shrink-0 border ${
                nearestSpeed >= 50 ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : nearestSpeed >= 25 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {Math.round(nearestSpeed)} mph
              </span>
            )}
            {camera.distanceToNext != null && (
              <span className="text-[10px] text-muted-foreground">
                {(() => {
                  const miles = camera.distanceToNext * 0.621371;
                  return miles < 0.1 ? `${Math.round(miles * 5280)} ft to next` : `${miles.toFixed(1)} mi to next`;
                })()}
              </span>
            )}
          </div>

          <div className="flex-1" />

          {/* Bottom: action buttons */}
          <div className="mt-auto pt-1.5 border-t border-border/30 flex items-center gap-1">
            <a href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              Maps
            </a>
            <a href={`/camera/${camera.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              Details
            </a>
            {onCameraFocus && (
              <button onClick={(e) => { e.stopPropagation(); onCameraFocus(); }} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                Zoom on Map
              </button>
            )}
            <span className="flex-1" />
            <div className="flex items-center gap-0.5">
              {onMarkPassed && (
                <button onClick={(e) => { e.stopPropagation(); onMarkPassed(); }} className="p-1.5 rounded-md text-muted-foreground/40 hover:text-green-400 hover:bg-green-500/10 transition-colors" title="Mark as passed">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }} className={`p-1.5 rounded-md transition-colors ${favorite ? 'text-yellow-400' : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent'}`} title="Favorite">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
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

/** Find nearest PeMS station within ~2km of a point */
function findNearestSpeed(lat: number, lon: number, stations?: PemsStation[]): number | null {
  if (!stations || stations.length === 0) return null;
  let best: PemsStation | null = null;
  let bestDist = Infinity;
  for (const s of stations) {
    const dlat = s.latitude - lat;
    const dlon = s.longitude - lon;
    const dist = dlat * dlat + dlon * dlon;
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  // ~2km threshold (0.02 degrees ≈ 2km)
  return bestDist < 0.0004 && best?.speed != null ? best.speed : null;
}

export function RouteLiveView({ cameras, routeDuration, onCameraFocus, onUserLocationChange, pemsStations }: RouteLiveViewProps) {
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const playAll = useStore(playAllLive);
  const [tracking, setTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<RouteCamera | null>(null);
  const [hideUnavailable, setHideUnavailable] = useState(true); // Default: hide unavailable/construction
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
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
    if (!tracking || !userLocation || userProgress === null) return;
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
  }, [userLocation, userProgress, tracking, sorted, passedIds]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported by your browser');
      return;
    }
    setTrackingError(null);
    setTracking(true);

    // Get initial position first (faster feedback), then start watching
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        onUserLocationChange?.(loc);
      },
      () => {}, // silently ignore — watchPosition will handle errors
      { enableHighAccuracy: false, timeout: 5000 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        onUserLocationChange?.(loc);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setTrackingError('Location access denied — check browser permissions');
        } else if (err.code === err.TIMEOUT) {
          setTrackingError('Location timed out — try again');
        } else {
          setTrackingError('Unable to get location');
        }
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
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

  // Estimated time remaining to destination
  const etaToDestination = useMemo(() => {
    if (userProgress === null || routeDuration <= 0) return null;
    const remainingSeconds = routeDuration * (1 - userProgress);
    const remainingMinutes = Math.round(remainingSeconds / 60);
    return remainingMinutes;
  }, [userProgress, routeDuration]);

  return (
    <div>
      {/* Live tracking banner with ETA to destination */}
      {tracking && userLocation && etaToDestination != null && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-blue-300">Tracking your location</span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-bold text-blue-300">{formatDuration(etaToDestination)}</span>
            <span className="text-[10px] text-blue-400/70 ml-1">to destination</span>
          </div>
        </div>
      )}

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
          title="Toggle unavailable cameras"
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

        {/* Play All toggle */}
        <button
          onClick={() => playAllLive.set(!playAll)}
          title="Play all live camera feeds"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            playAll
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={playAll ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          {playAll ? 'Stop All' : 'Play All'}
        </button>

        {/* Track My Location toggle */}
        <button
          onClick={tracking ? stopTracking : startTracking}
          title="Use GPS to track your position along the route"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            tracking && userLocation
              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
              : tracking && !userLocation
                ? 'border-blue-500/30 bg-blue-500/5 text-blue-400/60 animate-pulse'
                : 'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/>
          </svg>
          {tracking && userLocation ? 'Stop Tracking' : tracking ? 'Locating...' : 'Track My Location'}
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((camera, i) => {
          const isUnavailable = !camera.imageUrl || camera.isStale || !camera.inService;
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
            <div key={camera.id} className="space-y-2">
              {userDotElement}
              <FeedCard
                camera={camera}
                routeDuration={routeDuration}
                cameraIndex={i + 1}
                forcePlay={playAll}
                onCameraFocus={() => onCameraFocus?.(camera.id)}
                onMarkPassed={() => setPassedIds((prev) => new Set(prev).add(camera.id))}
                onOpenDetail={() => setSelectedCamera(camera)}
                nearestSpeed={findNearestSpeed(camera.latitude, camera.longitude, pemsStations)}
              />

              {/* CMS signs as separate full-width cards */}
              {camera.nearbyCMS.map((cms) => (
                <CMSFeedCard key={cms.id} cms={cms} camera={camera} />
              ))}

              {/* Distance to next available camera (US units) */}
              {camera.distanceToNext != null && i < sorted.length - 1 && (
                <div className="flex items-center justify-center py-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {(() => {
                      const miles = camera.distanceToNext * 0.621371;
                      return miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
                    })()}
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
          isFavorite={isFavorite(selectedCamera.id)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
