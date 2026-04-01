import { LAYOUT_PRESETS, type LayoutPreset } from '@/lib/watch-room-layouts';

interface LayoutPickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

function MiniGrid({ preset }: { preset: LayoutPreset }) {
  // Render a tiny visual representation of the grid
  const cells: Record<string, { col: string; row: string }> = {
    '1x1': { a: { col: '1/2', row: '1/2' } },
    '2x2': { a: { col: '1/2', row: '1/2' }, b: { col: '2/3', row: '1/2' }, c: { col: '1/2', row: '2/3' }, d: { col: '2/3', row: '2/3' } },
    '1+3': { a: { col: '1/2', row: '1/4' }, b: { col: '2/3', row: '1/2' }, c: { col: '2/3', row: '2/3' }, d: { col: '2/3', row: '3/4' } },
    '2x3': { a: { col: '1/2', row: '1/2' }, b: { col: '2/3', row: '1/2' }, c: { col: '1/2', row: '2/3' }, d: { col: '2/3', row: '2/3' }, e: { col: '1/2', row: '3/4' }, f: { col: '2/3', row: '3/4' } },
    '3x3': {},
  };

  return (
    <div
      className="w-full aspect-video rounded-sm overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: preset.gridCols,
        gridTemplateRows: preset.gridRows,
        gridTemplateAreas: preset.gridTemplate,
        gap: '2px',
        background: '#333',
      }}
    >
      {Array.from({ length: preset.slots }, (_, i) => {
        const name = String.fromCharCode(97 + i); // a, b, c...
        return (
          <div
            key={i}
            style={{ gridArea: name }}
            className="bg-muted/50 rounded-[1px]"
          />
        );
      })}
    </div>
  );
}

export function LayoutPicker({ selected, onSelect }: LayoutPickerProps) {
  return (
    <div className="flex gap-2">
      {LAYOUT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className={`flex flex-col items-center gap-1 rounded-md border p-2 transition-colors w-20 ${
            selected === preset.id
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/30 hover:bg-accent'
          }`}
        >
          <MiniGrid preset={preset} />
          <span className="text-[10px] font-medium">{preset.name}</span>
        </button>
      ))}
    </div>
  );
}
