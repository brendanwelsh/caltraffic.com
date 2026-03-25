import { useState, useEffect } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { HistoricalImages } from './HistoricalImages';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
import { cn } from '@/lib/utils';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

interface CameraDetailDialogProps {
  camera: EnrichedCamera;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function CameraDetailDialog({ camera, onClose, isFavorite = false, onToggleFavorite }: CameraDetailDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-[5vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl mb-[5vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Camera detail: ${camera.location}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3 rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <RouteShield route={camera.route} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{camera.location || camera.city}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {camera.direction} — {camera.city}, {camera.county} — D{String(camera.district).padStart(2, '0')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(camera.id)}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  isFavorite ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-muted-foreground hover:bg-accent'
                )}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-accent transition-colors"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Single scrollable content - no tabs */}
        <div className="p-4 space-y-5">
          {/* Live Feed */}
          <div>
            <VideoPlayer
              streamUrl={camera.streamUrl}
              imageUrl={camera.imageUrl}
              cameraName={camera.location}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                camera.hasVideo ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', camera.hasVideo ? 'bg-green-500' : 'bg-gray-400')} />
                {camera.hasVideo ? 'Live Stream' : 'Static Image'}
              </span>
              {camera.isStale && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500">
                  Feed may be delayed
                </span>
              )}
            </div>
          </div>

          {/* Nearby CMS Signs */}
          {camera.nearbyCMS.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M3 9h18"/>
                </svg>
                Nearby Highway Signs
              </h3>
              <div className="space-y-3">
                {camera.nearbyCMS.map((cms) => (
                  <CMSSign
                    key={cms.id}
                    phase1Lines={cms.phase1Lines}
                    phase2Lines={cms.phase2Lines}
                    location={cms.location}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Nearby Incidents */}
          {camera.nearbyIncidents.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4"/><path d="M12 17h.01"/>
                </svg>
                Nearby Incidents
              </h3>
              <div className="space-y-2">
                {camera.nearbyIncidents.map((inc) => (
                  <div key={inc.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-sm font-medium">{inc.type} — {inc.location}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{inc.description}</p>
                    {inc.logEntries.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-border pt-2">
                        {inc.logEntries.slice(0, 5).map((entry, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground">
                            <span className="font-medium">{entry.time}</span> — {entry.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chain Control */}
          {camera.chainControls.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">Chain Control</h4>
              <div className="space-y-1.5">
                {camera.chainControls.map((cc) => (
                  <div key={cc.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-400">{cc.level}</span>
                      <span className="text-muted-foreground">{cc.location}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{cc.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lane Closures */}
          {camera.nearbyClosures.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">Lane Closures</h4>
              <div className="space-y-1.5">
                {camera.nearbyClosures.map((cl) => (
                  <div key={cl.id} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5 text-sm">
                    <div className="font-medium">{cl.location}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {cl.closureType} — {cl.lanesAffected}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {cl.startTime} to {cl.endTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travel Time */}
          {camera.travelTime && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">Travel Time</h4>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-sm">
                <div className="font-medium">{camera.travelTime.corridor}</div>
                <div className="mt-1 flex gap-4 text-xs">
                  <span>Current: <strong>{Math.round(camera.travelTime.currentTime)} min</strong></span>
                  <span className="text-muted-foreground">Typical: {Math.round(camera.travelTime.typicalTime)} min</span>
                  {camera.travelTime.delay > 0 && (
                    <span className="text-red-400">+{Math.round(camera.travelTime.delay)} min delay</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Historical Images */}
          {camera.historicalImages.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                History ({camera.historicalImages.length})
              </h3>
              <HistoricalImages images={camera.historicalImages} cameraName={camera.location} />
            </div>
          )}

          {/* Camera Info + Actions */}
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
              Camera Details
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Route:</span>
                <RouteShield route={camera.route} size="sm" />
                <span>{camera.direction}</span>
              </div>
              <div><span className="text-muted-foreground">City:</span> {camera.city}</div>
              <div><span className="text-muted-foreground">County:</span> {camera.county}</div>
              <div><span className="text-muted-foreground">District:</span> D{String(camera.district).padStart(2, '0')}</div>
              <div><span className="text-muted-foreground">Postmile:</span> {camera.postmile.toFixed(1)}</div>
              <div><span className="text-muted-foreground">Coords:</span> {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}</div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                Google Maps
              </a>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/camera/${camera.id}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
