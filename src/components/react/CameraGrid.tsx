import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { selectedDistrict, searchQuery, selectedRoute, selectedCity } from '@/stores/filters';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { CameraCard } from './CameraCard';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

const PAGE_SIZE = 20;

export function CameraGrid() {
  const district = useStore(selectedDistrict);
  const search = useStore(searchQuery);
  const routeFilter = useStore(selectedRoute);
  const cityFilter = useStore(selectedCity);
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

      {/* Camera detail dialog will be added in Task 9 */}
      {selectedCamera && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedCamera(null)}
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img
                  src={`https://shields.caltranscameras.app/${selectedCamera.route}.svg`}
                  alt={selectedCamera.route}
                  className="h-6"
                />
                <h2 className="text-lg font-semibold">{selectedCamera.location || selectedCamera.city}</h2>
              </div>
              <button
                onClick={() => setSelectedCamera(null)}
                className="rounded-md p-1 hover:bg-accent"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <img
              src={selectedCamera.imageUrl}
              alt={`Camera view: ${selectedCamera.location}`}
              className="w-full rounded-lg"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Route:</span> {selectedCamera.route} {selectedCamera.direction}</div>
              <div><span className="text-muted-foreground">City:</span> {selectedCamera.city}</div>
              <div><span className="text-muted-foreground">County:</span> {selectedCamera.county}</div>
              <div><span className="text-muted-foreground">District:</span> D{String(selectedCamera.district).padStart(2, '0')}</div>
              <div><span className="text-muted-foreground">Status:</span> {selectedCamera.hasVideo ? 'Live Video' : selectedCamera.isStale ? 'Stale' : 'Photo'}</div>
              <div><span className="text-muted-foreground">Postmile:</span> {selectedCamera.postmile.toFixed(1)}</div>
            </div>
            {selectedCamera.nearbyIncidents.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2">Nearby Incidents</h3>
                {selectedCamera.nearbyIncidents.map((inc) => (
                  <div key={inc.id} className="rounded-md bg-red-500/10 border border-red-500/20 p-3 mb-2 text-sm">
                    <p className="font-medium">{inc.type} — {inc.location}</p>
                    <p className="text-muted-foreground mt-1">{inc.description}</p>
                  </div>
                ))}
              </div>
            )}
            {selectedCamera.nearbyCMS.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">Nearby CMS Signs</h3>
                {selectedCamera.nearbyCMS.map((cms) => (
                  <div key={cms.id} className="rounded-md bg-green-900 border border-green-700 p-3 mb-2 font-mono text-sm text-amber-300 text-center">
                    {cms.phase1Lines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
