import { useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { selectedDistrict } from '@/stores/filters';
import { ErrorBoundary } from './ErrorBoundary';
import { WeatherAlertBanner } from './WeatherAlertBanner';
import { FilterBarV2 } from './FilterBarV2';
import { CameraGrid } from './CameraGrid';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import { useGeolocation } from '@/hooks/use-geolocation';

export function MainContent() {
  useGeolocation(); // Auto-detect nearest district on first load
  const district = useStore(selectedDistrict);
  const { cameras } = useEnrichedCameras(district);

  const availableCities = useMemo(() => {
    const cities = new Set(cameras.map((c) => c.city).filter(Boolean));
    return [...cities].sort();
  }, [cameras]);

  const availableRoutes = useMemo(() => {
    const routes = new Set(cameras.map((c) => c.route).filter(Boolean));
    return [...routes].sort((a, b) => {
      const order = (r: string) => r.startsWith('I-') ? 0 : r.startsWith('US-') ? 1 : 2;
      return order(a) - order(b) || a.localeCompare(b, undefined, { numeric: true });
    });
  }, [cameras]);

  return (
    <ErrorBoundary>
      <WeatherAlertBanner />
      <FilterBarV2
        cameraCount={cameras.length}
        availableCities={availableCities}
        availableRoutes={availableRoutes}
      />
      <div className="mt-4">
        <CameraGrid />
      </div>
    </ErrorBoundary>
  );
}
