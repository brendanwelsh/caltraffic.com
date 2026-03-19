import { useEffect, useState } from 'react';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

interface MapViewProps {
  cameras: EnrichedCamera[];
  onCameraClick?: (camera: EnrichedCamera) => void;
}

// Leaflet must be dynamically imported (it requires window)
export function MapView({ cameras, onCameraClick }: MapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<MapViewProps> | null>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('./MapViewInner').then((mod) => {
      setMapComponent(() => mod.MapViewInner);
      setMapReady(true);
    });
  }, []);

  if (!mapReady || !MapComponent) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-lg border border-border bg-muted">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return <MapComponent cameras={cameras} onCameraClick={onCameraClick} />;
}
