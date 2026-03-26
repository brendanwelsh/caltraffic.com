import { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { RouteShield } from './RouteShield';
import { ConditionBadges } from './ConditionBadges';
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
      <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

      <div className="relative flex gap-3 py-2">
        {/* Timeline */}
        <div className="flex flex-col items-center shrink-0 z-10 pt-3">
          <div className={`w-4 h-4 rounded-full border-2 ${
            hasIssues ? 'border-red-500 bg-red-500/30' :
            camera.hasVideo ? 'border-green-500 bg-green-500/30' :
            'border-muted-foreground bg-muted'
          }`} />
          <span className="mt-1 text-[10px] font-medium text-muted-foreground">{etaMinutes}m</span>
        </div>

        {/* Card */}
        <div className={`flex-1 rounded-xl border overflow-hidden bg-card cursor-pointer transition-shadow ${
          isExpanded ? 'shadow-lg' : 'hover:shadow-md'
        } ${hasIssues ? 'border-red-500/30' : 'border-border/60'}`} onClick={onToggle}>

          <div className="flex">
            {/* Left: feed */}
            <div className="w-[45%] shrink-0">
              <VideoPlayer streamUrl={camera.streamUrl} imageUrl={camera.imageUrl} cameraName={camera.location} />
            </div>

            {/* Right: info + details */}
            <div className="flex-1 p-3 flex flex-col min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2">
                <RouteShield route={camera.route} size="md" />
                <span className="text-sm font-semibold">{camera.direction}</span>
                {camera.hasVideo && camera.streamUrl && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    live
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }}
                  className={`ml-auto p-1 rounded-md transition-colors ${favorite ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              </div>

              {/* Location */}
              <p className="text-sm font-medium mt-1 leading-snug">{camera.location || 'Unknown'}</p>
              <p className="text-[11px] text-muted-foreground">{camera.city}{camera.county ? `, ${camera.county}` : ''}</p>

              {/* Details grid */}
              <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                <span><span className="text-muted-foreground">District</span> {camera.district}</span>
                <span><span className="text-muted-foreground">PM</span> {camera.postmile.toFixed(1)}</span>
                <span><span className="text-muted-foreground">ETA</span> ~{etaMinutes} min</span>
                <span><span className="text-muted-foreground">Coords</span> {camera.latitude.toFixed(3)},{camera.longitude.toFixed(3)}</span>
              </div>

              {/* Links */}
              <div className="mt-1.5 flex gap-2">
                <a
                  href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                  Google Maps
                </a>
                <a
                  href={`/camera/${camera.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                  Camera page
                </a>
              </div>

              {/* Conditions */}
              <div className="mt-auto pt-1.5 space-y-1">
                <ConditionBadges chainControls={camera.chainControls} closures={camera.nearbyClosures} travelTime={camera.travelTime} />

                {camera.nearbyIncidents.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
                    <span className="text-[11px] text-red-400 font-medium">{camera.nearbyIncidents.map((inc) => inc.type).join(', ')}</span>
                  </div>
                )}

                {/* Inline CMS sign preview */}
                {camera.nearbyCMS.length > 0 && (
                  <div className="space-y-1">
                    {camera.nearbyCMS.slice(0, 1).map((cms) => (
                      <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded: full incident details, chain control, closures */}
          {isExpanded && (camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0 || camera.nearbyCMS.length > 1) && (
            <div className="border-t border-border p-3 space-y-3">
              {/* All CMS signs (if more than 1) */}
              {camera.nearbyCMS.length > 1 && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-semibold text-amber-400">All Highway Signs ({camera.nearbyCMS.length})</h4>
                  <div className="space-y-1.5">
                    {camera.nearbyCMS.map((cms) => (
                      <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />
                    ))}
                  </div>
                </div>
              )}

              {/* Full incident details */}
              {camera.nearbyIncidents.map((inc) => (
                <div key={inc.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
                  <p className="text-xs font-medium">{inc.type} — {inc.location}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{inc.description}</p>
                  {inc.logEntries.length > 0 && (
                    <div className="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
                      {inc.logEntries.slice(0, 5).map((entry, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground"><span className="font-medium">{entry.time}</span> — {entry.text}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Chain Control */}
              {camera.chainControls.map((cc) => (
                <div key={cc.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs">
                  <span className="font-semibold text-blue-400">{cc.level}</span> — {cc.location}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{cc.status}</p>
                </div>
              ))}

              {/* Lane Closures */}
              {camera.nearbyClosures.map((cl) => (
                <div key={cl.id} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5 text-xs">
                  <div className="font-medium">{cl.location}</div>
                  <div className="text-[11px] text-muted-foreground">{cl.closureType} — {cl.lanesAffected}</div>
                  <div className="text-[11px] text-muted-foreground">{cl.startTime} to {cl.endTime}</div>
                </div>
              ))}
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
        {displayCameras.length} cameras · {liveCount} live
      </p>

      <div className="space-y-0">
        {displayCameras.map((camera, i) => (
          <div key={camera.id}>
            <FeedCard
              camera={camera}
              routeDuration={routeDuration}
              isExpanded={expandedId === camera.id}
              onToggle={() => setExpandedId(expandedId === camera.id ? null : camera.id)}
            />
            {/* Distance to next camera */}
            {camera.distanceToNext != null && i < displayCameras.length - 1 && (
              <div className="relative flex items-center py-1 pl-[15px]">
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                <div className="ml-6 flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
                  {camera.distanceToNext < 1
                    ? `${Math.round(camera.distanceToNext * 1000)}m`
                    : `${camera.distanceToNext.toFixed(1)} km`
                  } to next camera
                </div>
              </div>
            )}
          </div>
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
