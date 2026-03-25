import { useState, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  selectedDistrict, searchQuery, selectedRoute, selectedCity, viewMode,
  showVideoOnly, hideStale, hideUnavailable, unavailableCameras, showWithIncidents, showWithSigns,
} from '@/stores/filters';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { useCMS } from '@/hooks/use-cms';
import { useIncidents } from '@/hooks/use-incidents';
import { useFavorites } from '@/hooks/use-favorites';
import { useUrlState } from '@/hooks/use-url-state';
import { CameraCard } from './CameraCard';
import { CMSCard } from './CMSCard';
import { IncidentCard } from './IncidentCard';
import { CameraDetailDialog } from './CameraDetailDialog';
import { DataFreshness } from './DataFreshness';
import { MapView } from './MapView';
import { DISTRICT_COUNTIES } from '@/lib/constants';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import type { CMS, Incident } from '@/lib/schemas';

const PAGE_SIZE = 20;

type GridItem =
  | { type: 'camera'; data: EnrichedCamera }
  | { type: 'cms'; data: CMS }
  | { type: 'incident'; data: Incident };

interface CameraGridProps {
  showFavoritesOnly: boolean;
}

export function CameraGrid({ showFavoritesOnly }: CameraGridProps) {
  useUrlState();
  const district = useStore(selectedDistrict);
  const search = useStore(searchQuery);
  const routeFilter = useStore(selectedRoute);
  const cityFilter = useStore(selectedCity);
  const view = useStore(viewMode);
  const videoOnly = useStore(showVideoOnly);
  const noStale = useStore(hideStale);
  const noUnavailable = useStore(hideUnavailable);
  const brokenCameras = useStore(unavailableCameras);
  const withIncidents = useStore(showWithIncidents);
  const withSigns = useStore(showWithSigns);
  const [page, setPage] = useState(1);
  const [selectedCamera, setSelectedCamera] = useState<EnrichedCamera | null>(null);
  const { toggle: toggleFavorite, isFavorite } = useFavorites();

  const { cameras, isLoading, error, totalCount } = useEnrichedCameras(district);
  const { data: cmsList = [] } = useCMS(district);
  const { data: incidents = [] } = useIncidents();

  // Filter cameras
  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      if (routeFilter && cam.route !== routeFilter) return false;
      if (cityFilter && cam.city !== cityFilter) return false;
      if (videoOnly && !cam.hasVideo) return false;
      if (noStale && cam.isStale) return false;
      if (noUnavailable && brokenCameras.has(cam.id)) return false;
      if (withIncidents && cam.nearbyIncidents.length === 0) return false;
      if (withSigns && cam.nearbyCMS.length === 0) return false;
      if (showFavoritesOnly && !isFavorite(cam.id)) return false;
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
      const aFav = isFavorite(a.id) ? 1 : 0;
      const bFav = isFavorite(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      if (a.hasVideo !== b.hasVideo) return a.hasVideo ? -1 : 1;
      if (a.nearbyIncidents.length !== b.nearbyIncidents.length) return b.nearbyIncidents.length - a.nearbyIncidents.length;
      if (a.isStale !== b.isStale) return a.isStale ? 1 : -1;
      return 0;
    });
  }, [cameras, routeFilter, cityFilter, videoOnly, noStale, noUnavailable, brokenCameras, withIncidents, withSigns, showFavoritesOnly, search, isFavorite]);

  // Filter CMS signs (only show non-blank ones that match current filters)
  const filteredCMS = useMemo(() => {
    if (showFavoritesOnly || videoOnly) return []; // These filters don't apply to signs
    return cmsList.filter((cms) => {
      if (!cms.inService) return false;
      // Filter out blank signs
      const allBlank = cms.phase1Lines.every((l) => !l.trim()) &&
        (!cms.phase2Lines || cms.phase2Lines.every((l) => !l.trim()));
      if (allBlank) return false;
      if (routeFilter && cms.route !== routeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          cms.location.toLowerCase().includes(q) ||
          cms.route.toLowerCase().includes(q) ||
          cms.county.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cmsList, routeFilter, showFavoritesOnly, videoOnly, search]);

  // Filter incidents to match selected district (by matching location text to district counties)
  const filteredIncidents = useMemo(() => {
    if (showFavoritesOnly || videoOnly) return [];
    if (!district) return incidents.slice(0, 10); // Show top 10 when no district
    const counties = DISTRICT_COUNTIES[district] ?? [];
    return incidents.filter((inc) =>
      counties.some((county) => inc.location.toLowerCase().includes(county.toLowerCase()))
    );
  }, [incidents, district, showFavoritesOnly, videoOnly]);

  // Build mixed grid: intersperse incidents and CMS signs among cameras
  const gridItems: GridItem[] = useMemo(() => {
    const items: GridItem[] = [];
    const cameraItems: GridItem[] = filteredCameras.map((cam) => ({ type: 'camera', data: cam }));
    const incidentItems: GridItem[] = filteredIncidents.map((inc) => ({ type: 'incident', data: inc }));
    const cmsItems: GridItem[] = filteredCMS.map((cms) => ({ type: 'cms', data: cms }));

    // Intersperse non-camera items among cameras
    // Insert incidents after position 4, CMS signs every 8 cameras
    let camIdx = 0;
    let incIdx = 0;
    let cmsIdx = 0;

    while (camIdx < cameraItems.length || incIdx < incidentItems.length || cmsIdx < cmsItems.length) {
      // Add a batch of cameras
      const batchEnd = Math.min(camIdx + (items.length === 0 ? 4 : 8), cameraItems.length);
      while (camIdx < batchEnd) {
        items.push(cameraItems[camIdx++]);
      }
      // Insert an incident if available
      if (incIdx < incidentItems.length) {
        items.push(incidentItems[incIdx++]);
      }
      // Insert a CMS sign if available
      if (cmsIdx < cmsItems.length) {
        items.push(cmsItems[cmsIdx++]);
      }
      // If only non-camera items remain, flush them
      if (camIdx >= cameraItems.length) {
        while (incIdx < incidentItems.length) items.push(incidentItems[incIdx++]);
        while (cmsIdx < cmsItems.length) items.push(cmsItems[cmsIdx++]);
        break;
      }
    }

    return items;
  }, [filteredCameras, filteredCMS, filteredIncidents]);

  const displayed = gridItems.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < gridItems.length;

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-video animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {gridItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium">No cameras found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? `No results for "${search}"` : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : view === 'map' ? (
        <div>
          <div className="mb-3">
            <p className="text-sm text-muted-foreground">
              {filteredCameras.length} cameras{filteredCMS.length > 0 ? ` + ${filteredCMS.length} signs` : ''} on map
            </p>
          </div>
          <MapView cameras={filteredCameras} cmsSigns={filteredCMS} incidents={filteredIncidents} onCameraClick={handleCameraClick} />
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredCameras.length} cameras
              {filteredIncidents.length > 0 && ` · ${filteredIncidents.length} incidents`}
              {filteredCMS.length > 0 && ` · ${filteredCMS.length} signs`}
            </p>
            <DataFreshness count={cameras.length} isLoading={isLoading} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayed.map((item) => {
              if (item.type === 'camera') {
                return (
                  <CameraCard
                    key={`cam-${item.data.id}`}
                    camera={item.data}
                    onClick={handleCameraClick}
                    isFavorite={isFavorite(item.data.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              }
              if (item.type === 'cms') {
                return <CMSCard key={`cms-${item.data.id}`} cms={item.data} />;
              }
              return <IncidentCard key={`inc-${item.data.id}`} incident={item.data} />;
            })}
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
