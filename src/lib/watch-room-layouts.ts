export interface LayoutPreset {
  id: string;
  name: string;
  slots: number;
  gridTemplate: string;
  gridCols: string;
  gridRows: string;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: '1x1',
    name: 'Single',
    slots: 1,
    gridTemplate: '"a"',
    gridCols: '1fr',
    gridRows: '1fr',
  },
  {
    id: '2x2',
    name: 'Quad',
    slots: 4,
    gridTemplate: '"a b" "c d"',
    gridCols: '1fr 1fr',
    gridRows: '1fr 1fr',
  },
  {
    id: '1+3',
    name: '1 Big + 3',
    slots: 4,
    gridTemplate: '"a b" "a c" "a d"',
    gridCols: '2fr 1fr',
    gridRows: '1fr 1fr 1fr',
  },
  {
    id: '2x3',
    name: '2×3',
    slots: 6,
    gridTemplate: '"a b" "c d" "e f"',
    gridCols: '1fr 1fr',
    gridRows: '1fr 1fr 1fr',
  },
  {
    id: '3x3',
    name: '3×3',
    slots: 9,
    gridTemplate: '"a b c" "d e f" "g h i"',
    gridCols: '1fr 1fr 1fr',
    gridRows: '1fr 1fr 1fr',
  },
];

export const SLOT_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
