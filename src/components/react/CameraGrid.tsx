import { useState, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  selectedDistrict, searchQuery, selectedRoute, selectedCity, selectedCounty, viewMode,
  feedType, filterFavorites, playAllLive,
  unavailableCameras, hideUnavailable, markUnavailable, clearAllFilters,
} from '@/stores/filters';
import { gridDensity } from '@/stores/preferences';
import { DISTRICT_COUNTIES } from '@/lib/constants';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { useCMS } from '@/hooks/use-cms';
import { useIncidents } from '@/hooks/use-incidents';
import { useChainControl } from '@/hooks/use-chain-control';
import { useClosures } from '@/hooks/use-closures';
import { useFavorites } from '@/hooks/use-favorites';
import { useUrlState } from '@/hooks/use-url-state';
import { CameraCard } from './CameraCard';
import { CameraDetailDialog } from './CameraDetailDialog';
import { VideoPlayer } from './VideoPlayer';
import { RouteShield } from './RouteShield';
import { ConditionIcons } from './ConditionIcons';
import { MapView } from './MapView';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import { mutate } from 'swr';
import type { CMS, Incident } from '@/lib/schemas';

/** Detect Caltrans placeholder images (white background, mean brightness > 210) */
function checkPlaceholder(img: HTMLImageElement, cameraId: string) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let total = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
      count++;
    }
    if (total / count > 210) markUnavailable(cameraId);
  } catch {
    // CORS — silently ignore
  }
}

const PAGE_SIZE = 20;

const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
};

interface CameraGridProps {
  /** Pre-filter cameras before the grid's own filters run */
  cameraFilter?: (cameras: EnrichedCamera[]) => EnrichedCamera[];
  /** Override the district (use null to load ALL districts) */
  overrideDistrict?: number | null;
}

export function CameraGrid({ cameraFilter, overrideDistrict }: CameraGridProps = {}) {
  useUrlState();
  const storeDistrict = useStore(selectedDistrict);
  const district = overrideDistrict !== undefined ? overrideDistrict : storeDistrict;
  const search = useStore(searchQuery);
  const routeFilter = useStore(selectedRoute);
  const cityFilter = useStore(selectedCity);
  const countyFilter = useStore(selectedCounty);
  const view = useStore(viewMode);
  const feed = useStore(feedType);
  const playing = useStore(playAllLive);
  const showFavs = useStore(filterFavorites);
  const brokenCameras = useStore(unavailableCameras);
  const hideBroken = useStore(hideUnavailable);
  const columns = useStore(gridDensity);
  const [page, setPage] = useState(1);
  const [selectedCamera, setSelectedCamera] = useState<EnrichedCamera | null>(null);
  const { toggle: toggleFavorite, isFavorite } = useFavorites();

  const { cameras, isLoading, error, totalCount } = useEnrichedCameras(district);
  const { data: cmsList = [] } = useCMS(district);
  const { data: incidents = [] } = useIncidents();
  const { data: chainControls = [] } = useChainControl(district);
  const { data: closures = [] } = useClosures(district);

  // Filter cameras
  const filteredCameras = useMemo(() => {
    const source = cameraFilter ? cameraFilter(cameras) : cameras;
    return source.filter((cam) => {
      if (routeFilter && cam.route !== routeFilter) return false;
      if (cityFilter && cam.city !== cityFilter) return false;
      if (countyFilter && cam.county !== countyFilter) return false;
      if (feed === 'live' && (!cam.hasVideo || cam.isStale || !cam.inService)) return false;
      if (feed === 'still' && cam.hasVideo) return false;
      if (showFavs && !isFavorite(cam.id)) return false;
      if (hideBroken && brokenCameras.has(cam.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          cam.location.toLowerCase().includes(q) ||
          cam.city.toLowerCase().includes(q) ||
          cam.county.toLowerCase().includes(q) ||
          cam.route.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.hasVideo !== b.hasVideo) return a.hasVideo ? -1 : 1;
      if (a.nearbyIncidents.length !== b.nearbyIncidents.length) return b.nearbyIncidents.length - a.nearbyIncidents.length;
      if (a.isStale !== b.isStale) return a.isStale ? 1 : -1;
      return 0;
    });
  }, [cameras, cameraFilter, routeFilter, cityFilter, countyFilter, feed, showFavs, isFavorite, brokenCameras, hideBroken, search]);

  // CMS signs for map view only
  const filteredCMS = useMemo(() => {
    return cmsList.filter((cms) => {
      if (!cms.inService) return false;
      const allBlank = cms.phase1Lines.every((l) => !l.trim()) &&
        (!cms.phase2Lines || cms.phase2Lines.every((l) => !l.trim()));
      if (allBlank) return false;
      if (routeFilter && cms.route !== routeFilter) return false;
      return true;
    });
  }, [cmsList, routeFilter]);

  // Incidents for map view only
  const filteredIncidents = useMemo(() => {
    if (!district) return incidents.slice(0, 10);
    const counties = DISTRICT_COUNTIES[district] ?? [];
    return incidents.filter((inc) =>
      counties.some((county) => inc.location.toLowerCase().includes(county.toLowerCase()))
    );
  }, [incidents, district]);

  const displayed = filteredCameras.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filteredCameras.length;

  const handleCameraClick = useCallback((camera: EnrichedCamera) => {
    window.location.href = `/camera/${camera.id}`;
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load cameras</p>
        <p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>
      </div>
    );
  }

  if (isLoading && cameras.length === 0) {
    return (
      <div className={`grid gap-3 ${GRID_COLS_CLASS[columns]}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-card overflow-hidden">
            <div className="aspect-video animate-pulse bg-muted/50" />
            <div className="flex items-center gap-2 px-2.5 py-2">
              <div className="h-6 w-8 rounded bg-muted/50 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 rounded bg-muted/50 animate-pulse" />
                <div className="h-2 w-1/2 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {filteredCameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium">No cameras found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? `No results for "${search}"` : 'Try adjusting your filters.'}
          </p>
          <button
            onClick={() => clearAllFilters()}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : view === 'tiles' ? (
        /* Tiles view — compact image grid, Play All uses VideoPlayer */
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredCameras.length} cameras</p>
            <button
              onClick={() => mutate((key) => typeof key === 'string' && key.startsWith('/api/'), undefined, { revalidate: true })}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Refresh camera data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
          <div className={`grid gap-1.5 ${GRID_COLS_CLASS[columns]}`}>
            {displayed.map((camera) => (
              <div
                key={camera.id}
                className="relative aspect-video overflow-hidden rounded-md bg-black cursor-pointer group"
                onClick={() => handleCameraClick(camera)}
              >
                {/* Play All: use VideoPlayer. Otherwise: static img with placeholder detection */}
                {playing && camera.hasVideo && camera.streamUrl ? (
                  <VideoPlayer streamUrl={camera.streamUrl} imageUrl={camera.imageUrl} cameraName={camera.location} hideControls />
                ) : (
                  <img
                    src={camera.imageUrl}
                    alt={camera.location}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    crossOrigin="anonymous"
                    onLoad={(e) => checkPlaceholder(e.currentTarget, camera.id)}
                  />
                )}
                {/* LIVE dot — top-right */}
                {camera.hasVideo && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded-sm bg-black/60 px-1 py-px z-10">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[7px] font-bold text-white uppercase">Live</span>
                  </div>
                )}
                {/* Name overlay on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-semibold text-white truncate">{camera.route} {camera.direction}</p>
                  <p className="text-[9px] text-white/70 truncate">{camera.location || camera.city}</p>
                </div>
                {/* Condition icons — top-left */}
                {(camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0) && (
                  <div className="absolute top-1 left-1 flex gap-0.5 z-10">
                    {camera.nearbyIncidents.length > 0 && (
                      <span className="w-4 h-4 rounded-sm bg-red-500/80 flex items-center justify-center text-[8px] font-bold text-white">{camera.nearbyIncidents.length}</span>
                    )}
                    {camera.chainControls.length > 0 && (
                      <span className="w-4 h-4 rounded-sm bg-blue-500/80 flex items-center justify-center text-[7px] font-bold text-white">{camera.chainControls[0].level}</span>
                    )}
                  </div>
                )}
                {/* Favorite star — always visible */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }}
                  className={`absolute bottom-1 right-1 rounded-full p-1 transition-all backdrop-blur-sm ${
                    isFavorite(camera.id) ? 'bg-yellow-500/40 text-yellow-400' : 'bg-black/40 text-white/40 hover:text-yellow-400'
                  }`}
                  title={isFavorite(camera.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isFavorite(camera.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
                Load more
              </button>
            </div>
          )}
        </div>
      ) : view === 'map' ? (
        <div>
          <div className="mb-3">
            <p className="text-sm text-muted-foreground">
              {filteredCameras.length} cameras on map
            </p>
          </div>
          <MapView
            cameras={filteredCameras}
            cmsSigns={filteredCMS}
            incidents={filteredIncidents}
            chainControls={chainControls}
            closures={closures}
            onCameraClick={handleCameraClick}
          />
        </div>
      ) : (
        /* List view — card grid with image top, info bar below (CameraCard) */
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredCameras.length} cameras
            </p>
            <button
              onClick={() => mutate((key) => typeof key === 'string' && key.startsWith('/api/'), undefined, { revalidate: true })}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Refresh camera data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>

          <div className={`grid gap-3 ${GRID_COLS_CLASS[columns]}`}>
            {displayed.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onClick={handleCameraClick}
                isFavorite={isFavorite(camera.id)}
                onToggleFavorite={toggleFavorite}
                playAll={playing}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Load more
              </button>
            </div>
          )}
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
