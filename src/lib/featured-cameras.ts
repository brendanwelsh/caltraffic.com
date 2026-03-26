/**
 * Featured / Points of Interest cameras.
 *
 * To manage: edit this file and redeploy, or edit on GitHub directly.
 * Each entry matches against camera location/route text to find the right camera.
 *
 * Categories: 'mountain-pass' | 'scenic' | 'bottleneck' | 'landmark' | 'remote'
 */

export interface FeaturedCamera {
  name: string;
  description: string;
  category: 'mountain-pass' | 'scenic' | 'bottleneck' | 'landmark' | 'remote';
  route: string; // e.g., "I-80", "US-50", "I-5"
  district: number;
  // Match criteria — we search camera data for these
  matchTerms: string[]; // location text to match against
}

export const FEATURED_CAMERAS: FeaturedCamera[] = [
  // Mountain Passes — checked during storms
  {
    name: 'Donner Summit',
    description: 'The most-checked camera in California. I-80 Sierra crossing between Sacramento and Reno/Tahoe.',
    category: 'mountain-pass',
    route: 'I-80',
    district: 3,
    matchTerms: ['Donner Summit', 'Donner', 'Sugar Bowl'],
  },
  {
    name: 'Donner Lake',
    description: 'Views of Donner Lake on the descent toward Truckee. Historic Donner Party site.',
    category: 'mountain-pass',
    route: 'I-80',
    district: 3,
    matchTerms: ['Donner Lake'],
  },
  {
    name: 'Kingvale',
    description: 'Western approach to Donner Summit at ~5,000 ft. Key snow condition indicator.',
    category: 'mountain-pass',
    route: 'I-80',
    district: 3,
    matchTerms: ['Kingvale'],
  },
  {
    name: 'Echo Summit',
    description: 'Alternate route to Lake Tahoe via US-50. Chain controls frequent in winter.',
    category: 'mountain-pass',
    route: 'US-50',
    district: 3,
    matchTerms: ['Echo Summit', 'Echo'],
  },
  {
    name: 'The Grapevine (Tejon Pass)',
    description: 'I-5 between LA and Central Valley. Closes during winter storms — massive traffic impact.',
    category: 'mountain-pass',
    route: 'I-5',
    district: 6,
    matchTerms: ['Grapevine', 'Lebec', 'Tejon', 'Frazier'],
  },
  {
    name: 'Cajon Pass',
    description: 'I-15 between LA and High Desert / Las Vegas. Steep grade, notorious for truck accidents.',
    category: 'mountain-pass',
    route: 'I-15',
    district: 8,
    matchTerms: ['Cajon'],
  },

  // Scenic / Landmark
  {
    name: 'Conway Summit',
    description: 'Highest point on US-395 (8,143 ft). Sweeping views of Mono Lake and Eastern Sierra.',
    category: 'scenic',
    route: 'US-395',
    district: 9,
    matchTerms: ['Conway'],
  },
  {
    name: 'Bay Bridge',
    description: 'One of the most heavily trafficked bridges in the world. SF ↔ Oakland.',
    category: 'landmark',
    route: 'I-80',
    district: 4,
    matchTerms: ['Bay Bridge', 'Toll Plaza', 'Treasure'],
  },
  {
    name: 'Mt. Shasta',
    description: 'Dramatic views of Mt. Shasta (14,179 ft) from I-5. Snow closures in winter.',
    category: 'scenic',
    route: 'I-5',
    district: 2,
    matchTerms: ['Shasta', 'Dunsmuir'],
  },

  // Traffic Bottlenecks
  {
    name: 'I-405 Sepulveda Pass',
    description: 'The most congested stretch of freeway in America. San Fernando Valley ↔ Westside LA.',
    category: 'bottleneck',
    route: 'I-405',
    district: 7,
    matchTerms: ['Getty', 'Sepulveda', 'Mulholland'],
  },
  {
    name: 'Altamont Pass',
    description: 'I-580 commuter gauntlet between Central Valley and Bay Area. Brutal daily traffic.',
    category: 'bottleneck',
    route: 'I-580',
    district: 4,
    matchTerms: ['Altamont', 'Grant Line'],
  },
  {
    name: 'I-5 / SR-14 (Newhall Pass)',
    description: 'Major chokepoint between LA and Antelope Valley. Collapsed in 1994 Northridge earthquake.',
    category: 'bottleneck',
    route: 'I-5',
    district: 7,
    matchTerms: ['Newhall', 'SR-14', 'Antelope'],
  },

  // Remote / Notable
  {
    name: 'Richardson Grove',
    description: 'US-101 through old-growth redwoods. Famously narrow — ongoing road debate.',
    category: 'remote',
    route: 'US-101',
    district: 1,
    matchTerms: ['Richardson'],
  },
  {
    name: 'Siskiyou Summit',
    description: 'Northernmost I-5 in California near Oregon border. Frequent winter closures.',
    category: 'remote',
    route: 'I-5',
    district: 2,
    matchTerms: ['Hilt', 'Yreka', 'Siskiyou'],
  },
  {
    name: 'South Lake Tahoe',
    description: 'Tahoe gateway on US-50. Chain controls and stunning mountain scenery.',
    category: 'scenic',
    route: 'US-50',
    district: 3,
    matchTerms: ['South Lake Tahoe', 'Ski Run', 'Meyers'],
  },
];

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  'mountain-pass': { label: 'Mountain Pass', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  'scenic': { label: 'Scenic', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  'bottleneck': { label: 'Bottleneck', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  'landmark': { label: 'Landmark', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  'remote': { label: 'Remote', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};
