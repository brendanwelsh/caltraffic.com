import { useState, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  selectedDistrict, searchQuery, selectedRoute, selectedCity, selectedCounty, viewMode,
  feedType, filterIncidents, filterChains, filterDelays, playAllLive,
  unavailableCameras, clearAllFilters,
} from '@/stores/filters';
import { gridDensity } from '@/stores/preferences';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { useCMS } from '@/hooks/use-cms';
import { useIncidents } from '@/hooks/use-incidents';
import { useChainControl } from '@/hooks/use-chain-control';
import { useClosures } from '@/hooks/use-closures';
import { useFavorites } from '@/hooks/use-favorites';
import { useUrlState } from '@/hooks/use-url-state';
import { CameraCard } from './CameraCard';
import { CameraDetailDialog } from './CameraDetailDialog';
import { MapView } from './MapView';
import { DISTRICT_COUNTIES } from '@/lib/constants';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import { mutate } from 'swr';
import type { CMS, Incident } from '@/lib/schemas';

const PAGE_SIZE = 20;

const GRID_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
};

export function CameraGrid() {
  useUrlState();
  const district = useStore(selectedDistrict);
  const search = useStore(searchQuery);
  const routeFilter = useStore(selectedRoute);
  const cityFilter = useStore(selectedCity);
  const countyFilter = useStore(selectedCounty);
  const view = useStore(viewMode);
  const feed = useStore(feedType);
  const showIncidents = useStore(filterIncidents);
  const showChains = useStore(filterChains);
  const showDelays = useStore(filterDelays);
  const brokenCameras = useStore(unavailableCameras);
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
    return cameras.filter((cam) => {
      if (routeFilter && cam.route !== routeFilter) return false;
      if (cityFilter && cam.city !== cityFilter) return false;
      if (countyFilter && cam.county !== countyFilter) return false;
      if (feed === 'live' && (!cam.hasVideo || cam.isStale || !cam.inService)) return false;
      if (feed === 'still' && cam.hasVideo) return false;
      if (showIncidents && cam.nearbyIncidents.length === 0) return false;
      if (showChains && cam.chainControls.length === 0) return false;
      if (showDelays && (!cam.travelTime || cam.travelTime.delay <= 2)) return false;
      if (brokenCameras.has(cam.id)) return false;
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
  }, [cameras, routeFilter, cityFilter, countyFilter, feed, showIncidents, showChains, showDelays, brokenCameras, search]);

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
    setSelectedCamera(camera);
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
      <div className={`grid gap-4 ${GRID_COLS_CLASS[columns]}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-video animate-pulse rounded-lg bg-muted" />
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
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredCameras.length} cameras
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => mutate((key) => typeof key === 'string' && key.startsWith('/api/'), undefined, { revalidate: true })}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
            </div>
          </div>

          <div className={`grid gap-3 ${GRID_COLS_CLASS[columns]}`}>
            {displayed.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onClick={handleCameraClick}
                isFavorite={isFavorite(camera.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
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
