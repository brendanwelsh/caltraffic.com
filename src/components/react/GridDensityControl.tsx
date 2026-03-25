import { useStore } from '@nanostores/react';
import { gridDensity, type GridDensity } from '@/stores/grid';

const DENSITY_OPTIONS: { value: GridDensity; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
];

export function GridDensityControl() {
  const density = useStore(gridDensity);

  return (
    <div className="flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
      <div className="flex rounded-md border border-input overflow-hidden">
        {DENSITY_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => gridDensity.set(value)}
            className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              density === value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground'
            }`}
            title={`${value} column${value > 1 ? 's' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
