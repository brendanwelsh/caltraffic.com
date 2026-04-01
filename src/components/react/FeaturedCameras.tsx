import { useMemo, useState, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { FEATURED_CAMERAS, CATEGORY_LABELS } from '@/lib/featured-cameras';
import type { FeaturedCamera } from '@/lib/featured-cameras';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import { VideoPlayer } from './VideoPlayer';
import { ConditionIcons } from './ConditionIcons';
import { RouteShield } from './RouteShield';
import { CameraDetailDialog } from './CameraDetailDialog';
import { gridDensity } from '@/stores/preferences';
import { unavailableCameras } from '@/stores/filters';
import { GridDensityControl } from './GridDensityControl';
import { useFavorites } from '@/hooks/use-favorites';

type Category = FeaturedCamera['category'];

/** Only mount VideoPlayer when the card scrolls into view. Hide if image fails. */
function LazyFeaturedFeed({ streamUrl, imageUrl, cameraName, paused }: {
  streamUrl: string | null;
  imageUrl: string;
  cameraName: string;
  paused: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '400px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  if (imgError) return null; // Hide entirely if image fails

  return (
    <div ref={ref}>
      {visible ? (
        <VideoPlayer streamUrl={paused ? null : streamUrl} imageUrl={imageUrl} cameraName={cameraName} hideControls />
      ) : (
        <div className="aspect-video bg-muted/30 animate-pulse rounded-md" />
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
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
};

export function FeaturedCameras() {
  const { cameras: allCameras, isLoading } = useEnrichedCameras(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [hideStatic, setHideStatic] = useState(true);
  const [pauseAll, setPauseAll] = useState(false);
  const [featuredView, setFeaturedView] = useState<'tiles' | 'cards'>('cards');
  const [selectedCamera, setSelectedCamera] = useState<EnrichedCamera | null>(null);
  const columns = useStore(gridDensity);
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
      return match ? { ...featured, camera: match } : null;
    }).filter((f): f is MatchedFeatured => f !== null);
  }, [allCameras]);

  const videoCount = matchedFeatured.filter((f) => f.camera.hasVideo).length;
  const staticCount = matchedFeatured.length - videoCount;

  const filtered = useMemo(() => {
    let result = matchedFeatured;
    // Always filter out unavailable/stale cameras
    result = result.filter((f) => f.camera.inService && !f.camera.isStale && f.camera.imageUrl && !broken.has(f.camera.id));
    if (activeCategory !== 'all') result = result.filter((f) => f.category === activeCategory);
    if (hideStatic) result = result.filter((f) => f.camera.hasVideo && f.camera.streamUrl);
    return result;
  }, [matchedFeatured, activeCategory, hideStatic, broken]);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured Cameras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notable cameras across California — mountain passes, scenic views, traffic bottlenecks, and more.
        </p>
      </div>

      {/* Controls bar — Camera Viewer style */}
      <div className="space-y-2">
        {/* Row 1: Play/Pause + View toggle + Density */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPauseAll(!pauseAll)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors shrink-0 h-8 ${
              pauseAll
                ? 'border-border text-muted-foreground hover:bg-green-500/10 hover:text-green-400'
                : 'border-green-500/50 bg-green-500/15 text-green-400'
            }`}
            title={pauseAll ? 'Resume all live feeds' : 'Pause all live feeds'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={pauseAll ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {pauseAll ? 'Play All' : 'Playing'}
          </button>

          <button
            onClick={() => setHideStatic(!hideStatic)}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors h-8 ${
              hideStatic
                ? 'border-green-500/50 bg-green-500/10 text-green-400'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {hideStatic ? 'Live Only' : 'All Feeds'}
          </button>

          <div className="flex-1" />

          <div className="flex rounded-md border border-input overflow-hidden shrink-0 h-8">
            <button
              onClick={() => setFeaturedView('tiles')}
              className={`inline-flex items-center px-2.5 transition-colors ${featuredView === 'tiles' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              title="Tiles"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </button>
            <button
              onClick={() => setFeaturedView('cards')}
              className={`inline-flex items-center px-2.5 transition-colors border-l border-input ${featuredView === 'cards' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              title="Cards"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="7" x="3" y="3" rx="1"/><rect width="18" height="7" x="3" y="14" rx="1"/></svg>
            </button>
          </div>

          <div className="hidden md:block">
            <GridDensityControl />
          </div>
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
          <span className="text-xs text-muted-foreground ml-auto shrink-0">{filtered.length} cameras</span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4">
              <div className="aspect-video rounded-md bg-muted" />
              <div className="mt-3 h-5 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-4 w-full rounded bg-muted" />
              <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {allCameras.length === 0
            ? 'Loading camera data...'
            : 'No featured cameras matched in this category.'}
        </p>
      )}

      {/* Camera display */}
      {!isLoading && filtered.length > 0 && featuredView === 'tiles' ? (
        /* Tiles view — compact, Camera Viewer style */
        <div className={`grid gap-1.5 ${GRID_COLS[columns] || GRID_COLS[4]}`}>
          {filtered.map((featured) => {
            const cam = featured.camera;
            const cat = CATEGORY_LABELS[featured.category];
            return (
              <div
                key={featured.name}
                className="relative aspect-video overflow-hidden rounded-md bg-black cursor-pointer group"
                onClick={() => setSelectedCamera(cam)}
              >
                <LazyFeaturedFeed streamUrl={cam.streamUrl} imageUrl={cam.imageUrl} cameraName={featured.name} paused={pauseAll} />
                {cam.hasVideo && (
                  <div className="absolute top-1 left-1 flex items-center gap-0.5 rounded-sm bg-black/60 px-1 py-px">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[7px] font-bold text-white uppercase">Live</span>
                  </div>
                )}
                {cam.nearbyIncidents && cam.nearbyIncidents.length > 0 && (
                  <span className="absolute top-1 right-1 rounded-sm bg-red-500 text-white text-[7px] font-bold px-1 py-px animate-pulse">Active</span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1">
                    <span className={`text-[7px] font-semibold px-1 py-px rounded-sm border ${cat.color}`}>{cat.label}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-white truncate mt-0.5">{featured.name}</p>
                  <p className="text-[8px] text-white/70 truncate">{cam.route} {cam.direction} · {cam.city}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : !isLoading && filtered.length > 0 ? (
        /* Cards view — storytelling with descriptions */
        <div className={`grid gap-3 ${GRID_COLS[columns] || GRID_COLS[3]}`}>
          {filtered.map((featured) => {
            const cam = featured.camera;
            const cat = CATEGORY_LABELS[featured.category];

            return (
              <div
                key={featured.name}
                className="group relative overflow-hidden rounded-lg border border-border/60 bg-card transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => setSelectedCamera(cam)}
              >
                {cam.nearbyIncidents && cam.nearbyIncidents.length > 0 && (
                  <span className="absolute top-2 right-2 z-10 rounded-md bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 animate-pulse">
                    Active Incident
                  </span>
                )}

                <div className="aspect-video overflow-hidden">
                  <LazyFeaturedFeed streamUrl={cam.streamUrl} imageUrl={cam.imageUrl} cameraName={featured.name} paused={pauseAll} />
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
                        <RouteShield route={featured.route} size="sm" />
                      </div>
                      <h3 className="text-sm font-bold leading-tight mt-1 truncate">{featured.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cam.direction} · {cam.city}</p>
                    </div>
                    <ConditionIcons incidents={cam.nearbyIncidents} chainControls={cam.chainControls} travelTime={cam.travelTime} />
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{featured.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

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
