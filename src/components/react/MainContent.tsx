import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { selectedDistrict } from '@/stores/filters';
import { ErrorBoundary } from './ErrorBoundary';
import { WeatherAlertBanner } from './WeatherAlertBanner';
import { FilterBar } from './FilterBar';
import { CameraGrid } from './CameraGrid';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { useFavorites } from '@/hooks/use-favorites';
import { useGeolocation } from '@/hooks/use-geolocation';

export function MainContent() {
  useGeolocation(); // Auto-detect nearest district on first load
  const district = useStore(selectedDistrict);
  const { cameras } = useEnrichedCameras(district);
  const { favorites } = useFavorites();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const stats = useMemo(() => ({
    total: cameras.length,
    video: cameras.filter((c) => c.hasVideo).length,
    incidents: cameras.filter((c) => c.nearbyIncidents.length > 0).length,
    signs: cameras.filter((c) => c.nearbyCMS.length > 0).length,
    favorites: favorites.size,
  }), [cameras, favorites]);

  return (
    <ErrorBoundary>
      <WeatherAlertBanner />
      <FilterBar
        stats={stats}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={setShowFavoritesOnly}
      />
      <div className="mt-4">
        <CameraGrid showFavoritesOnly={showFavoritesOnly} />
      </div>
    </ErrorBoundary>
  );
}
