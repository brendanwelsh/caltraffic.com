import { useState, useEffect } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { CMSSign } from './CMSSign';
import { HistoricalImages } from './HistoricalImages';
import { cn } from '@/lib/utils';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

interface CameraDetailDialogProps {
  camera: EnrichedCamera;
  onClose: () => void;
}

type Tab = 'live' | 'history' | 'info';

export function CameraDetailDialog({ camera, onClose }: CameraDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('live');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'live', label: camera.hasVideo ? 'Live Video' : 'Live Image' },
    { key: 'history', label: `History (${camera.historicalImages.length})` },
    { key: 'info', label: 'Info' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-[5vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Camera detail: ${camera.location}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={`https://shields.caltranscameras.app/${camera.route}.svg`}
              alt={camera.route}
              className="h-6 flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{camera.location || camera.city}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {camera.route} {camera.direction} — {camera.city}, {camera.county} — D{String(camera.district).padStart(2, '0')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex-shrink-0 rounded-md p-1.5 hover:bg-accent transition-colors"
            aria-label="Close dialog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors text-center',
                activeTab === tab.key
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === 'live' && (
            <div className="space-y-4">
              <VideoPlayer
                streamUrl={camera.streamUrl}
                imageUrl={camera.imageUrl}
                cameraName={camera.location}
              />

              {/* Status info */}
              <div className="flex flex-wrap gap-2">
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

              {/* Nearby CMS */}
              {camera.nearbyCMS.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Nearby Message Signs</h3>
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
                  <h3 className="mb-2 text-sm font-semibold text-red-400">Nearby Incidents</h3>
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
            </div>
          )}

          {activeTab === 'history' && (
            <HistoricalImages images={camera.historicalImages} cameraName={camera.location} />
          )}

          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Route:</span> {camera.route} {camera.direction}</div>
                <div><span className="text-muted-foreground">City:</span> {camera.city}</div>
                <div><span className="text-muted-foreground">County:</span> {camera.county}</div>
                <div><span className="text-muted-foreground">District:</span> D{String(camera.district).padStart(2, '0')}</div>
                <div><span className="text-muted-foreground">Postmile:</span> {camera.postmile.toFixed(1)}</div>
                <div><span className="text-muted-foreground">Coordinates:</span> {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}</div>
              </div>
              <div className="flex gap-2">
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
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copy Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
