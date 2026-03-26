import { useState, useRef, useEffect } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
import { CameraDetailDialog } from './CameraDetailDialog';
import { useFavorites } from '@/hooks/use-favorites';
import type { RouteCamera } from '@/hooks/use-route-planner';

interface RouteLiveViewProps {
  cameras: RouteCamera[];
  routeDuration: number;
}

/** Only renders VideoPlayer when scrolled into view */
function LazyFeed({ camera, isVisible }: { camera: RouteCamera; isVisible: boolean }) {
  if (!isVisible) {
    // Placeholder — same aspect ratio, shows static thumbnail
    return (
      <div className="relative aspect-video bg-black/40">
        <img
          src={camera.imageUrl}
          alt={camera.location}
          className="w-full h-full object-cover opacity-50"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/70">
            Scroll to load feed
          </span>
        </div>
      </div>
    );
  }

  return (
    <VideoPlayer
      streamUrl={camera.streamUrl}
      imageUrl={camera.imageUrl}
      cameraName={camera.location}
    />
  );
}

function LazyFeedCard({ camera, routeDuration, onSelect }: {
  camera: RouteCamera;
  routeDuration: number;
  onSelect: (c: RouteCamera) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '100px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const etaMinutes = Math.round(camera.progressAlongRoute * (routeDuration / 60));
  const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;

  return (
    <div ref={ref} className={`rounded-lg border overflow-hidden bg-card cursor-pointer hover:shadow-md transition-shadow ${
      hasIssues ? 'border-red-500/30' : 'border-border/60'
    }`} onClick={() => onSelect(camera)}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/50">
        <span className="text-[9px] text-muted-foreground shrink-0">{etaMinutes}m</span>
        <RouteShield route={camera.route} size="sm" />
        <span className="text-[11px] font-medium truncate">{camera.direction}</span>
        <span className="text-[9px] text-muted-foreground truncate">
          {camera.location || camera.city}
        </span>
        {camera.hasVideo && camera.streamUrl && (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[8px] font-bold uppercase text-green-400 shrink-0">
            <span className="h-1 w-1 rounded-full bg-green-400 animate-pulse" />
            live
          </span>
        )}
      </div>

      {/* Feed — only loads when visible */}
      <div className="max-h-[150px] overflow-hidden">
        <LazyFeed camera={camera} isVisible={isVisible} />
      </div>

      {/* Conditions */}
      {(hasIssues || camera.nearbyCMS.length > 0 || camera.travelTime) && (
        <div className="px-2 py-1 border-t border-border/50 space-y-0.5">
          <ConditionBadges
            chainControls={camera.chainControls}
            closures={camera.nearbyClosures}
            travelTime={camera.travelTime}
          />
          {camera.nearbyIncidents.length > 0 && (
            <p className="text-[9px] text-red-400 truncate">
              {camera.nearbyIncidents.map((inc) => inc.type).join(', ')}
            </p>
          )}
          {camera.nearbyCMS.slice(0, 1).map((cms) => {
            const lines = [...cms.phase1Lines, ...(cms.phase2Lines ?? [])].filter((l) => l.trim());
            if (lines.length === 0) return null;
            return (
              <div key={cms.id} className="rounded bg-amber-500/10 px-1.5 py-0.5">
                {lines.map((line, li) => (
                  <p key={li} className="text-[8px] font-mono font-bold text-amber-400 leading-tight">{line}</p>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RouteLiveView({ cameras, routeDuration }: RouteLiveViewProps) {
  const [selectedCamera, setSelectedCamera] = useState<RouteCamera | null>(null);
  const { toggle: toggleFavorite, isFavorite } = useFavorites();

  const displayCameras = [...cameras].sort((a, b) => a.progressAlongRoute - b.progressAlongRoute);
  const liveCount = displayCameras.filter(c => c.hasVideo && c.streamUrl).length;

  return (
    <div>
      <p className="mb-2 text-[10px] text-muted-foreground">
        {displayCameras.length} cameras · {liveCount} with live video · feeds load as you scroll
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {displayCameras.map((camera) => (
          <LazyFeedCard
            key={camera.id}
            camera={camera}
            routeDuration={routeDuration}
            onSelect={setSelectedCamera}
          />
        ))}
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
