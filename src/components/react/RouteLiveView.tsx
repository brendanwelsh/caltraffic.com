import { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
import { CameraDetailDialog } from './CameraDetailDialog';
import { useFavorites } from '@/hooks/use-favorites';
import type { RouteCamera } from '@/hooks/use-route-planner';

const MAX_STREAMS = 9; // Caltrans requires written agreement for 10+ simultaneous streams

interface RouteLiveViewProps {
  cameras: RouteCamera[];
  routeDuration: number;
}

export function RouteLiveView({ cameras, routeDuration }: RouteLiveViewProps) {
  const [selectedCamera, setSelectedCamera] = useState<RouteCamera | null>(null);
  const { toggle: toggleFavorite, isFavorite } = useFavorites();

  // Prioritize cameras with video, cap total
  const videoCameras = cameras.filter((c) => c.hasVideo && c.streamUrl);
  const staticCameras = cameras.filter((c) => !c.hasVideo || !c.streamUrl);
  const displayCameras = [
    ...videoCameras.slice(0, MAX_STREAMS),
    ...staticCameras.slice(0, Math.max(0, MAX_STREAMS - videoCameras.length)),
  ].sort((a, b) => a.progressAlongRoute - b.progressAlongRoute);

  return (
    <div>
      {cameras.length > MAX_STREAMS && (
        <p className="mb-2 text-[10px] text-amber-400">
          Showing {displayCameras.length} of {cameras.length} cameras (max {MAX_STREAMS} simultaneous feeds)
        </p>
      )}

      <div className="space-y-0">
        {displayCameras.map((camera, i) => {
          const etaMinutes = Math.round(camera.progressAlongRoute * (routeDuration / 60));
          const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;

          return (
            <div key={camera.id} className="relative">
              {/* Timeline connector */}
              {i < displayCameras.length - 1 && (
                <div className="absolute left-[15px] top-[32px] bottom-0 w-0.5 bg-border z-0" />
              )}

              <div className="relative flex gap-3 py-2">
                {/* Timeline dot + ETA */}
                <div className="flex flex-col items-center shrink-0 z-10 pt-1">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    hasIssues ? 'border-red-500 bg-red-500/30' :
                    camera.hasVideo ? 'border-green-500 bg-green-500/30' :
                    'border-primary bg-primary/30'
                  }`} />
                  <span className="mt-1 text-[9px] text-muted-foreground whitespace-nowrap">{etaMinutes}m</span>
                </div>

                {/* Camera feed card */}
                <div className={`flex-1 rounded-lg border overflow-hidden bg-card ${
                  hasIssues ? 'border-red-500/30' : 'border-border/60'
                }`}>
                  {/* Header */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/50">
                    <RouteShield route={camera.route} size="sm" />
                    <span className="text-xs font-medium truncate">{camera.direction}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {camera.location || camera.city}
                    </span>
                    {camera.hasVideo && camera.streamUrl && (
                      <span className="ml-auto inline-flex items-center gap-0.5 text-[8px] font-bold uppercase text-green-400 shrink-0">
                        <span className="h-1 w-1 rounded-full bg-green-400 animate-pulse" />
                        live
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedCamera(camera)}
                      className="ml-auto text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Details
                    </button>
                  </div>

                  {/* Video/Image feed */}
                  <VideoPlayer
                    streamUrl={camera.streamUrl}
                    imageUrl={camera.imageUrl}
                    cameraName={camera.location}
                  />

                  {/* Conditions bar */}
                  {(hasIssues || camera.nearbyCMS.length > 0 || camera.travelTime) && (
                    <div className="px-2.5 py-1.5 border-t border-border/50 space-y-1">
                      <ConditionBadges
                        chainControls={camera.chainControls}
                        closures={camera.nearbyClosures}
                        travelTime={camera.travelTime}
                      />
                      {camera.nearbyIncidents.length > 0 && (
                        <p className="text-[10px] text-red-400">
                          {camera.nearbyIncidents.map((inc) => `${inc.type}: ${inc.description}`).join(' · ')}
                        </p>
                      )}
                      {camera.nearbyCMS.map((cms) => {
                        const lines = [...cms.phase1Lines, ...(cms.phase2Lines ?? [])].filter((l) => l.trim());
                        if (lines.length === 0) return null;
                        return (
                          <div key={cms.id} className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5">
                            {lines.map((line, li) => (
                              <p key={li} className="text-[9px] font-mono font-bold text-amber-400 leading-tight">{line}</p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayCameras.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No cameras found along this route</p>
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
