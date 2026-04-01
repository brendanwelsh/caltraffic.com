import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { FEATURED_CAMERAS, CATEGORY_LABELS } from '@/lib/featured-cameras';
import type { FeaturedCamera } from '@/lib/featured-cameras';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import { VideoPlayer } from './VideoPlayer';
import { ConditionIcons } from './ConditionIcons';
import { RouteShield } from './RouteShield';
import { CameraDetailDialog } from './CameraDetailDialog';
import { RouteDropdown } from './RouteDropdown';
import { unavailableCameras, markUnavailable, playAllLive } from '@/stores/filters';
import { useFavorites } from '@/hooks/use-favorites';

type Category = FeaturedCamera['category'];
type SortMode = 'default' | 'shuffle' | 'route' | 'category';

/** Lazy feed — probes image for placeholder detection, then upgrades to video */
function LazyFeed({ streamUrl, imageUrl, cameraName, cameraId, paused, offline }: {
  streamUrl: string | null;
  imageUrl: string;
  cameraName: string;
  cameraId: string;
  paused: boolean;
  offline?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '400px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.currentTarget;
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let total = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) { total += (data[i] + data[i+1] + data[i+2]) / 3; count++; }
        if (total / count > 210) { setBroken(true); markUnavailable(cameraId); return; }
      }
    } catch { /* CORS — ignore */ }
    setChecked(true);
  }, [cameraId]);

  if (offline || broken) {
    return (
      <div ref={ref} className="aspect-video overflow-hidden bg-muted/30 rounded-md flex items-center justify-center">
        <span className="text-xs text-muted-foreground/50 font-medium">Offline</span>
      </div>
    );
  }

  const showVideo = checked && !paused && !!streamUrl;

  return (
    <div ref={ref} className="aspect-video overflow-hidden bg-black rounded-md">
      {!visible ? (
        <div className="w-full h-full animate-pulse bg-muted/20" />
      ) : showVideo ? (
        <VideoPlayer streamUrl={streamUrl} imageUrl={imageUrl} cameraName={cameraName} hideControls />
      ) : (
        <img
          src={imageUrl}
          alt={cameraName}
          className="w-full h-full object-cover"
          loading="lazy"
          crossOrigin="anonymous"
          onLoad={handleLoad}
          onError={() => { setBroken(true); markUnavailable(cameraId); }}
        />
      )}
    </div>
  );
}

const ALL_CATEGORIES: Array<{ key: Category | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'mountain-pass', label: 'Mountain Pass' },
  { key: 'scenic', label: 'Scenic' },
  { key: 'bottleneck', label: 'Bottleneck' },
  { key: 'landmark', label: 'Landmark' },
  { key: 'remote', label: 'Remote' },
];

interface MatchedFeatured extends FeaturedCamera {
  camera: EnrichedCamera;
  isOffline: boolean;
}

/** Fisher-Yates shuffle with seed for stable per-session randomization */
function shuffleArray<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let m = shuffled.length, t, i;
  let s = seed;
  while (m) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    i = s % m--;
    t = shuffled[m]; shuffled[m] = shuffled[i]; shuffled[i] = t;
  }
  return shuffled;
}

// Stable session seed — changes per page load for variety
const SESSION_SEED = Date.now();

export function FeaturedCameras() {
  const { cameras: allCameras, isLoading } = useEnrichedCameras(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('shuffle');
  const [selectedCamera, setSelectedCamera] = useState<EnrichedCamera | null>(null);
  const [visibleCount, setVisibleCount] = useState(18);
  const playing = useStore(playAllLive);
  const broken = useStore(unavailableCameras);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const matchedFeatured = useMemo<MatchedFeatured[]>(() => {
    if (!allCameras.length) return [];
    return FEATURED_CAMERAS.map((featured) => {
      const match = allCameras.find(
        (cam) =>
          featured.matchTerms.some(
            (term) =>
              cam.location?.toLowerCase().includes(term.toLowerCase()) ||
              cam.city?.toLowerCase().includes(term.toLowerCase())
          ) && cam.district === featured.district
      );
      if (!match) return null;
      const isOffline = !match.inService || match.isStale || !match.imageUrl || broken.has(match.id) || !match.hasVideo || !match.streamUrl;
      return { ...featured, camera: match, isOffline };
    }).filter((f): f is MatchedFeatured => f !== null);
  }, [allCameras, broken]);

  // Unique routes for the route filter
  const availableRoutes = useMemo(() => {
    const routes = [...new Set(matchedFeatured.map((f) => f.route))];
    return routes.sort((a, b) => {
      // Sort: I- first, then US-, then SR-
      const order = (r: string) => r.startsWith('I-') ? 0 : r.startsWith('US-') ? 1 : 2;
      return order(a) - order(b) || a.localeCompare(b, undefined, { numeric: true });
    });
  }, [matchedFeatured]);

  const filtered = useMemo(() => {
    let result = matchedFeatured;
    if (activeCategory !== 'all') result = result.filter((f) => f.category === activeCategory);
    if (activeRoute) result = result.filter((f) => f.route === activeRoute);

    // Sort
    switch (sortMode) {
      case 'shuffle':
        result = shuffleArray(result, SESSION_SEED);
        break;
      case 'route':
        result = [...result].sort((a, b) => a.route.localeCompare(b.route, undefined, { numeric: true }));
        break;
      case 'category':
        result = [...result].sort((a, b) => a.category.localeCompare(b.category));
        break;
      default: // 'default' — original order
        break;
    }

    // Always push offline to the end
    return result.sort((a, b) => (a.isOffline === b.isOffline ? 0 : a.isOffline ? 1 : -1));
  }, [matchedFeatured, activeCategory, activeRoute, sortMode]);

  const liveCount = filtered.filter((f) => !f.isOffline).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured Cameras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notable cameras across California — mountain passes, scenic views, traffic bottlenecks, and more.
        </p>
      </div>

      {/* Row 1: Play/Stop + Sort + Route filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
        <button
          onClick={() => playAllLive.set(!playing)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors shrink-0 h-8 ${
            playing
              ? 'border-green-500/50 bg-green-500/15 text-green-400'
              : 'border-border text-muted-foreground hover:bg-green-500/10 hover:text-green-400'
          }`}
          title={playing ? 'Stop all live feeds' : 'Play all live feeds'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={playing ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          {playing ? 'Stop All' : 'Play All'}
        </button>

        <span className="text-border mx-0.5">|</span>

        {/* Sort selector */}
        <div className="flex rounded-md border border-input overflow-hidden shrink-0 h-7">
          {([
            { key: 'shuffle' as SortMode, label: 'Shuffle' },
            { key: 'route' as SortMode, label: 'By Route' },
            { key: 'category' as SortMode, label: 'By Type' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortMode(key)}
              className={`px-2.5 text-[11px] font-medium transition-colors ${
                key !== 'shuffle' ? 'border-l border-input' : ''
              } ${sortMode === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-border mx-0.5">|</span>

        {/* Route filter with shield icons */}
        <RouteDropdown
          routes={availableRoutes}
          value={activeRoute}
          onChange={setActiveRoute}
        />

        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {liveCount} live · {filtered.length} total
        </span>
      </div>

      {/* Row 2: Category chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
        {ALL_CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
              activeCategory === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4">
              <div className="aspect-video rounded-md bg-muted" />
              <div className="mt-3 h-5 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-4 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {allCameras.length === 0 ? 'Loading camera data...' : 'No featured cameras matched.'}
        </p>
      )}

      {/* Cards with descriptions — route shield is central */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, visibleCount).map((featured) => {
            const cam = featured.camera;
            const cat = CATEGORY_LABELS[featured.category];
            const offline = featured.isOffline;

            return (
              <div
                key={featured.name}
                className={`group relative overflow-hidden rounded-lg border bg-card transition-all cursor-pointer ${
                  offline
                    ? 'border-border/30 opacity-50 grayscale hover:opacity-70 hover:grayscale-0'
                    : 'border-border/60 hover:shadow-md'
                }`}
                onClick={() => !offline && setSelectedCamera(cam)}
              >
                {/* Active incident badge */}
                {!offline && cam.nearbyIncidents && cam.nearbyIncidents.length > 0 && (
                  <span className="absolute top-2 right-2 z-10 rounded-md bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 animate-pulse">
                    Active Incident
                  </span>
                )}

                {/* Camera feed */}
                <LazyFeed
                  streamUrl={cam.streamUrl}
                  imageUrl={cam.imageUrl}
                  cameraName={featured.name}
                  cameraId={cam.id}
                  paused={!playing}
                  offline={offline}
                />

                {/* Info — route shield BIG on the left */}
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Big route shield */}
                    <div className="shrink-0 mt-0.5">
                      <RouteShield route={featured.route} size="lg" />
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
                        {offline && <span className="text-[8px] text-muted-foreground/50 font-medium">OFFLINE</span>}
                      </div>
                      <h3 className="text-sm font-bold leading-tight">{featured.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cam.direction} · {cam.city}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!offline && <ConditionIcons incidents={cam.nearbyIncidents} chainControls={cam.chainControls} travelTime={cam.travelTime} />}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(cam.id); }}
                        className={`rounded-full p-1 transition-all ${
                          isFavorite(cam.id) ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400'
                        }`}
                        title={isFavorite(cam.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isFavorite(cam.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground mt-1.5">{featured.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {visibleCount < filtered.length && (
        <div className="flex justify-center">
          <button onClick={() => setVisibleCount((v) => v + 18)} className="rounded-md border border-border px-6 py-2 text-sm font-medium hover:bg-accent transition-colors">
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Camera detail dialog */}
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
