import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  streamUrl: string | null;
  imageUrl: string;
  cameraName: string;
  hideControls?: boolean;
  onPlaying?: () => void;
}

export function VideoPlayer({ streamUrl, imageUrl, cameraName, hideControls, onPlaying }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    // Manual fallback: if video hasn't started in 5s, give up
    const fallbackTimer = setTimeout(() => {
      if (!video.paused && video.readyState < 3) setError(true);
      else if (video.paused) setError(true);
    }, 5000);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        manifestLoadingTimeOut: 4000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingMaxRetryTimeout: 2000,
        levelLoadingTimeOut: 4000,
        levelLoadingMaxRetry: 1,
        fragLoadingTimeOut: 5000,
        fragLoadingMaxRetry: 1,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => { setIsPlaying(true); onPlaying?.(); clearTimeout(fallbackTimer); }).catch(() => setError(true));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) { setError(true); clearTimeout(fallbackTimer); }
      });

      return () => {
        clearTimeout(fallbackTimer);
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().then(() => { setIsPlaying(true); onPlaying?.(); clearTimeout(fallbackTimer); }).catch(() => setError(true));
      });
      return () => clearTimeout(fallbackTimer);
    } else {
      setError(true);
      clearTimeout(fallbackTimer);
    }
  }, [streamUrl]);

  if (!streamUrl || error) {
    return (
      <div className="relative">
        <img
          src={imageUrl}
          alt={`Camera view: ${cameraName}`}
          className="w-full rounded-lg"
        />
        {streamUrl && error && (
          <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            Video unavailable — showing static image
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full rounded-lg bg-black"
        poster={imageUrl}
        {...(!hideControls ? { controls: true } : {})}
        playsInline
        muted
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <span className="text-xs text-muted-foreground">Feed unavailable</span>
        </div>
      )}
    </div>
  );
}
