import { useEffect, useState } from 'react';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import type { CMS, Incident, ChainControl, LaneClosure } from '@/lib/schemas';

export interface MapViewProps {
  cameras: EnrichedCamera[];
  cmsSigns?: CMS[];
  incidents?: Incident[];
  chainControls?: ChainControl[];
  closures?: LaneClosure[];
  onCameraClick?: (camera: EnrichedCamera) => void;
}

export function MapView({ cameras, cmsSigns = [], incidents = [], chainControls = [], closures = [], onCameraClick }: MapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<MapViewProps> | null>(null);

  useEffect(() => {
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

  return <MapComponent cameras={cameras} cmsSigns={cmsSigns} incidents={incidents} chainControls={chainControls} closures={closures} onCameraClick={onCameraClick} />;
}
