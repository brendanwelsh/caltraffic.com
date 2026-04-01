/**
 * Featured / Points of Interest cameras.
 *
 * Each entry matches against camera location/city text to find the right camera.
 * Only entries that match a live (video) camera will display.
 *
 * Categories: 'mountain-pass' | 'scenic' | 'bottleneck' | 'landmark' | 'remote'
 *
 * Last verified: 2026-03-31 — 55 entries, ~40 with confirmed live feeds.
 */

export interface FeaturedCamera {
  name: string;
  description: string;
  category: 'mountain-pass' | 'scenic' | 'bottleneck' | 'landmark' | 'remote';
  route: string;
  district: number;
  matchTerms: string[];
  enabled?: boolean;
}

export const FEATURED_CAMERAS: FeaturedCamera[] = [
  // ═══════════════════════════════════════════════════════
  // MOUNTAIN PASSES — what people check during storms
  // ═══════════════════════════════════════════════════════

  {
    name: 'Donner Summit',
    description: 'The most-checked camera in California. I-80 Sierra crossing between Sacramento and Reno/Tahoe. Chain controls here make statewide news.',
    category: 'mountain-pass',
    route: 'I-80',
    district: 3,
    matchTerms: ['Donner Summit', 'Sugar Bowl'],
  },
  {
    name: 'Donner Lake',
    description: 'Views of Donner Lake on the descent toward Truckee. Historic Donner Party site and stunning alpine scenery.',
    category: 'mountain-pass',
    route: 'I-80',
    district: 3,
    matchTerms: ['Donner Lake'],
  },
  {
    name: 'Kingvale',
    description: 'Western approach to Donner Summit at ~5,000 ft. First indicator of whether chains are needed before the summit.',
    category: 'mountain-pass',
    route: 'I-80',
    district: 3,
    matchTerms: ['Kingvale'],
  },
  {
    name: 'Echo Summit',
    description: 'US-50 route to Lake Tahoe. Chain controls frequent in winter. The alternate when I-80 closes.',
    category: 'mountain-pass',
    route: 'US-50',
    district: 3,
    matchTerms: ['Echo Summit'],
  },
  {
    name: 'The Grapevine (Tejon Pass)',
    description: 'I-5 between LA and Central Valley. Closes during winter storms with massive traffic impact — strands thousands.',
    category: 'mountain-pass',
    route: 'I-5',
    district: 6,
    matchTerms: ['Grapevine', 'Lebec', 'Tejon', 'Frazier'],
  },
  {
    name: 'Cuesta Grade',
    description: 'US-101 north of San Luis Obispo. Steep 7% grade notorious for truck brake failures and summer wildfires.',
    category: 'mountain-pass',
    route: 'US-101',
    district: 5,
    matchTerms: ['Cuesta'],
  },
  {
    name: 'I-80 at Truckee',
    description: 'Tahoe-bound traffic bottleneck. Friday evening ski traffic can add 3+ hours. The last stop before the mountains.',
    category: 'mountain-pass',
    route: 'I-80',
    district: 3,
    matchTerms: ['Old Ag Sta', 'Truckee'],
  },
  {
    name: 'Hwy 89 at South Lake Tahoe',
    description: 'Where US-50 meets SR-89 at the Tahoe basin. Gateway to Emerald Bay and the west shore.',
    category: 'mountain-pass',
    route: 'US-50',
    district: 3,
    matchTerms: ['Hwy 89'],
  },
  {
    name: 'Meyers (US-50)',
    description: 'The last flat stretch before Echo Summit heading west. Chain control checkpoint for Tahoe-bound traffic.',
    category: 'mountain-pass',
    route: 'US-50',
    district: 3,
    matchTerms: ['Meyers'],
  },
  {
    name: 'I-15 at Devore',
    description: 'The Inland Empire chokepoint where I-15 drops into San Bernardino from the Cajon Pass. Brutal weekend traffic to/from Vegas.',
    category: 'mountain-pass',
    route: 'I-15',
    district: 8,
    matchTerms: ['Devore', 'Glen Helen'],
  },

  // ═══════════════════════════════════════════════════════
  // LANDMARKS — famous infrastructure and locations
  // ═══════════════════════════════════════════════════════

  {
    name: 'Bay Bridge (SAS Tower)',
    description: 'View from the iconic SAS tower — one of the best vantage points of the SF–Oakland span. Carries 260,000+ vehicles daily.',
    category: 'landmark',
    route: 'I-80',
    district: 4,
    matchTerms: ['Bay Bridge SAS Tower'],
  },
  {
    name: 'Golden Gate Bridge',
    description: 'The world-famous bridge connecting San Francisco and Marin County. Camera near the Presidio tunnel approach.',
    category: 'landmark',
    route: 'US-101',
    district: 4,
    matchTerms: ['Presidio Tunnel'],
  },
  {
    name: 'Hollywood Blvd',
    description: 'US-101 at Hollywood Blvd — the heart of the entertainment capital. Walk of Fame, Pantages Theatre, Capitol Records all nearby.',
    category: 'landmark',
    route: 'US-101',
    district: 7,
    matchTerms: ['Hollywood Blvd'],
  },
  {
    name: 'I-5 at Griffith Park',
    description: 'The I-5 past the Hollywood Sign and Griffith Observatory. Iconic LA backdrop visible from the freeway.',
    category: 'landmark',
    route: 'I-5',
    district: 7,
    matchTerms: ['Zoo Drive'],
  },
  {
    name: 'Coronado Bridge',
    description: 'The sweeping blue bridge connecting downtown San Diego to Coronado Island. Naval base and pristine beaches.',
    category: 'landmark',
    route: 'SR-282',
    district: 11,
    matchTerms: ['Coronado'],
  },
  {
    name: 'Disneyland (I-5)',
    description: 'I-5 at Disneyland Drive in Anaheim. The Happiest Place on Earth causes some of the most gridlocked exits in SoCal.',
    category: 'landmark',
    route: 'I-5',
    district: 12,
    matchTerms: ['Disneyland'],
  },
  {
    name: 'Long Beach Port',
    description: 'SR-47 at the Port of Long Beach — the busiest port complex in the Western Hemisphere. Massive container ships and cranes visible.',
    category: 'landmark',
    route: 'SR-47',
    district: 7,
    matchTerms: ['Ocean Blvd'],
  },
  {
    name: 'Benicia Bridge',
    description: 'I-680 crossing the Carquinez Strait. Major NorCal commute route between Solano and Contra Costa counties.',
    category: 'landmark',
    route: 'I-680',
    district: 4,
    matchTerms: ['Benicia', 'Carquinez'],
  },
  {
    name: 'Rio Vista Bridge',
    description: 'SR-12 drawbridge over the Sacramento River. Lifts for passing ships — scenic traffic pauses in the Delta.',
    category: 'landmark',
    route: 'SR-12',
    district: 3,
    matchTerms: ['Rio Vista Bridge'],
  },

  // ═══════════════════════════════════════════════════════
  // SCENIC — beautiful views and coastal cameras
  // ═══════════════════════════════════════════════════════

  {
    name: 'PCH at Laguna Beach',
    description: 'Pacific Coast Highway through one of California\'s most beautiful beach towns. Art galleries, tide pools, and ocean bluffs.',
    category: 'scenic',
    route: 'SR-1',
    district: 12,
    matchTerms: ['Blue Bird', 'Broadway'],
  },
  {
    name: 'PCH at Santa Monica',
    description: 'Pacific Coast Highway at the Santa Monica pier area. Where LA meets the Pacific — iconic sunsets and beach cruising.',
    category: 'scenic',
    route: 'SR-1',
    district: 7,
    matchTerms: ['Mcclure'],
  },
  {
    name: 'PCH at Half Moon Bay',
    description: 'SR-1 along the San Mateo coast. Foggy mornings, dramatic ocean bluffs, and legendary pumpkin-season traffic jams.',
    category: 'scenic',
    route: 'SR-1',
    district: 4,
    matchTerms: ['Ruisseau', 'Half Moon'],
  },
  {
    name: 'Del Mar Bluffs (I-5)',
    description: 'Coastal I-5 in north San Diego with bluff views. Del Mar Racetrack and stunning ocean overlooks nearby.',
    category: 'scenic',
    route: 'I-5',
    district: 11,
    matchTerms: ['Del Mar Heights'],
  },
  {
    name: 'Carmel Valley (SR-1)',
    description: 'SR-1 near Carmel-by-the-Sea — Clint Eastwood\'s town. Gateway to Point Lobos and the Monterey Peninsula.',
    category: 'scenic',
    route: 'SR-1',
    district: 5,
    matchTerms: ['SR-68 West', 'Carmel Valley'],
  },
  {
    name: 'Santa Cruz (SR-1)',
    description: 'SR-1 at Ocean Street in Santa Cruz. Beach Boardwalk, surfing, and the UC campus in the redwoods.',
    category: 'scenic',
    route: 'SR-1',
    district: 5,
    matchTerms: ['Ocean Street'],
  },
  {
    name: 'Napa Valley',
    description: 'SR-29/SR-121 in wine country. Rolling vineyards, hot air balloons, and weekend wine-tasting traffic.',
    category: 'scenic',
    route: 'SR-121',
    district: 4,
    matchTerms: ['Kirkland Ranch', 'JCT 221', 'Napa County Line'],
  },
  {
    name: 'Sonoma Valley',
    description: 'SR-37 at Lakeville Road near Sonoma. Gateway to Sonoma wine country and the Petaluma countryside.',
    category: 'scenic',
    route: 'SR-37',
    district: 4,
    matchTerms: ['Lakeville Road'],
  },
  {
    name: 'Mt. Shasta',
    description: 'Dramatic views of Mt. Shasta (14,179 ft) from I-5. Snow-capped year-round, closes in blizzards.',
    category: 'scenic',
    route: 'I-5',
    district: 2,
    matchTerms: ['Shasta', 'Dunsmuir'],
  },
  {
    name: 'Conway Summit (US-395)',
    description: 'Highest point on US-395 at 8,143 ft. Sweeping views of Mono Lake and the Eastern Sierra.',
    category: 'scenic',
    route: 'US-395',
    district: 9,
    matchTerms: ['Conway'],
  },
  {
    name: 'Truckee Bypass',
    description: 'SR-267 with stunning Sierra backdrop. Year-round mountain views and winter ski traffic to Northstar.',
    category: 'scenic',
    route: 'SR-267',
    district: 3,
    matchTerms: ['Truckee Bypass'],
  },
  {
    name: 'Santa Barbara (US-101)',
    description: 'US-101 through the American Riviera. Red-tile roofs, palm trees, and the Santa Ynez Mountains as backdrop.',
    category: 'scenic',
    route: 'US-101',
    district: 5,
    matchTerms: ['Carrillo Street', 'Garden Street'],
  },
  {
    name: 'Oceanside (I-5)',
    description: 'Coastal I-5 in north San Diego county. Camp Pendleton, surf spots, and the Oceanside pier nearby.',
    category: 'scenic',
    route: 'I-5',
    district: 11,
    matchTerms: ['Cassidy Street'],
  },

  // ═══════════════════════════════════════════════════════
  // BOTTLENECKS — the worst traffic in California
  // ═══════════════════════════════════════════════════════

  {
    name: 'I-405 Sepulveda Pass',
    description: 'The most congested stretch of freeway in America. San Fernando Valley to Westside LA. Expanded to 10 lanes and still jammed.',
    category: 'bottleneck',
    route: 'I-405',
    district: 7,
    matchTerms: ['Getty', 'Mulholland'],
  },
  {
    name: 'I-10 Downtown LA',
    description: 'The busiest freeway interchange in America — I-10/I-110/I-5/US-101 convergence in downtown Los Angeles.',
    category: 'bottleneck',
    route: 'I-10',
    district: 7,
    matchTerms: ['Alameda St'],
  },
  {
    name: 'I-405 / I-10 (West LA)',
    description: 'Where the 405 meets the 10 in West LA. One of the most dreaded interchanges in Southern California — always red on Google Maps.',
    category: 'bottleneck',
    route: 'I-405',
    district: 7,
    matchTerms: ['National', 'Sawtelle'],
  },
  {
    name: 'I-5 / SR-134 (Glendale)',
    description: 'The Glendale freeway split. Heavy commuter traffic toward Burbank studios and Pasadena. Disney, Warner Bros, Universal all nearby.',
    category: 'bottleneck',
    route: 'I-5',
    district: 7,
    matchTerms: ['Colorado'],
  },
  {
    name: 'I-5 / I-805 Merge (San Diego)',
    description: 'Where two major freeways merge in north San Diego. Daily backup zone at Sorrento Valley and Carmel Valley.',
    category: 'bottleneck',
    route: 'I-5',
    district: 11,
    matchTerms: ['Carmel Valley Road', 'Sorrento'],
  },
  {
    name: 'MacArthur Maze',
    description: 'The spaghetti interchange where I-80, I-580, and I-880 meet in Oakland. Navigation nightmare, perpetually backed up.',
    category: 'bottleneck',
    route: 'I-80',
    district: 4,
    matchTerms: ['Ashby Avenue'],
  },
  {
    name: 'I-880 Nimitz Freeway',
    description: 'Oakland corridor linking Port of Oakland to San Jose. Heavy truck traffic meets commuters — all day congestion.',
    category: 'bottleneck',
    route: 'I-880',
    district: 4,
    matchTerms: ['JCT-84'],
  },
  {
    name: 'Caldecott Tunnel (SR-24)',
    description: 'SR-24 through the Oakland Hills connecting Contra Costa to the Bay. Morning westbound is a parking lot.',
    category: 'bottleneck',
    route: 'SR-24',
    district: 4,
    matchTerms: ['TELEGRAPH', 'I-680'],
  },
  {
    name: 'SR-17 (Santa Cruz Mountains)',
    description: 'The winding commute over the Santa Cruz Mountains. Frequent accidents, landslides, and one-lane closures.',
    category: 'bottleneck',
    route: 'SR-17',
    district: 4,
    matchTerms: ['Granite Creek', 'Summit Rd'],
  },
  {
    name: 'US-101 at SF / Daly City',
    description: 'High-traffic corridor at the southern edge of San Francisco where the Peninsula commute funnels into the city.',
    category: 'bottleneck',
    route: 'US-101',
    district: 4,
    matchTerms: ['Serramonte'],
  },
  {
    name: 'I-80 / US-50 (Yolo Causeway)',
    description: 'Where I-80 crosses the floodplain west of Sacramento. Fog, flooding, and commuter gridlock — the valley\'s chokepoint.',
    category: 'bottleneck',
    route: 'I-80',
    district: 3,
    matchTerms: ['West Capitol'],
  },
  {
    name: 'I-5 / SR-99 Split (Sacramento)',
    description: 'The major freeway split south of downtown Sacramento. High volume all day as two arteries diverge.',
    category: 'bottleneck',
    route: 'I-5',
    district: 3,
    matchTerms: ['Grantline'],
  },
  {
    name: 'I-5 at Stockton',
    description: 'Central Valley\'s busiest interchange. Where agricultural trucks meet Bay Area commuters heading to the Delta.',
    category: 'bottleneck',
    route: 'I-5',
    district: 10,
    matchTerms: ['Church Street'],
  },
  {
    name: 'SR-99 at Fresno',
    description: 'The Central Valley\'s main artery through California\'s 5th largest city. Truck traffic, ag commerce, and commuter congestion.',
    category: 'bottleneck',
    route: 'SR-41',
    district: 6,
    matchTerms: ['RTE 99 IC'],
  },
  {
    name: 'Balboa Park Area (SR-163)',
    description: 'SR-163 through San Diego\'s signature park and the zoo. The most scenic urban freeway in Southern California.',
    category: 'bottleneck',
    route: 'SR-163',
    district: 11,
    matchTerms: ['Balboa Avenue'],
  },

  // ═══════════════════════════════════════════════════════
  // REMOTE — off the beaten path, interesting conditions
  // ═══════════════════════════════════════════════════════

  {
    name: 'Siskiyou Summit',
    description: 'Northernmost I-5 in California near Oregon border. Frequent winter closures strand travelers at the state line.',
    category: 'remote',
    route: 'I-5',
    district: 2,
    matchTerms: ['Hilt', 'Yreka'],
  },
  {
    name: 'Weed (I-5 at Mt. Shasta)',
    description: 'Small town beneath Mt. Shasta where blizzards regularly close I-5. Chain control hotspot and trucker\'s waypoint.',
    category: 'remote',
    route: 'I-5',
    district: 2,
    matchTerms: ['Weed', 'Edgewood'],
  },
  {
    name: 'I-5 at Coalinga (Harris Ranch)',
    description: 'The long lonely stretch of I-5 through the Central Valley. Tule fog capital of California — zero visibility events here.',
    category: 'remote',
    route: 'I-5',
    district: 6,
    matchTerms: ['Coalinga', 'Harris'],
  },
  {
    name: 'I-15 at Primm (NV Border)',
    description: 'The Las Vegas gateway. Sunday evening backups stretch 20+ miles into the desert as weekenders head home to LA.',
    category: 'remote',
    route: 'I-15',
    district: 8,
    matchTerms: ['Primm', 'State Line', 'Yermo'],
  },
  {
    name: 'Mammoth Lakes (US-395)',
    description: 'Eastern Sierra gateway to Mammoth Mountain ski resort. Stunning volcanic landscape and Devil\'s Postpile.',
    category: 'remote',
    route: 'US-395',
    district: 9,
    matchTerms: ['Mammoth'],
  },
  {
    name: 'I-5 at Bakersfield',
    description: 'Where I-5 meets SR-99 in the southern Central Valley. Oil country, agriculture, and extreme summer heat.',
    category: 'remote',
    route: 'I-5',
    district: 6,
    matchTerms: ['RTE 99', 'Bakersfield'],
  },
];

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  'mountain-pass': { label: 'Mountain Pass', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  'scenic': { label: 'Scenic', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  'bottleneck': { label: 'Bottleneck', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  'landmark': { label: 'Landmark', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  'remote': { label: 'Remote', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};
