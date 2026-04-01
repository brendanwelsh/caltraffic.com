import { useState, useEffect, useCallback, useRef } from 'react';
import { LAYOUT_PRESETS } from '@/lib/watch-room-layouts';

export interface WatchSlotConfig {
  cameras: string[]; // camera IDs
  timer: number; // rotation seconds, 0 = no rotation
}

export interface WatchRoomState {
  preset: string;
  slots: WatchSlotConfig[];
}

const STORAGE_KEY = 'caltraffic-watch-room';

function emptyState(presetId = '2x2'): WatchRoomState {
  const preset = LAYOUT_PRESETS.find((p) => p.id === presetId) || LAYOUT_PRESETS[1];
  return {
    preset: preset.id,
    slots: Array.from({ length: preset.slots }, () => ({ cameras: [], timer: 0 })),
  };
}

function loadFromStorage(): WatchRoomState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WatchRoomState;
  } catch {
    return null;
  }
}

function loadFromUrl(): WatchRoomState | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('layout');
    if (!encoded) return null;
    const json = atob(encoded);
    return JSON.parse(json) as WatchRoomState;
  } catch {
    return null;
  }
}

export function useWatchRoom() {
  const [state, setState] = useState<WatchRoomState>(() => {
    return loadFromUrl() || loadFromStorage() || emptyState();
  });
  const [isSharedView, setIsSharedView] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Detect shared view on mount
  useEffect(() => {
    const fromUrl = loadFromUrl();
    if (fromUrl) {
      setState(fromUrl);
      setIsSharedView(true);
    }
  }, []);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (isSharedView) return; // Don't auto-save shared views
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [state, isSharedView]);

  const setPreset = useCallback((presetId: string) => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setState((prev) => {
      // Keep existing slot configs where possible, add/trim as needed
      const newSlots = Array.from({ length: preset.slots }, (_, i) =>
        prev.slots[i] || { cameras: [], timer: 0 }
      );
      return { preset: preset.id, slots: newSlots };
    });
  }, []);

  const setSlotCameras = useCallback((slotIndex: number, cameras: string[]) => {
    setState((prev) => {
      const slots = [...prev.slots];
      if (slots[slotIndex]) {
        slots[slotIndex] = { ...slots[slotIndex], cameras };
      }
      return { ...prev, slots };
    });
  }, []);

  const addCameraToSlot = useCallback((slotIndex: number, cameraId: string) => {
    setState((prev) => {
      const slots = [...prev.slots];
      if (slots[slotIndex] && !slots[slotIndex].cameras.includes(cameraId)) {
        slots[slotIndex] = {
          ...slots[slotIndex],
          cameras: [...slots[slotIndex].cameras, cameraId],
        };
      }
      return { ...prev, slots };
    });
  }, []);

  const removeCameraFromSlot = useCallback((slotIndex: number, cameraId: string) => {
    setState((prev) => {
      const slots = [...prev.slots];
      if (slots[slotIndex]) {
        slots[slotIndex] = {
          ...slots[slotIndex],
          cameras: slots[slotIndex].cameras.filter((id) => id !== cameraId),
        };
      }
      return { ...prev, slots };
    });
  }, []);

  const setSlotTimer = useCallback((slotIndex: number, timer: number) => {
    setState((prev) => {
      const slots = [...prev.slots];
      if (slots[slotIndex]) {
        slots[slotIndex] = { ...slots[slotIndex], timer };
      }
      return { ...prev, slots };
    });
  }, []);

  const clearLayout = useCallback(() => {
    setState(emptyState());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const getShareUrl = useCallback((): string => {
    const json = JSON.stringify(state);
    const encoded = btoa(json);
    const url = new URL(window.location.href);
    url.searchParams.set('layout', encoded);
    return url.toString();
  }, [state]);

  const saveSharedLayout = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
    setIsSharedView(false);
    // Remove layout param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('layout');
    window.history.replaceState(null, '', url.toString());
  }, [state]);

  const hasLayout = state.slots.some((s) => s.cameras.length > 0);

  return {
    state,
    isSharedView,
    hasLayout,
    setPreset,
    setSlotCameras,
    addCameraToSlot,
    removeCameraFromSlot,
    setSlotTimer,
    clearLayout,
    getShareUrl,
    saveSharedLayout,
  };
}
