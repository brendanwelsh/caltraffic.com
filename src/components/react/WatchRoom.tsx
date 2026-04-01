import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { unavailableCameras } from '@/stores/filters';
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
  const { data: allCameras = [] } = useCameras(null);
  const {
    allViews, activeView, selectView, createView, duplicateView,
    renameView, deleteView, setPreset, addCameraToSlot,
    removeCameraFromSlot, setSlotTimer, clearLayout,
    isSharedView, hasLayout, getShareUrl, saveSharedLayout,
  } = useWatchRoom(allCameras);

  const { favorites, isFavorite, toggle: toggleFavorite } = useFavorites();

  const [mode, setMode] = useState<'browse' | 'setup' | 'watch'>(
    hasLayout ? 'watch' : 'browse'
  );
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [newViewName, setNewViewName] = useState('');

  const preset = LAYOUT_PRESETS.find((p) => p.id === activeView?.preset) || LAYOUT_PRESETS[1];

  // Search results
  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return allCameras
      .filter((c) => c.inService && c.imageUrl && !brokenCameras.has(c.id))
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

  const brokenCameras = useStore(unavailableCameras);

  // Resolve camera IDs to Camera objects for slots, excluding unavailable
  const slotCameras = useMemo(() => {
    if (!activeView) return [];
    return activeView.slots.map((slot) =>
      slot.cameras
        .map((id) => allCameras.find((c) => c.id === id))
        .filter((c): c is Camera => c != null && !brokenCameras.has(c.id))
    );
  }, [activeView?.slots, allCameras, brokenCameras]);

  const handleAddToSlot = useCallback((cameraId: string) => {
    if (activeSlot !== null) addCameraToSlot(activeSlot, cameraId);
  }, [activeSlot, addCameraToSlot]);

  const handleShare = useCallback(() => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getShareUrl]);

  const handleCreateView = useCallback(() => {
    const name = newViewName.trim() || 'New View';
    createView(name);
    setNewViewName('');
    setMode('setup');
  }, [createView, newViewName]);

  // ─── Browse Mode — view selector ──────────────────────

  if (mode === 'browse') {
    const defaultViews = allViews.filter((v) => v.isDefault);
    const userViewsList = allViews.filter((v) => !v.isDefault);

    return (
      <div className="space-y-6">
        {/* Shared view banner */}
        {isSharedView && (
          <div className="flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2">
            <span className="text-sm text-blue-400">Viewing a shared layout</span>
            <button
              onClick={() => { saveSharedLayout(); }}
              className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
            >
              Save as mine
            </button>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Views</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-camera layouts for monitoring. Pick a preset or build your own.
          </p>
        </div>

        {/* Default views */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Presets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {defaultViews.map((view) => {
              const viewPreset = LAYOUT_PRESETS.find((p) => p.id === view.preset);
              const filledSlots = view.slots.filter((s) => s.cameras.length > 0).length;
              return (
                <button
                  key={view.id}
                  onClick={() => { selectView(view.id); setMode('watch'); }}
                  className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold">{view.name}</span>
                    <span className="text-[9px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{viewPreset?.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                    {/* Show description from default-views data */}
                    {view.name === 'Sierra Storm Watch' && 'Monitor conditions on the Sierra passes during storms'}
                    {view.name === 'Bay Area Commute' && 'Key chokepoints for Bay Area commuters'}
                    {view.name === 'SoCal Bottlenecks' && 'The worst traffic spots in Southern California'}
                    {view.name === 'Coastal PCH' && 'PCH cameras from Half Moon Bay to Laguna Beach'}
                    {view.name === 'SoCal Landmarks' && 'Iconic Southern California locations'}
                  </p>
                  <div className="flex items-center gap-1">
                    {view.slots.slice(0, 4).map((slot, i) => {
                      const cam = slot.cameras[0] ? allCameras.find((c) => c.id === slot.cameras[0]) : null;
                      return (
                        <div key={i} className="w-16 h-10 rounded-sm overflow-hidden bg-muted/30 shrink-0">
                          {cam?.imageUrl && (
                            <img src={cam.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                      );
                    })}
                    <span className="text-[9px] text-muted-foreground ml-auto">{filledSlots} cams</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
                    <span className="text-[9px] text-muted-foreground/50 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      Locked preset
                    </span>
                    <span className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateView(view.id, view.name + ' (Copy)'); setMode('setup'); }}
                      className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Clone & Edit
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* User views */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Your Views</h2>
          {userViewsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userViewsList.map((view) => {
                const viewPreset = LAYOUT_PRESETS.find((p) => p.id === view.preset);
                const filledSlots = view.slots.filter((s) => s.cameras.length > 0).length;
                return (
                  <div key={view.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      {renamingId === view.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); renameView(view.id, renameText); setRenamingId(null); }} className="flex gap-1 flex-1">
                          <input
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            className="h-6 flex-1 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                          />
                          <button type="submit" className="text-[10px] text-primary font-medium">Save</button>
                        </form>
                      ) : (
                        <span className="text-sm font-bold">{view.name}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{viewPreset?.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      {view.slots.slice(0, 4).map((slot, i) => {
                        const cam = slot.cameras[0] ? allCameras.find((c) => c.id === slot.cameras[0]) : null;
                        return (
                          <div key={i} className="w-16 h-10 rounded-sm overflow-hidden bg-muted/30 shrink-0">
                            {cam?.imageUrl && <img src={cam.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />}
                          </div>
                        );
                      })}
                      <span className="text-[9px] text-muted-foreground ml-auto">{filledSlots} cams</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { selectView(view.id); setMode('watch'); }} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Watch</button>
                      <button onClick={() => { selectView(view.id); setMode('setup'); }} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">Edit</button>
                      <button onClick={() => { setRenamingId(view.id); setRenameText(view.name); }} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">Rename</button>
                      <button onClick={() => deleteView(view.id)} className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors ml-auto">Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No custom views yet. Create one or duplicate a preset.</p>
          )}

          {/* Create new view */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="New view name..."
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateView()}
              className="h-8 w-48 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={handleCreateView} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              + New View
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Setup Mode — editing a view ──────────────────────

  if (mode === 'setup') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMode('browse')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              <h1 className="text-xl font-bold">{activeView?.name || 'New View'}</h1>
              {activeView?.isDefault && <span className="text-[9px] bg-muted/50 rounded px-1.5 py-0.5 text-muted-foreground">Preset — editing creates a copy</span>}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pick a layout, click slots to add cameras.
            </p>
          </div>
          {hasLayout && (
            <div className="flex gap-1.5">
              <button onClick={handleShare} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">
                {copied ? 'Copied!' : 'Share'}
              </button>
              <button onClick={() => setMode('watch')} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Start Watching
              </button>
            </div>
          )}
        </div>

        {/* Layout picker */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Layout</h2>
          <LayoutPicker selected={activeView?.preset || '2x2'} onSelect={setPreset} />
        </div>

        {/* Slot grid preview */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Slots — {activeSlot !== null ? `configuring slot ${activeSlot + 1}` : 'click a slot to configure'}
          </h2>

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
            {(activeView?.slots || []).map((slot, i) => {
              const cameras = slotCameras[i] || [];
              const slotName = SLOT_NAMES[i];
              return (
                <div key={i} style={{ gridArea: slotName }} className={`relative ${activeSlot === i ? 'ring-2 ring-primary' : ''}`}>
                  <WatchSlot
                    cameras={cameras}
                    timer={slot.timer}
                    slotIndex={i}
                    onConfig={(idx) => setActiveSlot(activeSlot === idx ? null : idx)}
                    onRemoveCamera={removeCameraFromSlot}
                  />
                  <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 text-white text-[9px] font-bold flex items-center justify-center z-10">
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slot config panel */}
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
                      activeView?.slots[activeSlot]?.timer === value
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

            {/* Add from favorites — PRIMARY action */}
            {favoriteCameras.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-yellow-400">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span className="text-xs font-semibold">Add from Favorites</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {favoriteCameras.map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => handleAddToSlot(cam.id)}
                      className="flex flex-col rounded-md border border-border overflow-hidden hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="aspect-video bg-black overflow-hidden">
                        <img src={cam.imageUrl} alt={cam.location} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="px-1.5 py-1">
                        <p className="text-[9px] font-semibold truncate">{cam.route} {cam.direction}</p>
                        <p className="text-[8px] text-muted-foreground truncate">{cam.location || cam.city}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {favoriteCameras.length === 0 && (
              <div className="rounded-md border border-dashed border-yellow-500/30 bg-yellow-500/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">No favorites yet — star cameras on <a href="/" className="underline hover:text-foreground">All Cameras</a> to add them here quickly</p>
              </div>
            )}

            {/* Search */}
            <div>
              <span className="text-xs text-muted-foreground mb-1 block">Or search all cameras:</span>
              <input
                type="text"
                placeholder="Search by name, route, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchResults.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card">
                  {searchResults.map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => handleAddToSlot(cam.id)}
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
          </div>
        )}

        {/* Clear / duplicate */}
        <div className="flex items-center gap-3">
          {hasLayout && !activeView?.isDefault && (
            <button onClick={() => { clearLayout(); setActiveSlot(null); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear all cameras
            </button>
          )}
          {activeView && (
            <button
              onClick={() => { duplicateView(activeView.id, activeView.name + ' Copy'); setMode('setup'); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Duplicate this view
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Watch Mode ────────────────────────────────────────

  return (
    <div>
      {/* Shared view banner */}
      {isSharedView && (
        <div className="flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2 mb-2">
          <span className="text-sm text-blue-400">Viewing a shared layout</span>
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
          <button onClick={() => setMode('browse')} className="text-xs text-muted-foreground hover:text-foreground">← Views</button>
          <h2 className="text-sm font-semibold">{activeView?.name || 'Custom View'}</h2>
          <span className="text-xs text-muted-foreground">{activeView?.slots.filter(s => s.cameras.length > 0).length || 0} cameras</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View tabs for quick switching */}
          <div className="hidden sm:flex items-center gap-0.5 mr-2">
            {allViews.filter((v) => v.slots.some((s) => s.cameras.length > 0)).slice(0, 5).map((view) => (
              <button
                key={view.id}
                onClick={() => selectView(view.id)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  activeView?.id === view.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {view.name}
              </button>
            ))}
          </div>
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
          height: 'calc(100vh - 160px)',
          maxHeight: 'calc(100dvh - 160px)',
        }}
      >
        {(activeView?.slots || []).map((slot, i) => {
          const cameras = slotCameras[i] || [];
          return (
            <div key={i} style={{ gridArea: SLOT_NAMES[i] }} className="relative">
              <WatchSlot
                cameras={cameras}
                timer={slot.timer}
                slotIndex={i}
                onConfig={() => { setActiveSlot(i); setMode('setup'); }}
                onRemoveCamera={removeCameraFromSlot}
              />
            </div>
          );
        })}
      </div>

      {/* Camera detail dialog */}
      {selectedCamera && (
        <CameraDetailDialog
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
          isFavorite={isFavorite(selectedCamera.id)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
