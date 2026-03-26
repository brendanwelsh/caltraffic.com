import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { selectedDistrict, selectedCounty, selectedRoute, selectedCity } from '@/stores/filters';
import { DISTRICTS, DISTRICT_CENTERS } from '@/lib/constants';

const DISTRICT_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#6366f1', 3: '#3b82f6',
  4: '#06b6d4', 5: '#14b8a6', 6: '#22c55e',
  7: '#eab308', 8: '#f97316', 9: '#ef4444',
  10: '#ec4899', 11: '#a855f7', 12: '#f59e0b',
};

function latLonToSvg(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - (-124.5)) / ((-114) - (-124.5))) * 400;
  const y = ((42 - lat) / (42 - 32.5)) * 500;
  return { x, y };
}

export function DistrictMapSelector({ onClose }: { onClose: () => void }) {
  const current = useStore(selectedDistrict);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    // Delay click listener attachment to avoid closing on the same click that opened it
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSelect = (d: number) => {
    selectedDistrict.set(d === current ? null : d);
    selectedCounty.set(null);
    selectedRoute.set(null);
    selectedCity.set(null);
    onClose();
  };

  return (
    <div ref={panelRef} className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl p-3" style={{ width: 280 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">Select District</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <svg viewBox="0 0 400 500" className="w-full h-auto">
        <rect width="400" height="500" fill="transparent" />
        {Object.entries(DISTRICT_CENTERS).map(([id, center]) => {
          const d = parseInt(id, 10);
          const { x, y } = latLonToSvg(center.lat, center.lon);
          const isSelected = current === d;
          const color = DISTRICT_COLORS[d] ?? '#666';

          return (
            <g key={d} onClick={() => handleSelect(d)} className="cursor-pointer">
              <circle
                cx={x} cy={y}
                r={isSelected ? 28 : 22}
                fill={color}
                fillOpacity={isSelected ? 0.5 : 0.2}
                stroke={color}
                strokeWidth={isSelected ? 3 : 1.5}
                className="transition-all hover:fill-opacity-40"
              />
              <text x={x} y={y - 4} textAnchor="middle" fill={isSelected ? 'white' : color} fontSize="11" fontWeight="bold">
                D{d}
              </text>
              <text x={x} y={y + 9} textAnchor="middle" fill={isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)'} fontSize="7">
                {DISTRICTS[d].description.split('(')[0].trim().split('/')[0].trim()}
              </text>
            </g>
          );
        })}
      </svg>
      {current && (
        <button
          onClick={() => { selectedDistrict.set(null); onClose(); }}
          className="mt-2 w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          Clear district selection
        </button>
      )}
    </div>
  );
}
