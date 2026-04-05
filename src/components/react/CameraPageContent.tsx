import { useState, useMemo } from 'react';
import { useCameras } from '@/hooks/use-cameras';
import { useCMS } from '@/hooks/use-cms';
import { useIncidents } from '@/hooks/use-incidents';
import { useChainControl } from '@/hooks/use-chain-control';
import { useClosures } from '@/hooks/use-closures';
import { useTravelTimes } from '@/hooks/use-travel-times';
import { useFavorites } from '@/hooks/use-favorites';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
import { HistoricalImages } from './HistoricalImages';
import { cn } from '@/lib/utils';
import {
  matchCMSToCamera,
  matchIncidentsToCamera,
  matchClosuresToCamera,
  matchChainControlToCamera,
  matchTravelTimeToCamera,
} from '@/lib/matching';

interface CameraPageContentProps {
  cameraId: string;
  district: number;
}

export function CameraPageContent({ cameraId, district }: CameraPageContentProps) {
  const { data: cameras = [], isLoading } = useCameras(district);
  const { data: cmsList = [] } = useCMS(district);
  const { data: incidents = [] } = useIncidents();
  const { data: chainControls = [] } = useChainControl(district);
  const { data: closures = [] } = useClosures(district);
  const { data: travelTimes = [] } = useTravelTimes(district);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const [copiedLink, setCopiedLink] = useState(false);

  const camera = useMemo(() => {
    const found = cameras.find((c) => c.id === cameraId || c.id === cameraId.replace(/-0+/, '-'));
    if (!found) return null;
    return {
      ...found,
      nearbyCMS: matchCMSToCamera(found, cmsList),
      nearbyIncidents: matchIncidentsToCamera(found, incidents),
      chainControls: matchChainControlToCamera(found, chainControls),
      nearbyClosures: matchClosuresToCamera(found, closures),
      travelTime: matchTravelTimeToCamera(found, travelTimes),
      weatherAlerts: [],
    };
  }, [cameras, cameraId, cmsList, incidents, chainControls, closures, travelTimes]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="aspect-video animate-pulse rounded-xl bg-muted mb-4" />
        <div className="h-6 w-48 animate-pulse rounded bg-muted mb-2" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Camera Not Found</h1>
        <p className="text-muted-foreground mb-4">This camera could not be loaded.</p>
        <a href="/cameras" className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent transition-colors">
          Browse cameras
        </a>
      </div>
    );
  }

  const favorite = isFavorite(camera.id);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/cameras'}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Back
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <RouteShield route={camera.route} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{camera.location || camera.city}</h1>
              <p className="truncate text-xs text-muted-foreground">
                {camera.direction} — {camera.city}, {camera.county} — D{String(camera.district).padStart(2, '0')}
                {camera.elevation != null && ` · ${camera.elevation.toLocaleString()} ft`}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(camera.id)}
            className={cn(
              'rounded-md p-1.5 transition-colors flex-shrink-0',
              favorite ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-muted-foreground hover:bg-accent'
            )}
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Live Feed */}
          <div>
            <VideoPlayer
              streamUrl={camera.streamUrl}
              imageUrl={camera.imageUrl}
              cameraName={camera.location}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                camera.hasVideo ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${camera.hasVideo ? 'bg-green-500' : 'bg-gray-400'}`} />
                {camera.hasVideo ? 'Live Stream' : 'Static Image'}
              </span>
              {camera.isStale && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500">
                  Feed may be delayed
                </span>
              )}
            </div>
          </div>

          {/* Conditions */}
          <ConditionBadges chainControls={camera.chainControls} closures={camera.nearbyClosures} travelTime={camera.travelTime} />

          {/* Nearby CMS Signs */}
          {camera.nearbyCMS.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>
                Nearby Highway Signs
              </h3>
              <div className="space-y-3">
                {camera.nearbyCMS.map((cms) => (
                  <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />
                ))}
              </div>
            </div>
          )}

          {/* Nearby Incidents */}
          {camera.nearbyIncidents.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">Chain Control</h3>
              {camera.chainControls.map((cc) => (
                <div key={cc.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-sm mb-1.5">
                  <span className="font-semibold text-blue-400">{cc.level}</span> — {cc.location}
                </div>
              ))}
            </div>
          )}

          {/* Lane Closures */}
          {camera.nearbyClosures.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">Lane Closures</h3>
              {camera.nearbyClosures.map((cl) => (
                <div key={cl.id} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5 text-sm mb-1.5">
                  <div className="font-medium">{cl.location}</div>
                  <div className="text-xs text-muted-foreground">{cl.closureType} — {cl.lanesAffected}</div>
                </div>
              ))}
            </div>
          )}

          {/* Travel Time */}
          {camera.travelTime && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <div className="text-sm font-medium">{camera.travelTime.corridor}</div>
              <div className="flex gap-4 text-xs mt-1">
                <span>Current: <strong>{Math.round(camera.travelTime.currentTime)} min</strong></span>
                <span className="text-muted-foreground">Typical: {Math.round(camera.travelTime.typicalTime)} min</span>
                {camera.travelTime.delay > 0 && <span className="text-red-400">+{Math.round(camera.travelTime.delay)}m delay</span>}
              </div>
            </div>
          )}

          {/* Historical Images */}
          {camera.historicalImages && camera.historicalImages.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                History ({camera.historicalImages.length})
              </h3>
              <HistoricalImages images={camera.historicalImages} cameraName={camera.location} />
            </div>
          )}

          {/* Camera Details + Actions */}
          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-4">
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
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                Google Maps
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
              {(() => {
                const shareUrl = `https://caltraffic.com/camera/${camera.id}`;
                const shareText = `Live traffic camera: ${camera.location} on ${camera.route} — CalTraffic.com`;
                return (
                  <>
                    <a
                      href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                      aria-label="Share on X"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      Share
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                      aria-label="Share on Facebook"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Share
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                      aria-label="Share on LinkedIn"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      Share
                    </a>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
