import { useState } from 'react';
import { CameraDetailDialog } from './CameraDetailDialog';
import { ConditionBadges } from './ConditionBadges';
import { RouteShield } from './RouteShield';
import { useFavorites } from '@/hooks/use-favorites';
import type { RouteCamera } from '@/hooks/use-route-planner';

interface RouteCameraListProps {
  cameras: RouteCamera[];
  routeDuration: number;
}

export function RouteCameraList({ cameras, routeDuration }: RouteCameraListProps) {
  const [selectedCamera, setSelectedCamera] = useState<RouteCamera | null>(null);
  const { toggle: toggleFavorite, isFavorite } = useFavorites();

  if (cameras.length === 0) return null;

  return (
    <div className="space-y-0">
      {cameras.map((camera, i) => {
        const etaMinutes = Math.round(camera.progressAlongRoute * (routeDuration / 60));
        const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;

        return (
          <div key={camera.id} className="relative">
            {i < cameras.length - 1 && (
              <div className="absolute left-[19px] top-[48px] bottom-0 w-0.5 bg-border" />
            )}
            <button
              onClick={() => setSelectedCamera(camera)}
              className={`relative flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-accent/50 ${
                hasIssues ? 'bg-red-500/5' : ''
              }`}
            >
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className={`w-3 h-3 rounded-full border-2 ${
                  hasIssues ? 'border-red-500 bg-red-500/30' : 'border-primary bg-primary/30'
                }`} />
                <span className="mt-1 text-[9px] text-muted-foreground">{etaMinutes}m</span>
              </div>
              <img
                src={camera.imageUrl}
                alt={camera.location}
                className="w-24 h-16 rounded-md object-cover shrink-0"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <RouteShield route={camera.route} />
                  <span className="text-xs font-medium truncate">{camera.direction}</span>
                  {camera.hasVideo && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {camera.location || camera.city}
                </p>
                <div className="mt-1">
                  <ConditionBadges
                    chainControls={camera.chainControls}
                    closures={camera.nearbyClosures}
                    travelTime={camera.travelTime}
                  />
                </div>
                {camera.nearbyIncidents.length > 0 && (
                  <p className="mt-1 text-[10px] text-red-400">
                    {camera.nearbyIncidents.map((inc) => inc.type).join(', ')}
                  </p>
                )}
              </div>
            </button>
          </div>
        );
      })}

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
