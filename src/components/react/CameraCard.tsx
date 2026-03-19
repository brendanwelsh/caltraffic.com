import { useState, useRef, useEffect } from 'react';
import { RouteShield } from './RouteShield';
import { cn } from '@/lib/utils';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

interface CameraCardProps {
  camera: EnrichedCamera;
  onClick?: (camera: EnrichedCamera) => void;
}

export function CameraCard({ camera, onClick }: CameraCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current) {
          imgRef.current.src = camera.imageUrl;
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [camera.imageUrl]);

  const hasIncidents = camera.nearbyIncidents.length > 0;
  const hasCMS = camera.nearbyCMS.length > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg',
        hasIncidents && 'ring-1 ring-red-500/50'
      )}
      onClick={() => onClick?.(camera)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(camera)}
      aria-label={`Camera: ${camera.location} on ${camera.route} ${camera.direction}`}
    >
      {/* Camera Image */}
      <div className="absolute inset-0">
        {!imageError ? (
          <img
            ref={imgRef}
            alt={`Traffic camera view: ${camera.location}`}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-sm text-muted-foreground">Camera unavailable</span>
          </div>
        )}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
        {/* Status badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm',
            camera.hasVideo
              ? 'bg-green-500/20 text-green-400'
              : camera.isStale
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-300'
          )}
        >
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            camera.hasVideo ? 'bg-green-400' : camera.isStale ? 'bg-yellow-400' : 'bg-gray-400'
          )} />
          {camera.hasVideo ? 'Live' : camera.isStale ? 'Stale' : 'Photo'}
        </span>

        {/* Incident badge */}
        {hasIncidents && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400 backdrop-blur-sm">
            {camera.nearbyIncidents.length} incident{camera.nearbyIncidents.length > 1 ? 's' : ''}
          </span>
        )}

        {/* CMS badge */}
        {hasCMS && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
            CMS
          </span>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <RouteShield route={camera.route} className="h-5" />
              <span className="text-[11px] font-medium text-white/70">{camera.direction}</span>
            </div>
            <p className="truncate text-sm font-medium text-white">
              {camera.location || camera.city}
            </p>
            <p className="truncate text-[11px] text-white/60">
              {camera.city}{camera.county && camera.county !== camera.city ? `, ${camera.county}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
