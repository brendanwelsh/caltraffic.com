import { useMemo, useState } from 'react';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { useFavorites } from '@/hooks/use-favorites';
import { VideoPlayer } from './VideoPlayer';
import { RouteShield } from './RouteShield';
import { CameraDetailDialog } from './CameraDetailDialog';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

export function FavoritesPage() {
  const { cameras, isLoading } = useEnrichedCameras(null);
  const { favorites, isFavorite, toggle: toggleFavorite } = useFavorites();
  const [selectedCamera, setSelectedCamera] = useState<EnrichedCamera | null>(null);

  const favoriteCameras = useMemo(() => {
    return cameras.filter((c) => isFavorite(c.id));
  }, [cameras, favorites]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent mb-4" />
        <p className="text-sm text-muted-foreground">Loading cameras...</p>
      </div>
    );
  }

  if (favoriteCameras.length === 0) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-muted-foreground/30 mb-4">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <h2 className="text-lg font-bold mb-2">No favorites yet</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Star cameras from the <a href="/cameras" className="text-primary hover:underline">Camera Viewer</a> or <a href="/" className="text-primary hover:underline">Route Viewer</a> to save them here.
        </p>
        <p className="text-xs text-muted-foreground/50">
          Favorites are saved in your browser and persist between visits.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">My Favorites</h1>
          <p className="text-xs text-muted-foreground">{favoriteCameras.length} saved camera{favoriteCameras.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            if (confirm('Remove all favorites?')) {
              favoriteCameras.forEach((c) => toggleFavorite(c.id));
            }
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {favoriteCameras.map((camera) => (
          <div
            key={camera.id}
            className="rounded-xl border border-border/60 overflow-hidden bg-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => setSelectedCamera(camera)}
          >
            <div className="relative aspect-video overflow-hidden bg-black">
              <VideoPlayer
                streamUrl={camera.streamUrl}
                imageUrl={camera.imageUrl}
                cameraName={camera.location}
                hideControls
              />
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }}
                className="absolute top-1.5 right-1.5 z-10 rounded-full p-1 bg-yellow-500/30 text-yellow-400 backdrop-blur-sm hover:bg-yellow-500/40 transition-colors"
                aria-label="Remove from favorites"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            </div>
            <div className="px-2.5 py-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold truncate">{camera.location || camera.city}</span>
                <RouteShield route={camera.route} size="sm" />
              </div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {camera.direction} · {camera.city}
              </p>
            </div>
          </div>
        ))}
      </div>

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
