import { useState, useMemo, useCallback } from 'react';
import { useWatchRoom } from '@/hooks/use-watch-room';
import { useCameras } from '@/hooks/use-cameras';
import { useFavorites } from '@/hooks/use-favorites';
import { LAYOUT_PRESETS, SLOT_NAMES } from '@/lib/watch-room-layouts';
import { LayoutPicker } from './LayoutPicker';
import { WatchSlot } from './WatchSlot';
import { CameraDetailDialog } from './CameraDetailDialog';
import { RouteShield } from './RouteShield';
import type { Camera } from '@/lib/schemas';

const TIMER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
];

export function WatchRoom() {
  const {
    state, isSharedView, hasLayout,
    setPreset, addCameraToSlot, removeCameraFromSlot, setSlotTimer,
    clearLayout, getShareUrl, saveSharedLayout,
  } = useWatchRoom();

  const { data: allCameras = [] } = useCameras(null);
  const { favorites, isFavorite, toggle: toggleFavorite } = useFavorites();

  const [mode, setMode] = useState<'setup' | 'watch'>(hasLayout ? 'watch' : 'setup');
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [configSlot, setConfigSlot] = useState<number | null>(null);

  const preset = LAYOUT_PRESETS.find((p) => p.id === state.preset) || LAYOUT_PRESETS[1];

  // Search results
  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return allCameras
      .filter((c) => c.inService && c.imageUrl)
      .filter((c) =>
        c.location.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.route.toLowerCase().includes(q) ||
        c.county.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [search, allCameras]);

  // Favorited cameras for quick-add
  const favoriteCameras = useMemo(() => {
    return allCameras.filter((c) => isFavorite(c.id) && c.inService && c.imageUrl);
  }, [allCameras, favorites]);

  // Resolve camera IDs to Camera objects for slots
  const slotCameras = useMemo(() => {
    return state.slots.map((slot) =>
      slot.cameras
        .map((id) => allCameras.find((c) => c.id === id))
        .filter((c): c is Camera => c != null)
    );
  }, [state.slots, allCameras]);

  const handleAddToSlot = useCallback((cameraId: string) => {
    if (activeSlot !== null) {
      addCameraToSlot(activeSlot, cameraId);
    }
  }, [activeSlot, addCameraToSlot]);

  const handleShare = useCallback(() => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getShareUrl]);

  // Setup mode
  if (mode === 'setup') {
    return (
      <div className="space-y-6">
        {/* Shared view banner */}
        {isSharedView && (
          <div className="flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2">
            <span className="text-sm text-blue-400">Viewing a shared Watch Room layout</span>
            <button
              onClick={saveSharedLayout}
              className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
            >
              Save as mine
            </button>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watch Room</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a custom multi-camera viewer. Pick a layout, add cameras, set rotation timers.
          </p>
        </div>

        {/* Layout picker */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Layout</h2>
          <LayoutPicker selected={state.preset} onSelect={setPreset} />
        </div>

        {/* Slot grid preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Slots — {activeSlot !== null ? `configuring slot ${activeSlot + 1}` : 'click a slot to configure'}
            </h2>
            {hasLayout && (
              <div className="flex gap-1.5">
                <button onClick={handleShare} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">
                  {copied ? 'Copied!' : 'Share'}
                </button>
                <button onClick={() => setMode('watch')} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Start Watching
                </button>
              </div>
            )}
          </div>

          <div
            className="rounded-lg border border-border overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: preset.gridCols,
              gridTemplateRows: preset.gridRows,
              gridTemplateAreas: preset.gridTemplate,
              gap: '2px',
              height: '40vh',
              minHeight: '300px',
            }}
          >
            {state.slots.map((slot, i) => {
              const cameras = slotCameras[i] || [];
              const slotName = SLOT_NAMES[i];
              return (
                <div
                  key={i}
                  style={{ gridArea: slotName }}
                  className={`relative ${activeSlot === i ? 'ring-2 ring-primary' : ''}`}
                >
                  <WatchSlot
                    cameras={cameras}
                    timer={slot.timer}
                    slotIndex={i}
                    onConfig={(idx) => setActiveSlot(activeSlot === idx ? null : idx)}
                    onRemoveCamera={removeCameraFromSlot}
                  />
                  {/* Slot number badge */}
                  <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 text-white text-[9px] font-bold flex items-center justify-center z-10">
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slot config panel — shows when a slot is selected */}
        {activeSlot !== null && (
          <div className="rounded-md border border-primary/30 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Slot {activeSlot + 1} Settings</h3>
              <button onClick={() => setActiveSlot(null)} className="text-xs text-muted-foreground hover:text-foreground">Done</button>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rotation:</span>
              <div className="flex rounded-md border border-input overflow-hidden">
                {TIMER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSlotTimer(activeSlot, value)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                      state.slots[activeSlot]?.timer === value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cameras in this slot */}
            {(slotCameras[activeSlot] || []).length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Cameras in this slot:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(slotCameras[activeSlot] || []).map((cam) => (
                    <span key={cam.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px]">
                      {cam.route} — {cam.location || cam.city}
                      <button onClick={() => removeCameraFromSlot(activeSlot, cam.id)} className="text-muted-foreground hover:text-foreground ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Search to add cameras */}
            <div>
              <input
                type="text"
                placeholder="Search cameras to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchResults.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card">
                  {searchResults.map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => { handleAddToSlot(cam.id); setSearch(''); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-accent transition-colors border-b border-border/30 last:border-0"
                    >
                      <RouteShield route={cam.route} size="sm" />
                      <span className="truncate">{cam.location || cam.city}</span>
                      <span className="text-muted-foreground ml-auto shrink-0">{cam.direction} · {cam.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick-add from favorites */}
            {favoriteCameras.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Quick add from favorites:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {favoriteCameras.slice(0, 12).map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => handleAddToSlot(cam.id)}
                      className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      {cam.route} — {cam.location || cam.city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clear layout */}
        {hasLayout && (
          <button
            onClick={() => { clearLayout(); setActiveSlot(null); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear entire layout
          </button>
        )}
      </div>
    );
  }

  // Watch mode
  return (
    <div>
      {/* Shared view banner */}
      {isSharedView && (
        <div className="flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2 mb-2">
          <span className="text-sm text-blue-400">Viewing a shared Watch Room</span>
          <button
            onClick={saveSharedLayout}
            className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
          >
            Save as mine
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{preset.name} Watch Room</h2>
          <span className="text-xs text-muted-foreground">{state.slots.filter(s => s.cameras.length > 0).length} cameras</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleShare} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button onClick={() => setMode('setup')} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">
            Edit
          </button>
        </div>
      </div>

      {/* Watch grid */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: preset.gridCols,
          gridTemplateRows: preset.gridRows,
          gridTemplateAreas: preset.gridTemplate,
          gap: '2px',
          height: 'calc(100vh - 140px)',
        }}
      >
        {state.slots.map((slot, i) => {
          const cameras = slotCameras[i] || [];
          return (
            <div key={i} style={{ gridArea: SLOT_NAMES[i] }}>
              <WatchSlot
                cameras={cameras}
                timer={slot.timer}
                slotIndex={i}
                onConfig={() => setMode('setup')}
                onRemoveCamera={removeCameraFromSlot}
              />
            </div>
          );
        })}
      </div>

      {selectedCamera && (
        <CameraDetailDialog
          camera={selectedCamera as any}
          onClose={() => setSelectedCamera(null)}
          isFavorite={isFavorite(selectedCamera.id)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
