import { useState, useRef, useEffect } from 'react';
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

/** Mount video once seen, keep mounted. Static images always show. */
function StableFeed({ camera }: { camera: RouteCamera }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  useEffect(() => {
    if (!ref.current || !camera.streamUrl || hasBeenSeen) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHasBeenSeen(true); observer.disconnect(); } },
      { rootMargin: '300px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [camera.streamUrl, hasBeenSeen]);

  return (
    <div ref={ref}>
      {hasBeenSeen && camera.streamUrl ? (
        <VideoPlayer streamUrl={camera.streamUrl} imageUrl={camera.imageUrl} cameraName={camera.location} />
      ) : (
        <img src={camera.imageUrl} alt={camera.location} className="w-full aspect-video object-cover" loading="lazy" />
      )}
    </div>
  );
}

function FeedCard({ camera, routeDuration, isExpanded, onToggle }: {
  camera: RouteCamera;
  routeDuration: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const etaMinutes = routeDuration > 0 ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : '?';
  const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0 || camera.nearbyClosures.length > 0;
  const favorite = isFavorite(camera.id);

  return (
    <div className={`flex-1 rounded-xl border overflow-hidden bg-card cursor-pointer transition-shadow ${
      isExpanded ? 'shadow-lg' : 'hover:shadow-md'
    } ${hasIssues ? 'border-red-500/30' : 'border-border/60'}`} onClick={onToggle}>

      {/* Mobile: stacked. Desktop: side by side */}
      <div className="flex flex-col md:flex-row">
        {/* Feed */}
        <div className="md:w-[45%] shrink-0">
          <StableFeed camera={camera} />
        </div>

        {/* Info panel — fills remaining space */}
        <div className="flex-1 p-3 flex flex-col min-w-0">
          {/* Row 1: Route + direction + live + favorite */}
          <div className="flex items-center gap-2">
            <RouteShield route={camera.route} size="lg" />
            <span className="text-base font-bold">{camera.direction}</span>
            {camera.hasVideo && camera.streamUrl && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                live
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }}
              className={`ml-auto p-1.5 rounded-md transition-colors ${favorite ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>

          {/* Row 2: Location */}
          <p className="text-base font-semibold mt-1.5 leading-snug">{camera.location || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{camera.city}{camera.county ? `, ${camera.county}` : ''}</p>

          {/* Row 3: Details */}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div><span className="text-muted-foreground">District:</span> <span className="font-medium">D{String(camera.district).padStart(2, '0')}</span></div>
            <div><span className="text-muted-foreground">Postmile:</span> <span className="font-medium">{camera.postmile.toFixed(1)}</span></div>
            <div><span className="text-muted-foreground">ETA:</span> <span className="font-medium">~{etaMinutes} min</span></div>
            <div><span className="text-muted-foreground">Coords:</span> <span className="font-medium">{camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}</span></div>
          </div>

          {/* Row 4: Links */}
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`https://www.google.com/maps?q=${camera.latitude},${camera.longitude}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-[11px] hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              Google Maps
            </a>
            <a href={`/camera/${camera.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-[11px] hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              Camera Page
            </a>
          </div>

          {/* Row 5: Conditions + signs — always visible, fills bottom */}
          <div className="mt-2 space-y-1.5">
            <ConditionBadges chainControls={camera.chainControls} closures={camera.nearbyClosures} travelTime={camera.travelTime} />

            {camera.nearbyIncidents.length > 0 && (
              <div className="flex items-start gap-1.5 rounded-md bg-red-500/5 border border-red-500/20 p-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
                <div>
                  <span className="text-xs text-red-400 font-semibold">{camera.nearbyIncidents.map((inc) => inc.type).join(', ')}</span>
                  {camera.nearbyIncidents[0]?.description && (
                    <p className="text-[10px] text-red-400/70 mt-0.5">{camera.nearbyIncidents[0].description}</p>
                  )}
                </div>
              </div>
            )}

            {/* CMS signs always shown */}
            {camera.nearbyCMS.slice(0, 2).map((cms) => (
              <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded: full incident logs, all signs, closures */}
      {isExpanded && (
        <div className="border-t border-border p-3 space-y-3">
          {camera.nearbyCMS.length > 2 && (
            <div>
              <h4 className="mb-1.5 text-[11px] font-semibold text-amber-400">All Signs ({camera.nearbyCMS.length})</h4>
              <div className="space-y-1.5">{camera.nearbyCMS.slice(2).map((cms) => <CMSSign key={cms.id} phase1Lines={cms.phase1Lines} phase2Lines={cms.phase2Lines} location={cms.location} />)}</div>
            </div>
          )}
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
          {camera.chainControls.map((cc) => (
            <div key={cc.id} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs">
              <span className="font-semibold text-blue-400">{cc.level}</span> — {cc.location}
            </div>
          ))}
          {camera.nearbyClosures.map((cl) => (
            <div key={cl.id} className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2.5 text-xs">
              <div className="font-medium">{cl.location}</div>
              <div className="text-[11px] text-muted-foreground">{cl.closureType} — {cl.lanesAffected}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Collapsed mini row for unavailable cameras */
function MiniCard({ camera, routeDuration }: { camera: RouteCamera; routeDuration: number }) {
  const etaMinutes = routeDuration > 0 ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : '?';
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-1 opacity-50">
      <RouteShield route={camera.route} size="sm" />
      <span className="text-[10px] text-muted-foreground truncate">{camera.direction} — {camera.location || camera.city}</span>
      <span className="ml-auto text-[9px] text-muted-foreground shrink-0">{etaMinutes}m</span>
      <span className="text-[8px] text-muted-foreground/40 italic">unavailable</span>
    </div>
  );
}

export function RouteLiveView({ cameras, routeDuration }: RouteLiveViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...cameras].sort((a, b) => a.progressAlongRoute - b.progressAlongRoute);
  const available = sorted.filter(c => c.imageUrl && !c.isStale);
  const unavailable = sorted.filter(c => !c.imageUrl || c.isStale);
  const liveCount = available.filter(c => c.hasVideo && c.streamUrl).length;

  return (
    <div>
      <p className="mb-2 text-[10px] text-muted-foreground">
        {available.length} cameras · {liveCount} live
        {unavailable.length > 0 && ` · ${unavailable.length} unavailable`}
      </p>

      <div className="space-y-0">
        {sorted.map((camera, i) => {
          const isUnavailable = !camera.imageUrl || camera.isStale;

          // Unavailable: always show collapsed
          if (isUnavailable) {
            return (
              <div key={camera.id} className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                <div className="relative flex gap-3 py-0.5">
                  <div className="flex items-center shrink-0 z-10">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                  </div>
                  <MiniCard camera={camera} routeDuration={routeDuration} />
                </div>
              </div>
            );
          }

          return (
            <div key={camera.id}>
              <div className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                <div className="relative flex gap-3 py-2">
                  <div className="flex flex-col items-center shrink-0 z-10 pt-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      camera.nearbyIncidents.length > 0 ? 'border-red-500 bg-red-500/30' :
                      camera.hasVideo ? 'border-green-500 bg-green-500/30' :
                      'border-muted-foreground bg-muted'
                    }`} />
                    <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {routeDuration > 0 ? Math.round(camera.progressAlongRoute * (routeDuration / 60)) : '?'}m
                    </span>
                  </div>
                  <FeedCard
                    camera={camera}
                    routeDuration={routeDuration}
                    isExpanded={expandedId === camera.id}
                    onToggle={() => setExpandedId(expandedId === camera.id ? null : camera.id)}
                  />
                </div>
              </div>

              {/* Distance to next available camera */}
              {camera.distanceToNext != null && i < sorted.length - 1 && (
                <div className="relative flex items-center py-0.5 pl-[15px]">
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                  <div className="ml-6 text-[9px] text-muted-foreground/40">
                    {camera.distanceToNext < 1 ? `${Math.round(camera.distanceToNext * 1000)}m` : `${camera.distanceToNext.toFixed(1)}km`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {available.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No cameras found along this route</p>
        </div>
      )}
    </div>
  );
}
