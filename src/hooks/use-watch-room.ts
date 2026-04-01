import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LAYOUT_PRESETS } from '@/lib/watch-room-layouts';
import { DEFAULT_VIEWS } from '@/lib/default-views';
import type { DefaultViewCamera } from '@/lib/default-views';
import type { Camera } from '@/lib/schemas';

// ─── Types ───────────────────────────────────────────────

export interface WatchSlotConfig {
  cameras: string[]; // camera IDs
  timer: number;     // rotation seconds, 0 = no rotation
}

export interface SavedView {
  id: string;
  name: string;
  preset: string;
  slots: WatchSlotConfig[];
  isDefault?: boolean;  // built-in, can't delete
  createdAt: number;
}

// ─── Storage ─────────────────────────────────────────────

const VIEWS_KEY = 'caltraffic-views';
const ACTIVE_KEY = 'caltraffic-active-view';
// Legacy key from v1
const LEGACY_KEY = 'caltraffic-watch-room';

function loadViews(): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (raw) return JSON.parse(raw) as SavedView[];
  } catch {}
  return [];
}

function saveViews(views: SavedView[]) {
  try {
    // Only save user views (non-default)
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views.filter((v) => !v.isDefault)));
  } catch {}
}

function loadActiveId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {}
  return null;
}

function saveActiveId(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
}

function loadFromUrl(): SavedView | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('layout');
    if (!encoded) return null;
    const data = JSON.parse(atob(encoded));
    // Support old format (just { preset, slots })
    if (data.preset && data.slots && !data.id) {
      return {
        id: 'shared-' + Date.now(),
        name: 'Shared View',
        preset: data.preset,
        slots: data.slots,
        createdAt: Date.now(),
      };
    }
    return data as SavedView;
  } catch {}
  return null;
}

/** Migrate v1 single-layout to v2 named views */
function migrateLegacy(): SavedView | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.preset && data.slots) {
      const view: SavedView = {
        id: 'migrated-' + Date.now(),
        name: 'My Layout',
        preset: data.preset,
        slots: data.slots,
        createdAt: Date.now(),
      };
      localStorage.removeItem(LEGACY_KEY);
      return view;
    }
  } catch {}
  return null;
}

// ─── Default View Resolution ─────────────────────────────

function resolveDefaultCamera(cam: DefaultViewCamera, allCameras: Camera[]): string | null {
  for (const c of allCameras) {
    if (c.district !== cam.district) continue;
    const locCity = (c.location + ' ' + c.city).toLowerCase();
    for (const term of cam.matchTerms) {
      if (locCity.includes(term.toLowerCase())) return c.id;
    }
  }
  return null;
}

function resolveDefaultView(dv: typeof DEFAULT_VIEWS[number], allCameras: Camera[]): SavedView {
  return {
    id: dv.id,
    name: dv.name,
    preset: dv.preset,
    isDefault: true,
    createdAt: 0,
    slots: dv.slots.map((slot) => ({
      cameras: slot.cameras
        .map((cam) => resolveDefaultCamera(cam, allCameras))
        .filter((id): id is string => id !== null),
      timer: slot.timer,
    })),
  };
}

// ─── Hook ────────────────────────────────────────────────

function emptySlots(presetId: string): WatchSlotConfig[] {
  const preset = LAYOUT_PRESETS.find((p) => p.id === presetId) || LAYOUT_PRESETS[1];
  return Array.from({ length: preset.slots }, () => ({ cameras: [], timer: 0 }));
}

export function useWatchRoom(allCameras: Camera[] = []) {
  const [userViews, setUserViews] = useState<SavedView[]>(() => {
    const views = loadViews();
    const legacy = migrateLegacy();
    if (legacy) return [...views, legacy];
    return views;
  });

  const [activeViewId, setActiveViewId] = useState<string | null>(() => {
    const fromUrl = loadFromUrl();
    if (fromUrl) return fromUrl.id;
    return loadActiveId();
  });

  const [sharedView, setSharedView] = useState<SavedView | null>(() => loadFromUrl());

  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Resolve default views when camera data is available
  const resolvedDefaults = useMemo(() => {
    if (!allCameras.length) return [];
    return DEFAULT_VIEWS.map((dv) => resolveDefaultView(dv, allCameras));
  }, [allCameras]);

  // All views = defaults + user views + shared (if any)
  const allViews = useMemo(() => {
    const views = [...resolvedDefaults, ...userViews];
    if (sharedView && !views.find((v) => v.id === sharedView.id)) {
      views.push(sharedView);
    }
    return views;
  }, [resolvedDefaults, userViews, sharedView]);

  // Active view
  const activeView = useMemo(() => {
    if (!activeViewId) return allViews[0] || null;
    return allViews.find((v) => v.id === activeViewId) || allViews[0] || null;
  }, [allViews, activeViewId]);

  // Auto-save user views
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveViews(userViews), 500);
    return () => clearTimeout(saveTimer.current);
  }, [userViews]);

  // Save active view ID
  useEffect(() => {
    if (activeViewId) saveActiveId(activeViewId);
  }, [activeViewId]);

  // ─── View Management ───────────────────────────────────

  const selectView = useCallback((id: string) => {
    setActiveViewId(id);
  }, []);

  const createView = useCallback((name: string, presetId = '2x2'): string => {
    const id = 'user-' + Date.now();
    const view: SavedView = {
      id,
      name,
      preset: presetId,
      slots: emptySlots(presetId),
      createdAt: Date.now(),
    };
    setUserViews((prev) => [...prev, view]);
    setActiveViewId(id);
    return id;
  }, []);

  const duplicateView = useCallback((sourceId: string, newName: string): string => {
    const source = allViews.find((v) => v.id === sourceId);
    if (!source) return createView(newName);
    const id = 'user-' + Date.now();
    const view: SavedView = {
      id,
      name: newName,
      preset: source.preset,
      slots: source.slots.map((s) => ({ ...s, cameras: [...s.cameras] })),
      createdAt: Date.now(),
    };
    setUserViews((prev) => [...prev, view]);
    setActiveViewId(id);
    return id;
  }, [allViews, createView]);

  const renameView = useCallback((id: string, name: string) => {
    setUserViews((prev) => prev.map((v) => v.id === id ? { ...v, name } : v));
  }, []);

  const deleteView = useCallback((id: string) => {
    setUserViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) {
      setActiveViewId(allViews.find((v) => v.id !== id)?.id || null);
    }
  }, [activeViewId, allViews]);

  // ─── Slot Operations (on active view) ──────────────────

  const updateActiveView = useCallback((updater: (view: SavedView) => SavedView) => {
    if (!activeView) return;
    if (activeView.isDefault) {
      // Duplicate default into user views, then edit
      const id = 'user-' + Date.now();
      const copy = updater({
        ...activeView,
        id,
        name: activeView.name + ' (Custom)',
        isDefault: false,
        createdAt: Date.now(),
      });
      setUserViews((prev) => [...prev, copy]);
      setActiveViewId(id);
    } else {
      setUserViews((prev) => prev.map((v) => v.id === activeView.id ? updater(v) : v));
    }
  }, [activeView]);

  const setPreset = useCallback((presetId: string) => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    updateActiveView((v) => ({
      ...v,
      preset: presetId,
      slots: Array.from({ length: preset.slots }, (_, i) =>
        v.slots[i] || { cameras: [], timer: 0 }
      ),
    }));
  }, [updateActiveView]);

  const addCameraToSlot = useCallback((slotIndex: number, cameraId: string) => {
    updateActiveView((v) => {
      const slots = [...v.slots];
      if (slots[slotIndex] && !slots[slotIndex].cameras.includes(cameraId)) {
        slots[slotIndex] = { ...slots[slotIndex], cameras: [...slots[slotIndex].cameras, cameraId] };
      }
      return { ...v, slots };
    });
  }, [updateActiveView]);

  const removeCameraFromSlot = useCallback((slotIndex: number, cameraId: string) => {
    updateActiveView((v) => {
      const slots = [...v.slots];
      if (slots[slotIndex]) {
        slots[slotIndex] = { ...slots[slotIndex], cameras: slots[slotIndex].cameras.filter((id) => id !== cameraId) };
      }
      return { ...v, slots };
    });
  }, [updateActiveView]);

  const setSlotTimer = useCallback((slotIndex: number, timer: number) => {
    updateActiveView((v) => {
      const slots = [...v.slots];
      if (slots[slotIndex]) {
        slots[slotIndex] = { ...slots[slotIndex], timer };
      }
      return { ...v, slots };
    });
  }, [updateActiveView]);

  const clearLayout = useCallback(() => {
    if (!activeView) return;
    if (activeView.isDefault) return; // Can't clear defaults
    updateActiveView((v) => ({
      ...v,
      slots: v.slots.map(() => ({ cameras: [], timer: 0 })),
    }));
  }, [activeView, updateActiveView]);

  // ─── Sharing ───────────────────────────────────────────

  const getShareUrl = useCallback((): string => {
    if (!activeView) return window.location.href;
    const data = { id: activeView.id, name: activeView.name, preset: activeView.preset, slots: activeView.slots };
    const encoded = btoa(JSON.stringify(data));
    const url = new URL(window.location.href);
    url.searchParams.set('layout', encoded);
    return url.toString();
  }, [activeView]);

  const saveSharedLayout = useCallback(() => {
    if (!sharedView) return;
    setUserViews((prev) => [...prev, { ...sharedView, isDefault: false }]);
    setSharedView(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('layout');
    window.history.replaceState(null, '', url.toString());
  }, [sharedView]);

  const isSharedView = !!sharedView && activeView?.id === sharedView.id;
  const hasLayout = activeView ? activeView.slots.some((s) => s.cameras.length > 0) : false;

  return {
    // View management
    allViews,
    activeView,
    selectView,
    createView,
    duplicateView,
    renameView,
    deleteView,
    // Slot operations
    setPreset,
    addCameraToSlot,
    removeCameraFromSlot,
    setSlotTimer,
    clearLayout,
    // Sharing
    isSharedView,
    hasLayout,
    getShareUrl,
    saveSharedLayout,
    // Compat
    state: activeView || { preset: '2x2', slots: emptySlots('2x2') },
  };
}
