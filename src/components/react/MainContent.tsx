import { ErrorBoundary } from './ErrorBoundary';
import { WeatherAlertBanner } from './WeatherAlertBanner';
import { FilterBar } from './FilterBar';
import { CameraGrid } from './CameraGrid';

export function MainContent() {
  return (
    <ErrorBoundary>
      <WeatherAlertBanner />
      <FilterBar />
      <div className="mt-4">
        <CameraGrid />
      </div>
    </ErrorBoundary>
  );
}
