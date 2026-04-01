import { useState, useRef, useEffect, useCallback } from 'react';
import { RouteShield } from './RouteShield';
import { ConditionIcons } from './ConditionIcons';
import { VideoPlayer } from './VideoPlayer';
import { cn } from '@/lib/utils';
import { markUnavailable } from '@/stores/filters';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

interface CameraCardProps {
  camera: EnrichedCamera;
  onClick?: (camera: EnrichedCamera) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  playAll?: boolean;
}

/**
 * Detect Caltrans "Temporarily Unavailable" placeholder images using canvas.
 * These images have very low pixel variance (large solid-color blocks).
 */
function detectPlaceholder(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    const size = 32; // Downsample for speed
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    // Sample brightness values across the image
    const samples: number[] = [];
    for (let i = 0; i < data.length; i += 16) { // Every 4th pixel
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      samples.push(brightness);
    }

    // Caltrans "Temporarily Unavailable" placeholders are nearly white (mean > 200)
    // Real traffic cameras: mean 60-180 (roads, cars, trees, sky = darker overall)
    // Placeholders: mean ~232 (white background with some colored text)
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

    // Mean brightness > 210 is almost certainly a white placeholder image
    // Real traffic images never average that bright (even snowy scenes have shadows)
    return mean > 210;
  } catch {
    return false;
  }
}

export function CameraCard({ camera, onClick, isFavorite = false, onToggleFavorite, playAll = false }: CameraCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [camera.imageUrl]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    // Check if this is a Caltrans placeholder image
    if (imgRef.current) {
      const placeholder = detectPlaceholder(imgRef.current);
      if (placeholder) {
        setIsPlaceholder(true);
        markUnavailable(camera.id);
      }
    }
  }, [camera.id]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    markUnavailable(camera.id);
  }, [camera.id]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:shadow-lg hover:border-primary/40',
        isPlaceholder && 'opacity-60',
      )}
      onClick={() => onClick?.(camera)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(camera)}
      aria-label={`Camera: ${camera.location} on ${camera.route} ${camera.direction}`}
    >
      {/* Camera Image or Video */}
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {playAll && camera.hasVideo && camera.streamUrl ? (
          <VideoPlayer
            streamUrl={camera.streamUrl}
            imageUrl={camera.imageUrl}
            cameraName={camera.location}
            hideControls
          />
        ) : !imageError ? (
          <img
            ref={imgRef}
            crossOrigin="anonymous"
            alt={`Traffic camera: ${camera.location}`}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
        )}
        {!playAll && !imageLoaded && !imageError && (
          <div className="absolute inset-0 animate-pulse bg-muted/30" />
        )}

        {/* LIVE indicator — top-right */}
        {camera.hasVideo && (playAll || (imageLoaded && !isPlaceholder)) && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] font-bold text-white/90">LIVE</span>
          </div>
        )}

        {/* Favorite button — always visible */}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(camera.id); }}
            className={cn(
              'absolute bottom-1.5 right-1.5 z-10 rounded-full p-1.5 transition-all backdrop-blur-sm',
              isFavorite
                ? 'bg-yellow-500/40 text-yellow-400'
                : 'bg-black/40 text-white/50 hover:text-yellow-400'
            )}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        )}

        {/* Placeholder overlay */}
        {isPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="text-[10px] font-medium text-white/50 bg-black/40 rounded px-2 py-0.5">Unavailable</span>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <RouteShield route={camera.route} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {camera.location || camera.city}
          </p>
          <p className="truncate text-[10px] text-muted-foreground/80">
            {camera.direction && <span>{camera.direction}</span>}
            {camera.direction && camera.city && ' \u2022 '}
            {camera.city}
          </p>
        </div>
        <ConditionIcons
          incidents={camera.nearbyIncidents}
          chainControls={camera.chainControls}
          travelTime={camera.travelTime}
        />
      </div>
    </div>
  );
}
