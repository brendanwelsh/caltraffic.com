import { useMemo, useState } from 'react';
import { FEATURED_CAMERAS, CATEGORY_LABELS } from '@/lib/featured-cameras';
import type { FeaturedCamera } from '@/lib/featured-cameras';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import { VideoPlayer } from './VideoPlayer';

type Category = FeaturedCamera['category'];

const ALL_CATEGORIES: Array<{ key: Category | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'mountain-pass', label: 'Mountain Pass' },
  { key: 'scenic', label: 'Scenic' },
  { key: 'bottleneck', label: 'Bottleneck' },
  { key: 'landmark', label: 'Landmark' },
  { key: 'remote', label: 'Remote' },
];

function RouteShield({ route, direction }: { route: string; direction?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <span className="rounded border border-border bg-muted px-1.5 py-0.5">{route}</span>
      {direction && <span>{direction}</span>}
    </span>
  );
}

interface MatchedFeatured extends FeaturedCamera {
  camera: EnrichedCamera;
}

export function FeaturedCameras() {
  const { cameras: allCameras, isLoading } = useEnrichedCameras(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [hideStatic, setHideStatic] = useState(false);
  const [pauseAll, setPauseAll] = useState(false);

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
    if (activeCategory !== 'all') result = result.filter((f) => f.category === activeCategory);
    if (hideStatic) result = result.filter((f) => f.camera.hasVideo);
    return result;
  }, [matchedFeatured, activeCategory, hideStatic]);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured Cameras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notable cameras across California — mountain passes, scenic views, traffic bottlenecks, and more.
        </p>
      </div>

      {/* Category filter buttons + video toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {ALL_CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 text-border">|</span>
        <button
          onClick={() => setHideStatic(!hideStatic)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            hideStatic
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-border bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {hideStatic ? 'Live Only' : 'All Feeds'} ({hideStatic ? videoCount : matchedFeatured.length})
        </button>
        {staticCount > 0 && !hideStatic && (
          <span className="text-[10px] text-muted-foreground">{staticCount} static</span>
        )}
        <button
          onClick={() => setPauseAll(!pauseAll)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            pauseAll
              ? 'border-red-500/50 bg-red-500/10 text-red-400'
              : 'border-green-500/50 bg-green-500/10 text-green-400'
          }`}
        >
          {pauseAll ? 'Resume All' : 'All Playing'}
        </button>
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

      {/* Camera grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((featured) => {
            const cam = featured.camera;
            const cat = CATEGORY_LABELS[featured.category];
            const mapsUrl = `https://www.google.com/maps?q=${cam.latitude},${cam.longitude}`;

            return (
              <div
                key={featured.name}
                className="group relative overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
              >
                {/* Incident spotlight badge */}
                {cam.nearbyIncidents && cam.nearbyIncidents.length > 0 && (
                  <span className="absolute top-2 right-2 z-10 rounded-full bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 animate-pulse">
                    Happening Now
                  </span>
                )}

                {/* Category badge */}
                <div className="px-4 pt-3 pb-1">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cat.color}`}
                  >
                    {cat.label}
                  </span>
                </div>

                {/* Camera feed */}
                <div className="px-4">
                  <div className="overflow-hidden rounded-md">
                    <VideoPlayer
                      streamUrl={pauseAll ? null : cam.streamUrl}
                      imageUrl={cam.imageUrl}
                      cameraName={featured.name}
                      hideControls
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 px-4 pt-3 pb-4">
                  <h3 className="text-sm font-bold leading-tight">{featured.name}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {featured.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <RouteShield route={featured.route} direction={cam.direction} />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`/camera/${cam.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      View Details
                    </a>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      Show on Map
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
