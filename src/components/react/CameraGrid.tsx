import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { selectedDistrict, searchQuery, selectedRoute, selectedCity, viewMode } from '@/stores/filters';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { useUrlState } from '@/hooks/use-url-state';
import { CameraCard } from './CameraCard';
import { CameraDetailDialog } from './CameraDetailDialog';
import { MapView } from './MapView';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

const PAGE_SIZE = 20;

export function CameraGrid() {
  useUrlState();
  const district = useStore(selectedDistrict);
  const search = useStore(searchQuery);
  const routeFilter = useStore(selectedRoute);
  const cityFilter = useStore(selectedCity);
  const view = useStore(viewMode);
  const [page, setPage] = useState(1);
  const [selectedCamera, setSelectedCamera] = useState<EnrichedCamera | null>(null);

  const { cameras, isLoading, error, totalCount } = useEnrichedCameras(district);

  // Filter cameras
  const filtered = cameras.filter((cam) => {
    if (routeFilter && cam.route !== routeFilter) return false;
    if (cityFilter && cam.city !== cityFilter) return false;
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
  });

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

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

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">No cameras found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {search ? `No results for "${search}"` : 'Try selecting a different district or filter.'}
        </p>
      </div>
    );
  }

  if (view === 'map') {
    return (
      <div>
        <div className="mb-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} cameras on map
          </p>
        </div>
        <MapView cameras={filtered} onCameraClick={handleCameraClick} />
        {selectedCamera && (
          <CameraDetailDialog
            camera={selectedCamera}
            onClose={() => setSelectedCamera(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {displayed.length} of {filtered.length} cameras
          {totalCount !== filtered.length && ` (${totalCount} total)`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayed.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            onClick={handleCameraClick}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border bg-card px-6 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Load more cameras
          </button>
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
