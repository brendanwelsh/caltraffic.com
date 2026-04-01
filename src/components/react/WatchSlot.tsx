import { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { RouteShield } from './RouteShield';
import type { Camera } from '@/lib/schemas';

interface WatchSlotProps {
  cameras: Camera[];
  timer: number; // rotation seconds, 0 = no rotation
  slotIndex: number;
  onConfig: (slotIndex: number) => void;
  onRemoveCamera: (slotIndex: number, cameraId: string) => void;
}

export function WatchSlot({ cameras, timer, slotIndex, onConfig, onRemoveCamera }: WatchSlotProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Rotation timer
  useEffect(() => {
    if (timer <= 0 || cameras.length <= 1) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cameras.length);
    }, timer * 1000);
    return () => clearInterval(intervalRef.current);
  }, [timer, cameras.length]);

  // Reset index if cameras change
  useEffect(() => {
    setCurrentIndex(0);
  }, [cameras.length]);

  if (cameras.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-muted/20 border border-dashed border-border/50 rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => onConfig(slotIndex)}
      >
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-muted-foreground/40 mb-1">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
          <span className="text-xs text-muted-foreground/40">Add camera</span>
        </div>
      </div>
    );
  }

  const current = cameras[currentIndex % cameras.length];
  if (!current) return null;

  return (
    <div className="relative overflow-hidden rounded-md bg-black group">
      <VideoPlayer
        streamUrl={current.streamUrl}
        imageUrl={current.imageUrl}
        cameraName={current.location}
        hideControls
      />

      {/* Camera info overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6">
        <div className="flex items-center gap-1.5">
          <RouteShield route={current.route} size="sm" />
          <span className="text-[11px] font-semibold text-white truncate">{current.location || current.city}</span>
        </div>
        <span className="text-[9px] text-white/60">{current.direction} · {current.city}</span>
      </div>

      {/* LIVE indicator */}
      {current.hasVideo && current.streamUrl && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-sm bg-black/60 px-1.5 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] font-bold text-white uppercase">Live</span>
        </div>
      )}

      {/* Config gear (show on hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); onConfig(slotIndex); }}
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md bg-black/50 text-white/60 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      </button>

      {/* Rotation dots */}
      {cameras.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {cameras.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentIndex % cameras.length ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
