import { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
import { HistoricalImages } from './HistoricalImages';
import { useFavorites } from '@/hooks/use-favorites';
import type { RouteCamera } from '@/hooks/use-route-planner';

interface RouteLiveViewProps {
  cameras: RouteCamera[];
  routeDuration: number;
}

function FeedCard({ camera, routeDuration, isExpanded, onToggle }: {
  camera: RouteCamera;
  routeDuration: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const etaMinutes = Math.round(camera.progressAlongRoute * (routeDuration / 60));
  const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;
  const favorite = isFavorite(camera.id);

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

      <div className="relative flex gap-3 py-2">
        {/* Timeline dot + ETA */}
        <div className="flex flex-col items-center shrink-0 z-10 pt-3">
          <div className={`w-4 h-4 rounded-full border-2 ${
            hasIssues ? 'border-red-500 bg-red-500/30' :
            camera.hasVideo ? 'border-green-500 bg-green-500/30' :
            'border-muted-foreground bg-muted'
          }`} />
          <span className="mt-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">{etaMinutes}m</span>
        </div>

        {/* Card */}
        <div className={`flex-1 rounded-xl border overflow-hidden bg-card transition-shadow ${
          isExpanded ? 'shadow-lg' : 'hover:shadow-md'
        } ${hasIssues ? 'border-red-500/30' : 'border-border/60'}`}>

          {/* Top bar: feed + info side by side */}
          <div className="flex cursor-pointer" onClick={onToggle}>
            {/* Feed */}
            <div className="w-[50%] shrink-0">
              <VideoPlayer
                streamUrl={camera.streamUrl}
                imageUrl={camera.imageUrl}
                cameraName={camera.location}
              />
            </div>

            {/* Info panel */}
            <div className="flex-1 p-3 flex flex-col min-w-0">
              {/* Route + status */}
              <div className="flex items-center gap-2">
                <RouteShield route={camera.route} size="md" />
                <span className="text-sm font-semibold">{camera.direction}</span>
                {camera.hasVideo && camera.streamUrl && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    live
                  </span>
                )}
                {/* Favorite */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }}
                  className={`ml-auto p-1 rounded-md transition-colors ${
                    favorite ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-muted-foreground'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              </div>

              {/* Location */}
              <p className="text-sm font-medium mt-1.5 leading-snug">
                {camera.location || 'Unknown location'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {camera.city}{camera.county ? `, ${camera.county}` : ''} — District {camera.district}
              </p>

              {/* Quick stats */}
              <div className="mt-auto pt-2 space-y-1.5">
                <ConditionBadges
                  chainControls={camera.chainControls}
                  closures={camera.nearbyClosures}
                  travelTime={camera.travelTime}
                />

                {camera.nearbyIncidents.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
                    <span className="text-[11px] text-red-400 font-medium">
                      {camera.nearbyIncidents.map((inc) => inc.type).join(', ')}
                    </span>
                  </div>
                )}

                {camera.nearbyCMS.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect width="16" height="10" x="4" y="6" rx="1"/></svg>
                    <span className="text-[11px] text-amber-400">{camera.nearbyCMS.length} highway sign{camera.nearbyCMS.length > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Expand hint */}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                  {isExpanded ? 'Click to collapse' : 'Click for details'}
                </div>
              </div>
            </div>
          </div>

          {/* Expanded detail sections */}
          {isExpanded && (
            <div className="border-t border-border p-4 space-y-4">
              {/* CMS Signs */}
              {camera.nearbyCMS.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold flex items-center gap-2 text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>
                    Highway Signs
                  </h4>
                  <div className="space-y-2">
                    {camera.nearbyCMS.map((cms) => (
                      <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />
                    ))}
                  </div>
                </div>
              )}

              {/* Incidents */}
              {camera.nearbyIncidents.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold flex items-center gap-2 text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    Incidents
                  </h4>
                  {camera.nearbyIncidents.map((inc) => (
                    <div key={inc.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 mb-2">
                      <p className="text-sm font-medium">{inc.type} — {inc.location}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{inc.description}</p>
                      {inc.logEntries.length > 0 && (
                        <div className="mt-2 space-y-0.5 border-t border-border pt-2">
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
              )}

              {/* Chain Control */}
              {camera.chainControls.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-blue-400">Chain Control</h4>
                  {camera.chainControls.map((cc) => (
                    <div key={cc.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-sm mb-1.5">
                      <span className="font-semibold text-blue-400">{cc.level}</span> — {cc.location}
                      <p className="text-xs text-muted-foreground mt-0.5">{cc.status}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Lane Closures */}
              {camera.nearbyClosures.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-orange-400">Lane Closures</h4>
                  {camera.nearbyClosures.map((cl) => (
                    <div key={cl.id} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5 text-sm mb-1.5">
                      <div className="font-medium">{cl.location}</div>
                      <div className="text-xs text-muted-foreground">{cl.closureType} — {cl.lanesAffected}</div>
                      <div className="text-xs text-muted-foreground">{cl.startTime} to {cl.endTime}</div>
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
              {camera.historicalImages.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold">History ({camera.historicalImages.length})</h4>
                  <HistoricalImages images={camera.historicalImages} cameraName={camera.location} />
                </div>
              )}

              {/* Camera metadata + actions */}
              <div className="border-t border-border pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-muted-foreground">Route:</span> {camera.route} {camera.direction}</div>
                  <div><span className="text-muted-foreground">City:</span> {camera.city}</div>
                  <div><span className="text-muted-foreground">County:</span> {camera.county}</div>
                  <div><span className="text-muted-foreground">District:</span> D{String(camera.district).padStart(2, '0')}</div>
                  <div><span className="text-muted-foreground">Postmile:</span> {camera.postmile.toFixed(1)}</div>
                  <div><span className="text-muted-foreground">Coords:</span> {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}</div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                    Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RouteLiveView({ cameras, routeDuration }: RouteLiveViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayCameras = [...cameras].sort((a, b) => a.progressAlongRoute - b.progressAlongRoute);
  const liveCount = displayCameras.filter(c => c.hasVideo && c.streamUrl).length;

  return (
    <div>
      <p className="mb-2 text-[10px] text-muted-foreground">
        {displayCameras.length} cameras · {liveCount} live · click any camera for full details
      </p>

      <div className="space-y-0">
        {displayCameras.map((camera) => (
          <FeedCard
            key={camera.id}
            camera={camera}
            routeDuration={routeDuration}
            isExpanded={expandedId === camera.id}
            onToggle={() => setExpandedId(expandedId === camera.id ? null : camera.id)}
          />
        ))}
      </div>

      {displayCameras.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No cameras found along this route</p>
        </div>
      )}
    </div>
  );
}
