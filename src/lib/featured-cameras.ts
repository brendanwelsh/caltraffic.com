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

  // More Mountain Passes
  {
    name: 'Tioga Pass',
    description: 'SR-120 into Yosemite at 9,943 ft — the highest highway pass in California. Closed Nov–May.',
    category: 'mountain-pass',
    route: 'SR-120',
    district: 9,
    matchTerms: ['Tioga', 'Lee Vining'],
  },
  {
    name: 'Sonora Pass',
    description: 'SR-108 at 9,624 ft. One of the steepest passes in the Sierra — 26% grade. No trucks.',
    category: 'mountain-pass',
    route: 'SR-108',
    district: 10,
    matchTerms: ['Sonora Pass', 'Strawberry'],
  },
  {
    name: 'Tehachapi Pass',
    description: 'SR-58 between Bakersfield and Mojave. Major wind corridor — famous for overturned trucks.',
    category: 'mountain-pass',
    route: 'SR-58',
    district: 6,
    matchTerms: ['Tehachapi', 'Cameron'],
  },
  {
    name: 'Cuesta Grade',
    description: 'US-101 north of San Luis Obispo. Steep 7% grade notorious for truck brake failures.',
    category: 'mountain-pass',
    route: 'US-101',
    district: 5,
    matchTerms: ['Cuesta'],
  },
  {
    name: 'Pacheco Pass',
    description: 'SR-152 shortcut between Bay Area and Central Valley. Narrow, winding, and dangerous.',
    category: 'mountain-pass',
    route: 'SR-152',
    district: 5,
    matchTerms: ['Pacheco'],
  },

  // More Scenic
  {
    name: 'Big Sur (Bixby Creek)',
    description: 'Iconic PCH bridge on SR-1. One of the most photographed spots on the California coast.',
    category: 'scenic',
    route: 'SR-1',
    district: 5,
    matchTerms: ['Bixby', 'Big Sur', 'Big Creek'],
  },
  {
    name: 'Golden Gate Bridge',
    description: 'The world-famous bridge connecting San Francisco and Marin County.',
    category: 'landmark',
    route: 'US-101',
    district: 4,
    matchTerms: ['Golden Gate', 'Doyle Drive', 'Presidio'],
  },
  {
    name: 'Mammoth Lakes',
    description: 'US-395 gateway to Mammoth Mountain ski resort and Devils Postpile.',
    category: 'scenic',
    route: 'US-395',
    district: 9,
    matchTerms: ['Mammoth', 'Tom Place'],
  },
  {
    name: 'Emerald Bay',
    description: 'SR-89 along Lake Tahoe\'s most stunning viewpoint. Tight switchbacks, epic scenery.',
    category: 'scenic',
    route: 'SR-89',
    district: 3,
    matchTerms: ['Emerald Bay', 'Bliss'],
  },
  {
    name: 'Coronado Bridge',
    description: 'The sweeping blue bridge connecting downtown San Diego to Coronado Island.',
    category: 'landmark',
    route: 'SR-75',
    district: 11,
    matchTerms: ['Coronado'],
  },

  // More Bottlenecks
  {
    name: 'I-10 Downtown LA',
    description: 'The busiest freeway interchange in America — I-10/I-110/I-5/US-101 convergence.',
    category: 'bottleneck',
    route: 'I-10',
    district: 7,
    matchTerms: ['Downtown', 'Alameda', 'East LA'],
  },
  {
    name: 'I-880 Nimitz Freeway',
    description: 'Oakland corridor linking Port of Oakland to San Jose. Heavy truck and commuter traffic.',
    category: 'bottleneck',
    route: 'I-880',
    district: 4,
    matchTerms: ['Nimitz', 'Fremont', 'Milpitas'],
  },
  {
    name: 'I-5 / I-805 Merge (San Diego)',
    description: 'The merge zone in northern San Diego where two major freeways become one. Daily backup.',
    category: 'bottleneck',
    route: 'I-5',
    district: 11,
    matchTerms: ['Sorrento', 'La Jolla', 'Carmel Valley'],
  },
  {
    name: 'MacArthur Maze',
    description: 'The spaghetti interchange where I-80, I-580, and I-880 meet in Oakland. Navigation nightmare.',
    category: 'bottleneck',
    route: 'I-80',
    district: 4,
    matchTerms: ['MacArthur', 'Maze', 'Emeryville'],
  },
  {
    name: 'I-15 / I-215 (Devore)',
    description: 'The Inland Empire chokepoint where I-15 drops into San Bernardino. Brutal weekend traffic.',
    category: 'bottleneck',
    route: 'I-15',
    district: 8,
    matchTerms: ['Devore', 'Glen Helen'],
  },

  // More Remote / Notable
  {
    name: 'Death Valley (Stovepipe Wells)',
    description: 'SR-190 through the hottest place on Earth. 282 ft below sea level at Badwater Basin.',
    category: 'remote',
    route: 'SR-190',
    district: 9,
    matchTerms: ['Stovepipe', 'Death Valley', 'Panamint'],
  },
  {
    name: 'Blythe (I-10 at Arizona Border)',
    description: 'California\'s eastern gateway on I-10. Desert outpost where summer temps hit 120°F.',
    category: 'remote',
    route: 'I-10',
    district: 8,
    matchTerms: ['Blythe', 'Wiley Well'],
  },
  {
    name: 'US-395 (Lone Pine)',
    description: 'Eastern Sierra gateway to Mt. Whitney, the highest peak in the Lower 48 at 14,505 ft.',
    category: 'remote',
    route: 'US-395',
    district: 9,
    matchTerms: ['Lone Pine', 'Whitney Portal', 'Olancha'],
  },
  {
    name: 'SR-36 (Mad River)',
    description: 'One of the most isolated state highways in California, winding through remote NorCal forest.',
    category: 'remote',
    route: 'SR-36',
    district: 2,
    matchTerms: ['Mad River', 'Forest Glen'],
  },
  {
    name: 'Weed (I-5 at Mt. Shasta)',
    description: 'Small town beneath Mt. Shasta where blizzards regularly close I-5. Chain control hotspot.',
    category: 'remote',
    route: 'I-5',
    district: 2,
    matchTerms: ['Weed', 'Edgewood'],
  },

  // More LA / SoCal
  {
    name: 'I-10 / I-110 Interchange',
    description: 'The Harbor/Santa Monica freeway stack — carries 500,000+ vehicles daily through downtown LA.',
    category: 'bottleneck',
    route: 'I-110',
    district: 7,
    matchTerms: ['Harbor', 'Convention'],
  },
  {
    name: 'I-5 at Griffith Park',
    description: 'The 5 freeway past the Hollywood sign and Griffith Observatory. Iconic LA backdrop.',
    category: 'landmark',
    route: 'I-5',
    district: 7,
    matchTerms: ['Griffith', 'Los Feliz', 'Zoo'],
  },
  {
    name: 'PCH at Malibu',
    description: 'Pacific Coast Highway through Malibu — mudslides, fires, and ocean views.',
    category: 'scenic',
    route: 'SR-1',
    district: 7,
    matchTerms: ['Malibu', 'Las Virgenes', 'Topanga'],
  },
  {
    name: 'I-15 at Primm (NV Border)',
    description: 'The Las Vegas gateway. Sunday evening backups stretch 20+ miles into the desert.',
    category: 'bottleneck',
    route: 'I-15',
    district: 8,
    matchTerms: ['Primm', 'State Line', 'Yermo'],
  },

  // More NorCal
  {
    name: 'Caldecott Tunnel',
    description: 'SR-24 tunnel through the Oakland Hills connecting Contra Costa to the Bay. 4 bores.',
    category: 'bottleneck',
    route: 'SR-24',
    district: 4,
    matchTerms: ['Caldecott', 'Tunnel'],
  },
  {
    name: 'I-80 at Truckee',
    description: 'Tahoe-bound traffic bottleneck. Friday evening ski traffic can add 3+ hours.',
    category: 'bottleneck',
    route: 'I-80',
    district: 3,
    matchTerms: ['Truckee', 'Donner Pass Rd'],
  },
  {
    name: 'Benicia Bridge',
    description: 'I-680 crossing the Carquinez Strait. Major commute route between Solano and Contra Costa.',
    category: 'landmark',
    route: 'I-680',
    district: 4,
    matchTerms: ['Benicia', 'Carquinez'],
  },
  {
    name: 'US-101 at Gaviota Pass',
    description: 'The dramatic coast-to-inland transition north of Santa Barbara through a narrow gorge.',
    category: 'scenic',
    route: 'US-101',
    district: 5,
    matchTerms: ['Gaviota'],
  },
  {
    name: 'I-5 at Coalinga (Harris Ranch)',
    description: 'The long lonely stretch of I-5 through the Central Valley. Tule fog capital of California.',
    category: 'remote',
    route: 'I-5',
    district: 6,
    matchTerms: ['Coalinga', 'Harris', 'Avenal'],
  },

  // More Scenic / Remote
  {
    name: 'SR-299 (Buckhorn Summit)',
    description: 'Remote mountain pass between Redding and the coast. Narrow, winding, and beautiful.',
    category: 'remote',
    route: 'SR-299',
    district: 2,
    matchTerms: ['Buckhorn', 'Burnt Ranch'],
  },
  {
    name: 'US-395 at Bishop',
    description: 'Eastern Sierra gateway town. Stunning views of the Sierra crest and White Mountains.',
    category: 'scenic',
    route: 'US-395',
    district: 9,
    matchTerms: ['Bishop', 'Line St'],
  },
  {
    name: 'SR-88 (Carson Pass)',
    description: 'Alpine pass at 8,574 ft connecting the Gold Country to Hope Valley. Scenic alternative to I-80.',
    category: 'mountain-pass',
    route: 'SR-88',
    district: 10,
    matchTerms: ['Carson Pass', 'Kirkwood', 'Silver Lake'],
  },
  {
    name: 'I-5 at Gorman',
    description: 'Top of the Grapevine (4,183 ft). First snow checkpoint heading north out of LA.',
    category: 'mountain-pass',
    route: 'I-5',
    district: 7,
    matchTerms: ['Gorman', 'Hungry Valley'],
  },
  {
    name: 'SR-17 (Santa Cruz Mountains)',
    description: 'The winding commute route over the Santa Cruz Mountains. Frequent accidents and landslides.',
    category: 'bottleneck',
    route: 'SR-17',
    district: 4,
    matchTerms: ['Summit Rd', 'Scotts Valley', 'Vine Hill'],
  },

  // San Francisco Iconic
  {
    name: 'Bay Bridge Upper Deck',
    description: 'Trust Tower cam looking down the upper deck of the Bay Bridge. One of the best vantage points of the SF–Oakland span.',
    category: 'landmark',
    route: 'I-80',
    district: 4,
    matchTerms: ['Yerba Buena', 'Trust', 'Upper Deck'],
  },
  {
    name: 'Pier 48 (Mission Bay)',
    description: 'Waterfront camera near the Giants ballpark in San Francisco\'s Mission Bay neighborhood.',
    category: 'landmark',
    route: 'I-280',
    district: 4,
    matchTerms: ['Pier 48', 'Mission Bay', 'Mariposa'],
  },
  {
    name: 'Crystal Springs (I-280)',
    description: 'I-280 along the Crystal Springs Reservoir on the Peninsula — often called the most scenic freeway in the Bay Area.',
    category: 'scenic',
    route: 'I-280',
    district: 4,
    matchTerms: ['Crystal Springs', 'Edgewood Rd', 'Hayne Rd'],
  },
  {
    name: 'I-80 / US-50 (Yolo Bypass)',
    description: 'The Yolo Causeway where I-80 and US-50 cross the floodplain west of Sacramento. Fog and flooding hotspot.',
    category: 'bottleneck',
    route: 'I-80',
    district: 3,
    matchTerms: ['Yolo', 'Causeway', 'West Sacramento'],
  },
  {
    name: 'US-101 at SF / Daly City Border',
    description: 'High-traffic corridor at the southern edge of San Francisco where US-101 meets I-280.',
    category: 'bottleneck',
    route: 'US-101',
    district: 4,
    matchTerms: ['Daly City', 'Geneva', 'Alemany'],
  },

  // LA Notorious Bottlenecks
  {
    name: 'I-405 / I-10 (West LA)',
    description: 'Where the 405 meets the 10 in West LA — one of the most dreaded interchanges in Southern California.',
    category: 'bottleneck',
    route: 'I-405',
    district: 7,
    matchTerms: ['National', 'Sawtelle', 'Santa Monica Blvd'],
  },
  {
    name: 'I-5 / SR-134 (Glendale)',
    description: 'The Glendale freeway split where I-5 meets SR-134. Heavy commuter traffic toward Burbank and Pasadena.',
    category: 'bottleneck',
    route: 'I-5',
    district: 7,
    matchTerms: ['Glendale', 'SR-134', 'Colorado'],
  },

  // Scenic Ocean Views
  {
    name: 'PCH at Half Moon Bay',
    description: 'SR-1 along the San Mateo coast near Half Moon Bay. Foggy mornings, dramatic ocean bluffs, pumpkin-season traffic jams.',
    category: 'scenic',
    route: 'SR-1',
    district: 4,
    matchTerms: ['Half Moon Bay', 'Tunitas', 'Moss Beach'],
  },
  {
    name: 'PCH at Santa Monica',
    description: 'Pacific Coast Highway at the Santa Monica pier area. Iconic beach traffic where LA meets the ocean.',
    category: 'scenic',
    route: 'SR-1',
    district: 7,
    matchTerms: ['Santa Monica', 'Pacific Coast Hwy', 'McClure'],
  },

  // Notable / Remote additions
  {
    name: 'Rio Vista Bridge',
    description: 'SR-12 drawbridge over the Sacramento River at Rio Vista. Lifts for passing ships, causing scenic traffic pauses.',
    category: 'landmark',
    route: 'SR-12',
    district: 3,
    matchTerms: ['Rio Vista', 'Isleton'],
  },
  {
    name: 'Truckee Bypass (SR-89 / I-80)',
    description: 'SR-89 junction with I-80 near Truckee. Mountain view backdrop with Tahoe-bound weekend gridlock.',
    category: 'scenic',
    route: 'SR-89',
    district: 3,
    matchTerms: ['SR-89', 'Squaw Valley', 'Alpine Meadows'],
  },
  {
    name: 'I-5 / SR-99 Split (Sacramento)',
    description: 'The major freeway split south of downtown Sacramento where I-5 and SR-99 diverge. High traffic volume all day.',
    category: 'bottleneck',
    route: 'I-5',
    district: 3,
    matchTerms: ['SR-99', 'Cosumnes', 'Elk Grove'],
  },
];

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  'mountain-pass': { label: 'Mountain Pass', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  'scenic': { label: 'Scenic', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  'bottleneck': { label: 'Bottleneck', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  'landmark': { label: 'Landmark', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  'remote': { label: 'Remote', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};
